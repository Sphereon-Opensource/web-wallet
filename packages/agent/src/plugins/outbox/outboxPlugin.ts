/**
 * Outbox plugin implementation.
 *
 * Manages outbox operations for sending eInvoice credentials via OID4VP.
 * Outbox items go through the following status flow:
 *   draft -> sending -> sent (success) or failed (can retry)
 */

import { DataSource } from 'typeorm'
import { IAgentPlugin } from '@veramo/core'
import { v4 as uuidv4 } from 'uuid'

import type { IOutboxPlugin, OutboxItemSendResult } from './IOutboxPlugin'
import type { OutboxItem, OutboxItemStatus } from './types'
import type {
  OutboxItemCreateArgs,
  OutboxItemGetArgs,
  OutboxItemListArgs,
  OutboxItemUpdateArgs,
  OutboxItemUpdateStatusArgs,
  OutboxItemDeleteArgs,
  OutboxItemSendArgs,
} from './types'
import { mapOutboxItemRow } from './utils/rowMappers'
import { outboxPluginSchema } from './schema'

/**
 * Plugin that manages outbox operations for sending eInvoice credentials via OID4VP.
 */
export class OutboxPlugin implements IAgentPlugin {
  readonly methods: IOutboxPlugin
  readonly schema = outboxPluginSchema

  private dbConnection: Promise<DataSource>

  constructor(options: { dbConnection: Promise<DataSource> }) {
    this.dbConnection = options.dbConnection

    this.methods = {
      outboxItemCreate: this.outboxItemCreate.bind(this),
      outboxItemGet: this.outboxItemGet.bind(this),
      outboxItemList: this.outboxItemList.bind(this),
      outboxItemUpdate: this.outboxItemUpdate.bind(this),
      outboxItemUpdateStatus: this.outboxItemUpdateStatus.bind(this),
      outboxItemDelete: this.outboxItemDelete.bind(this),
      outboxItemSend: this.outboxItemSend.bind(this),
    }
  }

  // ===== Outbox CRUD =====

  /**
   * Creates a new outbox item.
   */
  private async outboxItemCreate(args: OutboxItemCreateArgs): Promise<OutboxItem> {
    const db = await this.dbConnection
    const id = uuidv4()
    const now = new Date()

    await db.query(
      `INSERT INTO "outbox_item" (
        "id", "tenant_id", "status",
        "invoice_id", "invoice_date", "due_date", "currency_code",
        "tax_exclusive_amount", "tax_amount", "tax_inclusive_amount", "payable_amount",
        "seller_data", "buyer_data", "line_items", "evidence_files",
        "recipient_did", "recipient_name", "recipient_endpoint", "recipient_endpoint_id", "recipient_endpoint_type",
        "has_ubl_source", "ubl_xml_hash",
        "created_at", "updated_at"
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        $8, $9, $10, $11,
        $12, $13, $14, $15,
        $16, $17, $18, $19, $20,
        $21, $22,
        $23, $24
      )`,
      [
        id,
        args.tenantId || null,
        'draft',
        args.invoiceId,
        args.invoiceDate,
        args.dueDate || null,
        args.currencyCode,
        args.taxExclusiveAmount ?? null,
        args.taxAmount ?? null,
        args.taxInclusiveAmount ?? null,
        args.payableAmount ?? null,
        args.sellerData ? JSON.stringify(args.sellerData) : null,
        args.buyerData ? JSON.stringify(args.buyerData) : null,
        args.lineItems ? JSON.stringify(args.lineItems) : null,
        JSON.stringify(args.evidenceFiles || []),
        args.recipientDid,
        args.recipientName || null,
        args.recipientEndpoint || null,
        args.recipientEndpointId || null,
        args.recipientEndpointType || null,
        args.hasUblSource ?? false,
        args.ublXmlHash || null,
        now,
        now,
      ]
    )

    return {
      id,
      tenantId: args.tenantId,
      status: 'draft',
      invoiceId: args.invoiceId,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
      currencyCode: args.currencyCode,
      taxExclusiveAmount: args.taxExclusiveAmount,
      taxAmount: args.taxAmount,
      taxInclusiveAmount: args.taxInclusiveAmount,
      payableAmount: args.payableAmount,
      sellerData: args.sellerData,
      buyerData: args.buyerData,
      lineItems: args.lineItems,
      evidenceFiles: args.evidenceFiles || [],
      recipientDid: args.recipientDid,
      recipientName: args.recipientName,
      recipientEndpoint: args.recipientEndpoint,
      recipientEndpointId: args.recipientEndpointId,
      recipientEndpointType: args.recipientEndpointType,
      hasUblSource: args.hasUblSource ?? false,
      ublXmlHash: args.ublXmlHash,
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * Gets an outbox item by ID.
   */
  private async outboxItemGet(args: OutboxItemGetArgs): Promise<OutboxItem | null> {
    const db = await this.dbConnection
    const result = await db.query(`SELECT * FROM "outbox_item" WHERE "id" = $1`, [args.id])

    if (result.length === 0) {
      return null
    }

    return mapOutboxItemRow(result[0])
  }

  /**
   * Lists outbox items with optional filters.
   */
  private async outboxItemList(args: OutboxItemListArgs): Promise<OutboxItem[]> {
    const db = await this.dbConnection

    const conditions: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    // Status filter
    if (args.status) {
      if (Array.isArray(args.status)) {
        const placeholders = args.status.map(() => `$${paramIndex++}`).join(', ')
        conditions.push(`"status" IN (${placeholders})`)
        params.push(...args.status)
      } else {
        conditions.push(`"status" = $${paramIndex++}`)
        params.push(args.status)
      }
    }

    // Recipient DID filter
    if (args.recipientDid) {
      conditions.push(`"recipient_did" = $${paramIndex++}`)
      params.push(args.recipientDid)
    }

    // Tenant ID filter
    if (args.tenantId) {
      conditions.push(`"tenant_id" = $${paramIndex++}`)
      params.push(args.tenantId)
    }

    let query = `SELECT * FROM "outbox_item"`
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`
    }
    query += ` ORDER BY "created_at" DESC`

    // Pagination
    if (args.limit) {
      query += ` LIMIT $${paramIndex++}`
      params.push(args.limit)
    }
    if (args.offset) {
      query += ` OFFSET $${paramIndex++}`
      params.push(args.offset)
    }

    const result = await db.query(query, params)
    return result.map((row: Record<string, unknown>) => mapOutboxItemRow(row))
  }

  /**
   * Updates an outbox item.
   * Only allows updates when status is 'draft' or 'failed'.
   */
  private async outboxItemUpdate(args: OutboxItemUpdateArgs): Promise<OutboxItem> {
    const db = await this.dbConnection

    // First check if the item exists and is editable
    const existing = await this.outboxItemGet({ id: args.id })
    if (!existing) {
      throw new Error(`Outbox item not found: ${args.id}`)
    }
    if (existing.status !== 'draft' && existing.status !== 'failed') {
      throw new Error(`Cannot update outbox item with status: ${existing.status}`)
    }

    const updates: string[] = []
    const params: unknown[] = []
    let paramIndex = 1

    // Build dynamic update query
    const fieldMappings: Array<{ field: keyof OutboxItemUpdateArgs; column: string; isJson?: boolean }> = [
      { field: 'invoiceId', column: 'invoice_id' },
      { field: 'invoiceDate', column: 'invoice_date' },
      { field: 'dueDate', column: 'due_date' },
      { field: 'currencyCode', column: 'currency_code' },
      { field: 'taxExclusiveAmount', column: 'tax_exclusive_amount' },
      { field: 'taxAmount', column: 'tax_amount' },
      { field: 'taxInclusiveAmount', column: 'tax_inclusive_amount' },
      { field: 'payableAmount', column: 'payable_amount' },
      { field: 'sellerData', column: 'seller_data', isJson: true },
      { field: 'buyerData', column: 'buyer_data', isJson: true },
      { field: 'lineItems', column: 'line_items', isJson: true },
      { field: 'evidenceFiles', column: 'evidence_files', isJson: true },
      { field: 'recipientDid', column: 'recipient_did' },
      { field: 'recipientName', column: 'recipient_name' },
      { field: 'recipientEndpoint', column: 'recipient_endpoint' },
      { field: 'recipientEndpointId', column: 'recipient_endpoint_id' },
      { field: 'recipientEndpointType', column: 'recipient_endpoint_type' },
      { field: 'hasUblSource', column: 'has_ubl_source' },
      { field: 'ublXmlHash', column: 'ubl_xml_hash' },
    ]

    for (const { field, column, isJson } of fieldMappings) {
      if (args[field] !== undefined) {
        updates.push(`"${column}" = $${paramIndex++}`)
        params.push(isJson ? JSON.stringify(args[field]) : args[field])
      }
    }

    // Always update updated_at
    const now = new Date()
    updates.push(`"updated_at" = $${paramIndex++}`)
    params.push(now)

    // If status was 'failed', reset to 'draft' on update
    if (existing.status === 'failed') {
      updates.push(`"status" = $${paramIndex++}`)
      params.push('draft')
      updates.push(`"error_message" = $${paramIndex++}`)
      params.push(null)
    }

    // Add the ID parameter
    params.push(args.id)

    await db.query(
      `UPDATE "outbox_item" SET ${updates.join(', ')} WHERE "id" = $${paramIndex}`,
      params
    )

    // Return the updated item
    const updated = await this.outboxItemGet({ id: args.id })
    if (!updated) {
      throw new Error(`Failed to retrieve updated outbox item: ${args.id}`)
    }
    return updated
  }

  /**
   * Updates the status of an outbox item.
   */
  private async outboxItemUpdateStatus(args: OutboxItemUpdateStatusArgs): Promise<OutboxItem> {
    const db = await this.dbConnection
    const now = new Date()

    const updates: string[] = [`"status" = $1`, `"updated_at" = $2`]
    const params: unknown[] = [args.status, now]
    let paramIndex = 3

    // Set timestamps based on status
    if (args.status === 'sending') {
      updates.push(`"sent_at" = $${paramIndex++}`)
      params.push(now)
    } else if (args.status === 'sent') {
      updates.push(`"delivered_at" = $${paramIndex++}`)
      params.push(now)
    }

    // Set result fields
    if (args.credentialId !== undefined) {
      updates.push(`"credential_id" = $${paramIndex++}`)
      params.push(args.credentialId)
    }
    if (args.correlationId !== undefined) {
      updates.push(`"correlation_id" = $${paramIndex++}`)
      params.push(args.correlationId)
    }
    if (args.errorMessage !== undefined) {
      updates.push(`"error_message" = $${paramIndex++}`)
      params.push(args.errorMessage)
    }

    // Add ID parameter
    params.push(args.id)

    await db.query(
      `UPDATE "outbox_item" SET ${updates.join(', ')} WHERE "id" = $${paramIndex}`,
      params
    )

    const updated = await this.outboxItemGet({ id: args.id })
    if (!updated) {
      throw new Error(`Failed to retrieve updated outbox item: ${args.id}`)
    }
    return updated
  }

  /**
   * Deletes an outbox item.
   */
  private async outboxItemDelete(args: OutboxItemDeleteArgs): Promise<boolean> {
    const db = await this.dbConnection

    const result = await db.query(`DELETE FROM "outbox_item" WHERE "id" = $1`, [args.id])

    // TypeORM returns affected count in different ways depending on driver
    const affected = (result as { affectedRows?: number; rowCount?: number })?.affectedRows ??
                     (result as { affectedRows?: number; rowCount?: number })?.rowCount ?? 0
    return affected > 0
  }

  /**
   * Sends an outbox item to its recipient.
   * This is a stub - the actual sending logic is in the eInvoice API server
   * which calls this plugin to update status.
   */
  private async outboxItemSend(args: OutboxItemSendArgs): Promise<OutboxItemSendResult> {
    // Get the outbox item
    const item = await this.outboxItemGet({ id: args.id })
    if (!item) {
      return {
        success: false,
        errorMessage: `Outbox item not found: ${args.id}`,
      }
    }

    // Check if it can be sent
    if (item.status !== 'draft' && item.status !== 'failed') {
      return {
        success: false,
        errorMessage: `Cannot send outbox item with status: ${item.status}`,
      }
    }

    // Check if we have a recipient endpoint
    if (!item.recipientEndpoint) {
      return {
        success: false,
        errorMessage: 'No recipient endpoint configured',
      }
    }

    // Update status to sending
    await this.outboxItemUpdateStatus({
      id: args.id,
      status: 'sending',
    })

    // The actual send is handled by the eInvoice API endpoint
    // which will call outboxItemUpdateStatus on success/failure
    return {
      success: true,
    }
  }
}

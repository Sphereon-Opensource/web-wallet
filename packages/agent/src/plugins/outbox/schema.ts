/**
 * JSON Schema definitions for outbox plugin methods.
 */

export const outboxPluginSchema = {
  components: {
    schemas: {
      OutboxItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          tenantId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['draft', 'sending', 'sent', 'failed'] },
          invoiceId: { type: 'string' },
          invoiceDate: { type: 'string' },
          dueDate: { type: 'string' },
          currencyCode: { type: 'string' },
          taxExclusiveAmount: { type: 'number' },
          taxAmount: { type: 'number' },
          taxInclusiveAmount: { type: 'number' },
          payableAmount: { type: 'number' },
          sellerData: { type: 'object' },
          buyerData: { type: 'object' },
          lineItems: { type: 'array', items: { type: 'object' } },
          evidenceFiles: { type: 'array', items: { type: 'object' } },
          recipientDid: { type: 'string' },
          recipientName: { type: 'string' },
          recipientEndpoint: { type: 'string' },
          recipientEndpointId: { type: 'string' },
          recipientEndpointType: { type: 'string' },
          hasUblSource: { type: 'boolean' },
          ublXmlHash: { type: 'string' },
          credentialId: { type: 'string' },
          correlationId: { type: 'string' },
          errorMessage: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
          sentAt: { type: 'string', format: 'date-time' },
          deliveredAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'status', 'invoiceId', 'invoiceDate', 'currencyCode', 'recipientDid'],
      },
    },
    methods: {
      outboxItemCreate: {
        description: 'Creates a new outbox item (draft invoice)',
        arguments: {
          $ref: '#/components/schemas/OutboxItemCreateArgs',
        },
        returnType: {
          $ref: '#/components/schemas/OutboxItem',
        },
      },
      outboxItemGet: {
        description: 'Gets an outbox item by ID',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        returnType: {
          $ref: '#/components/schemas/OutboxItem',
        },
      },
      outboxItemList: {
        description: 'Lists outbox items with optional filters',
        arguments: {
          type: 'object',
          properties: {
            status: {
              oneOf: [
                { type: 'string', enum: ['draft', 'sending', 'sent', 'failed'] },
                { type: 'array', items: { type: 'string', enum: ['draft', 'sending', 'sent', 'failed'] } },
              ],
            },
            recipientDid: { type: 'string' },
            tenantId: { type: 'string', format: 'uuid' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
        returnType: {
          type: 'array',
          items: { $ref: '#/components/schemas/OutboxItem' },
        },
      },
      outboxItemUpdate: {
        description: 'Updates an outbox item',
        arguments: {
          $ref: '#/components/schemas/OutboxItemUpdateArgs',
        },
        returnType: {
          $ref: '#/components/schemas/OutboxItem',
        },
      },
      outboxItemUpdateStatus: {
        description: 'Updates the status of an outbox item',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['draft', 'sending', 'sent', 'failed'] },
            credentialId: { type: 'string' },
            correlationId: { type: 'string' },
            errorMessage: { type: 'string' },
          },
          required: ['id', 'status'],
        },
        returnType: {
          $ref: '#/components/schemas/OutboxItem',
        },
      },
      outboxItemDelete: {
        description: 'Deletes an outbox item',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        returnType: {
          type: 'boolean',
        },
      },
      outboxItemSend: {
        description: 'Sends an outbox item to its recipient',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
          required: ['id'],
        },
        returnType: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            credentialId: { type: 'string' },
            correlationId: { type: 'string' },
            errorMessage: { type: 'string' },
          },
        },
      },
    },
  },
}

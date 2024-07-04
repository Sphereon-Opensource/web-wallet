import {Asset} from '../asset'
import {getMatchingIdentity} from '@helpers/IdentityFilters'
import {formatDate} from '@helpers/date/DateHelper'
import {TranslateFn} from '../type-commons'
import {Identity, Party} from '@sphereon/ssi-sdk.data-store'

export const PROCESS_OWNER_DID =
  process.env.NEXT_PUBLIC_PROCESS_OWNER_DID ??
  'did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiWjY3eEc3UFZUUHBDdlp3UjVlR2pteHhqQjdlb2M1cWdYbm9LMloxR2R6YyIsInkiOiJ1ZkpCc3BlNTV5WkZXVWN1T21GRUMtX3NEVE1nVXRndF8tbmV2WHd4UVdZIn0'
export const SUPPLIER_DID = process.env.NEXT_PUBLIC_SUPPLIER_DID ?? 'did:web:localhost:stonebase'
export const TESTER_DID = process.env.NEXT_PUBLIC_TESTER_DID ?? 'did:web:localhost:sgs'

export type ActorRole = 'Supplier' | 'Tester' | 'ProcessOwner'

export enum WorkflowStatus {
  New = 'New',
  Pending = 'Pending',
  Approved = 'Approved',
  Done = 'Done',
  Declined = 'Declined',
  Archived = 'Archived',
}

export enum WorkflowActionType {
  CREATE_ASSET,
  APPROVE_ASSET,
  ATTACH_DOCUMENT,
  APPROVE_DOCUMENT,
}

export enum WorkflowStepCode {
  CREATE_ASSET = 1, // Owner
  ATTACH_CERT_OF_ORIGIN, // Owner
  APPROVE_ASSET, // Supplier
  APPROVE_CERT_OF_ORIGIN, // Supplier
  ATTACH_QUALITY_PLAN, // Supplier
  APPROVE_QUALITY_PLAN, // Owner
  ATTACH_INSPECTION_CERTS, // Tester
  APPROVE_INSPECTION_CERTS, // Owner
  APPROVE_SHIPPING, // ??
  ATTACH_BILL_OF_LADING, // Supplier
  ATTACH_PORT_INSPECTION_REPORTS, // Tester
  APPROVE_PORT_INSPECTION_REPORTS, // Owner
  APPROVE_LOCAL, // Owner
}

export interface IWorkflowDocumentDescriptor {
  category: DocumentCategory
  type: DocumentType
  correlationId?: string
}

export interface IWorkflowStepDescriptor {
  step: WorkflowStepCode
  actionType: WorkflowActionType
  action?: string
  document?: IWorkflowDocumentDescriptor
  message: string
  titleCaption: string
  documentType?: string
  inEdge: IInEdge[]
}

export interface IInEdge {
  sender: string
  inStatus?: WorkflowStatus
  onIn?: () => void
  outEdge?: IOutEdge[]
  // outStatus?: WorkflowStatus
}

export enum DocumentCategory {
  REPORTS = 'Reports',
  CERTIFICATES = 'Certificates',
  OTHER = 'Other files',
  VCS = 'VCs',
}

export enum DocumentType {
  CERTIFICATE_OF_ORIGIN = 'Certificate of Origin',
  QUALITY_PLAN = 'Quality Plan',
  INSPECTION_CERT = 'Inspection certificate',
  INSPECTION_LOCAL = 'Inspection in port',
  BILL_OF_LADING = 'Bill of Lading',
}

export interface IOutEdge {
  // recipients: string | string[]
  update?: StepInstanceData[]
  create?: StepInstanceData[]
  onOut?: () => void
}

export interface StepInstanceData {
  step?: WorkflowStepCode
  status?: WorkflowStatus
  recipients?: string | string[]
  sender?: string
}

export const createAssetDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.CREATE_ASSET,
  titleCaption: 'create_asset_title', // not used for create asset
  action: 'create_asset_action',
  actionType: WorkflowActionType.CREATE_ASSET,
  message: 'create_asset_message',
  inEdge: [
    {
      onIn: () => console.log('on in called for create asset'),
      inStatus: WorkflowStatus.New,
      sender: PROCESS_OWNER_DID,
      outEdge: [
        {
          onOut: () => console.log('on out called for create asset -> request cert of origin'),
          create: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.ATTACH_CERT_OF_ORIGIN,
              status: WorkflowStatus.New,
            },
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              status: WorkflowStatus.Pending,
              step: WorkflowStepCode.APPROVE_ASSET,
            },
          ],
          update: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.CREATE_ASSET,
              status: WorkflowStatus.Approved,
            },
          ],
        },
      ],
    },
  ],
}
export const approveAssetDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.APPROVE_ASSET,
  message: 'approve_asset_message',
  action: 'approve_asset_action',
  actionType: WorkflowActionType.APPROVE_ASSET,
  titleCaption: 'approve_asset_title',
  inEdge: [
    {
      onIn: () => console.log('on in called approve asset'),
      inStatus: WorkflowStatus.Pending,
      sender: PROCESS_OWNER_DID,

      outEdge: [
        {
          onOut: () => console.log('on out called approve asset'),
          update: [
            {
              sender: SUPPLIER_DID,
              recipients: PROCESS_OWNER_DID,
              status: WorkflowStatus.Approved,
              step: WorkflowStepCode.APPROVE_ASSET,
            },
            // Not really needed
            {
              sender: SUPPLIER_DID,
              recipients: SUPPLIER_DID,
              status: WorkflowStatus.Approved,
              step: WorkflowStepCode.APPROVE_ASSET,
            },
          ],
        },
      ],
    },
  ],
}

export const attachCertOfOriginDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.ATTACH_CERT_OF_ORIGIN,
  titleCaption: 'attach_cert_of_origin_title',
  message: 'attach_cert_of_origin_message',
  action: 'attach_cer_of_origin_action',
  actionType: WorkflowActionType.ATTACH_DOCUMENT,
  document: {
    category: DocumentCategory.CERTIFICATES,
    type: DocumentType.CERTIFICATE_OF_ORIGIN,
  },
  inEdge: [
    {
      onIn: () => console.log('on in called attach cert of origin'),
      sender: PROCESS_OWNER_DID,
      inStatus: WorkflowStatus.New,
      outEdge: [
        {
          update: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.ATTACH_CERT_OF_ORIGIN,
              status: WorkflowStatus.Approved,
            },
          ],
          create: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              step: WorkflowStepCode.APPROVE_CERT_OF_ORIGIN,
              status: WorkflowStatus.Pending,
            },
          ],
          onOut: () => console.log('on out called attach cert of origin'),
        },
      ],
    },
  ],
}

export const approveCertOfOriginDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.APPROVE_CERT_OF_ORIGIN,
  message: 'approve_cert_of_origin_message',
  action: 'approve_cert_of_origin_action',
  actionType: WorkflowActionType.APPROVE_DOCUMENT,
  titleCaption: 'approve_cert_of_origin_title',
  inEdge: [
    {
      onIn: () => console.log('on in called approve cert of origin'),
      inStatus: WorkflowStatus.Pending,
      sender: PROCESS_OWNER_DID,

      outEdge: [
        {
          onOut: () => console.log('on out called approve cert of origin'),
          create: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              status: WorkflowStatus.New,
              step: WorkflowStepCode.ATTACH_QUALITY_PLAN,
            },
          ],
          update: [
            {
              sender: SUPPLIER_DID,
              recipients: PROCESS_OWNER_DID,
              status: WorkflowStatus.Approved,
              step: WorkflowStepCode.APPROVE_CERT_OF_ORIGIN,
            },
          ],
        },
      ],
    },
  ],
}

export const attachQualityPlanDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.ATTACH_QUALITY_PLAN,
  titleCaption: 'attach_quality_plan_title',
  message: 'attach_quality_plan_message',
  action: 'attach_quality_plan_action',
  actionType: WorkflowActionType.ATTACH_DOCUMENT,
  document: {
    category: DocumentCategory.REPORTS,
    type: DocumentType.QUALITY_PLAN,
  },
  inEdge: [
    {
      onIn: () => console.log('on in called attach quality plan'),
      sender: PROCESS_OWNER_DID,
      inStatus: WorkflowStatus.New,
      outEdge: [
        {
          update: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              step: WorkflowStepCode.ATTACH_QUALITY_PLAN,
              status: WorkflowStatus.Approved,
            },
          ],
          create: [
            {
              sender: SUPPLIER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.APPROVE_QUALITY_PLAN,
              status: WorkflowStatus.Pending,
            },
          ],
          onOut: () => console.log('on out called attach quality plan'),
        },
      ],
    },
  ],
}

export const approveQualityPlanDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.APPROVE_QUALITY_PLAN,
  message: 'approve_quality_plan_message',
  action: 'approve_quality_plan_action',
  actionType: WorkflowActionType.APPROVE_DOCUMENT,
  titleCaption: 'approve_quality_plan_title',
  inEdge: [
    {
      onIn: () => console.log('on in called approve quality plan'),
      inStatus: WorkflowStatus.Pending,
      sender: PROCESS_OWNER_DID,

      outEdge: [
        {
          onOut: () => console.log('on out called approve quality plan'),
          update: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              status: WorkflowStatus.Approved,
              step: WorkflowStepCode.APPROVE_QUALITY_PLAN,
            },
          ],
          create: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: TESTER_DID,
              step: WorkflowStepCode.ATTACH_INSPECTION_CERTS,
              status: WorkflowStatus.Pending,
            },
          ],
        },
      ],
    },
  ],
}

export const attachInspectionCertsDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.ATTACH_INSPECTION_CERTS,
  titleCaption: 'attach_inspection_certs_title',
  message: 'attach_inspection_certs_message',
  action: 'attach_inspection_certs_action',
  actionType: WorkflowActionType.ATTACH_DOCUMENT,
  document: {
    category: DocumentCategory.CERTIFICATES,
    type: DocumentType.INSPECTION_CERT,
  },
  inEdge: [
    {
      onIn: () => console.log('on in called attach inspection certs'),
      sender: PROCESS_OWNER_DID,
      inStatus: WorkflowStatus.Pending,
      outEdge: [
        {
          update: [
            {
              sender: TESTER_DID,
              recipients: TESTER_DID,
              step: WorkflowStepCode.ATTACH_INSPECTION_CERTS,
              status: WorkflowStatus.Approved,
            },
          ],
          create: [
            {
              sender: TESTER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.APPROVE_INSPECTION_CERTS,
              status: WorkflowStatus.Pending,
            },
          ],
          onOut: () => console.log('on out called attach inspection certs'),
        },
      ],
    },
  ],
}

export const approveInspectionCertsDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.APPROVE_INSPECTION_CERTS,
  message: 'approve_inspection_certs_message',
  action: 'approve_inspection_certs_action',
  actionType: WorkflowActionType.APPROVE_DOCUMENT,
  titleCaption: 'approve_inspection_certs_title',
  inEdge: [
    {
      onIn: () => console.log('on in called approve inspection certs'),
      inStatus: WorkflowStatus.Pending,
      sender: TESTER_DID,
      outEdge: [
        {
          onOut: () => console.log('on out called approve inspection certs'),
          update: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              status: WorkflowStatus.Approved,
              step: WorkflowStepCode.APPROVE_INSPECTION_CERTS,
            },
          ],
          create: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              step: WorkflowStepCode.APPROVE_SHIPPING,
              status: WorkflowStatus.Done,
            },
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              step: WorkflowStepCode.ATTACH_BILL_OF_LADING,
              status: WorkflowStatus.New,
            },
          ],
        },
      ],
    },
  ],
}

export const attachBillOfLadingDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.ATTACH_BILL_OF_LADING,
  titleCaption: 'attach_bill_of_lading_title',
  message: 'attach_bill_of_lading_message',
  action: 'attach_bill_of_lading_action',
  actionType: WorkflowActionType.ATTACH_DOCUMENT,
  document: {
    category: DocumentCategory.OTHER,
    type: DocumentType.BILL_OF_LADING,
  },
  inEdge: [
    {
      onIn: () => console.log('on in called attach bill of lading'),
      sender: PROCESS_OWNER_DID,
      inStatus: WorkflowStatus.New,
      outEdge: [
        {
          update: [
            {
              sender: SUPPLIER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.ATTACH_BILL_OF_LADING,
              status: WorkflowStatus.Approved,
            },
          ],
          create: [
            {
              sender: SUPPLIER_DID,
              recipients: TESTER_DID,
              step: WorkflowStepCode.ATTACH_PORT_INSPECTION_REPORTS,
              status: WorkflowStatus.Pending,
            },
          ],
          onOut: () => console.log('on out called attach quality plan'),
        },
      ],
    },
  ],
}

export const attachPortInspectionReportsDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.ATTACH_PORT_INSPECTION_REPORTS,
  titleCaption: 'attach_port_inspection_reports_title',
  message: 'attach_port_inspection_reports_message',
  action: 'attach_port_inspection_reports_action',
  actionType: WorkflowActionType.ATTACH_DOCUMENT,
  document: {
    category: DocumentCategory.CERTIFICATES,
    type: DocumentType.INSPECTION_LOCAL,
  },
  inEdge: [
    {
      onIn: () => console.log('on in called attach port inspection reports'),
      sender: TESTER_DID,
      inStatus: WorkflowStatus.Pending,
      outEdge: [
        {
          update: [
            {
              sender: TESTER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.ATTACH_PORT_INSPECTION_REPORTS,
              status: WorkflowStatus.Approved,
            },
          ],
          create: [
            {
              sender: SUPPLIER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.APPROVE_LOCAL,
              status: WorkflowStatus.New,
            },
          ],
          onOut: () => console.log('on out called attach quality plan'),
        },
      ],
    },
  ],
}

export const approvePortInspectionReportsDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.APPROVE_PORT_INSPECTION_REPORTS,
  titleCaption: 'approve_port_inspection_reports_title',
  message: 'approve_port_inspection_reports_message',
  action: 'approve_port_inspection_reports_action',
  actionType: WorkflowActionType.APPROVE_DOCUMENT,
  inEdge: [
    {
      onIn: () => console.log('on in called approve port inspection reports'),
      sender: TESTER_DID,
      inStatus: WorkflowStatus.New,
      outEdge: [
        {
          update: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              step: WorkflowStepCode.APPROVE_PORT_INSPECTION_REPORTS,
              status: WorkflowStatus.Approved,
            },
          ],
          create: [
            {
              sender: SUPPLIER_DID,
              recipients: PROCESS_OWNER_DID,
              step: WorkflowStepCode.APPROVE_LOCAL,
              status: WorkflowStatus.New,
            },
          ],
          onOut: () => console.log('on out calledapprove port inspection reports'),
        },
      ],
    },
  ],
}

export const approveLocalDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.APPROVE_LOCAL,
  message: 'approve_local_message',
  action: 'approve_local_action',
  actionType: WorkflowActionType.APPROVE_DOCUMENT,
  titleCaption: 'approve_local_title',
  inEdge: [
    {
      onIn: () => console.log('on in called approve local'),
      inStatus: WorkflowStatus.Pending,
      sender: TESTER_DID,

      outEdge: [
        {
          onOut: () => console.log('on out called approve local'),
          update: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              status: WorkflowStatus.Approved,
              step: WorkflowStepCode.APPROVE_LOCAL,
            },
          ],
        },
      ],
    },
  ],
}

// We cannot handle this one. So we set it to Approved
export const approveShippingDescriptor: IWorkflowStepDescriptor = {
  step: WorkflowStepCode.APPROVE_LOCAL,
  message: 'approve_shipping_message',
  action: 'approve_shipping_action',
  actionType: WorkflowActionType.APPROVE_DOCUMENT,
  titleCaption: 'approve_shipping_title',
  inEdge: [
    {
      onIn: () => console.log('on in called approve local'),
      inStatus: WorkflowStatus.Pending,
      sender: TESTER_DID,

      outEdge: [
        {
          onOut: () => console.log('on out called approve local'),
          update: [
            {
              sender: PROCESS_OWNER_DID,
              recipients: SUPPLIER_DID,
              status: WorkflowStatus.Approved,
              step: WorkflowStepCode.APPROVE_LOCAL,
            },
          ],
        },
      ],
    },
  ],
}

export const workflowStepDescriptors: Record<WorkflowStepCode, IWorkflowStepDescriptor | undefined> = {
  [WorkflowStepCode.CREATE_ASSET]: createAssetDescriptor,
  [WorkflowStepCode.APPROVE_ASSET]: approveAssetDescriptor,
  [WorkflowStepCode.ATTACH_CERT_OF_ORIGIN]: attachCertOfOriginDescriptor,
  [WorkflowStepCode.APPROVE_CERT_OF_ORIGIN]: approveCertOfOriginDescriptor,
  [WorkflowStepCode.ATTACH_QUALITY_PLAN]: attachQualityPlanDescriptor,
  [WorkflowStepCode.APPROVE_QUALITY_PLAN]: approveQualityPlanDescriptor,
  [WorkflowStepCode.ATTACH_INSPECTION_CERTS]: attachInspectionCertsDescriptor,
  [WorkflowStepCode.APPROVE_INSPECTION_CERTS]: approveInspectionCertsDescriptor,
  [WorkflowStepCode.APPROVE_SHIPPING]: approveShippingDescriptor,
  [WorkflowStepCode.ATTACH_BILL_OF_LADING]: attachBillOfLadingDescriptor,
  [WorkflowStepCode.ATTACH_PORT_INSPECTION_REPORTS]: attachPortInspectionReportsDescriptor,
  [WorkflowStepCode.APPROVE_PORT_INSPECTION_REPORTS]: approvePortInspectionReportsDescriptor,
  [WorkflowStepCode.APPROVE_LOCAL]: approveLocalDescriptor,
}

export class WorkflowEntity {
  id: string
  created_at: string
  asset_id: string
  owner_id: string

  asDTO(assets: Asset[], parties: Party[]): WorkflowDTOType {
    return WorkflowEntity.toDTO(this, assets, parties)
  }

  static toDTO(entity: WorkflowEntityType, assets: Asset[], parties: Party[]): WorkflowDTOType {
    // const identity =
    const identity = getMatchingIdentity(parties, entity.owner_id)!
    return {
      id: entity.id,
      createdAt: new Date(entity.created_at),
      asset: assets.find(asset => asset.id === entity.asset_id)!,
      owner: identity!.party!,
      ownerIdentity: identity!.identity!,
      // todo: Steps
    }
  }
}

export class WorkflowDTO {
  id: string
  createdAt: Date
  asset: Asset
  owner: Party
  ownerIdentity: Identity

  // steps?: WorkflowStepDTO[]

  asEntity(): WorkflowEntityType {
    return WorkflowDTO.toEntity(this)
  }

  static toEntity(dto: WorkflowDTOType): WorkflowEntityType {
    return {
      owner_id: dto.ownerIdentity.identifier.correlationId,
      asset_id: dto.asset.id,
      created_at: dto.createdAt.toISOString(),
      id: dto.id,
    }
  }
}

function entityCodeToDocumentType(code: number) {
  /**
   *   CREATE_ASSET = 1, // Owner
   *   ATTACH_CERT_OF_ORIGIN, // Owner
   *   APPROVE_ASSET, // Supplier
   *   APPROVE_CERT_OF_ORIGIN, // Supplier
   *   ATTACH_QUALITY_PLAN, // Supplier
   *   APPROVE_QUALITY_PLAN, // Owner
   *   ATTACH_INSPECTION_CERTS,// Tester7
   *   APPROVE_INSPECTION_CERTS, // Owner
   *   APPROVE_SHIPPING, // ??
   *   ATTACH_BILL_OF_LADING, // Supplier
   *   ATTACH_PORT_INSPECTION_REPORTS, // Tester
   *   APPROVE_PORT_INSPECTION_REPORTS, // Owner
   *   APPROVE_LOCAL// Owner
   */

  /**
   *   CERTIFICATE_OF_ORIGIN = 'Certificate of Origin',
   *   QUALITY_PLAN = 'Quality Plan',
   *   INSPECTION_CERT = 'Inspection certificate',
   *   INSPECTION_LOCAL = 'Inspection in port',
   *   BILL_OF_LADING = 'Bill of Lading'
   */
  // fixme: handle it in a better way
  if (code < 5) {
    return 'Certificate of origin'
  } else if (code < 7) {
    return 'Quality plan'
  } else if (code < 9) {
    return 'Inspection certificate'
  } else if (code < 11) {
    return 'Bill of lading'
  } else {
    return 'Inspection in port document'
  }
}

export class WorkflowStepEntity {
  id: string
  code: number
  created_at: string
  message: string
  status: WorkflowStatus
  workflow_id: string
  document_correlation_id?: string
  sender_id: string
  recipient_id: string
  action: string

  asDTO(workflows: WorkflowDTOType[], parties: Party[], translate: TranslateFn): WorkflowStepDTOType {
    return WorkflowStepEntity.toDTO(this, workflows, parties, translate)
  }

  static toDTO(entity: WorkflowStepEntityType, workflows: WorkflowDTOType[], parties: Party[], translate: TranslateFn): WorkflowStepDTOType {
    const senderId = getMatchingIdentity(parties, entity.sender_id)!
    const recipientId = getMatchingIdentity(parties, entity.recipient_id)!
    const workflow = workflows.find(w => w.id === entity.workflow_id)!
    // const stepDescriptor: IWorkflowStepDescriptor = getWorkflowDescriptor(entity.code)

    return {
      id: entity.id,
      action: translate(entity.action),
      workflow,
      documentCorrelationId: entity.document_correlation_id,
      code: entity.code,
      sender: senderId?.party,
      senderIdentity: senderId?.identity,
      recipient: recipientId?.party,
      recipientIdentity: recipientId?.identity,
      createdAt: new Date(entity.created_at),
      createdAtStr: formatDate(entity.created_at),
      message: translate(entity.message, {
        sender: senderId?.party.contact.displayName ?? '-',
        assetName: workflow.asset?.name ?? '-',
        documentType: entityCodeToDocumentType(entity.code),
      }),
      status: entity.status,
    } as WorkflowStepDTOType
  }

  [x: string]: any
}

export type WorkflowEntityType = Omit<WorkflowEntity, 'toDTO' | 'asDTO'>
export type WorkflowDTOType = Omit<WorkflowDTO, 'toEntity' | 'asEntity'>
export type WorkflowStepEntityType = Omit<WorkflowStepEntity, 'toDTO' | 'asDTO'>
export type WorkflowStepDTOType = Omit<WorkflowStepDTO, 'toEntity' | 'asEntity'>

export class WorkflowStepDTO {
  id: string
  code: number
  createdAt: Date
  createdAtStr: string
  message: string
  documentCorrelationId?: string
  status: WorkflowStatus
  workflow: WorkflowDTOType
  sender: Party | undefined
  senderIdentity: Identity | undefined
  recipient: Party | undefined
  recipientIdentity: Identity | undefined
  action: string

  asEntity(): WorkflowStepEntityType {
    return WorkflowStepDTO.toEntity(this)
  }

  static toEntity(dto: WorkflowStepDTOType): WorkflowStepEntityType {
    return {
      id: dto.id,
      created_at: dto.createdAtStr ?? dto.createdAt.toISOString(),
      status: dto.status,
      action: dto.action,
      document_correlation_id: dto.documentCorrelationId,
      code: dto.code,
      workflow_id: dto.workflow.id,
      message: dto.message,
      sender_id: dto.senderIdentity!.identifier.correlationId,
      recipient_id: dto.recipientIdentity!.identifier.correlationId,
    }
  }
}

/*
// We have a view in the DB for this which populates after we push a new WorkflowStep
export interface ILatestWorkflowStepView {
    id: string
    code: string
    created_at: string
    message: string
    status: WorkflowStatus
    workflow_id: string
    contact_id: string
    owner: string
    asset: string
    action: string
}

export interface ILatestWorkflowStepDTO {
    id: string
    code: string
    createdAt: string
    message: string
    status: WorkflowStatus
    workflowId: string
    contactDisplayName: string
    contactId: string
    owner: string
    asset: string
    action: string
}
*/

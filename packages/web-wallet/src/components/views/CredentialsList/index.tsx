import React, {FC, ReactElement, useEffect, useState} from 'react'
import {HttpError, useCreate, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {Button, Credential, CredentialReference, CredentialTableItem, DataResource} from '@typings'
import {getCredentialIssuerNameAndAlias, toCredentialSummary} from '@sphereon/ui-components.credential-branding'
import agent from '@agent'
import {
  CorrelationIdentifierType,
  CredentialCorrelationType,
  FindPartyArgs,
  Party,
  PartyOrigin,
  PartyTypeType
} from '@sphereon/ssi-sdk.data-store'
import {CredentialRole, DigitalCredential} from '@sphereon/ssi-sdk.credential-store'
import {getMatchingIdentity} from '@helpers/IdentityFilters'
import {CredentialMapper, OriginalVerifiableCredential} from '@sphereon/ssi-types'
import {VerifiableCredential, W3CVerifiableCredential} from '@veramo/core'
import ImportFileModal from "@components/modals/ImportFileModal";
import {computeEntryHash} from '@veramo/utils';
import {AddContactArgs} from "@sphereon/ssi-sdk.contact-manager";
import {IdentityOrigin} from "@sphereon/ssi-sdk.data-store/dist/types/contact/contact";
import {addContact} from "@/src/services/contactService";
import {registerDidEbsiOnLedger} from "@/src/services/ebsiService";

type Props = {
  credentialRole: CredentialRole
  allowIssueCredential?: boolean
}

const CredentialsList: FC<Props> = (props: Props): ReactElement => {
  const {credentialRole, allowIssueCredential = true} = props
  const translate = useTranslate()
  const {mutateAsync: deleteCredential} = useDelete<Credential, HttpError>()
  const {mutateAsync: deleteCredentialReference} = useDelete<CredentialReference, HttpError>()
  const {mutate: mutateOne} = useCreate()
  const {create, show} = useNavigation()
  const [credentialTableItems, setCredentialTableItems] = useState<CredentialTableItem[]>([])
  const [showImportCredentialModal, setShowImportCredentialModal] = useState<boolean>(false)

  const {
    data: credentialData,
    isLoading: credentialsLoading,
    isError: credentialsError,
    refetch: refetchCredentials,
  } = useList<DigitalCredential, HttpError>({
    resource: DataResource.CREDENTIALS,
    pagination: {
      pageSize: 1000,
      mode: 'server',
    },
    sorters: [
      {
        field: 'validFrom', // We don't we have a field 'issuanceDate' in the db anymore, so sort on validFrom
        order: 'asc',
      },
    ],
    meta: {
      idColumnName: 'hash',
    },
    filters: [
      {
        field: 'credentialRole',
        operator: 'eq',
        value: credentialRole,
      },
      {
        field: 'documentType',
        operator: 'eq',
        value: 'VC',
      },
    ],
  })

  const {
    data: partyData,
    isLoading: partiesLoading,
    isError: partiesError,
    refetch: refetchParties
  } = useList<Party, HttpError>({resource: 'parties'})

  useEffect(() => {
    const fetchCredentialTableItems = async () => {
      if (!credentialData || !partyData) {
        return
      }

      const digitalCredentials = credentialData.data as Array<DigitalCredential>
      try {
        const credentialBrandings = await agent.ibGetCredentialBranding()
        const newCredentialTableItems = await Promise.all(
          digitalCredentials.map(async (credential: DigitalCredential) => {
            const filteredCredentialBrandings = credentialBrandings.filter(cb => cb.vcHash === credential.hash)
            const issuerPartyIdentity =
              credential.issuerCorrelationId !== undefined ? getMatchingIdentity(partyData.data, credential.issuerCorrelationId) : undefined
            const subjectPartyIdentity =
              credential.subjectCorrelationId !== undefined ? getMatchingIdentity(partyData.data, credential.subjectCorrelationId) : undefined
            const originalVerifiableCredential = JSON.parse(credential.uniformDocument ?? credential.rawDocument) as OriginalVerifiableCredential

            const credentialSummary = await toCredentialSummary({
              verifiableCredential: originalVerifiableCredential as VerifiableCredential,
              hash: credential.hash,
              credentialRole,
              branding: filteredCredentialBrandings.length ? filteredCredentialBrandings[0].localeBranding : undefined,
              issuer: issuerPartyIdentity?.party,
              subject: subjectPartyIdentity?.party,
            })

            return CredentialTableItem.from(credential, partyData.data, credentialSummary)
          }),
        )
        console.log('newCredentialTableItems items', newCredentialTableItems.length)
        setCredentialTableItems(newCredentialTableItems)
      } catch (error) {
        console.error(error)
      }
    }

    void fetchCredentialTableItems()
  }, [credentialData, partyData])

  const onCredentialItemDelete = async (opts: Row<CredentialTableItem>): Promise<void> => {
    await onDelete(opts)
  }

  const onCredentialItemIssue = async (opts: Row<CredentialTableItem>): Promise<void> => {
    console.log('Issue credential clicked')
  }

  const columns: ColumnHeader<CredentialTableItem>[] = [
    {
      accessor: 'miniCardView',
      label: translate('credentials_fields_card'),
      type: TableCellType.CREDENTIAL_CARD,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'type',
      label: translate('credentials_fields_credential'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'issuer.contact.displayName',
      label: translate('credentials_fields_issuer_did'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'subject.contact.displayName',
      label: translate('credentials_fields_subject_did'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'createdStr',
      label: translate('credentials_fields_created'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'validFromStr',
      label: translate('credentials_fields_valid_from'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'expirationDateStr',
      label: translate('credentials_fields_expiration_date'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 200,
      },
    },
    {
      accessor: 'status',
      label: translate('credential_fields_status'),
      type: TableCellType.STATUS,
      columnOptions: {
        columnWidth: 120,
      },
    },
    {
      accessor: 'actions',
      label: translate('credential_fields_actions'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        cellOptions: {
          actions: [
            {
              caption: translate('credential_fields_actions_delete'),
              icon: ButtonIcon.DELETE,
              onClick: onCredentialItemDelete,
            },
            {
              caption: translate('action_issue_credential_caption'),
              onClick: onCredentialItemIssue,
            },
          ],
        },
      },
    },
  ]

  const onDelete = async (rowData: Row<CredentialTableItem>): Promise<void> => {
    if (!rowData) {
      return
    }
    await deleteCredential(
      {
        dataProviderName: 'supaBase',
        resource: 'credential',
        id: rowData.original.hash,
      },
      {
        onError: error => {
          throw new Error(`Failed to delete credential: ${JSON.stringify(error)}`)
        },
      },
    )
    await deleteCredentialReference(
      {
        dataProviderName: 'supaBase',
        resource: 'credential_reference',
        id: rowData.original.hash,
        meta: {
          idColumnName: 'credential_id',
        },
      },
      {
        onError: error => {
          throw new Error(`Failed to delete credential references: ${JSON.stringify(error)}`)
        },
      },
    )

    if (refetchCredentials) {
      void refetchCredentials()
    }
  }

  const onIssueCredential = async (): Promise<void> => {
    create(DataResource.CREDENTIALS)
  }

  const onShowCredentialDetails = async (row: Row<CredentialTableItem>): Promise<void> => {
    show(DataResource.CREDENTIALS, row.original.hash, undefined, {variables: {credentialRole: credentialRole}})
  }

  const buildActionList = (): Array<Button> => {
    const actions: Array<Button> = []
    if (allowIssueCredential) {
      actions.push({
        caption: translate('credentials_overview_action_add_credential'),
        icon: ButtonIcon.ADD,
        onClick: onIssueCredential,
      })
    }
    actions.push({
      caption: translate('credentials_overview_action_import_credential'),
      icon: ButtonIcon.ADD,
      onClick: async () => setShowImportCredentialModal(true),
    })

    return actions
  }

  const onImportCredential = async (file: File): Promise<void> => {
    const rawCredential = await file.text()
    const uniformCredential = CredentialMapper.toUniformCredential(rawCredential)
    const { issuerName, issuerAlias} = getCredentialIssuerNameAndAlias({ verifiableCredential: uniformCredential as VerifiableCredential })
    const correlationId = CredentialMapper.issuerCorrelationIdFromIssuerType(uniformCredential.issuer)
    const filter: FindPartyArgs = [
      {
        identities: {
          identifier: {
            correlationId,
          },
        },
      },
    ]

    const parties: Array<Party> = await agent.cmGetContacts({
      filter,
    })

    if (parties.length === 0) {
      const contact: AddContactArgs = {
        legalName: issuerName,
        displayName: issuerAlias,
        contactType: {
          id: '3875c12e-fdaa-4ef6-a340-c936e054b627',
          origin: PartyOrigin.EXTERNAL,
          type: PartyTypeType.ORGANIZATION,
          name: 'Sphereon_default_type',
          tenantId: '95e09cfc-c974-4174-86aa-7bf1d5251fb4',
        },
        identities: [
          {
            alias: correlationId,
            roles: [CredentialRole.ISSUER],
            origin: IdentityOrigin.EXTERNAL,
            identifier: {
              type: CorrelationIdentifierType.DID,
              correlationId,
            }
          }
        ]
      }

      await addContact(contact)
    }

    mutateOne(
        {
          resource: DataResource.CREDENTIALS,
          values: {
            rawDocument: rawCredential,
            credentialRole: CredentialRole.HOLDER,
            credentialId: uniformCredential.id ?? computeEntryHash(rawCredential),
            issuerCorrelationId: correlationId,
            issuerCorrelationType: CredentialCorrelationType.DID,
          },
        },
        {
          onSuccess: async () => {
            if (correlationId.toLowerCase().startsWith('did:ebsi') && uniformCredential.type.includes('VerifiableAuthorisationToOnboard')) {
              // We want to call the register in the background, so for now we are not dealing with the result, we just execute the register function
              void registerDidEbsiOnLedger({
                did: correlationId,
                credentialIssuer: issuerName
              }).catch(() => console.log(`Unable to register ebsi did ${correlationId} for issuer ${issuerName}`))
            }

            refetchParties().then(() => onCloseImportCredentialModal())
          }
        },
    )
  }

  const onValidateCredential = async (file: File): Promise<boolean> => {
    const filePattern = /\.(json|txt)$/i;

    if (!filePattern.test(file.name)) {
      return false
    }

    const rawCredential = await file.text()
    const uniformCredential = CredentialMapper.toUniformCredential(rawCredential)

    const verificationResult = await agent.verifyCredential({
      credential: uniformCredential as W3CVerifiableCredential,
      fetchRemoteContexts: true,
      policies: {
        credentialStatus: false,
        expirationDate: false,
        issuanceDate: false,
      }
    })

    return verificationResult.verified
  }

  const onCloseImportCredentialModal = async (): Promise<void> => {
    setShowImportCredentialModal(false)
  }

  if (credentialsError || partiesError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  if (credentialsLoading || partiesLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  return <div>
    {showImportCredentialModal && (
        <ImportFileModal
            headerTitle={translate('import_credential_modal_header_title')}
            headerSubTitle={translate('import_credential_modal_header_subtitle')}
            dragBoxCaption={translate('import_credential_modal_dragbox_caption')}
            dragBoxDescription={translate('import_credential_modal_dragbox_description')}
            validationMessage={translate('import_credential_modal_validation_message')}
            onImportFile={onImportCredential}
            onValidateFile={onValidateCredential}
            onClose={onCloseImportCredentialModal}
        />
    )}

    <SSITableView
        data={credentialTableItems}
        columns={columns}
        actions={buildActionList()}
        onRowClick={onShowCredentialDetails}
    />
  </div>
}

export default CredentialsList

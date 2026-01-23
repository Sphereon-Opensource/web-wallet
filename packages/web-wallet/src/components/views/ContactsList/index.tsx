import React, {FC, ReactElement} from 'react'
import {ColumnHeader, Row, SSITableView, SSITabView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {HttpError, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import short from 'short-uuid'
import {DataResource} from '@typings'
import {ButtonIcon} from '@sphereon/ui-components.core'
import type {Contact, MetadataItem, Party, MetadataTypes} from '@sphereon/ssi-sdk.data-store-types'
import {PartyTypeType} from '@sphereon/ssi-sdk.data-store-types'
import {camelToSnakeCase} from '@helpers/StringUtils'
import {getEnvInt} from '@/src/services/env'

type Props = {
  allowAddNewContact?: boolean
}

type GenerateHeaderProps = {
  type: Partial<Contact>
  truncationLength?: number
  labelPrefix?: string
}

const ContactsList: FC<Props> = (props: Props): ReactElement => {
  const {allowAddNewContact = true} = props
  const truncationLength: number = getEnvInt('BROWSER_PUBLIC_TRUNCATION_LENGTH', 8)
  const translate = useTranslate()
  const {create, show} = useNavigation()
  const {mutateAsync: deleteContact} = useDelete<Party, HttpError>()
  const partiesData = useList<Party, HttpError>({resource: 'parties'})

  if (partiesData.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }
  if (partiesData.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  const orderProperties = (entry: [string, string | Date | Array<MetadataItem<MetadataTypes>>][]) => {
    const index = entry.map(e => e[0]).indexOf('displayName')
    if (index === -1) {
      throw new Error(`displayName not found`)
    }
    entry.splice(1, 0, entry[index])
    entry.splice(index + 1, 1)
    return entry
  }

  const orderAndOmitContactProperties = (contact: Contact, propsToOmit: string[]) => {
    const orderedProperties = orderProperties(Object.entries(contact))
    return Object.fromEntries(orderedProperties.filter(([k, v]) => !propsToOmit.includes(k))) as Partial<Contact>
  }

  const createEmptyContactOfType = (partyType: PartyTypeType): Contact => {
    const date = new Date()

    switch (partyType) {
      case PartyTypeType.ORGANIZATION:
        return {
          id: '',
          displayName: '',
          legalName: '',
          createdAt: date,
          lastUpdatedAt: date,
        }
      case PartyTypeType.NATURAL_PERSON:
        return {
          id: '',
          displayName: '',
          firstName: '',
          middleName: '',
          lastName: '',
          createdAt: date,
          lastUpdatedAt: date,
        }
      default:
        throw new Error(`Unsupported party type ${partyType}`)
    }
  }

  const onShowContact = async (row: Row<Party>): Promise<void> => {
    show(DataResource.CONTACTS, row.original.id)
  }

  const createTabViewRoutes = (parties: Party[]) => {
    return Object.values(PartyTypeType)
      .reverse()
      .flatMap(key => {
        const partiesOfType = parties.filter(party => party.partyType.type === key)
        const columns = generateHeader({
          type: orderAndOmitContactProperties(partiesOfType[0]?.contact || createEmptyContactOfType(key), [
            'createdAt',
            'lastUpdatedAt',
            'metadata',
            'ownerId',
            'tenantId',
          ]),
          truncationLength,
          labelPrefix: `${key}_fields`,
        })
        return {
          key: short.generate(),
          title: translate(
            key === PartyTypeType.ORGANIZATION
              ? 'contacts_overview_organizations_tab_header_label'
              : 'contacts_overview_individuals_tab_header_label',
          ),
          content: () => (
            <SSITableView<Party>
              key={short.generate()}
              data={partiesOfType}
              columns={columns}
              actions={buildActionList(key)}
              enableRowSelection
              onDelete={async (contacts: Array<Party>): Promise<void> => {
                await Promise.all(
                  contacts.map((contact: Party) =>
                    deleteContact(
                      {
                        resource: 'parties',
                        id: contact.id,
                      },
                      {
                        onError: error => {
                          throw new Error(`Failed to delete contact: ${JSON.stringify(error)}`)
                        },
                      },
                    ),
                  ),
                )
                await partiesData.refetch()
              }}
              onRowClick={onShowContact}
            />
          ),
        }
      })
  }

  function generateHeader(props: GenerateHeaderProps): Array<ColumnHeader<Party>> {
    const {type, truncationLength, labelPrefix} = props
    return Object.keys(type).map(key => {
      const header: ColumnHeader<Party> = {
        accessor: `contact.${key}` as any,
        label: translate(labelPrefix ? `${camelToSnakeCase(labelPrefix)}_${camelToSnakeCase(key)}` : camelToSnakeCase(key)),
        type: TableCellType.TEXT,
      }
      if (key === 'id') {
        header.columnOptions = {
          cellOptions: {
            truncationLength,
            enableHover: true,
          },
          columnWidth: 120,
        }
      }
      return header
    })
  }

  const parties: Party[] = partiesData.data?.data ?? []

  const buildActionList = (partyType: PartyTypeType) => {
    switch (partyType) {
      case PartyTypeType.ORGANIZATION: {
        const actions = []
        if (allowAddNewContact) {
          actions.push({
            caption: translate('contacts_overview_action_add_contact'),
            icon: ButtonIcon.ADD,
            onClick: async (): Promise<void> => create(DataResource.ORGANIZATION_CONTACTS),
          })
        }
        return actions
      }
      case PartyTypeType.NATURAL_PERSON: {
        const actions = []
        if (allowAddNewContact) {
          actions.push({
            caption: translate('contacts_overview_action_add_contact'),
            icon: ButtonIcon.ADD,
            onClick: async (): Promise<void> => create(DataResource.PERSON_CONTACTS),
          })
        }
        return actions
      }
      default: {
        throw new Error(`Invalid party type ${partyType}`)
      }
    }
  }

  return <SSITabView routes={createTabViewRoutes(parties)} />
}

export default ContactsList

import React, {ChangeEvent, FC, ReactElement, useState} from 'react'
import {HttpError, useDelete, useList, useNavigation, useTranslate, useUpdate} from '@refinedev/core'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {removeCredentialConfigurationFromOid4vciMetadata} from '@/src/services/credentials/credentialDesignService'
import {Button, CredentialDesignDTO, CredentialDesignTableItem, DataResource} from '@typings'

type Props = {
  allowCreateCredentialDesign?: boolean
}

const CredentialDesignsList: FC<Props> = (props: Props): ReactElement => {
  const {allowCreateCredentialDesign = true} = props
  const translate = useTranslate()
  const {mutateAsync: deleteCredential} = useDelete<CredentialDesignDTO, HttpError>()
  const {create, edit} = useNavigation()
  const [current, setCurrent] = useState<number>(1)
  const [pageSize, _] = useState<number>(10)
  const {mutateAsync: updateCredential} = useUpdate<any, HttpError>()

  const {
    data: credentialDesigns,
    isLoading: credentialDesignsLoading,
    isError: credentialDesignsError,
  } = useList<CredentialDesignTableItem, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS,
    pagination: {
      pageSize,
      current,
      mode: 'server',
    },
    sorters: [
      {
        field: 'name',
        order: 'asc',
      },
    ],
    meta: {
      idColumnName: 'id',
    }
  })

  const onDelete = async (data: Row<CredentialDesignTableItem>): Promise<void> => {
    return deleteCredential({
      resource: DataResource.CREDENTIAL_DESIGNS,
      id: data.original.id
    })
    .then(() => removeCredentialConfigurationFromOid4vciMetadata(data.original.name))
    .catch(e => Promise.reject(Error(e.message)))
  }

  const onCreate = async (): Promise<void> => {
    create(DataResource.CREDENTIAL_DESIGNS)
  }

  const onEdit = async (data: Row<CredentialDesignTableItem>): Promise<void> => {
    edit(DataResource.CREDENTIAL_DESIGNS, data.original.id)
  }

  const onUpdate = async (): Promise<void> => {
    void updateCredential({
      resource: DataResource.CREDENTIAL_DESIGNS,
      id: '2e28e259-b6ec-494a-be90-ef0eef92fbcc',
      values: {
        name: 'nieuwe naam',
        schema: 'some schema',
        uiSchema: 'some ui schema',
        branding: {
          backgroundImage: {
            uri: 'https://png.pngtree.com/thumb_back/fh260/background/20250205/pngtree-soft-pastel-floral-design-light-blue-background-image_16896113.jpg',
            dimensions: {
              width: 666,
              height: 666
            }
          },
          logo: {
            uri: 'https://media.wired.com/photos/5926ffe47034dc5f91bed4e8/3:2/w_2560%2Cc_limit/google-logo.jpg',
            dimensions: {
              width: 1203,
              height: 802
            }
          },
          textColor: 'red',
          backgroundColor: 'black'
        },
        options: {
          format: 'some format',
          //scope: "bram_scope",
          vct: "nieuwe_vct_test",
          cryptographicBindingMethodsSupported: ["did:jwk", "did:web2"],
          credentialSigningAlgValuesSupported: ["BRAM_ALG_TEST2"],
          proofTypesSupported: {"bram": {"proof_signing_alg_values_supported": ["ES256"]}}
        },
        //isAdvancedSchema: false

      }
    })
  }

  const columns: ColumnHeader<CredentialDesignTableItem>[] = [
    {
        accessor: row => {
            return {
                ...(row.credentialDesignBranding.backgroundImage && {
                    backgroundImage: {
                        uri: row.credentialDesignBranding.backgroundImage.uri
                    },
                }),
                ...(row.credentialDesignBranding.logo && {
                    logo: {
                        uri: row.credentialDesignBranding.logo.uri,
                        dimensions: {
                            width: row.credentialDesignBranding.logo.dimensions?.width,
                            height: row.credentialDesignBranding.logo.dimensions?.height,
                        }
                    }
                }),
                backgroundColor: row.credentialDesignBranding.backgroundColor ?? undefined,
                logoColor: row.credentialDesignBranding.textColor ?? undefined
            }
        },
        label: translate('credential_design_fields_card'),
        type: TableCellType.CREDENTIAL_CARD,
        columnOptions: {
            columnWidth: 120,
        },
    },
    {
      accessor: 'name',
      label: translate('credential_design_fields_identifier'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 240,
      },
    },
    {
      accessor: row => {
        const keyItem = row.metadataKeys.find(key => key.key === 'credentialFormat')
        return keyItem?.values?.[0]?.textValue ?? ''
      },
      label: translate('credential_design_fields_credential_format'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 240,
      },
    },
    {
      accessor: row => {
        const keyItem = row.metadataKeys.find(key => key.key === 'credentialType')
        return keyItem?.values?.map(value => value.textValue).join(', ') ?? ''
      },
      label: translate('credential_design_fields_credential_type'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 240,
      },
    },
    {
      accessor: 'actions',
      label: translate('credential_design_fields_actions'),
      type: TableCellType.ACTIONS,
      columnOptions: {
        cellOptions: {
          actions: [
            {
              caption: translate('credential_design_actions_edit'),
              icon: ButtonIcon.EDIT,
              onClick: onEdit,
            },
            {
              caption: translate('credential_design_actions_delete'),
              icon: ButtonIcon.DELETE,
              onClick: onDelete,
            }
          ]
        }
      }
    }
  ]

  const buildActionList = (): Array<Button> => {
    const actions: Array<Button> = []
    if (allowCreateCredentialDesign) {
      actions.push({
        caption: translate('credential_designs_overview_action_create_design'),
        icon: ButtonIcon.ADD,
        onClick: onCreate,
      })
    }

    return actions
  }

  if (credentialDesignsError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  if (credentialDesignsLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  const designsData = credentialDesigns?.data ?? []
  const totalDesigns = credentialDesigns?.total ?? 0

  const onPageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setCurrent(page)
  }
  const onPageChangeKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      const input = event.target as HTMLInputElement
      let goToPage = Number(input.value)

      if (!isNaN(goToPage) && goToPage >= 1 && goToPage <= Math.ceil(totalDesigns / pageSize)) {
        setCurrent(goToPage)
      } else {
        console.error('Invalid page number')
      }
    }
  }

  return <div>
    <button style={{color: 'red'}} onClick={onUpdate}>UPDATE</button>
    <SSITableView
      data={designsData}
      columns={columns}
      actions={buildActionList()}
      pagination={{
        page: current,
        count: Math.ceil(totalDesigns / pageSize),
        onChange: onPageChange,
        goToInputId: 'custom-goToInput',
        containerStyle: {marginTop: '20px'},
        onKeyDown: onPageChangeKeyDown,
      }}
    />
  </div>
}

export default CredentialDesignsList

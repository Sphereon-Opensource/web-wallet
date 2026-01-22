import React, {ChangeEvent, FC, ReactElement, useState} from 'react'
import {HttpError, useDelete, useList, useNavigation, useTranslate} from '@refinedev/core'
import {ColumnHeader, Row, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {removeCredentialConfigurationFromOid4vciMetadata} from '@/src/services/credentials/credentialDesignService'
import {CredentialDesignDTO, CredentialDesignTableItem, DataResource} from '@typings'
import {ListPageHeader} from '@components/tables/ListPageHeader'
import style from './index.module.css'

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
    },
  })

  const onDelete = async (data: Row<CredentialDesignTableItem>): Promise<void> => {
    return deleteCredential({
      resource: DataResource.CREDENTIAL_DESIGNS,
      id: data.original.id,
    })
      .then(() => removeCredentialConfigurationFromOid4vciMetadata(data.original.name))
      .catch(e => Promise.reject(Error(e.message)))
  }

  const onShow = async (data: Row<CredentialDesignTableItem>): Promise<void> => {
    // TODO SSISDK-93 implement display/details page
  }

  const onCreate = async (): Promise<void> => {
    create(DataResource.CREDENTIAL_DESIGNS)
  }

  const onEdit = async (data: Row<CredentialDesignTableItem>): Promise<void> => {
    edit(DataResource.CREDENTIAL_DESIGNS, data.original.id)
  }

  const columns: ColumnHeader<CredentialDesignTableItem>[] = [
    {
      accessor: row => {
        return {
          ...(row.credentialDesignBranding?.backgroundImage && {
            backgroundImage: {
              uri: row.credentialDesignBranding.backgroundImage.uri,
            },
          }),
          ...(row.credentialDesignBranding?.logo && {
            logo: {
              uri: row.credentialDesignBranding.logo.uri,
              dimensions: {
                width: row.credentialDesignBranding.logo.dimensions?.width,
                height: row.credentialDesignBranding.logo.dimensions?.height,
              },
            },
          }),
          backgroundColor: row.credentialDesignBranding?.backgroundColor ?? undefined,
          logoColor: row.credentialDesignBranding?.textColor ?? undefined,
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
            },
          ],
        },
      },
    },
  ]

  // Handle error state - show empty state with option to create designs
  const designsData = credentialDesignsError ? [] : (credentialDesigns?.data ?? [])
  const totalDesigns = credentialDesignsError ? 0 : (credentialDesigns?.total ?? 0)

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

  // Loading state
  if (credentialDesignsLoading) {
    return (
      <div className={style.container}>
        <ListPageHeader
          actions={
            allowCreateCredentialDesign ? (
              <button type="button" className={style.actionButton} onClick={onCreate}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {translate('credential_designs_overview_action_create_design')}
              </button>
            ) : undefined
          }
        />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span className={style.loadingText}>{translate('data_provider_loading_message')}</span>
        </div>
      </div>
    )
  }

  // Empty state
  if (designsData.length === 0) {
    return (
      <div className={style.container}>
        <ListPageHeader
          actions={
            allowCreateCredentialDesign ? (
              <button type="button" className={style.actionButton} onClick={onCreate}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {translate('credential_designs_overview_action_create_design')}
              </button>
            ) : undefined
          }
        />
        {credentialDesignsError && (
          <div className={style.warningBanner}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>
              {translate(
                'credential_designs_connection_error',
                'Unable to connect to the credential design service. You can still create new designs.',
              )}
            </span>
          </div>
        )}
        <div className={style.emptyState}>
          <div className={style.emptyStateIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="7" y1="8" x2="17" y2="8" />
              <line x1="7" y1="12" x2="14" y2="12" />
              <line x1="7" y1="16" x2="11" y2="16" />
            </svg>
          </div>
          <h3 className={style.emptyStateTitle}>
            {translate('credential_designs_empty_title', 'No credential designs yet')}
          </h3>
          <p className={style.emptyStateDescription}>
            {translate(
              'credential_designs_empty_description',
              'Create your first credential design to define the structure and appearance of verifiable credentials.',
            )}
          </p>
          {allowCreateCredentialDesign && (
            <button type="button" className={style.emptyStateButton} onClick={onCreate}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {translate('credential_designs_overview_action_create_design')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // Normal state with data
  return (
    <div className={style.container}>
      <ListPageHeader
        actions={
          allowCreateCredentialDesign ? (
            <button type="button" className={style.actionButton} onClick={onCreate}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {translate('credential_designs_overview_action_create_design')}
            </button>
          ) : undefined
        }
      />
      {credentialDesignsError && (
        <div className={style.warningBanner}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            {translate(
              'credential_designs_connection_error',
              'Unable to connect to the credential design service. You can still create new designs.',
            )}
          </span>
        </div>
      )}
      <div className={style.contentArea}>
        <div className={style.tableContainer}>
          <SSITableView
            data={designsData}
            columns={columns}
            onRowClick={onShow}
            onRowDoubleClick={onEdit}
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
      </div>
    </div>
  )
}

export default CredentialDesignsList

import {HttpError, useList, useNavigation, useTranslate} from '@refinedev/core'
import {ColumnHeader, SSITableView, TableCellType} from '@sphereon/ui-components.ssi-react'
import {ButtonIcon} from '@sphereon/ui-components.core'
import React, {ChangeEvent, useState} from 'react'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import {Asset, CredentialReference, DataResource} from '@typings'
import style from './index.module.css'
import {VerifiableCredential} from '@veramo/core'
import {getMatchingIdentity} from '@helpers/IdentityFilters'
import {ID_TRUNCATION_LENGTH} from '../../src/agent/environment'
import {Party} from '@sphereon/ssi-sdk.data-store'
import {staticPropsWithSST} from '../../src/i18n/server'

export class AssetDTO {
  id: string
  name: string
  owner_did: string
  description: string
  contact_id: string
  contact_name: string
  credentials: VerifiableCredential[]

  static from(asset: Asset, parties: Party[], credentials: CredentialReference[] | undefined = undefined): AssetDTO {
    const party = getMatchingIdentity(parties, asset.owner_id)
    const dto = {
      id: asset.id,
      name: asset.name,
      owner_did: asset.owner_id,
      description: asset.description,
    } as AssetDTO
    if (party) {
      const contact = party.party.contact
      dto.contact_name = contact.displayName
      dto.contact_id = contact.id
    } else {
      dto.contact_name = '(not found)'
    }
    if (credentials) {
      dto.credentials = credentials.map(credentialRec => JSON.parse(credentialRec.credential_string) as VerifiableCredential)
    }
    return dto
  }

  public static toAsset(dto: AssetDTO): Asset {
    return {
      id: dto.id,
      name: dto.name,
      owner_id: dto.owner_did,
      description: dto.description,
      contact_id: dto.contact_id,
      credentials: dto.credentials,
    }
  }
}

const AssetsListPage: React.FC = () => {
  const translate = useTranslate()
  const [current, setCurrent] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const {create, show} = useNavigation()

  const partyResults = useList<Party, HttpError>({
    resource: 'parties',
    // no filtering yet
  })
  const assets = useList<Asset, HttpError>({
    resource: `asset`,
    dataProviderName: 'supaBase',
    pagination: {
      mode: 'server',
      current,
      pageSize,
    },
  })

  if (assets.isLoading || partyResults.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  if (assets.isError || partyResults.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  const parties = partyResults.data?.data ?? []
  const totalAssets = assets.data?.total ?? 0
  const assetData = assets.data?.data ?? []
  const assetsDTOs = assetData.map(a => {
    return AssetDTO.from(a, parties)
  })

  const columns: Array<ColumnHeader<Asset>> = [
    {
      accessor: 'id',
      label: translate('asset_fields_id'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 60,
        cellOptions: {
          truncationLength: ID_TRUNCATION_LENGTH,
          enableHover: true,
        },
      },
    },
    {
      accessor: 'name',
      label: translate('asset_fields_name'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'contact_name',
      label: translate('asset_fields_owner'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'description',
      label: translate('asset_fields_description'),
      type: TableCellType.TEXT,
    },
    {
      accessor: 'credential',
      label: translate('asset_fields_credential'),
      type: TableCellType.TEXT,
      columnOptions: {
        columnWidth: 120,
      },
    },
  ]

  // FIXME replace any with correct type
  const onShowAsset = async (row: any): Promise<void> => {
    show(DataResource.ASSETS, row.original.id) // FIXME, why do we not pass in the asset? we just fetch it again based on this id, while we already have iot
  }
  const onPageChange = (_event: ChangeEvent<unknown>, page: number) => {
    setCurrent(page)
  }
  const onPageChangeKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      const input = event.target as HTMLInputElement
      let goToPage = Number(input.value)

      if (!isNaN(goToPage) && goToPage >= 1 && goToPage <= Math.ceil(totalAssets / pageSize)) {
        setCurrent(goToPage)
      } else {
        console.error('Invalid page number')
      }
    }
  }
  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('assets_overview_title')} />
      <SSITableView<Asset>
        data={assetsDTOs.map(value => AssetDTO.toAsset(value))}
        columns={columns}
        onRowClick={onShowAsset}
        enableFiltering
        actions={[
          {
            caption: translate('assets_overview_action_add_asset'),
            icon: ButtonIcon.ADD,
            onClick: async (): Promise<void> => create(DataResource.ASSETS),
          },
        ]}
        pagination={{
          page: current,
          count: Math.ceil(totalAssets / pageSize),
          onChange: onPageChange,
          goToInputId: 'custom-goToInput',
          containerStyle: {marginTop: '20px'},
          onKeyDown: onPageChangeKeyDown,
        }}
      />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default AssetsListPage

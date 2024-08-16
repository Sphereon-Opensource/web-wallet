import React, {FC, ReactElement, useState} from "react";
import {useTranslation} from '@refinedev/core'
import {Row} from "@tanstack/react-table";
import {ColumnHeader, SSICredentialCardView, SSITableView, TableCellType} from "@sphereon/ui-components.ssi-react";
import {staticPropsWithSST} from "@/src/i18n/server";
import DropDownList from "@components/lists/DropDownList";
import {CatalogDisplayMode, CredentialCatalogItem, ValueSelection} from "@typings";
import style from './index.module.css'

type Props = {
    items: Array<any>
    onClick?: (item: CredentialCatalogItem) => Promise<void>
}

const CredentialCatalogView: FC<Props> = (props: Props): ReactElement => {
    const {items, onClick} = props
    const {translate} = useTranslation()
    const [catalogDisplayMode, setCatalogDisplayMode] = useState<string>(CatalogDisplayMode.CARD_VIEW)

    const credentialCatalogDisplayModes: Array<ValueSelection> = [
        {label: translate('credential_catalog_card_view_display_mode'), value: CatalogDisplayMode.CARD_VIEW},
        {label: translate('credential_catalog_list_view_display_mode'), value: CatalogDisplayMode.LIST_VIEW},
    ]

    const onCatalogDisplayModeChange = async (selection: ValueSelection): Promise<void> => {
        await setCatalogDisplayMode(selection.value)
    }

    const columns: Array<ColumnHeader<CredentialCatalogItem>> = [
        {
            accessor: 'credential',
            label: translate('credential_catalog_column_card_label'),
            type: TableCellType.CREDENTIAL_CARD,
            columnOptions: {
                columnWidth: 100,
            },
        },
        {
            accessor: 'credential.credentialTitle',
            label: translate('credential_catalog_column_credential_title_label'),
            type: TableCellType.TEXT,
            columnOptions: {
                columnWidth: 291,
            },
        },
        {
            accessor: 'credential.issuerName',
            label: translate('credential_catalog_column_issuer_label'),
            type: TableCellType.TEXT,
            columnOptions: {
                columnWidth: 291,
            },
        },
        {
            accessor: 'credential.credentialSubtitle',
            label: translate('credential_catalog_column_credential_description_label'),
            type: TableCellType.TEXT,
            columnOptions: {
                columnWidth: 291,
            },
        },
        {
            accessor: 'actions',
            label: translate('credential_catalog_column_actions_label'),
            type: TableCellType.ACTIONS,
            columnOptions: {
                columnWidth: 92,
                cellOptions: {
                    actions: [], // TODO implementation when we need actions
                },
            },
        },
    ]

    const getCredentialCardElements = (): Array<ReactElement> => {
        return items.map((item, index) => (
            <div
                key={index}
                className={style.cardItem}
            >
                <div
                    className={style.cardContainer}
                    onClick={() => onClick?.(item)}
                >
                    <SSICredentialCardView
                        header={{
                            credentialTitle: item.credential.credentialTitle,
                            credentialSubtitle: item.credential.credentialSubtitle,
                            logo: item.credential.logo,
                        }}
                        body={{
                            issuerName: item.credential.issuerName,
                        }}
                        footer={{
                            showExpirationDate: false,
                            credentialStatus: item.credential.credentialStatus
                        }}
                        display={{
                            backgroundColor: item.credential.backgroundColor,
                            backgroundImage: item.credential.backgroundImage,
                            textColor: item.credential.textColor,
                        }}
                    />
                </div>
                <div>
                    <div className={style.cardFooterTitle}>{item.credential.credentialTitle}</div>
                    <div className={style.cardFooterDescription}>{item.credential.credentialSubtitle}</div>
                </div>
            </div>
        ));
    }

    return <div className={style.container}>
        <div className={style.menuContainer}>
            <DropDownList<ValueSelection>
                options={credentialCatalogDisplayModes}
                onChange={onCatalogDisplayModeChange}
                defaultValue={credentialCatalogDisplayModes[0]}
            />
        </div>
        { catalogDisplayMode === CatalogDisplayMode.CARD_VIEW &&
            <div className={style.cardViewContainer}>
                {getCredentialCardElements()}
            </div>
        }
        { catalogDisplayMode === CatalogDisplayMode.LIST_VIEW &&
            <div className={style.listViewContainer}>
                <SSITableView<CredentialCatalogItem>
                    data={items}
                    columns={columns}
                    onRowClick={async (data: Row<CredentialCatalogItem>): Promise<void> => onClick?.(data.original)}
                />
            </div>
        }
    </div>
}

export const getStaticProps = staticPropsWithSST

export default CredentialCatalogView

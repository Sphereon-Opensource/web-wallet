import {SSICredentialCardView, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {HttpError, useOne, useTranslate} from '@refinedev/core'
import {VerifiableCredential} from '@veramo/core'
import React, {ReactElement, useEffect, useState} from 'react'
import {useParams} from 'react-router-dom'
import {SSRConfig} from 'next-i18next'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'
import nextI18NextConfig from '../../../next-i18next.config.mjs'
import SideDetailsNavigationBar from '@components/bars/SideDetailsNavigationBar'
import WorkflowList from '@components/views/WorkflowList'
import DocumentsList from '@components/views/DocumentsList'
import ContactsList from '@components/views/ContactsList'
import KeyValueListView from '@components/views/KeyValueListView'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {buildInformationDetails} from '@helpers/Credentials/CredentialsHelper'
import {Asset, DetailRoute, DetailsRoute, DocumentCategory, KeyValuePair} from '@typings'
import style from './index.module.css'
import {CredentialStatus, fontColors} from '@sphereon/ui-components.core'
import QRCodeModal, {QRValueResult} from 'src/components/modals/QRCodeModal'
import {qrValueGenerator} from '../../../src/services/credentials/CredentialService'
import {staticPropsWithSST} from '@/src/i18n/server'

function ShowAssetDetails() {
  const translate = useTranslate()
  const [activeRouteId, setActiveRouteId] = useState<string | undefined>(DetailRoute.DETAILS)
  const [showCredentialQRCodeModal, setShowCredentialQRCodeModal] = useState<boolean>(false)
  const {id} = useParams()
  const asset = useOne<Asset, HttpError>({
    dataProviderName: 'supaBase',
    resource: 'asset',
    id,
  })
  const [credential, setCredential] = useState<VerifiableCredential | undefined>(undefined)
  const [informationDetails, setInformationDetails] = useState<Array<KeyValuePair>>([])

  async function generateQr(): Promise<QRValueResult> {
    if (!credential?.id) {
      throw Error(`No credential present`)
    }
    return qrValueGenerator({hashOrId: credential!.id}, {credentials: ['CertificationOfOrigin', 'VerifiableCredential']})
  }

  useEffect((): void => {
    async function fetchCredentialData(): Promise<void> {
      try {
        if (id) {
          const details = await buildInformationDetails(id, async (vc: VerifiableCredential) => setCredential(vc))
          setInformationDetails(details)
        }
      } catch (error) {
        console.error('Error fetching information details:', error)
      }
    }
    void fetchCredentialData()
  }, [id])

  const detailsMenuRoutes: Array<DetailsRoute> = [
    {
      routeId: DetailRoute.DETAILS,
      label: translate('show_asset_details_menu_details_label'),
    },
    // {
    //     routeId: DetailRouteEnum.EVENTS,
    //     label: translate('show_asset_details_menu_events_label'),
    // },
    {
      routeId: DetailRoute.DOCUMENTS,
      label: translate('show_asset_details_menu_documents_label'),
      routes: [
        {
          routeId: DetailRoute.DOCUMENTS_REPORTS,
          label: translate('show_asset_details_menu_documents_reports_label'),
        },
        {
          routeId: DetailRoute.DOCUMENTS_CERTIFICATES,
          label: translate('show_asset_details_menu_documents_certificates_label'),
        },
        {
          routeId: DetailRoute.DOCUMENTS_OTHER_FILES,
          label: translate('show_asset_details_menu_documents_other_files_label'),
        },
        // {
        //     routeId: DetailRouteEnum.DOCUMENTS_VCS,
        //     label: translate('show_asset_details_menu_documents_vcs_label')
        // }
      ],
    },
    {
      routeId: DetailRoute.INVOLVED_CONTACTS,
      label: translate('show_asset_details_menu_involved_contacts_label'),
    },
  ]

  const onOpenModal = async (): Promise<void> => {
    setShowCredentialQRCodeModal(true)
  }

  const onCloseModal = async (): Promise<void> => {
    setShowCredentialQRCodeModal(false)
  }

  const onSubmitModal = async (): Promise<void> => {
    setShowCredentialQRCodeModal(false)
    //TODO call the VC api
  }

  const onRouteChange = async (routeId: string): Promise<void> => {
    setActiveRouteId(routeId)
  }

  const onBack = async (): Promise<void> => {
    window.history.back()
  }

  const findLabelByRouteId = (routeId: string, detailsRoutes: DetailsRoute[], parentLabel?: string): string | undefined => {
    for (const route of detailsRoutes) {
      if (route.routeId === routeId) {
        return parentLabel ? `${parentLabel} / ${route.label}` : route.label
      }

      if (route.routes) {
        const label: string | undefined = findLabelByRouteId(routeId, route.routes, route.label)
        if (label) {
          return label
        }
      }
    }

    return undefined
  }

  if (asset.isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  if (asset.isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  const getDetailsContent = (): ReactElement => {
    return (
      <div className={style.sectionContentContainer}>
        <div className={style.detailsCredentialInformationContainer}>
          <div className={style.detailsInformationContainer}>
            <KeyValueListView title={assetData.name} data={informationDetails} />
          </div>
          <div className={style.detailsCredentialCardContainer}>
            <div className={style.detailsCredentialCardCaption}>{translate('asset_details_credential_card_caption')}</div>
            <SSICredentialCardView
              header={{
                credentialTitle: credential?.name ?? credential?.credentialSubject?.items?.[0]?.name ?? process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_TITLE,
                credentialSubtitle:
                  credential?.description ??
                  credential?.credentialSubject?.items?.[0]?.description ??
                  process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_SUBTITLE,
                logo:
                  typeof credential?.issuer === 'object' && credential?.issuer?.branding?.logo
                    ? credential?.issuer?.branding?.logo
                    : {
                        uri: process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_LOGO,
                        dimensions: {
                          width: 327,
                          height: 186,
                        },
                      },
              }}
              body={{
                issuerName:
                  typeof credential?.issuer === 'object' && credential?.issuer?.name
                    ? credential?.issuer?.name
                    : process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_ISSUER_NAME,
              }}
              footer={{
                expirationDate: credential?.expirationDate ? +new Date(credential.expirationDate) : undefined,
                credentialStatus: process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_STATUS as CredentialStatus,
              }}
              display={{
                backgroundImage:
                  typeof credential?.issuer === 'object' && credential?.issuer?.branding?.backgroundImage
                    ? credential?.issuer?.branding?.backgroundImage
                    : {
                        uri: process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_BACKGROUND_IMAGE,
                        dimensions: {
                          width: 327,
                          height: 186,
                        },
                      },
                backgroundColor: 'rgba(0,0,0,0)',
                textColor: fontColors.light,
              }}
            />
            <SecondaryButton
              style={{
                border: '1px solid #7276F7',
                borderRadius: '6px',
                width: 130,
                height: '42px',
                marginTop: '75px',
              }}
              caption="Get credential"
              onClick={onOpenModal}
            />
          </div>
        </div>
        <div className={style.detailsRelatedInformationContainer}>
          <div className={style.detailsRelatedInformationCaption}>{translate('asset_details_related_information_caption')}</div>
          <WorkflowList assetIdFilter={assetData.id} />
        </div>
      </div>
    )
  }

  const getEventsContent = (): ReactElement => {
    return <div style={{backgroundColor: 'blue', display: 'flex', flexDirection: 'column', flexGrow: 1}}></div>
  }

  const getDocumentsContent = (): ReactElement => {
    return (
      <div className={style.sectionContentContainer}>
        <DocumentsList path={assetData.id} allowAddNewDocument={false} />
      </div>
    )
  }

  const getDocumentReportsContent = (): ReactElement => {
    return (
      <div className={style.sectionContentContainer}>
        <DocumentsList path={`${assetData.id}/${DocumentCategory.REPORTS}`} allowAddNewDocument={false} />
      </div>
    )
  }

  const getDocumentCertificatesContent = (): ReactElement => {
    return (
      <div className={style.sectionContentContainer}>
        <DocumentsList path={`${assetData.id}/${DocumentCategory.CERTIFICATES}`} allowAddNewDocument={false} />
      </div>
    )
  }

  const getDocumentOtherFilesContent = (): ReactElement => {
    return (
      <div className={style.sectionContentContainer}>
        <DocumentsList path={`${assetData.id}/${DocumentCategory.OTHER}`} allowAddNewDocument={false} />
      </div>
    )
  }

  const getDocumentVCsContent = (): ReactElement => {
    return (
      <div className={style.sectionContentContainer}>
        <DocumentsList path={`${assetData.id}/${DocumentCategory.VCS}`} allowAddNewDocument={false} />
      </div>
    )
  }

  const getInvolvedContactsContent = (): ReactElement => {
    return (
      <div className={style.sectionContentContainer}>
        <ContactsList assetIdFilter={assetData.id} allowAddNewContact={false} />
      </div>
    )
  }

  const getContent = (): ReactElement => {
    switch (activeRouteId) {
      case DetailRoute.DETAILS:
        return getDetailsContent()
      case DetailRoute.EVENTS:
        return getEventsContent()
      case DetailRoute.DOCUMENTS:
        return getDocumentsContent()
      case DetailRoute.DOCUMENTS_REPORTS:
        return getDocumentReportsContent()
      case DetailRoute.DOCUMENTS_CERTIFICATES:
        return getDocumentCertificatesContent()
      case DetailRoute.DOCUMENTS_OTHER_FILES:
        return getDocumentOtherFilesContent()
      case DetailRoute.DOCUMENTS_VCS:
        return getDocumentVCsContent()
      case DetailRoute.INVOLVED_CONTACTS:
        return getInvolvedContactsContent()
      default:
        return <div />
    }
  }

  // FIXME at this point the asset needs to be defined or we need to take action
  const assetData: Asset = asset.data?.data!
  
  return (
    <div className={style.container}>
      {showCredentialQRCodeModal && <QRCodeModal qrValueGenerator={generateQr} onClose={onCloseModal} onSubmit={onSubmitModal} />}
      <SideDetailsNavigationBar title={assetData.name} initialRoute={activeRouteId} routes={detailsMenuRoutes} onRouteChange={onRouteChange} />
      <div className={style.contentContainer}>
        <PageHeaderBar
          title={assetData.name}
          path={`${translate('asset_overview_path_label')}${findLabelByRouteId(activeRouteId!, detailsMenuRoutes)}`}
          onBack={onBack}
        />
        {getContent()}
      </div>
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default ShowAssetDetails

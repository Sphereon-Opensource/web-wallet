import {useTranslate} from '@refinedev/core'
import {SSICredentialCardView, PrimaryButton, SecondaryButton, SSITabView} from '@sphereon/ui-components.ssi-react'
import React, {CSSProperties, FC, ReactElement} from 'react'
import short from 'short-uuid'
import HeaderContainer from '@components/views/HeaderContainer'
import styles from './index.module.css'
import {VerifiableCredential} from '@veramo/core'
import {KeyValuePair} from '@typings'
import {CredentialStatus, fontColors} from '@sphereon/ui-components.core'

type Props = {
  titleCaption: string
  subTitleCaption?: string
  subCloseCaption?: string
  caption?: string
  onClose: () => Promise<void>
  onAbort?: () => Promise<void>
  actionAbortLabel?: string
  onSubmit: () => Promise<void>
  actionSubmitLabel?: string
  credential?: VerifiableCredential
  informationDetails: Array<KeyValuePair>
  style?: CSSProperties
}

const WorkflowApproveAsset: FC<Props> = (props: Props): ReactElement => {
  const {
    informationDetails = [],
    credential,
    titleCaption,
    subTitleCaption,
    subCloseCaption,
    caption,
    onClose,
    onAbort,
    actionAbortLabel,
    onSubmit,
    actionSubmitLabel,
    style, // TODO
  } = props
  const translate = useTranslate()

  const getDataRowElements = (): Array<ReactElement> => {
    return informationDetails.map((property: any) => (
      <div key={short.generate()} className={styles.informationDataRowContainer}>
        <div className={styles.informationDataLabel}>{property.label}</div>
        <div className={styles.informationDataValue}>{property.value}</div>
      </div>
    ))
  }

  type ImageType = {
    uri?: string
    dimensions?: {width: number; height: number}
  }

  type IssuerType = {
    name?: string
    branding: {
      logo?: ImageType
      backgroundImage?: ImageType
    }
  }
  // todo: replace this with a better solution regarding IssuerType from veramo
  const issuer = credential?.issuer as unknown as IssuerType
  return (
    <div className={styles.container}>
      <HeaderContainer titleCaption={titleCaption} subTitleCaption={subTitleCaption} subCloseCaption={subCloseCaption} onClose={onClose} />
      <div className={styles.contentContainer}>
        <div className={styles.contentCaptionContainer}>
          {caption && <div className={styles.descriptionCaption}>{caption}</div>}
          <div className={styles.subTitleCaption}>{translate('approve_asset_approve_information_title')}</div>
        </div>
        <div className={styles.tabsContainer}>
          <SSITabView
            routes={[
              {
                key: short.generate(),
                title: 'Credential details',
                content: () => (
                  <div className={styles.tabsInformationRouteCredentialContainer}>
                    <div className={styles.tabsInformationRouteCardContainer}>
                      <SSICredentialCardView
                        header={{
                          credentialTitle:
                            credential?.name ?? credential?.credentialSubject?.items?.[0]?.name ?? process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_TITLE,
                          credentialSubtitle:
                            credential?.description ??
                            credential?.credentialSubject?.items?.[0]?.description ??
                            process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_SUBTITLE,
                          logo: issuer?.branding?.logo ?? {
                            uri: process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_LOGO,
                            dimensions: {
                              width: 327,
                              height: 186,
                            },
                          },
                        }}
                        body={{
                          issuerName: issuer?.name ?? process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_ISSUER_NAME,
                        }}
                        footer={{
                          expirationDate: credential?.expirationDate ? +new Date(credential.expirationDate) : undefined,
                          credentialStatus: process.env.NEXT_PUBLIC_TEMP_CREDENTIAL_STATUS as CredentialStatus,
                        }}
                        display={{
                          backgroundImage: issuer?.branding?.backgroundImage ?? {
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
                    </div>
                    <div
                      style={{
                        margin: '0 7.5% 15%',
                      }}>
                      <div className={styles.tabsInformationRouteContentContainer}>{getDataRowElements()}</div>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
      <div className={styles.buttonsContainer}>
        {onAbort && <SecondaryButton caption={actionAbortLabel ?? translate('action_decline_label')} onClick={onAbort} />}
        <PrimaryButton caption={actionSubmitLabel ?? translate('action_approve_label')} onClick={onSubmit} />
      </div>
    </div>
  )
}

export default WorkflowApproveAsset

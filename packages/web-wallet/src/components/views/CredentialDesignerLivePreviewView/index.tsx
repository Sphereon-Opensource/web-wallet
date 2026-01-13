import React, {CSSProperties, FC, ReactElement, useCallback, useMemo, useState} from 'react'
import {useTranslate} from '@refinedev/core'
import {ButtonIcon, ImageAttributes} from '@sphereon/ui-components.core'
import {CredentialMiniCardView, IconButton, SSICredentialCardView, SSITabView} from '@sphereon/ui-components.ssi-react'
import styles from './index.module.css'

type Props = {
  backgroundImage?: ImageAttributes
  backgroundColor?: string
  logo?: ImageAttributes
  textColor?: string
  style?: CSSProperties
}

const CredentialDesignerLivePreviewView: FC<Props> = (props: Props): ReactElement => {
  const {backgroundImage, backgroundColor, logo, textColor, style} = props
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const translate = useTranslate()

  const getCredentialCardContent = useCallback((): ReactElement => {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          borderTop: '1px solid #C4C4C4',
          paddingTop: 24,
          paddingBottom: 24,
        }}>
        <SSICredentialCardView
          header={{
            ...(logo &&
              logo.dimensions && {
                logo: {
                  uri: logo.uri,
                  dimensions: {
                    width: logo.dimensions.width,
                    height: logo.dimensions.height,
                  },
                },
              }),
          }}
          footer={{}}
          display={{
            ...(backgroundImage && {
              backgroundImage: {
                uri: backgroundImage.uri,
              },
            }),
            backgroundColor,
            textColor,
          }}
        />
      </div>
    )
  }, [logo, backgroundImage, backgroundColor, textColor])

  const getMiniCardContent = useCallback((): ReactElement => {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          borderTop: '1px solid #C4C4C4',
          paddingTop: 24,
          paddingBottom: 24,
        }}>
        <CredentialMiniCardView
          {...(backgroundImage && {
            backgroundImage: {
              uri: backgroundImage.uri,
            },
          })}
          backgroundColor={backgroundColor}
          logoColor={textColor}
          {...(logo &&
            logo.dimensions && {
              logo: {
                uri: logo.uri,
                dimensions: {
                  width: logo.dimensions.width,
                  height: logo.dimensions.height,
                },
              },
            })}
        />
      </div>
    )
  }, [logo, backgroundImage, backgroundColor, textColor])

  const routes = useMemo(
    () => [
      {
        key: 'credential',
        title: translate('design_credential_live_preview_credential_card_tab_header_label'),
        content: getCredentialCardContent,
      },
      {
        key: 'mini',
        title: translate('design_credential_live_preview_mini_card_tab_header_label'),
        content: getMiniCardContent,
      },
    ],
    [getCredentialCardContent, getMiniCardContent],
  )

  const toggleCollapsed = async (): Promise<void> => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div style={style} className={styles.container}>
      <div className={styles.headerContainer}>
        <div className={styles.headerTitle}>{translate('design_credential_live_preview_title')}</div>
        <IconButton icon={isCollapsed ? ButtonIcon.ARROW_DOWN : ButtonIcon.ARROW_UP} onClick={toggleCollapsed} style={{marginLeft: 'auto'}} />
      </div>
      {!isCollapsed && <SSITabView routes={routes} />}
    </div>
  )
}

export default CredentialDesignerLivePreviewView

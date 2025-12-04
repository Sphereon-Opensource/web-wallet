import React, {CSSProperties, FC, ReactElement, useEffect, useState} from 'react'
import {ButtonIcon, TabViewRoute} from '@sphereon/ui-components.core'
import {CredentialMiniCardView, IconButton, SSICredentialCardView, SSITabView} from '@sphereon/ui-components.ssi-react'
import styles from './index.module.css'

type Props = {
  backgroundImage?: string
  backgroundColor?: string
  logoImage?: string
  textColor?: string
  style?: CSSProperties
}

const CredentialDesignerLivePreviewView: FC<Props> = (props: Props): ReactElement => {
  const {
    backgroundImage,
    backgroundColor,
    logoImage,
    textColor,
    style
  } = props
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false)
  const [logo, setLogo] = useState<any>()

  // TODO we should have functions for this already
  function getImageDimensions(url: string): Promise<{ width: number, height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;

      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };

      img.onerror = (err) => {
        reject(err);
      };
    });
  }

  useEffect(() => {
    if (logoImage) {
      getImageDimensions(logoImage)
        .then((result) => setLogo({ url: logoImage, width: result.width, height: result.height }))
    } else {
      setLogo(undefined)
    }
  }, [logoImage])

  const getCredentialCardContent = (): ReactElement => {
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
          header={
            {
              ...(logo && {
                  logo: {
                    uri: logo.url,
                    dimensions: {
                      width: logo.width,
                      height: logo.height,
                    }
                  }
                }
              )
            }
          }
          footer={{}}
          display={
            {
              ...(backgroundImage && {
                backgroundImage: {
                  uri: backgroundImage
                },
              }),
              backgroundColor,
              textColor,
            }
          }
        />
      </div>
    )
  }

  const getMiniCardContent = (): ReactElement => {
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
          backgroundColor={backgroundColor}
          logoColor={textColor}
          {...(logo && {
            logo: {
              uri: logo.url,
              dimensions: {
                width: logo.width,
                height: logo.height,
              }
            }
          })}
        />
      </div>
    )
  }

  const routes: Array<TabViewRoute> = [
    {
      key: 'credential',
      title: 'Credential card',
      content: getCredentialCardContent,
    },
    {
      key: 'mini',
      title: 'Mini card',
      content: getMiniCardContent,
    },
  ]

  const toggleCollapsed = async (): Promise<void> => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div style={style} className={styles.container}>
      <div className={styles.headerContainer}>
        <div className={styles.headerTitle}>{'Live Preview'}</div>
        <IconButton
          icon={isCollapsed ? ButtonIcon.ARROW_DOWN : ButtonIcon.ARROW_UP }
          onClick={toggleCollapsed}
          style={{marginLeft: 'auto'}}
        />
      </div>
      {!isCollapsed && <SSITabView routes={routes} />}
    </div>
  )
}

export default CredentialDesignerLivePreviewView

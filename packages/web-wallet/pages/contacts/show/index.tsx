import React, {FC, ReactElement, useEffect, useState} from 'react'
import {useParams} from 'react-router-dom'
import {HttpError, useOne, useTranslation} from '@refinedev/core'
import {CredentialRole, IBasicCredentialLocaleBranding, Party} from '@sphereon/ssi-sdk.data-store'
import {OpenID4VCIClient} from '@sphereon/oid4vci-client'
import {CredentialStatus, TabViewRoute} from '@sphereon/ui-components.core'
import {ContactViewItem, SSITabView} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {
  CredentialConfigurationSupported,
  CredentialConfigurationSupportedV1_0_13,
  CredentialsSupportedDisplay
} from '@sphereon/oid4vci-common'
import agent from "@agent";
import { credentialLocaleBrandingFrom } from '@/src/OIDC4VCIBrandingMapper'
import CredentialCatalogView from "@components/views/CredentialCatalogView";
import style from './index.module.css'
import {CredentialCatalogItem} from '@typings';

enum ContactDetailsTabRoute {
  INFO = 'info',
  ACTIVITY = 'activity',
  CREDENTIAL_CATALOG = 'credentialCatalog',
  RELATIONS = 'relations',
  IDENTIFIERS = 'identifiers',
}

type getCredentialBrandingArgs = {
  credentialsSupported: Record<string, CredentialConfigurationSupported>
}

type SelectCredentialLocaleBrandingArgs = {
  locale?: string
  localeBranding?: Array<IBasicCredentialLocaleBranding>
}

const ShowContactDetails: FC = (): ReactElement => {
  const {translate, getLocale} = useTranslation()
  const params = useParams()
  const {id} = params
  const [credentialsSupported, setCredentialsSupported] = useState<Record<string, CredentialConfigurationSupportedV1_0_13> | undefined>(undefined)
  const [credentialCatalogItems, setCredentialCatalogItems] = useState<Array<CredentialCatalogItem>>([])
  const [openID4VCIClient, setOpenID4VCIClient] = useState<OpenID4VCIClient>()

  const { isLoading, isError, data: partyData } = useOne<Party, HttpError>({
    resource: 'parties',
    id
  })

  const getSupportedCredentials = (): Record<string, CredentialConfigurationSupportedV1_0_13> => { // TODO any
    try {
      // TODO returns a map not an array
      //const supportedCredentials = openID4VCIClient!.getCredentialsSupported() // TODO !
      const credentialsSupported: Record<string, CredentialConfigurationSupportedV1_0_13> = {
        "UniversityDegreeCredential": {
          "format": "jwt_vc_json",
          "scope": "UniversityDegree",
          "cryptographic_binding_methods_supported": [
            "did:example"
          ],
          "credential_signing_alg_values_supported": [
            "ES256"
          ],
          "credential_definition": {
            "type": [
              "VerifiableCredential",
              "UniversityDegreeCredential"
            ],
            "credentialSubject": {
              // "given_name": {
              //   "display": [
              //     {
              //       "name": "Given Name",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "family_name": {
              //   "display": [
              //     {
              //       "name": "Surname",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "degree": {},
              // "gpa": {
              //   "display": [
              //     {
              //       "name": "GPA"
              //     }
              //   ]
              // }
            }
          },
          "proof_types_supported": {
            "jwt": {
              "proof_signing_alg_values_supported": [
                "ES256"
              ]
            }
          },
          "display": [
            {
              "name": "University Credential",
              "description": "JFF Plugfest 3 OpenBadge Credential",
              "locale": "en-US",
              "logo": {
                "uri": "https://img.freepik.com/free-vector/colorful-letter-gradient-logo-design_474888-2309.jpg",
                "alt_text": "a square logo of a university"
              },
              "background_color": "#e1f7d5",
              "background_image": {
                "uri": "https://images.rawpixel.com/image_800/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvdjEwMTYtYy0wNi1rc2g2bXZ2bi5qcGc.jpg",
                "alt_text": "random background"
              },
              "text_color": "#FFFFFF"
            }
          ]
        },
        "PassportCredential": {
          "format": "jwt_vc_json",
          "scope": "UniversityDegree",
          "cryptographic_binding_methods_supported": [
            "did:example"
          ],
          "credential_signing_alg_values_supported": [
            "ES256"
          ],
          "credential_definition": {
            "type": [
              "VerifiableCredential",
              "UniversityDegreeCredential"
            ],
            "credentialSubject": {
              // "given_name": {
              //   "display": [
              //     {
              //       "name": "Given Name",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "family_name": {
              //   "display": [
              //     {
              //       "name": "Surname",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "degree": {},
              // "gpa": {
              //   "display": [
              //     {
              //       "name": "GPA"
              //     }
              //   ]
              // }
            }
          },
          "proof_types_supported": {
            "jwt": {
              "proof_signing_alg_values_supported": [
                "ES256"
              ]
            }
          },
          "display": [
            {
              "name": "Passport Credential",
              "description": "Passport of the Kingdom of Kākāpō",
              "locale": "en-US",
              "logo": {
                "url": "https://img.freepik.com/free-vector/bird-colorful-logo-gradient-vector_343694-1365.jpg?size=338&ext=jpg&ga=GA1.1.2008272138.1723680000&semt=ais_hybrid",
                "alt_text": "a square logo of a university"
              },
              "background_color": "#ffbdbd",
              "text_color": "#FFFFFF"
            }
          ]
        },
        "OpenBadgeCredential": {
          "format": "jwt_vc_json",
          "scope": "UniversityDegree",
          "cryptographic_binding_methods_supported": [
            "did:example"
          ],
          "credential_signing_alg_values_supported": [
            "ES256"
          ],
          "credential_definition": {
            "type": [
              "VerifiableCredential",
              "UniversityDegreeCredential"
            ],
            "credentialSubject": {
              // "given_name": {
              //   "display": [
              //     {
              //       "name": "Given Name",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "family_name": {
              //   "display": [
              //     {
              //       "name": "Surname",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "degree": {},
              // "gpa": {
              //   "display": [
              //     {
              //       "name": "GPA"
              //     }
              //   ]
              // }
            }
          },
          "proof_types_supported": {
            "jwt": {
              "proof_signing_alg_values_supported": [
                "ES256"
              ]
            }
          },
          "display": [
            {
              "name": "OpenBadge Credential",
              "description": "OpenBadge of skill X",
              "locale": "en-US",
              "logo": {
                "url": "https://img.freepik.com/free-vector/bird-colorful-logo-gradient-vector_343694-1365.jpg?size=338&ext=jpg&ga=GA1.1.2008272138.1723680000&semt=ais_hybrid",
                "alt_text": "a square logo of a university"
              },
              "background_color": "#c9c9ff",
              "text_color": "#FFFFFF"
            }
          ]
        },
        "MunicipalityCredential": {
          "format": "jwt_vc_json",
          "scope": "UniversityDegree",
          "cryptographic_binding_methods_supported": [
            "did:example"
          ],
          "credential_signing_alg_values_supported": [
            "ES256"
          ],
          "credential_definition": {
            "type": [
              "VerifiableCredential",
              "UniversityDegreeCredential"
            ],
            "credentialSubject": {
              // "given_name": {
              //   "display": [
              //     {
              //       "name": "Given Name",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "family_name": {
              //   "display": [
              //     {
              //       "name": "Surname",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "degree": {},
              // "gpa": {
              //   "display": [
              //     {
              //       "name": "GPA"
              //     }
              //   ]
              // }
            }
          },
          "proof_types_supported": {
            "jwt": {
              "proof_signing_alg_values_supported": [
                "ES256"
              ]
            }
          },
          "display": [
            {
              "name": "Municipality Credential",
              "description": "Proof of living in a municipality",
              "locale": "en-US",
              "logo": {
                "url": "https://img.freepik.com/free-vector/bird-colorful-logo-gradient-vector_343694-1365.jpg?size=338&ext=jpg&ga=GA1.1.2008272138.1723680000&semt=ais_hybrid",
                "alt_text": "a square logo of a university"
              },
              "background_color": "#f1cbff",
              "text_color": "#FFFFFF"
            }
          ]
        },
        "DrivingLicenseCredential": {
          "format": "jwt_vc_json",
          "scope": "UniversityDegree",
          "cryptographic_binding_methods_supported": [
            "did:example"
          ],
          "credential_signing_alg_values_supported": [
            "ES256"
          ],
          "credential_definition": {
            "type": [
              "VerifiableCredential",
              "UniversityDegreeCredential"
            ],
            "credentialSubject": {
              // "given_name": {
              //   "display": [
              //     {
              //       "name": "Given Name",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "family_name": {
              //   "display": [
              //     {
              //       "name": "Surname",
              //       "locale": "en-US"
              //     }
              //   ]
              // },
              // "degree": {},
              // "gpa": {
              //   "display": [
              //     {
              //       "name": "GPA"
              //     }
              //   ]
              // }
            }
          },
          "proof_types_supported": {
            "jwt": {
              "proof_signing_alg_values_supported": [
                "ES256"
              ]
            }
          },
          "display": [
            {
              "name": "Driving License Credential",
              "description": "Proof of ability to drive a car",
              "locale": "en-US",
              "logo": {
                "url": "https://img.freepik.com/free-vector/bird-colorful-logo-gradient-vector_343694-1365.jpg?size=338&ext=jpg&ga=GA1.1.2008272138.1723680000&semt=ais_hybrid",
                "alt_text": "a square logo of a university"
              },
              "background_color": "#feffa3",
              "text_color": "#FFFFFF"
            }
          ]
        },
      }

      if (Array.isArray(credentialsSupported)) {
        throw Error('Only OID4VCI v13 is supported for now')
      }

      return credentialsSupported
    } catch (error) {
      // @ts-ignore // TODO
      throw Error(`Error fetching credential supported. ${error.message}`)
    }
  }

  const getCredentialBranding = async (args: getCredentialBrandingArgs): Promise<Record<string, Array<IBasicCredentialLocaleBranding>>> => {
    const { credentialsSupported } = args
    const credentialBranding: Record<string, Array<IBasicCredentialLocaleBranding>> = {}
    await Promise.all(
        Object.entries(credentialsSupported).map(async ([configId, credentialsConfigSupported]) => {
          const localeBranding: Array<IBasicCredentialLocaleBranding> = await Promise.all(
              (credentialsConfigSupported.display ?? []).map(
                  async (display: CredentialsSupportedDisplay): Promise<IBasicCredentialLocaleBranding> =>
                      await agent.ibCredentialLocaleBrandingFrom({ localeBranding: await credentialLocaleBrandingFrom(display) }),
              ),
          )

          // const defaultCredentialType = 'VerifiableCredential'
          // const credentialTypes: Array<string> = ('types' in credentialsConfigSupported // TODO credentialsConfigSupported.types is deprecated
          //     ? (credentialsConfigSupported.types as string[])
          //     : 'credential_definition' in credentialsConfigSupported
          //         ? credentialsConfigSupported.credential_definition.type
          //         : [defaultCredentialType]) ?? [configId]

          //const filteredCredentialTypes = credentialTypes.filter((type: string): boolean => type !== defaultCredentialType)
          credentialBranding[configId] = localeBranding // TODO for now taking the first type
        }),
    )

    // console.log(`BRANDING: ${JSON.stringify(credentialBranding)}`)

    return credentialBranding
  }

  const selectCredentialLocaleBranding = (args: SelectCredentialLocaleBrandingArgs): IBasicCredentialLocaleBranding | undefined => {
    const { locale, localeBranding } = args
    return localeBranding?.find((branding: IBasicCredentialLocaleBranding) => locale
        ? branding.locale?.startsWith(locale) || branding.locale === undefined
        : branding.locale === undefined
    )
  }

  useEffect(() => {
    if (isLoading) {
      return
    }

    const credentialIssuer= partyData?.data.identities.find((identity) => identity.roles.includes(CredentialRole.ISSUER))?.identifier.correlationId
    if (!credentialIssuer) {
      return
    }

    OpenID4VCIClient.fromCredentialIssuer({
      credentialIssuer,
      authorizationRequest: {
        scope: 'openid'
      }
    }).then(setOpenID4VCIClient)
  }, [id, isLoading])

  useEffect(() => {
    if (openID4VCIClient === undefined) {
      return
    }

    const credentials = getSupportedCredentials()
    setCredentialsSupported(credentials)
  }, [openID4VCIClient])

  useEffect(() => {
    if (credentialsSupported === undefined) {
      return
    }

    getCredentialBranding({ credentialsSupported })
        .then((credentialBranding) => {
          const credentialCatalogItems: Array<CredentialCatalogItem> = Object.entries(credentialBranding)
              .map(([configId, branding]) => {
                const localeBranding = selectCredentialLocaleBranding({ locale: getLocale(), localeBranding: branding })
                return {
                  configId,
                  credential: {
                    backgroundColor: localeBranding?.background?.color,
                    backgroundImage: localeBranding?.background?.image,
                    logo: localeBranding?.logo,
                    credentialTitle: localeBranding?.alias,
                    credentialSubtitle: localeBranding?.description,
                    issuerName: partyData?.data.contact.displayName,
                    credentialStatus: CredentialStatus.VALID,
                    textColor: localeBranding?.text?.color
                  },
                  actions: 'actions'
                }
              })
          setCredentialCatalogItems(credentialCatalogItems)
        })
  }, [credentialsSupported])

  if (isLoading) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  if (isError) {
    return <div>{translate('data_provider_error_message')}</div>
  }

  const party = partyData?.data

  const onGetCredentialItem = async (item: CredentialCatalogItem): Promise<void> => {
    console.log(`Get credential clicked for type: ${item.configId}`)
  }

  const getContactInformationContent = (): ReactElement => {
    return <div/>
  }

  const getActivityContent = (): ReactElement => {
    return <div/>
  }

  const getCredentialCatalogContent = (): ReactElement => {
    return <CredentialCatalogView
      items={credentialCatalogItems}
      onClick={onGetCredentialItem}
    />
  }

  const getRelationsContent = (): ReactElement => {
    return <div/>
  }

  const getIdentifiersContent = (): ReactElement => {
    return <div/>
  }

  const routes: Array<TabViewRoute> = [
    {
      key: ContactDetailsTabRoute.INFO,
      title: translate('contact_details_contact_info_tab_label'),
      content: getContactInformationContent,
    },
    {
      key: ContactDetailsTabRoute.ACTIVITY,
      title: translate('contact_details_activity_tab_label'),
      content: getActivityContent,
    },
    ...(!party.roles.includes(CredentialRole.ISSUER)
            ? [{
              key: ContactDetailsTabRoute.CREDENTIAL_CATALOG,
              title: translate('contact_details_credential_catalog_tab_label'),
              content: getCredentialCatalogContent,
            }]
            : []
    ),
    {
      key: ContactDetailsTabRoute.RELATIONS,
      title: translate('contact_details_relations_tab_label'),
      content: getRelationsContent,
    },
    {
      key: ContactDetailsTabRoute.IDENTIFIERS,
      title: translate('contact_details_identifiers_tab_label'),
      content: getIdentifiersContent,
    },
  ]

  return (
    <div className={style.container}>
      <PageHeaderBar path={translate('contact_details_path_label')} />
      <ContactViewItem
          name={party.contact.displayName}
          uri={party.uri}
          roles={party.roles}
          logo={party.branding?.logo}
      />
      <SSITabView routes={routes} />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default ShowContactDetails

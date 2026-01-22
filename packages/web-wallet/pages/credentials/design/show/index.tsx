import React, {FC, ReactElement, useCallback, useMemo, useState} from 'react'
import {useParams, useNavigate} from 'react-router-dom'
import {HttpError, useDelete, useOne, useTranslate} from '@refinedev/core'
import {SSICredentialCardView} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {staticPropsWithSST} from '@/src/i18n/server'
import {CredentialDesignTableItem, DataResource} from '@typings'
import {removeCredentialConfigurationFromOid4vciMetadata} from '@/src/services/credentials/credentialDesignService'
import style from './index.module.css'

enum CredentialDesignDetailsTab {
  OVERVIEW = 'overview',
  SCHEMA = 'schema',
  CLAIMS = 'claims',
}

const ShowCredentialDesignDetails: FC = (): ReactElement => {
  const translate = useTranslate()
  const params = useParams()
  const navigate = useNavigate()
  const {id} = params
  const {mutateAsync: deleteDesign} = useDelete<CredentialDesignTableItem, HttpError>()
  const [activeTab, setActiveTab] = useState<CredentialDesignDetailsTab>(CredentialDesignDetailsTab.OVERVIEW)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    isLoading,
    isError,
    data: designData,
  } = useOne<CredentialDesignTableItem, HttpError>({
    resource: DataResource.CREDENTIAL_DESIGNS,
    id,
    meta: {idColumnName: 'id'},
  })

  const design = designData?.data

  // Helper functions to extract metadata
  const getCredentialFormat = useCallback((design: CredentialDesignTableItem): string => {
    const keyItem = design.metadataKeys.find(key => key.key === 'credentialFormat')
    return keyItem?.values?.[0]?.textValue ?? '-'
  }, [])

  const getCredentialTypes = useCallback((design: CredentialDesignTableItem): string[] => {
    const keyItem = design.metadataKeys.find(key => key.key === 'credentialType')
    return keyItem?.values?.map(v => v.textValue).filter(Boolean) as string[] ?? []
  }, [])

  const getIssuerName = useCallback((design: CredentialDesignTableItem): string | undefined => {
    const keyItem = design.metadataKeys.find(key => key.key === 'issuerName')
    return keyItem?.values?.[0]?.textValue
  }, [])

  const getIssuerDid = useCallback((design: CredentialDesignTableItem): string | undefined => {
    const keyItem = design.metadataKeys.find(key => key.key === 'issuerDid')
    return keyItem?.values?.[0]?.textValue
  }, [])

  const getCredentialContext = useCallback((design: CredentialDesignTableItem): string[] => {
    const keyItem = design.metadataKeys.find(key => key.key === 'context')
    return keyItem?.values?.map(v => v.textValue).filter(Boolean) as string[] ?? []
  }, [])

  // Build full card view props from design branding
  const getFullCardViewProps = useCallback((design: CredentialDesignTableItem) => {
    const branding = design.credentialDesignBranding
    return {
      header: {
        ...(branding?.logo && branding.logo.dimensions && {
          logo: {
            uri: branding.logo.uri,
            dimensions: {
              width: branding.logo.dimensions.width,
              height: branding.logo.dimensions.height,
            },
          },
        }),
      },
      footer: {},
      display: {
        ...(branding?.backgroundImage && {
          backgroundImage: {
            uri: branding.backgroundImage.uri,
          },
        }),
        ...(branding?.backgroundColor && {
          backgroundColor: branding.backgroundColor,
        }),
        ...(branding?.textColor && {
          textColor: branding.textColor,
        }),
      },
    }
  }, [])

  // Handle navigation to edit
  const handleEdit = useCallback(() => {
    if (design) {
      navigate(`/credentials/designs/edit/${design.id}/details`)
    }
  }, [design, navigate])

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!design) return
    if (!confirm(translate('credential_design_delete_confirm', 'Are you sure you want to delete this credential design?') as string)) return

    setIsDeleting(true)
    try {
      await deleteDesign({
        resource: DataResource.CREDENTIAL_DESIGNS,
        id: design.id,
      })
      await removeCredentialConfigurationFromOid4vciMetadata(design.name)
      navigate('/credentials/designs')
    } catch (error) {
      console.error('Failed to delete design:', error)
      alert(translate('credential_design_delete_error', 'Failed to delete credential design') as string)
    } finally {
      setIsDeleting(false)
    }
  }, [design, deleteDesign, navigate, translate])

  // Build tabs array
  const tabs: {id: CredentialDesignDetailsTab; label: string}[] = useMemo(() => [
    {id: CredentialDesignDetailsTab.OVERVIEW, label: translate('credential_design_tab_overview', 'Overview') as string},
    {id: CredentialDesignDetailsTab.SCHEMA, label: translate('credential_design_tab_schema', 'Schema') as string},
    {id: CredentialDesignDetailsTab.CLAIMS, label: translate('credential_design_tab_claims', 'Claims') as string},
  ], [translate])

  // Render overview tab content
  const getOverviewContent = (): ReactElement => {
    if (!design) return <></>

    const format = getCredentialFormat(design)
    const types = getCredentialTypes(design)
    const issuerName = getIssuerName(design)
    const issuerDid = getIssuerDid(design)
    const branding = design.credentialDesignBranding

    return (
      <div className={style.overviewContent}>
        {/* Credential Card Preview */}
        <div className={style.cardSection}>
          <h3 className={style.sectionTitle}>{translate('credential_design_preview_title', 'Card Preview')}</h3>
          <div className={style.cardPreviewLarge}>
            <SSICredentialCardView {...getFullCardViewProps(design)} />
          </div>
        </div>

        {/* Details Section */}
        <div className={style.detailsSection}>
          <h3 className={style.sectionTitle}>{translate('credential_design_details_title', 'Details')}</h3>
          <div className={style.detailsGrid}>
            <div className={style.detailItem}>
              <span className={style.detailLabel}>{translate('credential_design_fields_identifier', 'Name')}</span>
              <span className={style.detailValue}>{design.name}</span>
            </div>
            <div className={style.detailItem}>
              <span className={style.detailLabel}>{translate('credential_design_fields_credential_format', 'Format')}</span>
              <span className={style.detailValue}>{format}</span>
            </div>
            {types.length > 0 && (
              <div className={style.detailItem}>
                <span className={style.detailLabel}>{translate('credential_design_fields_credential_type', 'Type')}</span>
                <div className={style.typesList}>
                  {types.map((type, index) => (
                    <span key={index} className={style.typeBadge}>{type}</span>
                  ))}
                </div>
              </div>
            )}
            {issuerName && (
              <div className={style.detailItem}>
                <span className={style.detailLabel}>{translate('credential_design_fields_issuer_name', 'Issuer Name')}</span>
                <span className={style.detailValue}>{issuerName}</span>
              </div>
            )}
            {issuerDid && (
              <div className={style.detailItem}>
                <span className={style.detailLabel}>{translate('credential_design_fields_issuer_did', 'Issuer DID')}</span>
                <span className={style.detailValueMono}>{issuerDid}</span>
              </div>
            )}
          </div>
        </div>

        {/* Branding Section */}
        {branding && (
          <div className={style.brandingSection}>
            <h3 className={style.sectionTitle}>{translate('credential_design_branding_title', 'Branding')}</h3>
            <div className={style.brandingGrid}>
              {branding.backgroundColor && (
                <div className={style.brandingItem}>
                  <span className={style.detailLabel}>{translate('credential_design_branding_background_color', 'Background Color')}</span>
                  <div className={style.colorPreview}>
                    <div className={style.colorSwatch} style={{backgroundColor: branding.backgroundColor}} />
                    <span className={style.colorValue}>{branding.backgroundColor}</span>
                  </div>
                </div>
              )}
              {branding.textColor && (
                <div className={style.brandingItem}>
                  <span className={style.detailLabel}>{translate('credential_design_branding_text_color', 'Text Color')}</span>
                  <div className={style.colorPreview}>
                    <div className={style.colorSwatch} style={{backgroundColor: branding.textColor}} />
                    <span className={style.colorValue}>{branding.textColor}</span>
                  </div>
                </div>
              )}
              {branding.logo && (
                <div className={style.brandingItem}>
                  <span className={style.detailLabel}>{translate('credential_design_branding_logo', 'Logo')}</span>
                  <div className={style.logoPreview}>
                    <img src={branding.logo.uri} alt="Logo" className={style.logoImage} />
                  </div>
                </div>
              )}
              {branding.backgroundImage && (
                <div className={style.brandingItem}>
                  <span className={style.detailLabel}>{translate('credential_design_branding_background_image', 'Background Image')}</span>
                  <div className={style.backgroundPreview}>
                    <img src={branding.backgroundImage.uri} alt="Background" className={style.backgroundImage} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Parse schema string to JSON safely
  const parseSchemaJson = useCallback((schemaStr: string | undefined): object | null => {
    if (!schemaStr) return null
    try {
      return JSON.parse(schemaStr)
    } catch {
      return null
    }
  }, [])

  // Render schema tab content
  const getSchemaContent = (): ReactElement => {
    if (!design) return <></>

    const contexts = getCredentialContext(design)
    const schemaDefinitions = design.schemaDefinition || []

    return (
      <div className={style.schemaContent}>
        {/* Context URLs */}
        {contexts.length > 0 && (
          <div className={style.schemaSection}>
            <h3 className={style.sectionTitle}>{translate('credential_design_context_title', 'JSON-LD Contexts')}</h3>
            <div className={style.contextList}>
              {contexts.map((context, index) => (
                <div key={index} className={style.contextItem}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span className={style.contextUrl}>{context}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schema Definitions */}
        {schemaDefinitions.length > 0 && (
          <div className={style.schemaSection}>
            <h3 className={style.sectionTitle}>{translate('credential_design_schema_definitions_title', 'Schema Definitions')}</h3>
            <div className={style.schemaList}>
              {schemaDefinitions.map((schemaDef, index) => {
                const parsedSchema = parseSchemaJson(schemaDef.schema)
                return (
                  <div key={schemaDef.id || index} className={style.schemaItem}>
                    <div className={style.schemaHeader}>
                      <span className={style.schemaName}>{schemaDef.correlationId || `Schema ${index + 1}`}</span>
                      <span className={style.schemaType}>{schemaDef.schemaType}</span>
                      <span className={style.schemaType}>{schemaDef.entityType}</span>
                    </div>
                    {parsedSchema && (
                      <pre className={style.schemaJson}>
                        {JSON.stringify(parsedSchema, null, 2)}
                      </pre>
                    )}
                    {!parsedSchema && schemaDef.schema && (
                      <pre className={style.schemaJson}>
                        {schemaDef.schema}
                      </pre>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {schemaDefinitions.length === 0 && contexts.length === 0 && (
          <div className={style.emptyText}>
            {translate('credential_design_no_schema', 'No schema information available.')}
          </div>
        )}
      </div>
    )
  }

  // Render claims tab content
  const getClaimsContent = (): ReactElement => {
    if (!design) return <></>

    // Extract claims from schema definitions
    const schemaDefinitions = design.schemaDefinition || []
    const claims: Array<{name: string; type?: string; required?: boolean; description?: string}> = []

    schemaDefinitions.forEach(schemaDef => {
      const parsedSchema = parseSchemaJson(schemaDef.schema)
      if (parsedSchema && typeof parsedSchema === 'object' && 'properties' in parsedSchema) {
        const schemaObj = parsedSchema as {properties?: Record<string, any>; required?: string[]}
        if (schemaObj.properties) {
          Object.entries(schemaObj.properties).forEach(([key, value]: [string, any]) => {
            claims.push({
              name: key,
              type: value.type || value.$ref || 'any',
              required: schemaObj.required?.includes(key),
              description: value.description,
            })
          })
        }
      }
    })

    if (claims.length === 0) {
      return (
        <div className={style.emptyText}>
          {translate('credential_design_no_claims', 'No claims defined for this credential design.')}
        </div>
      )
    }

    return (
      <div className={style.claimsContent}>
        <div className={style.claimsTable}>
          <div className={style.claimsHeader}>
            <div className={style.claimsHeaderCell}>{translate('credential_design_claim_name', 'Claim')}</div>
            <div className={style.claimsHeaderCell}>{translate('credential_design_claim_type', 'Type')}</div>
            <div className={style.claimsHeaderCell}>{translate('credential_design_claim_required', 'Required')}</div>
          </div>
          {claims.map((claim, index) => (
            <div key={index} className={style.claimsRow}>
              <div className={style.claimsCell}>
                <span className={style.claimName}>{claim.name}</span>
                {claim.description && <span className={style.claimDescription}>{claim.description}</span>}
              </div>
              <div className={style.claimsCell}>
                <span className={style.claimType}>{claim.type}</span>
              </div>
              <div className={style.claimsCell}>
                {claim.required ? (
                  <span className={style.requiredBadge}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {translate('credential_design_claim_yes', 'Yes')}
                  </span>
                ) : (
                  <span className={style.optionalBadge}>{translate('credential_design_claim_no', 'No')}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderTabContent = (): ReactElement => {
    switch (activeTab) {
      case CredentialDesignDetailsTab.OVERVIEW:
        return getOverviewContent()
      case CredentialDesignDetailsTab.SCHEMA:
        return getSchemaContent()
      case CredentialDesignDetailsTab.CLAIMS:
        return getClaimsContent()
      default:
        return getOverviewContent()
    }
  }

  if (isLoading) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path={translate('credential_design_details_path_label', 'Credential Design')} />
        <div className={style.loadingState}>
          <div className={style.spinner} />
          <span>{translate('loading', 'Loading...')}</span>
        </div>
      </div>
    )
  }

  if (isError || !design) {
    return (
      <div className={style.pageContainer}>
        <PageHeaderBar path={translate('credential_design_details_path_label', 'Credential Design')} />
        <div className={style.errorState}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{translate('credential_design_not_found', 'Credential design not found')}</span>
          <button className={style.backButton} onClick={() => navigate('/credentials/designs')}>
            {translate('action_back_to_list', 'Back to list')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={style.pageContainer}>
      <PageHeaderBar path={translate('credential_design_details_path_label', 'Credential Design')} />
      <div className={style.container}>
        {/* Header */}
        <div className={style.header}>
          <div className={style.titleSection}>
            <div className={style.titleRow}>
              <h1 className={style.title}>{design.name}</h1>
              <span className={style.formatBadge}>{getCredentialFormat(design)}</span>
            </div>
            <div className={style.subtitle}>
              {getCredentialTypes(design).join(', ') || translate('credential_design_no_type', 'No type specified')}
            </div>
          </div>
          <div className={style.headerActions}>
            <button className={style.editButton} onClick={handleEdit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {translate('action_edit', 'Edit')}
            </button>
            <button className={style.deleteButton} onClick={handleDelete} disabled={isDeleting}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {isDeleting ? translate('action_deleting', 'Deleting...') : translate('action_delete', 'Delete')}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={style.tabs}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`${style.tab} ${activeTab === tab.id ? style.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className={style.body}>
          {renderTabContent()}
        </div>
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default ShowCredentialDesignDetails

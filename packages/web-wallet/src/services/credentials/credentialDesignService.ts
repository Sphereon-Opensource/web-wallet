import {ClaimsDescriptionV1_0_15, CredentialConfigurationSupportedV1_0_15} from '@sphereon/oid4vci-common'
import {CredentialSchema, ToCredentialConfigurationArgs} from '@typings'
import {getAgent} from '@agent'
import {getIssuerCorrelationId} from '@/src/agent/environment'
import {capitalize} from '@material-ui/core'

export function schemaToClaims(schema: CredentialSchema, basePath: Array<string | number | null> = []): ClaimsDescriptionV1_0_15[] {
  const claims: ClaimsDescriptionV1_0_15[] = []

  if (schema.type === 'object' && schema.properties) {
    const required = new Set(schema.required ?? [])

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const nextPath = [...basePath, key]

      const isLeaf = !propSchema.properties && propSchema.type !== 'object'

      if (isLeaf) {
        claims.push({
          path: nextPath,
          mandatory: required.has(key),
          display: [{name: key}],
        })
      } else {
        const nestedClaims = schemaToClaims(propSchema, nextPath)
        nestedClaims.forEach(c => {
          if (required.has(key)) c.mandatory = true
        })

        claims.push(...nestedClaims)
      }
    }
  }

  if (schema.type === 'array' && schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach((itemSchema, idx) => {
        const nextPath = [...basePath, idx]
        claims.push(...schemaToClaims(itemSchema, nextPath))
      })
    } else {
      const nextPath = [...basePath, 0]
      claims.push(...schemaToClaims(schema.items, nextPath))
    }
  }

  return claims
}

export const toCredentialConfiguration = (args: ToCredentialConfigurationArgs): CredentialConfigurationSupportedV1_0_15 => {
  const {schema, branding, options} = args
  const {
    scope,
    cryptographicBindingMethodsSupported = ['did:web', 'did:jwk'],
    credentialSigningAlgValuesSupported = ['ES256'],
    proofTypesSupported,
  } = args.options

  const baseConfig = {
    scope,
    cryptographic_binding_methods_supported: cryptographicBindingMethodsSupported,
    cryptographic_suites_supported: credentialSigningAlgValuesSupported,
    proof_types_supported: proofTypesSupported,
    ...(branding && {display: Array.isArray(branding) ? branding : [branding]}),
    claims: schemaToClaims(schema),
  }

  switch (options.format) {
    case 'dc+sd-jwt':
    case 'vc+sd-jwt':
      return {format: options.format, vct: options.vct, ...baseConfig}
    case 'jwt_vc_json':
    case 'jwt_vc':
      return {format: options.format, credential_definition: {type: options.types}, ...baseConfig}
    case 'ldp_vc':
    case 'jwt_vc_json-ld':
      return {format: options.format, credential_definition: options.credentialDefinition, ...baseConfig}
    case 'mso_mdoc':
      return {format: options.format, doctype: options.doctype, ...baseConfig}
    default:
      // @ts-ignore
      throw Error(`Unsupported format type ${options.format}`)
  }
}

export const updateOid4vciMetadata = async (
  identifier: string,
  credentialConfiguration: CredentialConfigurationSupportedV1_0_15,
  previousIdentifier?: string,
): Promise<void> => {
  const issuerCorrelationId = getIssuerCorrelationId()
  if (!issuerCorrelationId) {
    throw new Error(
      'BROWSER_PUBLIC_ISSUER_CORRELATION_ID environment variable is not set. ' +
        'This is required to update OID4VCI issuer metadata for credential designs. ' +
        'Please set this to your issuer DID or correlation ID in .env.local',
    )
  }
  const metadata = await getAgent().oid4vciStoreGetMetadata({
    metadataType: 'issuer',
    correlationId: issuerCorrelationId,
  })

  // TODO See SSISDK-101 (workaround below see SSISDK-99)
  credentialConfiguration.display?.forEach(display => {
    if (!display.name) {
      display.name = capitalize(identifier)
    }
  })

  if (metadata) {
    if (previousIdentifier) {
      delete metadata.credential_configurations_supported[previousIdentifier]
    }

    return await getAgent()
      .oid4vciStorePersistMetadata({
        metadataType: 'issuer',
        correlationId: issuerCorrelationId,
        metadata: {
          ...metadata,
          credential_configurations_supported: {
            ...metadata.credential_configurations_supported,
            [identifier]: credentialConfiguration,
          },
        },
      })
      .then(() => getAgent().oid4vciRefreshInstanceMetadata({credentialIssuer: getIssuerCorrelationId()}))
      .catch(e => Promise.reject(Error(`Failed to update oid4vci metadata. ${e.message}`)))
  }
}

/**
 * Get the list of credential configuration IDs that are available in the OID4VCI issuer metadata.
 * This can be used to filter dropdowns to only show credentials that can actually be issued.
 */
export const getAvailableCredentialConfigurationIds = async (): Promise<string[]> => {
  const issuerCorrelationId = getIssuerCorrelationId()
  if (!issuerCorrelationId) {
    console.warn('BROWSER_PUBLIC_ISSUER_CORRELATION_ID not set, cannot filter credential configurations')
    return []
  }

  try {
    const metadata = await getAgent().oid4vciStoreGetMetadata({
      metadataType: 'issuer',
      correlationId: issuerCorrelationId,
    })

    if (metadata?.credential_configurations_supported) {
      return Object.keys(metadata.credential_configurations_supported)
    }
  } catch (e) {
    console.warn('Failed to get OID4VCI issuer metadata for filtering:', e)
  }

  return []
}

export const removeCredentialConfigurationFromOid4vciMetadata = async (identifier: string): Promise<void> => {
  const issuerCorrelationId = getIssuerCorrelationId()
  if (!issuerCorrelationId) {
    throw new Error(
      'BROWSER_PUBLIC_ISSUER_CORRELATION_ID environment variable is not set. ' +
        'This is required to update OID4VCI issuer metadata for credential designs. ' +
        'Please set this to your issuer DID or correlation ID in .env.local',
    )
  }
  const metadata = await getAgent().oid4vciStoreGetMetadata({
    metadataType: 'issuer',
    correlationId: issuerCorrelationId,
  })

  if (metadata) {
    delete metadata.credential_configurations_supported[identifier]

    return await getAgent()
      .oid4vciStorePersistMetadata({
        metadataType: 'issuer',
        correlationId: issuerCorrelationId,
        metadata,
      })
      .then(() => getAgent().oid4vciRefreshInstanceMetadata({credentialIssuer: getIssuerCorrelationId()}))
      .catch(e => Promise.reject(Error(`Failed to update oid4vci metadata. ${e.message}`)))
  }
}

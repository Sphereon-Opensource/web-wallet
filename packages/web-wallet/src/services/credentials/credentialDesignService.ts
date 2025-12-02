import {ClaimsDescriptionV1_0_15, CredentialConfigurationSupportedV1_0_15} from '@sphereon/oid4vci-common'
import {CredentialSchema, ToCredentialConfigurationArgs} from '@typings'
import {getAgent} from '@agent'
import {getIssuerCorrelationId} from '@/src/agent/environment'

export function schemaToClaims(
  schema: CredentialSchema,
  basePath: Array<string | number | null> = []
): ClaimsDescriptionV1_0_15[] {
  const claims: ClaimsDescriptionV1_0_15[] = [];

  if (schema.type === "object" && schema.properties) {
    const required = new Set(schema.required ?? []);

    for (const [key, propSchema] of Object.entries(schema.properties)) {
      const nextPath = [...basePath, key];

      const isLeaf =
        !propSchema.properties &&
        !propSchema.items &&
        propSchema.type !== "object" &&
        propSchema.type !== "array";

      if (isLeaf) {
        claims.push({
          path: nextPath,
          mandatory: required.has(key),
          display: [{ name: key }],
        });
      } else {
        const nestedClaims = schemaToClaims(propSchema, nextPath);
        nestedClaims.forEach((c) => {
          if (required.has(key)) c.mandatory = true;
        });

        claims.push(...nestedClaims);
      }
    }
  }

  if (schema.type === "array" && schema.items) {
    if (Array.isArray(schema.items)) {
      schema.items.forEach((itemSchema, idx) => {
        const nextPath = [...basePath, idx];
        claims.push(...schemaToClaims(itemSchema, nextPath));
      });
    } else {
      const nextPath = [...basePath, 0];
      claims.push(...schemaToClaims(schema.items, nextPath));
    }
  }

  return claims;
}

export const toCredentialConfiguration = (args: ToCredentialConfigurationArgs): CredentialConfigurationSupportedV1_0_15 => {
  const {schema, branding, options} = args
  const {
    scope,
    cryptographicBindingMethodsSupported = ['did:web', 'did:jwk'],
    credentialSigningAlgValuesSupported = ['ES256'],
    proofTypesSupported,
  } = options

  const baseConfig = {
    scope,
    cryptographic_binding_methods_supported: cryptographicBindingMethodsSupported,
    cryptographic_suites_supported: credentialSigningAlgValuesSupported,
    proof_types_supported: proofTypesSupported,
    ...(branding && {display: Array.isArray(branding) ? branding : [branding]}),
    claims: schemaToClaims(schema),
  }

  if (options.format === 'dc+sd-jwt' || options.format === 'vc+sd-jwt') {
    return {format: 'dc+sd-jwt', vct: options.vct, ...baseConfig}
  }

  if (options.format === 'jwt_vc_json' || options.format === 'jwt_vc') {
    return {format: options.format, credential_definition: {type: options.types}, ...baseConfig}
  }

  if (options.format === 'ldp_vc' || options.format === 'jwt_vc_json-ld') {
    return {format: options.format, credential_definition: options.credentialDefinition, ...baseConfig}
  }

  if (options.format === 'mso_mdoc') {
    return {format: options.format, doctype: options.doctype, ...baseConfig}
  }

  throw Error(`Unsupported format type ${options.format}`);
}

export const updateOid4vciMetadata = async (credentialName: string, credentialConfiguration: CredentialConfigurationSupportedV1_0_15): Promise<void> => {
  const issuerCorrelationId = getIssuerCorrelationId()
  if(!issuerCorrelationId) {
    return Promise.reject('Env var BROWSER_PUBLIC_ISSUER_CORRELATION_ID is missing')
  }
  const metadata = await getAgent().oid4vciStoreGetMetadata({metadataType: 'issuer', correlationId: issuerCorrelationId})
  const name = credentialName.trim().toLowerCase().replace(/\s+/g, "-")

  if (metadata) {
    return await getAgent().oid4vciStorePersistMetadata({
      metadataType: 'issuer',
      correlationId: issuerCorrelationId,
      metadata: {
        ...metadata,
        credential_configurations_supported: {
          ...metadata.credential_configurations_supported,
          [name]: credentialConfiguration
        }
      }
    })
    .then(() => agent.oid4vciRefreshInstanceMetadata({ credentialIssuer: NEXT_PUBLIC_ISSUER_CORRELATION_ID }))
    .catch(() => Promise.reject(Error('Failed to update oid4vci metadata')))
  }
}

import {ClaimsDescriptionV1_0_15, CredentialConfigurationSupportedV1_0_15} from '@sphereon/oid4vci-common'
import {CredentialSchema, ToCredentialConfigurationArgs} from '@typings'
import agent from '@agent'

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
  const { schema, branding } = args
  const {
    format,
    scope,
    cryptographicBindingMethodsSupported = ['did:web', 'did:jwk'],
    credentialSigningAlgValuesSupported = ['ES256'],
    proofTypesSupported,
    vct,
  } = args.options
  return {
    format,
    scope,
    cryptographic_binding_methods_supported: cryptographicBindingMethodsSupported,
    cryptographic_suites_supported: credentialSigningAlgValuesSupported,
    proof_types_supported: proofTypesSupported,
    vct,
    ...(branding && { display: Array.isArray(branding) ? branding : [branding] }),
    claims: schemaToClaims(schema)
  }
}

export const updateOid4vciMetadata = async (credentialName: string, credentialConfiguration: CredentialConfigurationSupportedV1_0_15): Promise<void> => {
  const metadata = await agent.oid4vciStoreGetMetadata({metadataType: 'issuer', correlationId: 'http://localhost:5010/oid4vci'}) // TODO

  const name = credentialName.trim().toLowerCase().replace(/\s+/g, "-")

  if (metadata) {
    await agent.oid4vciStorePersistMetadata({
      metadataType: 'issuer',
      correlationId: 'http://localhost:5010/oid4vci',
      metadata: {
        ...metadata,
        credential_configurations_supported: {
          ...metadata.credential_configurations_supported,
          [name]: credentialConfiguration
        }
      }
    })
  }
}

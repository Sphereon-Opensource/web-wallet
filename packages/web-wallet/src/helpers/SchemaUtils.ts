import {CredentialSchema, CredentialSchemaClaim, CredentialUISchema} from '@typings'

/**
 * Recursively generates the disclosure frame value structure based on non-required fields
 * in the schema. This creates the nested _sd arrays for selective disclosure.
 */
function generateDisclosureFrameValue(schema: CredentialSchema): any {
  if (schema.type !== 'object' || !schema.properties) {
    return undefined
  }

  const required = new Set(schema.required ?? [])
  const frame: any = {}
  const sdFields: string[] = []

  for (const [key, propSchema] of Object.entries(schema.properties)) {
    // Skip special fields that shouldn't be in disclosure frame
    if (key === 'status_list' || key === 'disclosureFrame') {
      continue
    }

    // Handle nested objects recursively
    if (propSchema.type === 'object' && propSchema.properties) {
      const nestedFrame = generateDisclosureFrameValue(propSchema)
      if (nestedFrame && Object.keys(nestedFrame).length > 0) {
        frame[key] = nestedFrame
      }
    }

    // Add non-required fields to _sd at the current level
    if (!required.has(key)) {
      sdFields.push(key)
    }
  }

  if (sdFields.length > 0) {
    frame._sd = sdFields
  }

  return Object.keys(frame).length > 0 ? frame : undefined
}

/**
 * Enriches the schema with a disclosureFrame property based on non-required fields.
 * The disclosure frame defines which fields can be selectively disclosed in SD-JWT.
 */
export function enrichSchemaWithDisclosureFrame(schema: CredentialSchema): CredentialSchema {
  const disclosureFrameValue = generateDisclosureFrameValue(schema)

  if (!disclosureFrameValue) {
    return schema
  }

  const disclosureFrameProperty: any = {
    description: 'Frame defining which fields can be selectively disclosed',
    type: 'object',
    properties: {},
  }

  // Build the properties structure based on the disclosure frame value
  if (disclosureFrameValue._sd && Object.keys(disclosureFrameValue).length === 1) {
    // Simple case: only _sd at root level
    disclosureFrameProperty.properties._sd = {
      description: 'Array of field names that can be selectively disclosed',
      type: 'array',
      items: {
        type: 'string',
      },
      default: disclosureFrameValue._sd,
    }
  } else {
    // Complex case: nested structure with multiple levels
    // Store the entire structure as the default value
    disclosureFrameProperty.default = disclosureFrameValue
  }

  return {
    ...schema,
    properties: {
      ...schema.properties,
      disclosureFrame: disclosureFrameProperty,
    },
  }
}

/**
 * Enriches the schema with a status_list property for credential status verification.
 * The status list enables revocation and suspension checking for the credential.
 *
 * @param schema The credential schema to enrich
 * @param statusListUri The URI of the status list (optional)
 */
export function enrichSchemaWithStatusList(schema: CredentialSchema, statusListUri?: string): CredentialSchema {
  if (!statusListUri) {
    return schema
  }

  const statusListProperty = {
    description: 'Status list information for credential status verification',
    type: 'object',
    properties: {
      uri: {
        description: 'URI of the status list',
        type: 'string',
        format: 'uri',
        default: statusListUri,
      },
      idx: {
        description: 'Index in the status list',
        type: 'string',
        default: '0',
      },
    },
    required: ['uri', 'idx'],
  }

  return {
    ...schema,
    properties: {
      ...schema.properties,
      status_list: statusListProperty,
    },
  }
}

export const normalizeSchemaInput = (input: any): Array<{name: string; schema: any}> => {
  if (Array.isArray(input)) {
    return input.map(claim => ({
      name: claim.claimName,
      schema: claim,
    }))
  }

  if (input?.type === 'object' && input?.properties && !Array.isArray(input.properties)) {
    return Object.entries(input.properties).map(([name, schema]) => ({
      name,
      schema,
    }))
  }

  return []
}

export const buildCredentialSchemas = async (
  claims: any,
): Promise<{schema: CredentialSchema; uiSchema: CredentialUISchema | Array<CredentialUISchema>}> => {
  const schema: CredentialSchema = 'credentialClaims' in claims ? buildCredentialSchema(claims.credentialClaims) : claims
  const uiSchema = 'credentialClaims' in claims ? buildCredentialUISchema(claims.credentialClaims) : buildCredentialUISchema(claims)

  return {schema, uiSchema}
}

export const buildCredentialSchema = (claims: Array<CredentialSchemaClaim>): CredentialSchema => {
  const properties: Record<string, any> = {}
  const requiredFields: Array<string> = []

  claims.forEach((claim): void => {
    if (claim.type === 'object' && claim.properties) {
      properties[claim.claimName] = buildCredentialSchema(claim.properties)
    } else if (claim.type === 'array') {
      properties[claim.claimName] = {
        type: 'array',
        items: {type: 'string'},
      }
    } else if (claim.type === 'date') {
      properties[claim.claimName] = {
        type: 'string',
        format: 'date',
      }
    } else {
      properties[claim.claimName] = {type: claim.type}
    }

    if (claim.required) {
      requiredFields.push(claim.claimName)
    }
  })

  return {
    type: 'object',
    properties,
    ...(requiredFields.length > 0 && {required: requiredFields}),
  }
}

export const buildCredentialUISchema = (
  input: any,
  basePath: string = '#/properties',
  isRoot: boolean = true,
): CredentialUISchema | Array<CredentialUISchema> => {
  const elements: CredentialUISchema[] = []
  const normalized = normalizeSchemaInput(input)

  normalized.forEach(({name, schema}) => {
    const path = `${basePath}/${name}`
    const isObject = schema.type === 'object' && schema.properties

    if (isObject) {
      const nextInput = Array.isArray(schema.properties) ? schema.properties : schema

      elements.push({
        type: 'Group',
        label: name,
        elements: buildCredentialUISchema(nextInput, `${path}/properties`, false) as CredentialUISchema[],
      })
    } else {
      elements.push({
        type: 'Control',
        label: name,
        scope: path,
      })
    }
  })

  return isRoot ? {type: 'VerticalLayout', elements} : elements
}

export const noEmptyPropertiesRecursive = (items: Array<any>): boolean => {
  return items.every(item => {
    const itemType = item.type

    if (itemType !== 'object') {
      return true
    }

    if (!Array.isArray(item.properties) || item.properties.length === 0) {
      return false
    }

    return noEmptyPropertiesRecursive(item.properties)
  })
}

export const transformAdvancedSchema = (schema: any): {credentialClaims: any[]} => {
  const resolveType = (value: any): string => {
    if (value.type === 'string' && value.format === 'date') {
      return 'date'
    }

    return value.type
  }

  const transform = (sch: any): any[] => {
    if (!sch.properties) return []

    return Object.entries(sch.properties)
      .filter(([key]) => key !== 'disclosureFrame')
      .map(([key, rawValue]) => {
        const value = rawValue as any
        const claim: any = {
          claimName: key,
          type: resolveType(value),
        }

        if (sch.required?.includes(key)) {
          claim.required = true
        }

        if (value.type === 'object') {
          claim.properties = transform(value)
        }

        return claim
      })
  }

  return {
    credentialClaims: transform(schema),
  }
}

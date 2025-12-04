import {
  CredentialSchema,
} from '@typings'


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
    description: "Frame defining which fields can be selectively disclosed",
    type: "object",
    properties: {}
  }

  // Build the properties structure based on the disclosure frame value
  if (disclosureFrameValue._sd && Object.keys(disclosureFrameValue).length === 1) {
    // Simple case: only _sd at root level
    disclosureFrameProperty.properties._sd = {
      description: "Array of field names that can be selectively disclosed",
      type: "array",
      items: {
        type: "string"
      },
      default: disclosureFrameValue._sd
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
      disclosureFrame: disclosureFrameProperty
    }
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
    description: "Status list information for credential status verification",
    type: "object",
    properties: {
      uri: {
        description: "URI of the status list",
        type: "string",
        format: "uri",
        default: statusListUri
      },
      idx: {
        description: "Index in the status list",
        type: "string",
        default: "0"
      }
    },
    required: ["uri", "idx"]
  }

  return {
    ...schema,
    properties: {
      ...schema.properties,
      status_list: statusListProperty
    }
  }
}

/**
 * JSON Schema for Credential Design plugin methods.
 */

export const credentialDesignPluginSchema = {
  components: {
    schemas: {
      CredentialDesign: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          tenant_id: { type: 'string', nullable: true },
          name: { type: 'string' },
          meta_data_keys: { type: 'array' },
          schema_definition: { type: 'array' },
          credential_design_branding: { type: 'object', nullable: true },
        },
        required: ['id', 'name', 'meta_data_keys', 'schema_definition'],
      },
    },
    methods: {
      credentialDesignCreate: {
        description: 'Create a new credential design',
        arguments: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            schema: { type: 'object' },
            uiSchema: { type: 'object' },
            options: { type: 'object' },
            isAdvancedSchema: { type: 'boolean' },
            branding: { type: 'object', nullable: true },
            formStepId: { type: 'string' },
            statusListUri: { type: 'string' },
          },
          required: ['name', 'schema', 'uiSchema', 'options'],
        },
        returnType: { $ref: '#/components/schemas/CredentialDesign' },
      },
      credentialDesignUpdate: {
        description: 'Update an existing credential design',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            schema: { type: 'object' },
            uiSchema: { type: 'object' },
            options: { type: 'object' },
            isAdvancedSchema: { type: 'boolean' },
            branding: { type: 'object', nullable: true },
          },
          required: ['id', 'name', 'schema', 'uiSchema', 'options'],
        },
        returnType: { $ref: '#/components/schemas/CredentialDesign' },
      },
      credentialDesignGetById: {
        description: 'Get a credential design by ID',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        returnType: { $ref: '#/components/schemas/CredentialDesign' },
      },
      credentialDesignList: {
        description: 'List credential designs with pagination',
        arguments: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
            limit: { type: 'number' },
            offset: { type: 'number' },
          },
        },
        returnType: {
          type: 'array',
          items: { $ref: '#/components/schemas/CredentialDesign' },
        },
      },
      credentialDesignCount: {
        description: 'Get total count of credential designs',
        arguments: {
          type: 'object',
          properties: {
            tenantId: { type: 'string' },
          },
        },
        returnType: { type: 'number' },
      },
      credentialDesignDelete: {
        description: 'Delete a credential design',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        returnType: { type: 'boolean' },
      },
      formStepGetOrCreate: {
        description: 'Get or create a form step',
        arguments: {
          type: 'object',
          properties: {
            formId: { type: 'string' },
          },
          required: ['formId'],
        },
        returnType: { type: 'string' },
      },
    },
  },
}

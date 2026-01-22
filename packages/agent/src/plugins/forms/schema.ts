/**
 * JSON Schema for Forms plugin methods.
 */

export const formsPluginSchema = {
  components: {
    schemas: {
      FormDefinition: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          tenant_id: { type: 'string', nullable: true },
          machine_id: { type: 'string', nullable: true },
          machine: { type: 'object', nullable: true },
          form_steps: { type: 'array' },
        },
        required: ['id', 'name', 'form_steps'],
      },
      FormStep: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          form_id: { type: 'string' },
          step_nr: { type: 'number' },
          order: { type: 'number' },
          schema_definitions: { type: 'array' },
        },
        required: ['id', 'form_id', 'step_nr', 'order'],
      },
      FormSchemaDefinition: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          correlation_id: { type: 'string' },
          schema_type: { type: 'string' },
          entity_type: { type: 'string' },
          schema: { type: 'string' },
          meta_data_set: { type: 'object', nullable: true },
        },
        required: ['id', 'correlation_id', 'schema_type', 'entity_type', 'schema'],
      },
    },
    methods: {
      formDefinitionGetById: {
        description: 'Get a form definition by ID',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        returnType: { $ref: '#/components/schemas/FormDefinition' },
      },
      formDefinitionGetByName: {
        description: 'Get a form definition by name',
        arguments: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            tenantId: { type: 'string' },
          },
          required: ['name'],
        },
        returnType: { $ref: '#/components/schemas/FormDefinition' },
      },
      formDefinitionList: {
        description: 'List form definitions',
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
          items: { $ref: '#/components/schemas/FormDefinition' },
        },
      },
      schemaDefinitionGetByFormStep: {
        description: 'Get schema definitions for a form step',
        arguments: {
          type: 'object',
          properties: {
            formStepId: { type: 'string' },
          },
          required: ['formStepId'],
        },
        returnType: {
          type: 'array',
          items: { $ref: '#/components/schemas/FormSchemaDefinition' },
        },
      },
      formStepGetById: {
        description: 'Get a form step by ID',
        arguments: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        returnType: { $ref: '#/components/schemas/FormStep' },
      },
    },
  },
}

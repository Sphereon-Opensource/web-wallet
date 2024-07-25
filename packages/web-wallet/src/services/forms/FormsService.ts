import {supabaseServiceClient} from '@helpers/SupabaseClient'
import {
  FormDefinitionDTO,
  FormDefinitionEntity,
  FormStepDTO,
  FormStepEntity,
  MachineEntity,
  SchemaDefinitionDTO,
  SchemaDefinitionEntity,
  SchemaType,
} from '@typings'
import {MetaDataKeysDTO, MetaDataKeysEntity, MetaDataSetDTO, MetaDataSetEntity, MetaDataValuesEntity, ValueType} from '../../types/metadata'
import {CredentialFormSelectionType} from '@sphereon/ui-components.ssi-react'

export type ById = {
  id: string
}

export type ByFormName = {
  formName: string
  tenantId?: string
}

export class FormsService {
  async getFormDefinition(args: ById | ByFormName): Promise<FormDefinitionDTO> {
    const query = `*, machine!fk_machine(*),
                form_def_to_form_step!fk_form_definition(form_step!fk_form_step(*))`

    let select = supabaseServiceClient.from('form_definition').select(query)

    if ('id' in args) {
      select = select.eq('id', args.id)
    } else {
      select = select.eq('name', args.formName)
      if (args.tenantId) {
        select = select.eq('tenant_id', args.tenantId)
      }
    }

    const result = await select.single()
    if (result.status >= 300 || !result.data) {
      throw new Error(`Failed to retrieve form definition for ${JSON.stringify(args)}`)
    }

    const formDefinitionEntity = new FormDefinitionEntity(result.data)
    const formDefinitionDTO = formDefinitionEntity.asDTO([], [], [], [])

    formDefinitionDTO.formSteps = await Promise.all(
      result.data.form_def_to_form_step.map((formStepWrapper: Record<string, any>) => this.processFormStep(formStepWrapper.form_step)),
    )

    if (result.data.machine) {
      formDefinitionDTO.machine = new MachineEntity(result.data.machine).asDTO()
    }
    return formDefinitionDTO
  }

  public selectSchemaDefinitions = (formDefinition: FormDefinitionDTO, formStepNr: number, schemaType?: SchemaType): SchemaDefinitionDTO[] => {
    const formStep = formDefinition.formSteps.find(value => value.stepNr === formStepNr)
    if (!formStep) {
      return []
    }

    if (schemaType) {
      return formStep.schemaDefinitions.filter(schemaDef => schemaDef.schemaType === schemaType)
    }

    return formStep.schemaDefinitions
  }

  // TODO This function seems a bit specific for this service, but for now I do not have a better place to stash it
  public getCredentialFormSelectionTypes(formDefinition: FormDefinitionDTO, formStepNr: number): Array<CredentialFormSelectionType> {
    const schemaDefinitions = this.selectSchemaDefinitions(formDefinition, formStepNr)

    const uiSchemas = schemaDefinitions.filter(schema => schema.schemaType === SchemaType.UI_Form)

    return uiSchemas.map(uiSchema => {
      // Find corresponding Data schema using correlationId
      const dataSchema = schemaDefinitions.find(schema => schema.schemaType === SchemaType.Data && schema.correlationId === uiSchema.correlationId)
      if (!dataSchema) {
        throw new Error(`Data schema was not found for ui schema ${uiSchema.id} with correlation id ${uiSchema.correlationId}`)
      }

      const metaDataKey = dataSchema.metaDataSet?.keys.find(key => key.key === 'credentialType')
      if (!metaDataKey) {
        throw new Error('credentialType key not found in meta data.')
      }
      if (metaDataKey.valueType !== ValueType.Text) {
        throw new Error('credentialType values should be text/string')
      }

      // Collect credential types from metaDataValues
      let label: string | undefined = undefined
      let credentialTypes: Array<string> = []
      if (metaDataKey.values && metaDataKey.values.length) {
        credentialTypes = metaDataKey.values
          .sort((a, b) => a.index - b.index)
          .map(value => {
            if (label === undefined && value.textValue !== 'VerifiableCredential') {
              label = value.textValue
            }
            if (!value.textValue) {
              throw new Error(`textValue for credentialTypes should not be empty, at index ${value.index}`)
            }
            return value.textValue
          })
      }

      return {
        label: label ?? dataSchema.metaDataSet?.name ?? dataSchema.correlationId ?? 'Unknown',
        schema: JSON.parse(dataSchema.schema),
        uiSchema: JSON.parse(uiSchema.schema),
        credentialType: credentialTypes,
      }
    })
  }

  private async processFormStep(formStep: FormStepEntity): Promise<FormStepDTO> {
    const formStepEntity = new FormStepEntity(formStep)
    const schemaDefinitions = await this.getSchemaDefinitions(formStep.id)
    return formStepEntity.asDTO(schemaDefinitions)
  }

  private async getSchemaDefinitions(formStepId: string): Promise<SchemaDefinitionDTO[]> {
    const result = await supabaseServiceClient
      .from('form_step_to_schema_definition')
      .select(
        `
        schema_definition!fk_schema_definition(
          *,
          meta_data_set_id,
          meta_data_set!inner(
            *,
            meta_data_keys!inner(
              *,
              meta_data_values!inner(*)
            )
          )
        )
      `,
      )
      .eq('form_step_id', formStepId)

    if (result.status >= 300 || !result.data) {
      throw new Error(`Failed to retrieve schema definitions for form step ${formStepId}`)
    }

    return result.data.map((schemaDefWrapper: any) => this.processSchemaDefinition(schemaDefWrapper.schema_definition))
  }

  private processSchemaDefinition(schemaDefinition: any): SchemaDefinitionDTO {
    const schemaDefinitionEntity = new SchemaDefinitionEntity(schemaDefinition)
    const metaDataSetDTOs = schemaDefinition.meta_data_set ? [this.processMetaDataSet(schemaDefinition.meta_data_set)] : []
    return schemaDefinitionEntity.asDTO([], metaDataSetDTOs) // TODO "extends" functionality
  }

  private processMetaDataSet(metaDataSet: Record<string, any>): MetaDataSetDTO {
    const metaDataSetEntity = new MetaDataSetEntity(metaDataSet)
    const metaDataKeysDTOs = metaDataSet.meta_data_keys.map((keyWrapper: Record<string, any>) => this.processMetaDataKeys(keyWrapper))
    return metaDataSetEntity.asDTO(metaDataKeysDTOs)
  }

  private processMetaDataKeys(metaDataKey: Record<string, any>): MetaDataKeysDTO {
    const metaDataKeysEntity = new MetaDataKeysEntity(metaDataKey)
    const metaDataValuesDTOs = Array.isArray(metaDataKey.meta_data_values)
      ? metaDataKey.meta_data_values.map((value: Record<string, any>) => new MetaDataValuesEntity(value).asDTO())
      : []
    return metaDataKeysEntity.asDTO(metaDataValuesDTOs)
  }
}

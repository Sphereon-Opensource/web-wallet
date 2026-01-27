import {getAgentBaseUrl} from '@/src/agent/environment'
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
import {MetaDataKeysDTO, MetaDataKeysEntity, MetaDataSetDTO, MetaDataSetEntity, MetaDataValuesEntity, ValueType} from '@typings/metadata'
import {CredentialFormSelectionType} from '@sphereon/ui-components.ssi-react'
import {getAvailableCredentialConfigurationIds} from '@/src/services/credentials/credentialDesignService'

const getApiUrl = () => `${getAgentBaseUrl()}/api`

export type ById = {
  id: string
}

export type ByFormName = {
  formName: string
  tenantId?: string
}

export class FormsService {
  async getFormDefinition(args: ById | ByFormName): Promise<FormDefinitionDTO> {
    let url: string

    if ('id' in args) {
      url = `${getApiUrl()}/forms/${args.id}`
    } else {
      url = `${getApiUrl()}/forms/by-name/${encodeURIComponent(args.formName)}${args.tenantId ? `?tenantId=${args.tenantId}` : ''}`
    }

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to retrieve form definition for ${JSON.stringify(args)}`)
    }

    const {data} = await response.json()

    const formDefinitionEntity = new FormDefinitionEntity(data)
    const formDefinitionDTO = formDefinitionEntity.asDTO([], [], [], [])

    // Process form steps from the API response
    if (data.form_steps && Array.isArray(data.form_steps)) {
      formDefinitionDTO.formSteps = data.form_steps.map((formStep: any) => this.processFormStep(formStep))
    }

    if (data.machine) {
      formDefinitionDTO.machine = new MachineEntity(data.machine).asDTO()
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
  public async getCredentialFormSelectionTypes(
    formDefinition: FormDefinitionDTO,
    formStepNr: number,
    filterByOid4vciMetadata: boolean = true,
  ): Promise<Array<CredentialFormSelectionType>> {
    const schemaDefinitions = this.selectSchemaDefinitions(formDefinition, formStepNr)
    const uiSchemas = schemaDefinitions.filter(schema => schema.schemaType === SchemaType.UI_Form)

    // Get available credential configuration IDs from OID4VCI issuer metadata
    let availableConfigIds: string[] = []
    if (filterByOid4vciMetadata) {
      try {
        availableConfigIds = await getAvailableCredentialConfigurationIds()
      } catch (e) {
        console.warn('Failed to get available credential configuration IDs, showing all:', e)
      }
    }

    const allTypes = uiSchemas.map(uiSchema => {
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

    // Filter to only show credential types that exist in OID4VCI issuer metadata
    if (filterByOid4vciMetadata && availableConfigIds.length > 0) {
      return allTypes.filter(type => {
        // Check if the label (credential config ID) exists in the available configs
        return availableConfigIds.includes(type.label)
      })
    }

    return allTypes
  }

  private processFormStep(formStep: any): FormStepDTO {
    // Ensure step_nr and order are numbers (API may return strings)
    const formStepEntity = new FormStepEntity({
      ...formStep,
      step_nr: typeof formStep.step_nr === 'string' ? parseInt(formStep.step_nr, 10) : formStep.step_nr,
      order: typeof formStep.order === 'string' ? parseInt(formStep.order, 10) : formStep.order,
    })
    const schemaDefinitions = this.processSchemaDefinitions(formStep.schema_definitions || [])
    return formStepEntity.asDTO(schemaDefinitions)
  }

  private processSchemaDefinitions(schemaDefinitions: any[]): SchemaDefinitionDTO[] {
    return schemaDefinitions.map((sd: any) => this.processSchemaDefinition(sd))
  }

  private processSchemaDefinition(schemaDefinition: any): SchemaDefinitionDTO {
    const schemaDefinitionEntity = new SchemaDefinitionEntity(schemaDefinition)
    const metaDataSetDTOs = schemaDefinition.meta_data_set ? [this.processMetaDataSet(schemaDefinition.meta_data_set)] : []
    return schemaDefinitionEntity.asDTO([], metaDataSetDTOs) // TODO "extends" functionality
  }

  private processMetaDataSet(metaDataSet: Record<string, any>): MetaDataSetDTO {
    const metaDataSetEntity = new MetaDataSetEntity(metaDataSet)
    const metaDataKeysDTOs = (metaDataSet.meta_data_keys || []).map((keyWrapper: Record<string, any>) => this.processMetaDataKeys(keyWrapper))
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

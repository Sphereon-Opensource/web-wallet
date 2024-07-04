import {deleteUndefinedProps} from '../type-commons'
import {MetaDataSetDTO} from '../metadata'

export enum SchemaType {
  Data = 'Data',
  UI_Form = 'UI_Form',
}

export enum EntityType {
  VC = 'VC',
  Contact = 'Contact',
}

export class MachineEntity {
  id: string
  name: string
  tenant_id?: string
  persistence?: boolean

  constructor(init?: Partial<MachineEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asDTO(): MachineDTO {
    return MachineEntity.toDTO(this)
  }

  static toDTO(entity: MachineEntityType): MachineDTO {
    return new MachineDTO({
      id: entity.id,
      name: entity.name,
      tenantId: entity.tenant_id,
      persistence: entity.persistence,
    })
  }
}

export class MachineDTO {
  id: string
  name: string
  tenantId?: string
  persistence?: boolean

  constructor(init?: Partial<MachineDTO>) {
    Object.assign(this, init)
  }

  asEntity(): MachineEntity {
    return MachineDTO.toEntity(this)
  }

  static toEntity(dto: MachineDTO): MachineEntity {
    return new MachineEntity({
      ...(dto.id !== undefined ? {id: dto.id} : {}),
      name: dto.name,
      tenant_id: dto.tenantId,
      persistence: dto.persistence,
    })
  }
}

export class FormDefinitionEntity {
  id?: string
  tenant_id?: string
  name: string
  description?: string
  machine_id: string

  constructor(init?: Partial<FormDefinitionEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asDTO(
    relations: FormDefToFormStepEntity[],
    machines: MachineDTO[],
    formSteps: FormStepDTO[],
    schemaDefs: SchemaDefinitionDTO[],
  ): FormDefinitionDTO {
    return FormDefinitionEntity.toDTO(this, relations, machines, formSteps, schemaDefs)
  }

  static toDTO(
    entity: FormDefinitionEntityType,
    relations: FormDefToFormStepEntity[],
    machines: MachineDTO[],
    formSteps: FormStepDTO[],
    schemaDefs: SchemaDefinitionDTO[],
  ): FormDefinitionDTO {
    return new FormDefinitionDTO({
      id: entity.id,
      tenantId: entity.tenant_id,
      name: entity.name,
      description: entity.description,
      machine: machines.find(value => value.id == entity.machine_id),
      formSteps: relations.reduce((acc, value) => {
        const step =
          value.form_definition_id == entity.id
            ? value.asFormStepDTO(
                formSteps.map(formStep => formStep.asEntity()),
                schemaDefs,
              )
            : undefined
        if (step) {
          acc.push(step)
        }
        return acc
      }, [] as FormStepDTO[]),
    })
  }
}

export class FormDefinitionDTO {
  id?: string
  tenantId?: string
  name: string
  description?: string
  machine: MachineDTO
  formSteps: FormStepDTO[]

  constructor(init?: Partial<FormDefinitionDTO>) {
    Object.assign(this, init)
  }

  asEntity(): FormDefinitionEntity {
    return FormDefinitionDTO.toEntity(this)
  }

  static toEntity(dto: FormDefinitionDTO): FormDefinitionEntity {
    return new FormDefinitionEntity({
      ...(dto.id !== undefined ? {id: dto.id} : {}),
      tenant_id: dto.tenantId,
      name: dto.name,
      description: dto.description,
      machine_id: dto.machine.id,
    })
  }
}

export class FormDefToFormStepEntity {
  form_definition_id: string
  form_step_id: string

  constructor(init?: Partial<FormDefToFormStepEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asFormStepDTO(formSteps: FormStepEntity[], schemaDefDTOs: SchemaDefinitionDTO[]): FormStepDTO {
    return FormDefToFormStepEntity.toFormStepDTO(this, formSteps, schemaDefDTOs)
  }

  static toFormStepDTO(entity: FormDefToFormStepEntityType, formSteps: FormStepEntity[], schemaDefDTOs: SchemaDefinitionDTO[]): FormStepDTO {
    return formSteps.find(value => value.id == entity.form_step_id)!.asDTO(schemaDefDTOs)
  }
}

export class FormStepToSchemaDefinitionEntity {
  form_step_id: string
  schema_definition_id: string

  constructor(init?: Partial<FormStepToSchemaDefinitionEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asSchemaDefDTO(schemaDefinitionEntities: SchemaDefinitionDTO[]): SchemaDefinitionDTO {
    return FormStepToSchemaDefinitionEntity.toFormStepDTO(this, schemaDefinitionEntities)
  }

  static toFormStepDTO(dto: FormStepToSchemaDefinitionEntityType, schemaDefs: SchemaDefinitionDTO[]): SchemaDefinitionDTO {
    return schemaDefs.find(value => value.id == dto.schema_definition_id)!
  }
}

export class FormStepDTO {
  id: string
  tenantId?: string
  formId: string
  stepNr: number
  order: number
  schemaDefinitions: SchemaDefinitionDTO[]

  constructor(init?: Partial<FormStepDTO>) {
    Object.assign(this, init)
  }

  asEntity(): FormStepEntity {
    return FormStepDTO.toEntity(this)
  }

  static toEntity(dto: FormStepDTO): FormStepEntity {
    return new FormStepEntity({
      ...(dto.id !== undefined ? {id: dto.id} : {}),
      tenant_id: dto.tenantId,
      form_id: dto.formId,
      step_nr: dto.stepNr,
      order: dto.order,
    })
  }
}

export class FormStepEntity {
  id: string
  tenant_id?: string
  form_id: string
  step_nr: number
  order: number

  constructor(init?: Partial<FormStepEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asDTO(schemaDefDTOs: SchemaDefinitionDTO[]): FormStepDTO {
    return FormStepEntity.toDTO(this, schemaDefDTOs)
  }

  static toDTO(entity: FormStepEntityType, schemaDefDTOs: SchemaDefinitionDTO[]): FormStepDTO {
    return new FormStepDTO({
      id: entity.id,
      tenantId: entity.tenant_id,
      //          definitionId: dto.definition_id,
      formId: entity.form_id,
      stepNr: entity.step_nr,
      order: entity.order,
      schemaDefinitions: schemaDefDTOs.map(value => value),
    })
  }
}

export class SchemaDefinitionDTO {
  id: string
  tenantId?: string
  extends?: SchemaDefinitionDTO
  correlationId?: string
  schemaType: SchemaType
  entityType: EntityType
  schema: string
  metaDataSet?: MetaDataSetDTO

  constructor(init?: Partial<SchemaDefinitionDTO>) {
    Object.assign(this, init)
  }

  asEntity(): SchemaDefinitionEntity {
    return SchemaDefinitionDTO.toEntity(this)
  }

  static toEntity(dto: SchemaDefinitionDTO): SchemaDefinitionEntity {
    return new SchemaDefinitionEntity({
      id: dto.id,
      tenant_id: dto.tenantId,
      extends_id: dto.extends?.id,
      correlation_id: dto.correlationId,
      schema_type: dto.schemaType,
      entity_type: dto.entityType,
      schema: dto.schema,
      meta_data_set_id: dto.metaDataSet?.id,
    })
  }
}

export class SchemaDefinitionEntity {
  id: string
  tenant_id?: string
  extends_id?: string
  correlation_id?: string
  schema_type: SchemaType
  entity_type: EntityType
  schema: string
  meta_data_set_id?: string

  constructor(init?: Partial<SchemaDefinitionEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asDTO(schemaDefinitions: SchemaDefinitionDTO[], metaDataSets: MetaDataSetDTO[]): SchemaDefinitionDTO {
    return SchemaDefinitionEntity.toDTO(this, schemaDefinitions, metaDataSets)
  }

  static toDTO(entity: SchemaDefinitionEntityType, schemaDefinitions: SchemaDefinitionDTO[], metaDataSets: MetaDataSetDTO[]): SchemaDefinitionDTO {
    return new SchemaDefinitionDTO({
      id: entity.id,
      tenantId: entity.tenant_id,
      extends: schemaDefinitions.find(sd => sd.id === entity.extends_id),
      correlationId: entity.correlation_id,
      schemaType: entity.schema_type,
      entityType: entity.entity_type,
      schema: entity.schema,
      metaDataSet: metaDataSets.find(mds => mds.id === entity.meta_data_set_id),
    })
  }
}

export type MachineEntityType = Omit<MachineEntity, 'toDTO' | 'asDTO'>
export type FormDefinitionEntityType = Omit<FormDefinitionEntity, 'toDTO' | 'asDTO'>
export type FormDefToFormStepEntityType = Omit<FormDefToFormStepEntity, 'toDTO' | 'asDTO'>
export type FormStepToSchemaDefinitionEntityType = Omit<FormStepToSchemaDefinitionEntity, 'toDTO' | 'asDTO'>
export type FormStepEntityType = Omit<FormStepEntity, 'toDTO' | 'asDTO'>
export type SchemaDefinitionEntityType = Omit<SchemaDefinitionEntity, 'toDTO' | 'asDTO'>

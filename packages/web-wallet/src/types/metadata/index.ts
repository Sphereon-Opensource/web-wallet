import {deleteUndefinedProps} from '../type-commons'

export enum ValueType {
  Text = 'Text',
  Number = 'Number',
  Boolean = 'Boolean',
  Date = 'Date',
}

export class MetaDataSetEntity {
  id: string
  tenant_id?: string
  name: string

  constructor(init?: Partial<MetaDataSetEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asDTO(keys: MetaDataKeysDTO[]): MetaDataSetDTO {
    return MetaDataSetEntity.toDTO(this, keys)
  }

  static toDTO(entity: MetaDataSetEntityType, keys: MetaDataKeysDTO[]): MetaDataSetDTO {
    return new MetaDataSetDTO({
      id: entity.id,
      tenantId: entity.tenant_id,
      name: entity.name,
      keys: keys,
    })
  }
}

export class MetaDataSetDTO {
  id: string
  tenantId?: string
  name: string
  keys: MetaDataKeysDTO[]

  constructor(init?: Partial<MetaDataSetDTO>) {
    Object.assign(this, init)
  }

  asEntity(): MetaDataSetEntity {
    return MetaDataSetDTO.toEntity(this)
  }

  static toEntity(dto: MetaDataSetDTO): MetaDataSetEntity {
    return new MetaDataSetEntity({
      id: dto.id,
      tenant_id: dto.tenantId,
      name: dto.name,
      // Skipping transformation of keys into entities to keep the example concise
    })
  }
}

export class MetaDataKeysEntity {
  id: string
  set_id: string
  key: string
  value_type: ValueType

  constructor(init?: Partial<MetaDataKeysEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asDTO(values: MetaDataValuesDTO[]): MetaDataKeysDTO {
    return MetaDataKeysEntity.toDTO(this, values)
  }

  static toDTO(entity: MetaDataKeysEntityType, values: MetaDataValuesDTO[]): MetaDataKeysDTO {
    return new MetaDataKeysDTO({
      id: entity.id,
      setId: entity.set_id,
      key: entity.key,
      valueType: entity.value_type,
      values: values,
    })
  }
}

export class MetaDataKeysDTO {
  id: string
  setId: string
  key: string
  valueType: ValueType
  values: MetaDataValuesDTO[]

  constructor(init?: Partial<MetaDataKeysDTO>) {
    Object.assign(this, init)
  }

  asEntity(): MetaDataKeysEntity {
    return MetaDataKeysDTO.toEntity(this)
  }

  static toEntity(dto: MetaDataKeysDTO): MetaDataKeysEntity {
    return new MetaDataKeysEntity({
      id: dto.id,
      set_id: dto.setId,
      key: dto.key,
      value_type: dto.valueType,
      // Skipping transformation of values into entities to keep the example concise
    })
  }
}

export class MetaDataValuesEntity {
  id: string
  key_id: string
  index: number
  text_value?: string
  number_value?: number
  boolean_value?: boolean
  timestamp_value?: Date

  constructor(init?: Partial<MetaDataValuesEntity>) {
    Object.assign(this, init)
    deleteUndefinedProps(this)
  }

  asDTO(): MetaDataValuesDTO {
    return MetaDataValuesEntity.toDTO(this)
  }

  static toDTO(entity: MetaDataValuesEntityType): MetaDataValuesDTO {
    return new MetaDataValuesDTO({
      id: entity.id,
      keyId: entity.key_id,
      index: entity.index,
      textValue: entity.text_value,
      numberValue: entity.number_value,
      booleanValue: entity.boolean_value,
      timestampValue: entity.timestamp_value,
    })
  }
}

export class MetaDataValuesDTO {
  id: string
  keyId: string
  index: number
  textValue?: string
  numberValue?: number
  booleanValue?: boolean
  timestampValue?: Date

  constructor(init?: Partial<MetaDataValuesDTO>) {
    Object.assign(this, init)
  }

  asEntity(): MetaDataValuesEntity {
    return MetaDataValuesDTO.toEntity(this)
  }

  static toEntity(dto: MetaDataValuesDTO): MetaDataValuesEntity {
    return new MetaDataValuesEntity({
      ...(dto.id !== undefined ? {id: dto.id} : {}),
      key_id: dto.keyId,
      index: dto.index,
      text_value: dto.textValue,
      number_value: dto.numberValue,
      boolean_value: dto.booleanValue,
      timestamp_value: dto.timestampValue,
    })
  }
}

export type MetaDataSetEntityType = Omit<MetaDataSetEntity, 'toDTO' | 'asDTO'>
export type MetaDataKeysEntityType = Omit<MetaDataKeysEntity, 'toDTO' | 'asDTO'>
export type MetaDataValuesEntityType = Omit<MetaDataValuesEntity, 'toDTO' | 'asDTO'>

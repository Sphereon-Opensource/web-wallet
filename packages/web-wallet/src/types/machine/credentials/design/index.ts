import {ImageAttributes} from '@sphereon/ui-components.core'
import {
  CredentialSchema,
  CredentialUISchema,
  SchemaDefinitionDTO,
  SchemaDefinitionEntity,
} from '@/src/types'
import {MetaDataKeysDTO, MetaDataKeysEntity} from '@typings/metadata'
import {deleteUndefinedProps} from '@typings/type-commons'

export type StoreCredentialSchemaArgs = {
  name: string
  credentialFormat: string
  schema: CredentialSchema
  uiSchema: CredentialUISchema | Array<CredentialUISchema>
  branding: CredentialDesignBrandingDTO
}

export type CredentialDesignTableItem = CredentialDesignDTO & {
  actions: string
}

export class CredentialDesignDTO {
  id: string
  name: string
  tenantId?: string
  metadataKeys: Array<MetaDataKeysDTO>
  schemaDefinition: Array<SchemaDefinitionDTO>
  credentialDesignBranding: CredentialDesignBrandingDTO

  constructor(init?: Partial<CredentialDesignDTO>) {
    Object.assign(this, init)
  }

  asEntity(): CredentialDesignEntity {
    return CredentialDesignDTO.toEntity(this)
  }

  static toEntity(dto: CredentialDesignDTO): CredentialDesignEntity {
    return new CredentialDesignEntity({
      id: dto.id,
      tenant_id: dto.tenantId,
      name: dto.name,
      meta_data_keys: dto.metadataKeys.map(key => key.asEntity()),
      schema_definition: dto.schemaDefinition.map(def => def.asEntity()),
      credential_design_branding: dto.credentialDesignBranding.asEntity()
    })
  }
}

export class CredentialDesignEntity {
  id: string
  tenant_id?: string
  name: string
  meta_data_keys: Array<MetaDataKeysEntity>
  schema_definition: Array<SchemaDefinitionEntity>
  credential_design_branding: CredentialDesignBrandingEntity

  constructor(init?: Partial<CredentialDesignEntity>) {
    Object.assign(this, init)

    if (init?.credential_design_branding) {
        this.credential_design_branding = new CredentialDesignBrandingEntity(
            init.credential_design_branding
        )
    }

      if (init?.meta_data_keys) {
          this.meta_data_keys = init?.meta_data_keys.map(key => {
              return new MetaDataKeysEntity(
                  key
              )
          })
      }

    if (init?.schema_definition) {
        this.schema_definition = init?.schema_definition.map(def => new SchemaDefinitionEntity(
            def
        ))
    }

    deleteUndefinedProps(this)
  }

  asDTO(): CredentialDesignDTO {
    return CredentialDesignEntity.toDTO(this)
  }

  static toDTO(entity: CredentialDesignEntity): CredentialDesignDTO {
    return new CredentialDesignDTO({
      id: entity.id,
      tenantId: entity.tenant_id,
      name: entity.name,
      metadataKeys: entity.meta_data_keys.map(key => key.asDTO()),
      schemaDefinition: entity.schema_definition.map(def => def.asDTO()),
      credentialDesignBranding: entity.credential_design_branding.asDTO()
    })
  }
}

export class CredentialDesignBrandingEntity {
    id: string
    logo?: ImageAttributes
    background_image?: ImageAttributes
    text_color: string
    background_color: string
    meta_data_set_id: string

    constructor(init?: Partial<CredentialDesignBrandingEntity>) {
        Object.assign(this, init)
        deleteUndefinedProps(this)
    }

    asDTO(): CredentialDesignBrandingDTO {
        return CredentialDesignBrandingEntity.toDTO(this)
    }

    static toDTO(entity: CredentialDesignBrandingEntity): CredentialDesignBrandingDTO {
        return new CredentialDesignBrandingDTO({
            id: entity.id,
            logo: entity.logo,
            backgroundImage: entity.background_image,
            textColor: entity.text_color,
            backgroundColor: entity.background_color,
            metaDataSetId: entity.meta_data_set_id,
        })
    }
}

export class CredentialDesignBrandingDTO {
    id: string
    logo?: ImageAttributes
    backgroundImage?: ImageAttributes
    textColor: string
    backgroundColor: string
    metaDataSetId?: string

    constructor(init?: Partial<CredentialDesignBrandingDTO>) {
        Object.assign(this, init)
    }

    asEntity(): CredentialDesignBrandingEntity {
        return CredentialDesignBrandingDTO.toEntity(this)
    }

    static toEntity(dto: CredentialDesignBrandingDTO): CredentialDesignBrandingEntity {
        return new CredentialDesignBrandingEntity({
            id: dto.id,
            logo: dto.logo,
            background_image: dto.backgroundImage,
            text_color: dto.textColor,
            background_color: dto.backgroundColor,
            meta_data_set_id: dto.metaDataSetId
        })
    }
}


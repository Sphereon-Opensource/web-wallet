import { MigrationInterface, QueryRunner } from 'typeorm'
import { enablePostgresUuidExtension } from '@sphereon/ssi-sdk.core'

export class AddCredentialDesignBranding1763717017000 implements MigrationInterface {
  name = 'AddCredentialDesignBranding1763717017000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await enablePostgresUuidExtension(queryRunner)

    await queryRunner.query(`
      CREATE TABLE "credential_design_branding"
      (
        "id"                uuid NOT NULL DEFAULT gen_random_uuid(),
        "logo"              uuid,
        "background_image"  uuid,
        "text_color"        text,
        "background_color"  text,
        "meta_data_set_id"  uuid,
        CONSTRAINT "credentialdesignbranding_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "fk_credentialdesignbranding_metadata" FOREIGN KEY ("meta_data_set_id") REFERENCES "meta_data_set" ("id") ON DELETE CASCADE,
        CONSTRAINT "unique_meta_data_set_id" UNIQUE ("meta_data_set_id"),
        CONSTRAINT "fk_branding_logo" FOREIGN KEY ("logo") REFERENCES "ImageAttributes" ("id"),
        CONSTRAINT "fk_branding_background_image" FOREIGN KEY ("background_image") REFERENCES "ImageAttributes" ("id")
      );
    `)

    await queryRunner.query(`
        create or replace function insert_credential_design(
            p_identifier text,
            p_credential_format text,
            p_schema jsonb,
            p_ui_schema jsonb,
            p_form_step_id uuid,
            p_branding jsonb
        )
        returns jsonb
        language plpgsql
        as $$
        declare
            _set_id uuid;
            _credential_type_key_id uuid;
            _credential_format_key_id uuid;
            _schema_definition_id uuid;
            _ui_schema_definition_id uuid;
            _branding_id uuid;
        
            -- logo / background helper vars
            _logo_dimensions_id uuid;
            _logo_attr_id uuid;
            _logo_width integer;
            _logo_height integer;
        
            _bg_dimensions_id uuid;
            _bg_attr_id uuid;
            _bg_width integer;
            _bg_height integer;
        begin
            -- 1) Create meta_data_set
            insert into meta_data_set (name)
            values (p_identifier)
            returning id into _set_id;
        
            -- 2) Create meta_data_keys for credentialType
            insert into meta_data_keys (set_id, key, value_type)
            values (_set_id, 'credentialType', 'Text')
            returning id into _credential_type_key_id;
        
            -- Insert meta_data_values for credentialType
            insert into meta_data_values (key_id, index, text_value)
            values 
                (_credential_type_key_id, 0, 'VerifiableCredential'),
                (_credential_type_key_id, 1, p_identifier);
        
            -- 3) Create meta_data_keys for credentialFormat
            insert into meta_data_keys (set_id, key, value_type)
            values (_set_id, 'credentialFormat', 'Text')
            returning id into _credential_format_key_id;
        
            -- Insert meta_data_values for credentialFormat
            insert into meta_data_values (key_id, index, text_value)
            values (_credential_format_key_id, 0, p_credential_format);
        
            -- 4) Insert Data schema_definition (use jsonb directly)
            insert into schema_definition (
                correlation_id,
                schema_type,
                entity_type,
                schema,
                meta_data_set_id
            )
            values (
                p_identifier,
                'Data',
                'VC',
                p_schema,
                _set_id
            )
            returning id into _schema_definition_id;
        
            -- 5) Insert UI_Form schema_definition (use jsonb directly)
            insert into schema_definition (
                correlation_id,
                schema_type,
                entity_type,
                schema,
                meta_data_set_id
            )
            values (
                p_identifier,
                'UI_Form',
                'VC',
                p_ui_schema,
                _set_id
            )
            returning id into _ui_schema_definition_id;
        
            -- Link form step to both definitions
            insert into form_step_to_schema_definition (form_step_id, schema_definition_id)
            values 
                (p_form_step_id, _schema_definition_id),
                (p_form_step_id, _ui_schema_definition_id);
        
            -- === Insert images if provided ===
            -- Logo
            if (p_branding is not null) and (p_branding->'logo' is not null) and (p_branding->'logo'->>'uri' is not null) then
                _logo_width := null;
                _logo_height := null;
                if (p_branding->'logo'->'dimensions') is not null then
                    begin
                        _logo_width := (p_branding->'logo'->'dimensions'->>'width')::integer;
                        _logo_height := (p_branding->'logo'->'dimensions'->>'height')::integer;
                    exception when others then
                        _logo_width := null;
                        _logo_height := null;
                    end;
                end if;
        
                if _logo_width is not null and _logo_height is not null then
                    insert into "ImageDimensions" (width, height)
                    values (_logo_width, _logo_height)
                    returning id into _logo_dimensions_id;
                else
                    _logo_dimensions_id := null;
                end if;
        
                insert into "ImageAttributes" (uri, "dimensionsId")
                values (p_branding->'logo'->>'uri', _logo_dimensions_id)
                returning id into _logo_attr_id;
            else
                _logo_attr_id := null;
                _logo_dimensions_id := null;
            end if;
        
            -- Background image
            if (p_branding is not null) and (p_branding->'background_image' is not null) and (p_branding->'background_image'->>'uri' is not null) then
                _bg_width := null;
                _bg_height := null;
                if (p_branding->'background_image'->'dimensions') is not null then
                    begin
                        _bg_width := (p_branding->'background_image'->'dimensions'->>'width')::integer;
                        _bg_height := (p_branding->'background_image'->'dimensions'->>'height')::integer;
                    exception when others then
                        _bg_width := null;
                        _bg_height := null;
                    end;
                end if;
        
                if _bg_width is not null and _bg_height is not null then
                    insert into "ImageDimensions" (width, height)
                    values (_bg_width, _bg_height)
                    returning id into _bg_dimensions_id;
                else
                    _bg_dimensions_id := null;
                end if;
        
                insert into "ImageAttributes" (uri, "dimensionsId")
                values (p_branding->'background_image'->>'uri', _bg_dimensions_id)
                returning id into _bg_attr_id;
            else
                _bg_attr_id := null;
                _bg_dimensions_id := null;
            end if;
        
            -- 6) Insert credential_design_branding
            insert into credential_design_branding (
                logo,
                background_image,
                text_color,
                background_color,
                meta_data_set_id
            )
            values (
                _logo_attr_id,
                _bg_attr_id,
                p_branding->>'text_color',
                p_branding->>'background_color',
                _set_id
            )
            returning id into _branding_id;
        
            -- 7) Return full nested object
            return jsonb_build_object(
                'id', _set_id,
                'tenant_id', null,
                'name', p_identifier,
                'meta_data_keys', jsonb_build_array(
                    jsonb_build_object(
                        'id', _credential_type_key_id,
                        'key', 'credentialType',
                        'set_id', _set_id,
                        'value_type', 'Text',
                        'meta_data_values', jsonb_build_array(
                            jsonb_build_object('id', gen_random_uuid(), 'index', 0, 'key_id', _credential_type_key_id, 'text_value', 'VerifiableCredential'),
                            jsonb_build_object('id', gen_random_uuid(), 'index', 1, 'key_id', _credential_type_key_id, 'text_value', p_identifier)
                        )
                    ),
                    jsonb_build_object(
                        'id', _credential_format_key_id,
                        'key', 'credentialFormat',
                        'set_id', _set_id,
                        'value_type', 'Text',
                        'meta_data_values', jsonb_build_array(
                            jsonb_build_object('id', gen_random_uuid(), 'index', 0, 'key_id', _credential_format_key_id, 'text_value', p_credential_format)
                        )
                    )
                ),
                'schema_definition', jsonb_build_array(
                    jsonb_build_object(
                        'id', _schema_definition_id,
                        'schema', p_schema,
                        'tenant_id', null,
                        'extends_id', null,
                        'entity_type', 'VC',
                        'schema_type', 'Data',
                        'correlation_id', p_identifier,
                        'meta_data_set_id', _set_id,
                        'form_step_to_schema_definition', jsonb_build_array(
                            jsonb_build_object('form_step_id', p_form_step_id, 'schema_definition_id', _schema_definition_id)
                        )
                    ),
                    jsonb_build_object(
                        'id', _ui_schema_definition_id,
                        'schema', p_ui_schema,
                        'tenant_id', null,
                        'extends_id', null,
                        'entity_type', 'VC',
                        'schema_type', 'UI_Form',
                        'correlation_id', p_identifier,
                        'meta_data_set_id', _set_id,
                        'form_step_to_schema_definition', jsonb_build_array(
                            jsonb_build_object('form_step_id', p_form_step_id, 'schema_definition_id', _ui_schema_definition_id)
                        )
                    )
                ),
                'credential_design_branding', jsonb_build_array(
                    jsonb_build_object(
                        'id', _branding_id,
                        'logo', CASE
                            WHEN _logo_attr_id IS NOT NULL THEN
                                jsonb_build_object(
                                    'id', _logo_attr_id,
                                    'uri', (select uri from "ImageAttributes" where id = _logo_attr_id),
                                    'dimensions', CASE
                                        WHEN _logo_dimensions_id IS NOT NULL THEN
                                            jsonb_build_object(
                                                'id', _logo_dimensions_id,
                                                'width', (select width from "ImageDimensions" where id = _logo_dimensions_id),
                                                'height', (select height from "ImageDimensions" where id = _logo_dimensions_id)
                                            )
                                        ELSE null
                                    END
                                )
                            ELSE null
                        END,
                        'text_color', p_branding->>'text_color',
                        'background_image', CASE
                            WHEN _bg_attr_id IS NOT NULL THEN
                                jsonb_build_object(
                                    'id', _bg_attr_id,
                                    'uri', (select uri from "ImageAttributes" where id = _bg_attr_id),
                                    'dimensions', CASE
                                        WHEN _bg_dimensions_id IS NOT NULL THEN
                                            jsonb_build_object(
                                                'id', _bg_dimensions_id,
                                                'width', (select width from "ImageDimensions" where id = _bg_dimensions_id),
                                                'height', (select height from "ImageDimensions" where id = _bg_dimensions_id)
                                            )
                                        ELSE null
                                    END
                                )
                            ELSE null
                        END,
                        'background_color', p_branding->>'background_color',
                        'meta_data_set_id', _set_id
                    )
                )
            );
        end;
        $$;
    `)

    await queryRunner.query(`
        create or replace function update_credential_design(
            p_set_id uuid,
            p_identifier text,
            p_credential_format text,
            p_schema jsonb,
            p_ui_schema jsonb,
            p_branding jsonb
        )
        returns jsonb
        language plpgsql
        as $$
        declare
            _credential_type_key_id uuid;
            _credential_format_key_id uuid;
            _schema_definition_id uuid;
            _ui_schema_definition_id uuid;
            _branding_id uuid;
        
            -- logo / background helper vars
            _logo_dimensions_id uuid;
            _logo_attr_id uuid;
            _logo_width integer;
            _logo_height integer;
        
            _bg_dimensions_id uuid;
            _bg_attr_id uuid;
            _bg_width integer;
            _bg_height integer;
        begin
            -- 1) Update meta_data_set
            update meta_data_set
            set name = p_identifier
            where id = p_set_id;
        
            -- 2) Get existing meta_data_keys
            select id into _credential_type_key_id
            from meta_data_keys
            where set_id = p_set_id and key = 'credentialType'
            limit 1;
        
            select id into _credential_format_key_id
            from meta_data_keys
            where set_id = p_set_id and key = 'credentialFormat'
            limit 1;
        
            -- 3) Update credentialType meta_data_values
            delete from meta_data_values where key_id = _credential_type_key_id;
            insert into meta_data_values(key_id, index, text_value)
            values
                (_credential_type_key_id, 0, 'VerifiableCredential'),
                (_credential_type_key_id, 1, p_identifier);
        
            -- 4) Update credentialFormat meta_data_values
            delete from meta_data_values where key_id = _credential_format_key_id;
            insert into meta_data_values(key_id, index, text_value)
            values
                (_credential_format_key_id, 0, p_credential_format);
        
            -- 5) Update schema_definitions
            select id into _schema_definition_id
            from schema_definition
            where meta_data_set_id = p_set_id and schema_type = 'Data'
            limit 1;
        
            update schema_definition
            set schema = p_schema
            where id = _schema_definition_id;
        
            select id into _ui_schema_definition_id
            from schema_definition
            where meta_data_set_id = p_set_id and schema_type = 'UI_Form'
            limit 1;
        
            update schema_definition
            set schema = p_ui_schema
            where id = _ui_schema_definition_id;
        
            -- 6) Update branding
            select id into _branding_id
            from credential_design_branding
            where meta_data_set_id = p_set_id
            limit 1;
        
            -- === Update / Insert images if provided ===
            -- Logo
            if (p_branding is not null) and (p_branding->'logo' is not null) and (p_branding->'logo'->>'uri' is not null) then
                _logo_width := null;
                _logo_height := null;
                if (p_branding->'logo'->'dimensions') is not null then
                    begin
                        _logo_width := (p_branding->'logo'->'dimensions'->>'width')::integer;
                        _logo_height := (p_branding->'logo'->'dimensions'->>'height')::integer;
                    exception when others then
                        _logo_width := null;
                        _logo_height := null;
                    end;
                end if;
        
                if _logo_width is not null and _logo_height is not null then
                    if exists(select 1 from "ImageAttributes" where id = (select logo from credential_design_branding where id = _branding_id)) then
                        update "ImageDimensions" set width = _logo_width, height = _logo_height
                        where id = (select "dimensionsId" from "ImageAttributes" where id = (select logo from credential_design_branding where id = _branding_id))
                        returning id into _logo_dimensions_id;
                    else
                        insert into "ImageDimensions" (width, height)
                        values (_logo_width, _logo_height)
                        returning id into _logo_dimensions_id;
                    end if;
                else
                    _logo_dimensions_id := null;
                end if;
        
                if exists(select 1 from "ImageAttributes" where id = (select logo from credential_design_branding where id = _branding_id)) then
                    update "ImageAttributes"
                    set uri = p_branding->'logo'->>'uri', "dimensionsId" = _logo_dimensions_id
                    where id = (select logo from credential_design_branding where id = _branding_id)
                    returning id into _logo_attr_id;
                else
                    insert into "ImageAttributes" (uri, "dimensionsId")
                    values (p_branding->'logo'->>'uri', _logo_dimensions_id)
                    returning id into _logo_attr_id;
                end if;
            else
                _logo_attr_id := null;
                _logo_dimensions_id := null;
            end if;
        
            -- Background image
            if (p_branding is not null) and (p_branding->'background_image' is not null) and (p_branding->'background_image'->>'uri' is not null) then
                _bg_width := null;
                _bg_height := null;
                if (p_branding->'background_image'->'dimensions') is not null then
                    begin
                        _bg_width := (p_branding->'background_image'->'dimensions'->>'width')::integer;
                        _bg_height := (p_branding->'background_image'->'dimensions'->>'height')::integer;
                    exception when others then
                        _bg_width := null;
                        _bg_height := null;
                    end;
                end if;
        
                if _bg_width is not null and _bg_height is not null then
                    if exists(select 1 from "ImageAttributes" where id = (select background_image from credential_design_branding where id = _branding_id)) then
                        update "ImageDimensions" set width = _bg_width, height = _bg_height
                        where id = (select "dimensionsId" from "ImageAttributes" where id = (select background_image from credential_design_branding where id = _branding_id))
                        returning id into _bg_dimensions_id;
                    else
                        insert into "ImageDimensions" (width, height)
                        values (_bg_width, _bg_height)
                        returning id into _bg_dimensions_id;
                    end if;
                else
                    _bg_dimensions_id := null;
                end if;
        
                if exists(select 1 from "ImageAttributes" where id = (select background_image from credential_design_branding where id = _branding_id)) then
                    update "ImageAttributes"
                    set uri = p_branding->'background_image'->>'uri', "dimensionsId" = _bg_dimensions_id
                    where id = (select background_image from credential_design_branding where id = _branding_id)
                    returning id into _bg_attr_id;
                else
                    insert into "ImageAttributes" (uri, "dimensionsId")
                    values (p_branding->'background_image'->>'uri', _bg_dimensions_id)
                    returning id into _bg_attr_id;
                end if;
            else
                _bg_attr_id := null;
                _bg_dimensions_id := null;
            end if;
        
            -- Update credential_design_branding with new image attribute IDs
            update credential_design_branding
            set
                logo = _logo_attr_id,
                background_image = _bg_attr_id,
                text_color = p_branding->>'text_color',
                background_color = p_branding->>'background_color'
            where id = _branding_id;
        
            -- 7) Return updated object
            return jsonb_build_object(
                'id', p_set_id,
                'tenant_id', null,
                'name', p_identifier,
                'meta_data_keys', jsonb_build_array(
                    jsonb_build_object(
                        'id', _credential_type_key_id,
                        'key', 'credentialType',
                        'set_id', p_set_id,
                        'value_type', 'Text',
                        'meta_data_values', jsonb_build_array(
                            jsonb_build_object('id', gen_random_uuid(), 'index', 0, 'key_id', _credential_type_key_id, 'text_value', 'VerifiableCredential'),
                            jsonb_build_object('id', gen_random_uuid(), 'index', 1, 'key_id', _credential_type_key_id, 'text_value', p_identifier)
                        )
                    ),
                    jsonb_build_object(
                        'id', _credential_format_key_id,
                        'key', 'credentialFormat',
                        'set_id', p_set_id,
                        'value_type', 'Text',
                        'meta_data_values', jsonb_build_array(
                            jsonb_build_object('id', gen_random_uuid(), 'index', 0, 'key_id', _credential_format_key_id, 'text_value', p_credential_format)
                        )
                    )
                ),
                'schema_definition', jsonb_build_array(
                    jsonb_build_object('id', _schema_definition_id, 'schema', p_schema),
                    jsonb_build_object('id', _ui_schema_definition_id, 'schema', p_ui_schema)
                ),
                'credential_design_branding', jsonb_build_array(
                    jsonb_build_object(
                        'id', _branding_id,
                        'logo', CASE
                            WHEN _logo_attr_id IS NOT NULL THEN
                                jsonb_build_object(
                                    'id', _logo_attr_id,
                                    'uri', (select uri from "ImageAttributes" where id = _logo_attr_id),
                                    'dimensions', CASE
                                        WHEN _logo_dimensions_id IS NOT NULL THEN
                                            jsonb_build_object(
                                                'id', _logo_dimensions_id,
                                                'width', (select width from "ImageDimensions" where id = _logo_dimensions_id),
                                                'height', (select height from "ImageDimensions" where id = _logo_dimensions_id)
                                            )
                                        ELSE null
                                    END
                                )
                            ELSE null
                        END,
                        'text_color', p_branding->>'text_color',
                        'background_image', CASE
                            WHEN _bg_attr_id IS NOT NULL THEN
                                jsonb_build_object(
                                    'id', _bg_attr_id,
                                    'uri', (select uri from "ImageAttributes" where id = _bg_attr_id),
                                    'dimensions', CASE
                                        WHEN _bg_dimensions_id IS NOT NULL THEN
                                            jsonb_build_object(
                                                'id', _bg_dimensions_id,
                                                'width', (select width from "ImageDimensions" where id = _bg_dimensions_id),
                                                'height', (select height from "ImageDimensions" where id = _bg_dimensions_id)
                                            )
                                        ELSE null
                                    END
                                )
                            ELSE null
                        END,
                        'background_color', p_branding->>'background_color',
                        'meta_data_set_id', p_set_id
                    )
                )
            );
        end;
        $$;
    `)

    await queryRunner.query(`
      ALTER TABLE meta_data_keys DROP CONSTRAINT fk_meta_data_set
    `)
    await queryRunner.query(`
      ALTER TABLE meta_data_keys ADD CONSTRAINT fk_meta_data_set FOREIGN KEY (set_id) REFERENCES meta_data_set(id) ON DELETE CASCADE
    `)

    await queryRunner.query(`
      ALTER TABLE schema_definition DROP CONSTRAINT fk_schemadef_metadata
    `)
    await queryRunner.query(`
      ALTER TABLE schema_definition ADD CONSTRAINT fk_schemadef_metadata FOREIGN KEY (meta_data_set_id) REFERENCES meta_data_set(id) ON DELETE CASCADE
    `)

    await queryRunner.query(`
      ALTER TABLE meta_data_values DROP CONSTRAINT fk_meta_data_keys
    `)
    await queryRunner.query(`
      ALTER TABLE meta_data_values ADD CONSTRAINT fk_meta_data_keys FOREIGN KEY (key_id) REFERENCES meta_data_keys(id) ON DELETE CASCADE
    `)

    await queryRunner.query(`
      ALTER TABLE form_step_to_schema_definition DROP CONSTRAINT form_step_to_schema_definition_schema_definition_id_fkey;
    `)
    await queryRunner.query(`
      ALTER TABLE form_step_to_schema_definition ADD CONSTRAINT form_step_to_schema_definition_schema_definition_id_fkey FOREIGN KEY (schema_definition_id) REFERENCES schema_definition(id) ON DELETE CASCADE;
    `)

    await queryRunner.query(`
      ALTER TABLE form_step_to_schema_definition DROP CONSTRAINT fk_schema_definition;
    `)
    await queryRunner.query(`
      ALTER TABLE form_step_to_schema_definition ADD CONSTRAINT fk_schema_definition FOREIGN KEY (schema_definition_id) REFERENCES schema_definition(id) ON DELETE CASCADE;
    `)

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "credential_design_branding"
    `)

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS insert_credential_design
    `)

    await queryRunner.query(`
      DROP FUNCTION IF EXISTS update_credential_design
    `)

    await queryRunner.query(`
        ALTER TABLE meta_data_keys DROP CONSTRAINT fk_meta_data_set;
    `)
    await queryRunner.query(`
        ALTER TABLE meta_data_keys ADD CONSTRAINT fk_meta_data_set FOREIGN KEY (set_id) REFERENCES meta_data_set(id);
    `)

    await queryRunner.query(`
        ALTER TABLE schema_definition DROP CONSTRAINT fk_schemadef_metadata;
    `)
    await queryRunner.query(`
        ALTER TABLE schema_definition ADD CONSTRAINT fk_schemadef_metadata FOREIGN KEY (meta_data_set_id) REFERENCES meta_data_set(id);
    `)

    await queryRunner.query(`
        ALTER TABLE meta_data_values DROP CONSTRAINT fk_meta_data_keys;
    `)
    await queryRunner.query(`
        ALTER TABLE meta_data_values ADD CONSTRAINT fk_meta_data_keys FOREIGN KEY (key_id) REFERENCES meta_data_keys(id);
    `)

    await queryRunner.query(`
        ALTER TABLE form_step_to_schema_definition DROP CONSTRAINT form_step_to_schema_definition_schema_definition_id_fkey;
    `)
    await queryRunner.query(`
        ALTER TABLE form_step_to_schema_definition ADD CONSTRAINT form_step_to_schema_definition_schema_definition_id_fkey FOREIGN KEY (schema_definition_id) REFERENCES schema_definition(id);
    `)

    await queryRunner.query(`
        ALTER TABLE form_step_to_schema_definition DROP CONSTRAINT fk_schema_definition;
    `)
    await queryRunner.query(`
        ALTER TABLE form_step_to_schema_definition ADD CONSTRAINT fk_schema_definition FOREIGN KEY (schema_definition_id) REFERENCES schema_definition(id);
    `)
  }
}

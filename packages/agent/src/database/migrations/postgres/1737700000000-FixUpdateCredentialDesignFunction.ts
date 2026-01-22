import { MigrationInterface, QueryRunner } from 'typeorm'

export class FixUpdateCredentialDesignFunction1737700000000 implements MigrationInterface {
  name = 'FixUpdateCredentialDesignFunction1737700000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix the update_credential_design function to handle missing keys
    // The original function assumed all keys exist, but for older credential designs
    // they may not exist, causing "null value in column 'key_id'" errors
    await queryRunner.query(`
        create or replace function update_credential_design(
            p_set_id uuid,
            p_identifier text,
            p_credential_format text,
            p_schema jsonb,
            p_ui_schema jsonb,
            p_branding jsonb,
            p_vct text default null,
            p_scope text default null,
            p_cryptographic_binding_methods_supported text[] default '{}',
            p_credential_signing_alg_values_supported text[] default '{}',
            p_proof_types_supported jsonb default '{}'::jsonb,
            p_advanced_schema boolean default false
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
            _vct_key_id uuid;
            _scope_key_id uuid;
            _cryptographic_binding_key_id uuid;
            _credential_signing_alg_key_id uuid;
            _proof_types_supported_key_id uuid;
            _advanced_schema_key_id uuid;

            _logo_dimensions_id uuid;
            _logo_attr_id uuid;
            _logo_width integer;
            _logo_height integer;

            _bg_dimensions_id uuid;
            _bg_attr_id uuid;
            _bg_width integer;
            _bg_height integer;

            _existing_cbms text[];
        begin
            update meta_data_set
            set name = p_identifier
            where id = p_set_id;

            -- Handle credentialType key (create if not exists)
            select id into _credential_type_key_id
            from meta_data_keys
            where set_id = p_set_id and key = 'credentialType'
            limit 1;

            if _credential_type_key_id is null then
                insert into meta_data_keys (set_id, key, value_type)
                values (p_set_id, 'credentialType', 'Text')
                returning id into _credential_type_key_id;
            end if;

            -- Handle credentialFormat key (create if not exists)
            select id into _credential_format_key_id
            from meta_data_keys
            where set_id = p_set_id and key = 'credentialFormat'
            limit 1;

            if _credential_format_key_id is null then
                insert into meta_data_keys (set_id, key, value_type)
                values (p_set_id, 'credentialFormat', 'Text')
                returning id into _credential_format_key_id;
            end if;

            delete from meta_data_values where key_id = _credential_type_key_id;
            insert into meta_data_values(key_id, index, text_value)
            values
                (_credential_type_key_id, 0, 'VerifiableCredential'),
                (_credential_type_key_id, 1, p_identifier);

            delete from meta_data_values where key_id = _credential_format_key_id;
            insert into meta_data_values(key_id, index, text_value)
            values
                (_credential_format_key_id, 0, p_credential_format);

            select id into _vct_key_id
            from meta_data_keys
            where set_id = p_set_id and key = 'vct'
            limit 1;

            if p_vct is not null then
                if _vct_key_id is null then
                    insert into meta_data_keys (set_id, key, value_type)
                    values (p_set_id, 'vct', 'Text')
                    returning id into _vct_key_id;
                end if;

                delete from meta_data_values where key_id = _vct_key_id;

                insert into meta_data_values (key_id, index, text_value)
                values (_vct_key_id, 0, p_vct);
            else
                if _vct_key_id is not null then
                    delete from meta_data_values where key_id = _vct_key_id;
                    delete from meta_data_keys where id = _vct_key_id;
                end if;
            end if;

            -- Handle advancedSchema key (create if not exists)
            select id into _advanced_schema_key_id
            from meta_data_keys
            where set_id = p_set_id and key = 'advancedSchema'
            limit 1;

            if _advanced_schema_key_id is null then
                insert into meta_data_keys (set_id, key, value_type)
                values (p_set_id, 'advancedSchema', 'Boolean')
                returning id into _advanced_schema_key_id;

                insert into meta_data_values (key_id, index, boolean_value)
                values (_advanced_schema_key_id, 0, p_advanced_schema);
            else
                -- Check if value exists, if not insert, otherwise update
                if exists (select 1 from meta_data_values where key_id = _advanced_schema_key_id) then
                    update meta_data_values
                    set boolean_value = p_advanced_schema
                    where key_id = _advanced_schema_key_id;
                else
                    insert into meta_data_values (key_id, index, boolean_value)
                    values (_advanced_schema_key_id, 0, p_advanced_schema);
                end if;
            end if;

            select id into _scope_key_id
            from meta_data_keys
            where set_id = p_set_id and key = 'scope'
            limit 1;

            if p_scope is not null then
                if _scope_key_id is null then
                    insert into meta_data_keys (set_id, key, value_type)
                    values (p_set_id, 'scope', 'Text')
                    returning id into _scope_key_id;
                end if;

                delete from meta_data_values where key_id = _scope_key_id;

                insert into meta_data_values (key_id, index, text_value)
                values (_scope_key_id, 0, p_scope);
            else
                if _scope_key_id is not null then
                    delete from meta_data_values where key_id = _scope_key_id;
                    delete from meta_data_keys where id = _scope_key_id;
                end if;
            end if;

            select id
            into _cryptographic_binding_key_id
            from meta_data_keys
            where set_id = p_set_id
              and key = 'cryptographicBindingMethodsSupported';

            if _cryptographic_binding_key_id is null then
                insert into meta_data_keys (set_id, key, value_type)
                values (p_set_id, 'cryptographicBindingMethodsSupported', 'Text')
                returning id into _cryptographic_binding_key_id;
            end if;

            select array_agg(text_value order by index)
            into _existing_cbms
            from meta_data_values
            where key_id = _cryptographic_binding_key_id;

            if _existing_cbms is null then
                _existing_cbms := '{}';
            end if;

            insert into meta_data_values (key_id, index, text_value)
            select
                _cryptographic_binding_key_id,
                (
                    select coalesce(max(index),0)
                    from meta_data_values
                    where key_id = _cryptographic_binding_key_id
                ) + row_number() over (),
                v
            from unnest(p_cryptographic_binding_methods_supported) as v
            where v is not null
              and not (v = ANY(_existing_cbms));

            delete from meta_data_values
            where key_id = _cryptographic_binding_key_id
              and text_value != ALL(p_cryptographic_binding_methods_supported);

            select id
            into _credential_signing_alg_key_id
            from meta_data_keys
            where set_id = p_set_id
              and key = 'credentialSigningAlgValuesSupported';

            if _credential_signing_alg_key_id is null then
                insert into meta_data_keys (set_id, key, value_type)
                values (p_set_id, 'credentialSigningAlgValuesSupported', 'Text')
                returning id into _credential_signing_alg_key_id;
            end if;

            select array_agg(text_value order by index)
            into _existing_cbms
            from meta_data_values
            where key_id = _credential_signing_alg_key_id;

            if _existing_cbms is null then
                _existing_cbms := '{}';
            end if;

            insert into meta_data_values (key_id, index, text_value)
            select
                _credential_signing_alg_key_id,
                (
                    select coalesce(max(index),0)
                    from meta_data_values
                    where key_id = _credential_signing_alg_key_id
                ) + row_number() over (),
                v
            from unnest(p_credential_signing_alg_values_supported) as v
            where v is not null
              and not (v = ANY(_existing_cbms));

            delete from meta_data_values
            where key_id = _credential_signing_alg_key_id
              and text_value != ALL(p_credential_signing_alg_values_supported);

            -- Handle proofTypesSupported key (create if not exists)
            select id
            into _proof_types_supported_key_id
            from meta_data_keys
            where set_id = p_set_id
              and key = 'proofTypesSupported';

            if _proof_types_supported_key_id is null then
                insert into meta_data_keys (set_id, key, value_type)
                values (p_set_id, 'proofTypesSupported', 'Text')
                returning id into _proof_types_supported_key_id;

                insert into meta_data_values (key_id, index, text_value)
                values (_proof_types_supported_key_id, 0, p_proof_types_supported);
            else
                -- Check if value exists, if not insert, otherwise update
                if exists (select 1 from meta_data_values where key_id = _proof_types_supported_key_id and index = 0) then
                    update meta_data_values
                    set text_value = p_proof_types_supported
                    where key_id = _proof_types_supported_key_id
                      and index = 0;
                else
                    insert into meta_data_values (key_id, index, text_value)
                    values (_proof_types_supported_key_id, 0, p_proof_types_supported);
                end if;
            end if;

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

            select id into _branding_id
            from credential_design_branding
            where meta_data_set_id = p_set_id
            limit 1;

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
                declare
                    _old_logo_attr uuid;
                    _old_logo_dim uuid;
                begin
                    select logo into _old_logo_attr
                    from credential_design_branding
                    where id = _branding_id;

                    if _old_logo_attr is not null then
                        update credential_design_branding
                        set logo = null
                        where id = _branding_id;

                        select "dimensionsId" into _old_logo_dim
                        from "ImageAttributes"
                        where id = _old_logo_attr;

                        delete from "ImageAttributes"
                        where id = _old_logo_attr;

                        if _old_logo_dim is not null then
                            delete from "ImageDimensions"
                            where id = _old_logo_dim;
                        end if;
                    end if;
                end;

                _logo_attr_id := null;
                _logo_dimensions_id := null;
            end if;

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
                declare
                    _old_bg_attr uuid;
                    _old_bg_dim uuid;
                begin
                    select background_image into _old_bg_attr
                    from credential_design_branding
                    where id = _branding_id;

                    if _old_bg_attr is not null then
                        update credential_design_branding
                        set background_image = null
                        where id = _branding_id;

                        select "dimensionsId" into _old_bg_dim
                        from "ImageAttributes"
                        where id = _old_bg_attr;

                        delete from "ImageAttributes"
                        where id = _old_bg_attr;

                        if _old_bg_dim is not null then
                            delete from "ImageDimensions"
                            where id = _old_bg_dim;
                        end if;
                    end if;
                end;

                _bg_attr_id := null;
                _bg_dimensions_id := null;
            end if;

            update credential_design_branding
            set
                logo = _logo_attr_id,
                background_image = _bg_attr_id,
                text_color = p_branding->>'text_color',
                background_color = p_branding->>'background_color'
            where id = _branding_id;

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
                        'meta_data_values', (
                          select jsonb_agg(
                              jsonb_build_object(
                                  'id', id,
                                  'index', index,
                                  'key_id', key_id,
                                  'text_value', text_value
                              ) order by index
                          )
                          from meta_data_values
                          where key_id = _credential_type_key_id
                      )
                    ),
                    jsonb_build_object(
                        'id', _credential_format_key_id,
                        'key', 'credentialFormat',
                        'set_id', p_set_id,
                        'value_type', 'Text',
                        'meta_data_values', (
                          select jsonb_agg(
                              jsonb_build_object(
                                  'id', id,
                                  'index', index,
                                  'key_id', key_id,
                                  'text_value', text_value
                              ) order by index
                          )
                          from meta_data_values
                          where key_id = _credential_format_key_id
                      )
                    ),
                    jsonb_build_object(
                        'id', _advanced_schema_key_id,
                        'key', 'advancedSchema',
                        'set_id', p_set_id,
                        'value_type', 'Boolean',
                        'meta_data_values', (
                            select coalesce(
                                jsonb_agg(
                                    jsonb_build_object(
                                        'id', id,
                                        'index', index,
                                        'key_id', key_id,
                                        'boolean_value', boolean_value
                                    ) order by index
                                ), '[]'::jsonb
                            )
                            from meta_data_values
                            where key_id = _advanced_schema_key_id
                        )
                    ),
                    jsonb_build_object(
                        'id', _cryptographic_binding_key_id,
                        'key', 'cryptographicBindingMethodsSupported',
                        'set_id', p_set_id,
                        'value_type', 'Text',
                        'meta_data_values', (
                            select coalesce(
                                jsonb_agg(
                                    jsonb_build_object(
                                        'id', id,
                                        'index', index,
                                        'key_id', key_id,
                                        'text_value', text_value
                                    ) order by index
                                ),
                                '[]'::jsonb
                            )
                            from meta_data_values
                            where key_id = _cryptographic_binding_key_id
                        )
                    ),
                    jsonb_build_object(
                        'id', _credential_signing_alg_key_id,
                        'key', 'credentialSigningAlgValuesSupported',
                        'set_id', p_set_id,
                        'value_type', 'Text',
                        'meta_data_values', (
                            select coalesce(
                                jsonb_agg(
                                    jsonb_build_object(
                                        'id', id,
                                        'index', index,
                                        'key_id', key_id,
                                        'text_value', text_value
                                    ) order by index
                                ),
                                '[]'::jsonb
                            )
                            from meta_data_values
                            where key_id = _credential_signing_alg_key_id
                        )
                    ),
                    jsonb_build_object(
                        'id', _proof_types_supported_key_id,
                        'key', 'proofTypesSupported',
                        'set_id', p_set_id,
                        'value_type', 'Text',
                        'meta_data_values', (
                            select coalesce(
                                jsonb_agg(
                                    jsonb_build_object(
                                        'id', id,
                                        'index', index,
                                        'key_id', key_id,
                                        'text_value', text_value
                                    ) order by index
                                ), '[]'::jsonb
                            )
                            from meta_data_values
                            where key_id = _proof_types_supported_key_id
                        )
                    ),
                    CASE
                        WHEN _vct_key_id IS NOT NULL THEN
                            jsonb_build_object(
                                'id', _vct_key_id,
                                'key', 'vct',
                                'set_id', p_set_id,
                                'value_type', 'Text',
                                'meta_data_values', (
                                    select jsonb_agg(
                                        jsonb_build_object(
                                            'id', id,
                                            'index', index,
                                            'key_id', key_id,
                                            'text_value', text_value
                                        ) order by index
                                    )
                                    from meta_data_values
                                    where key_id = _vct_key_id
                                )
                            )
                        ELSE null
                    END,
                    CASE
                        WHEN _scope_key_id IS NOT NULL THEN
                            jsonb_build_object(
                                'id', _scope_key_id,
                                'key', 'scope',
                                'set_id', p_set_id,
                                'value_type', 'Text',
                                'meta_data_values', (
                                    select jsonb_agg(
                                        jsonb_build_object(
                                            'id', id,
                                            'index', index,
                                            'key_id', key_id,
                                            'text_value', text_value
                                        ) order by index
                                    )
                                    from meta_data_values
                                    where key_id = _scope_key_id
                                )
                            )
                        ELSE null
                    END
                ),
                'schema_definition', jsonb_build_array(
                    jsonb_build_object('id', _schema_definition_id, 'schema', p_schema),
                    jsonb_build_object('id', _ui_schema_definition_id, 'schema', p_ui_schema)
                ),
                'credential_design_branding', jsonb_build_object(
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
            );
        end;
        $$;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverting would restore the original broken function
    // Just drop and let the previous migration's version be recreated on rerun
  }
}

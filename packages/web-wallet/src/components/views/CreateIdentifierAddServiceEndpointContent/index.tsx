import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {FormView, IconButton, PrimaryButton} from '@sphereon/ui-components.ssi-react'
import addServiceEndpointSchema from '../../../../src/schemas/data/addServiceEndpointSchema.json' assert {type: 'json'}
import addServiceEndpointUISchema from '../../../../src/schemas/ui/addServiceEndpointUISchema.json' assert {type: 'json'}
import SelectionField from '@components/fields/SelectionField'
import {useIdentifierCreateOutletContext} from '@typings/machine/identifiers/create'
import style from './index.module.css'
import {IdentifierServiceEndpoint} from '@typings'

const CreateIdentifierAddServiceEndpointContent: FC = (): ReactElement => {
  const translate = useTranslate()

  const {serviceEndpoints, onSetServiceEndpoints, serviceEndpointData, onServiceEndpointChange, capabilitiesInfo} = useIdentifierCreateOutletContext()

  const serviceEndpointsPossible = capabilitiesInfo?.identifierCapability?.serviceEndpoints

  console.log(`Service endpoints possible: ${serviceEndpointsPossible}`)

  const onRemoveServiceEndpoint = async (id: string): Promise<void> => {
    onSetServiceEndpoints(prevServiceEndpoints => prevServiceEndpoints.filter(serviceEndpoint => serviceEndpoint.id !== id))
  }

  const onAddServiceEndpoint = async (): Promise<void> => {
    const newServiceEndpoint: IdentifierServiceEndpoint = {
      id: serviceEndpointData?.data?.id,
      type: serviceEndpointData?.data?.type,
      serviceEndpoint: serviceEndpointData?.data?.serviceEndpoint,
    }
    onSetServiceEndpoints(prevServiceEndpoints => [...prevServiceEndpoints, newServiceEndpoint])
    // TODO WALL-245 fix
    //setFormState(undefined)
  }

  const formatServiceEndpointValue = (serviceEndpoint: string) => {
    return `[${serviceEndpoint
      .split('\n')
      .map(value => `"${value}"`)
      .join(', ')}]`
  }

  const getServiceEndpointsElements = (): Array<ReactElement> => {
    return serviceEndpoints.map(serviceEndpoint => {
      const onRemove = async (): Promise<void> => {
        await onRemoveServiceEndpoint(serviceEndpoint.id)
      }

      const details = [
        {title: translate('create_identifier_service_endpoints_card_service_endpoint_type_label'), value: serviceEndpoint.type},
        {
          title: translate('create_identifier_service_endpoints_card_service_endpoint_label'),
          value: formatServiceEndpointValue(serviceEndpoint.serviceEndpoint),
        },
      ]

      return <SelectionField value={serviceEndpoint.id} details={details} onRemove={onRemove} />
    })
  }

  return (
    <div className={style.container}>
      <div className={style.contentContainer}>
        {serviceEndpoints.length === 0 && (
          <div className={style.formContainer}>
            <div>
              <div className={style.titleContainer}>
                <div className={style.titleCaption}>{translate('create_identifier_service_endpoints_title')}</div>
                <div className={style.titleOptionalContainer}>{translate('text_input_field_optional_caption')}</div>
              </div>
              <div className={style.descriptionCaption}>{translate('create_identifier_service_endpoints_description')}</div>
            </div>
            <FormView
              schema={addServiceEndpointSchema}
              uiSchema={addServiceEndpointUISchema}
              onFormStateChange={onServiceEndpointChange}
              readonly={!serviceEndpointsPossible}
            />
            <PrimaryButton
              caption={translate('create_identifier_service_endpoints_add_service_endpoint_label')}
              onClick={onAddServiceEndpoint}
              icon={ButtonIcon.ADD}
              disabled={!serviceEndpointsPossible || (serviceEndpointData?.errors !== undefined && serviceEndpointData?.errors.length > 0)}
            />
          </div>
        )}
        {serviceEndpoints.length > 0 && (
          <div className={style.contentContainer}>
            <div className={style.formContainer}>
              <div>
                <div className={style.titleCaption}>{translate('create_identifier_service_endpoints_title')}</div>
                <div className={style.descriptionCaption}>{translate('create_identifier_service_endpoints_description')}</div>
              </div>
              {getServiceEndpointsElements()}
            </div>
            <div className={style.formContainer}>
              <div className={style.addTitleCaption}>{translate('create_identifier_service_endpoints_title')}</div>
              <FormView
                schema={addServiceEndpointSchema}
                uiSchema={addServiceEndpointUISchema}
                onFormStateChange={onServiceEndpointChange}
                readonly={!serviceEndpointsPossible}
              />
              <PrimaryButton
                caption={translate('create_identifier_service_endpoints_add_service_endpoint_label')}
                onClick={onAddServiceEndpoint}
                icon={ButtonIcon.ADD}
                disabled={!serviceEndpointsPossible || (serviceEndpointData?.errors !== undefined && serviceEndpointData?.errors.length > 0)}
              />
            </div>
          </div>
        )}
        {/*        <div className={style.addContainer}>
          <IconButton
            icon={ButtonIcon.ADD}
            onClick={onAddServiceEndpoint}
            disabled={serviceEndpointData?.errors !== undefined && serviceEndpointData?.errors.length > 0}
          />
          <div
            className={style.addAnotherTitleCaption}
            style={{opacity: serviceEndpointData?.errors !== undefined && serviceEndpointData?.errors.length > 0 ? 0.5 : 1}}>
            {translate('create_identifier_service_endpoints_add_service_endpoint_label')}
          </div>
        </div>*/}
      </div>
    </div>
  )
}

export default CreateIdentifierAddServiceEndpointContent

import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {FormView, PrimaryButton} from '@sphereon/ui-components.ssi-react'
import addServiceEndpointSchema from '../../../../src/schemas/data/addServiceEndpointSchema.json' assert {type: 'json'}
import addServiceEndpointUISchema
  from '../../../../src/schemas/ui/addServiceEndpointUISchema.json' assert {type: 'json'}
import SelectionField from '@components/fields/SelectionField'
import {useIdentifierCreateOutletContext} from '@typings/machine/identifiers/create'
import {useIdentifiersEditContext} from '@typings/machine/identifiers/edit'
import {useLocation} from 'react-router-dom'
import style from './index.module.css'
import {IdentifierServiceEndpoint} from '@typings'

const CreateIdentifierAddServiceEndpointContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const location = useLocation()
  const isEditMode = location.pathname.includes('/edit/')

  // Use appropriate context based on mode
  let context
  if (isEditMode) {
    context = useIdentifiersEditContext()
  } else {
    context = useIdentifierCreateOutletContext()
  }

  const {
    serviceEndpoints,
    onSetServiceEndpoints,
    serviceEndpointData,
    onServiceEndpointChange,
    capabilitiesInfo,
  } = context

  const serviceEndpointsPossible = capabilitiesInfo?.identifierCapability?.serviceEndpoints

  console.log(`Service endpoints possible: ${serviceEndpointsPossible}`)

  const onRemoveServiceEndpoint = async (id: string): Promise<void> => {
    onSetServiceEndpoints(prevServiceEndpoints => prevServiceEndpoints.filter(serviceEndpoint => serviceEndpoint.id !== id))
  }

  const onAddServiceEndpoint = async (): Promise<void> => {
    if (!serviceEndpointData?.data) {
      return
    }

    const newServiceEndpoint: IdentifierServiceEndpoint = {
      id: serviceEndpointData.data.id,
      type: serviceEndpointData.data.type,
      serviceEndpoint: serviceEndpointData.data.serviceEndpoint,
    }
    onSetServiceEndpoints(prevServiceEndpoints => [...prevServiceEndpoints, newServiceEndpoint])
    // TODO WALL-245 fix

    // Reset form by triggering change with empty data
    await onServiceEndpointChange({data: undefined, errors: []})
  }

  const formatServiceEndpointValue = (serviceEndpoint: string) => {
    return `[${serviceEndpoint
      .split('\n')
      .map(value => `"${value}"`)
      .join(', ')}]`
  }

  const getServiceEndpointsElements = (): Array<ReactElement> => {
    return serviceEndpoints.map((serviceEndpoint, index) => {
      const onRemove = async (): Promise<void> => {
        await onRemoveServiceEndpoint(serviceEndpoint.id)
      }

      const details = [
        {
          title: translate('create_identifier_service_endpoints_card_service_endpoint_type_label'),
          value: serviceEndpoint.type,
        },
        {
          title: translate('create_identifier_service_endpoints_card_service_endpoint_label'),
          value: formatServiceEndpointValue(serviceEndpoint.serviceEndpoint),
        },
      ]

      return <SelectionField key={`${serviceEndpoint.id}-${index}`} value={serviceEndpoint.id} details={details}
                             onRemove={onRemove} />
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
              <div
                className={style.descriptionCaption}>{translate('create_identifier_service_endpoints_description')}</div>
            </div>
            <FormView
              key={serviceEndpoints.length}
              schema={addServiceEndpointSchema}
              uiSchema={addServiceEndpointUISchema}
              onFormStateChange={onServiceEndpointChange}
              readonly={!serviceEndpointsPossible}
              data={serviceEndpointData?.data}
            />
            <PrimaryButton
              caption={translate('create_identifier_service_endpoints_add_service_endpoint_label')}
              onClick={onAddServiceEndpoint}
              icon={ButtonIcon.ADD}
              disabled={!serviceEndpointsPossible || !serviceEndpointData?.data || (serviceEndpointData?.errors !== undefined && serviceEndpointData?.errors.length > 0)}
            />
          </div>
        )}
        {serviceEndpoints.length > 0 && (
          <div className={style.contentContainer}>
            <div className={style.formContainer}>
              <div>
                <div className={style.titleCaption}>{translate('create_identifier_service_endpoints_title')}</div>
                <div
                  className={style.descriptionCaption}>{translate('create_identifier_service_endpoints_description')}</div>
              </div>
              {getServiceEndpointsElements()}
            </div>
            <div className={style.formContainer}>
              <div className={style.addTitleCaption}>{translate('create_identifier_service_endpoints_title')}</div>
              <FormView
              key={serviceEndpoints.length}
                schema={addServiceEndpointSchema}
                uiSchema={addServiceEndpointUISchema}
                onFormStateChange={onServiceEndpointChange}
                readonly={!serviceEndpointsPossible}
                data={serviceEndpointData?.data}
              />
              <PrimaryButton
                caption={translate('create_identifier_service_endpoints_add_service_endpoint_label')}
                onClick={onAddServiceEndpoint}
                icon={ButtonIcon.ADD}
                disabled={!serviceEndpointsPossible || !serviceEndpointData?.data || (serviceEndpointData?.errors !== undefined && serviceEndpointData?.errors.length > 0)}
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

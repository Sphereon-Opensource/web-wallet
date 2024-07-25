import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {TabViewRoute} from '@sphereon/ui-components.core'
import {SSITabView} from '@sphereon/ui-components.ssi-react'
import SelectionField from '@components/fields/SelectionField'
import {useIdentifierCreateOutletContext} from '@typings/machine/identifiers/create'
import style from './index.module.css'

const CreateIdentifierSummaryContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {identifierData, serviceEndpoints, keys} = useIdentifierCreateOutletContext()

  const getKeyElements = (): Array<ReactElement> => {
    return keys.map(key => {
      const details = [
        {title: translate('create_identifier_keys_card_key_type_label'), value: key.type},
        {title: translate('create_identifier_keys_card_key_purpose_label'), value: key.purposes.join(', ')},
      ]

      return <SelectionField value={key.alias} details={details} />
    })
  }

  const formatServiceEndpointValue = (serviceEndpoint: string) => {
    return `[${serviceEndpoint
      .split('\n')
      .map(value => `"${value}"`)
      .join(', ')}]`
  }

  const getServiceEndpointsElements = (): Array<ReactElement> => {
    return serviceEndpoints.map(serviceEndpoint => {
      const details = [
        {title: translate('create_identifier_service_endpoints_card_service_endpoint_type_label'), value: serviceEndpoint.type},
        {
          title: translate('create_identifier_service_endpoints_card_service_endpoint_label'),
          value: formatServiceEndpointValue(serviceEndpoint.serviceEndpoint),
        },
      ]

      return <SelectionField value={serviceEndpoint.id} details={details} />
    })
  }

  const getExtraInformationContent = (): ReactElement => {
    return (
      <div className={style.extraInformationTabContainer}>
        <div className={style.extraInformationContainer}>
          <div className={style.extraInformationTitle}>{translate('create_identifier_summary_extra_information_keys_label')}</div>
          <div className={style.extraInformationItemsContainer}>{getKeyElements()}</div>
        </div>
        {serviceEndpoints.length > 0 && (
          <div className={style.extraInformationContainer}>
            <div className={style.extraInformationTitle}>{translate('create_identifier_summary_extra_information_service_endpoints_label')}</div>
            <div className={style.extraInformationItemsContainer}>{getServiceEndpointsElements()}</div>
          </div>
        )}
      </div>
    )
  }

  const routes: Array<TabViewRoute> = [
    {
      key: 'extraInformation',
      title: translate('create_identifier_summary_extra_information_tab_title'),
      content: getExtraInformationContent,
    },
  ]

  return (
    <div className={style.container}>
      <div className={style.headerContainer}>
        <div>
          <div className={style.headerTitle}>{translate('create_identifier_summary_title')}</div>
          <div className={style.headerDescription}>{translate('create_identifier_summary_description')}</div>
        </div>
        {identifierData && (
          <SelectionField
            details={[
              {title: translate('create_identifier_summary_card_identifier_type_label'), value: identifierData.data.type},
              {title: translate('create_identifier_summary_card_did_method_label'), value: identifierData.data.method},
              ...(identifierData.data.alias
                ? [{title: translate('create_identifier_summary_card_alias_label'), value: identifierData.data.alias}]
                : []),
            ]}
          />
        )}
      </div>
      <SSITabView routes={routes} />
    </div>
  )
}

export default CreateIdentifierSummaryContent

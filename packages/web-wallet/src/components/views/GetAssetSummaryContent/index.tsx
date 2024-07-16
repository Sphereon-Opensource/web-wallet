import React, {ReactElement} from 'react'
import style from '../../../../pages/assets/create/index.module.css'
import ItemCaption from '@components/views/ItemCaption'
import ContactCard from '@components/views/ContactCard'
import SelectionField from '@components/fields/SelectionField'
import FileSelectionField from '@components/fields/FileSelectionField'
import TextArea from '@components/fields/TextArea'
import {useTranslate} from '@refinedev/core'
import {useAssetOutletContext} from '@typings'

const GetAssetSummaryContent = (): ReactElement => {
  const translate = useTranslate()
  const {context, onSetAdditionalInformation} = useAssetOutletContext()
  const {ownerContact, product, document: selectedFile} = context
  return (
    <div className={style.contentContainer}>
      <div className={style.titleCaption}>{translate('asset_create_summary_title')}</div>
      <div className={style.subTitleCaption}>{translate('asset_create_summary_subtitle')}</div>
      <div className={style.summaryContainer}>
        <div className={style.workflowAddDocumentContainer}>
          <ItemCaption
            caption={translate('asset_create_summary_contact_label')}
            description={translate('asset_create_summary_contact_description')}
          />
          <ContactCard contact={ownerContact!} />
        </div>
        <div className={style.workflowAddDocumentContainer}>
          <ItemCaption
            caption={translate('asset_create_summary_product_label')}
            description={translate('asset_create_summary_product_description')}
          />
          <SelectionField style={{width: 582}} value={product!.productNature} />
        </div>
        <div className={style.workflowAddDocumentContainer}>
          <ItemCaption
            caption={translate('asset_create_summary_documents_label')}
            description={translate('asset_create_summary_documents_description')}
          />
          <FileSelectionField file={selectedFile!.file} />
        </div>
        <div className={style.workflowAddDocumentContainer}>
          <ItemCaption
            caption={translate('asset_create_summary_additional_information_label')}
            description={translate('asset_create_summary_additional_information_description')}
          />
          <TextArea onChangeValue={onSetAdditionalInformation} placeholder={translate('asset_create_summary_additional_information_placeholder')} />
        </div>
      </div>
    </div>
  )
}

export default GetAssetSummaryContent

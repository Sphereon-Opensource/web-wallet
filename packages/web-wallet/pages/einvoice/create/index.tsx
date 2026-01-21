import React, {FC} from 'react'
import style from './index.module.css'
import {useTranslate} from '@refinedev/core'
import {ProgressStepIndicator, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {Outlet} from 'react-router-dom'
import {useEInvoiceCreateMachine} from '@machines/einvoice/eInvoiceCreateStateNavigation'
import {staticPropsWithSST} from '@/src/i18n/server'

const EInvoiceCreatePage: FC = () => {
  const translate = useTranslate()
  const {
    disabled,
    step,
    maxInteractiveSteps,
    onNext,
    onBack,
    formData,
    onFormDataChange,
    isFormReadOnly,
    ublFile,
    onUblFileUpload,
    onUblFileRemove,
    isParsingUbl,
    ublParseError,
    evidenceFiles,
    onAddEvidenceFile,
    onRemoveEvidenceFile,
    recipient,
    onRecipientChange,
    onSelectEndpoint,
    isResolvingRecipient,
    setIsResolvingRecipient,
    recipientError,
    setRecipientError,
    isSending,
    sendError,
    isSavingDraft,
    onSaveAsDraft,
  } = useEInvoiceCreateMachine()

  const getButtonCaption = (): string => {
    if (step === maxInteractiveSteps) {
      return isSending ? translate('einvoice_sending_label', 'Sending...') : translate('einvoice_send_label', 'Send eInvoice')
    }
    return translate('action_proceed_label', 'Next')
  }

  return (
    <div className={style.container}>
      <PageHeaderBar path={translate('einvoice_create_path_label', 'eInvoice / Create')} />
      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          {sendError && (
            <div className={style.errorContainer}>
              <strong>{translate('einvoice_send_error_label', 'Failed to send eInvoice')}</strong>
              <span>{sendError}</span>
            </div>
          )}
          <Outlet
            context={{
              formData,
              onFormDataChange,
              isFormReadOnly,
              ublFile,
              onUblFileUpload,
              onUblFileRemove,
              isParsingUbl,
              ublParseError,
              evidenceFiles,
              onAddEvidenceFile,
              onRemoveEvidenceFile,
              recipient,
              onRecipientChange,
              onSelectEndpoint,
              isResolvingRecipient,
              setIsResolvingRecipient,
              recipientError,
              setRecipientError,
            }}
          />
          <div className={style.buttonsContainer}>
            {step > 1 && (
              <SecondaryButton
                style={{width: 109}}
                caption={translate('action_back_label', 'Back')}
                onClick={onBack}
                disabled={isSending || isSavingDraft}
              />
            )}
            {step === maxInteractiveSteps && (
              <SecondaryButton
                style={{width: 140, marginLeft: 'auto'}}
                caption={isSavingDraft ? translate('einvoice_saving_label', 'Saving...') : translate('einvoice_save_draft_label', 'Save as Draft')}
                onClick={onSaveAsDraft}
                disabled={disabled || isSending || isSavingDraft}
              />
            )}
            <PrimaryButton
              style={{width: 180, marginLeft: step === maxInteractiveSteps ? 12 : 'auto'}}
              caption={getButtonCaption()}
              onClick={onNext}
              disabled={disabled || isSending || isSavingDraft}
            />
          </div>
        </div>
        <ProgressStepIndicator
          steps={[
            {
              title: translate('einvoice_step_details_title', 'Invoice Data'),
              description: translate('einvoice_step_details_description', 'Enter or upload invoice details'),
            },
            {
              title: translate('einvoice_step_recipient_title', 'Recipient'),
              description: translate('einvoice_step_recipient_description', 'Select recipient and delivery method'),
            },
            {
              title: translate('einvoice_step_evidence_title', 'Supporting Documents'),
              description: translate('einvoice_step_evidence_description', 'Attach supporting documents'),
            },
            {
              title: translate('einvoice_step_review_title', 'Review & Send'),
              description: translate('einvoice_step_review_description', 'Review and send the eInvoice'),
            },
          ]}
          activeStep={step}
        />
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default EInvoiceCreatePage

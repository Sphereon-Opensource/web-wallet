import React, {FC} from 'react'
import style from './index.module.css'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton, ProgressStepIndicator} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {Outlet} from 'react-router-dom'
import {useCredentialsCreateMachine} from '@machines/credentials/credentialCreateStateNavigation'
import CredentialOfferModal, {QRValueResult} from '@components/modals/CredentialOfferModal'
import {CredentialPreviewItem} from '@components/views/CredentialExchangeView'
import {createCredentialPayloadWithSchema, qrValueGenerator} from '@/src/services/credentials/CredentialService'
import {staticPropsWithSST} from '@/src/i18n/server'

const CredentialsCreatePage: FC = () => {
  const translate = useTranslate()
  const {
    disabled,
    credentialType,
    credentialFormData,
    step,
    maxInteractiveSteps,
    onSelectCredentialTypeChange,
    onCredentialFormDataChange,
    onIssueCredential,
    onNext,
    onCloseCredentialOfferModal,
    showCredentialOfferModal,
    initialModalTab,
    onIssueMethodChange,
    issueMethod,
    issueMethods,
    evidenceFiles,
    onAddEvidenceFile,
    onRemoveEvidenceFile,
    uploadedEvidenceFiles,
  } = useCredentialsCreateMachine()

  const onSubmitQr = async (): Promise<void> => {
    console.log('submit qr clicked')
  }

  const onSubmitUrl = async (walletUrl: string): Promise<void> => {
    console.log('send to wallet', walletUrl)
    window.open(walletUrl, '_blank')
  }

  const generateQr = async (): Promise<QRValueResult> => {
    if (!credentialType?.schema) {
      throw Error(`No credential schema present`)
    } else if (!credentialFormData?.data) {
      throw Error(`No credential present`)
    }
    const payloadWithSchema = createCredentialPayloadWithSchema({
      schemaOpts: {schema: credentialType?.schema},
      payload: {
        type: credentialType.credentialType,
        ...credentialFormData.data,
      },
    })
    return qrValueGenerator(
      {
        credentialPayload: payloadWithSchema.payload,
        credentialGenerationMethod: 'JSON_SCHEMA',
      },
      {credentials: credentialType.credentialType},
    )
  }

  // Build credential preview for the modal
  const credentialPreviewItems: CredentialPreviewItem[] = credentialType
    ? [
        {
          id: Array.isArray(credentialType.credentialType) ? credentialType.credentialType[0] : credentialType.credentialType,
          name: Array.isArray(credentialType.credentialType) ? credentialType.credentialType[0] : credentialType.credentialType,
          type: 'Verifiable Credential',
          backgroundColor: '#7276F7',
        },
      ]
    : []

  return (
    <div className={style.container}>
      {showCredentialOfferModal && (
        <CredentialOfferModal
          initialTab={initialModalTab}
          qrValueGenerator={generateQr}
          onClose={onCloseCredentialOfferModal}
          onSubmitQr={onSubmitQr}
          onSubmitUrl={onSubmitUrl}
          credentials={credentialPreviewItems}
        />
      )}
      <PageHeaderBar path={translate('issue_credential_path_label')} />
      <div className={style.contentContainer}>
        <div className={style.outletContainer}>
          <Outlet
            context={{
              credentialType,
              onSelectCredentialTypeChange,
              credentialFormData,
              onCredentialFormDataChange,
              onIssueCredential,
              onIssueMethodChange,
              issueMethod,
              issueMethods,
              evidenceFiles,
              onAddEvidenceFile,
              onRemoveEvidenceFile,
              uploadedEvidenceFiles,
            }}
          />
          {credentialType && (
            <PrimaryButton
              style={{width: 180, marginLeft: 'auto'}}
              caption={step === maxInteractiveSteps ? translate('action_issue_credential_caption') : translate('action_proceed_label')}
              onClick={onNext}
              disabled={disabled}
            />
          )}
        </div>
        <ProgressStepIndicator
          steps={[
            {
              title: translate('issue_credential_enter_details_step_title'),
              description: translate('issue_credential_enter_details_step_description'),
            },
            {
              title: translate('issue_credential_enter_issue_method_title'),
              description: translate('issue_credential_enter_issue_method_description'),
            },
          ]}
          activeStep={step}
        />
      </div>
    </div>
  )
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default CredentialsCreatePage

import React, {FC} from 'react'
import style from './index.module.css'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton, ProgressStepIndicator} from '@sphereon/ui-components.ssi-react'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import {Outlet} from 'react-router-dom'
import {useCredentialsCreateMachine} from '@machines/credentials/credentialsCreateStateNavigation'
import QRCodeModal, {QRValueResult} from 'src/components/modals/QRCodeModal'
import {createCredentialPayloadWithSchema, qrValueGenerator} from '@/src/services/credentials/CredentialService'
import {staticPropsWithSST} from '@/src/i18n/server'
import WalletURLModal from '@components/modals/WalletURLModal'

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
    onCloseCredentialQRCodeModal,
    onCloseCredentialWalletUrlModal,
    showCredentialQRCodeModal,
    showCredentialWalletUrlModal,
    onIssueMethodChange,
    issueMethod,
    issueMethods,
  } = useCredentialsCreateMachine()

  const onSubmitQr = async (): Promise<void> => {
    console.log('submit qr clicked')
  }

  const onSubmitUrl = async (walletUrl:string): Promise<void> => {
    console.log('send to wallet', walletUrl)
    window.open(walletUrl, '_blank');
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
        ...credentialFormData.data
      },
    })
    return qrValueGenerator({credentialPayload: payloadWithSchema.payload}, {credentials: credentialType.credentialType})
  }

  return (
    <div className={style.container}>
      {showCredentialQRCodeModal && <QRCodeModal qrValueGenerator={generateQr} onClose={onCloseCredentialQRCodeModal} onSubmit={onSubmitQr} />}
      {showCredentialWalletUrlModal && <WalletURLModal qrValueGenerator={generateQr} onClose={onCloseCredentialWalletUrlModal} onSubmit={onSubmitUrl} />}
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
            // TODO enable later
            // {
            //     title: translate('issue_credential_enter_advanced_options_title'),
            //     description: translate('issue_credential_enter_advanced_options_description'),
            // },
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

export const getStaticProps = staticPropsWithSST

export default CredentialsCreatePage

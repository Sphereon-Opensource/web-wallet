import React, {createContext, useCallback, useContext, useEffect, useState} from 'react'
import {CredentialFormData, CredentialFormSelectionType, ValueSelection} from '@sphereon/ui-components.ssi-react'
import {useNavigate, useOutletContext} from 'react-router-dom'
import {IssueCredentialRoute, IssueMethod} from '@typings'
import {UIContextType} from '@typings'
import {useTranslate} from '@refinedev/core'

export type CredentialsCreateContextType = UIContextType & {
  credentialType?: CredentialFormSelectionType
  onSelectCredentialTypeChange: (credentialType: CredentialFormSelectionType) => Promise<void>
  credentialFormData?: CredentialFormData
  onCredentialFormDataChange: (credentialFormData: CredentialFormData) => Promise<void>
  onIssueCredential: () => Promise<void>
  showCredentialQRCodeModal: boolean
  onCloseCredentialQRCodeModal: () => Promise<void>
  onIssueMethodChange: (issueMethod: ValueSelection) => Promise<void>
  issueMethod: ValueSelection
  issueMethods: Array<ValueSelection>
}

export const CredentialsCreateContext = createContext({} as CredentialsCreateContextType)

export const useCredentialsCreateMachine = () => useContext(CredentialsCreateContext)

export const useCredentialsOutletContext = () => useOutletContext<CredentialsCreateContextType>()

const issueCredentialNavigationListener = async (step: number, navigate: any): Promise<void> => {
  switch (step) {
    case 1:
      return navigate(IssueCredentialRoute.DETAILS)
    case 2:
      return navigate(IssueCredentialRoute.ISSUE_METHOD)
    default:
      return Promise.reject('issue credential step exceeds maximum steps')
  }
}

export const CredentialsCreateContextProvider = (props: any): JSX.Element => {
  const {children} = props
  const translate = useTranslate()
  const navigate = useNavigate()
  const [step, setStep] = useState<number>(1)
  const [disabled, setDisabled] = useState<boolean>(true)
  const [credentialType, setCredentialType] = useState<CredentialFormSelectionType | undefined>()
  const [credentialFormData, setCredentialFormData] = useState<CredentialFormData | undefined>()
  const [showCredentialQRCodeModal, setShowCredentialQRCodeModal] = useState<boolean>(false)
  const issueMethods: Array<ValueSelection> = [
    {
      label: translate('credential_issuance_method_qr_code_label'),
      value: IssueMethod.QR_CODE,
    },
  ]
  const [issueMethod, setIssueMethod] = useState<ValueSelection>(issueMethods[0])

  const maxInteractiveSteps = 2
  const maxAutoSteps: number = 1

  useEffect(() => {
    void issueCredentialNavigationListener(step, navigate)

    const handlePopstate = (): void => {
      if (step > 0) {
        setStep(step - maxAutoSteps)
        // FIXME for now just resetting everything as we do not have support yet to rehydrate the fields again
        setCredentialType(undefined)
        setCredentialFormData(undefined)
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return (): void => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [step])

  useEffect((): void => {
    if (step === 1) {
      setDisabled(credentialFormData?.errors !== undefined && credentialFormData?.errors.length !== 0)
    } else if (step === 2) {
      setDisabled(issueMethod === undefined)
    } else {
      setDisabled(false)
    }
  }, [step, credentialFormData, issueMethod])

  const onNext = useCallback(async (): Promise<void> => {
    const nextStep: number = step + maxAutoSteps
    if (nextStep <= maxInteractiveSteps) {
      setStep(nextStep)
    } else {
      void onIssueCredential()
    }
  }, [step])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - maxAutoSteps
    if (nextStep >= 1) {
      setStep(nextStep)
    }
  }, [step])

  const onCloseCredentialQRCodeModal = async (): Promise<void> => {
    setShowCredentialQRCodeModal(false)
    setStep(1)
  }

  const onOpenCredentialQRCodeModal = async (): Promise<void> => {
    setShowCredentialQRCodeModal(true)
  }

  const onSelectCredentialTypeChange = async (credentialType: CredentialFormSelectionType): Promise<void> => {
    setCredentialType(credentialType)
  }

  const onCredentialFormDataChange = async (credentialFormData: CredentialFormData): Promise<void> => {
    setCredentialFormData(credentialFormData)
  }

  const onIssueCredential = async (): Promise<void> => {
    if (!issueMethod) {
      return
    }

    switch (issueMethod.value) {
      case IssueMethod.QR_CODE:
        return onOpenCredentialQRCodeModal()
      default:
        return Promise.reject(Error(`Issuance type ${issueMethod.value} not supported`))
    }
  }

  const onIssueMethodChange = async (issueMethod: ValueSelection): Promise<void> => {
    setIssueMethod(issueMethod)
  }

  return (
    <CredentialsCreateContext.Provider
      value={{
        onBack,
        onNext,
        disabled,
        step,
        maxInteractiveSteps,
        credentialType,
        credentialFormData,
        onSelectCredentialTypeChange,
        onCredentialFormDataChange,
        onIssueCredential,
        onCloseCredentialQRCodeModal,
        showCredentialQRCodeModal,
        onIssueMethodChange,
        issueMethod,
        issueMethods,
      }}>
      {children}
    </CredentialsCreateContext.Provider>
  )
}

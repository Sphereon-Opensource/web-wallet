import React, {createContext, useCallback, useContext, useEffect, useState} from 'react'
import {CredentialFormData, CredentialFormSelectionType, ValueSelection} from '@sphereon/ui-components.ssi-react'
import {useNavigate, useOutletContext} from 'react-router-dom'
import {IssueCredentialRoute, IssueMethod, UIContextType} from '@typings'
import {useTranslate} from '@refinedev/core'
import {EvidenceFile, UploadedEvidenceFile} from '@/src/types/evidence'
import {getAgentBaseUrl} from '@/src/agent/environment'

export type CredentialsCreateContextType = UIContextType & {
  credentialType?: CredentialFormSelectionType
  onSelectCredentialTypeChange: (credentialType: CredentialFormSelectionType) => Promise<void>
  credentialFormData?: CredentialFormData
  onCredentialFormDataChange: (credentialFormData: CredentialFormData) => Promise<void>
  onIssueCredential: () => Promise<void>
  showCredentialOfferModal: boolean
  initialModalTab: 'qr' | 'url'
  onCloseCredentialOfferModal: () => Promise<void>
  onIssueMethodChange: (issueMethod: ValueSelection) => Promise<void>
  issueMethod: ValueSelection
  issueMethods: Array<ValueSelection>
  // Evidence handling
  evidenceFiles: EvidenceFile[]
  onAddEvidenceFile: (file: File) => void
  onRemoveEvidenceFile: (index: number) => void
  uploadedEvidenceFiles: UploadedEvidenceFile[]
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
  const [showCredentialOfferModal, setShowCredentialOfferModal] = useState<boolean>(false)
  const [initialModalTab, setInitialModalTab] = useState<'qr' | 'url'>('qr')
  const issueMethods: Array<ValueSelection> = [
    {
      label: translate('credential_issuance_method_qr_code_label'),
      value: IssueMethod.QR_CODE,
    },
    {
      label: translate('credential_issuance_method_wallet_url_label'),
      value: IssueMethod.WALLET_URL,
    },
  ]
  const [issueMethod, setIssueMethod] = useState<ValueSelection>(issueMethods[0])

  // Evidence state
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([])
  const [uploadedEvidenceFiles, setUploadedEvidenceFiles] = useState<UploadedEvidenceFile[]>([])

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
      const disabled = credentialFormData?.errors !== undefined && credentialFormData?.errors.length !== 0
      setDisabled(disabled)
      if (disabled) {
        console.warn(credentialFormData.errors)
      }
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
  }, [step, issueMethod])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - maxAutoSteps
    if (nextStep >= 1) {
      setStep(nextStep)
    }
  }, [step])

  const onCloseCredentialOfferModal = async (): Promise<void> => {
    setShowCredentialOfferModal(false)
    setStep(1)
  }

  const onOpenCredentialOfferModal = async (tab: 'qr' | 'url'): Promise<void> => {
    setInitialModalTab(tab)
    setShowCredentialOfferModal(true)
  }

  // Evidence handlers
  const onAddEvidenceFile = useCallback((file: File): void => {
    setEvidenceFiles((prev) => [
      ...prev,
      {
        file,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        evidenceType: 'CredentialEvidence',
        uploaded: false,
      },
    ])
  }, [])

  const onRemoveEvidenceFile = useCallback((index: number): void => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const uploadEvidenceFiles = async (): Promise<UploadedEvidenceFile[]> => {
    const agentBaseUrl = getAgentBaseUrl()
    const uploaded: UploadedEvidenceFile[] = []

    for (const evidence of evidenceFiles) {
      if (!evidence.uploaded && evidence.file) {
        const formDataUpload = new FormData()
        formDataUpload.append('file', evidence.file)
        formDataUpload.append('assetType', evidence.evidenceType)
        formDataUpload.append('isPublic', 'true')

        const uploadResponse = await fetch(`${agentBaseUrl}/assets`, {
          method: 'POST',
          body: formDataUpload,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload evidence file: ${evidence.filename}`)
        }

        const uploadResult = await uploadResponse.json()
        evidence.uploaded = true
        evidence.uploadedId = uploadResult.id
        evidence.digestMultibase = uploadResult.digestMultibase
        uploaded.push({
          id: uploadResult.id,
          digestMultibase: uploadResult.digestMultibase,
          filename: evidence.filename,
          contentType: evidence.contentType,
          evidenceType: evidence.evidenceType,
        })
      } else if (evidence.uploadedId && evidence.digestMultibase) {
        uploaded.push({
          id: evidence.uploadedId,
          digestMultibase: evidence.digestMultibase,
          filename: evidence.filename,
          contentType: evidence.contentType,
          evidenceType: evidence.evidenceType,
        })
      }
    }

    setUploadedEvidenceFiles(uploaded)
    return uploaded
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

    // Upload evidence files if any
    if (evidenceFiles.length > 0) {
      try {
        await uploadEvidenceFiles()
      } catch (error) {
        console.error('Failed to upload evidence files:', error)
        // Continue anyway, evidence is optional
      }
    }

    switch (issueMethod.value) {
      case IssueMethod.QR_CODE:
        return onOpenCredentialOfferModal('qr')
      case IssueMethod.WALLET_URL:
        return onOpenCredentialOfferModal('url')
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
      }}>
      {children}
    </CredentialsCreateContext.Provider>
  )
}

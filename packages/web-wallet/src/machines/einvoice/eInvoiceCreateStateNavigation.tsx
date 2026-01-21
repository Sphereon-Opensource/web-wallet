import React, {createContext, useCallback, useContext, useEffect, useState} from 'react'
import {useNavigate, useOutletContext, useSearchParams} from 'react-router-dom'
import {EInvoiceCreateRoute, UIContextType} from '@typings'
import {useTranslate} from '@refinedev/core'
import {saveSentInvoice, updateSentInvoiceStatus, fetchSentInvoiceById, SentInvoice, deleteSentInvoice, sendOutboxItem} from '@/src/services/inboxService'
import {resolveEInvoicingEndpoints} from '@/src/services/recipientService'
import {getAgentBaseUrl} from '@/src/agent/environment'

/**
 * Parsed eInvoice data that can be populated manually or from UBL XML.
 */
export interface EInvoiceFormData {
  // Invoice identification
  invoiceId: string
  invoiceDate: string
  dueDate?: string

  // Currency and amounts
  currencyCode: string
  taxExclusiveAmount: number
  taxAmount: number
  taxInclusiveAmount: number
  payableAmount: number

  // Seller information
  sellerName: string
  sellerTaxId?: string
  sellerAddress?: {
    street?: string
    city?: string
    postalCode?: string
    countryCode?: string
  }

  // Buyer information
  buyerName: string
  buyerTaxId?: string
  buyerAddress?: {
    street?: string
    city?: string
    postalCode?: string
    countryCode?: string
  }

  // Optional fields
  invoiceTypeCode?: string
  note?: string
  paymentTerms?: string
  paymentMeansCode?: string

  // Line items from UBL
  lineItems?: {
    lineNumber: number
    description: string
    note?: string
    quantity: number
    quantityUnit: string
    unitPrice: number
    vatPercent: number
    lineTotal: number
  }[]
}

/**
 * Evidence file attached to the eInvoice.
 */
export interface EInvoiceEvidenceFile {
  id?: string
  file?: File
  filename: string
  contentType: string
  evidenceType: 'UBLInvoice' | 'SupportingDocument'
  uploaded: boolean
  uploadedId?: string
  /** Content-addressable digest from Asset store (multibase encoded) */
  digestMultibase?: string
}

/**
 * eInvoicing endpoint discovered from DID resolution
 */
export interface EInvoicingEndpoint {
  id: string
  serviceType: string
  serviceEndpoint: string
  description?: string
  entityName?: string
  country?: string
}

/**
 * Recipient information for sending the eInvoice.
 */
export interface EInvoiceRecipient {
  did: string
  name?: string
  organizationName?: string
  contactId?: string
  // eInvoicing endpoints discovered from DID resolution
  endpoints: EInvoicingEndpoint[]
  // Selected endpoint ID
  selectedEndpointId?: string
  // Legacy field for backward compatibility
  inboxEndpoint?: string
}

export type EInvoiceCreateContextType = UIContextType & {
  // Form data
  formData: EInvoiceFormData
  onFormDataChange: (data: Partial<EInvoiceFormData>) => void
  isFormReadOnly: boolean

  // UBL upload
  ublFile?: File
  onUblFileUpload: (file: File) => Promise<void>
  onUblFileRemove: () => void
  isParsingUbl: boolean
  ublParseError?: string

  // Evidence files
  evidenceFiles: EInvoiceEvidenceFile[]
  onAddEvidenceFile: (file: File, evidenceType: 'UBLInvoice' | 'SupportingDocument') => void
  onRemoveEvidenceFile: (index: number) => void

  // Recipient
  recipient?: EInvoiceRecipient
  onRecipientChange: (recipient: EInvoiceRecipient | undefined) => void
  onSelectEndpoint: (endpointId: string) => void
  isResolvingRecipient: boolean
  setIsResolvingRecipient: (isResolving: boolean) => void
  recipientError?: string
  setRecipientError: (error: string | undefined) => void

  // Sending
  isSending: boolean
  sendError?: string
  onSendEInvoice: () => Promise<void>

  // Save as draft
  isSavingDraft: boolean
  onSaveAsDraft: () => Promise<void>

  // Credential result
  credentialId?: string
}

export const EInvoiceCreateContext = createContext({} as EInvoiceCreateContextType)

export const useEInvoiceCreateMachine = () => useContext(EInvoiceCreateContext)

export const useEInvoiceOutletContext = () => useOutletContext<EInvoiceCreateContextType>()

const eInvoiceNavigationListener = async (step: number, navigate: any): Promise<void> => {
  switch (step) {
    case 1:
      return navigate(EInvoiceCreateRoute.DETAILS)
    case 2:
      return navigate(EInvoiceCreateRoute.RECIPIENT)
    case 3:
      return navigate(EInvoiceCreateRoute.EVIDENCE)
    case 4:
      return navigate(EInvoiceCreateRoute.REVIEW)
    default:
      return Promise.reject('eInvoice step exceeds maximum steps')
  }
}

const defaultFormData: EInvoiceFormData = {
  invoiceId: '',
  invoiceDate: new Date().toISOString().split('T')[0],
  currencyCode: 'EUR',
  taxExclusiveAmount: 0,
  taxAmount: 0,
  taxInclusiveAmount: 0,
  payableAmount: 0,
  sellerName: '',
  buyerName: '',
}

export const EInvoiceCreateContextProvider = (props: any): JSX.Element => {
  const {children} = props
  const translate = useTranslate()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Draft editing mode
  const draftId = searchParams.get('draftId')
  const [editingDraft, setEditingDraft] = useState<SentInvoice | null>(null)
  const [isLoadingDraft, setIsLoadingDraft] = useState<boolean>(false)

  // Step navigation
  const [step, setStep] = useState<number>(1)
  const [disabled, setDisabled] = useState<boolean>(true)

  // Form data
  const [formData, setFormData] = useState<EInvoiceFormData>(defaultFormData)
  const [isFormReadOnly, setIsFormReadOnly] = useState<boolean>(false)

  // UBL file
  const [ublFile, setUblFile] = useState<File | undefined>()
  const [isParsingUbl, setIsParsingUbl] = useState<boolean>(false)
  const [ublParseError, setUblParseError] = useState<string | undefined>()

  // Evidence files
  const [evidenceFiles, setEvidenceFiles] = useState<EInvoiceEvidenceFile[]>([])

  // Recipient
  const [recipient, setRecipient] = useState<EInvoiceRecipient | undefined>()
  const [isResolvingRecipient, setIsResolvingRecipient] = useState<boolean>(false)
  const [recipientError, setRecipientError] = useState<string | undefined>()

  // Sending
  const [isSending, setIsSending] = useState<boolean>(false)
  const [sendError, setSendError] = useState<string | undefined>()
  const [credentialId, setCredentialId] = useState<string | undefined>()

  // Save as draft
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false)

  const maxInteractiveSteps = 4
  const maxAutoSteps = 1

  // Load draft data when draftId is present
  useEffect(() => {
    if (!draftId) return

    const loadDraft = async () => {
      setIsLoadingDraft(true)
      try {
        const draft = await fetchSentInvoiceById(draftId)
        if (draft) {
          setEditingDraft(draft)

          // Populate form data from draft
          setFormData({
            invoiceId: draft.invoiceId,
            invoiceDate: draft.invoiceDate,
            dueDate: draft.dueDate,
            currencyCode: draft.currencyCode,
            taxExclusiveAmount: draft.taxExclusiveAmount,
            taxAmount: draft.taxAmount,
            taxInclusiveAmount: draft.taxInclusiveAmount,
            payableAmount: draft.payableAmount,
            sellerName: draft.sellerName,
            sellerTaxId: draft.sellerTaxId,
            buyerName: draft.buyerName,
            buyerTaxId: draft.buyerTaxId,
          })

          // Populate recipient from draft
          if (draft.recipientDid) {
            // If draft is missing endpoint data, re-resolve the DID to get endpoints
            if (!draft.recipientEndpoint || !draft.recipientEndpointType) {
              console.log('[EInvoice] Draft missing endpoint, re-resolving DID:', draft.recipientDid)
              try {
                const resolvedEndpoints = await resolveEInvoicingEndpoints(draft.recipientDid)
                const mappedEndpoints = resolvedEndpoints.map((ep) => ({
                  id: ep.id,
                  serviceType: ep.serviceType,
                  serviceEndpoint: ep.serviceEndpoint,
                  description: ep.description,
                  entityName: ep.entityName,
                  country: ep.country,
                }))

                // Find previously selected endpoint in resolved endpoints, or use first
                const selectedEndpoint = draft.recipientEndpointId
                  ? mappedEndpoints.find((ep) => ep.id === draft.recipientEndpointId) || mappedEndpoints[0]
                  : mappedEndpoints[0]

                setRecipient({
                  did: draft.recipientDid,
                  name: draft.recipientName,
                  organizationName: draft.recipientName,
                  endpoints: mappedEndpoints,
                  selectedEndpointId: selectedEndpoint?.id,
                  inboxEndpoint: selectedEndpoint?.serviceEndpoint,
                })
              } catch (resolveError) {
                console.error('[EInvoice] Failed to re-resolve DID:', resolveError)
                // Set recipient without endpoints - user will need to re-select
                setRecipient({
                  did: draft.recipientDid,
                  name: draft.recipientName,
                  organizationName: draft.recipientName,
                  endpoints: [],
                  selectedEndpointId: undefined,
                  inboxEndpoint: undefined,
                })
              }
            } else {
              // Draft has endpoint data, use it directly
              setRecipient({
                did: draft.recipientDid,
                name: draft.recipientName,
                organizationName: draft.recipientName,
                endpoints: [{
                  id: draft.recipientEndpointId!,
                  serviceType: draft.recipientEndpointType!,
                  serviceEndpoint: draft.recipientEndpoint,
                }],
                selectedEndpointId: draft.recipientEndpointId,
                inboxEndpoint: draft.recipientEndpoint,
              })
            }
          }

          // Populate evidence files from draft (mark as already uploaded)
          if (draft.evidenceFiles && draft.evidenceFiles.length > 0) {
            setEvidenceFiles(
              draft.evidenceFiles.map((ev) => ({
                id: ev.id,
                filename: ev.filename,
                contentType: ev.contentType,
                evidenceType: ev.evidenceType,
                uploaded: true,
                uploadedId: ev.id,
                digestMultibase: ev.digestMultibase,
              }))
            )
          }

          // Set form as read-only if created from UBL
          if (draft.hasUblSource) {
            setIsFormReadOnly(true)
          }

          console.log('[EInvoice] Loaded draft for editing:', draft.id)
        } else {
          console.error('[EInvoice] Draft not found:', draftId)
        }
      } catch (error) {
        console.error('[EInvoice] Error loading draft:', error)
      } finally {
        setIsLoadingDraft(false)
      }
    }

    loadDraft()
  }, [draftId])

  useEffect(() => {
    void eInvoiceNavigationListener(step, navigate)

    const handlePopstate = (): void => {
      if (step > 1) {
        setStep(step - maxAutoSteps)
      }
    }
    window.addEventListener('popstate', handlePopstate)
    return (): void => {
      window.removeEventListener('popstate', handlePopstate)
    }
  }, [step])

  // Validation logic per step
  useEffect((): void => {
    if (step === 1) {
      // Details step: require valid form data (invoice information)
      const hasValidFormData =
        formData.invoiceId.trim() !== '' &&
        formData.invoiceDate.trim() !== '' &&
        formData.sellerName.trim() !== '' &&
        formData.buyerName.trim() !== ''
      setDisabled(!hasValidFormData)
    } else if (step === 2) {
      // Recipient step: require valid recipient with selected endpoint
      const hasValidRecipient = !!(recipient?.did && recipient.endpoints.length > 0 && recipient.selectedEndpointId)
      setDisabled(!hasValidRecipient)
    } else if (step === 3) {
      // Evidence step: at least one evidence file required
      setDisabled(evidenceFiles.length === 0)
    } else if (step === 4) {
      // Review step: always enabled
      setDisabled(false)
    }
  }, [step, formData, evidenceFiles, recipient])

  const onNext = useCallback(async (): Promise<void> => {
    const nextStep: number = step + maxAutoSteps
    if (nextStep <= maxInteractiveSteps) {
      setStep(nextStep)
    } else {
      await onSendEInvoice()
    }
  }, [step])

  const onBack = useCallback(async (): Promise<void> => {
    const nextStep: number = step - maxAutoSteps
    if (nextStep >= 1) {
      setStep(nextStep)
    }
  }, [step])

  const onFormDataChange = useCallback((data: Partial<EInvoiceFormData>): void => {
    setFormData((prev) => ({...prev, ...data}))
  }, [])

  const onUblFileUpload = useCallback(async (file: File): Promise<void> => {
    setUblFile(file)
    setIsParsingUbl(true)
    setUblParseError(undefined)

    try {
      // Read file content
      const content = await file.text()

      // Parse UBL via server-side API
      const agentBaseUrl = getAgentBaseUrl()
      const response = await fetch(`${agentBaseUrl}/api/einvoice/parse-ubl`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({xml: content}),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to parse UBL file')
      }

      const parsedData = await response.json()

      // Map parsed data to form data
      setFormData({
        invoiceId: parsedData.invoice_id || '',
        invoiceDate: parsedData.invoice_date || '',
        dueDate: parsedData.due_date,
        currencyCode: parsedData.currency_code || 'EUR',
        taxExclusiveAmount: parsedData.tax_exclusive_amount || 0,
        taxAmount: parsedData.tax_amount || 0,
        taxInclusiveAmount: parsedData.tax_inclusive_amount || 0,
        payableAmount: parsedData.payable_amount || 0,
        sellerName: parsedData.seller_name || '',
        sellerTaxId: parsedData.seller_tax_id,
        sellerAddress: parsedData.seller_address
          ? {
              street: parsedData.seller_address.street,
              city: parsedData.seller_address.city,
              postalCode: parsedData.seller_address.postal_code,
              countryCode: parsedData.seller_address.country_code,
            }
          : undefined,
        buyerName: parsedData.buyer_name || '',
        buyerTaxId: parsedData.buyer_tax_id,
        buyerAddress: parsedData.buyer_address
          ? {
              street: parsedData.buyer_address.street,
              city: parsedData.buyer_address.city,
              postalCode: parsedData.buyer_address.postal_code,
              countryCode: parsedData.buyer_address.country_code,
            }
          : undefined,
        invoiceTypeCode: parsedData.invoice_type_code,
        note: parsedData.note,
        paymentTerms: parsedData.payment_terms,
        paymentMeansCode: parsedData.payment_means_code,
        lineItems: parsedData.line_items?.map((item: any) => ({
          lineNumber: item.line_number,
          description: item.description,
          note: item.note,
          quantity: item.quantity,
          quantityUnit: item.quantity_unit,
          unitPrice: item.unit_price,
          vatPercent: item.vat_percent,
          lineTotal: item.line_total,
        })),
      })

      // Add UBL file as evidence
      setEvidenceFiles((prev) => [
        ...prev,
        {
          file,
          filename: file.name,
          contentType: 'application/xml',
          evidenceType: 'UBLInvoice',
          uploaded: false,
        },
      ])

      // Make form read-only after UBL upload
      setIsFormReadOnly(true)
    } catch (error: any) {
      setUblParseError(error.message || 'Failed to parse UBL file')
      setUblFile(undefined)
    } finally {
      setIsParsingUbl(false)
    }
  }, [])

  const onUblFileRemove = useCallback((): void => {
    setUblFile(undefined)
    setIsFormReadOnly(false)
    setUblParseError(undefined)
    // Remove UBL file from evidence
    setEvidenceFiles((prev) => prev.filter((f) => f.evidenceType !== 'UBLInvoice'))
  }, [])

  const onAddEvidenceFile = useCallback((file: File, evidenceType: 'UBLInvoice' | 'SupportingDocument'): void => {
    setEvidenceFiles((prev) => [
      ...prev,
      {
        file,
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        evidenceType,
        uploaded: false,
      },
    ])
  }, [])

  const onRemoveEvidenceFile = useCallback((index: number): void => {
    setEvidenceFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const onRecipientChange = useCallback((newRecipient: EInvoiceRecipient | undefined): void => {
    setRecipient(newRecipient)
    // Only clear error when successfully setting a valid recipient
    if (newRecipient) {
      setRecipientError(undefined)
    }
  }, [])

  const onSelectEndpoint = useCallback((endpointId: string): void => {
    setRecipient((prev) => {
      if (!prev) return prev
      const endpoint = prev.endpoints.find((e) => e.id === endpointId)
      return {
        ...prev,
        selectedEndpointId: endpointId,
        inboxEndpoint: endpoint?.serviceEndpoint,
      }
    })
  }, [])

  const onSendEInvoice = useCallback(async (): Promise<void> => {
    if (!recipient?.did) {
      setSendError('Recipient DID is required')
      return
    }

    if (!recipient.selectedEndpointId || recipient.endpoints.length === 0) {
      setSendError('Please select a delivery method for the recipient')
      return
    }

    setIsSending(true)
    setSendError(undefined)

    // Get selected endpoint - fall back to inboxEndpoint for backwards compatibility
    const selectedEndpoint = recipient.endpoints.find((e) => e.id === recipient.selectedEndpointId)
    const endpointUrl = selectedEndpoint?.serviceEndpoint || recipient.inboxEndpoint

    if (!endpointUrl) {
      setSendError('Please select a valid delivery endpoint')
      setIsSending(false)
      return
    }

    try {
      // If editing a draft, delete the old draft first
      if (editingDraft) {
        await deleteSentInvoice(editingDraft.id)
        console.log('[EInvoice] Deleted old draft:', editingDraft.id)
      }

      // 1. Upload evidence files to Asset store and build metadata
      const agentBaseUrl = getAgentBaseUrl()
      const uploadedEvidenceFiles: Array<{id: string; digestMultibase: string; filename: string; contentType: string; evidenceType: 'UBLInvoice' | 'SupportingDocument'}> = []
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
          uploadedEvidenceFiles.push({
            id: uploadResult.id,
            digestMultibase: uploadResult.digestMultibase,
            filename: evidence.filename,
            contentType: evidence.contentType,
            evidenceType: evidence.evidenceType,
          })
        } else if (evidence.uploadedId && evidence.digestMultibase) {
          uploadedEvidenceFiles.push({
            id: evidence.uploadedId,
            digestMultibase: evidence.digestMultibase,
            filename: evidence.filename,
            contentType: evidence.contentType,
            evidenceType: evidence.evidenceType,
          })
        }
      }

      // 2. Save sent invoice to persistence layer (draft status initially)
      // Build InvoiceParty objects from form data
      const supplier = {
        name: formData.sellerName,
        vatNumber: formData.sellerTaxId,
        address: formData.sellerAddress ? {
          street: formData.sellerAddress.street || '',
          city: formData.sellerAddress.city || '',
          postalCode: formData.sellerAddress.postalCode || '',
          country: formData.sellerAddress.countryCode || '',
        } : undefined,
      }
      const customer = {
        name: formData.buyerName,
        vatNumber: formData.buyerTaxId,
        address: formData.buyerAddress ? {
          street: formData.buyerAddress.street || '',
          city: formData.buyerAddress.city || '',
          postalCode: formData.buyerAddress.postalCode || '',
          country: formData.buyerAddress.countryCode || '',
        } : undefined,
      }

      const sentInvoice = await saveSentInvoice({
        invoiceData: {
          invoiceId: formData.invoiceId,
          invoiceDate: formData.invoiceDate,
          dueDate: formData.dueDate,
          currencyCode: formData.currencyCode,
          taxExclusiveAmount: formData.taxExclusiveAmount,
          taxAmount: formData.taxAmount,
          taxInclusiveAmount: formData.taxInclusiveAmount,
          payableAmount: formData.payableAmount,
          sellerName: formData.sellerName,
          sellerTaxId: formData.sellerTaxId,
          buyerName: formData.buyerName,
          buyerTaxId: formData.buyerTaxId,
          supplier,
          customer,
          lineItems: formData.lineItems,
          invoiceTypeCode: formData.invoiceTypeCode,
          note: formData.note,
          paymentTerms: formData.paymentTerms,
          paymentMeansCode: formData.paymentMeansCode,
        },
        recipientDid: recipient.did,
        recipientName: recipient.name || recipient.organizationName,
        recipientEndpointId: recipient.selectedEndpointId,
        recipientEndpointType: selectedEndpoint?.serviceType,
        recipientEndpoint: endpointUrl,
        evidenceFiles: uploadedEvidenceFiles,
        hasUblSource: !!ublFile || evidenceFiles.some((f) => f.evidenceType === 'UBLInvoice'),
      })

      // 3. Send the outbox item (creates credential and sends via OID4VP)
      const sendResult = await sendOutboxItem(sentInvoice.id)

      if (!sendResult.success) {
        throw new Error(sendResult.error || 'Failed to send eInvoice')
      }

      setCredentialId(sendResult.credentialId)

      // Navigate to sent tab on eInvoice list
      navigate('/einvoice?tab=sent')
    } catch (error: any) {
      setSendError(error.message || 'Failed to send eInvoice')
    } finally {
      setIsSending(false)
    }
  }, [formData, evidenceFiles, recipient, navigate, editingDraft])

  const onSaveAsDraft = useCallback(async (): Promise<void> => {
    if (!recipient?.did) {
      setSendError('Recipient DID is required to save as draft')
      return
    }

    if (!recipient.selectedEndpointId || recipient.endpoints.length === 0) {
      setSendError('Please select a delivery method before saving')
      return
    }

    setIsSavingDraft(true)
    setSendError(undefined)

    // Get selected endpoint - fall back to inboxEndpoint for backwards compatibility
    const selectedEndpoint = recipient.endpoints.find((e) => e.id === recipient.selectedEndpointId)
    const endpointUrl = selectedEndpoint?.serviceEndpoint || recipient.inboxEndpoint

    if (!endpointUrl) {
      setSendError('Please select a valid delivery endpoint before saving')
      setIsSavingDraft(false)
      return
    }

    try {
      // If editing a draft, delete the old draft first
      if (editingDraft) {
        await deleteSentInvoice(editingDraft.id)
        console.log('[EInvoice] Deleted old draft for re-save:', editingDraft.id)
      }

      // 1. Upload evidence files to Asset store and build metadata
      const agentBaseUrl = getAgentBaseUrl()
      const uploadedEvidenceFiles: Array<{id: string; digestMultibase: string; filename: string; contentType: string; evidenceType: 'UBLInvoice' | 'SupportingDocument'}> = []
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
          uploadedEvidenceFiles.push({
            id: uploadResult.id,
            digestMultibase: uploadResult.digestMultibase,
            filename: evidence.filename,
            contentType: evidence.contentType,
            evidenceType: evidence.evidenceType,
          })
        } else if (evidence.uploadedId && evidence.digestMultibase) {
          uploadedEvidenceFiles.push({
            id: evidence.uploadedId,
            digestMultibase: evidence.digestMultibase,
            filename: evidence.filename,
            contentType: evidence.contentType,
            evidenceType: evidence.evidenceType,
          })
        }
      }

      // 2. Save as draft (no sending)
      // Build InvoiceParty objects from form data
      const draftSupplier = {
        name: formData.sellerName,
        vatNumber: formData.sellerTaxId,
        address: formData.sellerAddress ? {
          street: formData.sellerAddress.street || '',
          city: formData.sellerAddress.city || '',
          postalCode: formData.sellerAddress.postalCode || '',
          country: formData.sellerAddress.countryCode || '',
        } : undefined,
      }
      const draftCustomer = {
        name: formData.buyerName,
        vatNumber: formData.buyerTaxId,
        address: formData.buyerAddress ? {
          street: formData.buyerAddress.street || '',
          city: formData.buyerAddress.city || '',
          postalCode: formData.buyerAddress.postalCode || '',
          country: formData.buyerAddress.countryCode || '',
        } : undefined,
      }

      await saveSentInvoice({
        invoiceData: {
          invoiceId: formData.invoiceId,
          invoiceDate: formData.invoiceDate,
          dueDate: formData.dueDate,
          currencyCode: formData.currencyCode,
          taxExclusiveAmount: formData.taxExclusiveAmount,
          taxAmount: formData.taxAmount,
          taxInclusiveAmount: formData.taxInclusiveAmount,
          payableAmount: formData.payableAmount,
          sellerName: formData.sellerName,
          sellerTaxId: formData.sellerTaxId,
          buyerName: formData.buyerName,
          buyerTaxId: formData.buyerTaxId,
          supplier: draftSupplier,
          customer: draftCustomer,
          lineItems: formData.lineItems,
          invoiceTypeCode: formData.invoiceTypeCode,
          note: formData.note,
          paymentTerms: formData.paymentTerms,
          paymentMeansCode: formData.paymentMeansCode,
        },
        recipientDid: recipient.did,
        recipientName: recipient.name || recipient.organizationName,
        recipientEndpointId: recipient.selectedEndpointId,
        recipientEndpointType: selectedEndpoint?.serviceType,
        recipientEndpoint: endpointUrl,
        evidenceFiles: uploadedEvidenceFiles,
        hasUblSource: !!ublFile || evidenceFiles.some((f) => f.evidenceType === 'UBLInvoice'),
      })

      // Navigate to eInvoice list (sent tab)
      navigate('/einvoice')
    } catch (error: any) {
      setSendError(error.message || 'Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }, [formData, evidenceFiles, recipient, navigate, editingDraft])

  return (
    <EInvoiceCreateContext.Provider
      value={{
        step,
        maxInteractiveSteps,
        disabled,
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
        onSendEInvoice,
        isSavingDraft,
        onSaveAsDraft,
        credentialId,
      }}>
      {children}
    </EInvoiceCreateContext.Provider>
  )
}

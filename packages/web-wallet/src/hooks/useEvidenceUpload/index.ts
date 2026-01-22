import {useCallback, useState} from 'react'
import {EvidenceFile, UploadedEvidenceFile} from '@/src/types/evidence'
import {getAgentBaseUrl} from '@/src/agent/environment'

export interface UseEvidenceUploadResult {
  evidenceFiles: EvidenceFile[]
  onAddEvidenceFile: (file: File, evidenceType: EvidenceFile['evidenceType']) => void
  onRemoveEvidenceFile: (index: number) => void
  clearEvidenceFiles: () => void
  uploadEvidenceFiles: () => Promise<UploadedEvidenceFile[]>
  isUploading: boolean
  uploadError?: string
}

/**
 * Hook for managing evidence file upload.
 * Shared between credential issuance and eInvoice flows.
 */
export function useEvidenceUpload(initialFiles: EvidenceFile[] = []): UseEvidenceUploadResult {
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>(initialFiles)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | undefined>()

  const onAddEvidenceFile = useCallback((file: File, evidenceType: EvidenceFile['evidenceType']): void => {
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

  const clearEvidenceFiles = useCallback((): void => {
    setEvidenceFiles([])
  }, [])

  const uploadEvidenceFiles = useCallback(async (): Promise<UploadedEvidenceFile[]> => {
    setIsUploading(true)
    setUploadError(undefined)

    const agentBaseUrl = getAgentBaseUrl()
    const uploadedFiles: UploadedEvidenceFile[] = []

    try {
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
          uploadedFiles.push({
            id: uploadResult.id,
            digestMultibase: uploadResult.digestMultibase,
            filename: evidence.filename,
            contentType: evidence.contentType,
            evidenceType: evidence.evidenceType,
          })
        } else if (evidence.uploadedId && evidence.digestMultibase) {
          // Already uploaded, include in results
          uploadedFiles.push({
            id: evidence.uploadedId,
            digestMultibase: evidence.digestMultibase,
            filename: evidence.filename,
            contentType: evidence.contentType,
            evidenceType: evidence.evidenceType,
          })
        }
      }

      // Update state with uploaded info
      setEvidenceFiles([...evidenceFiles])
      return uploadedFiles
    } catch (error: any) {
      setUploadError(error.message || 'Failed to upload evidence files')
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [evidenceFiles])

  return {
    evidenceFiles,
    onAddEvidenceFile,
    onRemoveEvidenceFile,
    clearEvidenceFiles,
    uploadEvidenceFiles,
    isUploading,
    uploadError,
  }
}

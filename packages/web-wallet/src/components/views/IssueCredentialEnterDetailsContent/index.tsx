import React, {FC, ReactElement} from 'react'
import {CredentialIssuanceWizardView} from '@sphereon/ui-components.ssi-react'
import {useTranslate} from '@refinedev/core'
import {useCredentialsOutletContext} from '@machines/credentials/credentialCreateStateNavigation'
import {useForms} from '@helpers/forms'
import {FileUploadZone, FileItem} from '@components/fields'
import style from './index.module.css'

const IssueCredentialEnterDetailsContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {onSelectCredentialTypeChange, onCredentialFormDataChange, credentialType, evidenceFiles, onAddEvidenceFile, onRemoveEvidenceFile} =
    useCredentialsOutletContext()
  const forms = useForms({formName: 'CredentialIssuanceWizard'})
  const form_step_number = 1

  // Check if a file is already in the evidence list (by name and size)
  const isFileDuplicate = (file: File): boolean => {
    return evidenceFiles.some((ef) => ef.filename === file.name && ef.file?.size === file.size)
  }

  // Handle files added via FileUploadZone
  const handleFilesAdded = (files: File[]) => {
    files.forEach((file) => {
      if (!isFileDuplicate(file)) {
        onAddEvidenceFile(file)
      }
    })
  }

  if (forms.loading) return <div>Loading...</div>
  if (forms.error) return <div>Error: {forms.error}</div>

  return (
    <div className={style.container}>
      <CredentialIssuanceWizardView
        credentialTypes={forms.getCredentialFormSelectionType(form_step_number)}
        onSelectCredentialTypeChange={onSelectCredentialTypeChange}
        onCredentialFormDataChange={onCredentialFormDataChange}
      />

      {/* Evidence Section - only show when credential type is selected */}
      {credentialType && (
        <div className={style.evidenceSection}>
          <div className={style.evidenceHeader}>
            <h4 className={style.evidenceTitle}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
              {translate('credential_evidence_title', 'Supporting Documents')}
            </h4>
            <span className={style.optionalBadge}>{translate('credential_evidence_optional', 'Optional')}</span>
          </div>
          <p className={style.evidenceDescription}>
            {translate(
              'credential_evidence_description',
              'Attach supporting documents such as PDF files, images, or other relevant files to include as evidence with the credential.'
            )}
          </p>

          <FileUploadZone
            onFilesAdded={handleFilesAdded}
            text={translate('credential_evidence_upload_text', 'Click or drag files here to upload') as string}
            hint={translate('credential_evidence_upload_hint', 'PDF, Images, or documents up to 10MB each') as string}
            accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt,.json,.xml"
            multiple
            compact
          />

          {/* File List */}
          {evidenceFiles.length > 0 && (
            <div className={style.fileListSection}>
              <div className={style.fileListHeader}>
                <span className={style.fileListTitle}>{translate('credential_evidence_attached_files', 'Attached Files')}</span>
                <span className={style.fileCount}>{evidenceFiles.length}</span>
              </div>
              <div className={style.fileList}>
                {evidenceFiles.map((evidenceFile, index) => (
                  <FileItem
                    key={evidenceFile.id || `evidence-${index}`}
                    name={evidenceFile.filename}
                    contentType={evidenceFile.contentType}
                    size={evidenceFile.file?.size}
                    onRemove={() => onRemoveEvidenceFile(index)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default IssueCredentialEnterDetailsContent

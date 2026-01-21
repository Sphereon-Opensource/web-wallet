import React, {FC, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import {useEInvoiceOutletContext} from '@machines/einvoice/eInvoiceCreateStateNavigation'
import {formatFileSize} from '@helpers/formatUtils'
import {InfoPanel, StepHeader, FileItem, FileUploadZone} from '@components/fields'
import style from './index.module.css'

const EInvoiceEvidenceContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {evidenceFiles, onAddEvidenceFile, onRemoveEvidenceFile, ublFile} = useEInvoiceOutletContext()

  // Find UBL evidence file (either from ublFile or from evidenceFiles when loaded from draft)
  const ublEvidenceFile = evidenceFiles.find((f) => f.evidenceType === 'UBLInvoice')
  // Filter out UBL files from supporting files (shown separately)
  const supportingFiles = evidenceFiles.filter((f) => f.evidenceType !== 'UBLInvoice')

  // Check if a file is already in the evidence list (by name and size)
  const isFileDuplicate = (file: File): boolean => {
    return evidenceFiles.some(
      (ef) => ef.filename === file.name && ef.file?.size === file.size
    )
  }

  // Handle files added via FileUploadZone
  const handleFilesAdded = (files: File[]) => {
    files.forEach((file) => {
      if (!isFileDuplicate(file)) {
        onAddEvidenceFile(file, 'SupportingDocument')
      }
    })
  }

  return (
    <div className={style.container}>
      {/* Header */}
      <StepHeader
        title={translate('einvoice_evidence_title', 'Supporting Documents') as string}
        description={translate(
          'einvoice_evidence_description',
          'Attach supporting documents such as PDF attachments, images, or other relevant files to include with the eInvoice credential.'
        ) as string}
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        }
      />

      {/* UBL File Card (if present - either as File object or from draft evidence) */}
      {(ublFile || ublEvidenceFile) && (
        <div className={style.ublCard}>
          <div className={style.ublHeader}>
            <div className={style.ublBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              {translate('einvoice_evidence_ubl_included', 'UBL Invoice Included')}
            </div>
          </div>
          <div className={style.ublContent}>
            <div className={style.ublIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className={style.ublInfo}>
              <span className={style.ublName}>{ublFile?.name || ublEvidenceFile?.filename}</span>
              <span className={style.ublMeta}>
                UBL 2.1 XML Invoice {ublFile?.size ? `• ${formatFileSize(ublFile.size)}` : ''}
              </span>
            </div>
          </div>
          <p className={style.ublNote}>
            {translate('einvoice_evidence_ubl_note', 'This UBL invoice XML file will be linked with integrity protection to the eInvoice credential.')}
          </p>
        </div>
      )}

      {/* Upload Area */}
      <div className={style.uploadSection}>
        <h4 className={style.uploadSectionTitle}>
          {translate('einvoice_evidence_supporting_title', 'Supporting Documents')}
          <span className={style.optionalBadge}>{translate('einvoice_optional', 'Optional')}</span>
        </h4>

        <FileUploadZone
          onFilesAdded={handleFilesAdded}
          text={translate('einvoice_evidence_upload_text', 'Click or drag files here to upload') as string}
          hint={translate('einvoice_evidence_upload_hint', 'PDF, Images, or documents up to 10MB each') as string}
          accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt"
          multiple
        />
      </div>

      {/* File List */}
      {supportingFiles.length > 0 && (
        <div className={style.fileListSection}>
          <h4 className={style.fileListTitle}>
            {translate('einvoice_evidence_attached_files', 'Attached Files')}
            <span className={style.fileCount}>{supportingFiles.length}</span>
          </h4>
          <div className={style.fileList}>
            {supportingFiles.map((evidenceFile, index) => {
              // Find the actual index in the original array for removal
              const originalIndex = evidenceFiles.findIndex((f) => f === evidenceFile)
              return (
                <FileItem
                  key={evidenceFile.id || `evidence-${index}`}
                  name={evidenceFile.filename}
                  contentType={evidenceFile.contentType}
                  size={evidenceFile.file?.size}
                  badge={translate('einvoice_evidence_type_supporting', 'Supporting') as string}
                  onRemove={() => onRemoveEvidenceFile(originalIndex)}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <InfoPanel>
        {ublFile || ublEvidenceFile
          ? supportingFiles.length > 0
            ? translate(
                'einvoice_evidence_summary_with_files',
                'Your eInvoice will link the UBL invoice and {count} supporting document(s).'
              ).replace('{count}', String(supportingFiles.length))
            : translate('einvoice_evidence_summary_ubl_only', 'Your eInvoice will link the UBL invoice as evidence.')
          : supportingFiles.length > 0
            ? translate('einvoice_evidence_summary_files_only', '{count} supporting document(s) attached.').replace(
                '{count}',
                String(supportingFiles.length)
              )
            : translate('einvoice_evidence_summary_empty', 'No documents attached yet. Please upload at least one file to continue.')}
      </InfoPanel>
    </div>
  )
}

export default EInvoiceEvidenceContent

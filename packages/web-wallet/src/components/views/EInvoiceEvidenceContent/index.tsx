import React, {FC, ReactElement, useRef, ChangeEvent, useState} from 'react'
import {useTranslate} from '@refinedev/core'
import {useEInvoiceOutletContext} from '@machines/einvoice/eInvoiceCreateStateNavigation'
import {formatFileSize} from '@helpers/formatUtils'
import style from './index.module.css'

const EInvoiceEvidenceContent: FC = (): ReactElement => {
  const translate = useTranslate()
  const {evidenceFiles, onAddEvidenceFile, onRemoveEvidenceFile, ublFile} = useEInvoiceOutletContext()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Find UBL evidence file (either from ublFile or from evidenceFiles when loaded from draft)
  const ublEvidenceFile = evidenceFiles.find((f) => f.evidenceType === 'UBLInvoice')
  // Filter out UBL files from supporting files (shown separately)
  const supportingFiles = evidenceFiles.filter((f) => f.evidenceType !== 'UBLInvoice')

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        onAddEvidenceFile(file, 'SupportingDocument')
      })
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files) {
      Array.from(files).forEach((file) => {
        onAddEvidenceFile(file, 'SupportingDocument')
      })
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const getFileIconSvg = (contentType: string) => {
    if (contentType.includes('pdf')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      )
    }
    if (contentType.includes('image')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
      </svg>
    )
  }

  return (
    <div className={style.container}>
      <div className={style.header}>
        <h3 className={style.sectionTitle}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
          {translate('einvoice_evidence_title', 'Evidence Files')}
        </h3>
        <p className={style.description}>
          {translate(
            'einvoice_evidence_description',
            'Attach supporting documents such as PDF attachments, images, or other relevant files to include with the eInvoice credential.'
          )}
        </p>
      </div>

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
            {translate('einvoice_evidence_ubl_note', 'This UBL invoice XML file will be embedded in the eInvoice credential as primary evidence.')}
          </p>
        </div>
      )}

      {/* Upload Area */}
      <div className={style.uploadSection}>
        <h4 className={style.uploadSectionTitle}>
          {translate('einvoice_evidence_supporting_title', 'Supporting Documents')}
          <span className={style.optionalBadge}>{translate('einvoice_optional', 'Optional')}</span>
        </h4>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          style={{display: 'none'}}
          accept=".pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt"
        />
        <div
          className={`${style.uploadArea} ${isDragging ? style.uploadAreaDragging : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}>
          <div className={style.uploadIconWrapper}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <div className={style.uploadTextWrapper}>
            <span className={style.uploadText}>
              {translate('einvoice_evidence_upload_text', 'Click or drag files here to upload')}
            </span>
            <span className={style.uploadHint}>
              {translate('einvoice_evidence_upload_hint', 'PDF, Images, or documents up to 10MB each')}
            </span>
          </div>
        </div>
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
                <div key={evidenceFile.id || `evidence-${index}`} className={style.fileItem}>
                  <div className={style.fileIcon}>{getFileIconSvg(evidenceFile.contentType)}</div>
                  <div className={style.fileInfo}>
                    <span className={style.fileName}>{evidenceFile.filename}</span>
                    <span className={style.fileType}>
                      {evidenceFile.contentType || 'Unknown type'}
                      {evidenceFile.file?.size ? ` • ${formatFileSize(evidenceFile.file.size)}` : ''}
                    </span>
                  </div>
                  <span className={style.typeBadgeSupporting}>
                    {translate('einvoice_evidence_type_supporting', 'Supporting')}
                  </span>
                  <button
                    className={style.removeButton}
                    onClick={() => onRemoveEvidenceFile(originalIndex)}
                    type="button"
                    title={translate('action_remove_label', 'Remove')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className={style.summary}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>
          {ublFile || ublEvidenceFile
            ? supportingFiles.length > 0
              ? translate(
                  'einvoice_evidence_summary_with_files',
                  'Your eInvoice will include the UBL invoice and {count} supporting document(s).'
                ).replace('{count}', String(supportingFiles.length))
              : translate('einvoice_evidence_summary_ubl_only', 'Your eInvoice will include the UBL invoice as primary evidence.')
            : supportingFiles.length > 0
              ? translate('einvoice_evidence_summary_files_only', '{count} supporting document(s) attached.').replace(
                  '{count}',
                  String(supportingFiles.length)
                )
              : translate('einvoice_evidence_summary_empty', 'No evidence files attached yet. Please upload at least one file to continue.')}
        </span>
      </div>
    </div>
  )
}

export default EInvoiceEvidenceContent

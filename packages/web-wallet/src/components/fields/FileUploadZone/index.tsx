import React, {FC, useRef, useState, ChangeEvent, DragEvent} from 'react'
import style from './index.module.css'

export interface FileUploadZoneProps {
  /** Called when files are selected or dropped */
  onFilesAdded: (files: File[]) => void
  /** Accepted file types (e.g., ".pdf,.png,.jpg") */
  accept?: string
  /** Allow multiple file selection */
  multiple?: boolean
  /** Main upload text */
  text?: string
  /** Helper hint text below main text */
  hint?: string
  /** Disabled state */
  disabled?: boolean
  /** Additional CSS class for the container */
  className?: string
  /** Compact variant for inline layouts */
  compact?: boolean
}

/**
 * A reusable file upload zone component with drag-and-drop support.
 *
 * @example
 * // Basic usage
 * <FileUploadZone
 *   onFilesAdded={(files) => console.log(files)}
 *   accept=".pdf,.png,.jpg"
 *   multiple
 * />
 *
 * @example
 * // With custom text
 * <FileUploadZone
 *   onFilesAdded={handleFiles}
 *   text="Drop your invoice here"
 *   hint="PDF files only, max 10MB"
 *   accept=".pdf"
 * />
 */
export const FileUploadZone: FC<FileUploadZoneProps> = ({
  onFilesAdded,
  accept = '.pdf,.png,.jpg,.jpeg,.gif,.doc,.docx,.xls,.xlsx,.txt',
  multiple = true,
  text = 'Click or drag files here to upload',
  hint = 'PDF, Images, or documents up to 10MB each',
  disabled = false,
  className,
  compact = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFilesAdded(Array.from(files))
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      onFilesAdded(Array.from(files))
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const uploadAreaClasses = [
    compact ? style.uploadAreaCompact : style.uploadArea,
    isDragging && style.uploadAreaDragging,
    disabled && style.uploadAreaDisabled,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        onChange={handleFileChange}
        style={{display: 'none'}}
        accept={accept}
        disabled={disabled}
      />
      <div
        className={uploadAreaClasses}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
        {compact ? (
          <>
            <svg className={style.uploadIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span className={style.uploadTextCompact}>{text}</span>
          </>
        ) : (
          <>
            <div className={style.uploadIconWrapper}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className={style.uploadTextWrapper}>
              <span className={style.uploadText}>{text}</span>
              {hint && <span className={style.uploadHint}>{hint}</span>}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default FileUploadZone

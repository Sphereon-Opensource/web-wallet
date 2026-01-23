import React, {FC, ReactElement, useCallback, useState} from 'react'
import style from './index.module.css'

export interface ConfirmDeleteModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Title of the modal */
  title: string
  /** Message to display */
  message: string
  /** Text for the cancel button */
  cancelText?: string
  /** Text for the confirm button */
  confirmText?: string
  /** Called when cancel is clicked or modal is closed */
  onCancel: () => void
  /** Called when confirm is clicked */
  onConfirm: () => void | Promise<void>
  /** Whether the confirm action is in progress */
  isLoading?: boolean
  /** Item name to display (optional, for more specific messaging) */
  itemName?: string
  /** Number of items being deleted (for bulk delete) */
  itemCount?: number
}

/**
 * ConfirmDeleteModal - A reusable confirmation dialog for delete actions
 *
 * Supports both single item and bulk delete confirmations.
 * Shows loading state during async delete operations.
 */
const ConfirmDeleteModal: FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  cancelText = 'Cancel',
  confirmText = 'Delete',
  onCancel,
  onConfirm,
  isLoading = false,
  itemName,
  itemCount,
}): ReactElement | null => {
  const [internalLoading, setInternalLoading] = useState(false)

  const handleConfirm = useCallback(async () => {
    setInternalLoading(true)
    try {
      await onConfirm()
    } finally {
      setInternalLoading(false)
    }
  }, [onConfirm])

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading && !internalLoading) {
      onCancel()
    }
  }, [onCancel, isLoading, internalLoading])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading && !internalLoading) {
      onCancel()
    }
  }, [onCancel, isLoading, internalLoading])

  if (!isOpen) return null

  const loading = isLoading || internalLoading

  return (
    <div
      className={style.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      tabIndex={-1}
    >
      <div className={style.modal}>
        {/* Icon */}
        <div className={style.iconContainer}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        {/* Content */}
        <h2 id="confirm-delete-title" className={style.title}>{title}</h2>
        <p className={style.message}>
          {itemCount && itemCount > 1
            ? message.replace('{count}', itemCount.toString())
            : itemName
              ? message.replace('{name}', itemName)
              : message}
        </p>

        {/* Actions */}
        <div className={style.actions}>
          <button
            type="button"
            className={style.cancelButton}
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={style.confirmButton}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className={style.spinner} />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDeleteModal

/**
 * Hook for managing confirm delete modal state
 */
export interface UseConfirmDeleteOptions {
  onConfirm: (itemId: string) => Promise<void>
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export interface UseConfirmDeleteReturn {
  isOpen: boolean
  itemId: string | null
  itemName: string | null
  openModal: (itemId: string, itemName?: string) => void
  closeModal: () => void
  handleConfirm: () => Promise<void>
  isLoading: boolean
}

export function useConfirmDelete(options: UseConfirmDeleteOptions): UseConfirmDeleteReturn {
  const {onConfirm, onSuccess, onError} = options
  const [isOpen, setIsOpen] = React.useState(false)
  const [itemId, setItemId] = React.useState<string | null>(null)
  const [itemName, setItemName] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const openModal = useCallback((id: string, name?: string) => {
    setItemId(id)
    setItemName(name || null)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false)
      setItemId(null)
      setItemName(null)
    }
  }, [isLoading])

  const handleConfirm = useCallback(async () => {
    if (!itemId) return

    setIsLoading(true)
    try {
      await onConfirm(itemId)
      setIsOpen(false)
      setItemId(null)
      setItemName(null)
      onSuccess?.()
    } catch (error) {
      onError?.(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [itemId, onConfirm, onSuccess, onError])

  return {
    isOpen,
    itemId,
    itemName,
    openModal,
    closeModal,
    handleConfirm,
    isLoading,
  }
}

/**
 * Hook for managing bulk delete modal state
 */
export interface UseBulkDeleteOptions {
  onConfirm: (itemIds: string[]) => Promise<void>
  onSuccess?: () => void
  onError?: (error: Error) => void
}

export interface UseBulkDeleteReturn {
  isOpen: boolean
  itemIds: string[]
  openModal: (ids: string[]) => void
  closeModal: () => void
  handleConfirm: () => Promise<void>
  isLoading: boolean
}

export function useBulkDelete(options: UseBulkDeleteOptions): UseBulkDeleteReturn {
  const {onConfirm, onSuccess, onError} = options
  const [isOpen, setIsOpen] = React.useState(false)
  const [itemIds, setItemIds] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const openModal = useCallback((ids: string[]) => {
    setItemIds(ids)
    setIsOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    if (!isLoading) {
      setIsOpen(false)
      setItemIds([])
    }
  }, [isLoading])

  const handleConfirm = useCallback(async () => {
    if (itemIds.length === 0) return

    setIsLoading(true)
    try {
      await onConfirm(itemIds)
      setIsOpen(false)
      setItemIds([])
      onSuccess?.()
    } catch (error) {
      onError?.(error as Error)
    } finally {
      setIsLoading(false)
    }
  }, [itemIds, onConfirm, onSuccess, onError])

  return {
    isOpen,
    itemIds,
    openModal,
    closeModal,
    handleConfirm,
    isLoading,
  }
}

import React, {FC, ReactElement, useState, useEffect} from 'react'
import {createPortal} from 'react-dom'
import {useTranslate} from '@refinedev/core'
import {PrimaryButton} from '@sphereon/ui-components.ssi-react'
import CrossIcon from '@components/assets/icons/CrossIcon'
import style from './index.module.css'

type Props = {
  onClose: () => Promise<void>
  onSubmit: (linkedVpId: string, linkedVpFrom?: Date, linkedVpUntil?: Date) => Promise<void>
}

const generateLinkedVpId = (): string => `lvp-${Math.random().toString(36).substring(2, 15)}`

const PublishLinkedVPModal: FC<Props> = (props: Props): ReactElement | null => {
  const {onClose, onSubmit} = props
  const translate = useTranslate()
  const [mounted, setMounted] = useState(false)
  const [linkedVpId, setLinkedVpId] = useState(generateLinkedVpId())
  const [shareFromSpecificDate, setShareFromSpecificDate] = useState(false)
  const [linkedVpFrom, setLinkedVpFrom] = useState<Date | undefined>(undefined)
  const [shareUntilSpecificDate, setShareUntilSpecificDate] = useState(false)
  const [linkedVpUntil, setLinkedVpUntil] = useState<Date | undefined>(undefined)
  const [errors, setErrors] = useState<{linkedVpId?: string; linkedVpFrom?: string; linkedVpUntil?: string}>({})

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const validateLinkedVpId = (id: string): boolean => {
    if (!id.trim()) {
      setErrors(prev => ({...prev, linkedVpId: translate('create_shared_id_required_error')}))
      return false
    }

    const validPattern = /^[a-zA-Z0-9-]+$/
    if (!validPattern.test(id)) {
      setErrors(prev => ({...prev, linkedVpId: translate('create_shared_id_invalid_format_error')}))
      return false
    }

    setErrors(prev => ({...prev, linkedVpId: undefined}))
    return true
  }

  const validateLinkedVpFrom = (date: Date | undefined): boolean => {
    if (shareFromSpecificDate && !date) {
      setErrors(prev => ({...prev, linkedVpFrom: translate('create_shared_id_date_required_error')}))
      return false
    }

    setErrors(prev => ({...prev, linkedVpFrom: undefined}))
    return true
  }

  const validateLinkedVpUntil = (date: Date | undefined): boolean => {
    if (shareUntilSpecificDate && !date) {
      setErrors(prev => ({...prev, linkedVpUntil: translate('create_shared_id_date_required_error')}))
      return false
    }

    if (shareUntilSpecificDate && date && shareFromSpecificDate && linkedVpFrom && date <= linkedVpFrom) {
      setErrors(prev => ({...prev, linkedVpUntil: translate('create_shared_id_date_until_before_from_error')}))
      return false
    }

    if (shareUntilSpecificDate && date && !shareFromSpecificDate && date <= new Date()) {
      setErrors(prev => ({...prev, linkedVpUntil: translate('create_shared_id_date_past_error')}))
      return false
    }

    setErrors(prev => ({...prev, linkedVpUntil: undefined}))
    return true
  }

  const handleSubmit = async (): Promise<void> => {
    const isLinkedVpIdValid = validateLinkedVpId(linkedVpId)
    const isLinkedVpFromValid = validateLinkedVpFrom(linkedVpFrom)
    const isLinkedVpUntilValid = validateLinkedVpUntil(linkedVpUntil)

    if (!isLinkedVpIdValid || !isLinkedVpFromValid || !isLinkedVpUntilValid) {
      return
    }

    await onSubmit(
      linkedVpId,
      shareFromSpecificDate ? linkedVpFrom : undefined,
      shareUntilSpecificDate ? linkedVpUntil : undefined
    )
  }

  const handleCancel = async (): Promise<void> => {
    await onClose()
  }

  const handleOverlayClick = async (event: React.MouseEvent<HTMLDivElement>): Promise<void> => {
    if (event.target === event.currentTarget) {
      await handleCancel()
    }
  }

  if (!mounted) {
    return null
  }

  const modalContent = (
    <div className={style.overlay} onClick={handleOverlayClick}>
      <div className={style.container} onClick={(event: React.MouseEvent<HTMLDivElement>) => event.stopPropagation()}>
        <div className={style.headerContainer}>
          <div className={style.headerCaptionContainer}>
            <div className={style.titleCaption}>{translate('create_shared_id_title')}</div>
            <div className={style.subTitleCaption}>{translate('create_shared_id_subtitle')}</div>
          </div>
          <div className={style.headerCloseContainer}>
            <div className={style.closeButton} onClick={handleCancel}>
              <CrossIcon />
            </div>
          </div>
        </div>

        <div className={style.contentContainer}>
          <div className={style.formField}>
            <label className={style.fieldLabel}>{translate('create_shared_id_your_id_label')}</label>
            <input
              type="text"
              className={style.textInput}
              value={linkedVpId}
              onChange={(e) => {
                setLinkedVpId(e.target.value)
                if (errors.linkedVpId) {
                  validateLinkedVpId(e.target.value)
                }
              }}
              onBlur={(e) => validateLinkedVpId(e.target.value)}
            />
            {errors.linkedVpId && <div className={style.errorText}>{errors.linkedVpId}</div>}
            <div className={style.helperText}>
              <div>{translate('create_shared_id_requirements_title')}</div>
              <ul className={style.requirementsList}>
                <li>{translate('create_shared_id_requirement_unique')}</li>
                <li>{translate('create_shared_id_requirement_format')}</li>
                <li>{translate('create_shared_id_requirement_url')}</li>
                <li>{translate('create_shared_id_requirement_identify')}</li>
              </ul>
            </div>
          </div>

          <div className={style.switchContainer}>
            <label className={style.switchLabel}>
              <input
                type="checkbox"
                checked={shareFromSpecificDate}
                onChange={(e) => {
                  setShareFromSpecificDate(e.target.checked)
                  if (!e.target.checked) {
                    setErrors(prev => ({...prev, linkedVpFrom: undefined}))
                  } else {
                    validateLinkedVpFrom(linkedVpFrom)
                  }
                }}
                className={style.switchInput}
              />
              <span className={style.switchSlider}></span>
              <span className={style.switchText}>
                {shareFromSpecificDate
                  ? translate('create_shared_id_share_from_specific_date_label')
                  : translate('create_shared_id_share_from_now_label')
                }
              </span>
            </label>
          </div>

          {shareFromSpecificDate && (
            <div className={style.formField}>
              <label className={style.fieldLabel}>{translate('create_shared_id_sharing_from_label')}</label>
              <input
                type="datetime-local"
                className={style.textInput}
                value={linkedVpFrom ? linkedVpFrom.toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined
                  setLinkedVpFrom(newDate)
                  if (errors.linkedVpFrom) {
                    validateLinkedVpFrom(newDate)
                  }
                  // Revalidate until date if it exists
                  if (shareUntilSpecificDate && linkedVpUntil) {
                    validateLinkedVpUntil(linkedVpUntil)
                  }
                }}
                onBlur={() => validateLinkedVpFrom(linkedVpFrom)}
              />
              {errors.linkedVpFrom && <div className={style.errorText}>{errors.linkedVpFrom}</div>}
            </div>
          )}

          <div className={style.switchContainer}>
            <label className={style.switchLabel}>
              <input
                type="checkbox"
                checked={shareUntilSpecificDate}
                onChange={(e) => {
                  setShareUntilSpecificDate(e.target.checked)
                  if (!e.target.checked) {
                    setErrors(prev => ({...prev, linkedVpUntil: undefined}))
                  } else {
                    validateLinkedVpUntil(linkedVpUntil)
                  }
                }}
                className={style.switchInput}
              />
              <span className={style.switchSlider}></span>
              <span className={style.switchText}>
                {shareUntilSpecificDate
                  ? translate('create_shared_id_share_until_specific_date_label')
                  : translate('create_shared_id_share_indefinitely_label')
                }
              </span>
            </label>
          </div>

          {shareUntilSpecificDate && (
            <div className={style.formField}>
              <label className={style.fieldLabel}>{translate('create_shared_id_sharing_until_label')}</label>
              <input
                type="datetime-local"
                className={style.textInput}
                value={linkedVpUntil ? linkedVpUntil.toISOString().slice(0, 16) : ''}
                onChange={(e) => {
                  const newDate = e.target.value ? new Date(e.target.value) : undefined
                  setLinkedVpUntil(newDate)
                  if (errors.linkedVpUntil) {
                    validateLinkedVpUntil(newDate)
                  }
                }}
                onBlur={() => validateLinkedVpUntil(linkedVpUntil)}
              />
              {errors.linkedVpUntil && <div className={style.errorText}>{errors.linkedVpUntil}</div>}
            </div>
          )}

          <div className={style.buttonContainer}>
            <button className={style.cancelButton} onClick={handleCancel}>
              {translate('action_cancel_label')}
            </button>
            <PrimaryButton
              style={{minWidth: 180}}
              caption={translate('action_create_label')}
              onClick={handleSubmit}
            />
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default PublishLinkedVPModal

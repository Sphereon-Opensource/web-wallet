import React, {CSSProperties, forwardRef, HTMLInputTypeAttribute, ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import styles from './index.module.css'

type Props = {
  value: string | ReadonlyArray<string> | number
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void | Promise<void>
  required?: boolean
  placeholder?: string
  style?: CSSProperties
  type?: HTMLInputTypeAttribute
  min?: string
  max?: string
  maxLength?: number
  label?: {
    style?: CSSProperties
    className?: string
    caption?: string
  }
}

const TextInputField = forwardRef<HTMLInputElement, Props>((props: Props, ref): ReactElement => {
  const {label, onChange, onBlur, placeholder, style, type, min, max, maxLength, value, required = true} = props
  const translate = useTranslate()

  const onChangeValue = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (onChange) {
      await onChange(event)
    }
  }

  const onBlurValue = async (event: React.FocusEvent<HTMLInputElement>): Promise<void> => {
    if (onBlur) {
      await onBlur(event)
    }
  }

  return (
    <div>
      {!!label && (
        <div className={styles.labelContainer}>
          <div style={label?.style} className={`${styles.labelCaption} ${label?.className}`}>
            {label?.caption}
          </div>
          {!required && <div className={styles.optionalCaption}>{translate('text_input_field_optional_caption')}</div>}
        </div>
      )}
      <input
        ref={ref}
        className={styles.textInputField}
        style={style}
        onChange={onChangeValue}
        onBlur={onBlurValue}
        value={value}
        placeholder={placeholder}
        type={type}
        min={min}
        max={max}
        maxLength={maxLength}
      />
    </div>
  )
})

TextInputField.displayName = 'TextInputField'

export default TextInputField

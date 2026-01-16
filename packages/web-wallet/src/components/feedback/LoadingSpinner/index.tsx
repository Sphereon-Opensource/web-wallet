import React, {FC} from 'react'
import style from './index.module.css'

export type SpinnerSize = 'small' | 'medium' | 'large'

export interface LoadingSpinnerProps {
  /** Size variant of the spinner */
  size?: SpinnerSize
  /** Optional loading text to display below the spinner */
  text?: string
  /** If true, centers the spinner in a container with padding */
  centered?: boolean
  /** Additional CSS class for the spinner element */
  className?: string
  /** Additional CSS class for the container (when centered or text provided) */
  containerClassName?: string
}

/**
 * A reusable loading spinner component with configurable size and optional text.
 *
 * @example
 * // Simple inline spinner
 * <LoadingSpinner />
 *
 * @example
 * // Large centered spinner with text
 * <LoadingSpinner size="large" text="Loading..." centered />
 *
 * @example
 * // Small spinner with custom class
 * <LoadingSpinner size="small" className="my-spinner" />
 */
export const LoadingSpinner: FC<LoadingSpinnerProps> = ({size = 'medium', text, centered = false, className, containerClassName}) => {
  const sizeClass = size === 'small' ? style.spinnerSmall : size === 'large' ? style.spinnerLarge : ''
  const spinnerElement = <div className={`${style.spinner} ${sizeClass} ${className || ''}`} />

  // If no text and not centered, return just the spinner
  if (!text && !centered) {
    return spinnerElement
  }

  // Wrap in container for centering or text
  return (
    <div className={`${style.loadingContainer} ${centered ? style.centered : ''} ${containerClassName || ''}`}>
      {spinnerElement}
      {text && <span className={style.loadingText}>{text}</span>}
    </div>
  )
}

export default LoadingSpinner

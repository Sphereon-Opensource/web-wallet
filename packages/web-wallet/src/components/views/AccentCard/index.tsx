import React, {CSSProperties, ReactElement, ReactNode} from 'react'
import styles from './index.module.css'

export type AccentColor = 'success' | 'primary' | 'warning' | 'error'

type Props = {
  /** Title displayed at the top of the card */
  title?: string
  /** Main name/heading of the card */
  name?: string
  /** Accent color for the left bar */
  accentColor?: AccentColor
  /** Card content - either use children or the fields prop */
  children?: ReactNode
  /** Additional CSS styles */
  style?: CSSProperties
  /** Additional class name */
  className?: string
}

/**
 * AccentCard - A reusable card component with a colored left accent bar
 *
 * Similar to ContactCard, provides a consistent card pattern with:
 * - Colored accent bar on the left
 * - Title, name, and content area
 *
 * Usage:
 * ```tsx
 * <AccentCard title="Supplier" name="Cloud Services B.V." accentColor="success">
 *   <div>Custom content here</div>
 * </AccentCard>
 * ```
 */
const AccentCard: React.FC<Props> = ({
  title,
  name,
  accentColor = 'primary',
  children,
  style,
  className,
}): ReactElement => {
  return (
    <div className={`${styles.container} ${className ?? ''}`} style={style}>
      <div className={`${styles.accent} ${styles[accentColor]}`} />
      <div className={styles.content}>
        {title && <div className={styles.title}>{title}</div>}
        {name && <div className={styles.name}>{name}</div>}
        {children}
      </div>
    </div>
  )
}

export default AccentCard

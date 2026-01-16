import React, {FC, ReactNode, ReactElement} from 'react'
import style from './index.module.css'

/**
 * PartyCard - A card component for displaying party/organization information.
 *
 * Used in invoice views to display supplier/customer details with:
 * - Role label (Supplier, Customer, etc.)
 * - Organization name
 * - VAT number, address, and other details
 * - Optional "View Contact" link
 *
 * @example
 * <PartyCard
 *   title="Supplier"
 *   name="Acme Corp"
 *   details={
 *     <>
 *       VAT: NL123456789B01<br />
 *       123 Business St<br />
 *       Amsterdam, Netherlands
 *     </>
 *   }
 *   onViewContact={() => handleViewContact(supplierId)}
 * />
 */

export interface PartyCardProps {
  /** Role/title label (e.g., "Supplier", "Customer") */
  title: string
  /** Organization/party name */
  name?: string
  /** Additional details (VAT, address, etc.) */
  details?: ReactNode
  /** Called when "View Contact" is clicked (only shows if provided) */
  onViewContact?: () => void
  /** View contact link text */
  viewContactLabel?: string
  /** Accent color for the card (uses CSS var) */
  accentColor?: 'primary' | 'success' | 'warning' | 'error'
  /** Additional CSS class */
  className?: string
}

export const PartyCard: FC<PartyCardProps> = ({
  title,
  name,
  details,
  onViewContact,
  viewContactLabel = 'View Contact →',
  accentColor,
  className,
}): ReactElement => {
  const accentClass = accentColor ? style[`accent${accentColor.charAt(0).toUpperCase() + accentColor.slice(1)}`] : ''

  return (
    <div className={`${style.card} ${accentClass} ${className || ''}`}>
      <span className={style.title}>{title}</span>
      {name && <span className={style.name}>{name}</span>}
      {details && <div className={style.details}>{details}</div>}
      {onViewContact && (
        <button
          type="button"
          className={style.viewContactLink}
          onClick={onViewContact}
        >
          {viewContactLabel}
        </button>
      )}
    </div>
  )
}

/**
 * PartyCardGrid - A grid container for displaying multiple PartyCards.
 *
 * @example
 * <PartyCardGrid>
 *   <PartyCard title="Supplier" name="Acme Corp" />
 *   <PartyCard title="Customer" name="Buyer Inc" />
 * </PartyCardGrid>
 */

export interface PartyCardGridProps {
  /** PartyCard components */
  children: ReactNode
  /** Number of columns (default: 2) */
  columns?: 1 | 2 | 3
  /** Additional CSS class */
  className?: string
}

export const PartyCardGrid: FC<PartyCardGridProps> = ({
  children,
  columns = 2,
  className,
}) => {
  const columnsClass = columns === 1 ? style.gridCols1 : columns === 3 ? style.gridCols3 : ''

  return (
    <div className={`${style.grid} ${columnsClass} ${className || ''}`}>
      {children}
    </div>
  )
}

export default PartyCard

import React, {FC, ReactNode, ReactElement, useCallback, useEffect, useRef} from 'react'
import style from './index.module.css'

/**
 * ContextMenu - A positioned dropdown menu for row/item actions.
 *
 * Features:
 * - Fixed positioning based on trigger element
 * - Backdrop for click-away closing
 * - Menu items with icons
 * - Dividers for grouping
 * - Danger variant for destructive actions
 *
 * @example
 * <ContextMenu
 *   isOpen={isMenuOpen}
 *   position={menuPosition}
 *   onClose={() => setIsMenuOpen(false)}
 * >
 *   <ContextMenuItem icon={<InfoIcon />} onClick={handleDetails}>
 *     Details
 *   </ContextMenuItem>
 *   <ContextMenuDivider />
 *   <ContextMenuItem icon={<TrashIcon />} variant="danger" onClick={handleDelete}>
 *     Delete
 *   </ContextMenuItem>
 * </ContextMenu>
 */

export interface ContextMenuPosition {
  top: number
  left: number
}

export interface ContextMenuProps {
  /** Whether the menu is open */
  isOpen: boolean
  /** Position of the menu (fixed positioning) */
  position?: ContextMenuPosition | null
  /** Called when menu should close (backdrop click, escape key) */
  onClose: () => void
  /** Menu items */
  children: ReactNode
  /** Menu width (default: 180px) */
  width?: number
  /** Additional CSS class */
  className?: string
  /** Align menu to the right of the trigger */
  alignRight?: boolean
}

export const ContextMenu: FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  children,
  width = 180,
  className,
  alignRight = false,
}): ReactElement | null => {
  const menuRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen || !position) return null

  // Adjust position if alignRight is true
  const menuStyle: React.CSSProperties = {
    top: position.top,
    left: alignRight ? position.left - width : position.left,
    width,
  }

  return (
    <>
      <div className={style.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={menuRef}
        className={`${style.menu} ${className || ''}`}
        style={menuStyle}
        role="menu"
        aria-orientation="vertical"
      >
        {children}
      </div>
    </>
  )
}

// ============================================
// ContextMenuItem
// ============================================

export interface ContextMenuItemProps {
  /** Menu item content */
  children: ReactNode
  /** Optional icon */
  icon?: ReactNode
  /** Click handler */
  onClick?: (e: React.MouseEvent) => void
  /** Disabled state */
  disabled?: boolean
  /** Danger variant for destructive actions */
  variant?: 'default' | 'danger'
  /** Additional CSS class */
  className?: string
}

export const ContextMenuItem: FC<ContextMenuItemProps> = ({
  children,
  icon,
  onClick,
  disabled = false,
  variant = 'default',
  className,
}): ReactElement => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!disabled && onClick) {
      onClick(e)
    }
  }

  return (
    <button
      type="button"
      className={`${style.item} ${variant === 'danger' ? style.itemDanger : ''} ${disabled ? style.itemDisabled : ''} ${className || ''}`}
      onClick={handleClick}
      disabled={disabled}
      role="menuitem"
    >
      {icon && <span className={style.itemIcon}>{icon}</span>}
      {children}
    </button>
  )
}

// ============================================
// ContextMenuDivider
// ============================================

export interface ContextMenuDividerProps {
  /** Additional CSS class */
  className?: string
}

export const ContextMenuDivider: FC<ContextMenuDividerProps> = ({className}): ReactElement => {
  return <div className={`${style.divider} ${className || ''}`} role="separator" />
}

// ============================================
// MenuTriggerButton - Meatballs/kebab menu button
// ============================================

export type MenuTriggerVariant = 'meatballs' | 'kebab' | 'icon'

export interface MenuTriggerButtonProps {
  /** Click handler */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  /** Trigger variant */
  variant?: MenuTriggerVariant
  /** Whether menu is open (for aria-expanded) */
  isOpen?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Aria label */
  ariaLabel?: string
  /** Additional CSS class */
  className?: string
}

export const MenuTriggerButton: FC<MenuTriggerButtonProps> = ({
  onClick,
  variant = 'meatballs',
  isOpen = false,
  disabled = false,
  ariaLabel = 'Open menu',
  className,
}): ReactElement => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    onClick(e)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <button
      type="button"
      className={`${style.triggerButton} ${className || ''}`}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      aria-haspopup="menu"
    >
      {variant === 'meatballs' && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      )}
      {variant === 'kebab' && (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      )}
    </button>
  )
}

// ============================================
// Utility: Calculate menu position from trigger
// ============================================

export interface MenuPositionOptions {
  /** Element that triggered the menu */
  triggerElement: HTMLElement
  /** Preferred horizontal alignment */
  alignRight?: boolean
  /** Vertical offset from trigger */
  offsetY?: number
  /** Horizontal offset from trigger */
  offsetX?: number
}

export const calculateMenuPosition = (options: MenuPositionOptions): ContextMenuPosition => {
  const {triggerElement, alignRight = false, offsetY = 4, offsetX = 0} = options
  const rect = triggerElement.getBoundingClientRect()

  return {
    top: rect.bottom + offsetY,
    left: alignRight ? rect.right + offsetX : rect.left + offsetX,
  }
}

export default ContextMenu

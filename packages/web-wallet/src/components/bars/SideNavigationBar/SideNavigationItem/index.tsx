import React, {CSSProperties, FC, ReactElement, useMemo} from 'react'
import {NavLink, useLocation} from 'react-router-dom'
import clsx from 'clsx'
import {ActivityIcon, BellIcon, ContactIcon, CredentialIcon} from '@sphereon/ui-components.ssi-react'

import {MenuIcon} from '@typings'
import styles from './index.module.css'
import IssuedCredentialIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/IssuedCredential'
import IssueCredentialIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/IssueCredential'
import ContactOverviewIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/ContactOverview'
import AddContactIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/AddContact'
import IdentifierIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Identifier'
import ManagementIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Management'
import KeyIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Key'
import UXIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/UX'

type Props = {
  label: string
  icon?: MenuIcon
  isDisabled?: boolean
  href: string
  end?: boolean
  topLevel?: boolean
  style?: CSSProperties
}

const SideNavigationItem: FC<Props> = (props: Props): ReactElement => {
  const {label, icon, href, isDisabled = false, end = false, topLevel = false, style} = props
  const location = useLocation()

  // Check if this item should be active, considering query parameters
  const isActiveWithQuery = useMemo(() => {
    // Parse the href to separate path and query
    const [hrefPath, hrefQuery] = href.split('?')
    const currentPath = location.pathname
    const currentQuery = location.search.substring(1) // Remove leading '?'

    // If href has query params, we need exact match of both path and query param
    if (hrefQuery) {
      // Check if path matches
      if (currentPath !== hrefPath) return false
      // Check if the query param from href exists in current URL
      const hrefParams = new URLSearchParams(hrefQuery)
      const currentParams = new URLSearchParams(currentQuery)
      for (const [key, value] of hrefParams.entries()) {
        if (currentParams.get(key) !== value) return false
      }
      return true
    }

    // No query params in href - use default behavior (will be handled by NavLink)
    return null
  }, [href, location.pathname, location.search])

  const getIconElement = (icon: MenuIcon): ReactElement => {
    switch (icon) {
      case 'contact':
        return <ContactIcon size={16} />
      case 'notification':
        return <BellIcon size={16} />
      case 'activity':
        return <ActivityIcon size={12} />
      case 'credential':
        return <CredentialIcon size={13} />
      case 'issuedCredential':
        return <IssuedCredentialIcon size={18} />
      case 'issueCredential':
        return <IssueCredentialIcon size={18} />
      case 'contactOverview':
        return <ContactOverviewIcon size={16} />
      case 'addContact':
        return <AddContactIcon size={16} />
      case 'identifier':
        return <IdentifierIcon size={16} />
      case 'management':
        return <ManagementIcon size={20} />
      case 'key':
        return <KeyIcon size={24} />
      case 'design':
        return <UXIcon size={18} />
      case 'inbox':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-6l-2 3h-4l-2-3H2" />
            <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
          </svg>
        )
      case 'received':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18" />
            <path d="M9 21V9" />
          </svg>
        )
      case 'sent':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        )
      case 'asset':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        )
      default:
        return <div />
    }
  }
  return (
    <NavLink
      style={{...style}}
      to={href}
      end={end}
      className={({isActive}) => {
        // Use custom query-aware check if available, otherwise use NavLink's isActive
        const active = isActiveWithQuery !== null ? isActiveWithQuery : isActive
        return clsx(styles.container, {
          [styles.containerActive]: active && !isDisabled,
          [styles.containerDisabled]: isDisabled,
          [styles.containerTopLevel]: topLevel,
        })
      }}>
      {icon && <div className={styles.iconContainer}>{getIconElement(icon)}</div>}
      <span className={styles.label}>{label}</span>
    </NavLink>
  )
}

export default SideNavigationItem

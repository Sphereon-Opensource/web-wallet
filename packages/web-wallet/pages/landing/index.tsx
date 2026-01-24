import React, {FC, ReactElement, useEffect, useMemo} from 'react'
import {useNavigate, useSearchParams} from 'react-router-dom'
import {useTranslation} from 'next-i18next'
import {useSession} from 'next-auth/react'
import {RoleType} from '@sphereon/ui-components.core'
import {ActivityIcon, BellIcon, ContactIcon, CredentialIcon} from '@sphereon/ui-components.ssi-react'
import IssuedCredentialIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/IssuedCredential'
import IssueCredentialIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/IssueCredential'
import ContactOverviewIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/ContactOverview'
import IdentifierIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Identifier'
import ManagementIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Management'
import KeyIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/Key'
import UXIcon from '@sphereon/ui-components.ssi-react/dist/components/assets/icons/UX'
import {useRole} from '@/src/contexts/RoleContext'
import {MenuEntry, MenuItem, MenuGroup, MenuIcon} from '@/src/types'
import styles from './index.module.css'

// Role card icons matching the sidebar switcher
const ManIcon: FC<{color: string}> = ({color}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z"
      fill={color}
    />
  </svg>
)

const CapitolIcon: FC<{color: string}> = ({color}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L3 9V20H9V13H15V20H21V9L12 2ZM12 5.5L18 10V18H16V11H8V18H5V10L12 5.5Z" fill={color} />
  </svg>
)

const StoreIcon: FC<{color: string}> = ({color}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M20 4H4V6H20V4ZM21 14V12L20 7H4L3 12V14H4V20H14V14H18V20H20V14H21ZM12 18H6V14H12V18Z" fill={color} />
  </svg>
)

const LaptopIcon: FC<{color: string}> = ({color}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M20 18C21.1 18 21.99 17.1 21.99 16L22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V16C2 17.1 2.9 18 4 18H0V20H24V18H20ZM4 6H20V16H4V6Z"
      fill={color}
    />
  </svg>
)

// Get icon element for quick links (matching sidebar icons)
const getIconElement = (icon: MenuIcon): ReactElement => {
  switch (icon) {
    case 'contact':
      return <ContactIcon size={16} />
    case 'notification':
      return <BellIcon size={16} />
    case 'activity':
      return <ActivityIcon size={12} />
    case 'credential':
      return <CredentialIcon size={14} />
    case 'issuedCredential':
      return <IssuedCredentialIcon size={16} />
    case 'issueCredential':
      return <IssueCredentialIcon size={16} />
    case 'contactOverview':
      return <ContactOverviewIcon size={16} />
    case 'identifier':
      return <IdentifierIcon size={16} />
    case 'management':
      return <ManagementIcon size={18} />
    case 'key':
      return <KeyIcon size={20} />
    case 'design':
      return <UXIcon size={16} />
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

interface RoleCardData {
  role: RoleType
  icon: ReactElement
  iconClass: string
  cardClass: string
  descriptionKey: string
}

const roleCardConfig: RoleCardData[] = [
  {
    role: RoleType.HOLDER,
    icon: <ManIcon color="#ffffff" />,
    iconClass: styles.holderIcon,
    cardClass: styles.holderCard,
    descriptionKey: 'role_holder_description',
  },
  {
    role: RoleType.ISSUER,
    icon: <CapitolIcon color="#ffffff" />,
    iconClass: styles.issuerIcon,
    cardClass: styles.issuerCard,
    descriptionKey: 'role_issuer_description',
  },
  {
    role: RoleType.RELYING_PARTY,
    icon: <StoreIcon color="#ffffff" />,
    iconClass: styles.verifierIcon,
    cardClass: styles.verifierCard,
    descriptionKey: 'role_verifier_description',
  },
  {
    role: RoleType.ADMIN,
    icon: <LaptopIcon color="#ffffff" />,
    iconClass: styles.adminIcon,
    cardClass: styles.adminCard,
    descriptionKey: 'role_admin_description',
  },
]

const getRoleDisplayName = (role: RoleType): string => {
  switch (role) {
    case RoleType.HOLDER:
      return 'Holder'
    case RoleType.ISSUER:
      return 'Issuer'
    case RoleType.RELYING_PARTY:
      return 'Verifier'
    case RoleType.ADMIN:
      return 'Admin'
    default:
      return role
  }
}

// Extract menu items from navigation config, excluding duplicates and contacts
const extractMenuItems = (navigation: MenuEntry[]): MenuItem[] => {
  const items: MenuItem[] = []
  const seenPaths = new Set<string>()

  for (const entry of navigation) {
    if (entry.type === 'item' && !seenPaths.has(entry.path)) {
      items.push(entry)
      seenPaths.add(entry.path)
    } else if (entry.type === 'group') {
      const group = entry as MenuGroup
      // Skip contacts group as it's common to all roles
      if (group.label?.toLowerCase() === 'contacts') continue
      for (const item of group.items) {
        if (!seenPaths.has(item.path)) {
          items.push(item)
          seenPaths.add(item.path)
        }
      }
    }
  }

  return items.slice(0, 5) // Limit to 5 quick links
}

const LandingPage: FC = (): ReactElement => {
  const {t} = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {setCurrentRole, availableRoleConfigs, authorizedRoles} = useRole()
  const {data: session} = useSession()
  const userName = session?.user?.name?.split(' ')[0] ?? 'User' // Get first name only

  // Handle OID4VCI/OID4VP redirects
  useEffect(() => {
    const credentialOffer = searchParams.get('credential_offer')
    const credentialOfferUri = searchParams.get('credential_offer_uri')
    const requestUri = searchParams.get('request_uri')
    const responseType = searchParams.get('response_type')

    if (credentialOffer || credentialOfferUri) {
      navigate(`/oid4vci${window.location.search}`, {replace: true})
      return
    }

    if (requestUri || responseType) {
      navigate(`/siopv2${window.location.search}`, {replace: true})
      return
    }
  }, [searchParams, navigate])

  // Build role cards with their navigation items, filtered to only authorized roles
  const roleCards = useMemo(() => {
    return roleCardConfig
      .filter(cardData => authorizedRoles.includes(cardData.role))
      .map(cardData => {
        const roleData = availableRoleConfigs.find(r => r.role === cardData.role)
        const quickLinks = roleData ? extractMenuItems(roleData.navigation) : []
        return {...cardData, quickLinks, roleData}
      })
  }, [authorizedRoles, availableRoleConfigs])

  const handleCardClick = (role: RoleType) => {
    const roleData = availableRoleConfigs.find(r => r.role === role)
    if (roleData) {
      setCurrentRole(roleData)
      const firstLink = extractMenuItems(roleData.navigation)[0]
      navigate(firstLink?.path || '/credentials')
    }
  }

  const handleQuickLinkClick = (e: React.MouseEvent, role: RoleType, path: string) => {
    e.stopPropagation()
    const roleData = availableRoleConfigs.find(r => r.role === role)
    if (roleData) {
      setCurrentRole(roleData)
    }
    navigate(path)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('landing_page_title', {name: userName})}</h1>
        <p className={styles.subtitle}>{t('landing_page_subtitle')}</p>
      </div>
      <div className={styles.grid}>
        {roleCards.map(cardData => (
          <div key={cardData.role} className={`${styles.card} ${cardData.cardClass}`} onClick={() => handleCardClick(cardData.role)}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconWrapper} ${cardData.iconClass}`}>{cardData.icon}</div>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>{getRoleDisplayName(cardData.role)}</h2>
                <p className={styles.cardDescription}>{t(cardData.descriptionKey)}</p>
              </div>
            </div>
            {cardData.quickLinks.length > 0 && (
              <div className={styles.quickLinks}>
                {cardData.quickLinks.map(link => (
                  <button key={link.path} className={styles.quickLink} onClick={e => handleQuickLinkClick(e, cardData.role, link.path)}>
                    <span className={styles.quickLinkIcon}>{link.icon && getIconElement(link.icon)}</span>
                    <span className={styles.quickLinkLabel}>{link.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default LandingPage

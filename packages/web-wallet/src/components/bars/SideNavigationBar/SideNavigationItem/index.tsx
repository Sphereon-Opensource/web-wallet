import React, {CSSProperties, FC, ReactElement} from 'react'
import {NavLink} from 'react-router-dom'
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

type Props = {
    label: string
    icon?: MenuIcon
    isDisabled?: boolean
    href: string
    end?: boolean
    style?: CSSProperties
}

const SideNavigationItem: FC<Props> = (props: Props): ReactElement => {
    const { label, icon, href, isDisabled = false, end = false, style } = props

  const getIconElement = (icon: MenuIcon): ReactElement => {
    switch (icon) {
      case 'contact':
        return <ContactIcon size={16}/>
      case 'notification':
        return <BellIcon size={16}/>
      case 'activity':
        return <ActivityIcon size={12}/>
      case 'credential':
        return <CredentialIcon size={13}/>
      case 'issuedCredential':
        return <IssuedCredentialIcon size={18}/>
      case 'issueCredential':
        return <IssueCredentialIcon size={18}/>
      case 'contactOverview':
        return <ContactOverviewIcon size={16}/>
      case 'addContact':
        return <AddContactIcon size={16}/>
      case 'identifier':
        return <IdentifierIcon size={16}/>
      case 'management':
        return <ManagementIcon size={20}/>
      case 'key':
        return <KeyIcon size={24}/>
      default:
        return <div/>
    }
  }
    return (
      <NavLink
        style={{...style}}
        to={href}
        end={end}
        className={({ isActive }) => clsx(
          styles.container,
          {
            [styles.containerActive]: isActive && !isDisabled,
            [styles.containerDisabled]: isDisabled,
          }
        )}
      >
        {icon &&
          <div className={styles.iconContainer}>
            {getIconElement(icon)}
          </div>
        }
        <span className={styles.label}>
          {label}
        </span>
      </NavLink>
    )
}

export default SideNavigationItem

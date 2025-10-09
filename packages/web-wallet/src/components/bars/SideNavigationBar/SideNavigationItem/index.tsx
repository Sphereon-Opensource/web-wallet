import React, {CSSProperties, FC, ReactElement} from 'react'
import {NavLink} from 'react-router-dom'
import clsx from 'clsx';
import {ContactIcon} from '@sphereon/ui-components.ssi-react'

import {MenuIcon} from '@typings'
import styles from './index.module.css'

type Props = {
    label: string
    icon?: MenuIcon
    isDisabled?: boolean
    href: string
    style?: CSSProperties
}

const SideNavigationItem: FC<Props> = (props: Props): ReactElement => {
    const { label, icon, href, isDisabled = false, style } = props

    const getIconElement = (icon: MenuIcon): ReactElement => {
        switch (icon) {
            case 'contact':
                return <ContactIcon size={16}/>
            case 'notification':
                return <BellIcon size={16}/>
            case 'activity':
                return <ActivityIcon size={10}/>
            case 'credential':
                return <CredentialIcon size={13}/>
            default:
                return <div/>
        }
    }

    return (
      <NavLink
        style={{...style}}
        to={href}
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

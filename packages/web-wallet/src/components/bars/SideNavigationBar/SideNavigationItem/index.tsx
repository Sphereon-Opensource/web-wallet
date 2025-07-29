import React, {CSSProperties, FC, ReactElement} from 'react'
import {NavLink} from 'react-router-dom'
import ContactPersonIcon from '../../../assets/icons/ContactPersonIcon'
import {MenuIcon} from '@typings'
import styles from './index.module.css'

type Props = {
    label: string
    icon?: MenuIcon
    target: string
    style?: CSSProperties
}

const SideNavigationItem: FC<Props> = (props: Props): ReactElement => {
    const { label, icon, target, style } = props

    const getIconElement = (icon: MenuIcon): ReactElement => {
        switch (icon) {
            case 'contact':
                return <ContactPersonIcon/>
            default:
                return <div/>
        }
    }

    return (
      <NavLink to={target} className={styles.container}>
        {icon && getIconElement(icon)}
        <span className={styles.label}>
          {label}
        </span>
      </NavLink>
    )
}

export default SideNavigationItem

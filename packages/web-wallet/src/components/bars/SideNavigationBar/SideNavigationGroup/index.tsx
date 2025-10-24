import React, {CSSProperties, FC, ReactElement, ReactNode} from 'react'
import {menuItemFrom} from '../../SideNavigationBar'
import styles from './index.module.css'
import {MenuItem} from '@typings'

type Props = {
  label?: string
  items: Array<MenuItem>
  allMenuItems: Array<MenuItem>
  style?: CSSProperties
}

const SideNavigationGroup: FC<Props> = (props: Props): ReactElement => {
  const {label, items, allMenuItems, style} = props

  const groupFrom = (items: Array<MenuItem>): ReactNode => {
    return items.map(item => menuItemFrom(item, allMenuItems))
  }

  return (
    <div className={styles.container} style={style}>
            <span className={styles.title}>
                {label}
            </span>
      {groupFrom(items)}
    </div>
  )
}

export default SideNavigationGroup

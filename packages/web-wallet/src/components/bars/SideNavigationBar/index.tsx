import React, {CSSProperties, FC, Fragment, ReactElement, ReactNode} from 'react'
import {useTranslate} from '@refinedev/core'
import {Listbox, RoleViewItem} from '@sphereon/ui-components.ssi-react'
import SideNavigationItem from './SideNavigationItem'
import SideNavigationGroup from './SideNavigationGroup'
import {MenuEntry, MenuGroup, MenuItem, MenuSeparator, RoleData} from '@typings'
import roles from '../../../config/roleConfig.json'
import styles from './index.module.css'

type Props = {
  style?: CSSProperties
}

export const menuItemFrom = (item: MenuItem | MenuSeparator, allItems: MenuItem[]): ReactElement => {
  if (item.type === 'separator') {
    return <div className={styles.separator} />
  }

  const shouldEnd = allItems.some(otherItem =>
    otherItem !== item &&
    otherItem.path.startsWith(item.path + '/'),
  )

  return <SideNavigationItem
    label={item.label}
    icon={item.icon}
    href={item.path}
    end={shouldEnd}
  />
}

export const menuGroupFrom = (item: MenuGroup): ReactElement => {
  return <SideNavigationGroup
    label={item.label}
    items={item.items}
  />
}

const SideNavigationBar: FC<Props> = (props: Props): ReactElement => {
  const {style} = props
  const translate = useTranslate()
  // TODO SSISDK-19 replace dummy data for the Listbox
  const [role, setRole] = React.useState<RoleData>((roles as Array<RoleData>)[0])

  const onChangeRole = async (role: RoleData) => setRole(role)

  const groupMenuBlocks = (items: MenuEntry[]) => {
    const blocks: MenuEntry[][] = []
    let currentBlock: MenuEntry[] = []

    items.forEach((item): void => {
      if (item.type === 'item') {
        currentBlock.push(item)
      } else if (item.type === 'group' || item.type === 'separator') {
        if (currentBlock.length > 0) {
          blocks.push(currentBlock)
          currentBlock = []
        }
        blocks.push([item])
      }
    })

    if (currentBlock.length > 0) {
      blocks.push(currentBlock)
    }

    return blocks
  }

  const menuFrom = (items: MenuEntry[]): ReactNode => {
    const blocks = groupMenuBlocks(items)
    const allMenuItems = items.filter(item => item.type === 'item') as MenuItem[]

    return blocks.map((block, index): ReactElement => {
      const isSingleItemBlock = block.length === 1
      const blockType = isSingleItemBlock ? block[0].type : 'item'

      return (
        <Fragment key={index}>
          {blockType === 'separator' ? (
            menuItemFrom(block[0] as MenuSeparator, allMenuItems)
          ) : (
            <div className={styles.menuContainer}>
              {blockType === 'group'
                ? menuGroupFrom(block[0] as MenuGroup)
                : block.map((item, itemIndex): ReactElement => (
                  <React.Fragment key={itemIndex}>
                    {menuItemFrom(item as MenuItem, allMenuItems)}
                  </React.Fragment>
                ))}
            </div>
          )}
        </Fragment>
      )
    })
  }

  return (
    <nav className={styles.container} style={style}>
      <div className={styles.roleSwitcherContainer}>
        <Listbox<RoleData>
          // TODO SSISDK-19 replace dummy data for the Listbox
          items={roles as Array<RoleData>}
          renderItem={(role: RoleData) =>
            <RoleViewItem role={role.role} />
          }
          onChange={onChangeRole}
          menuTitle={translate('roles_selection_label')}
        />
      </div>
      {menuFrom(role.navigation)}
    </nav>
  )
}

export default SideNavigationBar

import React, {CSSProperties, FC, Fragment, ReactElement, ReactNode, useMemo} from 'react'
import {useTranslate} from '@refinedev/core'
import {Listbox, RoleIconView} from '@sphereon/ui-components.ssi-react'
import {RoleType} from '@sphereon/ui-components.core'
import SideNavigationItem from './SideNavigationItem'
import SideNavigationGroup from './SideNavigationGroup'
import {ExtendedRoleType, MenuEntry, MenuGroup, MenuItem, MenuSeparator, RoleData} from '@typings'
import {useRole} from '@/src/contexts/RoleContext'
import styles from './index.module.css'

// Custom role display names (Relying Party -> Verifier, BOOKER -> Booking)
const getRoleDisplayName = (role: ExtendedRoleType): string => {
  switch (role) {
    case ExtendedRoleType.BOOKER:
      return 'Booking'
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

// Icons for each role (matching original RoleViewItem)
const ManIcon: FC<{color: string}> = ({color}) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill={color}/>
  </svg>
)

const CapitolIcon: FC<{color: string}> = ({color}) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L3 9V20H9V13H15V20H21V9L12 2ZM12 5.5L18 10V18H16V11H8V18H5V10L12 5.5Z" fill={color}/>
  </svg>
)

const StoreIcon: FC<{color: string}> = ({color}) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M20 4H4V6H20V4ZM21 14V12L20 7H4L3 12V14H4V20H14V14H18V20H20V14H21ZM12 18H6V14H12V18Z" fill={color}/>
  </svg>
)

const LaptopIcon: FC<{color: string}> = ({color}) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M20 18C21.1 18 21.99 17.1 21.99 16L22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6V16C2 17.1 2.9 18 4 18H0V20H24V18H20ZM4 6H20V16H4V6Z" fill={color}/>
  </svg>
)

const CalendarIcon: FC<{color: string}> = ({color}) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20ZM7 11H12V16H7V11Z" fill={color}/>
  </svg>
)

// Get role icon element (similar to original RoleViewItem)
const getRoleIconElement = (role: ExtendedRoleType): ReactElement => {
  switch (role) {
    case ExtendedRoleType.BOOKER:
      return <RoleIconView icon={<CalendarIcon color="var(--color-grey-50)" />} backgroundColor="var(--color-booker)" />
    case RoleType.HOLDER:
      return <RoleIconView icon={<ManIcon color="var(--color-grey-50)" />} backgroundColor="var(--color-holder)" />
    case RoleType.ISSUER:
      return <RoleIconView icon={<CapitolIcon color="var(--color-grey-50)" />} backgroundColor="var(--color-issuer)" />
    case RoleType.RELYING_PARTY:
      return <RoleIconView icon={<StoreIcon color="var(--color-grey-50)" />} backgroundColor="var(--color-relying-party)" />
    case RoleType.ADMIN:
      return <RoleIconView icon={<LaptopIcon color="var(--color-grey-50)" />} backgroundColor="var(--color-admin)" />
    default:
      return <div />
  }
}

// Custom RoleViewItem component with custom display names (Verifier, Booking)
const CustomRoleViewItem: FC<{role: ExtendedRoleType; accountName?: string}> = ({role, accountName}) => {
  return (
    <div className={styles.roleViewItem}>
      {getRoleIconElement(role)}
      <div className={styles.roleViewItemContent}>
        {accountName && <div className={styles.roleViewItemAccount}>{accountName}</div>}
        <div className={styles.roleViewItemName}>{getRoleDisplayName(role)}</div>
      </div>
    </div>
  )
}

type Props = {
  style?: CSSProperties
}

export const menuItemFrom = (item: MenuItem | MenuSeparator, allItems: MenuItem[]): ReactElement => {
  if (item.type === 'separator') {
    return <div className={styles.separator} />
  }

  const shouldEnd = allItems.some(otherItem => otherItem !== item && otherItem.path.startsWith(item.path + '/'))

  return <SideNavigationItem key={item.path} label={item.label} icon={item.icon} href={item.path} end={shouldEnd} topLevel={item.topLevel} />
}

export const menuGroupFrom = (item: MenuGroup, allMenuItems: MenuItem[]): ReactElement => {
  return <SideNavigationGroup label={item.label} items={item.items} allMenuItems={allMenuItems} />
}
const SideNavigationBar: FC<Props> = (props: Props): ReactElement => {
  const {style} = props
  const translate = useTranslate()
  const {currentRole, setCurrentRole, availableRoleConfigs, hasRole} = useRole()
  const isAdmin = hasRole(RoleType.ADMIN)

  const onChangeRole = async (role: RoleData) => setCurrentRole(role)

  // Filter navigation items based on adminOnly flag
  const filteredNavigation = useMemo(() => {
    return currentRole.navigation
      .map((entry): MenuEntry | null => {
        if (entry.type === 'group') {
          // Filter items within the group
          const filteredItems = entry.items.filter(item => !item.adminOnly || isAdmin)
          // If no items remain after filtering, exclude the group entirely
          if (filteredItems.length === 0) {
            return null
          }
          return {...entry, items: filteredItems}
        }
        if (entry.type === 'item') {
          // Filter top-level items
          if (entry.adminOnly && !isAdmin) {
            return null
          }
        }
        return entry
      })
      .filter((entry): entry is MenuEntry => entry !== null)
  }, [currentRole.navigation, isAdmin])

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

    // Extract ALL menu items, including those nested in groups
    const allMenuItems = items.flatMap(item => {
      if (item.type === 'item') {
        return [item]
      } else if (item.type === 'group') {
        return item.items
      }
      return []
    })

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
                ? menuGroupFrom(block[0] as MenuGroup, allMenuItems)
                : block.map(
                    (item, itemIndex): ReactElement => (
                      <React.Fragment key={itemIndex}>{menuItemFrom(item as MenuItem, allMenuItems)}</React.Fragment>
                    ),
                  )}
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
          items={availableRoleConfigs}
          renderItem={(role: RoleData) => <CustomRoleViewItem role={role.role} accountName={role.accountName} />}
          onChange={onChangeRole}
          menuTitle={translate('roles_selection_label')}
        />
      </div>
      {menuFrom(filteredNavigation)}
    </nav>
  )
}

export default SideNavigationBar

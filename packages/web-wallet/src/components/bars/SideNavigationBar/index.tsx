import React, {CSSProperties, FC, Fragment, ReactElement, ReactNode} from 'react'
import {useTranslate} from '@refinedev/core'
import {Listbox, RoleViewItem} from '@sphereon/ui-components.ssi-react'
import SideNavigationItem from './SideNavigationItem'
import SideNavigationGroup from './SideNavigationGroup'
import {MenuEntry, MenuGroup, MenuItem, RoleData} from '@typings'
import roles from '../../../config/roleConfig.json'
import styles from './index.module.css'

type Props = {
    style?: CSSProperties
}

export const menuItemFrom = (item: MenuItem): ReactElement => {
    return <SideNavigationItem
        label={item.label}
        icon={item.icon}
        href={item.path}
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
            } else if (item.type === 'group') {
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

        return blocks.map((block, index): ReactElement => {
            const isGroupBlock = block.length === 1 && block[0].type === 'group'

            return (
                <Fragment key={index}>
                    <div className={styles.menuContainer}>
                        {isGroupBlock
                            ? menuGroupFrom(block[0] as MenuGroup)
                            : block.map((item, index): ReactElement => (
                                <React.Fragment key={index}>
                                    {menuItemFrom(item as MenuItem)}
                                </React.Fragment>
                            ))}
                    </div>
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
                        <RoleViewItem
                            accountName={role.accountName}
                            role={role.role}
                        />
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

import {RoleType} from '@sphereon/ui-components.core'
import {MenuEntry} from '@/src/types'

export type RoleData = {accountName?: string; role: RoleType; isDisabled?: boolean; navigation: Array<MenuEntry>}

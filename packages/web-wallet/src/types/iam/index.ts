import {RoleType} from '@sphereon/ui-components.core'
import {MenuEntry} from '@/src/types'

// Extended role type that includes BOOKER in addition to the standard RoleTypes
export const ExtendedRoleType = {
  ...RoleType,
  BOOKER: 'BOOKER' as const,
} as const

export type ExtendedRoleType = (typeof ExtendedRoleType)[keyof typeof ExtendedRoleType]

// RoleData uses ExtendedRoleType to support both standard and extended roles
export type RoleData = {accountName?: string; role: ExtendedRoleType; isDisabled?: boolean; navigation: Array<MenuEntry>}

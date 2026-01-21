import {RoleData} from '@typings'
import {RoleType} from '@sphereon/ui-components.core'

export const roleConfig: Array<RoleData> = [
  {
    role: RoleType.HOLDER,
    navigation: [
      /*      {
        type: "item",
        label: "Notifications",
        icon: "notification",
        path: "/notifications"
      },
      {
        type: "item",
        label: "Activities",
        icon: "activity",
        path: "/activities"
      },*/
      {
        type: 'separator',
      },
      {
        type: 'item',
        label: 'Inbox',
        icon: 'inbox',
        path: '/inbox',
        topLevel: true,
      },
      {
        type: 'group',
        label: 'Document store',
        items: [
          {
            type: 'item',
            label: 'Credentials',
            icon: 'credential',
            path: '/credentials',
          },
          {
            type: 'item',
            label: 'Assets',
            icon: 'asset',
            path: '/assets',
          },
        ],
      },
      {
        type: 'group',
        label: 'eInvoices',
        items: [
          {
            type: 'item',
            label: 'Received',
            icon: 'received',
            path: '/einvoice?tab=received',
          },
          {
            type: 'item',
            label: 'Sent',
            icon: 'sent',
            path: '/einvoice?tab=sent',
          },
        ],
      },
      {
        type: 'group',
        label: 'Contacts',
        items: [
          {
            type: 'item',
            label: 'Overview',
            icon: 'contactOverview',
            path: '/contacts',
          } /*,
          {
            type: "item",
            label: "Add new contact",
            icon: "addContact",
            path: "/contacts/add"
          }*/,
        ],
      },
    ],
  },
  {
    role: RoleType.ISSUER,
    navigation: [
      {
        type: 'separator',
      },
      {
        type: 'group',
        label: 'Document store',
        items: [
          {
            type: 'item',
            label: 'Issued credentials',
            icon: 'issuedCredential',
            path: '/credentials',
          },
        ],
      },
      {
        type: 'group',
        label: 'Credential issuance',
        items: [
          {
            type: 'item',
            label: 'Issue new credential',
            icon: 'issueCredential',
            path: '/credentials/create',
          },
        ],
      },
      {
        type: 'group',
        label: 'Credential design',
        items: [
          {
            type: 'item',
            label: 'Design',
            icon: 'design',
            path: '/credentials/designs',
          },
        ],
      },
      {
        type: 'group',
        label: 'Contacts',
        items: [
          {
            type: 'item',
            label: 'Overview',
            icon: 'contactOverview',
            path: '/contacts',
          },
        ],
      },
    ],
  },
  {
    role: RoleType.RELYING_PARTY,
    navigation: [
      {
        type: 'separator',
      },
      {
        type: 'group',
        label: 'Document store',
        items: [
          {
            type: 'item',
            label: 'Received credentials',
            icon: 'credential',
            path: '/credentials',
          },
        ],
      },
      {
        type: 'group',
        label: 'Management',
        items: [
          {
            type: 'item',
            label: 'Query definitions',
            icon: 'management',
            path: '/query-management',
          },
        ],
      },
      {
        type: 'group',
        label: 'Contacts',
        items: [
          {
            type: 'item',
            label: 'Overview',
            icon: 'contactOverview',
            path: '/contacts',
          },
        ],
      },
    ],
  },
  {
    role: RoleType.ADMIN,
    navigation: [
      {
        type: 'separator',
      },
      {
        type: 'group',
        label: 'Identifier management',
        items: [
          {
            type: 'item',
            label: 'Identifiers',
            icon: 'identifier',
            path: '/key-management/identifiers',
          },
          {
            type: 'item',
            label: 'Keys',
            icon: 'key',
            path: '/key-management/keys',
          },
        ],
      },
      {
        type: 'group',
        label: 'Contacts',
        items: [
          {
            type: 'item',
            label: 'Overview',
            icon: 'contactOverview',
            path: '/contacts',
          },
        ],
      },
    ],
  },
] as const

export default roleConfig

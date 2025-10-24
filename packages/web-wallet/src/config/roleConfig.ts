import {RoleData} from '@typings'
import {RoleType} from '@sphereon/ui-components.core'

export const roleConfig:Array<RoleData> = [
  {
    role: RoleType.ISSUER,
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
            }, */
      {
        type: "separator"
      },
      {
        type: "group",
        label: "Document store",
        items: [
          {
            type: "item",
            label: "Issued credentials",
            icon: "issuedCredential",
            path: "/credentials" // FIXME /credentials/issued
          }
        ]
      },
      {
        type: "group",
        label: "Credential issuance",
        items: [
          {
            type: "item",
            label: "Issue new credential",
            icon: "issueCredential",
            path: "/credentials/create"
          }
        ]
      },
      {
        type: "group",
        label: "Contacts",
        items: [
          {
            type: "item",
            label: "Overview",
            icon: "contactOverview",
            path: "/contacts"
          }/*,
          {
            type: "item",
            label: "Add new contact",
            icon: "addContact",
            path: "/contacts/add"
          }*/
        ]
      }
    ]
  },
  {
    role: RoleType.ADMIN,
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
            }, */
      {
        type: "separator"
      },
      {
        type: "group",
        label: "Identifier management",
        items: [
          {
            type: "item",
            label: "Identifiers",
            icon: "identifier",
            path: "/key-management/identifiers"
          },
          {
            type: "item",
            label: "Keys",
            icon: "key",
            path: "/key-management/keys"
          }
        ]
      },
      {
        type: "group",
        label: "Relying parties",
        items: [
          {
            type: "item",
            label: "Management",
            icon: "management",
            path: "/query-management"
          }
        ]
      },
      {
        type: "group",
        label: "Contacts",
        items: [
          {
            type: "item",
            label: "Overview",
            icon: "contactOverview",
            path: "/contacts"
          }/*,
          {
            type: "item",
            label: "Add new contact",
            icon: "addContact",
            path: "/contacts/add"
          }*/
        ]
      }
    ]
  },
  {
    role: RoleType.RELYING_PARTY,
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
        type: "separator"
      },
      {
        type: "group",
        label: "Document store",
        items: [
          {
            type: "item",
            label: "Received credentials",
            icon: "credential",
            path: "/credentials"
          }
        ]
      },
      {
        type: "group",
        label: "Contacts",
        items: [
          {
            type: "item",
            label: "Overview",
            icon: "contactOverview",
            path: "/contacts"
          }/*,
          {
            type: "item",
            label: "Add new contact",
            icon: "addContact",
            path: "/contacts/add"
          }*/
        ]
      }
    ]
  },
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
        type: "separator"
      },
      {
        type: "group",
        label: "Document store",
        items: [
          {
            type: "item",
            label: "Credentials",
            icon: "credential",
            path: "/credentials"
          }
        ]
      },
      {
        type: "group",
        label: "Contacts",
        items: [
          {
            type: "item",
            label: "Overview",
            icon: "contactOverview",
            path: "/contacts"
          }/*,
          {
            type: "item",
            label: "Add new contact",
            icon: "addContact",
            path: "/contacts/add"
          }*/
        ]
      }
    ]
  }
] as const

export default roleConfig

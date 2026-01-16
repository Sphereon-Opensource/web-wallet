/**
 * OpenAPI schema for inbox plugin methods.
 */

export const inboxPluginSchema = {
  components: {
    schemas: {},
    methods: {
      inboxCreate: {
        description: 'Create a new inbox',
        arguments: { $ref: '#/components/schemas/InboxCreateArgs' },
        returnType: { $ref: '#/components/schemas/Inbox' },
      },
      inboxGet: {
        description: 'Get inbox by name',
        arguments: { $ref: '#/components/schemas/InboxGetArgs' },
        returnType: { $ref: '#/components/schemas/Inbox' },
      },
      inboxGetAll: {
        description: 'List all inboxes',
        arguments: {},
        returnType: { type: 'array', items: { $ref: '#/components/schemas/Inbox' } },
      },
      inboxDelete: {
        description: 'Delete inbox by name',
        arguments: { $ref: '#/components/schemas/InboxDeleteArgs' },
        returnType: { type: 'boolean' },
      },
      inboxFolderCreate: {
        description: 'Create folder in inbox',
        arguments: { $ref: '#/components/schemas/InboxFolderCreateArgs' },
        returnType: { $ref: '#/components/schemas/InboxFolder' },
      },
      inboxFolderGet: {
        description: 'Get folder from inbox',
        arguments: { $ref: '#/components/schemas/InboxFolderGetArgs' },
        returnType: { $ref: '#/components/schemas/InboxFolder' },
      },
      inboxFolderGetByInbox: {
        description: 'List folders in inbox',
        arguments: { $ref: '#/components/schemas/InboxFolderGetByInboxArgs' },
        returnType: { type: 'array', items: { $ref: '#/components/schemas/InboxFolder' } },
      },
      inboxFolderDelete: {
        description: 'Delete folder from inbox',
        arguments: { $ref: '#/components/schemas/InboxFolderDeleteArgs' },
        returnType: { type: 'boolean' },
      },
      inboxAllowedSenderAdd: {
        description: 'Add sender to inbox allowlist',
        arguments: { $ref: '#/components/schemas/InboxAllowedSenderAddArgs' },
        returnType: { $ref: '#/components/schemas/InboxAllowedSender' },
      },
      inboxAllowedSenderRemove: {
        description: 'Remove sender from inbox allowlist',
        arguments: { $ref: '#/components/schemas/InboxAllowedSenderRemoveArgs' },
        returnType: { type: 'boolean' },
      },
      inboxAllowedSenderList: {
        description: 'List allowed senders for inbox',
        arguments: { $ref: '#/components/schemas/InboxAllowedSenderListArgs' },
        returnType: { type: 'array', items: { $ref: '#/components/schemas/InboxAllowedSender' } },
      },
      inboxIsSenderAllowed: {
        description: 'Check if sender is allowed for inbox',
        arguments: { $ref: '#/components/schemas/InboxIsSenderAllowedArgs' },
        returnType: { type: 'boolean' },
      },
      inboxCredentialLink: {
        description: 'Link credential to inbox folder',
        arguments: { $ref: '#/components/schemas/InboxCredentialLinkArgs' },
        returnType: { $ref: '#/components/schemas/InboxCredential' },
      },
      inboxCredentialList: {
        description: 'List credentials in inbox',
        arguments: { $ref: '#/components/schemas/InboxCredentialListArgs' },
        returnType: { type: 'array', items: { $ref: '#/components/schemas/InboxCredential' } },
      },
      inboxCredentialDelete: {
        description: 'Delete inbox credential record by ID',
        arguments: { $ref: '#/components/schemas/InboxCredentialDeleteArgs' },
        returnType: { type: 'boolean' },
      },
      inboxCredentialGetByCorrelationId: {
        description: 'Get inbox credential by correlation ID',
        arguments: { $ref: '#/components/schemas/InboxCredentialGetByCorrelationIdArgs' },
        returnType: { $ref: '#/components/schemas/InboxCredential' },
      },
      inboxCredentialUpdateParsedData: {
        description: 'Update parsed evidence data for inbox credential',
        arguments: { $ref: '#/components/schemas/InboxCredentialUpdateParsedDataArgs' },
        returnType: { $ref: '#/components/schemas/InboxCredential' },
      },
      inboxSendToRecipient: {
        description: 'Send credential to recipient inbox via OID4VP',
        arguments: { $ref: '#/components/schemas/InboxSendToRecipientArgs' },
        returnType: { $ref: '#/components/schemas/InboxSendToRecipientResult' },
      },
    },
  },
}

/**
 * OpenAPI schema for asset plugin methods.
 */

export const assetPluginSchema = {
  components: {
    schemas: {},
    methods: {
      assetStore: {
        description: 'Store a new asset',
        arguments: { $ref: '#/components/schemas/AssetStoreArgs' },
        returnType: { $ref: '#/components/schemas/AssetStoreResult' },
      },
      assetGetById: {
        description: 'Get asset by ID',
        arguments: { $ref: '#/components/schemas/AssetGetByIdArgs' },
        returnType: { $ref: '#/components/schemas/Asset' },
      },
      assetGetByDigest: {
        description: 'Get asset by multibase digest',
        arguments: { $ref: '#/components/schemas/AssetGetByDigestArgs' },
        returnType: { $ref: '#/components/schemas/Asset' },
      },
      assetList: {
        description: 'List assets',
        arguments: { $ref: '#/components/schemas/AssetListArgs' },
        returnType: { type: 'array', items: { $ref: '#/components/schemas/Asset' } },
      },
      assetCount: {
        description: 'Count assets',
        arguments: { $ref: '#/components/schemas/AssetListArgs' },
        returnType: { type: 'number' },
      },
      assetUpdate: {
        description: 'Update asset metadata',
        arguments: { $ref: '#/components/schemas/AssetUpdateArgs' },
        returnType: { $ref: '#/components/schemas/Asset' },
      },
      assetDelete: {
        description: 'Soft-delete asset (or hard-delete if hardDelete=true)',
        arguments: { $ref: '#/components/schemas/AssetDeleteArgs' },
        returnType: { type: 'boolean' },
      },
      assetRestore: {
        description: 'Restore a soft-deleted asset',
        arguments: { $ref: '#/components/schemas/AssetRestoreArgs' },
        returnType: { $ref: '#/components/schemas/Asset' },
      },
      assetPublish: {
        description: 'Make asset publicly available',
        arguments: { $ref: '#/components/schemas/AssetPublishArgs' },
        returnType: { $ref: '#/components/schemas/Asset' },
      },
      assetUnpublish: {
        description: 'Make asset private',
        arguments: { $ref: '#/components/schemas/AssetUnpublishArgs' },
        returnType: { $ref: '#/components/schemas/Asset' },
      },
      assetLinkCredential: {
        description: 'Link asset to credential',
        arguments: { $ref: '#/components/schemas/AssetLinkCredentialArgs' },
        returnType: { $ref: '#/components/schemas/Asset' },
      },
      assetCheckAvailability: {
        description: 'Check if asset is publicly available',
        arguments: { $ref: '#/components/schemas/AssetCheckAvailabilityArgs' },
        returnType: { $ref: '#/components/schemas/AssetAvailability' },
      },
      assetGetFile: {
        description: 'Get asset file for serving (checks availability)',
        arguments: { $ref: '#/components/schemas/AssetGetFileArgs' },
        returnType: { $ref: '#/components/schemas/AssetGetFileResult' },
      },
    },
  },
}

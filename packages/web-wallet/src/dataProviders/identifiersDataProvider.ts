import {
  BaseRecord,
  CreateManyParams,
  CreateManyResponse,
  CreateParams,
  CreateResponse,
  DataProvider,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetOneParams,
  GetOneResponse,
  UpdateParams,
  UpdateResponse,
} from '@refinedev/core'
import {DID_PREFIX} from '@sphereon/ssi-sdk-ext.did-utils'
import agent, {agentContext} from '@agent'
import {IdentifierKey, IdentifierServiceEndpoint, KeyManagementIdentifier, KeyManagementSystem} from '@typings'
import {IIdentifier} from '@veramo/core'
import {generateEbsiMethodSpecificId} from '@sphereon/ssi-sdk.ebsi-support/dist/did/functions'
import {EbsiAccessTokenOpts} from '@sphereon/ssi-sdk.ebsi-support/dist/did'
import {EbsiEnvironment} from '@sphereon/ssi-sdk.ebsi-support'
import {CredentialRole} from '@sphereon/ssi-sdk.data-store'

// TODO CWALL-244 further implement

export type CreateVariables = {
  kms?: string
  alias?: string
  method: string
  codecName?: string
  keys?: Array<IdentifierKey>
  services?: Array<IdentifierServiceEndpoint>
  identifier?: KeyManagementIdentifier
}

export const identifiersDataProvider = (): DataProvider => ({
  getList: async <TData extends BaseRecord = BaseRecord>({resource, pagination, filters}: GetListParams): Promise<GetListResponse<TData>> => {
    const identities: IIdentifier[] = await agent.didManagerFind()
    const data: TData[] = identities.map(identity => ({...(identity as any)}))
    return {
      data,
      total: data.length,
    }
  },
  getOne: async <TData extends BaseRecord = BaseRecord>({resource, id}: GetOneParams): Promise<GetOneResponse<TData>> => {
    // TODO CWALL-244 implement
    return {
      data: {} as TData,
    }
  },

  // @ts-ignore
  create: async <TData extends BaseRecord & IIdentifier, TVars extends CreateVariables>({
    resource,
    variables,
    meta,
  }: CreateParams<TVars>): Promise<CreateResponse<TData>> => {
    const {kms = KeyManagementSystem.LOCAL, keys = [], method, identifier: kmIdentifier} = variables
    const clientId = process?.env?.NEXT_PUBLIC_CLIENT_ID ?? `${window.location.protocol}//${window.location.hostname}`
    const network = kmIdentifier?.network
    const ebsi = kmIdentifier?.ebsi
    let alias = variables.alias

    const options: Record<string, any> = {
      ...(keys.length === 1 && {type: keys[0].type}),
      ...(variables.codecName && {codecName: variables.codecName}),
      ...(variables.services && {services: variables?.services}),
    }

    let ebsiAccessTokenOpts: EbsiAccessTokenOpts | undefined
    let ebsiLedgerOperation = ebsi?.executeLedgerOperation ?? ebsi?.tao?.url === 'https://api-conformance.ebsi.eu/conformance/v3/issuer-mock'
    if (method === 'web') {
      if (!variables?.identifier?.web?.hostName) {
        return Promise.reject(Error(`Expected web options to be set when creating a DID:web`))
      }
      let path = variables.identifier.web.path
      options['hostName'] = variables.identifier.web.hostName
      options['path'] = path
      alias = variables.identifier.web.hostName.replace('http://', '').replace('https://', '')
      if (path && !path.endsWith('./well-known') && !path.endsWith('./well-known/')) {
        if (!path.startsWith('/')) {
          path = `/${path}`
        }
        if (path.endsWith('/did.json')) {
          path = path.substring(0, path.length - 10)
        }
        const suffix = path.replace(/\//g, ':').replace(/%2F/g, ':')
        alias += suffix
        console.log(`DID Web: ${alias}, path: ${path}`)
      }
      options['keys'] = keys.map(idKey => {
        return {
          key: {
            type: idKey.type,
            meta: {purposes: idKey.purposes},
          },
          type: idKey.type,
        }
      })
    } else if (method === 'ebsi') {
      const ebsiKeys = keys.filter(key => key.readonly)
      const methodSpecificId = generateEbsiMethodSpecificId()
      options['methodSpecificId'] = methodSpecificId
      const jwksUri = `${clientId}/.well-known/jwks/dids/did:ebsi:${methodSpecificId}`
      const secp2561k1Key = ebsiKeys.find(key => key.type === 'Secp256k1')!
      options['secp256k1Key'] = {
        type: secp2561k1Key.type,
        purposes: secp2561k1Key.purposes,
        kid: secp2561k1Key.alias,
        kms,
      }
      const secp2561r1Key = ebsiKeys.find(key => key.type === 'Secp256r1')!
      options['secp256r1Key'] = {
        type: secp2561r1Key.type,
        purposes: secp2561r1Key.purposes,
        kid: secp2561r1Key.alias,
        kms,
      }
      const additionalKeys = keys.filter(key => !key.readonly && key !== secp2561r1Key && key !== secp2561k1Key)
      if (additionalKeys.length > 0) {
        options['keys'] = additionalKeys.map(key => {
          return {
            type: key.type,
            kid: key.alias ?? '',
            purposes: key.purposes,
            kms,
          }
        })
      }

      // We can only do this for the mock for now
      options['executeLedgerOperation'] = false
      ebsiAccessTokenOpts = {
        redirectUri: jwksUri,
        clientId,
        credentialIssuer: ebsi?.tao?.url!,
        jwksUri,
        environment: network as EbsiEnvironment, //FIXME this is casting a possible undefined where environment is mandatory
        attestationToOnboardCredentialRole: CredentialRole.HOLDER,
      }
    }

    const identifier = await agent.didManagerCreate({
      kms,
      alias,
      provider: `${DID_PREFIX}${method}`,
      options,
    })

    if (method === 'ebsi' && ebsiLedgerOperation && ebsiAccessTokenOpts) {
      console.log(`EBSI Ledger operation`)

      await agent.ebsiCreateDidOnLedger(
        {
          identifier,
          accessTokenOpts: ebsiAccessTokenOpts,
        },
        // @ts-ignore
        agentContext,
      )
    }

    return {
      // FIXME CWALL-244 there should be a better way for this but i could not find any yet without refine.dev not complaining
      data: {...identifier, id: identifier.did} as TData,
    }
  },
  createMany: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    variables,
    meta,
  }: CreateManyParams<TVariables>): Promise<CreateManyResponse<TData>> => {
    // TODO CWALL-244 implement
    return {data: []}
  },
  update: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
    variables,
  }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> => {
    // TODO CWALL-244 implement
    return {
      data: {} as TData,
    }
  },
  deleteOne: async <TData extends BaseRecord = BaseRecord, TVariables = {}>({
    resource,
    id,
  }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> => {
    // TODO CWALL-244 implement
    return {
      data: {} as TData,
    }
  },
  getApiUrl: (): string => {
    // TODO CWALL-244 implement
    throw Error('Not implemented')
  },
})

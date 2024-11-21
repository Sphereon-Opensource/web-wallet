import { IS_OID4VCI_ENABLED } from '../environment'
import { OID4VCIIssuer } from '@sphereon/ssi-sdk.oid4vci-issuer'
import { Resolvable } from 'did-resolver'
import { IIssuerInstanceOptions, IIssuerOptions, IIssuerOptsPersistArgs, OID4VCIStore } from '@sphereon/ssi-sdk.oid4vci-issuer-store'
import { IIssuerOptsImportArgs } from '@sphereon/ssi-sdk.oid4vci-issuer-store/src/types/IOID4VCIStore'
import { createDidResolver } from './did'
import { oid4vciInstanceOpts, oid4vciMetadataOpts } from '../environment-deps'
import {
  ensureManagedIdentifierResult,
  legacyKeyRefsToIdentifierOpts,
  ManagedIdentifierOptsOrResult,
} from '@sphereon/ssi-sdk-ext.identifier-resolution'
import { agentContext } from '@sphereon/ssi-sdk.core'
import agent from '../agent'
import { IIdentifier } from '@veramo/core'

export function toImportIssuerOptions(args?: { oid4vciInstanceOpts: IIssuerOptsImportArgs[] }): IIssuerOptsImportArgs[] {
  return args?.oid4vciInstanceOpts ?? oid4vciInstanceOpts.asArray
}

export async function getDefaultOID4VCIIssuerOptions(args?: { idOpts?: ManagedIdentifierOptsOrResult; resolver?: Resolvable }) {
  if (!IS_OID4VCI_ENABLED) {
    return
  }
  const { idOpts, resolver } = args ?? {}
  if (!idOpts) {
    return
  }
  const identifier = await ensureManagedIdentifierResult(idOpts, agentContext(agent))

  return {
    userPinRequired: process.env.OID4VCI_DEFAULTS_USER_PIN_REQUIRED?.toLowerCase() !== 'false',
    didOpts: {
      resolveOpts: {
        resolver: args?.resolver ?? createDidResolver(),
      },
      identifier,
    },
  }
}

export async function addDefaultsToOpts(issuerOpts: IIssuerOptions) {
  const defaultOpts = await getDefaultOID4VCIIssuerOptions({ resolver: issuerOpts?.didOpts?.resolveOpts?.resolver })
  let identifierOpts = issuerOpts?.didOpts
    ? legacyKeyRefsToIdentifierOpts({
        didOpts: issuerOpts.didOpts,
        idOpts: issuerOpts.idOpts,
        // @ts-ignore
        keyRef: issuerOpts.didOpts.kid ?? issuerOpts.didOpts.keyRef ?? issuerOpts.didOpts.kmsKeyRef,
      })
    : defaultOpts?.didOpts.identifier
  let resolveOpts = issuerOpts?.didOpts?.resolveOpts ?? defaultOpts?.didOpts.resolveOpts
  if (!issuerOpts) {
    issuerOpts = {
      idOpts: identifierOpts,
      didOpts: {
        resolveOpts,
        idOpts: {
          identifier: identifierOpts?.identifier as IIdentifier,
        },
      },
    }
  }
  if (!issuerOpts.didOpts?.resolveOpts) {
    issuerOpts.didOpts!.resolveOpts = resolveOpts
  }
  return issuerOpts
}

export async function issuerPersistToInstanceOpts(opt: IIssuerOptsPersistArgs): Promise<IIssuerInstanceOptions> {
  const issuerOpts = await addDefaultsToOpts(opt.issuerOpts)
  return {
    credentialIssuer: opt.correlationId,
    issuerOpts,
    storeId: opt.storeId,
    storeNamespace: opt.namespace,
  }
}

export async function createOID4VCIStore() {
  if (!IS_OID4VCI_ENABLED) {
    return
  }
  const importIssuerOpts = toImportIssuerOptions()
  return new OID4VCIStore({
    importIssuerOpts,
    importMetadatas: oid4vciMetadataOpts.asArray,
    // instanceOpts: await Promise.all(importIssuerOpts.map(async opt => issuerPersistToInstanceOpts(opt)))
  })
}

export async function createOID4VCIIssuer(opts?: { resolver?: Resolvable }) {
  if (!IS_OID4VCI_ENABLED) {
    return
  }
  return new OID4VCIIssuer({
    returnSessions: true,
    resolveOpts: {
      resolver: opts?.resolver ?? createDidResolver(),
    },
  })
}

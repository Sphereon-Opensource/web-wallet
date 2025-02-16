import { IPEXInstanceOptions, IRPDefaultOpts, SIOPv2RP } from '@sphereon/ssi-sdk.siopv2-oid4vp-rp-auth'
import { IS_OID4VP_ENABLED } from '../environment-vars'

import { CheckLinkedDomain } from '@sphereon/did-auth-siop-adapter'
import { SupportedVersion } from '@sphereon/did-auth-siop'
import { Resolvable } from 'did-resolver'
import { OID4VPInstanceOpts } from '../types'
import { createDidResolver, getDefaultDID, getDefaultKeyRef, getIdentifier } from './did'
import { oid4vpInstanceOpts } from '../environment-vars-with-deps'
import { ManagedIdentifierDidOpts, ManagedIdentifierX5cOpts } from '@sphereon/ssi-sdk-ext.identifier-resolution'

function toPexInstanceOptions(
  oid4vpInstanceOpts: OID4VPInstanceOpts[],
  opts?: {
    resolver: Resolvable
  },
): IPEXInstanceOptions[] {
  const result: IPEXInstanceOptions[] = []
  oid4vpInstanceOpts.map((opt) => {
    if (opt.rpOpts && !opt.rpOpts.identifierOpts.resolveOpts) {
      if (!opt.rpOpts.identifierOpts) {
        // @ts-ignore
        opt.rpOpts.identifierOpts = { resolveOpts: { resolver: opts?.resolver ?? createDidResolver() } }
      }
      opt.rpOpts.identifierOpts.resolveOpts = { ...opt.rpOpts.identifierOpts.resolveOpts }
      if (!opt.rpOpts.identifierOpts.resolveOpts.resolver) {
        opt.rpOpts.identifierOpts.resolveOpts.resolver = opts?.resolver ?? createDidResolver()
      }
      const rpOpts = opt.rpOpts
      // we handle rpOpts separately, because it contains a resolver function of which the prototype would get lost
      result.push({ ...opt, rpOpts })
    }
  })
  return result
}

export async function getDefaultOID4VPRPOptions(args?: { did?: string; x5c?: string[]; resolver?: Resolvable }): Promise<IRPDefaultOpts | undefined> {
  if (!IS_OID4VP_ENABLED) {
    return undefined
  }
  let idOpts: ManagedIdentifierX5cOpts | ManagedIdentifierDidOpts
  let resolver: Resolvable | undefined
  if (args?.x5c) {
    idOpts = {
      method: 'x5c',
      identifier: args.x5c,
    } satisfies ManagedIdentifierX5cOpts
  } else if (args?.did) {
    const did = args?.did ?? (await getDefaultDID())
    if (!did) {
      return undefined
    }
    const identifier = await getIdentifier(did)
    if (!identifier) {
      return undefined
    }
    resolver = args?.resolver ?? createDidResolver()
    idOpts = {
      method: 'did',
      identifier,
      kmsKeyRef: await getDefaultKeyRef({ did }),
    } satisfies ManagedIdentifierDidOpts
  }
  return {
    supportedVersions: [SupportedVersion.SIOPv2_D12_OID4VP_D18, SupportedVersion.JWT_VC_PRESENTATION_PROFILE_v1],
    identifierOpts: {
      idOpts: idOpts!,
      ...(resolver && {
        resolveOpts: {
          resolver,
        },
      }),
      checkLinkedDomains: CheckLinkedDomain.IF_PRESENT,
    },
  }
}

export async function createOID4VPRP(opts: { resolver: Resolvable }): Promise<SIOPv2RP> {
  return new SIOPv2RP({
    instanceOpts: toPexInstanceOptions(oid4vpInstanceOpts.asArray, opts),
  })
}

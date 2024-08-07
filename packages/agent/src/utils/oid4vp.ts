import { IRPDefaultOpts, SIOPv2RP } from '@sphereon/ssi-sdk.siopv2-oid4vp-rp-auth'
import { IPEXInstanceOptions } from '@sphereon/ssi-sdk.siopv2-oid4vp-rp-auth'
import { IS_OID4VP_ENABLED } from '../environment'
import { CheckLinkedDomain, SupportedVersion } from '@sphereon/did-auth-siop'
import { Resolvable } from 'did-resolver'
import { OID4VPInstanceOpts } from '../types'
import { createDidResolver, getDefaultDID, getDefaultKeyRef, getIdentifier } from './did'
import {oid4vpInstanceOpts} from "../environment-deps";

function toPexInstanceOptions(
  oid4vpInstanceOpts: OID4VPInstanceOpts[],
  opts?: {
    resolver: Resolvable
  },
): IPEXInstanceOptions[] {
  const result: IPEXInstanceOptions[] = []
  oid4vpInstanceOpts.map((opt) => {
    if (opt.rpOpts && !opt.rpOpts.didOpts?.resolveOpts) {
      if (!opt.rpOpts.didOpts) {
        // @ts-ignore
        opt.rpOpts.didOpts = { resolveOpts: { resolver: opts?.resolver ?? createDidResolver() } }
      }
      opt.rpOpts.didOpts.resolveOpts = { ...opt.rpOpts.didOpts.resolveOpts }
      if (!opt.rpOpts.didOpts.resolveOpts.resolver) {
        opt.rpOpts.didOpts.resolveOpts.resolver = opts?.resolver ?? createDidResolver()
      }
      const rpOpts = opt.rpOpts
      // we handle rpOpts separately, because it contains a resolver function of which the prototype would get lost
      result.push({ ...opt, rpOpts })
    }
  })
  return result
}

export async function getDefaultOID4VPRPOptions(args?: { did?: string; resolver?: Resolvable }): Promise<IRPDefaultOpts | undefined> {
  if (!IS_OID4VP_ENABLED) {
    return
  }
  const did = args?.did ?? (await getDefaultDID())
  if (!did) {
    return
  }
  const identifier = await getIdentifier(did)
  if (!identifier) {
    return
  }
  const resolver = args?.resolver ?? createDidResolver()
  return {
    supportedVersions: [SupportedVersion.SIOPv2_D12_OID4VP_D18, SupportedVersion.JWT_VC_PRESENTATION_PROFILE_v1],
    didOpts: {
      resolveOpts: {
        resolver,
      },
      checkLinkedDomains: CheckLinkedDomain.IF_PRESENT,
      identifierOpts: {
        identifier,
        kmsKeyRef: await getDefaultKeyRef({ did }),
      },
    },
  }
}

export async function createOID4VPRP(opts: { resolver: Resolvable }): Promise<SIOPv2RP> {
  return new SIOPv2RP({
    instanceOpts: toPexInstanceOptions(oid4vpInstanceOpts.asArray, opts),
  })
}

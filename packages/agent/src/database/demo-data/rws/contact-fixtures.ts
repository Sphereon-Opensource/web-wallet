import { CorrelationIdentifierType, CredentialRole, NonPersistedIdentity, PartyOrigin, PartyTypeType } from '@sphereon/ssi-sdk.data-store'
import { IIdentifier } from '@veramo/core'
import agent from '../../../agent'
import { v4 } from 'uuid'
import { AddContactArgs } from '@sphereon/ssi-sdk.contact-manager'
// import { IonPublicKeyPurpose } from '@decentralized-identity/ion-sdk'
import { VC_API_BASE_PATH } from '../../../environment-vars'
import { DIDMethods } from '../../../types'
import { IKeyOpts } from '@sphereon/ssi-sdk-ext.did-provider-web'
import { TKeyType } from '@sphereon/ssi-sdk-ext.key-utils'

const PRIVATE_RECOVERY_KEY_HEX = 'd39e66e720c00b244923eb861122ed25116555ae771ee9a57b749640173d7cf8'
const PRIVATE_UPDATE_KEY_HEX = '0121009becfa9caf6221dce6f4f7b55dd3376e79c4ca83ce92bd43861c2393ec'
const PRIVATE_DID1_KEY_HEX = 'e0453c226bd4458740c45f0d0590e696da2fe9c5c66f81908aedd43a7b7da252'
const PRIVATE_DID2_KEY_HEX = '74213f5204ea414deb4dc2c470d1700b8cc2076ddd8d3ddb06dae08902dddd0c'
const PRIVATE_DID3_KEY_HEX = '90868704b3bb2bdd27e2e831654c4adb2ea7e4f0e090d03aa3ae38020346aa12'
const PRIVATE_DID4_KEY_HEX = 'f367873323bf0dd701ec972d8a17aee7a9dcad13bd6deb64e8653da113094261'
const PRIVATE_DID5_KEY_HEX = 'a167873323bf1ed701ec972d8a17aee7aaecad13bd6deb64e8653da113094256'
const PRIVATE_DID6_KEY_HEX = 'a167873323bf0dd701ec972d8a17aee7aaecad13bd6deb64e8653da113094256'
const toContactIdentityDTO = (contact: Record<string, any>, identifier: IIdentifier): NonPersistedIdentity => {
  console.log(`Contact received did ${identifier.did}, contact: ${JSON.stringify(contact)}`, identifier.did)
  return {
    alias: identifier.alias ?? contact.displayName,
    roles: [CredentialRole.ISSUER],
    identifier: {
      type: CorrelationIdentifierType.DID,
      correlationId: identifier.did,
    },
  } as NonPersistedIdentity
}

export async function addContactsRWS() {
  try {
    const personContactType = await agent.cmAddContactType({
      name: 'people',
      origin: PartyOrigin.INTERNAL,
      type: PartyTypeType.NATURAL_PERSON,
      tenantId: v4(),
    })

    const organizationalContactType = await agent.cmAddContactType({
      name: 'organizations',
      origin: PartyOrigin.INTERNAL,
      type: PartyTypeType.ORGANIZATION,
      tenantId: v4(),
    })

    const persona1 = {
      firstName: 'Wendy',
      middleName: 'van',
      lastName: 'RWS',
      displayName: 'Wendy van RWS',
      contactType: personContactType,
      uri: 'rijkswaterstaat.nl',
    } as AddContactArgs

    let identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_JWK, 'w-auth', PRIVATE_DID1_KEY_HEX, {
        type: 'Secp256r1',
      }),
    )
    persona1.identities = [toContactIdentityDTO(persona1, identifier)]
    await agent.cmAddContact(persona1)
    // did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiSjJLUEFIQjllbUZWTk5PQ1NER2V2ZFM2cXlrUHNBLVVOM0ZfRGd5aUZrSSIsInkiOiIzSXcxZlZKakFCOS1WbjJXdklaa0s0NnNhQTZuYmh6QTBrVDZNdWV5ekNrIn0
    // did:ion:EiDktcw2GgLHQe3WehFFKciKS6rjYNEmKFIs-4_knT-Lpg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJ3ZW5keSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI4N3U3NlRMVFhUT09paEo3RFZoYUloUUlmWkN4WjRja1pkNHNxaEw2OVVjIiwieSI6InlMMEFmUTdaNXBhQk9rTGh2X1h6M0QyY0oxaWdSNkVfZFViT2tSRmtZWDgifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRElPNlE4M1p2MkFJR09Yb2dRbHVYbEpwNTc2WVNBOWc0dVF1MzVDRVc0Y3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUF1eEU4RGhndmhRbzlpZG5hODgycExpY0JQZzlNYTZIS25ENWJKZWJ5ZllBIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlDNVQ5aTVNSjVzRm9FaDg4cTdKa09qWUNQMXBEODR5ODBNSzRCZUJmeGJKZyJ9fQ

    const persona2 = {
      firstName: 'Hanne',
      middleName: 'van',
      lastName: 'Stonebase',
      displayName: 'Hanne van Stonebase',
      contactType: personContactType,
      uri: 'stonebase.nl',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_JWK, 'h-auth', PRIVATE_DID2_KEY_HEX, {
        type: 'Secp256r1',
      }),
    )
    persona2.identities = [toContactIdentityDTO(persona2, identifier)]
    await agent.cmAddContact(persona2)
    // did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiVWtmNDNDRWJoUmVnc1hKOTZvQU0wQ2R2WnowNUt0QWtIVUVDQWt5WlBkQSIsInkiOiI1cEkwQ0pscVhKY1BxeWtLMENKVkwzNm8xMWFqamVkamQ3c0dIWVIyVHVJIn0
    // did:ion:EiAPtRGoWDBTgilTE3PhmSy0C7IxiL1-16hzv-il_l4dCQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJoYW5uZSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJKaUdNcXU3VFlUdUlOTzYyV0VzQjczeTA2eFlZQkJ0clN1d0RjM3k2dFowIiwieSI6Im0tZ2xJTXhEN0Q5Z1Zvc2Q3YjdMVmNMRUxWdFVUVDZWbGN2T3cyQUx6NVkifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRElPNlE4M1p2MkFJR09Yb2dRbHVYbEpwNTc2WVNBOWc0dVF1MzVDRVc0Y3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaURpWjNGRmFkUTZTQWJLUDAwZFMza05LMWRoaV9OZTNncWNoNkRFdmZvcXFnIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlDNVQ5aTVNSjVzRm9FaDg4cTdKa09qWUNQMXBEODR5ODBNSzRCZUJmeGJKZyJ9fQ

    const persona3 = {
      firstName: 'Kees',
      middleName: 'van',
      lastName: 'SGS',
      displayName: 'Kees van SGS',
      contactType: personContactType,
      uri: 'sgs.com',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_JWK, 'k-auth', PRIVATE_DID3_KEY_HEX, {
        type: 'Secp256r1',
      }),
    )
    persona3.identities = [toContactIdentityDTO(persona3, identifier)]
    await agent.cmAddContact(persona3)
    //did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4Ijoib1ZCaWxPcERuMTRCLVhKV0FhSzRpZzN0aURiZkM0ZW9waTZLRFgxUXVhdyIsInkiOiI0TzY5UHV1cmRJV0dyRDRmMVZIM2lUR3BZU09LUjJhQTBlMFAyYkxRbEVNIn0
    // did:ion:EiBVz8Hb_8C3BGtUcFa73jbEnSANCGJvQqGNGaTjAmD4PA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZWVzIiwicHVibGljS2V5SndrIjp7ImNydiI6InNlY3AyNTZrMSIsImt0eSI6IkVDIiwieCI6IjRqMzhYUEpRWnExWW0zTkV3ZHJSZFVzY3lUdEhkM25rbEJpN1E3NkxtZTgiLCJ5IjoieU1RYkJ5dTE1d1BrWlpTTWl1R2o5VjJWbDdCeUtnM2Rab3dlVE9CcURXQSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiRWNkc2FTZWNwMjU2azFWZXJpZmljYXRpb25LZXkyMDE5In1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlESU82UTgzWnYyQUlHT1hvZ1FsdVhsSnA1NzZZU0E5ZzR1UXUzNUNFVzRjdyJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpRDhFTElBSkJaMDAwMkh6OHUwWVZhWURBbkhkN2d3NTU3M0lmeW1jQnY1ZVEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUM1VDlpNU1KNXNGb0VoODhxN0prT2pZQ1AxcEQ4NHk4ME1LNEJlQmZ4YkpnIn19

    const organization1 = {
      legalName: 'Example org',
      displayName: 'Example org',
      contactType: organizationalContactType,
      uri: 'sphereon.com',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_JWK, 'sphereon-auth', PRIVATE_DID4_KEY_HEX, {
        traceability: false,
        alias: 'sphereon-auth',
        type: 'Secp256r1',
      }),
    )
    console.log(JSON.stringify(identifier, null, 2))
    organization1.identities = [toContactIdentityDTO(organization1, identifier)]
    await agent.cmAddContact(organization1)
    // did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiWjY3eEc3UFZUUHBDdlp3UjVlR2pteHhqQjdlb2M1cWdYbm9LMloxR2R6YyIsInkiOiJ1ZkpCc3BlNTV5WkZXVWN1T21GRUMtX3NEVE1nVXRndF8tbmV2WHd4UVdZIn0
    // did:ion:EiCgT4nciFugDoVYcImyRBKAoDhTQXF3iHMyF6oS1cMqiA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJyd3MiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiWm5HbFAwT3F3QU9XTF9IZUlJSTZtczlLbkxCQXV2WnJtRjFPTzhnMkhBNCIsInkiOiJsd2Y4QXpmZ1lGXzU5RWRFYnhvQ1pOTXdTaVFRQ1NvY1hFQ0RtbmRfclhzIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJFY2RzYVNlY3AyNTZrMVZlcmlmaWNhdGlvbktleTIwMTkifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURJTzZRODNadjJBSUdPWG9nUWx1WGxKcDU3NllTQTlnNHVRdTM1Q0VXNGN3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDVjNUMkpuYTdMaVk4MVU2d2RhX1ZPX1VwcTU3eEtqeVh6R2JrME1xYTdUZyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQzVUOWk1TUo1c0ZvRWg4OHE3SmtPallDUDFwRDg0eTgwTUs0QmVCZnhiSmcifX0

    const organization2 = {
      legalName: 'Stone Base B.V.',
      displayName: 'Stone Base',
      contactType: organizationalContactType,
      uri: 'stonebase.nl',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_WEB, 'stonebase-auth', PRIVATE_DID5_KEY_HEX, {
        traceability: true,
        alias: 'did:web:localhost:stonebase',
        type: 'Secp256r1',
      }),
    )
    organization2.identities = [toContactIdentityDTO(organization2, identifier)]
    await agent.cmAddContact(organization2)
    // did:ion:EiAj_YiR0IaPqvA0fYVolNMArSROZTnypAxNvBwQlH53lg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzdG9uZWJhc2UiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiQTAzV0RublU5N0syTWhzcy1zSno5TGl3d0RWdDRnRHp6N2lqbkwwLUtEayIsInkiOiJidzZFYjFZeHRvdThXay1BTzNlUVR6OEp3R25uYnFTR2tjcl94aTBRZVZjIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJFY2RzYVNlY3AyNTZrMVZlcmlmaWNhdGlvbktleTIwMTkifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURJTzZRODNadjJBSUdPWG9nUWx1WGxKcDU3NllTQTlnNHVRdTM1Q0VXNGN3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlEaFF0N2ltc0VzeGs4WEJLSWoyc1RmcjJOMV9FallrYVRMWFlZNVBSS0hpdyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQzVUOWk1TUo1c0ZvRWg4OHE3SmtPallDUDFwRDg0eTgwTUs0QmVCZnhiSmcifX0

    const organization3 = {
      legalName: 'SGS S.A.',
      displayName: 'SGS',
      contactType: organizationalContactType,
      uri: 'sgs.com',
    } as AddContactArgs

    identifier = await agent.didManagerCreate(
      existingDidConfig(DIDMethods.DID_WEB, 'sgs-auth', PRIVATE_DID6_KEY_HEX, {
        traceability: true,
        alias: 'did:web:localhost:sgs',
        type: 'Secp256r1',
      }),
    )
    organization3.identities = [toContactIdentityDTO(organization3, identifier)]
    await agent.cmAddContact(organization3)
    // did:ion:EiDobUdzuIh5U8UDtbe6y-Zx1LpiO_AsqlsT-gMZa6vCvA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzZ3MiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiamNhbm1FcC1HbU9QN1F6RjFkdlJ2YTkwSmRQQlFqTDNmQ1h5eWNmU3RyRSIsInkiOiJfV0FpMlplMWI4SFBLT1Zza2x1bWl3SE9wNW9MZnV1SzY1VmNieE5IejJvIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJFY2RzYVNlY3AyNTZrMVZlcmlmaWNhdGlvbktleTIwMTkifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURJTzZRODNadjJBSUdPWG9nUWx1WGxKcDU3NllTQTlnNHVRdTM1Q0VXNGN3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlEQWgzN2dhOWMwaGFlVXd6R2tWam03aFJXSF82T19mdFJwWloyRnpmWHJJQSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQzVUOWk1TUo1c0ZvRWg4OHE3SmtPallDUDFwRDg0eTgwTUs0QmVCZnhiSmcifX0
  } catch (e) {
    console.log(e)
  }
}

function existingDidConfig(
  method: DIDMethods,
  kid: string,
  privateDIDKeyHex: String,
  opts?: { traceability?: boolean; alias?: string; type?: TKeyType },
) {
  const services = opts?.traceability
    ? [
        {
          id: 'traceability',
          type: 'TraceabilityAPI',
          serviceEndpoint: VC_API_BASE_PATH,
        },
      ]
    : undefined

  let options = {}
  if (method === DIDMethods.DID_WEB) {
    options = {
      kid,
      keys: [
        {
          key: {
            privateKeyHex: privateDIDKeyHex,
            kid,
            type: opts?.type ?? 'Secp256r1',
          },
          type: opts?.type ?? 'Secp256r1',
          isController: true,
        } as IKeyOpts,
      ],
    }
    /*} else if (method === DIDMethods.DID_ION) {
    options = {
      anchor: true,
      recoveryKey: {
        kid: `recovery-key-${kid}`,
        key: {
          privateKeyHex: PRIVATE_RECOVERY_KEY_HEX,
        },
      },
      updateKey: {
        kid: `update-key-${kid}`,
        key: {
          privateKeyHex: PRIVATE_UPDATE_KEY_HEX,
        },
      },
      verificationMethods: [
        {
          kid,
          purposes: [IonPublicKeyPurpose.Authentication, IonPublicKeyPurpose.AssertionMethod],
          key: {
            privateKeyHex: privateDIDKeyHex,
          },
        },
      ],
      services,
    }*/
  } else if (method === DIDMethods.DID_JWK) {
    options = {
      kid,
      key: {
        privateKeyHex: privateDIDKeyHex,
        kid,
        type: opts?.type ?? 'Secp256r1',
        keyType: opts?.type ?? 'Secp256r1',
      },
    }
  } else {
    options = { services }
  }
  return {
    provider: `did:${method}`,
    options,
    services,
    ...(opts?.alias && { alias: opts.alias }),
  }
}

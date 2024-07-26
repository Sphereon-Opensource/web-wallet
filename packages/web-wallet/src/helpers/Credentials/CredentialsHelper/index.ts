import {ICredentialContextType, IIssuer} from '@sphereon/ssi-types'
import {KeyValuePair, Product} from '@typings'
import {uuid} from 'short-uuid'
import {CredentialPayload, VerifiableCredential} from '@veramo/core'
import {supabaseServiceClient} from '@helpers/SupabaseClient'
import {Contact, Identity} from '@sphereon/ssi-sdk.data-store'

const generateProduct = (product: Product): Record<string, unknown> => ({
  name: product.productNature,
  description: product.productSpecification,
  material: {
    type: ['rawMaterial'],
    rawAmount: product.rawAmount,
    unit: product.unit,
  },
  manufacturingCountry: product.countryOfOrigin,
  dateOfLastDelivery: product.finalDeliveryDate,
})

const buildLineItems = (product: Product): Array<Record<string, unknown>> => [
  {
    type: ['TradeLineItem'],
    ...generateProduct(product),
  },
]

const createIssuerProperty = (issuer: Contact, issuerIdentity: Identity): IIssuer => {
  if ('firstName' in issuer) {
    return {
      id: issuerIdentity.identifier.correlationId,
      type: ['NaturalPerson'],
      name: issuer.displayName, // TODO other props as well?
    } as IIssuer
  } else if ('legalName' in issuer) {
    return {
      id: issuerIdentity.identifier.correlationId,
      type: ['Organization'],
      name: issuer.displayName, // TODO other props as well?
    } as IIssuer
  }
  throw new Error('Cannot determine issuer')
}

export const generateCredential = (
  assetName: string,
  issuer: Contact,
  issuerIdentity: Identity,
  product: Product,
  credentialSubjectExtraProps: Record<string, any> | undefined,
): CredentialPayload => {
  return {
    '@context': ['https://www.w3.org/2018/credentials/v1', 'https://w3id.org/traceability/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
    id: `urn:uuid:${uuid()}`, // TODO generate via the Uniregistrar
    type: ['VerifiableCredential', 'CertificationOfOrigin'],
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      items: buildLineItems(product),
      ...(credentialSubjectExtraProps ? credentialSubjectExtraProps : {}),
    },
    issuer: createIssuerProperty(issuer, issuerIdentity),
  } as CredentialPayload
}

export const buildInformationDetails = async (
  assetId: string,
  onGetCredential: (vc: VerifiableCredential) => Promise<void>,
): Promise<Array<KeyValuePair>> => {
  try {
    const credentialResult = await supabaseServiceClient
      .from('credential_reference')
      .select('*')
      .eq('asset_id', assetId)
      .single<VerifiableCredential>()

    if (credentialResult.error) {
      throw credentialResult.error
    }

    if (!credentialResult.data || !credentialResult.data.credential_string) {
      return []
    }

    const credential = JSON.parse(credentialResult.data.credential_string) as VerifiableCredential
    await onGetCredential(credential)
    const informationDetails: Array<KeyValuePair> = []

    for (const key in credential.credentialSubject) {
      const credentialSubjectElement = credential.credentialSubject[key]
      buildInformationItem(key, credentialSubjectElement, informationDetails)
    }

    return informationDetails
  } catch (error) {
    // Handle the error appropriately
    console.error(error)
    return []
  }
}

const buildInformationItem = (key: string, credentialSubjectElement: any, informationDetails: Array<KeyValuePair>): void => {
  if (Array.isArray(credentialSubjectElement)) {
    const flattenedElement = credentialSubjectElement.flat()
    const flattenedStrings = flattenedElement.filter(el => typeof el === 'string')
    if (flattenedStrings.length > 0) {
      const joinedValue = flattenedStrings.join(' ')
      buildInformationItem(key, joinedValue, informationDetails)
      return
    }
    for (const arrayElement of flattenedElement) {
      if (Array.isArray(arrayElement)) {
        for (const arrayElementElementValue of arrayElement) {
          if (Array.isArray(arrayElementElementValue)) {
            const flattenedValue = arrayElementElementValue.flat()
            const flattenedStrings = flattenedValue.filter(el => typeof el === 'string')
            if (flattenedStrings.length > 0) {
              const joinedValue = flattenedStrings.join(' ')
              buildInformationItem(key, joinedValue, informationDetails)
            }
          } else if (typeof arrayElementElementValue === 'string') {
            buildInformationItem(key, arrayElementElementValue, informationDetails)
          }
        }
      } else if (typeof arrayElement === 'object') {
        for (const childKey in arrayElement) {
          const childElement = arrayElement[childKey]
          buildInformationItem(childKey, childElement, informationDetails)
        }
      }
    }
  } else if (typeof credentialSubjectElement === 'object') {
    for (const childKey in credentialSubjectElement) {
      const childElement = credentialSubjectElement[childKey]
      buildInformationItem(childKey, childElement, informationDetails)
    }
  } else {
    informationDetails.push({label: key, value: credentialSubjectElement})
  }
}

export const contextToString = (context: ICredentialContextType | ICredentialContextType[]): string => {
  if (Array.isArray(context)) {
    return context.map(item => singleContextToString(item)).join(', ')
  }
  return singleContextToString(context)
}

const singleContextToString = (item: ICredentialContextType): string => {
  if (item === undefined) {
    return ''
  }

  if (typeof item === 'string') {
    return item
  }
  if (typeof item === 'object') {
    const {name, did, ...additional} = item
    const parts: string[] = []
    if (name) parts.push(name)
    if (did) parts.push(did)
    const additionalStr = Object.entries(additional)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    if (additionalStr) parts.push(additionalStr)
    return parts.join(', ')
  }
  return ''
}

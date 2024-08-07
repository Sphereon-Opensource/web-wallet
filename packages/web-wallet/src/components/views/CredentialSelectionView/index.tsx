import {
  InformationRequestViewDescriptionStyled,
  InformationRequestViewFormContainerStyled,
  InformationRequestViewParagraphStyled,
  InformationRequestViewTitleStyled,
} from '@sphereon/ui-components.ssi-react/dist/styles'
import React, {ReactElement, useEffect, useMemo, useState} from 'react'
import CredentialSelection from '@components/panels/CredentialSelection'
import {CredentialSummary} from '@sphereon/ui-components.credential-branding/dist/types'
import {InputDescriptorV1} from '@sphereon/pex-models/dist/model/inputDescriptorV1'
import StatePanel from '@components/panels/StatePanel'
import {JSONDataView} from '@sphereon/ui-components.ssi-react'
import {InputDescriptorV2} from '@sphereon/pex-models'
import Debug, {Debugger} from 'debug'
import {SelectableCredential} from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'
import {toCredentialSummary} from '@sphereon/ui-components.credential-branding'
import {UniqueDigitalCredential} from '@sphereon/ssi-sdk.credential-store'
import {VerifiableCredential} from '@veramo/core'
import {CredentialRole} from '@sphereon/ssi-sdk.data-store'

const debug: Debugger = Debug('sphereon:cloud-wallet:CredentialSelectionView')

type CredentialSelectionViewProps = {
  inputDescriptor: InputDescriptorV1 | InputDescriptorV2
  selectableCredentials: Array<SelectableCredential>
  fallbackPurpose?: string
  index?: number
  onSelect: (credential: UniqueDigitalCredential | undefined) => void
  credentialRole: CredentialRole
}

const CredentialSelectionView: React.FC<CredentialSelectionViewProps> = ({
  inputDescriptor,
  selectableCredentials,
  fallbackPurpose,
  credentialRole,
  index,
  onSelect,
}): ReactElement => {
  const [selectedCredential, setSelectedCredential] = useState<CredentialSummary | undefined>()
  const [selectableCredentialsMap] = useState<Map<string, SelectableCredential>>(new Map())
  const [credentialSummaryItems, setCredentialSummaryItems] = useState<CredentialSummary[]>([])

  useMemo(() => {
    selectableCredentials.forEach(selectableCredential => {
      selectableCredentialsMap.set(selectableCredential.credential.hash, selectableCredential)
    })
  }, [])

  const handleCredentialSelect = (credential: CredentialSummary | undefined) => {
    debug('credentialSummary selected', credential)
    setSelectedCredential(credential)
    if (credential !== undefined) {
      const selectableCredential = selectableCredentialsMap.get(credential.hash)
      if (selectableCredential) {
        onSelect(selectableCredential.credential)
      }
    } else {
      onSelect(undefined)
    }
  }

  const filteredSubject: Record<string, any> = useMemo(() => {
    return selectedCredential
      ? Object.fromEntries(selectedCredential.properties.filter(prop => prop.label !== 'subject').map(detail => [detail.label, detail.value]))
      : {}
  }, [selectedCredential])

  // This logic remained behind in the component. Because this component is in a loop on the hosting page, moving out this code is not straightforward. Can maybe be done using a callback or something
  useEffect(() => {
    const fetchCredentialSummaries = async () => {
      const summaries = await Promise.all(
        selectableCredentials.map(async selectableCredential => {
          const uniqueDigitalCredential = selectableCredential.credential
          return await toCredentialSummary({
            verifiableCredential: uniqueDigitalCredential.originalVerifiableCredential as VerifiableCredential,
            hash: uniqueDigitalCredential.hash,
            credentialRole,
            branding: selectableCredential.credentialBranding,
            issuer: selectableCredential.issuerParty,
            subject: selectableCredential.subjectParty,
          })
        }),
      )
      setCredentialSummaryItems(summaries)
    }

    fetchCredentialSummaries()
  }, [])

  return (
    <InformationRequestViewFormContainerStyled>
      {(index === undefined || index === 0) && (
        <InformationRequestViewTitleStyled>The following information will be shared</InformationRequestViewTitleStyled>
      )}
      <InformationRequestViewParagraphStyled>{'Purpose'}</InformationRequestViewParagraphStyled>
      <InformationRequestViewDescriptionStyled>{inputDescriptor.purpose ?? fallbackPurpose ?? ''}</InformationRequestViewDescriptionStyled>
      <InformationRequestViewParagraphStyled>{'Suitable credentials'}</InformationRequestViewParagraphStyled>
      <CredentialSelection key={`credSel${index}`} credentialSummaryItems={credentialSummaryItems} onSelect={handleCredentialSelect} />
      {selectedCredential && (
        <>
          <InformationRequestViewParagraphStyled>{'Required information'}</InformationRequestViewParagraphStyled>
          <StatePanel panelState="VALID">
            <JSONDataView data={filteredSubject} shouldExpandNodeInitially={true} />
          </StatePanel>
        </>
      )}
    </InformationRequestViewFormContainerStyled>
  )
}

export default CredentialSelectionView

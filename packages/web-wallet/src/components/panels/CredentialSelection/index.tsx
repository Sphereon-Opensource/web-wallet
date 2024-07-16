// TODO move to UI-components?

import React, {useState} from 'react'
import {CredentialMiniCardViewProps, CredentialViewItem} from '@sphereon/ui-components.ssi-react'
import style from './index.module.css'

import {getCredentialStatus} from '@sphereon/ui-components.credential-branding'
import {CredentialSummary} from '@sphereon/ui-components.credential-branding/dist/types'

type CredentialSelectionProps = {
  credentialSummaryItems: CredentialSummary[]
  onSelect: (credential: CredentialSummary | undefined) => void
}

const CredentialSelection: React.FC<CredentialSelectionProps> = ({credentialSummaryItems, onSelect}) => {
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null)
  const handleSelect = (credential: CredentialSummary) => {
    const credentialId = credential.id ?? credential.hash
    if (selectedCredential === null || credentialId !== selectedCredential) {
      setSelectedCredential(credentialId)
      onSelect(credential)
    } else {
      onSelect(undefined)
      setSelectedCredential(null)
    }
  }

  const getCredentialCardViewProps = (credentialSummary: CredentialSummary) => {
    const branding = credentialSummary.branding
    const credentialCardViewProps: CredentialMiniCardViewProps = {
      ...(branding?.logo && {logo: branding?.logo}),
      ...(branding?.background?.image && {backgroundImage: branding?.background?.image}),
      ...(branding?.background?.color && {backgroundColor: branding?.background?.color}),
    }
    return credentialCardViewProps
  }

  if (selectedCredential == null && credentialSummaryItems.length === 1) {
    handleSelect(credentialSummaryItems[0])
  }

  return (
    <div className={style.credentialSelectionContainer}>
      {credentialSummaryItems.map((credential, index) => {
        const credentialId = credential.id ?? credential.hash

        return (
          <div
            key={`${credential.id}_${index}`}
            className={`${style.credentialBox} ${selectedCredential !== null && selectedCredential === credentialId ? style.selected : ''}`}
            onClick={() => handleSelect(credential)}>
            <CredentialViewItem
              credentialStatus={getCredentialStatus(credential)}
              issueDate={credential.issueDate}
              expirationDate={credential.expirationDate}
              credentialTitle={credential.title ?? 'unknown'} // FIXME
              issuerName={credential.issuer.alias ?? credential.issuer.name} // TODO shorten name
              showCard={true}
              credentialBranding={getCredentialCardViewProps(credential)}
            />
          </div>
        )
      })}
    </div>
  )
}

export default CredentialSelection

import React, {FC, ReactElement} from 'react'
import {CredentialIssuanceWizardView} from '@sphereon/ui-components.ssi-react'
import {useCredentialsOutletContext} from '@machines/credentials/credentialsCreateStateNavigation'
import {useForms} from '@helpers/forms'

const IssueCredentialEnterDetailsContent: FC = (): ReactElement => {
  const {onSelectCredentialTypeChange, onCredentialFormDataChange} = useCredentialsOutletContext()
  const forms = useForms({formName: 'CredentialIssuanceWizard'})
  const form_step_number = 1 // TODO should probably not be hardcoded in the future, but out of scope for CWALL-209

  if (forms.loading) return <div>Loading...</div>
  if (forms.error) return <div>Error: {forms.error}</div>

  return (
    <CredentialIssuanceWizardView
      credentialTypes={forms.getCredentialFormSelectionType(form_step_number)}
      onSelectCredentialTypeChange={onSelectCredentialTypeChange}
      onCredentialFormDataChange={onCredentialFormDataChange}
    />
  )
}

export default IssueCredentialEnterDetailsContent

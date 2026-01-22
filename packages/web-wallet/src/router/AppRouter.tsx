import {Authenticated, ErrorComponent, useLogin} from '@refinedev/core'
import React, {FC, PropsWithChildren, ReactElement, useEffect} from 'react'
import {Navigate, Outlet, Route, Routes, useParams} from 'react-router-dom'
import AssetsListPage from '../../pages/assets'
import WorkflowListPage from '../../pages/workflows'
import ContactsListPage from '../../pages/contacts'
import DocumentsListPage from '../../pages/documents'
import ContactsCreatePage from '../../pages/contacts/create'
import CreateNaturalPersonPersonalInfoContent from '@components/views/CreateNaturalPersonPersonalInfoContent'
import {NaturalPersonContextProvider} from '@machines/contacts/contactsStateNavigation'
import CreateNaturalPersonOrganizationContent from '@components/views/CreateNaturalPersonOrganizationContent'
import CreateNaturalPersonReviewContactContent from '@components/views/CreateNaturalPersonReviewContactContent'
import CreateNaturalPersonRoleContent from '@components/views/CreateNaturalPersonRoleContent'
import CredentialsListPage from '../../pages/credentials'
import CredentialsCreatePage from '../../pages/credentials/create'
import {CredentialsCreateContextProvider} from '@machines/credentials/credentialCreateStateNavigation'
import IssueCredentialEnterDetailsContent from '@components/views/IssueCredentialEnterDetailsContent'
import IssueCredentialIssueMethodContent from '@components/views/IssueCredentialIssueMethodContent'
import ShowCredentialDetails from '../../pages/credentials/show'
import LoadingPage from '../../pages/oid4vci/loading'
import OID4VCIStateMachineComponent from '../../pages/oid4vci'
import AddContactPage from '../../pages/oid4vci/addContact'
import AuthorizationCodeUrlPage from '../../pages/oid4vci/AuthorizationCodeUrl'
import Oid4vciErrorPage from '../../pages/oid4vci/error'
import ReviewCredentialsPage from '../../pages/oid4vci/reviewCredentials'
import SelectCredentialsPage from '../../pages/oid4vci/selectCredentials'
import PinVerificationPage from '../../pages/oid4vci/pinVerification'
import OrganizationContactsCreatePage from '../../pages/organizationContacts/create'
import {OrganizationContactMachineContextProvider} from '@machines/contacts/organizationContactsStateNavigation'
import CreateOrganizationContactOrganizationalInfoContent from 'src/components/views/CreateOrganizationContactOrganizationalInfoContent'
import CreateOrganizationContactReviewContactContent from '@components/views/CreateOrganizationContactReviewContactContent'
import CreateOrganizationContactPhysicalAddressContent from '@components/views/CreateOrganizationContactPhysicalAddressContent'
import CreateNaturalPersonPhysicalAddressContent from '@components/views/CreateNaturalPersonPhysicalAddressContent'
import IdentifiersListPage from '../../pages/keyManagement/identifiers'
import IdentifierCreatePage from '../../pages/keyManagement/identifiers/create'
import CreateIdentifierSelectTypeContent from 'src/components/views/CreateIdentifierSelectTypeContent'
import {IdentifiersCreateContextProvider} from '@machines/identifiers/identifiersCreateStateNavigation'
import PresentationDefinitionsListPage from 'pages/presentationDefinitions'
import {
  ContactRoute,
  CreateIdentifierRoute,
  CredentialDesignerRoute,
  EditIdentifierRoute,
  EInvoiceCreateRoute,
  InboxRoute,
  IssueCredentialRoute,
  KeyManagementRoute,
  MainRoute,
  NaturalPersonCreationRoute,
  OID4VCIRoute,
  OrganizationContactCreationRoute,
  SIOPV2Route,
} from '@typings'
import CreateIdentifierKeysContent from '@components/views/CreateIdentifierKeysContent'
import CreateIdentifierAddServiceEndpointContent from '@components/views/CreateIdentifierAddServiceEndpointContent'
import CreateIdentifierSummaryContent from '@components/views/CreateIdentifierSummaryContent'
import PresentationDefinitionPage from 'pages/presentationDefinitions/details'
import KeysListPage from '../../pages/keyManagement/keys'
import KeyShowPage from '../../pages/keyManagement/keys/show'
import OID4VPStateMachineComponent from '../../pages/siopv2'
import InformationRequestPage from '../../pages/siopv2/informationRequest'
import Siopv2ErrorPage from '@/pages/siopv2/error'
import {NavigationProvider} from './NavigationContext'
import {CredentialRole} from '@sphereon/ssi-types'
import ShowContactDetails from '@/pages/contacts/show'
import EditIdentifierContent from '@components/views/EditIdentifierContent'
import EditIdentifierKeysContent from '@components/views/EditIdentifierKeysContent'
import {IdentifiersEditContextProvider} from '@machines/identifiers/identifiersEditStateNavigation'
import IdentifierEditPage from '@/pages/keyManagement/identifiers/edit'
import ShowIdentifierDetails from '@/pages/keyManagement/identifiers/show'
import CredentialDesignerCreateContextProvider from '@machines/credentials/credentialDesignerCreateStateNavigation'
import CredentialDesignerCreatePage from '@/pages/credentials/design/create'
import CredentialDesignerClaimsCreateContent from '@components/views/CredentialDesignerClaimsCreateContent'
import CredentialDesignerDetailsCreateContent from '@components/views/CredentialDesignerDetailsCreateContent'
import CredentialDesignsListPage from '@/pages/credentials/design'
import CredentialDesignerEditPage from '@/pages/credentials/design/edit'
import CredentialDesignerEditContextProvider from '@machines/credentials/credentialDesignerEditStateNavigation'
import CredentialDesignerDetailsEditContent from '@components/views/CredentialDesignerDetailsEditContent'
import CredentialDesignerVisualDesignEditContent from '@components/views/CredentialDesignerVisualDesignEditContent'
import CredentialDesignerVisualDesignCreateContent from '@components/views/CredentialDesignerVisualDesignCreateContent'
import CredentialDesignerClaimsEditContent from '@components/views/CredentialDesignerClaimsEditContent'
import EInvoiceListPage from '../../pages/einvoice'
import EInvoiceCreatePage from '../../pages/einvoice/create'
import SentInvoiceDetailPage from '../../pages/einvoice/sent/[id]'
import InboxPage from '../../pages/inbox'
import InboxItemDetailPage from '../../pages/inbox/[inboxName]/[folderName]/[id]'
import {EInvoiceCreateContextProvider} from '@machines/einvoice/eInvoiceCreateStateNavigation'
import EInvoiceDetailsContent from '@components/views/EInvoiceDetailsContent'
import EInvoiceRecipientContent from '@components/views/EInvoiceRecipientContent'
import EInvoiceEvidenceContent from '@components/views/EInvoiceEvidenceContent'
import EInvoiceReviewContent from '@components/views/EInvoiceReviewContent'
import LandingPage from '../../pages/landing'

const KeycloakLoginPage = (props: PropsWithChildren<any>) => {
  const {mutate: login} = useLogin()
  useEffect(() => {
    login({})
  }, [login])
  return props.children
}

const CredentialDesignerEditWrapper: FC = (): ReactElement => {
  const {id} = useParams()
  return (
    <CredentialDesignerEditContextProvider key={id}>
      <CredentialDesignerEditPage />
    </CredentialDesignerEditContextProvider>
  )
}

const AppRouter: React.FC = () => {
  return (
    <NavigationProvider>
      <Routes>
        <Route
          element={
            <Authenticated key={'securePageAuthentication'} fallback={<KeycloakLoginPage />} appendCurrentPathToQuery={true}>
              <Outlet />
            </Authenticated>
          }>
          {/* Landing page route */}
          <Route path="/" element={<LandingPage />} />
          <Route path={MainRoute.ASSETS}>
            <Route index element={<AssetsListPage />} />
          </Route>
          <Route path={MainRoute.WORKFLOW}>
            <Route index element={<WorkflowListPage />} />
          </Route>
          <Route path={MainRoute.CONTACTS}>
            <Route index element={<ContactsListPage />} />
            <Route
              path={`${ContactRoute.NATURAL_PERSON}/${MainRoute.SUB_CREATE}`}
              element={
                <NaturalPersonContextProvider>
                  <ContactsCreatePage />
                </NaturalPersonContextProvider>
              }>
              <Route path={NaturalPersonCreationRoute.PERSONAL_INFO} element={<CreateNaturalPersonPersonalInfoContent />} />
              <Route path={NaturalPersonCreationRoute.PHYSICAL_ADDRESS} element={<CreateNaturalPersonPhysicalAddressContent />} />
              <Route path={NaturalPersonCreationRoute.ORGANIZATION} element={<CreateNaturalPersonOrganizationContent />} />
              <Route path={NaturalPersonCreationRoute.ROLE} element={<CreateNaturalPersonRoleContent />} />
              <Route path={NaturalPersonCreationRoute.REVIEW} element={<CreateNaturalPersonReviewContactContent />} />
            </Route>
            <Route
              path={`${ContactRoute.ORGANIZATION}/${MainRoute.SUB_CREATE}`}
              element={
                <OrganizationContactMachineContextProvider>
                  <OrganizationContactsCreatePage />
                </OrganizationContactMachineContextProvider>
              }>
              <Route path={OrganizationContactCreationRoute.ORGANIZATION_INFO} element={<CreateOrganizationContactOrganizationalInfoContent />} />
              <Route path={OrganizationContactCreationRoute.PHYSICAL_ADDRESS} element={<CreateOrganizationContactPhysicalAddressContent />} />
              <Route path={OrganizationContactCreationRoute.REVIEW} element={<CreateOrganizationContactReviewContactContent />} />
            </Route>
            <Route path={MainRoute.SUB_ID} element={<ShowContactDetails />} />
          </Route>
          <Route path={MainRoute.CREDENTIALS}>
            <Route index element={<CredentialsListPage />} />
            <Route
              path={MainRoute.SUB_CREATE}
              element={
                <CredentialsCreateContextProvider>
                  <CredentialsCreatePage />
                </CredentialsCreateContextProvider>
              }>
              <Route path={IssueCredentialRoute.DETAILS} element={<IssueCredentialEnterDetailsContent />} />
              <Route path={IssueCredentialRoute.ISSUE_METHOD} element={<IssueCredentialIssueMethodContent />} />
            </Route>
            <Route path={MainRoute.DESIGNS}>
              <Route index element={<CredentialDesignsListPage />} />
              <Route
                path={MainRoute.SUB_CREATE}
                element={
                  <CredentialDesignerCreateContextProvider>
                    <CredentialDesignerCreatePage />
                  </CredentialDesignerCreateContextProvider>
                }>
                <Route path={CredentialDesignerRoute.DETAILS} element={<CredentialDesignerDetailsCreateContent />} />
                <Route path={CredentialDesignerRoute.VISUAL_DESIGN} element={<CredentialDesignerVisualDesignCreateContent />} />
                <Route path={CredentialDesignerRoute.CLAIMS} element={<CredentialDesignerClaimsCreateContent />} />
              </Route>
              <Route path={`${MainRoute.SUB_EDIT}/${MainRoute.SUB_ID}`} element={<CredentialDesignerEditWrapper />}>
                <Route path={CredentialDesignerRoute.DETAILS} element={<CredentialDesignerDetailsEditContent />} />
                <Route path={CredentialDesignerRoute.VISUAL_DESIGN} element={<CredentialDesignerVisualDesignEditContent />} />
                <Route path={CredentialDesignerRoute.CLAIMS} element={<CredentialDesignerClaimsEditContent />} />
              </Route>
            </Route>
            <Route path={MainRoute.SUB_ID} element={<ShowCredentialDetails credentialRole={CredentialRole.HOLDER} />} />
          </Route>
          <Route path={MainRoute.EINVOICE}>
            <Route index element={<EInvoiceListPage />} />
            <Route
              path={MainRoute.SUB_CREATE}
              element={
                <EInvoiceCreateContextProvider>
                  <EInvoiceCreatePage />
                </EInvoiceCreateContextProvider>
              }>
              <Route path={EInvoiceCreateRoute.DETAILS} element={<EInvoiceDetailsContent />} />
              <Route path={EInvoiceCreateRoute.RECIPIENT} element={<EInvoiceRecipientContent />} />
              <Route path={EInvoiceCreateRoute.EVIDENCE} element={<EInvoiceEvidenceContent />} />
              <Route path={EInvoiceCreateRoute.REVIEW} element={<EInvoiceReviewContent />} />
            </Route>
            <Route path="sent/:id" element={<SentInvoiceDetailPage />} />
            <Route path={MainRoute.SUB_ID} element={<InboxItemDetailPage />} />
          </Route>
          <Route path={MainRoute.INBOX}>
            <Route index element={<InboxPage />} />
            <Route path={`${InboxRoute.SUB_INBOX_NAME}/${InboxRoute.SUB_FOLDER_NAME}/${MainRoute.SUB_ID}`} element={<InboxItemDetailPage />} />
          </Route>
          <Route path={MainRoute.DOCUMENTS}>
            <Route index element={<DocumentsListPage />} />
          </Route>
          <Route path={MainRoute.OID4VCI}>
            <Route index element={<OID4VCIStateMachineComponent />} />
            <Route path={OID4VCIRoute.LOADING} element={<LoadingPage />} />
            <Route path={OID4VCIRoute.ADD_CONTACT} element={<AddContactPage />} />
            <Route path={OID4VCIRoute.SELECT_CREDENTIALS} element={<SelectCredentialsPage />} />
            <Route path={OID4VCIRoute.PIN_VERIFICATION} element={<PinVerificationPage />} />
            <Route path={OID4VCIRoute.AUTHORIZATION_CODE} element={<AuthorizationCodeUrlPage />} />
            <Route path={OID4VCIRoute.REVIEW_CREDENTIALS} element={<ReviewCredentialsPage />} />
            <Route path={OID4VCIRoute.ERROR} element={<Oid4vciErrorPage />} />
          </Route>
          <Route path={MainRoute.OID4VP}>
            <Route index element={<OID4VPStateMachineComponent />} />
            <Route path={SIOPV2Route.LOADING} element={<LoadingPage />} />
            <Route path={SIOPV2Route.INFORMATION_REQUEST} element={<InformationRequestPage />} />
            <Route path={SIOPV2Route.ERROR} element={<Siopv2ErrorPage />} />
          </Route>
          <Route path={MainRoute.KEY_MANAGEMENT}>
            <Route path={KeyManagementRoute.IDENTIFIERS}>
              <Route index element={<IdentifiersListPage />} />
              <Route
                path={MainRoute.SUB_CREATE}
                element={
                  <IdentifiersCreateContextProvider>
                    <IdentifierCreatePage />
                  </IdentifiersCreateContextProvider>
                }>
                <Route path={CreateIdentifierRoute.TYPE} element={<CreateIdentifierSelectTypeContent />} />
                <Route path={CreateIdentifierRoute.KEYS} element={<CreateIdentifierKeysContent />} />
                <Route path={CreateIdentifierRoute.SERVICE_ENDPOINTS} element={<CreateIdentifierAddServiceEndpointContent mode="create" />} />
                <Route path={CreateIdentifierRoute.SUMMARY} element={<CreateIdentifierSummaryContent />} />
              </Route>
              <Route
                path={`${MainRoute.SUB_EDIT}/${MainRoute.SUB_ID}`}
                element={
                  <IdentifiersEditContextProvider>
                    <IdentifierEditPage />
                  </IdentifiersEditContextProvider>
                }>
                <Route path={EditIdentifierRoute.ALIAS} element={<EditIdentifierContent />} />
                <Route path={EditIdentifierRoute.KEYS} element={<EditIdentifierKeysContent />} />
                <Route path={EditIdentifierRoute.SERVICE_ENDPOINTS} element={<CreateIdentifierAddServiceEndpointContent mode="edit" />} />
              </Route>
              <Route path={`${MainRoute.SUB_SHOW}/${MainRoute.SUB_ID}`} element={<ShowIdentifierDetails />} />
            </Route>
            <Route path={KeyManagementRoute.KEYS}>
              <Route index element={<KeysListPage />} />
              <Route path={`${MainRoute.SUB_SHOW}/${MainRoute.SUB_ID}`} element={<KeyShowPage />} />
            </Route>
          </Route>
          <Route path={MainRoute.QUERY_MANAGEMENT}>
            <Route index element={<PresentationDefinitionsListPage />} />
            <Route path={MainRoute.SUB_ID} element={<PresentationDefinitionPage mode="show" />}></Route>
            <Route path={MainRoute.SUB_CREATE} element={<PresentationDefinitionPage mode="create" />}></Route>
            <Route path={`${MainRoute.SUB_EDIT}/${MainRoute.SUB_ID}`} element={<PresentationDefinitionPage mode="edit" />}></Route>
          </Route>
        </Route>
        <Route
          element={
            <Authenticated key={'secureOutletWrapper'} v3LegacyAuthProviderCompatible={false}>
              <Outlet />
            </Authenticated>
          }>
          <Route path="*" element={<ErrorComponent />} />
        </Route>
      </Routes>
    </NavigationProvider>
  )
}

export default AppRouter

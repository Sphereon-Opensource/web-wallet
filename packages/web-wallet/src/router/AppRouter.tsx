import {Authenticated, ErrorComponent, useLogin} from '@refinedev/core'
import React, {PropsWithChildren, useEffect} from 'react'
import {Outlet, Route, Routes} from 'react-router-dom'
import AssetsListPage from '../../pages/assets'
import AssetsCreatePage from '../../pages/assets/create'
import ShowAssetDetails from '../../pages/assets/show'
import WorkflowListPage from '../../pages/workflows'
import ContactsListPage from '../../pages/contacts'
import DocumentsListPage from '../../pages/documents'
import ContactsCreatePage from '../../pages/contacts/create'
import CreateNaturalPersonPersonalInfoContent from '@components/views/CreateNaturalPersonPersonalInfoContent'
import {NaturalPersonContextProvider} from '@machines/contacts/contactsStateNavigation'
import CreateNaturalPersonOrganizationContent from '@components/views/CreateNaturalPersonOrganizationContent'
import CreateNaturalPersonReviewContactContent from '@components/views/CreateNaturalPersonReviewContactContent'
import CreateNaturalPersonRoleContent from '@components/views/CreateNaturalPersonRoleContent'
import {AssetContextProvider} from '@machines/assets/assetsStateNavigation'
import AddOwnerContactToAsset from '@components/views/AddOwnerContactToAsset'
import DefineAssetProductContent from 'src/components/views/DefineAssetProductContent'
import AddDocumentsContent from '@components/views/AddDocumentsContent'
import GetAssetSummaryContent from 'src/components/views/GetAssetSummaryContent'
import GetPublishAssetContent from 'src/components/views/GetPublishAssetContent'
import CredentialsListPage from '../../pages/credentials'
import CredentialsCreatePage from '../../pages/credentials/create'
import {CredentialsCreateContextProvider} from '@machines/credentials/credentialsCreateStateNavigation'
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
  AssetCreateSubRoute,
  ContactRoute,
  CreateIdentifierRoute,
  IssueCredentialRoute,
  KeyManagementRoute,
  MainRoute,
  NaturalPersonCreationRoute,
  OID4VCIRoute,
  SIOPV2Route,
  OrganizationContactCreationRoute,
} from '@typings'
import CreateIdentifierKeysContent from '@components/views/CreateIdentifierKeysContent'
import CreateIdentifierAddServiceEndpointContent from '@components/views/CreateIdentifierAddServiceEndpointContent'
import CreateIdentifierSummaryContent from '@components/views/CreateIdentifierSummaryContent'
import PresentationDefinitionPage from 'pages/presentationDefinitions/details'
import KeysListPage from '../../pages/keyManagement/keys'
import OID4VPStateMachineComponent from '../../pages/siopv2'
import InformationRequestPage from '../../pages/siopv2/informationRequest'
import Siopv2ErrorPage from '@/pages/siopv2/error'
import {NavigationProvider} from './NavigationContext'
import {CredentialRole} from '@sphereon/ssi-sdk.data-store'
import ShowContactDetails from "@/pages/contacts/show";

const KeycloakLoginPage = (props: PropsWithChildren<any>) => {
  const {mutate: login} = useLogin()
  useEffect(() => {
    login({})
  }, [login])
  return props.children
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
          {/*Code added to fix issue with the initial page which includes the local in URL. The workaround is to redirect to /credentials*/}
          {/*{[MainRoute.ROOT, MainRoute.EN_CREDENTIALS, MainRoute.NL_CREDENTIALS].map((path: string, index: number) => {
          return <Route key={index} path={path} element={<Navigate to={MainRoute.CREDENTIALS} />} />
        })}*/}
          <Route path={MainRoute.ASSETS}>
            <Route index element={<AssetsListPage />} />
            <Route
              path={MainRoute.SUB_CREATE}
              element={
                <AssetContextProvider>
                  <AssetsCreatePage />
                </AssetContextProvider>
              }>
              <Route path={AssetCreateSubRoute.CONTACTS} element={<AddOwnerContactToAsset />} />
              <Route path={AssetCreateSubRoute.PRODUCTS} element={<DefineAssetProductContent />} />
              <Route path={AssetCreateSubRoute.DOCUMENTS} element={<AddDocumentsContent />} />
              <Route path={AssetCreateSubRoute.SUMMARY} element={<GetAssetSummaryContent />} />
              <Route path={AssetCreateSubRoute.PUBLISH} element={<GetPublishAssetContent />} />
            </Route>
            <Route path={MainRoute.SUB_ID} element={<ShowAssetDetails />} />
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
            <Route path={MainRoute.SUB_ID} element={<ShowContactDetails/>} />
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
            <Route path={MainRoute.SUB_ID} element={<ShowCredentialDetails credentialRole={CredentialRole.HOLDER} />} />
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
              {/*<Route
              path={MainRoute.SUB_CREATE}
              element={
                <IdentifiersCreateContextProvider>
                  <IdentifierCreatePage />
                </IdentifiersCreateContextProvider>
              }>
              <Route path={CreateIdentifierRoute.TYPE} element={<CreateIdentifierSelectTypeContent />} />
              <Route path={CreateIdentifierRoute.KEYS} element={<CreateIdentifierKeysContent />} />
              <Route path={CreateIdentifierRoute.SERVICE_ENDPOINTS} element={<CreateIdentifierAddServiceEndpointContent />} />
              <Route path={CreateIdentifierRoute.SUMMARY} element={<CreateIdentifierSummaryContent />} />
            </Route>*/}
            </Route>
            <Route path={KeyManagementRoute.KEYS}>
              <Route index element={<KeysListPage />} />
              {/*<Route
              path={MainRoute.SUB_CREATE}
              element={
                <IdentifiersCreateContextProvider>
                  <IdentifierCreatePage />
                </IdentifiersCreateContextProvider>
              }>
              <Route path={CreateIdentifierRoute.TYPE} element={<CreateIdentifierSelectTypeContent />} />
              <Route path={CreateIdentifierRoute.KEYS} element={<CreateIdentifierKeysContent />} />
              <Route path={CreateIdentifierRoute.SERVICE_ENDPOINTS} element={<CreateIdentifierAddServiceEndpointContent />} />
              <Route path={CreateIdentifierRoute.SUMMARY} element={<CreateIdentifierSummaryContent />} />
            </Route>*/}
            </Route>
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
                <Route path={CreateIdentifierRoute.SERVICE_ENDPOINTS} element={<CreateIdentifierAddServiceEndpointContent />} />
                <Route path={CreateIdentifierRoute.SUMMARY} element={<CreateIdentifierSummaryContent />} />
              </Route>
            </Route>
            <Route path={KeyManagementRoute.KEYS}>
              <Route index element={<KeysListPage />} />
            </Route>
          </Route>
          <Route path={MainRoute.PRESENTATION_DEFINITIONS}>
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

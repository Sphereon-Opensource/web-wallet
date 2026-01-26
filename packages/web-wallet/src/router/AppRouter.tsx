import {Authenticated, ErrorComponent, useLogin} from '@refinedev/core'
import React, {FC, PropsWithChildren, ReactElement, useEffect} from 'react'
import {Navigate, Outlet, Route, Routes, useParams} from 'react-router-dom'
import {RoleType} from '@sphereon/ui-components.core'
import AssetsListPage from '../../pages/assets'
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
  BookingAdminRoute,
  BookingCreateRoute,
  BookingRoute,
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
import ShowContactDetails from '@/pages/contacts/show'
import EditIdentifierContent from '@components/views/EditIdentifierContent'
import EditIdentifierKeysContent from '@components/views/EditIdentifierKeysContent'
import {IdentifiersEditContextProvider} from '@machines/identifiers/identifiersEditStateNavigation'
import IdentifierEditPage from '@/pages/keyManagement/identifiers/edit'
import ShowIdentifierDetails from '@/pages/keyManagement/identifiers/show'
import ShowExternalIdentifierDetails from '@/pages/keyManagement/identifiers/external/show'
import CredentialDesignerCreateContextProvider from '@machines/credentials/credentialDesignerCreateStateNavigation'
import CredentialDesignerCreatePage from '@/pages/credentials/design/create'
import CredentialDesignerClaimsCreateContent from '@components/views/CredentialDesignerClaimsCreateContent'
import CredentialDesignerDetailsCreateContent from '@components/views/CredentialDesignerDetailsCreateContent'
import CredentialDesignsListPage from '@/pages/credentials/design'
import CredentialDesignerEditPage from '@/pages/credentials/design/edit'
import ShowCredentialDesignDetails from '@/pages/credentials/design/show'
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
import CanAccessRoute, {AdminOnly, BookerOrAdmin} from '@components/auth/CanAccessRoute'
import BookingResourcesPage from '../../pages/booking/resources'
import BookingResourceDetailPage from '../../pages/booking/resources/[id]'
import MyBookingsPage from '../../pages/booking/my-bookings'
import BookingVerificationPage from '../../pages/booking/create/verification'
import BookingConfirmationPage from '../../pages/booking/create/confirmation'
import AdminResourcesPage from '../../pages/booking/admin/resources'
import AdminResourceCreatePage from '../../pages/booking/admin/resources/create'
import AdminResourceEditPage from '../../pages/booking/admin/resources/edit/[id]'
import AdminResourceDetailPage from '../../pages/booking/admin/resources/[id]'
import AdminCategoriesPage from '../../pages/booking/admin/categories'
import AdminCategoryDetailPage from '../../pages/booking/admin/categories/[id]'
import AdminCategoryCreatePage from '../../pages/booking/admin/categories/create'
import AdminPoliciesPage from '../../pages/booking/admin/policies'
import AdminPolicyDetailPage from '../../pages/booking/admin/policies/[id]'
import AdminPolicyCreatePage from '../../pages/booking/admin/policies/create'
import AdminSchedulesPage from '../../pages/booking/admin/schedules'
import AdminScheduleDetailPage from '../../pages/booking/admin/schedules/[id]'
import AdminScheduleCreatePage from '../../pages/booking/admin/schedules/create'
import AdminScheduleEditPage from '../../pages/booking/admin/schedules/[id]/edit'
import AdminGroupsPage from '../../pages/booking/admin/groups'
import AdminGroupDetailPage from '../../pages/booking/admin/groups/[id]'
import AdminGroupCreatePage from '../../pages/booking/admin/groups/create'
import AdminGroupEditPage from '../../pages/booking/admin/groups/[id]/edit'

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

          {/* Assets - Holder and Admin */}
          <Route path={MainRoute.ASSETS}>
            <Route
              index
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <AssetsListPage />
                </CanAccessRoute>
              }
            />
          </Route>

          {/* Contacts - All roles */}
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

          {/* Credentials - All roles can view, but create/designs require specific roles */}
          <Route path={MainRoute.CREDENTIALS}>
            <Route index element={<CredentialsListPage />} />
            {/* Credential creation - Issuer and Admin only */}
            <Route
              path={MainRoute.SUB_CREATE}
              element={
                <CanAccessRoute allowedRoles={[RoleType.ISSUER, RoleType.ADMIN]}>
                  <CredentialsCreateContextProvider>
                    <CredentialsCreatePage />
                  </CredentialsCreateContextProvider>
                </CanAccessRoute>
              }>
              <Route path={IssueCredentialRoute.DETAILS} element={<IssueCredentialEnterDetailsContent />} />
              <Route path={IssueCredentialRoute.ISSUE_METHOD} element={<IssueCredentialIssueMethodContent />} />
            </Route>
            {/* Credential designs - Issuer and Admin only */}
            <Route path={MainRoute.DESIGNS}>
              <Route
                index
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ISSUER, RoleType.ADMIN]}>
                    <CredentialDesignsListPage />
                  </CanAccessRoute>
                }
              />
              <Route
                path={MainRoute.SUB_CREATE}
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ISSUER, RoleType.ADMIN]}>
                    <CredentialDesignerCreateContextProvider>
                      <CredentialDesignerCreatePage />
                    </CredentialDesignerCreateContextProvider>
                  </CanAccessRoute>
                }>
                <Route path={CredentialDesignerRoute.DETAILS} element={<CredentialDesignerDetailsCreateContent />} />
                <Route path={CredentialDesignerRoute.VISUAL_DESIGN} element={<CredentialDesignerVisualDesignCreateContent />} />
                <Route path={CredentialDesignerRoute.CLAIMS} element={<CredentialDesignerClaimsCreateContent />} />
              </Route>
              <Route
                path={`${MainRoute.SUB_EDIT}/${MainRoute.SUB_ID}`}
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ISSUER, RoleType.ADMIN]}>
                    <CredentialDesignerEditWrapper />
                  </CanAccessRoute>
                }>
                <Route path={CredentialDesignerRoute.DETAILS} element={<CredentialDesignerDetailsEditContent />} />
                <Route path={CredentialDesignerRoute.VISUAL_DESIGN} element={<CredentialDesignerVisualDesignEditContent />} />
                <Route path={CredentialDesignerRoute.CLAIMS} element={<CredentialDesignerClaimsEditContent />} />
              </Route>
              <Route
                path={`${MainRoute.SUB_SHOW}/${MainRoute.SUB_ID}`}
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ISSUER, RoleType.ADMIN]}>
                    <ShowCredentialDesignDetails />
                  </CanAccessRoute>
                }
              />
            </Route>
            <Route path={MainRoute.SUB_ID} element={<ShowCredentialDetails />} />
          </Route>

          {/* eInvoice - Holder and Admin */}
          <Route path={MainRoute.EINVOICE}>
            <Route
              index
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <EInvoiceListPage />
                </CanAccessRoute>
              }
            />
            <Route
              path={MainRoute.SUB_CREATE}
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <EInvoiceCreateContextProvider>
                    <EInvoiceCreatePage />
                  </EInvoiceCreateContextProvider>
                </CanAccessRoute>
              }>
              <Route path={EInvoiceCreateRoute.DETAILS} element={<EInvoiceDetailsContent />} />
              <Route path={EInvoiceCreateRoute.RECIPIENT} element={<EInvoiceRecipientContent />} />
              <Route path={EInvoiceCreateRoute.EVIDENCE} element={<EInvoiceEvidenceContent />} />
              <Route path={EInvoiceCreateRoute.REVIEW} element={<EInvoiceReviewContent />} />
            </Route>
            <Route
              path="sent/:id"
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <SentInvoiceDetailPage />
                </CanAccessRoute>
              }
            />
            <Route
              path={MainRoute.SUB_ID}
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <InboxItemDetailPage />
                </CanAccessRoute>
              }
            />
          </Route>

          {/* Inbox - Holder and Admin */}
          <Route path={MainRoute.INBOX}>
            <Route
              index
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <InboxPage />
                </CanAccessRoute>
              }
            />
            <Route
              path={`${InboxRoute.SUB_INBOX_NAME}/${InboxRoute.SUB_FOLDER_NAME}/${MainRoute.SUB_ID}`}
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <InboxItemDetailPage />
                </CanAccessRoute>
              }
            />
          </Route>

          {/* Documents - Holder and Admin */}
          <Route path={MainRoute.DOCUMENTS}>
            <Route
              index
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <DocumentsListPage />
                </CanAccessRoute>
              }
            />
          </Route>

          {/* Booking - Booker and Admin */}
          <Route path={MainRoute.BOOKING}>
            <Route index element={<Navigate to={`${MainRoute.BOOKING}/${BookingRoute.RESOURCES}`} replace />} />
            <Route
              path={BookingRoute.RESOURCES}
              element={
                <BookerOrAdmin>
                  <BookingResourcesPage />
                </BookerOrAdmin>
              }
            />
            <Route
              path={`${BookingRoute.RESOURCES}/:id`}
              element={
                <BookerOrAdmin>
                  <BookingResourceDetailPage />
                </BookerOrAdmin>
              }
            />
            <Route
              path={BookingRoute.MY_BOOKINGS}
              element={
                <BookerOrAdmin>
                  <MyBookingsPage />
                </BookerOrAdmin>
              }
            />
            {/* Booking wizard */}
            <Route path={BookingRoute.CREATE}>
              <Route
                path={BookingCreateRoute.VERIFICATION}
                element={
                  <BookerOrAdmin>
                    <BookingVerificationPage />
                  </BookerOrAdmin>
                }
              />
              <Route
                path={BookingCreateRoute.CONFIRMATION}
                element={
                  <BookerOrAdmin>
                    <BookingConfirmationPage />
                  </BookerOrAdmin>
                }
              />
            </Route>
            {/* Admin routes - Admin only */}
            <Route path={BookingRoute.ADMIN}>
              {/* Resources */}
              <Route path={BookingAdminRoute.RESOURCES}>
                <Route
                  index
                  element={
                    <AdminOnly>
                      <AdminResourcesPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path={MainRoute.SUB_CREATE}
                  element={
                    <AdminOnly>
                      <AdminResourceCreatePage />
                    </AdminOnly>
                  }
                />
                <Route
                  path=":id"
                  element={
                    <AdminOnly>
                      <AdminResourceDetailPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path={`${MainRoute.SUB_EDIT}/:id`}
                  element={
                    <AdminOnly>
                      <AdminResourceEditPage />
                    </AdminOnly>
                  }
                />
              </Route>
              {/* Categories */}
              <Route path={BookingAdminRoute.CATEGORIES}>
                <Route
                  index
                  element={
                    <AdminOnly>
                      <AdminCategoriesPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path={MainRoute.SUB_CREATE}
                  element={
                    <AdminOnly>
                      <AdminCategoryCreatePage />
                    </AdminOnly>
                  }
                />
                <Route
                  path=":id"
                  element={
                    <AdminOnly>
                      <AdminCategoryDetailPage />
                    </AdminOnly>
                  }
                />
              </Route>
              {/* Policies */}
              <Route path={BookingAdminRoute.POLICIES}>
                <Route
                  index
                  element={
                    <AdminOnly>
                      <AdminPoliciesPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path={MainRoute.SUB_CREATE}
                  element={
                    <AdminOnly>
                      <AdminPolicyCreatePage />
                    </AdminOnly>
                  }
                />
                <Route
                  path=":id"
                  element={
                    <AdminOnly>
                      <AdminPolicyDetailPage />
                    </AdminOnly>
                  }
                />
              </Route>
              {/* Schedules */}
              <Route path={BookingAdminRoute.SCHEDULES}>
                <Route
                  index
                  element={
                    <AdminOnly>
                      <AdminSchedulesPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path={MainRoute.SUB_CREATE}
                  element={
                    <AdminOnly>
                      <AdminScheduleCreatePage />
                    </AdminOnly>
                  }
                />
                <Route
                  path=":id"
                  element={
                    <AdminOnly>
                      <AdminScheduleDetailPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path=":id/edit"
                  element={
                    <AdminOnly>
                      <AdminScheduleEditPage />
                    </AdminOnly>
                  }
                />
              </Route>
              {/* Groups */}
              <Route path={BookingAdminRoute.GROUPS}>
                <Route
                  index
                  element={
                    <AdminOnly>
                      <AdminGroupsPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path={MainRoute.SUB_CREATE}
                  element={
                    <AdminOnly>
                      <AdminGroupCreatePage />
                    </AdminOnly>
                  }
                />
                <Route
                  path=":id"
                  element={
                    <AdminOnly>
                      <AdminGroupDetailPage />
                    </AdminOnly>
                  }
                />
                <Route
                  path=":id/edit"
                  element={
                    <AdminOnly>
                      <AdminGroupEditPage />
                    </AdminOnly>
                  }
                />
              </Route>
            </Route>
          </Route>

          {/* OID4VCI - Holder and Admin (credential receiving flow) */}
          <Route path={MainRoute.OID4VCI}>
            <Route
              index
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <OID4VCIStateMachineComponent />
                </CanAccessRoute>
              }
            />
            <Route path={OID4VCIRoute.LOADING} element={<LoadingPage />} />
            <Route path={OID4VCIRoute.ADD_CONTACT} element={<AddContactPage />} />
            <Route path={OID4VCIRoute.SELECT_CREDENTIALS} element={<SelectCredentialsPage />} />
            <Route path={OID4VCIRoute.PIN_VERIFICATION} element={<PinVerificationPage />} />
            <Route path={OID4VCIRoute.AUTHORIZATION_CODE} element={<AuthorizationCodeUrlPage />} />
            <Route path={OID4VCIRoute.REVIEW_CREDENTIALS} element={<ReviewCredentialsPage />} />
            <Route path={OID4VCIRoute.ERROR} element={<Oid4vciErrorPage />} />
          </Route>

          {/* OID4VP/SIOPv2 - Holder and Admin (presentation flow) */}
          <Route path={MainRoute.OID4VP}>
            <Route
              index
              element={
                <CanAccessRoute allowedRoles={[RoleType.HOLDER, RoleType.ADMIN]}>
                  <OID4VPStateMachineComponent />
                </CanAccessRoute>
              }
            />
            <Route path={SIOPV2Route.LOADING} element={<LoadingPage />} />
            <Route path={SIOPV2Route.INFORMATION_REQUEST} element={<InformationRequestPage />} />
            <Route path={SIOPV2Route.ERROR} element={<Siopv2ErrorPage />} />
          </Route>

          {/* Key Management - Admin only */}
          <Route path={MainRoute.KEY_MANAGEMENT}>
            <Route path={KeyManagementRoute.IDENTIFIERS}>
              <Route
                index
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
                    <IdentifiersListPage />
                  </CanAccessRoute>
                }
              />
              <Route
                path={MainRoute.SUB_CREATE}
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
                    <IdentifiersCreateContextProvider>
                      <IdentifierCreatePage />
                    </IdentifiersCreateContextProvider>
                  </CanAccessRoute>
                }>
                <Route path={CreateIdentifierRoute.TYPE} element={<CreateIdentifierSelectTypeContent />} />
                <Route path={CreateIdentifierRoute.KEYS} element={<CreateIdentifierKeysContent />} />
                <Route path={CreateIdentifierRoute.SERVICE_ENDPOINTS} element={<CreateIdentifierAddServiceEndpointContent mode="create" />} />
                <Route path={CreateIdentifierRoute.SUMMARY} element={<CreateIdentifierSummaryContent />} />
              </Route>
              <Route
                path={`${MainRoute.SUB_EDIT}/${MainRoute.SUB_ID}`}
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
                    <IdentifiersEditContextProvider>
                      <IdentifierEditPage />
                    </IdentifiersEditContextProvider>
                  </CanAccessRoute>
                }>
                <Route path={EditIdentifierRoute.ALIAS} element={<EditIdentifierContent />} />
                <Route path={EditIdentifierRoute.KEYS} element={<EditIdentifierKeysContent />} />
                <Route path={EditIdentifierRoute.SERVICE_ENDPOINTS} element={<CreateIdentifierAddServiceEndpointContent mode="edit" />} />
              </Route>
              <Route
                path={`${MainRoute.SUB_SHOW}/${MainRoute.SUB_ID}`}
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
                    <ShowIdentifierDetails />
                  </CanAccessRoute>
                }
              />
              <Route
                path={`external/${MainRoute.SUB_SHOW}/${MainRoute.SUB_ID}`}
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
                    <ShowExternalIdentifierDetails />
                  </CanAccessRoute>
                }
              />
            </Route>
            <Route path={KeyManagementRoute.KEYS}>
              <Route
                index
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
                    <KeysListPage />
                  </CanAccessRoute>
                }
              />
              <Route
                path={`${MainRoute.SUB_SHOW}/${MainRoute.SUB_ID}`}
                element={
                  <CanAccessRoute allowedRoles={[RoleType.ADMIN]}>
                    <KeyShowPage />
                  </CanAccessRoute>
                }
              />
            </Route>
          </Route>

          {/* Query Management - Verifier (Relying Party) and Admin */}
          <Route path={MainRoute.QUERY_MANAGEMENT}>
            <Route
              index
              element={
                <CanAccessRoute allowedRoles={[RoleType.RELYING_PARTY, RoleType.ADMIN]}>
                  <PresentationDefinitionsListPage />
                </CanAccessRoute>
              }
            />
            <Route
              path={MainRoute.SUB_ID}
              element={
                <CanAccessRoute allowedRoles={[RoleType.RELYING_PARTY, RoleType.ADMIN]}>
                  <PresentationDefinitionPage mode="show" />
                </CanAccessRoute>
              }
            />
            <Route
              path={MainRoute.SUB_CREATE}
              element={
                <CanAccessRoute allowedRoles={[RoleType.RELYING_PARTY, RoleType.ADMIN]}>
                  <PresentationDefinitionPage mode="create" />
                </CanAccessRoute>
              }
            />
            <Route
              path={`${MainRoute.SUB_EDIT}/${MainRoute.SUB_ID}`}
              element={
                <CanAccessRoute allowedRoles={[RoleType.RELYING_PARTY, RoleType.ADMIN]}>
                  <PresentationDefinitionPage mode="edit" />
                </CanAccessRoute>
              }
            />
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

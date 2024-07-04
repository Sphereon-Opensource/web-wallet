export enum MainRoute {
  ASSETS = '/assets',
  WORKFLOW = '/workflow',
  CONTACTS = '/contacts',
  CREDENTIALS = '/credentials',
  DOCUMENTS = '/documents',
  EN_CREDENTIALS = '/en/credentials',
  NL_CREDENTIALS = '/nl/credentials',
  ROOT = '/',
  SETTINGS = '/settings',
  SUB_CREATE = 'create',
  SUB_EDIT = 'edit',
  SUB_ID = ':id',
  OID4VCI = '/oid4vci',
  KEY_MANAGEMENT = '/key-management',
  PRESENTATION_DEFINITIONS = '/presentation_definitions',
  OID4VP = '/siopv2',
}

export enum AssetCreateSubRoute {
  CONTACTS = 'contacts',
  PRODUCTS = 'products',
  DOCUMENTS = 'documents',
  SUMMARY = 'summary',
  PUBLISH = 'publish',
}
export enum NaturalPersonCreationRoute {
  PERSONAL_INFO = 'personal-info',
  PHYSICAL_ADDRESS = 'physical-address',
  ORGANIZATION = 'organization',
  ROLE = 'role',
  REVIEW = 'review',
}

export enum DetailRoute {
  DETAILS = 'details',
  EVENTS = 'events',
  DOCUMENTS = 'documents',
  DOCUMENTS_REPORTS = 'documents-reports',
  DOCUMENTS_CERTIFICATES = 'documents-certificates',
  DOCUMENTS_OTHER_FILES = 'documents-other_files',
  DOCUMENTS_VCS = 'documents-vcs',
  INVOLVED_CONTACTS = 'involved-contacts',
}

export enum IssueCredentialRoute {
  DETAILS = 'details',
  ISSUE_METHOD = 'method',
}

export enum OID4VCIRoute {
  LOADING = 'loading',
  ADD_CONTACT = 'add-contact',
  SELECT_CREDENTIALS = 'select-credentials',
  PIN_VERIFICATION = 'pin-verification',
  AUTHORIZATION_CODE = 'authorization-code',
  REVIEW_CREDENTIALS = 'review-credentials',
  ERROR = 'error',
}

export enum SIOPV2Route {
  LOADING = 'loading',
  INFORMATION_REQUEST = 'information-request',
  ERROR = 'error',
}

export enum OrganizationContactCreationRoute {
  ORGANIZATION_INFO = 'organization-info',
  PHYSICAL_ADDRESS = 'physical-address',
  REVIEW = 'review',
}

export enum ContactRoute {
  ORGANIZATION = 'organizations',
  NATURAL_PERSON = 'individuals',
}

export enum KeyManagementRoute {
  IDENTIFIERS = 'identifiers',
  KEYS = 'keys',
}

export enum CreateIdentifierRoute {
  TYPE = 'type',
  KEYS = 'keys',
  SERVICE_ENDPOINTS = 'service_endpoints',
  SUMMARY = 'summary',
}

import {ICredentialIssuer, ICredentialPlugin, IDIDManager, IResolver} from '@veramo/core'
import {IVcApiIssuerClient} from '@sphereon/ssi-sdk.w3c-vc-api-issuer-rest-client'
import {IOID4VCIRestClient} from '@sphereon/ssi-sdk.oid4vci-issuer-rest-client'
import {IQRCodeGenerator} from '@sphereon/ssi-sdk.qr-code-generator'
import {IOID4VCIHolder} from '@sphereon/ssi-sdk.oid4vci-holder'
import {IContactManager} from '@sphereon/ssi-sdk.contact-manager'
import {IIssuanceBranding} from '@sphereon/ssi-sdk.issuance-branding'
import {IEventLogger} from '@sphereon/ssi-sdk.event-logger'
import {ISphereonKeyManager} from '@sphereon/ssi-sdk-ext.key-manager'
import {IPDManager} from '@sphereon/ssi-sdk.pd-manager'
import {IDidAuthSiopOpAuthenticator} from '@sphereon/ssi-sdk.siopv2-oid4vp-op-auth'

export type TAgentTypes = IResolver &
  IVcApiIssuerClient &
  IOID4VCIRestClient &
  IQRCodeGenerator &
  IOID4VCIHolder &
  IContactManager &
  IIssuanceBranding &
  ICredentialPlugin &
  IEventLogger &
  ISphereonKeyManager &
  IDIDManager &
  IPDManager &
  IDidAuthSiopOpAuthenticator &
  ICredentialIssuer

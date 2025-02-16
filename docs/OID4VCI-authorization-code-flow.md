<h1 align="center">
  <br>
  <a href="https://www.sphereon.com"><img src="https://sphereon.com/content/themes/sphereon/assets/img/logo.svg" alt="Sphereon" width="400"></a>
    <br>Authorization Code Flow
  <br>
</h1>

# Background

The agent supports both the simpler OID4VCI pre-authorized_code out of the box flow as well as the authorization code
flow using an external OpenID Connect server. This README is about configuring the Authorization Code flow.

# REST APIs

## Creating a credential offer

Please see the below payload descriptions to create a credential offer. Both pre-authorized code grants as well as
authorization-code grants are
supported.
You provide these in the `credential_offer` payload. Additionally, you need to include the `credential_issuer`, as the
agent can support
multiple issuers at the same time.
multiple credential issuers simultaneously.
The default Create (POST) endpoint is enabled at:
https://agent/webapp/credential-offers. It then would result in a new offer created
at https://agent/webapp/credential-offers/:unique-id as returned
in the create response.
The path is configurable when creating the issuer. By default, all "admin" endpoints can be found under the path "
/webapp". These endpoints should be

typically IP/network protected, with authentication enabled. Without these, anyone would be able to create a session!

The create credential offer request follows the below interface and needs to be provided in the body of the POST request
to the URL above.

`scheme` can be used for instance when targeting web based wallets (https) instead of deeplinks (
openid-credential-offer)

```typescript
export interface CredentialOfferRESTRequest {
    baseUri?: string
    scheme?: string
    pinLength?: number
    qrCodeOpts?: QRCodeOpts
    /**
     * This is just a type alias for `any`. The idea is that the data already is the form of a JSON-LD, SD-JWT, JWT credential without the proof
     * Optional storage that can help the credential Data Supplier. For instance to store credential input data during offer creation, if no additional data can be supplied later on
     */
    credentialDataSupplierInput?: CredentialDataSupplierInput
}

export interface CredentialOfferPayloadV1_0_13 {
    /**
     * REQUIRED. The URL of the Credential Issuer, as defined in the OID4VCI spec, from which the Wallet is requested to
     * obtain one or more Credentials. The Wallet uses it to obtain the Credential Issuer's Metadata following the steps
     * defined in OID4VCI
     */
    credential_issuer: string

    /**
     *  REQUIRED. Array of unique strings that each identify one of the keys in the name/value pairs stored in
     *  the credential_configurations_supported Credential Issuer metadata. The Wallet uses these string values
     *  to obtain the respective object that contains information about the Credential being offered as defined
     *  in Section 11.2.3. For example, these string values can be used to obtain scope values to be used in
     *  the Authorization Request.
     */
    credential_configuration_ids: string[]
    /**
     * OPTIONAL. A JSON object indicating to the Wallet the Grant Types the Credential Issuer's AS is prepared
     * to process for this credential offer. Every grant is represented by a key and an object.
     * The key value is the Grant Type identifier, the object MAY contain parameters either determining the way
     * the Wallet MUST use the particular grant and/or parameters the Wallet MUST send with the respective request(s).
     * If grants is not present or empty, the Wallet MUST determine the Grant Types the Credential Issuer's AS supports
     * using the respective metadata. When multiple grants are present, it's at the Wallet's discretion which one to use.
     */
    grants?: Grant

    /**
     * Some implementations might need a client_id in the offer.
     * For instance EBSI in a same-device flow. (Cross-device tucks it in the state JWT).
     * Also whenever a form of trust-establishment is used a client_id is typically used, as an OID4VCI Issuer is regared as an OAuth2 Resource Server.
     */
    client_id?: string
}
```

A very simple example request for an Authorization Code flow would look like this:

```json
{
  "credential_configuration_ids": [
    "https://raw.githubusercontent.com/Sphereon-Opensource/vc-contexts/refs/heads/master/funke/sd-jwt-metadata/age_group.json"
  ],
  "grants": {
    "authorization_code": {
      "issuer_state": "state_value"
    }
  },
  "credentialDataSupplierInput": {
    "ageOver": "18"
  }
}

```

The response to the creation request is an object with a URI value in it. You can use this `uri` value directly in a QR
code or in a link (so do not
use the whole response)

```json
{
  "uri": "openid-credential-offer://?credential_offer=%7B%22credential_issuer%22%3A%22https%3A%2F%2Ffunke-oidf.demo.sphereon.com%2Fagent%2Foid4vci%22%2C%22credential_configuration_ids%22%3A%5B%22https%3A%2F%2Fraw.githubusercontent.com%2FSphereon-Opensource%2Fvc-contexts%2Frefs%2Fheads%2Fmaster%2Ffunke%2Fsd-jwt-metadata%2Fage_group.json%22%5D%2C%22grants%22%3A%7B%22urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code%22%3A%7B%22pre-authorized_code%22%3A%kkfvVcqPY83ciabJAeVo35%22%7D%7D%7D"
}
```

### Pre-authorized code and Authorization code grant

The `grants` object above needs to conform to the below interface. Either an authorization_code pre-authorized_code or
both can be used. You however
cannot skip both.

Whenever a pre-authorized_code is being used, it is assumed that the Credential Issuer is creating the offer in an
environment where the user/holder
has already authenticated somehow. We advise to use Transaction/PIN codes to prevent session hijacking to a certain
extent, as that is very easy to
accomplish in a cross-device context where QR codes are used, assuming the user has already been authenticated.

In the Issuer configuration you can provide an optional external authorization_server, by default the built-in
authorization server will be used. Once you enable an external authorization server, you can use the authorization code
flow as well.
Be aware that the build in Authorization Server, only implements the token_endpoint, meaning that you can only use the
pre-authorized code flow with it, as the Authorization endpoint simply is not implemented in the internal AS.

Although it is technically possible to reuse the same pre-authorization_code for multiple offers, we do not advise this
and recommend always creating
a unique code per offer. Reason is that the issuer has an internal state where it keeps track of the progress. This for
instance can be used by the
a unique code per offer. The reason is that the issuer maintains an internal state to track progress. This can, for
instance, be used by the

```typescript
export interface Grant {
    authorization_code?: GrantAuthorizationCode
    'urn:ietf:params:oauth:grant-type:pre-authorized_code'?: GrantUrnIetf
}

export interface GrantAuthorizationCode {
    /**
     * OPTIONAL. String value created by the Credential Issuer and opaque to the Wallet that is used to bind the subsequent
     * Authorization Request with the Credential Issuer to a context set up during previous steps.
     */
    issuer_state?: string

    // v12 feature
    /**
     * OPTIONAL string that the Wallet can use to identify the Authorization Server to use with this grant type when authorization_servers parameter in the Credential Issuer metadata has multiple entries. MUST NOT be used otherwise. The value of this parameter MUST match with one of the values in the authorization_servers array obtained from the Credential Issuer metadata
     */
    authorization_server?: string
}

export interface GrantUrnIetf {
    /**
     * REQUIRED. The code representing the Credential Issuer's authorization for the Wallet to obtain Credentials of a certain type.
     */
    'pre-authorized_code': string

    // v13
    /**
     * OPTIONAL. Object specifying whether the Authorization Server expects presentation of a Transaction Code by the
     * End-User along with the Token Request in a Pre-Authorized Code Flow. If the Authorization Server does not expect a
     * Transaction Code, this object is absent; this is the default. The Transaction Code is intended to bind the Pre-Authorized
     * Code to a certain transaction to prevent replay of this code by an attacker that, for example, scanned the QR code while
     * standing behind the legitimate End-User. It is RECOMMENDED to send the Transaction Code via a separate channel. If the Wallet
     * decides to use the Pre-Authorized Code Flow, the Transaction Code value MUST be sent in the tx_code parameter with
     * the respective Token Request as defined in Section 6.1. If no length or description is given, this object may be empty,
     * indicating that a Transaction Code is required.
     */
    tx_code?: TxCode

    // v12, v13
    /**
     * OPTIONAL. The minimum amount of time in seconds that the Wallet SHOULD wait between polling requests to the token endpoint (in case the Authorization Server responds with error code authorization_pending - see Section 6.3). If no value is provided, Wallets MUST use 5 as the default.
     */
    interval?: number

    // v12, v13 feature
    /**
     * OPTIONAL string that the Wallet can use to identify the Authorization Server to use with this grant type when authorization_servers parameter in the Credential Issuer metadata has multiple entries. MUST NOT be used otherwise. The value of this parameter MUST match with one of the values in the authorization_servers array obtained from the Credential Issuer metadata. Not needed if the metadata only contains one element.
     */
    authorization_server?: string

    // v12 and below feature
    /**
     * OPTIONAL. Boolean value specifying whether the AS
     * expects presentation of the End-User PIN along with the Token Request
     * in a Pre-Authorized Code Flow. Default is false. This PIN is intended
     * to bind the Pre-Authorized Code to a certain transaction to prevent
     * replay of this code by an attacker that, for example, scanned the QR
     * code while standing behind the legitimate End-User. It is RECOMMENDED
     * to send a PIN via a separate channel. If the Wallet decides to use
     * the Pre-Authorized Code Flow, a PIN value MUST be sent in
     * the user_pin parameter with the respective Token Request.
     */
    user_pin_required?: boolean
}

export interface TxCode {
    /**
     * OPTIONAL. String specifying the input character set. Possible values are numeric (only digits) and text (any characters). The default is numeric.
     */
    input_mode?: InputCharSet

    /**
     * OPTIONAL. Integer specifying the length of the Transaction Code. This helps the Wallet to render the input screen and improve the user experience.
     */
    length?: number

    /**
     * OPTIONAL. String containing guidance for the Holder of the Wallet on how to obtain the Transaction Code, e.g.,
     * describing over which communication channel it is delivered. The Wallet is RECOMMENDED to display this description
     * next to the Transaction Code input screen to improve the user experience. The length of the string MUST NOT exceed
     * 300 characters. The description does not support internationalization, however the Issuer MAY detect the Holder's
     * language by previous communication or an HTTP Accept-Language header within an HTTP GET request for a Credential Offer URI.
     */
    description?: string
}
```

### Example create credential offer request and response

Example request to create an offer. This example uses an optional template configured on the issuer to convert the keys
into a JSON-LD credential
object.

```json
{
  "credential_configuration_ids": [
    "Omzetbelasting"
  ],
  "grants": {
    "authorization_code": {
      "issuer_state": "bzCzhpkwFBHPyTF9u6Rfdz"
    }
  },
  "credentialDataSupplierInput": {
    "naam": "Example",
    "rsin": "RSIN-1234",
    "btwId": "BTW-5678",
    "obNummer": "OB-abcd"
  }
}
```

Credential offer response:

```json
{
  "uri": "openid-credential-offer://?credential_offer=%7B%22grants%22%3A%7B%22urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Apre-authorized_code%22%3A%7B%22pre-authorized_code%22%3A%22bzCzhpkwFBHPyTF9u6Rfdz%22%2C%22tx_code%22%3A%7B%22input_mode%22%3A%22numeric%22%2C%22length%22%3A4%7D%7D%7D%2C%22credential_configuration_ids%22%3A%5B%22Omzetbelasting%22%5D%2C%22credential_issuer%22%3A%22https%3A%2F%2Fagent.issuer.bd.demo.sphereon.com%22%7D",
}
```

## Integrated Authorization server versus external authorization server

The OID4VCI Issuer has built in support for generating tokens. This is especially useful in case the `pre-authorized`
code flow is being used.

However, when `authorization-code` flow is being used an external Authorization Server needs to be specified. This also
means that any method it
supports to authenticate a user/account is possible.

An authorization endpoint needs to be defined in the OID4VCI metadata and in the agent configuration file. The
authorization flow will be triggered from the
front channel of the wallet (user
agent). https://www.rfc-editor.org/info/rfc6749 explains the protocol.

The agent for the most part will automatically detect when an external Authorization Server is defined in the metadata
using the
`authorization_servers` and `token_endpoint` configuration values in the OID4VCI metadata. The `authorization_servers`
value should point to an OpenID Connect capable AS. For now, we do not yet support automatic configuration, so the
`token_endpoint` will have to be manually set to the actual token endpoint of the OIDC capable Authorization Server.

You however will have to provide configurations for things like the `client_id`, `client_secret`, `response_type` and
`redirect_uri`. The demo agent gets these values from the `conf/oid4vci_options` files, where you would have to host
something like below; not the asOpts values in there:
The `authorization_server` value needs to point to your OIDC Authorization Server. This value also needs to be
configured in the `authorization_server` array value in the `oid4vci_metadata` folder, so wallets know where the
authorization server is located. Lastly you need to provide a `type` value containing the string `oidc` in the
`asClientOpts`
below, so the code activates the OIDC options.

The `client_id` value should normally be equal to your credential issuer (external) URL, unless otherwise provided by
your IDP.

Authorization Server options example:

```json
{
  "correlationId": "http://localhost:5010/oid4vci",
  "asClientOpts": {
    "type": "oidc",
    "authorization_server": "https://your.openid-connect.server.defined.as.authorization_server.in.oid4vci_metadata",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "redirect_uris": [
      "http://localhost:5010/oid4vci"
    ],
    "response_types": [
      "code"
    ]
  },
  "issuerOpts": {
    "didOpts": {
      "checkLinkedDomains": "if_present",
      "idOpts": {
        "identifier": "did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiVEcySDJ4MmRXWE4zdUNxWnBxRjF5c0FQUVZESkVOX0gtQ010YmdqYi1OZyIsInkiOiI5TThOeGQwUE4yMk05bFBEeGRwRHBvVEx6MTV3ZnlaSnM2WmhLSVVKMzM4In0",
        "kid": "034c6d87db1d9d597377b82a99a6a175cac00f4150c910dfc7f8232d6e08dbf8d8"
      }
    }
  }
}
```

All options for the `asClientOpts`:

```typescript
export interface ClientMetadata {
    // important
    client_id: string
    id_token_signed_response_alg?: string
    token_endpoint_auth_method?: ClientAuthMethod
    client_secret?: string
    redirect_uris?: string[]
    response_types?: ResponseType[]
    post_logout_redirect_uris?: string[]
    default_max_age?: number
    require_auth_time?: boolean
    tls_client_certificate_bound_access_tokens?: boolean
    request_object_signing_alg?: string

    // less important
    id_token_encrypted_response_alg?: string
    id_token_encrypted_response_enc?: string
    introspection_endpoint_auth_method?: ClientAuthMethod
    introspection_endpoint_auth_signing_alg?: string
    request_object_encryption_alg?: string
    request_object_encryption_enc?: string
    revocation_endpoint_auth_method?: ClientAuthMethod
    revocation_endpoint_auth_signing_alg?: string
    token_endpoint_auth_signing_alg?: string
    userinfo_encrypted_response_alg?: string
    userinfo_encrypted_response_enc?: string
    userinfo_signed_response_alg?: string
    authorization_encrypted_response_alg?: string
    authorization_encrypted_response_enc?: string
    authorization_signed_response_alg?: string

    [key: string]: unknown
}
```
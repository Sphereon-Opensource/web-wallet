<h1 align="center">
  <br>
  <a href="https://www.sphereon.com"><img src="https://sphereon.com/content/themes/sphereon/assets/img/logo.svg" alt="Sphereon" width="400"></a>
    <br>OpenID for Verifiable Credential Issuance - Issuer
  <br>
</h1>

# Background

The OpenID4VCI issuer is used in issuer type applications, where an organization is issuing the credential(s).

We support 3 levels of integration, ranging from higher-level integration in the agent exposing REST APIs, where aspects
like key management are
integrated into a
Veramo or Sphereon agent, to a standalone REST API, where you will have to integrate the key management yourself, to low
level functionality to issue
credentials using issuer-specific methods.

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

A very simple example request would look like this:

```json
{
  "credential_configuration_ids": [
    "https://raw.githubusercontent.com/Sphereon-Opensource/vc-contexts/refs/heads/master/funke/sd-jwt-metadata/age_group.json"
  ],
  "grants": {
    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
      "pre-authorized_code": "kkfvVcqPY83ciabJAeVo35"
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

### Credential data supplier

The credential data supplier allows you to provide data during the creation of the credential offer. This data is then
stored in the session and will
be used when the credential is issued.

Sometimes you may be unsure of the input data at this point, or you want to ensure that the wallet can reach the
credential issuance stage of the process. This is why support for using a webhook, invoked during the issuance phase,
will soon be available. The
webhook will receive most session data and is expected to conform to the data supplier interface, providing all the
input data for the credential.

### Resulting credential offer response

The response after creating the credential offer can be used in a webapp/frontend to create a (deep)link for a same
device
flow, or a QR code for a
cross-device flow. The `uri` property is the URI you can use in a QR code or as a link. The `qrCodeDataUri`
is a image-data URI you can use to create an inline QR code image. The response contains this value provided that the
request contained QR code
options.

```typescript
export type CreateCredentialOfferURIResult = {
    uri: string
    qrCodeDataUri?: string
    session?: CredentialOfferSession
    userPin?: string
    txCode?: TxCode
}
```

### QR code image is part of the offer response

You can decide whether you want to create a QR code yourself based on the credential offer response, or whether you want
the create Credential Offer
endpoint to create a QR code image for
you. This is controlled by providing the `qrCodeOpts` object in the `CredentialOfferRESTRequest`

```typescript
export interface QRCodeOpts {
    /**
     * Size of the QR code in pixel.
     *
     * @defaultValue 400
     */
    size?: number

    /**
     * Size of margins around the QR code body in pixel.
     *
     * @defaultValue 20
     */
    margin?: number

    /**
     * Error correction level of the QR code.
     *
     * Accepts a value provided by _QRErrorCorrectLevel_.
     *
     * For more information, please refer to [https://www.qrcode.com/en/about/error_correction.html](https://www.qrcode.com/en/about/error_correction.html).
     *
     * @defaultValue 0
     */
    correctLevel?: number

    /**
     * **This is an advanced option.**
     *
     * Specify the mask pattern to be used in QR code encoding.
     *
     * Accepts a value provided by _QRMaskPattern_.
     *
     * To find out all eight mask patterns, please refer to [https://en.wikipedia.org/wiki/File:QR_Code_Mask_Patterns.svg](https://en.wikipedia.org/wiki/File:QR_Code_Mask_Patterns.svg)
     *
     * For more information, please refer to [https://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders#Masking](https://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders#Masking).
     */
    maskPattern?: number

    /**
     * **This is an advanced option.**
     *
     * Specify the version to be used in QR code encoding.
     *
     * Accepts an integer in range [1, 40].
     *
     * For more information, please refer to [https://www.qrcode.com/en/about/version.html](https://www.qrcode.com/en/about/version.html).
     */
    version?: number

    /**
     * Options to control components in the QR code.
     *
     * @deafultValue undefined
     */
    components?: ComponentOptions

    /**
     * Color of the blocks on the QR code.
     *
     * Accepts a CSS &lt;color&gt;.
     *
     * For more information about CSS &lt;color&gt;, please refer to [https://developer.mozilla.org/en-US/docs/Web/CSS/color_value](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
     *
     * @defaultValue "#000000"
     */
    colorDark?: string

    /**
     * Color of the empty areas on the QR code.
     *
     * Accepts a CSS &lt;color&gt;.
     *
     * For more information about CSS &lt;color&gt;, please refer to [https://developer.mozilla.org/en-US/docs/Web/CSS/color_value](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
     *
     * @defaultValue "#ffffff"
     */
    colorLight?: string

    /**
     * Automatically calculate the _colorLight_ value from the QR code's background.
     *
     * @defaultValue true
     */
    autoColor?: boolean

    /**
     * Background image to be used in the QR code.
     *
     * Accepts a `data:` string in web browsers or a Buffer in Node.js.
     *
     * @defaultValue undefined
     */
    backgroundImage?: string | Buffer

    /**
     * Color of the dimming mask above the background image.
     *
     * Accepts a CSS &lt;color&gt;.
     *
     * For more information about CSS &lt;color&gt;, please refer to [https://developer.mozilla.org/en-US/docs/Web/CSS/color_value](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value).
     *
     * @defaultValue "rgba(0, 0, 0, 0)"
     */
    backgroundDimming?: string

    /**
     * GIF background image to be used in the QR code.
     *
     * @defaultValue undefined
     */
    gifBackground?: ArrayBuffer

    /**
     * Use a white margin instead of a transparent one which reveals the background of the QR code on margins.
     *
     * @defaultValue true
     */
    whiteMargin?: boolean

    /**
     * Logo image to be displayed at the center of the QR code.
     *
     * Accepts a `data:` string in web browsers or a Buffer in Node.js.
     *
     * When set to `undefined` or `null`, the logo is disabled.
     *
     * @defaultValue undefined
     */
    logoImage?: string | Buffer

    /**
     * Ratio of the logo size to the QR code size.
     *
     * @defaultValue 0.2
     */
    logoScale?: number

    /**
     * Size of margins around the logo image in pixels.
     *
     * @defaultValue 6
     */
    logoMargin?: number

    /**
     * Corner radius of the logo image in pixels.
     *
     * @defaultValue 8
     */
    logoCornerRadius?: number

    /**
     * @deprecated
     *
     * Ratio of the real size to the full size of the blocks.
     *
     * This can be helpful when you want to make more parts of the background visible.
     *
     * @deafultValue 0.4
     */
    dotScale?: number
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
    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
      "pre-authorized_code": "bzCzhpkwFBHPyTF9u6Rfdz",
      "tx_code": {
        "input_mode": "numeric",
        "length": 4
      }
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
  "txCode": {
    "input_mode": "numeric",
    "length": 4
  },
  "userPin": "0151",
  "pinLength": 4
}
```

You can track the status of credential issuance using the following endpoint:

You can track the status of the credential issuance, using the following endpoint:
https://agent/webapp/credential-offer-status

You will need to send a POST request, with in the body an `id` value that corresponds to the `issuer_state` or
`pre-authorized_code` value you
provided when creating the offer.

example request:

```json
{
  "id": "bzCzhpkwFBHPyTF9u6Rfdz"
}
```

example response:

```json
{
  "createdAt": 1721768181938,
  "lastUpdatedAt": 1721768181938,
  "status": "OFFER_CREATED"
}
```

The potential status values are:

```typescript
export enum IssueStatus {
    OFFER_CREATED = 'OFFER_CREATED',
    ACCESS_TOKEN_REQUESTED = 'ACCESS_TOKEN_REQUESTED', // Optional state, given the token endpoint could also be on a separate AS
    ACCESS_TOKEN_CREATED = 'ACCESS_TOKEN_CREATED', // Optional state, given the token endpoint could also be on a separate AS
    CREDENTIAL_REQUEST_RECEIVED = 'CREDENTIAL_REQUEST_RECEIVED', // Credential request received. Next state would either be error or issued
    CREDENTIAL_ISSUED = 'CREDENTIAL_ISSUED', // The credential is issued. Only if the notification endpoint is enabled and the wallet supports notification, you will get feedback whether the user accepted or declined the credential. In all cases the credential is issued at this point from the issuers perspective.
    NOTIFICATION_HOLDER_ACCEPTED = 'NOTIFICATION_HOLDER_ACCEPTED', // The credential was issued to the wallet and accepted/stored by the holder
    NOTIFICATION_HOLDER_DECLINED = 'NOTIFICATION_HOLDER_DECLINED', // The credential was issued to the wallet, but the user declined the credential and thus did not store it
    ERROR = 'ERROR',
}
```

The whole status response:

```typescript
export interface IssueStatusResponse {
    createdAt: number
    lastUpdatedAt: number
    status: IssueStatus
    error?: string
    clientId?: string
}
```

## Notifications and endpoint

The notification endpoint can be enabled or disabled. If enabled a value needs to be exposed in the issuer metadata as
well. This signals wallets that
support notifications to interact with the endpoints.
Notifications can be used for notifying the issuer about errors, but also for status feedback once the credential is
issued to the wallet. From the
perspective of the issuer the credential is issued, as a signed credential has been send to the wallet. However the
holder typically has a manual user
Notifications can be used to inform the issuer about errors and provide status feedback once the credential has been
issued to the wallet. From the
happened in that particular step. If enabled you are not guaranteed to get notifications, as a wallet is not required to
implement it, or could opt to
issuer's perspective, the credential is considered issued as a signed credential has been sent to the wallet. However,
the holder typically has a
manual user

Notification interface. See
also [the OID4VCI spec](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#section-9.1)

```typescript
export type NotificationEventType = 'credential_accepted' | 'credential_failure' | 'credential_deleted';

export interface NotificationRequest {
    notification_id: string; // The notification_id received in the initial credential response
    event: NotificationEventType | string; // accepted, declined/deleted, error/failure
    event_description?: string; // Human readable string
}
```

## Dynamic Credential Request (Presentation during Issuance)

See [OID4VP during OID4VCI](./OID4VP-during-OID4VCI.md) for more information.

## Integrated Authorization server versus external authorization server

See [Authorization code flow](./OID4VCI-authorization-code-flow.md) for more information.

# Low level information

If you want to start at the lowest level when creating a Issuer; instead of using the out of the box REST APIs, your
best start is with
the [VcIssuerBuilder](https://github.com/Sphereon-Opensource/OID4VC/blob/develop/packages/issuer/lib/builder/VcIssuerBuilder.ts)

But first we start with some concepts you need to know. The issuer is stateful, as it keeps track of sessions. In a
production setting it would make
most sense to use persistence for this. The default solution supports in-memory sessions.

## Credential Offer State Manager

The CredentialOfferState is used to track of the creation date of the credential offer:

```typescript
export interface CredentialOfferState {
    credentialOffer: CredentialOfferPayload
    createdOn: number
}
```

The ICredentialOfferStateManager allows to have a custom implementation of the state manager:

```typescript
export interface IStateManager<T extends StateType> {
    set(id: string, stateValue: T): Promise<void>;

    get(id: string): Promise<T | undefined>;

    has(id: string): Promise<boolean>;

    delete(id: string): Promise<boolean>;

    clearExpired(timestamp?: number): Promise<void>; // clears all expired states compared against timestamp if provided, otherwise current timestamp

    clearAll(): Promise<void>; // clears all states

    getAsserted(id: string): Promise<T>;

    startCleanupRoutine(timeout?: number): Promise<void>;

    stopCleanupRoutine(): Promise<void>;
}
```

Here is an example, of an in-memory implementation of the StateManager; with some code omitted for readability

```typescript
export class MemoryStates<T extends StateType> implements IStateManager<T> {
    private readonly expiresInMS: number
    private readonly states: Map<string, T>

    async clearAll(): Promise<void> {
        this.states.clear()
    }


    async delete(id: string): Promise<boolean> {
        if (!id) {
            throw Error('No id supplied')
        }
        return this.states.delete(id)
    }

    async get(id: string): Promise<T | undefined> {
        return this.states.get(id)
    }

    async has(id: string): Promise<boolean> {
        if (!id) {
            throw Error('No id supplied')
        }
        return this.states.has(id)
    }

    async set(id: string, stateValue: T): Promise<void> {
        if (!id) {
            throw Error('No id supplied')
        }
        this.states.set(id, stateValue)
    }
}
```

### Usage

Pass an instance of the state manager to the VC Issuer Builder

```typescript
const vcIssuer = new VcIssuerBuilder()
    .withAuthorizationServer('https://authorization-server')
    .withCredentialEndpoint('https://credential-issuer/credential-endpoint')
    .withCredentialIssuer('https://credential-issuer')
    .withIssuerDisplay({
        name: 'example issuer',
        locale: 'en-US',
    })
    .withCredentialsSupported(credentialsSupported)
    .withCredentialOfferStateManager(new MemoryStates<CredentialOfferSession>())
    .build()
```

## The Issuer Builder

In the above example you already saw the Issuer Builder. If you want to have full control then you could use that as a
starting point. It hes methods
for custom metadata, the issuer value, credential and token endpoint locations, issuer branding, transaction codes and
session management.
Once you have called the builder methods, you can call the build() method to end with a single instance of an issuer
with state.

Be aware that this issuer is not exposing any management REST APIs. It only contains the pure functions for the issuer.
If you want to expose either
the endpoints the wallets need, or management endpoints, you will have to write these yourself, or you can use the
methods available in
the [issuer-rest](https://github.com/Sphereon-Opensource/OID4VC/blob/develop/packages/issuer-rest/lib/oid4vci-api-functions.ts)
package. There is a
function per endpoint you can setup and it is based on express. You pass in the instance of your issuer, and then it
automatically sets up the
endpoints you include. For more information on the available endpoints see above in the REST section.

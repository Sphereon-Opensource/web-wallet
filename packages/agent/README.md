<!--suppress HtmlDeprecatedAttribute -->
<h1 align="center">
  <br>
  <br>SPHEREON VC API 
  <br>
</h1>

The SPHEREON VC API is responsible for issuing and verifying Verifiable Credentials as well as creating and resolving
Decentralized Identifiers

# Environment variables

There are several environment variables, allowing you to influence the behaviour of the agent(s).
Please see [.env.example](.env.example) for a list and explanation of all the environment variables.

# Agent instances

The agent can be configured using several environment variables. Amongst these are variables to enable certain
functionalities of the agent.
The idea is that there are 2 agents with each a separate database:

- The SPHEREON **Issuer Agent**: This agent, running on port 5000 by default, contains the did:web of SPHEREON, and is
  responsible for issuance and optional
  storage of Verifiable Credentials. Creating DIDs from the REST API is disabled on this agent. Resolution of DIDs will
  use external resolution, meaning any did:web will be resolved to the actual https endpoint.
- The **Customer Agent**: This agent running on port 5001 by default, is responsible for creating DIDs for customers,
  and can also verify Verifiable
  Credentials. It has no access to the database of the issuer. Creating Verifiable Credentials is disabled on this
  agent, but verifying them is enabled. The DIDs will be resolved in hybrid mode, meaning the agent will first look
  whether the DID is managed by the agent and then generate a DID resolution result from the database. If not managed by
  the agent it will perform an external resolution call.

# More details about the APIs and functions

The SPHEREON VC API, is re-using features exposed by Sphereon's SSI-SDK, amongst which as API's and endpoint functions that
are compatible with the W3C VC API, DIF Universal Resolver, DIF Universal Registrar and W3C did:web hosting.

Some more information can be found in the [SSI-SDK Github](https://github.com/Sphereon-Opensource/ssi-sdk).
The [DID documentation](../../docs/DID-API.md) and [VC API documentation]() is also available in the docs folder in the
root of this project

# DID import from configuration

Both the issuer agent and the customer agent can import DIDs from configuration files. The agent will look for .json
files in the configured path. .json files will be imported, meaning that the keys and DIDs present in these files, will
be created and/or imported, together with the DIDs.

## Config path location

The DID files are read from the path configured by the `CONF_PATH` environment variable (defaults to `./conf/dev`). The
DIDs are read from the `dids` folder in the `CONF_PATH`, so do not put your DID files in the main folder. Any
files not ending in .json will be ignored. You should update this environment variable to reflect your import location
and not load some test/default DIDs.

NOTE: The did .json files are read from the sub-folder `dids` in the `CONF_PATH`.

## Examples

You can find example configuration files in the [conf/examples](./conf/examples) folder. It contains examples for both
did:jwk DIDs with [ES256/Secp256r1 (default)](./conf/examples/dids/jwk-es256.json)
and [Ed25519 keys](./conf/examples/dids/jwk-ed25519.json). It also contains a did:web using
an [X509 certificate](./conf/examples/dids/web-x509.json) that
will be
hosted at did:web:localhost, as well as a did:web that uses
an [ES256/Secp256r1 key](./conf/examples/dids/web-es256.json) that will be hosted at did:web:
localhost:es256.

## X509 Certificate support

When creating a did:web from configuration you can use X509 certificates. In order to do so you will first need to make
sure you have the following files/content available in PEM format:

- private key
- public certificate
- certificate chain

Please note that these need to be in PEM format, meaning with the distinct `----------` beginnings and endings. Do not
remove these lines!
Also make sure that they have the correct headers, like BEGIN CERTIFICATE, BEGIN PRIVATE KEY etc.

If your certificates and private key are in a different format than PEM, convert them first. See for
instance https://aboutssl.org/convert-certificate-to-pem-crt-to-pem-crt-to-pem-der-to-pem/ for more info.

The certificate chain contains any (intermediary) Certificate Authority (CA) in the chain. The order is from ROOT CA, to
intermediary CA(s) to the Certificate
NOTE: You will have to include the certificate as well in the certificateChainPEM as the last value.

Example:

```json
{
  "did": "did:web:localhost",
  "createArgs": {
    "provider": "did:web",
    "alias": "did:web:localhost",
    "options": {
      "keys": [
        {
          "key": {
            "type": "RSA",
            "kid": "JWK2020-RSA"
          },
          "x509": {
            "certPEM": "-----BEGIN CERTIFICATE-----\nSNIP FOR READABILITY\nmake sure to have these \n newlines in there\n-----END CERTIFICATE-----\n",
            "privateKeyPEM": "-----BEGIN PRIVATE KEY-----\nSNIP FOR READABILITY\nmake sure to have these \n newlines in there\n-----END PRIVATE KEY-----\n",
            "certificateChainPEM": "-----BEGIN CERTIFICATE-----\nROOT CA\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nINTERMEDIARY CA\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nYOUR CERTIFICATE\n-----END CERTIFICATE-----\n\n"
          }
        }
      ]
    }
  }
}
```

Note: The `keys` property is an array, so you could import multiple keys (and certificates) if you want.

The `did` and `alias` values should be kept the same. If you are going to host the main DID on let's
say `verification.sphereon.com`, the the value would become `did:web:verification.sphereon.com`. The agent will be able to use these
did:web values even if the DID document is not hosted at http://localhost/.well-known/did.json yet (via copy
to webhosting server, or via reverse proxy to the agent did:web hosting facility).

# Issuer agent

## Issue credentials

Issuing a credentials is performed by using a W3C VC API compatible endpoint exposed by the agent using a `POST` method.

The `issuer` value should correspond with a DID that is known the agent. You cannot create a VC with a DID not managed
by the agent, as the signature is being created from the private key associated with one of the `assertionMethod`
verification method relationships defined in the DID document.

The `issuanceDate` can either be current date-time (typical use case), but can also be a future date-time (VC becomes
valid in the future). In some cases you can also use a date in the past. Especially if you re-issue a VC that was issued
before for instance.

The optional `validUntil` value dictates till when this VC will be valid. Whenever you check the VC after this value,
the verification will fail.
This is different from statusList(s) which allow the issuer to revoke a VC.

The `credentialStatus` object is optional. If used it should contain the property `statusListCredential` which should be
a URL managed by the issuer agent. If the agent encounters this value, it will create a statusListEntry in the
database and update the statuslist credential hosted at the `statusListCredential` URL. The response object will contain
additional properties like a `statusListIndex`. This index will be randomly chosen by the issuer to ensure privacy.
You can also provide your own index value. Then the issuer will use this value. Be aware that the credential id will
be persisted with the statusListEntry value to ensure that IDs are not handed out twice. For more info see the
statuslist section of the document. Whenever you verify a credential with a credentialStatus object in it, the verifier
will resolve the statusList credential and look whether the statusList index mentioned in the credential is active or
revoked/suspended. In the latter case the overall verification will fail.

The `credentialSubject` object contains the domain specific information, which comes from the terms defined in
the `@context` array; most importantly https://ref.sphereon.com/sphereon/vc/license-context/.
The `credentialSubject.id` value is the custodial DID, which acts as the subject and thus will be the holder of this VC.

Example body:

```json
{
  "credential": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
      "https://ref.sphereon.com/sphereon/vc/license-context/"
    ],
    "id": "http://localhost/vc/license/company_prefix/8790171",
    "type": ["VerifiableCredential", "SPHEREONCompanyPrefixLicenseCredential"],
    "issuer": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
    "issuanceDate": "2023-06-22T00:00:00Z",
    "validUntil": "2024-06-22T00:00:00Z",
    "credentialStatus": {
      "statusListCredential": "http://localhost/vc/status-lists/1"
    },
    "credentialSubject": {
      "id": "did:web:verification.sphereon.com:did:party_gln:8720796007237",
      "organization": {
        "sphereon:partyGLN": "8720796007237",
        "sphereon:organizationName": "Test Account",
        "sphereon:additionalOrganizationID": [
          {
            "sphereon:organizationID": "90001745",
            "sphereon:organizationID_Type": "CoC"
          }
        ]
      },
      "licenseValue": "8790171"
    }
  }
}
```

Response:

```json
{
  "verifiableCredential": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
      "https://ref.sphereon.com/sphereon/vc/license-context/",
      "https://w3id.org/security/suites/jws-2020/v1"
    ],
    "id": "http://localhost/vc/license/company_prefix/8790171",
    "type": ["VerifiableCredential", "SPHEREONCompanyPrefixLicenseCredential"],
    "issuer": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
    "issuanceDate": "2023-06-22T00:00:00Z",
    "validUntil": "2024-06-22T00:00:00Z",
    "credentialStatus": {
      "statusListCredential": "http://localhost/vc/status-lists/1",
      "id": "http://localhost/vc/status-lists/1",
      "type": "StatusList2021Entry",
      "statusPurpose": "suspension",
      "statusListIndex": "221154"
    },
    "credentialSubject": {
      "id": "did:web:verification.sphereon.com:did:party_gln:8720796007237",
      "organization": {
        "sphereon:partyGLN": "8720796007237",
        "sphereon:organizationName": "Test Account",
        "sphereon:additionalOrganizationID": [
          {
            "sphereon:organizationID": "90001745",
            "sphereon:organizationID_Type": "CoC"
          }
        ]
      },
      "licenseValue": "8790171"
    },
    "proof": {
      "type": "JsonWebSignature2020",
      "created": "2023-07-31T01:31:56Z",
      "verificationMethod": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0",
      "proofPurpose": "assertionMethod",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..XqHpaYSzZ-mRDVqvvf-stAETJE5fU0NTJTO1rjKcTMuRcHaDkX5NQxUWA1IttA7pqIhnQ3BpbGED__ls3KhsCA"
    }
  }
}
```

Please notice the whole credential can be found in the `verifiableCredential` property of the response. It is very
similar to the request body. The `@context` was slightly updated to include support for the signature suite. It also
contains a `proof` object, which contains the signature created by the DID of the issuer.

## Verifying a Verifiable Credential

In order to verify a Verifiable Credential you can use the W3C VC API compatible endpoint exposed by the agent, by
using `POST` to http://localhost:5000/vc/credentials/verify
with the below body. Please put the Verifiable Credential in the `verifiableCredential` property of the body. (you can
copy the example creation response from above)

Example verification body:

```json
{
  "verifiableCredential": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://w3id.org/vc/status-list/2021/v1",
      "https://ref.sphereon.com/sphereon/vc/license-context/",
      "https://w3id.org/security/suites/jws-2020/v1"
    ],
    "id": "http://localhost/vc/license/company_prefix/8790171",
    "type": ["VerifiableCredential", "SPHEREONCompanyPrefixLicenseCredential"],
    "issuer": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
    "issuanceDate": "2023-06-22T00:00:00Z",
    "validUntil": "2024-06-22T00:00:00Z",
    "credentialStatus": {
      "statusListCredential": "http://localhost/credentials/status-lists/1",
      "id": "http://localhost/vc/status-lists/1#221154",
      "type": "StatusList2021Entry",
      "statusPurpose": "suspension",
      "statusListIndex": "221154"
    },
    "credentialSubject": {
      "id": "did:web:verification.sphereon.com:did:party_gln:8720796007237",
      "organization": {
        "sphereon:partyGLN": "8720796007237",
        "sphereon:organizationName": "Test Account",
        "sphereon:additionalOrganizationID": [
          {
            "sphereon:organizationID": "90001745",
            "sphereon:organizationID_Type": "CoC"
          }
        ]
      },
      "licenseValue": "8790171"
    },
    "proof": {
      "type": "JsonWebSignature2020",
      "created": "2023-07-31T01:31:56Z",
      "verificationMethod": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0",
      "proofPurpose": "assertionMethod",
      "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..XqHpaYSzZ-mRDVqvvf-stAETJE5fU0NTJTO1rjKcTMuRcHaDkX5NQxUWA1IttA7pqIhnQ3BpbGED__ls3KhsCA"
    }
  }
}
```

Please note that the `issuer` DID value does not have to be the SPHEREON issuer. If however a did:web is used as issuer, the
respective did:web has to be able to be resolved from an https location. For testing therefor it is easiest to use did:
jwk, as these DIDs do not need any external hosting.

Verification response:

```json
{
  "verified": true,
  "results": [
    {
      "proof": {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://w3id.org/vc/status-list/2021/v1",
          "https://ref.sphereon.com/sphereon/vc/license-context/",
          "https://w3id.org/security/suites/jws-2020/v1"
        ],
        "type": "JsonWebSignature2020",
        "created": "2023-07-31T01:31:56Z",
        "verificationMethod": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0",
        "proofPurpose": "assertionMethod",
        "jws": "eyJhbGciOiJFZERTQSIsImI2NCI6ZmFsc2UsImNyaXQiOlsiYjY0Il19..XqHpaYSzZ-mRDVqvvf-stAETJE5fU0NTJTO1rjKcTMuRcHaDkX5NQxUWA1IttA7pqIhnQ3BpbGED__ls3KhsCA"
      },
      "verified": true,
      "verificationMethod": {
        "type": "JsonWebKey2020",
        "id": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0",
        "controller": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
        "publicKey": []
      },
      "purposeResult": {
        "valid": true,
        "controller": {
          "@context": [
            "https://www.w3.org/ns/did/v1",
            {
              "@vocab": "https://www.iana.org/assignments/jose#"
            }
          ],
          "id": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
          "verificationMethod": [
            {
              "id": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0",
              "type": "JsonWebKey2020",
              "controller": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
              "publicKeyJwk": {
                "alg": "EdDSA",
                "use": "sig",
                "kty": "OKP",
                "crv": "Ed25519",
                "x": "iaRmHkRrRkATJaONOyBYLR3Sd-tEijGBASpnG3rhWDc"
              }
            }
          ],
          "assertionMethod": [
            "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0"
          ],
          "authentication": [
            "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0"
          ],
          "capabilityInvocation": [
            "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0"
          ],
          "capabilityDelegation": [
            "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0"
          ]
        }
      },
      "log": [
        {
          "id": "expiration",
          "valid": true
        },
        {
          "id": "valid_signature",
          "valid": true
        },
        {
          "id": "issuer_did_resolves",
          "valid": true
        },
        {
          "id": "revocation_status",
          "valid": true
        }
      ]
    }
  ],
  "log": [
    {
      "id": "expiration",
      "valid": true
    },
    {
      "id": "valid_signature",
      "valid": true
    },
    {
      "id": "issuer_did_resolves",
      "valid": true
    },
    {
      "id": "revocation_status",
      "valid": true
    }
  ]
}
```

The important bit is the overall `verified: true` value. In case any of the individual checks fails, then this value
will
be `false`.

## Status List management

A status list allows you to either revoke or suspend and reactivate issued Verifiable Credentials. Per VC you can only
incorporate one credentialStatus object, which in turn means you can only use one status list per issued credential. As
a consequence this means a credential will either have no statusList, a `revocation` statuslist or a `suspension`
statuslist.
Revocation means a one time action. A VC can go from `active` -> `revoked`. Suspension means
from `active` -> `suspended`.
This can be a temporary suspension or a permanent suspension. As the name already implies for this type of statuslist
you can also go from `suspended` to `active`.

The statuslist itself is a Verifiable Credential as well, which is issued and signed by the issuer of the customer VCs.
The statuslist credentail contains a bitstring. This bitstring is at least 150.000 bits long and whenever a credential
is being issued a random position in this bitstring will be used. This position will end up in the issued credential as
a `statusListIndex` property of the `credentialStatus` object in the VC. The issuer will keep track of the statuslist
id/url, the id of the issued VC, as well as the random statusListIndex. The value in the bitstring is either "0",
meaning active, or "1" meaning `revoked` or `suspended`, depending on the type of statuslist. Updating the statusList
and it's
entries is fully automated when issuing credentials. You don't need to call an additional API or anything. Managing
state changes for a particular index means you will have to call a REST API, as explained below

### Creating a statuslist

Creating statuslists is not something you will do on a regular basis, as you will typically only have 1 statuslist.
By default the API endpoints for management are disabled for this reason. The agent reads environment variables and
based on these
already is using the default statuslist (it will created it when it doesn't exist yet).

You can enable management by including the `status-list-management` value (comma seperated) in the environment variable
called `STATUS_LIST_API_FEATURES`.

Request to create a statuslist:
POST http://localhost:5000/vc/status-lists

```json
{
  "statusList": {
    "issuer": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
    "id": "http://localhost:5000/vc/status-lists/1",
    "correlationId": "abc123",
    "statusPurpose": "revocation"
  }
}
```

Required properties
The `issuer` value needs to be a DID managed by the agent and needs to be the same value used to issue VCs.
The `id` value needs to be the (public) URL where the statuslist can be found. You could deploy a reverse proxy or
loadbalancer in front of it. The status list needs to be the public facing URL/ID.
The `correlationId` value is used as an internal 2nd business key. You can use this value as a query parameter or body
property for most calls, in which case the API will not look at the URL. It will always serve/manage the statuslist with
the given `correlationId`. This is handy if you want to assign your own identifier, which you will use to manage the
list. A `correlationId` is mandatory when creating the status list and it needs to be unique!
The `statusPorpose` property is used to distinguish the type of the statuslist. It cannot be changes afterwards!. It
either is `revocation` or `suspension`. See above for more details on the difference between the two.

Other optional properties:
`length`: Allows you to define the length of the bitstring. Do not use a value smaller than 150000. This ensures maximal
privacy as indices will be randomly chosen from this string.
`proofFormat`: Needs to either be `lds` (the default), for JSON-LD Linked Data Signatures or `jwt` for JWTs.
`keyRef`: Public key/alias name as managed by the agent. This is only needed in case you have a DID that contains
multiple `assertionMethod` entries and you do not want to pick the first one.

The response:

```json
{
  "statusListDetails": {
    "id": "http://localhost:5000/vc/status-lists/1",
    "encodedList": "H4sIAAAAAAAAA-3BgQAAAADDoPlT3-AEVQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPANA40AABJ6AAA",
    "issuer": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
    "type": "StatusList2021",
    "proofFormat": "lds",
    "indexingDirection": "rightToLeft",
    "length": 250000,
    "statusPurpose": "revocation",
    "statusListCredential": {
      "@context": [
        "https://www.w3.org/2018/credentials/v1",
        "https://w3id.org/vc/status-list/2021/v1",
        "https://w3id.org/security/suites/ed25519-2020/v1"
      ],
      "id": "http://localhost:5000/vc/status-lists/1",
      "issuer": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9",
      "type": ["VerifiableCredential", "StatusList2021Credential"],
      "credentialSubject": {
        "id": "http://localhost:5000/vc/status-lists/1",
        "type": "StatusList2021",
        "statusPurpose": "revocation",
        "encodedList": "H4sIAAAAAAAAA-3BgQAAAADDoPlT3-AEVQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAPANA40AABJ6AAA"
      },
      "issuanceDate": "2023-09-05T16:44:19.077Z",
      "proof": {
        "type": "Ed25519Signature2020",
        "created": "2023-09-05T16:44:19Z",
        "verificationMethod": "did:jwk:eyJhbGciOiJFZERTQSIsInVzZSI6InNpZyIsImt0eSI6Ik9LUCIsImNydiI6IkVkMjU1MTkiLCJ4IjoiaWFSbUhrUnJSa0FUSmFPTk95QllMUjNTZC10RWlqR0JBU3BuRzNyaFdEYyJ9#0",
        "proofPurpose": "assertionMethod",
        "proofValue": "z6fFjrUoK1c8XyDCWnTvWz7NfnznUpNn9NhhWub547VDjcR9JV3311znjnsfN1mK5piWDcKjDq9tTDPjuEQtC8S1bCoh9ZvDKhRuwWBYHU4fHX2VcoAaamv6cVcNRkxzDF9RpU9rqUSajBehUhP51x742CRXZ6My5NtgjAfT6RWjU6M33EYb86DD1R8WtNWDHUz4DN"
      }
    },
    "correlationId": "abc123",
    "driverType": "agent_typeorm"
  }
}
```

The `statusListDetails.statusListCredential` is the actual status list. If you would resolve the id of the statuslist it
would return everything below `statusListDetails` -> `statusListCredential`.
As you can see the statuslist itself is also a VC. This ensures that any verifier can verify the authenticity of the
statuslist during the process of verifying a VC. The original VC is verified. The statusList is being resolved. then the
statusList credential itself is verified. Then the statusListIndex of the original VC is being used to pick the
bitstring position from the encodedList in the statuslist credential. If this value is "0" the VC is valid. If this
value is "1", the VC is revoked or suspended.

## Issuing a VC with statuslist

Whenever you include a `credentialStatus` toplevel object with a `statusListCredential` value that equals the
statuslist `id` value, the issuer will ensure that the VC will contain statusList information. If you do not include
the `credentialStatus` object, then the issued VC will have no statuslist associated.
During issuance of the VC the issuer will pick a random index value and associate that with the id of the VC. This index
value will be stored in the database together with the statuslist id and the VC id. This is needed to later manage the
statuslist index for the particular credential. Given the bitstring used in the statuslist should be pretty big (at
least 150.000 positions) and given the value is chosen randomly, it ensures that privacy is preserved. Two consecutive
credentials being issued do not have consecutive numbers, meaning correlation is hard/impossible for external parties.

If you do not want to have the issuer pick random index values, you can also provide a `statusListIndex` property in
the `credentialStatus` object. In that case the issuer will use that value. But only if that value either has not been
used before, or has been used for the same credentialId (in case you re-issue a VC with the same id). If you use the
index of an existing VC and re-issue this vC with the same credential id, then be aware that the status in the
statuslist will not be altered. So if the credential id was previously revoked, then re-issuing a new VC with the same
ID means the new VC is still revoked. If it was suspended, you will have to call the API to update the index value back
to active afterwards.

Example partial VC during the request phase (see [Issue credentials](#issue-credentials)) for more details):

```json
{
  ...
  "issuanceDate": "2023-06-22T00:00:00Z",
  "credentialStatus": {
    "statusListCredential": "http://localhost/vc/status-lists/1"
  },
  "credentialSubject": {
    ...
  }
  ...
}
```

Response:

```json
{
  "issuanceDate": "2023-06-22T00:00:00Z",
  "credentialStatus": {
    "statusListCredential": "http://localhost/credentials/status-lists/1",
    "id": "http://localhost/vc/status-lists/1#221154",
    "type": "StatusList2021Entry",
    "statusPurpose": "suspension",
    "statusListIndex": "221154"
  },
  "credentialSubject": {
    ...
  },
  ...
}
```

## Managing credential statuses

The agent exposes a W3C compatible REST API endpoint to manage credential statuses. This endpoint allows you to change
the status for a single credential. It requires the credential id as input, together with the type of statuslist and the
new value. The agent will automatically map these values onto the correct statuslist and update the statuslist
accordingly.
If you revoke or suspend a credential, this will be reflected immediately.

Example request:

```json
{
  "credentialId": "http://localhost/vc/license/company_prefix/8790171",
  "credentialStatus": [
    {
      "type": "StatusList2021",
      "status": "1"
    }
  ]
}
```

Please be aware that in current version you only can use the credentialId. In future versions we will also allow you to
create bespoke correlation identifiers and/or use the statusList index to update the value. However these are non-W3C VC
API compliant extensions.

Although the `credentialStatus` property is an array. It can only contain one element, of which the `type` has to
be `StatusList2021`.
The `status` value either has to be "0" for active or "1" for revoked/suspended. The response will be the updated
statusList credential.

# Customer agent

## Create a custodial DID

In order to create a custodial DID, the DIF Universal Registrar compatible support of the agent is being used. This
means a REST API is exposed to create DIDs. Since these DIDs will be custodial (eg SPHEREON is managing these DIDs on
behalf of its customers), the DIDs and their associated public/private keys will need to be persisted.

In order to create a new did:web for GLN `12345678` the following body should be POST-ed to
http://localhost:5001/did/identifiers?method=web

Example body:

```json
{
  "did": "did:web:verification.sphereon.com:did:party_gln:12345678",
  "options": {
    "storeSecrets": true
  }
}
```

Example response:

```json
{
  "jobId": "a76e0d06-66f0-4fe0-bc56-56aaebb76100",
  "didState": {
    "did": "did:web:verification.sphereon.com:did:party_gln:12345678",
    "state": "finished",
    "didDocument": {
      "@context": "https://www.w3.org/ns/did/v1",
      "id": "did:web:verification.sphereon.com:did:party_gln:12345678",
      "verificationMethod": [
        {
          "controller": "did:web:verification.sphereon.com:did:party_gln:12345678",
          "id": "did:web:verification.sphereon.com:did:party_gln:12345678#02cf2419d5b12348a7c8249abd69671090d7b5016fe819aa85e886165d18c08fb4",
          "publicKeyJwk": {
            "alg": "ES256",
            "use": "sig",
            "kty": "EC",
            "crv": "P-256",
            "x": "zyQZ1bEjSKfIJJq9aWcQkNe1AW_oGaqF6IYWXRjAj7Q",
            "y": "V_-lI5X7tldmRvn-xtd3wJR4gxRfND-ns8QNZsLNxDo"
          },
          "type": "JsonWebKey2020"
        }
      ],
      "assertionMethod": [
        "did:web:verification.sphereon.com:did:party_gln:12345678#02cf2419d5b12348a7c8249abd69671090d7b5016fe819aa85e886165d18c08fb4"
      ],
      "authentication": [
        "did:web:verification.sphereon.com:did:party_gln:12345678#02cf2419d5b12348a7c8249abd69671090d7b5016fe819aa85e886165d18c08fb4"
      ]
    }
  }
}
```

Please be aware that this is [did:web](https://w3c-ccg.github.io/did-method-web/), so follow
the [specification](https://w3c-ccg.github.io/did-method-web/).
In the above example a did:web is created which should be hosted at the following location:
http://localhost/did/party_gln/12345678/did.json
By default the agent will be able to resolve any did:web hosted by the agent. Meaning that you can both issue and verify
Credentials with the respective did:web even if the actual web-server or reverse proxy is not hosting the did:web yet

Please also see the section about hosting DID:web did.json files using the DID web service.

In the above response the `state` value is `finished`. This means a new DID is created before sending the response. This
value could also be `exists`, because the REST API is configured to allow existing DIDs when calling this endpoint. In
this case the existing DID is returned.

## Deactivate a custodial DID

In order to remove a DID from the agent database you will have to call the deactivate endpoint of the Universal
Registrar.

This endpoint will not return a result response in case of success. The HTTP status will be 200. In case of an error it
will be HTTP status code of 400 or higher, with an error response in JSON.

To deactivate the above created custodial DID, call the following endpoint with HTTP method `DELETE`:
http://localhost:5001/did/identifiers/did:web:verification.sphereon.com:did:party_gln:12345678

## Resolve a DID

In order to resolve a DID you will have to call the below endpoint with a `GET` call. The DID value is part of the URL
as a path parameter.

There are 3 modes of resolution, controlled by a query parameter, when calling the resolution endpoint. You can also set
a default mode when no query parameter is being used.

The modes are:

- **local**: Only DIDs managed by the agent can be resolved. DID:web and it's keys are translated to DID documents
- **global**: Resolves DIDs by using the supported resolvers of the agent, allowing external DID resolution
- **hybrid** (default): Tries to resolve locally first. If not found it will fallback to the global mode

http://localhost:5001/did/identifiers/did:web:verification.sphereon.com:did:party_gln:12345678?mode=local

Response example:

```json
{
  "@context": "https://w3id.org/did-resolution/v1",
  "didDocument": {
    "@context": "https://www.w3.org/ns/did/v1",
    "id": "did:web:verification.sphereon.com:did:party_gln:12345678",
    "verificationMethod": [
      {
        "controller": "did:web:verification.sphereon.com:did:party_gln:12345678",
        "id": "did:web:verification.sphereon.com:did:party_gln:12345678#02925110021f5d53468136ad4bf2233596bc8ee22f07c4b37548a346d643fcb73d",
        "publicKeyJwk": {
          "alg": "ES256",
          "use": "sig",
          "kty": "EC",
          "crv": "P-256",
          "x": "klEQAh9dU0aBNq1L8iM1lryO4i8HxLN1SKNG1kP8tz0",
          "y": "87T1XwMjtf1rIc74HXaxW7gDT7liNLtQztADTw61x6Y"
        },
        "type": "JsonWebKey2020"
      }
    ],
    "assertionMethod": [
      "did:web:verification.sphereon.com:did:party_gln:12345678#02925110021f5d53468136ad4bf2233596bc8ee22f07c4b37548a346d643fcb73d"
    ],
    "authentication": [
      "did:web:verification.sphereon.com:did:party_gln:12345678#02925110021f5d53468136ad4bf2233596bc8ee22f07c4b37548a346d643fcb73d"
    ]
  },
  "didResolutionMetadata": {},
  "didDocumentMetadata": {
    "equivalentId": "verification.sphereon.com:did:party_gln:12345678"
  }
}
```

Please note that the agent itself by default internally is always using the `hybrid` mode, whilst the exposed REST API
above by default is using the `global` mode. This has to do with the agent being able to already issue and verify
Credentials with did:web DIDs managed by the agent, even if the respective did:web location might not be available yet.

## Hosting DID:WEB DID Documents

The agent can automatically expose did:web did.json DID Documents managed by the agent. Whenever you hit
http://agent/did/party_gln/12345678/did.json for instance, the agent will lookup the appropriate DID managed by the
agent.

If no DID is found for the URL, it will return the below response, with an HTTP code 404

```json
{
  "error": "Not found"
}
```

Please be aware that the agent is using the URL to determine the hostname. So the below example only works if the agent
is running behind a reverse proxy or load-balancer on the URL `http://localhost`. If you want to test during
development, simply replace the URL with `http://localhost:5001`

If a DID is found it will return the DID Document (not a resolution result)

```json
{
  "@context": "https://www.w3.org/ns/did/v1",
  "id": "did:web:verification.sphereon.com:did:party_gln:12345678",
  "verificationMethod": [
    {
      "controller": "did:web:verification.sphereon.com:did:party_gln:12345678",
      "id": "did:web:verification.sphereon.com:did:party_gln:12345678#02925110021f5d53468136ad4bf2233596bc8ee22f07c4b37548a346d643fcb73d",
      "publicKeyJwk": {
        "alg": "ES256",
        "use": "sig",
        "kty": "EC",
        "crv": "P-256",
        "x": "klEQAh9dU0aBNq1L8iM1lryO4i8HxLN1SKNG1kP8tz0",
        "y": "87T1XwMjtf1rIc74HXaxW7gDT7liNLtQztADTw61x6Y"
      },
      "type": "JsonWebKey2020"
    }
  ],
  "assertionMethod": [
    "did:web:verification.sphereon.com:did:party_gln:12345678#02925110021f5d53468136ad4bf2233596bc8ee22f07c4b37548a346d643fcb73d"
  ],
  "authentication": [
    "did:web:verification.sphereon.com:did:party_gln:12345678#02925110021f5d53468136ad4bf2233596bc8ee22f07c4b37548a346d643fcb73d"
  ]
}
```

### Reverse proxy for DID:WEB hosting

In order to host the custodial did.json files for customers a reverse proxy needs to be configured for the did:web agent
service. When the did:web agent service is enabled, it will automatically try to lookup the DID in the agent, whenever a
URL containing `.well-known/did.json` or `/any/other/path/did.json` is hit with a `GET` call.

This means you can setup a reverse proxy doing TLS termination for your domain and have it point to the agent, using the
same Path.

# Database support

The agent supports SQLite and Postgresql. You can configure different environment variables to setup the DB connection.
See [.env.example](.env.example) for all the options, including SSL/TLS options.

## SQLite

SQLite can be ran without any server, as it can use a local file. This is handy for development purposes.
See the example below to have a database available in the `database/example.db` location.

```properties
# The database connection name
DB_CONNECTION_NAME=default

# Whether to enable the cache on the DB.
DB_CACHE_ENABLED=true

# The Database type. Currently only sqlite and postgresql are supported
DB_TYPE=sqlite

# The URL of the database. Either use the URL (more flexible), or you can also use DB_HOST and DB_PORT for postgres
# In case of sqlite, this should be the path, like 'database/agent_default.sqlite'
# For postgres you can also include username and password: postgresql://user:password:5432/vc-issuer-db
DB_URL="database/agent_default.sqlite"

# The encryption key to use for the database for encrypted fields, like private keys. Needs to be unique per environment.
# Key needs to be in hex with length 64.
DB_ENCRYPTION_KEY=29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c
```

## Postgresql

See the example below to connect with a postgresql DB named `vc-issuer-db` on localhost, with username `user` and
password `password`

```properties
# The database connection name
DB_CONNECTION_NAME=default

# Whether to enable the cache for the DB.
DB_CACHE_ENABLED=true

# The Database type. Currently only sqlite and postgresql are supported
DB_TYPE=postgresql

# The URL of the database. Either use the URL (more flexible), or you can also use DB_HOST and DB_PORT for postgres
# In case of sqlite, this should be the path, like 'database/agent_default.sqlite'
# For postgres you can also include username and password: postgresql://user:password:5432/vc-issuer-db?sslmode=prefer
# When using a postgresl url, the sslmode param options can be found here: https://www.postgresql.org/docs/12/libpq-connect.html
DB_URL="postgresql://user:password@localhost:5432/vc-issuer-db?sslmode=prefer"

# The encryption key to use for the database for encrypted fields, like private keys. Needs to be unique per environment.
# Key needs to be in hex with length 64.
DB_ENCRYPTION_KEY=29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c
```

# Build & Installation

See [README](../../README.md) at the top level project

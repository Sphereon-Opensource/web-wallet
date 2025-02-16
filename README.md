<!--suppress HtmlDeprecatedAttribute -->
<h1 align="center">
  <br>
<a href="https://www.sphereon.com"><img src="https://sphereon.com/content/themes/sphereon/assets/img/logo.svg" alt="Sphereon" width="400"></a>
  <br>SSI web-wallet and agent
  <br>
</h1>

# alpha state

Please be aware that although the wallet can be used to issue credentials, manage presentation definitions, receive and
present credentials using the OID4VC set of specifications, the wallet is still in an alpha stage.

# Web wallet

This module is an open-source web wallet. It allows you to receive credentials using OID4VCI and present them using
OpenID4VP. The wallet can issue credentials using OID4VCI as well and can manage presentation definitions. In the near
future full support for managing the issuer and relying party components will be added. The wallet has support for
authorization code flows as well as pre-authorized flows. Support for using EBSI Legal Entity DIDs is also present.

As mentioned above, the wallet is still very much in an alpha stage and needs polishing in many areas. Please take that
into mind. For more info on the wallet itself see the [README](./packages/web-wallet/README.md) in the web-wallet module
directory.

<a href="docs/images/credential-details.png"><img src="docs/images/credential-details.png" width="800" height="325" /></a>
<br/>
<a href="docs/images/credential-list.png"><img src="docs/images/credential-list.png" width="260" height="120px"/></a>
&nbsp;
<a href="docs/images/credential-issue.png"><img src="docs/images/credential-issue.png" width="260" height="120px"/></a>
&nbsp;
<a href="docs/images/key-add.png"><img src="docs/images/key-add.png" width="260" height="120px"/></a>

# Agent instances

The agent can be configured using several environment variables. Amongst these are variables to enable certain
functionalities of the agent. If you want to use Docker then there are 2 distinct agent versions you can run.

- A standalone agent, to be used without the web wallet, only enabling REST APIs
- The web wallet agent, enabling certain features needed for the web wallet to run

- The Sphereon **Standalone Agent**: This agent running on port 5001 by default, runs without a web-wallet, and
  is responsible for issuance and optional
  storage of Verifiable Credentials. Creating DIDs from the REST API is enabled on this agent. Resolution of DIDs will
  use hybrid resolution, meaning any did:web will be resolved to the actual https endpoint, but it also resolved
  non-published DIDs only available to the agent. The W3C VC API is available, and also support to act as a Relying Party.
- The **Wallet Agent**: This agent running on port 5010 by default, it can create and verify Verifiable
  Credentials using a W3C VC API, or using OID4VC. The DIDs will be resolved in hybrid mode, meaning the agent will
  first look
  whether the DID is managed by the agent and then generate a DID resolution result from the database. If not managed by
  the agent it will perform an external resolution call.

# Agent documentation

The [agent documentation](./packages/agent/README.md) contains information about supported features, methods,
environment variables, as well as how to call the different REST API endpoints

# Building and testing

## Docker

Docker images are provided in the `docker` folder for both agent types. Please read
the [Docker readme](./docker/README.docker.md)

You can run `docker compose up` to run the agents in Docker.

## Postman collection

In the `docs/postman` folder you can find a Postman collection you can import in Postman. This collection allows you to
test the W3C VC API endpoints manually

## OpenAPI

The [OpenAPI definition](./docs/openapi/SPHEREON_VC_API.yaml) for all W3C VC REST endpoints can be found in
the [docs/openapi](./docs/openapi) folder.
You can use the definition to generate models for a target language of choice.
This folder also contains an [HTML documentation](./docs/openapi/index.html) export of the REST API endpoints and
models.

## From source

### Lerna

These module make use of Lerna for managing multiple packages. Lerna is a tool that optimizes the workflow around
managing multi-package repositories with git and pnpm.

### Build

The below command builds all packages for you using lerna

### Pnpm

To build the project [pnpm](https://www.npmjs.com/package/pnpm) is used. Do not confuse this package manager with the
more regular `npm`.

Install pnpm globally:

```shell
npm -g install pnpm
```

Install the dependencies of all the projects

```shell
pnpm install
```

Build the projects

```shell
pnpm build
```

#### Production commands

If you want to run this project in production, directly from the project, instead of using an NPM repo for this project,
follow the below steps.

- Build the project according to the above steps first. This is needed because you will need to create the `dist`
  folders, and it needs the NodeJS and Typescript libraries during build.
- Remove the `node_modules` top-level folder, keep any `dist` folder, as that is where the built project is to be found.
  You can also run the command below (ignore the error about node_modules missing at the end)

```shell
pnpm run clean:modules
```

- Install modules without dev dependencies and also do it offline, since everything should already be available

```shell
pnpm run install:prod
# The above is the same as pnpm install --prod --offline
```

- Running the production installation

```shell
pnpm run start:prod
```

### Utility scripts

There are other utility scripts that help with development.

* `pnpm fix:prettier` - runs `prettier` to fix code style.

### Publish

Please note that currently the packages are marked as internal. Meaning they will not be published to an NPM repository!

There are scripts that can publish the following versions:

* `latest`
* `next`
* `unstable`

```shell
pnpm publish:[version]
```

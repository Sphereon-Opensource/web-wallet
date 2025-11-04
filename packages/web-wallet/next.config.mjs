import i18nNextConfig from './next-i18next.config.mjs'

/** @type {import('next').NextConfig} */
process.env.I18NEXT_DEFAULT_CONFIG_PATH = `./next-i18next.config.mjs`
const nextConfig = {
  i18n: i18nNextConfig.i18n,

  transpilePackages: ['@sphereon/ui-components.ssi-react', '@sphereon/ssi-sdk.ebsi-support', '@sphereon/ssi-sdk.oid4vci-holder'],

  webpack(config, { isServer, dev }) {
    // Disable minification in development mode
    if (dev) {
      config.optimization.minimize = false;
      config.optimization.minimizer = []
    }

    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        typeorm: 'typeorm/browser'
      }
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        events: false,
        dns: false,
      }
    }
    return config
  },

  compiler: {
    styledComponents: {
      ssr: true,
      displayName: true,
      fileName: false,
    },
  },

  async rewrites() {
    return [
      /*JWKS proxy to agent*/
      {
        source: '/.well-known/jwks/:path*',
        destination: `${process.env.NEXT_PUBLIC_AGENT_BASE_URL}/.well-known/jwks/:path*`,
      },
      /*DID: WEB proxy to agent*/
      {
        source: '/:path*/did.json',
        destination: `${process.env.NEXT_PUBLIC_AGENT_BASE_URL}/:path*/did.json`,
      },
    ]
  },
  async redirects() {
    /*FIXME: Most of these redirects should not be here. The OID4VCI link handler should simply listen everywhere*/
    return [
      // Existing rules
      {
        source: '/',
        missing: [
          {
            type: 'query',
            key: 'credential_offer',
          },
          {
            type: 'query',
            key: 'credential_offer_uri',
          },
          {
            type: 'query',
            key: 'request_uri',
          }, {
            type: 'query',
            key: 'response_type',
          },
        ],
        destination: '/credentials',
        permanent: false,
      },
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 'credential_offer',
          },
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false,
      },
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 'credential_offer_uri',
          },
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false,
      },
      {
        source: '/nl',
        has: [
          {
            type: 'query',
            key: 'credential_offer',
          },
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false,
      },
      {
        source: '/nl',
        has: [
          {
            type: 'query',
            key: 'credential_offer_uri',
          },
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false,
      },
      {
        source: '/en',
        has: [
          {
            type: 'query',
            key: 'credential_offer',
          },
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false,
      },
      {
        source: '/en',
        has: [
          {
            type: 'query',
            key: 'credential_offer_uri',
          },
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false,
      },
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 'request_uri',
          },
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false,
      },
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 'response_type',
          },
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false,
      },
      {
        source: '/nl',
        has: [
          {
            type: 'query',
            key: 'request_uri',
          },
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false,
      },
      {
        source: '/nl',
        has: [
          {
            type: 'query',
            key: 'response_type',
          },
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false,
      },
      {
        source: '/en',
        has: [
          {
            type: 'query',
            key: 'request_uri',
          },
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false,
      },
      {
        source: '/en',
        has: [
          {
            type: 'query',
            key: 'response_type',
          },
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false,
      },
      {
        source: '/:path((?!oid4vci).*)',
        has: [
          {
            type: 'query',
            key: 'credential_offer',
          },
        ],
        destination: '/oid4vci',
        permanent: false,
      },
      {
        source: '/:path((?!oid4vci).*)',
        has: [
          {
            type: 'query',
            key: 'credential_offer_uri',
          },
        ],
        destination: '/oid4vci',
        permanent: false,
      },
      {
        source: '/:path((?!siopv2).*)',
        has: [
          {
            type: 'query',
            key: 'request_uri',
          },
        ],
        destination: '/siopv2',
        permanent: false,
      },
      {
        source: '/:path((?!siopv2).*)',
        has: [
          {
            type: 'query',
            key: 'response_type',
          },
        ],
        destination: '/siopv2',
        permanent: false,
      },
    ]
  },
}
export default nextConfig

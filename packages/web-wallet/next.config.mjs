import i18nNextConfig from './next-i18next.config.mjs'

/** @type {import('next').NextConfig} */
process.env.I18NEXT_DEFAULT_CONFIG_PATH = `./next-i18next.config.mjs`
const nextConfig = {
  i18n: i18nNextConfig.i18n,

  transpilePackages: ['@sphereon/ui-components.ssi-react', '@sphereon/ssi-sdk.ebsi-support', '@veramo/did-manager', '@sphereon/ssi-sdk.oid4vci-holder'],

  webpack(config, {dev, isServer}) {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        typeorm: 'typeorm/browser',
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

    if (dev) {
      config.devtool = 'cheap-module-source-map' // or 'cheap-module-source-map'
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
      {
        source: '/.well-known/jwks/:path*',
        destination: '/api/proxy/jwks/:path*',
      },
      {
        source: '/:path*/did.json',
        destination: '/api/proxy/did/:path*/did.json',
      },
      {
        source: '/key-management/:path*',
        destination: '/keyManagement/:path*',
      },
    ]
  },
  async redirects() {
    /*FIXME: Most of these redirects should not be here. The OID4VCI link handler should simply listen everywhere*/
    return [
      // OID4VCI and SIOPV2 redirects
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

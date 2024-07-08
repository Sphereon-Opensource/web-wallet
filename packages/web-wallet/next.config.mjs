import i18nNextConfig from './next-i18next.config.mjs';
/** @type {import('next').NextConfig} */
process.env.I18NEXT_DEFAULT_CONFIG_PATH = `./next-i18next.config.mjs`;
const nextConfig = {
  i18n: i18nNextConfig.i18n,
  swcMinify: false,
  compiler: {
    styledComponents:  {
      ssr: true,
      displayName: true,
      fileName: false,
    }
  },
  async rewrites() {
    return [
      {
        source: "/.well-known/jwks/:path*",
        destination: `${process.env.NEXT_PUBLIC_AGENT_BASE_URL}/.well-known/jwks/:path*`,
      },
    ]
  },
  async redirects() {
    /*FIXME: Most of these redirects should not be here. The OID4VCI link handler should simply listen everywhere*/
    return [
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
          },
        ],
        destination: '/credentials',
        permanent: false
      },
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 'credential_offer',
          }
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false
      },
      {
        source: '/nl',
        has: [
          {
            type: 'query',
            key: 'credential_offer',
          }
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false
      },
      {
        source: '/en',
        has: [
          {
            type: 'query',
            key: 'credential_offer',
          }
        ],
        locale: false,
        destination: '/oid4vci',
        permanent: false
      },
      {
        source: '/',
        has: [
          {
            type: 'query',
            key: 'request_uri',
          }
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false
      },
      {
        source: '/nl',
        has: [
          {
            type: 'query',
            key: 'request_uri',
          }
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false
      },
      {
        source: '/en',
        has: [
          {
            type: 'query',
            key: 'request_uri',
          }
        ],
        locale: false,
        destination: '/siopv2',
        permanent: false
      },
      {
        source: '/:path((?!oid4vci).*)',
        has: [
          {
            type: 'query',
            key: 'credential_offer',
          }
        ],
        destination: '/oid4vci',
        permanent: false
      },
      {
        source: '/:path((?!oid4vci).*)',
        has: [
          {
            type: 'query',
            key: 'credential_offer_uri',
          }
        ],
        destination: '/oid4vci',
        permanent: false
      },
      {
        source: '/:path((?!siopv2).*)',
        has: [
          {
            type: 'query',
            key: 'request_uri',
          }
        ],
        destination: '/siopv2',
        permanent: false
      }
    ]
  }
};
export default nextConfig;

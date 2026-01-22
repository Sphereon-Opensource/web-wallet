import {serverSideTranslations} from 'next-i18next/serverSideTranslations'
import {GetServerSidePropsContext} from 'next'
import nextI18NextConfig from '../next-i18next.config.mjs'

// This page is handled by React Router in _app.tsx
// The landing page component is rendered via AppRouter
export default function Index() {
  return null
}

export const getServerSideProps = async ({locale}: GetServerSidePropsContext) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'], nextI18NextConfig)),
    },
  }
}

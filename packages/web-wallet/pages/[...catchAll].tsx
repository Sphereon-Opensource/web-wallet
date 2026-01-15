import {ErrorComponent} from '@refinedev/core'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'
import {GetServerSidePropsContext} from 'next'
import nextI18NextConfig from '../next-i18next.config.mjs'

export default function CatchAll() {
  return <ErrorComponent />
}

export const getServerSideProps = async ({locale}: GetServerSidePropsContext) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'], nextI18NextConfig)),
    },
  }
}

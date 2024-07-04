import {SSRConfig} from 'next-i18next'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations.js'
import nextI18NextConfig from '../../../next-i18next.config.mjs'

export const staticPropsWithSST = async ({locale}: {locale: string}): Promise<{props: SSRConfig}> => ({
  props: {
    ...(await serverSideTranslations(locale ?? nextI18NextConfig.i18n.defaultLocale, ['common'], nextI18NextConfig)),
  },
})

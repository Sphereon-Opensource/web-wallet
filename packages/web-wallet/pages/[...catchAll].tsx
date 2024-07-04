import {ErrorComponent} from '@refinedev/core'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'

export default function CatchAll() {
  return <ErrorComponent />
}

export const getServerSideProps = serverSideTranslations

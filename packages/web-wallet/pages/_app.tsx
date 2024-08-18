// import {DevtoolsProvider, DevtoolsPanel} from '@refinedev/devtools'
import React from 'react'
import {AppProps} from 'next/app'
import type {NextPage} from 'next'
import {SessionProvider, useSession} from 'next-auth/react'
import {appWithTranslation, useTranslation} from 'next-i18next'
import {I18nProvider, Refine, ResourceProps} from '@refinedev/core'
import routerProvider from '@refinedev/react-router-v6'
import dataProvider from '@refinedev/simple-rest'
import {dataProvider as supabaseDataProvider, liveProvider as supabaseLiveProvider} from '@refinedev/supabase'
import TopNavigationBar from '@components/bars/TopNavigationBar'
import SideNavigationBar from '@components/bars/SideNavigationBar'
import AppRouter from '../src/router/AppRouter'
import {BrowserRouter} from 'react-router-dom'
import {getAuthProvider} from '@helpers/AuthProvider'
import {supabaseServiceClient} from '@helpers/SupabaseClient'
import {ContactRoute, DataProvider, DataResource, KeyManagementRoute, MainRoute} from '@typings'
import {keysDataProvider} from '@/src/dataProviders/keysDataProvider'
import {identifiersDataProvider} from '@/src/dataProviders/identifiersDataProvider'
import {presentationDefinitionDataProvider} from '@/src/dataProviders/presentationDefinitionDataProvider'
import '../src/styles/global.css'
import styles from './App.module.css'
import '../app/constants'
// initialize i18n
import '../src/i18n/client'

// Do not remove. We need to import CSS, which is available in the dist folder
import '@sphereon/ui-components.ssi-react/dist/components/views/FormView/styles.css'
import {credentialDataProvider} from '@/src/dataProviders/credentialDataProvider'

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  noLayout?: boolean
}

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

const _app = (props: React.PropsWithChildren<unknown>) => {
  const {data, status} = useSession()
  const {t, i18n} = useTranslation()
  const i18nProvider: I18nProvider = {
    translate: (key: string, options?: any, defaultMessage?: string) => t(key, options).toString(),
    changeLocale: (lang: string) => i18n.changeLanguage(lang),
    getLocale: () => i18n.language,
  }

  if (status === 'loading') {
    return <span>loading...</span>
  }

  const resources: Array<ResourceProps> = [
    {
      name: DataResource.CONTACTS,
      list: MainRoute.CONTACTS,
      show: `${MainRoute.CONTACTS}/${MainRoute.SUB_ID}`,
    },
    {
      name: DataResource.PERSON_CONTACTS,
      create: `${MainRoute.CONTACTS}/${ContactRoute.NATURAL_PERSON}/${MainRoute.SUB_CREATE}`,
    },
    {
      name: DataResource.ORGANIZATION_CONTACTS,
      create: `${MainRoute.CONTACTS}/${ContactRoute.ORGANIZATION}/${MainRoute.SUB_CREATE}`,
    },
    {
      name: DataResource.ASSETS,
      list: MainRoute.ASSETS,
      create: `${MainRoute.ASSETS}/${MainRoute.SUB_CREATE}`,
      show: `${MainRoute.ASSETS}/${MainRoute.SUB_ID}`,
    },
    {
      name: DataResource.CREDENTIALS,
      list: MainRoute.CREDENTIALS,
      create: `${MainRoute.CREDENTIALS}/${MainRoute.SUB_CREATE}`,
      show: `${MainRoute.CREDENTIALS}/${MainRoute.SUB_ID}`,
      meta: {dataProviderName: DataProvider.CREDENTIALS},
    },
    {
      name: DataResource.WORKFLOWS,
      list: MainRoute.WORKFLOW,
    },
    {
      name: DataResource.DOCUMENTS,
      list: MainRoute.DOCUMENTS,
    },
    {
      name: DataResource.IDENTIFIERS,
      list: `${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`,
      create: `${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}/${MainRoute.SUB_CREATE}`,
      meta: {dataProviderName: DataProvider.IDENTIFIERS},
    },
    {
      name: DataResource.KEYS,
      meta: {dataProviderName: DataProvider.KEYS},
    },
    {
      name: DataResource.PRESENTATION_DEFINITIONS,
      list: MainRoute.PRESENTATION_DEFINITIONS,
      create: `${MainRoute.PRESENTATION_DEFINITIONS}/${MainRoute.SUB_CREATE}`,
      show: `${MainRoute.PRESENTATION_DEFINITIONS}/${MainRoute.SUB_ID}`,
      edit: `${MainRoute.PRESENTATION_DEFINITIONS}/${MainRoute.SUB_EDIT}/${MainRoute.SUB_ID}`,
      meta: {dataProviderName: DataProvider.PRESENTATION_DEFINITIONS},
    },
  ]

  const dataProviders = {
    [DataProvider.DEFAULT]: dataProvider(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010'),
    [DataProvider.SUPABASE]: supabaseDataProvider(supabaseServiceClient),
    [DataProvider.CREDENTIALS]: credentialDataProvider(),
    [DataProvider.KEYS]: keysDataProvider(),
    [DataProvider.IDENTIFIERS]: identifiersDataProvider(),
    [DataProvider.PRESENTATION_DEFINITIONS]: presentationDefinitionDataProvider(),
  }

  return (
    <BrowserRouter>
      {/* <DevtoolsProvider>*/}
      <Refine
        routerProvider={routerProvider}
        dataProvider={dataProviders}
        liveProvider={supabaseLiveProvider(supabaseServiceClient)}
        authProvider={getAuthProvider(data, status)}
        i18nProvider={i18nProvider}
        resources={resources}
        options={{
          liveMode: 'auto',
          syncWithLocation: true,
          warnWhenUnsavedChanges: true,
          projectId: 'eufd47-35LeGm-U738uV',
        }}>
        <div className={styles.container}>
          <TopNavigationBar title={t('top_navigation_header_title')} />
          <div className={styles.main}>
            <SideNavigationBar />
            <main className={styles.fragment}>
              <AppRouter />
            </main>
          </div>
        </div>
      </Refine>
      {/*   <DevtoolsPanel />
      </DevtoolsProvider>*/}
    </BrowserRouter>
  )
}

function WebWalletApp({Component, pageProps: {session, ...pageProps}}: AppPropsWithLayout): JSX.Element {
  const renderComponent = () => {
    if (Component.noLayout) {
      return <Component supressHydrationWarning {...pageProps} />
    }

    return <Component supressHydrationWarning {...pageProps} />
  }

  return (
    <SessionProvider session={session}>
      <_app>{renderComponent()}</_app>
    </SessionProvider>
  )
}

export default appWithTranslation(WebWalletApp)

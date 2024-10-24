import React, {ReactElement} from 'react'
import {useTranslate} from '@refinedev/core'
import SideNavigationCategory from '@components/bars/SideNavigationBar/SideNavigationCategory'
import {KeyManagementRoute, MainRoute, NavigationRoute} from '@typings'
import style from './index.module.css'

const SideNavigationBar: React.FC = (): ReactElement => {
  const translate = useTranslate()

  return (
    <nav className={style.container}>
      <div className={style.routesContainer}>
        {/* <SideNavigationCategory target={MainRoute.ASSETS} label={translate('navigation_side_menu_assets_label')} /> */}
        {/* <SideNavigationCategory target={MainRoute.WORKFLOW} label={translate('navigation_side_menu_workflow_label')} /> */}
        <SideNavigationCategory target={MainRoute.CONTACTS} label={translate('navigation_side_menu_contacts_label')} />
        <SideNavigationCategory
          target={MainRoute.CREDENTIALS}
          label={translate('navigation_side_menu_credentials_label')}
          routes={[
            !process.env.NEXT_PUBLIC_DISABLE_ISSUER_INTERFACE
              ? {
                  target: `${MainRoute.CREDENTIALS}/create`,
                  label: translate('navigation_side_menu_credentials_issue_credentials_label'),
                }
              : undefined,
            {
              target: `${MainRoute.CREDENTIALS}`,
              label: translate('navigation_side_menu_credentials_my_credentials_label'),
            },
          ].filter((route): route is NavigationRoute => route !== undefined)}
        />
{/*        <SideNavigationCategory target={MainRoute.DOCUMENTS} label={translate('navigation_side_menu_documents_label')} />*/}
        <SideNavigationCategory
          target={MainRoute.KEY_MANAGEMENT}
          label={translate('navigation_side_menu_key_management_label')}
          routes={[
            {
              target: `${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.IDENTIFIERS}`,
              label: translate('navigation_side_menu_key_management_identifiers_label'),
            },
            {target: `${MainRoute.KEY_MANAGEMENT}/${KeyManagementRoute.KEYS}`, label: translate('navigation_side_menu_key_management_keys_label')},
          ]}
        />
        <SideNavigationCategory target={MainRoute.PRESENTATION_DEFINITIONS} label={translate('presentation_definitions_overview_title')} />
      </div>
      {/*// TODO implementation*/}
      {/*<div className={style.settingsContainer}>*/}
      {/*  <NavigationLinkButton target={'/settings'} />*/}
      {/*</div>*/}
    </nav>
  )
}

export default SideNavigationBar

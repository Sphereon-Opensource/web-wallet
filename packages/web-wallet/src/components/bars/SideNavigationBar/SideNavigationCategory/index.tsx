import {SSIArrowDownIcon} from '@sphereon/ui-components.ssi-react'
import React, {ReactElement, useState} from 'react'
import {NavigationRoute, MainRoute} from '@typings'
import style from './index.module.css'
import AssetIcon from '@components/assets/icons/AssetIcon'
import {NavLink} from 'react-router-dom'
import WorkflowIcon from '@components/assets/icons/WorkflowIcon'
import ContactIcon from '@components/assets/icons/ContactIcon'
import CredentialIcon from '@components/assets/icons/CredentialIcon'
import DocumentsListIcon from '@components/assets/icons/DocumentsListIcon'
import MoreIcon from '@components/assets/icons/MoreIcon'
import KeyIcon from '@components/assets/icons/KeyIcon'
import RelyingPartyIcon from '@components/assets/icons/RelyingPartyIcon'

type Props = {
  target: string
  label?: string
  routes?: Array<NavigationRoute>
}

const SideNavigationCategory: React.FC<Props> = (props: Props): ReactElement => {
  const {label, routes = [], target} = props
  const [isCollapsed, setIsCollapsed] = useState(true)
  const icon: ReactElement = getIcon(target)

  const toggleCollapse = async (): Promise<void> => {
    setIsCollapsed(!isCollapsed)
  }

  const getRouteElements = (): Array<ReactElement> => {
    return routes.map((route: NavigationRoute, index: number) => (
      <NavLink key={index} to={route.target} className={style.navigationLink}>
        <div className={style.subRouteLabel}>{route.label}</div>
      </NavLink>
    ))
  }

  return (
    <div>
      <div className={style.mainRouteContainer}>
        <NavLink to={target} className={style.navigationLink}>
          {({isActive}) => (
            <>
              <div className={style.mainRouteIconContainer}>{React.cloneElement(icon, {...(isActive && {color: '#7C40E8'})})}</div>
              {label && (
                <div className={style.mainRouteLabel} style={{...(isActive && {color: '#303030', fontWeight: '600'})}}>
                  {label}
                </div>
              )}
            </>
          )}
        </NavLink>
        {routes.length > 0 && (
          <div
            className={style.dropdownIconContainer}
            style={{...(isCollapsed && {transform: 'scaleY(-1)'})}}
            onClick={async (): Promise<void> => {
              await toggleCollapse()
            }}>
            <SSIArrowDownIcon />
          </div>
        )}
      </div>
      {routes.length > 0 && (
        <div className={style.dropdownContainer} style={{...(isCollapsed && {display: 'none'})}}>
          {getRouteElements()}
        </div>
      )}
    </div>
  )
}

const getIcon = (target: string): ReactElement => {
  switch (target) {
    case MainRoute.ASSETS:
      return <AssetIcon />
    case MainRoute.WORKFLOW:
      return <WorkflowIcon />
    case MainRoute.CONTACTS:
      return <ContactIcon />
    case MainRoute.CREDENTIALS:
      return <CredentialIcon height={20} width={26} />
    case MainRoute.DOCUMENTS:
      return <DocumentsListIcon height={20} width={26} />
    case MainRoute.KEY_MANAGEMENT:
      return <KeyIcon />
    case MainRoute.PRESENTATION_DEFINITIONS:
      return <RelyingPartyIcon size={35} />
    case MainRoute.SETTINGS:
      return <MoreIcon />
    default:
      return <div />
  }
}

export default SideNavigationCategory

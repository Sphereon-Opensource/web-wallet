import {SSIArrowDownIcon} from '@sphereon/ui-components.ssi-react'
import React, {ReactElement, useEffect, useState} from 'react'
import {DetailsRoute} from '@typings'
import style from './index.module.css'

type Props = {
  routeId: string
  label: string
  isActive: boolean
  routes?: Array<DetailsRoute>
  onRouteChange?: (routeId: string) => Promise<void>
}

const SideDetailsNavigationCategory: React.FC<Props> = (props: Props): ReactElement => {
  const {onRouteChange, isActive, label, routes = [], routeId} = props
  const [isCollapsed, setIsCollapsed] = useState(true)

  useEffect((): void => {
    setIsCollapsed(true)
  }, [isActive])

  const toggleCollapse = async (): Promise<void> => {
    setIsCollapsed(!isCollapsed)
  }

  const getRouteElements = (): Array<ReactElement> => {
    return routes.map((route: DetailsRoute) => (
      <div key={route.routeId} className={style.dropdownRouteContainer} onClick={() => onRouteClick(route.routeId)}>
        <div className={style.dropdownRouteCaption}>{route.label}</div>
      </div>
    ))
  }

  const onRouteClick = async (routeId: string): Promise<void> => {
    if (onRouteChange) {
      await onRouteChange(routeId)
    }
  }

  if (!isActive) {
    return (
      <div className={style.inactiveContainer} onClick={() => onRouteClick(routeId)}>
        <div className={style.inactiveCaption}>{label}</div>
      </div>
    )
  }

  return (
    <div className={style.activeContainer}>
      <div
        className={style.activeRouteContainer}
        onClick={async (): Promise<void> => {
          await toggleCollapse()
          await onRouteClick(routeId)
        }}>
        <div className={style.activeIndicatorContainer}>
          <div className={style.activeIndicator} />
        </div>
        <div className={style.activeCaption}>{label}</div>
        {routes && routes.length > 0 && (
          <div className={style.dropdownIconContainer} style={{...(isCollapsed && {transform: 'scaleY(-1)'})}}>
            <SSIArrowDownIcon />
          </div>
        )}
      </div>

      {routes.length > 0 && (
        <div className={style.dropdownRoutesContainer} style={{...(isCollapsed && {display: 'none'})}}>
          {getRouteElements()}
        </div>
      )}
    </div>
  )
}

export default SideDetailsNavigationCategory

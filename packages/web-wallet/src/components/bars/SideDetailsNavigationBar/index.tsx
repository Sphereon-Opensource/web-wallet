import React, {ReactElement, useState} from 'react'
import SideDetailsNavigationCategory from '@components/bars/SideDetailsNavigationBar/SideDetailsNavigationCategory'
import {DetailsRoute} from '@typings'
import style from './index.module.css'

type Props = {
  routes: Array<DetailsRoute>
  title?: string
  initialRoute?: string
  onRouteChange?: (routeId: string) => Promise<void>
}

const SideDetailsNavigationBar: React.FC<Props> = (props: Props): ReactElement => {
  const {title, routes = [], initialRoute, onRouteChange} = props
  const [activeRouteId, setActiveRouteId] = useState<string | undefined>(initialRoute)

  const onRouteChanged = async (routeId: string): Promise<void> => {
    setActiveRouteId(routeId)
    if (onRouteChange) {
      await onRouteChange(routeId)
    }
  }

  const getRouteElements = (): Array<ReactElement> => {
    return routes.map((route: DetailsRoute) => (
      <SideDetailsNavigationCategory
        key={route.routeId}
        routeId={route.routeId}
        label={route.label}
        routes={route.routes}
        isActive={route.routes?.some((route: DetailsRoute) => activeRouteId === route.routeId) || activeRouteId === route.routeId}
        onRouteChange={onRouteChanged}
      />
    ))
  }

  return (
    <div className={style.container}>
      {title && (
        <div className={style.titleContainer}>
          <div className={style.titleCaption}>{title}</div>
        </div>
      )}
      <div className={style.routesContainer}>{getRouteElements()}</div>
    </div>
  )
}

export default SideDetailsNavigationBar

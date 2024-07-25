import React, {createContext, ReactNode, useContext, useEffect} from 'react'
import {Location, useLocation, useNavigate} from 'react-router-dom'
import {navigationEventEmitter, NavigationEvent} from '@typings'

interface NavigationContextType {
  navigateTo: (path: string, state?: any) => void
  location: Location
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

interface NavigationProviderProps {
  children: ReactNode
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({children}) => {
  const navigate = useNavigate()
  const location = useLocation()

  const navigateTo = (path: string, state?: any) => {
    navigate(path, {state})
  }

  useEffect(() => {
    const handleNavigationEvent = ({path, state}: NavigationEvent) => {
      navigate(path, {state})
    }

    navigationEventEmitter.on('navigate', handleNavigationEvent)
    return () => {
      navigationEventEmitter.off('navigate', handleNavigationEvent)
    }
  }, [])

  return <NavigationContext.Provider value={{navigateTo, location}}>{children}</NavigationContext.Provider>
}

export const useNavigationContext = (): NavigationContextType => {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigationContext must be used within a NavigationProvider')
  }
  return context
}

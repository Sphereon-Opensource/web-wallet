import {EventEmitter} from 'events'

export enum NavigationEventListenerType {
  POPSTATE = 'popstate',
}

export interface NavigationEvent {
  path: string
  state?: any
}

class NavigationEventEmitter {
  private emitter = new EventEmitter()

  navigateTo(path: string, state?: object) {
    this.emitter.emit('navigate', {path, ...(state && {state})})
  }

  on(path: string, handleNavigationEvent: (event: NavigationEvent) => void) {
    this.emitter.on(path, handleNavigationEvent)
  }

  off(path: string, handleNavigationEvent: (event: NavigationEvent) => void) {
    this.emitter.off(path, handleNavigationEvent)
  }
}

export const navigationEventEmitter = new NavigationEventEmitter()

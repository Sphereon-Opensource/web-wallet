// TODO I heard this component already exists somewhere, replace when found

import React from 'react'
import style from './index.module.css'

type Props = {
  panelState: 'VALID' | 'WARN' | 'ERROR'
  children: React.ReactNode
}

const Panel: React.FC<Props> = ({panelState, children}) => {
  return <div className={`${style.panel} ${style[panelState]}`}>{children}</div>
}

export default Panel

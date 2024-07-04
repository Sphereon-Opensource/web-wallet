import {SSIArrowDownIcon} from '@sphereon/ui-components.ssi-react'
import React, {FC, ReactElement} from 'react'
import style from './index.module.css'

export type Props = {
  title?: string
  path?: string
  onBack?: () => Promise<void>
}

const getPathElements = (path: string): Array<ReactElement> => {
  // TODO this should come from the url
  const pathParts: Array<string> = path.split('/')
  return pathParts.map((part: string, index: number) => {
    return (
      <div key={index} className={style.pathPartText} style={{fontWeight: index + 1 === pathParts.length ? '600' : '400'}}>
        {index === 0 ? part : ` / ${part}`}
      </div>
    )
  })
}

const PageHeaderBar: FC<Props> = (props: Props): ReactElement => {
  const {path, title, onBack} = props

  return (
    <div className={style.container}>
      {path && <div className={style.pathContainer}>{getPathElements(path)}</div>}
      <div className={style.titleContainer}>
        {onBack && (
          <div className={style.backButtonContainer} onClick={onBack}>
            <SSIArrowDownIcon style={{transform: 'rotate(90deg)'}} />
          </div>
        )}
        {title && <div className={style.titleText}>{title}</div>}
      </div>
    </div>
  )
}

export default PageHeaderBar

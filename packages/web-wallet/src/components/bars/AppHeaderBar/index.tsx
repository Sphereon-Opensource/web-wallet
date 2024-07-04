import {SSITextH1Styled as HeaderTitle} from '@sphereon/ui-components.ssi-react'
import React, {FC, ReactElement} from 'react'
import style from './index.module.css'

export type Props = {
  title: string
}

const AppHeaderBar: FC<Props> = (props: Props): ReactElement => {
  const {title} = props

  return (
    <div className={style.container}>
      <HeaderTitle className={style.titleCaption}>{title}</HeaderTitle>
    </div>
  )
}

export default AppHeaderBar

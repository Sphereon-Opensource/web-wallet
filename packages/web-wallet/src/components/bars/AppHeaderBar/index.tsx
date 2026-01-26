import {SSITextH1Styled as HeaderTitle} from '@sphereon/ui-components.ssi-react'
import React, {FC, ReactElement} from 'react'
import style from './index.module.css'

export type Props = {
  title: string
  onBack?: () => void
}

const AppHeaderBar: FC<Props> = (props: Props): ReactElement => {
  const {title, onBack} = props

  return (
    <div className={style.container}>
      {onBack && (
        <button
          className={style.backButton}
          onClick={onBack}
          aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <HeaderTitle className={style.titleCaption}>{title}</HeaderTitle>
    </div>
  )
}

export default AppHeaderBar

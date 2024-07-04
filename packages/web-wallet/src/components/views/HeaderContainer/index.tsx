import React, {ReactElement} from 'react'
import styles from './index.module.css'
import CrossIcon from '@components/assets/icons/CrossIcon'

type Props = {
  titleCaption: string
  subTitleCaption?: string
  subCloseCaption?: string
  onClose: () => Promise<void>
}

const HeaderContainer: React.FC<Props> = (props: Props): ReactElement => {
  const {titleCaption, subTitleCaption, subCloseCaption, onClose} = props

  return (
    <div className={styles.headerContainer}>
      <div className={styles.headerTitleContainer}>
        <div className={styles.headerTitleCaptionContainer}>
          <div className={styles.headerTitleCaption}>{titleCaption}</div>
        </div>
        <div className={styles.headerTitleCloseButtonContainer}>
          <div className={styles.closeButton} onClick={onClose}>
            <CrossIcon />
          </div>
        </div>
      </div>
      <div className={styles.headerSubTitleContainer}>
        {subTitleCaption && <div className={styles.headerSubTitleContactNameCaption}>{subTitleCaption}</div>}
        {subCloseCaption && <div className={styles.headerSubTitleDateCaption}>{subCloseCaption}</div>}
      </div>
    </div>
  )
}

export default HeaderContainer

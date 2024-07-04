import React, {CSSProperties, ReactElement} from 'react'
import styles from './index.module.css'

type Props = {
  style?: CSSProperties
  caption?: string
  description?: string
}

const ItemCaption: React.FC<Props> = (props: Props): ReactElement => {
  const {style, caption, description} = props

  return (
    <div className={styles.itemCaption} style={style}>
      {caption && <div className={styles.itemCaptionValue}>{caption}</div>}
      {description && <div className={styles.itemCaptionDescription}>{description}</div>}
    </div>
  )
}

export default ItemCaption

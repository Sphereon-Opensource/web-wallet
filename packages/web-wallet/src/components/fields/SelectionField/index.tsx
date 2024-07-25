import React, {CSSProperties, ReactElement} from 'react'
import styles from './index.module.css'
import {fontColors} from '@sphereon/ui-components.core'
import BinIcon from '@components/assets/icons/BinIcon'
import {SelectionFieldDetail} from '@typings'
import {PencilIcon} from '@sphereon/ui-components.ssi-react'

type Props = {
  value?: string
  details?: SelectionFieldDetail[]
  onEdit?: () => Promise<void>
  onRemove?: () => Promise<void>
  style?: CSSProperties
}

const SelectionField: React.FC<Props> = (props: Props): ReactElement => {
  const {value, details = [], onEdit, onRemove, style} = props

  const onEditClick = async (): Promise<void> => {
    if (onEdit) {
      await onEdit()
    }
  }

  const onRemoveClick = async (): Promise<void> => {
    if (onRemove) {
      await onRemove()
    }
  }

  const getSelectionFieldDetailElements = (details: SelectionFieldDetail[]): JSX.Element[] => {
    return details.map((fieldValue: SelectionFieldDetail, index: number) => (
      <div key={index}>
        {fieldValue.title && <div className={styles.subHeader}>{fieldValue.title}</div>}
        <div className={styles.valueCaption}>{fieldValue.value}</div>
      </div>
    ))
  }

  return (
    <div className={styles.container} style={style}>
      <div className={styles.innerContainer}>
        <div className={styles.feedbackContainer} />
        <div className={styles.content}>
          {value && <div className={styles.inputText}>{value}</div>}
          {getSelectionFieldDetailElements(details)}
        </div>

        {onEdit && (
          <div className={styles.editButton} style={{backgroundColor: 'red'}} onClick={onEditClick}>
            <PencilIcon color={fontColors.lightGrey} />
          </div>
        )}
      </div>
      {onRemove && (
        <div className={styles.removeButton} onClick={onRemoveClick}>
          <BinIcon />
        </div>
      )}
    </div>
  )
}

export default SelectionField

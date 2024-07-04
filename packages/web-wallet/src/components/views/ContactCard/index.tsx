import {useTranslate} from '@refinedev/core'
import React, {CSSProperties, ReactElement} from 'react'
import styles from './index.module.css'
import {Contact} from '@sphereon/ssi-sdk.data-store'

type Props = {
  contact: Contact
  style?: CSSProperties
}

const ContactCard: React.FC<Props> = (props: Props): ReactElement => {
  const {style, contact} = props
  const translate = useTranslate()

  return (
    <div className={styles.container} style={style}>
      {/*TODO implement feedback element*/}
      <div className={styles.feedbackContainer} />
      <div className={styles.contentContainer}>
        <div className={styles.inputText}>{contact.displayName}</div>
        <div className={styles.fieldContainer}>
          <div className={styles.label}>{translate('contact_card_contact_id_label')}</div>
          <div className={styles.fieldValue}>{contact.id}</div>
        </div>
      </div>
    </div>
  )
}

export default ContactCard

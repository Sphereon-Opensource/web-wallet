import React, {ReactElement, ReactNode} from 'react'
import styles from './FieldList.module.css'

export type FieldItem = {
  label: string
  value: ReactNode
  mono?: boolean
}

type Props = {
  fields: FieldItem[]
}

/**
 * FieldList - A list of label/value pairs for use in AccentCard
 *
 * Usage:
 * ```tsx
 * <AccentCard title="Supplier" name="Cloud Services B.V.">
 *   <FieldList fields={[
 *     { label: 'VAT Number', value: 'NL123456789B01' },
 *     { label: 'DID', value: 'did:web:example.com', mono: true },
 *   ]} />
 * </AccentCard>
 * ```
 */
const FieldList: React.FC<Props> = ({fields}): ReactElement => {
  return (
    <div className={styles.container}>
      {fields.map((field, index) => (
        <div key={index} className={styles.field}>
          <span className={styles.label}>{field.label}</span>
          <span className={`${styles.value} ${field.mono ? styles.mono : ''}`}>{field.value}</span>
        </div>
      ))}
    </div>
  )
}

export default FieldList

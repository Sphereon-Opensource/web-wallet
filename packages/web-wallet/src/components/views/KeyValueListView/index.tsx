import React, {ReactElement, useEffect, useState} from 'react'
import short from 'short-uuid'
import {KeyValuePair} from '@typings'
import style from './index.module.css'

type Props = {
  title?: string
  data: Array<KeyValuePair>
}

const getRowElements = (data: Array<KeyValuePair>): Array<ReactElement> => {
  return data.map((pair: KeyValuePair) => (
    <div key={short.generate()} className={style.rowContainer}>
      <div className={style.keyText}>{pair.label}</div>
      <div className={style.valueText}>{pair.value}</div>
    </div>
  ))
}

const KeyValueListView: React.FC<Props> = (props: Props): ReactElement => {
  const {title, data} = props
  const [rows, setRows] = useState<Array<ReactElement>>([])

  useEffect((): void => {
    setRows(getRowElements(data))
  }, [data])

  return (
    <div className={style.container}>
      {title && <div className={style.captionText}>{title}</div>}
      <div className={style.contentContainer}>{rows}</div>
    </div>
  )
}

export default KeyValueListView

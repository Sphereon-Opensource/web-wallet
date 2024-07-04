import React, {ChangeEvent, ReactElement} from 'react'
import style from './index.module.css'

type Props = {
  placeholder?: string
  onChangeValue?: (value: string) => Promise<void>
}

const TextArea: React.FC<Props> = (props: Props): ReactElement => {
  const {onChangeValue, placeholder} = props

  const onChange = async (event: ChangeEvent<HTMLTextAreaElement>): Promise<void> => {
    if (onChangeValue) {
      await onChangeValue(event.target.value)
    }
  }

  return <textarea className={style.textArea} onChange={onChange} placeholder={placeholder} />
}

export default TextArea

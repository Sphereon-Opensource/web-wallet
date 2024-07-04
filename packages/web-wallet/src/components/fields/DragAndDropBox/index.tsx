import React, {ChangeEvent, DragEvent, ReactElement, useRef} from 'react'
import style from './index.module.css'

type Props = {
  caption: string
  description?: string
  onChangeFile: (file: File) => Promise<void>
}

const DragAndDropBox: React.FC<Props> = (props: Props): ReactElement => {
  const {caption, description, onChangeFile} = props
  const inputFile = useRef<HTMLInputElement | null>(null)

  const onSelect = async (): Promise<void> => {
    inputFile.current?.click()
  }

  const onChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file: File | undefined = event.target.files?.[0]
    if (file) {
      await onChangeFile(file)
    }
  }

  const onDrop = async (event: DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault()
    const file: File = event.dataTransfer.files[0]
    const reader: FileReader = new FileReader()
    reader.onload = async (): Promise<void> => {
      await onChangeFile(file)
    }

    reader.readAsText(file)
  }

  const onDragOver = async (event: DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault()
  }

  return (
    <div className={style.container} onClick={onSelect} onDrop={onDrop} onDragOver={onDragOver}>
      <input className={style.hiddenInput} ref={inputFile} type="file" onChange={onChange} />
      <div className={style.captionContainer}>
        <div className={style.caption}>{caption}</div>
        <div className={style.description}>{description}</div>
      </div>
    </div>
  )
}

export default DragAndDropBox

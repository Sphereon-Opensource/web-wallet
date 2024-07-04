import React, {FC, ReactElement, ReactNode} from 'react'
import style from './index.module.css'

export interface IProps {
  content: ReactNode
  onClose: () => Promise<void>
}

const SidePanelModal: FC<IProps> = (props: IProps): ReactElement => {
  const {content, onClose} = props

  return (
    <div className={style.overlay} onClick={onClose}>
      <div className={style.container} onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => event.stopPropagation()}>
        {content}
      </div>
    </div>
  )
}

export default SidePanelModal

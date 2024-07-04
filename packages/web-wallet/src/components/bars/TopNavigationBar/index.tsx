import React, {ReactElement} from 'react'
import ProfileSwitcher from '@components/profiles/ProfileSwitcher'
import style from './index.module.css'

export type Props = {
  title: string
}

const TopNavigationBar: React.FC<Props> = (props: Props): ReactElement => {
  const {title} = props

  return (
    <div className={style.container}>
      <p className={style.titleCaption}>{title}</p>
      <ProfileSwitcher />
    </div>
  )
}

export default TopNavigationBar

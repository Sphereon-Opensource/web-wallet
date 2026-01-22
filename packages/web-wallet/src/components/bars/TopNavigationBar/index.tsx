import React, {ReactElement} from 'react'
import {Link} from 'react-router-dom'
import ProfileSwitcher from '@components/profiles/ProfileSwitcher'
import style from './index.module.css'

export type Props = {
  title: string
}

const TopNavigationBar: React.FC<Props> = (props: Props): ReactElement => {
  const {title} = props

  return (
    <div className={style.container}>
      <Link to="/" className={style.titleLink}>
        <p className={style.titleCaption}>{title}</p>
      </Link>
      <ProfileSwitcher />
    </div>
  )
}

export default TopNavigationBar

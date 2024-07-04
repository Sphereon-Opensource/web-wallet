import React, {ReactElement} from 'react'
import style from './index.module.css'
import {staticPropsWithSST} from '../../../src/i18n/server'

// FIXME CWALL-214 needs further implementation
const SelectCredentialsPage: React.FC = (): ReactElement => {
  return <div className={style.container} />
}

export const getStaticProps = staticPropsWithSST

export default SelectCredentialsPage

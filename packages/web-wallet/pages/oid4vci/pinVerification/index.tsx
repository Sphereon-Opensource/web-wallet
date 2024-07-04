import React, {ReactElement} from 'react'
import style from './index.module.css'
import {staticPropsWithSST} from '../../../src/i18n/server'

// FIXME CWALL-213 needs further implementation
const PinVerificationPage: React.FC = (): ReactElement => {
  return <div className={style.container} />
}

export const getStaticProps = staticPropsWithSST

export default PinVerificationPage

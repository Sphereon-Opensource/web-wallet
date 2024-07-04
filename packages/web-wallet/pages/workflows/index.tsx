import React from 'react'
import {useTranslate} from '@refinedev/core'
import AppHeaderBar from '@components/bars/AppHeaderBar'
import WorkflowList from '@components/views/WorkflowList'
import style from './index.module.css'
import {staticPropsWithSST} from '../../src/i18n/server'

const WorkflowListPage: React.FC = () => {
  const translate = useTranslate()
  return (
    <div className={style.container}>
      <AppHeaderBar title={translate('workflow_overview_title')} />
      <WorkflowList fetchLatest={true} />
    </div>
  )
}

export const getStaticProps = staticPropsWithSST

export default WorkflowListPage

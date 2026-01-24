import React, {FC, ReactElement} from 'react'
import {useNavigate} from 'react-router-dom'
import {useTranslation} from 'next-i18next'
import {useRole} from '@/src/contexts/RoleContext'
import styles from './UnauthorizedPage.module.css'

const UnauthorizedPage: FC = (): ReactElement => {
  const {t} = useTranslation()
  const navigate = useNavigate()
  const {currentRole} = useRole()

  const handleGoHome = () => {
    navigate('/')
  }

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.iconWrapper}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className={styles.title}>{t('unauthorized_page_title', 'Access Denied')}</h1>
        <p className={styles.description}>
          {t('unauthorized_page_description', "You don't have permission to access this page with your current role.")}
        </p>
        <p className={styles.roleInfo}>
          {t('unauthorized_page_current_role', 'Current role')}: <span className={styles.roleLabel}>{currentRole.role}</span>
        </p>
        <div className={styles.actions}>
          <button className={styles.buttonPrimary} onClick={handleGoHome}>
            {t('unauthorized_page_go_home', 'Go to Dashboard')}
          </button>
          <button className={styles.buttonSecondary} onClick={handleGoBack}>
            {t('unauthorized_page_go_back', 'Go Back')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UnauthorizedPage

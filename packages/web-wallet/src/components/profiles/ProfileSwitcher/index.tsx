import React, {FC, ReactElement, useState, useRef, useEffect} from 'react'
import {SSIProfileIcon, IconButton} from '@sphereon/ui-components.ssi-react'
import style from './index.module.css'
import {useSession, signOut} from 'next-auth/react'
import LogoutIcon from '@components/assets/icons/LogoutIcon'
import axios from 'axios'
import {ButtonIcon, logoColors} from '@sphereon/ui-components.core'
import {LanguageSwitcher} from '@components/languageSwitcher'
import {getEnv} from '@/src/services/env'

const logout = async (): Promise<void> => {
  const {
    data: {path},
  } = await axios.get('/api/auth/logout')
  await signOut({redirect: false})
  window.location.href = path
}

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
)

const ProfileSwitcher: FC = (): ReactElement => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const {data: session} = useSession()
  const organizationName = getEnv('BROWSER_PUBLIC_ORGANIZATION_NAME') || 'Sphereon International'
  const userName = session?.user?.name ?? 'Unknown'

  return (
    <div className={style.container} ref={dropdownRef}>
      <div
        className={style.profileButton}
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(!isOpen)}
      >
        <SSIProfileIcon fullName={userName} />
        <div className={style.namesContainer}>
          <div className={style.organizationName}>
            {organizationName}
          </div>
          <div className={style.userName}>
            {userName}
          </div>
        </div>
        <IconButton
          icon={ButtonIcon.ARROW_DOWN}
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          iconColor={logoColors.default}
        />
      </div>

      {isOpen && (
        <div className={style.dropdown}>
          {/* Language Section */}
          <div className={style.languageSection}>
            <div className={style.languageHeader}>
              <div className={style.languageIcon}>
                <GlobeIcon />
              </div>
              <span className={style.languageTitle}>Language</span>
            </div>
            <LanguageSwitcher
              callback={async () => {
                setIsOpen(false)
              }}
            />
          </div>

          <div className={style.dropdownDivider} />

          {/* Logout */}
          <div className={style.dropdownSection}>
            <div className={style.logoutItem} onClick={() => logout()}>
              <div className={style.dropdownItemContent}>
                <div className={style.logoutIcon}>
                  <LogoutIcon />
                </div>
                <span className={style.logoutLabel}>Sign out</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileSwitcher

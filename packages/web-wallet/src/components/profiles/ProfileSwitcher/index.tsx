import React, {FC, ReactElement, useState, useRef, useEffect} from 'react'
import {SSIProfileIcon, IconButton} from '@sphereon/ui-components.ssi-react'
import style from './index.module.css'
import {useSession, signOut} from 'next-auth/react'
import {SSIProfileIconContainerStyled} from '@sphereon/ui-components.ssi-react/dist/styles/components/components/SSIProfileIcon'
import LogoutIcon from '@components/assets/icons/LogoutIcon'
import axios from 'axios'
import {ButtonIcon, logoColors} from '@sphereon/ui-components.core'
import {LanguageSwitcher} from '@components/languageSwitcher'

const logout = async (): Promise<void> => {
  const {
    data: {path},
  } = await axios.get('/api/auth/logout')
  await signOut({redirect: false})
  window.location.href = path
}

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
  const organizationName = process.env.NEXT_PUBLIC_ORGANIZATION_NAME || 'Sphereon International'
  const userName = session?.user?.name ?? 'Unknown'
  return (
    <div className={style.container} ref={dropdownRef}>
      <div onClick={() => setIsOpen(false)}>
        <SSIProfileIcon fullName={userName} />
      </div>
      <div className={style.namesContainer}>
        <div className={style.organizationName} onClick={() => setIsOpen(false)}>
          {organizationName}
        </div>
        <div className={style.userName} onClick={() => setIsOpen(false)}>
          {userName}
        </div>
      </div>
      <IconButton
        icon={ButtonIcon.ARROW_DOWN}
        onClick={async () => {
          setIsOpen(!isOpen)
        }}
        iconColor={logoColors.default}
      />
      {isOpen && (
        <div className={style.dropdown}>
          <div className={style.dropdownItem} onClick={() => logout()}>
            <div className={style.inlineContainer}>
              <span>Logout</span>
              <SSIProfileIconContainerStyled>
                <LogoutIcon />
              </SSIProfileIconContainerStyled>
            </div>
          </div>
          <div>
            <LanguageSwitcher
              callback={async () => {
                setIsOpen(!isOpen)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfileSwitcher

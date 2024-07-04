import {useRouter} from 'next/router'
import React, {FC, ReactElement, useState} from 'react'
import ReactFlagsSelect from 'react-flags-select'
import {useTranslation} from '@refinedev/core'

export type Props = {
  callback: () => Promise<void>
}
export const LanguageSwitcher: FC<Props> = ({callback}): ReactElement => {
  const router = useRouter()
  const {translate, getLocale, changeLocale} = useTranslation()
  const [selected, setSelected] = useState('')

  return (
    <ReactFlagsSelect
      placeholder="Select Language"
      countries={['US', 'NL']}
      customLabels={{US: 'English', NL: 'Nederlands'}}
      selected={selected}
      onSelect={code => {
        setSelected(code)
        // console.log(code)
        // changeLocale(code === "US" ? "en" : code.toLowerCase())
        void callback()

        router.push(
          {
            pathname: router.pathname,
            query: router.query,
          },
          undefined,
          {locale: code === 'US' ? 'en' : code.toLowerCase()},
        )
      }}
    />
  )
  /*  return (

          <div>
              <select onChange={(e) =>
                  router.push(
                      {
                          pathname: router.pathname,
                          query: router.query,
                      },
                      undefined,
                      {locale: e.target.value}
                  )
              }
              >

                  <option value='en'>English</option>
                  <option value='nl'>Nederlands</option>
              </select>
          </div>
      );*/
}

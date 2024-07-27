import React, {FC, ReactElement, useEffect, useState} from 'react'
import {CreateResponse, FormAction, HttpError, UpdateResponse, useForm, UseFormProps, useTranslate} from '@refinedev/core'

import {ComboBox, IconButton, PrimaryButton, SecondaryButton} from '@sphereon/ui-components.ssi-react'
import {SSRConfig} from 'next-i18next'
import {serverSideTranslations} from 'next-i18next/serverSideTranslations'
import nextI18nextConfig from '@/next-i18next.config.mjs'
import {useNavigate, useParams} from 'react-router-dom'
// @ts-ignore // FIXME CWALL-245 path complaining
import style from './index.module.css'
import {DataResource, MainRoute} from '@typings'
import {PresentationDefinitionItem} from '@sphereon/ssi-sdk.data-store'
import {PartialPresentationDefinitionItem} from '@sphereon/ssi-sdk.data-store'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import JsonEditor from '@components/editors/JsonEditor'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {staticPropsWithSST} from '@/src/i18n/server'

type Mode = 'create' | 'edit' | 'show'

type Props = {
  mode: Mode
}

type HeaderLabels = {
  pathText: string
  titleText: string
}

const PresentationDefinitionPage: FC<Props> = (props: Props): ReactElement => {
  const [isClient, setIsClient] = useState(false)
  const {mode: initialMode} = props
  const navigate = useNavigate()
  const {id} = useParams()
  const translate = useTranslate()

  const [mode, setMode] = useState<Mode>(initialMode)
  const disabled = mode === 'show'

  const [definitionPayload, setDefinitionPayload] = useState<string | undefined>()
  const [partialDefinitionItem, setPartialDefinitionItem] = React.useState<PartialPresentationDefinitionItem>({})
  const {onFinish, queryResult} = useForm<PresentationDefinitionItem, HttpError, PartialPresentationDefinitionItem>(
    buildUseFormOpts(selectFormAction(mode), id),
  )

  const headerLabels: HeaderLabels = (() => {
    const pathText: string[] = [translate('presentation_definition_details_path_label')]
    let titleText: string
    switch (mode) {
      case 'create':
        pathText.push(translate('presentation_definition_details_add_label'))
        titleText = translate('presentation_definition_details_add_title')
        break
      case 'edit':
        pathText.push(translate('presentation_definition_details_edit_label'))
        titleText = translate('presentation_definition_details_edit_title')
        break
      case 'show':
        pathText.push(translate('presentation_definition_details_label'))
        titleText = translate('presentation_definition_details_title')
        break
    }
    return {
      pathText: pathText.join(' / '),
      titleText,
    }
  })()

  useEffect(() => {
    const {data: entityResponse, isLoading, status, error} = queryResult ?? {}
    const isError = status === 'error'

    if (isError && error) {
      throw Error('Could not load the machineDTO: ' + error.message)
    }

    if (Object.keys(partialDefinitionItem).length === 0 && !isLoading && entityResponse) {
      const item = entityResponse.data
      setPartialDefinitionItem(item)
      if (item.definitionPayload) {
        setDefinitionPayload(JSON.stringify(item.definitionPayload, null, 2))
      }
    }
  }, [queryResult, partialDefinitionItem])

  useEffect(() => {
    setIsClient(true)
  }, [])

  // ============== HOOKS BEFORE HERE ================

  if (!isClient) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  const onCancel = (): Promise<void> => {
    navigate(MainRoute.PRESENTATION_DEFINITIONS)
    return Promise.resolve()
  }

  const onSave = async (): Promise<void> => {
    if (mode !== 'create' && mode !== 'edit') {
      throw new Error(`Saving is not allowed for mode ${mode}`)
    }
    if (!definitionPayload) {
      throw new Error(`There is no definition data to save`)
    }
    partialDefinitionItem.definitionPayload = JSON.parse(definitionPayload)

    const addResult: CreateResponse<PresentationDefinitionItem> | UpdateResponse<PresentationDefinitionItem> | void =
      await onFinish(partialDefinitionItem)
    if (addResult && (addResult as CreateResponse<PresentationDefinitionItem>).data) {
      const resultData = (addResult as CreateResponse<PresentationDefinitionItem>).data
      setPartialDefinitionItem(resultData)
    } else if (addResult && (addResult as UpdateResponse<PresentationDefinitionItem>).data) {
      const resultData = (addResult as UpdateResponse<PresentationDefinitionItem>).data
      setPartialDefinitionItem(resultData)
    } else {
      setPartialDefinitionItem(partialDefinitionItem)
    }
    navigate(MainRoute.PRESENTATION_DEFINITIONS)
    return Promise.resolve()
  }

  const actionComboOptions = [
    {label: translate('presentation_definition_details_view_action'), value: 'show', icon: ButtonIcon.VIEW}, // TODO implement icons in UI-components
    {label: translate('presentation_definition_details_edit_action'), value: 'edit', icon: ButtonIcon.EDIT},
  ]

  const getDefaultActionValue = () => {
    return actionComboOptions.find(item => item.value === mode)
  }

  const handleActionComboBoxChange = async (option: {label: string; value: any}) => {
    switch (option.value) {
      case 'show':
        if (mode !== 'show') {
          setMode('show')
        }
        break
      case 'edit':
        if (mode !== 'edit') {
          setMode('edit')
        }
        break
    }
  }

  async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      console.warn('Clipboard API not supported')
    }
  }

  return (
    <div className={style.container}>
      <div className={style.presentationDefinitionDetailsContainer}>
        <div className={style.headerContainer}>
          <PageHeaderBar path={headerLabels.pathText} title={headerLabels.titleText} />
          <div className={style.actionButtonPanel}>
            <div className={style.iconButtonContainer}>
              <IconButton icon={ButtonIcon.COPY} onClick={() => definitionPayload && copyToClipboard(definitionPayload)} />
            </div>
            {mode !== 'create' && (
              <ComboBox options={actionComboOptions} onChange={handleActionComboBoxChange} defaultValue={getDefaultActionValue()} />
            )}
          </div>
        </div>
        <div className={style.presentationDefinitionDetailContentContainer}>
          <JsonEditor
            initialPayload={definitionPayload}
            isNewDocument={mode === 'create'}
            isReadOnly={mode === 'show'}
            onEditorContentChanged={(value: string) => setDefinitionPayload(value)}
          />
          {mode !== 'show' && (
            <div className={style.buttonsContainer}>
              <SecondaryButton caption={translate('action_cancel_label')} onClick={onCancel} />
              <PrimaryButton
                style={{marginLeft: 'auto'}}
                caption={translate('presentation_definition_details_save_action')}
                onClick={onSave}
                disabled={disabled}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )

  function buildUseFormOpts(
    formAction: FormAction,
    idToLoad?: string,
  ): UseFormProps<PresentationDefinitionItem, HttpError, Partial<PresentationDefinitionItem>> {
    if (!idToLoad && (formAction === 'edit' || formAction === 'clone')) {
      throw new Error(`Mode ${formAction} requires idToLoad to be set`)
    }

    return {
      resource: DataResource.PRESENTATION_DEFINITIONS,
      action: formAction,
      ...(idToLoad && {id: idToLoad}),
      meta: formAction === 'create' ? {select: 'id'} : formAction === 'clone' ? {select: '*'} : undefined,
    }
  }
}

const selectFormAction = (mode: Mode): FormAction => {
  switch (mode) {
    case 'create':
      return 'create'
    case 'edit':
      return 'edit'
    case 'show':
      return 'edit'
    default:
      throw new Error(`Unsupported mode: ${mode}`)
  }
}

export const getStaticProps = staticPropsWithSST

export default PresentationDefinitionPage

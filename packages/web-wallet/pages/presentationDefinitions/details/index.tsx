import React, {FC, ReactElement, useEffect, useState} from 'react'
import {
  CreateResponse,
  FormAction,
  HttpError,
  UpdateResponse,
  useForm,
  UseFormProps,
  useTranslate,
} from '@refinedev/core'

import {ComboBox, IconButton, PrimaryButton, SecondaryButton, TextInputField} from '@sphereon/ui-components.ssi-react'
import {useNavigate, useParams} from 'react-router-dom'
// @ts-ignore // FIXME CWALL-245 path complaining
import style from './index.module.css'
import {DataResource, MainRoute} from '@typings'
import type {DcqlQueryItem, PartialDcqlQueryItem} from '@sphereon/ssi-sdk.data-store-types'
import PageHeaderBar from '@components/bars/PageHeaderBar'
import JsonEditor from '@components/editors/JsonEditor'
import {ButtonIcon} from '@sphereon/ui-components.core'
import {staticPropsWithSST} from '@/src/i18n/server'
import {MAX_QUERYID_LENGTH} from '@/app'
import {DcqlQuery} from 'dcql'
import {ValiError} from 'valibot'

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

  const [query, setQuery] = useState<string | undefined>()
  const [partialDefinitionItem, setPartialDefinitionItem] = React.useState<PartialDcqlQueryItem>({})
  const {onFinish, queryResult} = useForm<DcqlQueryItem, HttpError, PartialDcqlQueryItem>(
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

    if (Object.keys(partialDefinitionItem).length === 0) {
      // For create mode, set default immediately regardless of loading state
      if (mode === 'create') {
        setQuery('{\n' +
          '  "credentials": [\n' +
          '    {\n' +
          '      "id": "changeme",\n' +
          '      "require_cryptographic_holder_binding": true,\n' +
          '      "multiple": false,\n' +
          '      "format": "dc+sd-jwt",\n' +
          '      "claims": [\n' +
          '        {\n' +
          '          "path": [\n' +
          '            "somePath"\n' +
          '          ]\n' +
          '        }\n' +
          '      ]\n' +
          '    }\n' +
          '  ]\n' +
          '}')
      } else if (!isLoading && entityResponse?.data) {
        const item = entityResponse.data
        setPartialDefinitionItem(item)
        if (item.query) {
          setQuery(JSON.stringify(item.query, null, 2))
        }
      }
    }
  }, [queryResult, partialDefinitionItem, mode])

  useEffect(() => {
    setIsClient(true)
  }, [])

  // ============== HOOKS BEFORE HERE ================

  if (!isClient) {
    return <div>{translate('data_provider_loading_message')}</div>
  }

  const onCancel = (): Promise<void> => {
    navigate(MainRoute.QUERY_MANAGEMENT)
    return Promise.resolve()
  }

  const onSave = async (): Promise<void> => {
    if (mode !== 'create' && mode !== 'edit') {
      throw new Error(`Saving is not allowed for mode ${mode}`)
    }
    if (!query) {
      throw new Error(`There is no definition data to save`)
    }
    partialDefinitionItem.query = JSON.parse(query)

    const addResult: CreateResponse<DcqlQueryItem> | UpdateResponse<DcqlQueryItem> | void =
      await onFinish(partialDefinitionItem)
    if (addResult && (addResult as CreateResponse<DcqlQueryItem>).data) {
      const resultData = (addResult as CreateResponse<DcqlQueryItem>).data
      setPartialDefinitionItem(resultData)
    } else if (addResult && (addResult as UpdateResponse<DcqlQueryItem>).data) {
      const resultData = (addResult as UpdateResponse<DcqlQueryItem>).data
      setPartialDefinitionItem(resultData)
    } else {
      setPartialDefinitionItem(partialDefinitionItem)
    }
    navigate(MainRoute.QUERY_MANAGEMENT)
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

  const onQueryIdChange = (value: string): Promise<void> => {
    setPartialDefinitionItem({...partialDefinitionItem, queryId: value})
    return Promise.resolve()
  }

  async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
    } else {
      console.warn('Clipboard API not supported')
    }
  }

  const dcqlValidator = (content: string): string | null => {
    console.log('dcqlValidator called')
    try {
      const query = JSON.parse(content)
      console.log('query', query)
      const parsed = DcqlQuery.parse(query)
      DcqlQuery.validate(parsed)
      console.log('dcqlValidator pass')
      return null
    } catch (error) {
      console.log('dcqlValidator:', error)

      if (error instanceof ValiError) {
        const errorMessages = error.issues.map(issue => {
          const pathStr = issue.path
            ?.map((segment:any) => {
              if (segment.type === 'object') {
                return segment.key
              }
              if (segment.type === 'array') {
                return `[${segment.key}]`
              }
              return segment.key
            })
            .filter(Boolean)
            .join('.')

          const location = pathStr ? `at ${pathStr}: ` : ''
          return `${location}${issue.message}`
        })

        return errorMessages.join('\n')
      }

      return error instanceof Error ? error.message : 'Validation failed'
    }
  }


  return (
    <div className={style.container}>
      <div className={style.presentationDefinitionDetailsContainer}>
        <div className={style.headerContainer}>
          <PageHeaderBar path={headerLabels.pathText} title={headerLabels.titleText} />
          <div className={style.actionButtonPanel}>
            <div className={style.iconButtonContainer}>
              <IconButton icon={ButtonIcon.COPY} onClick={() => query && copyToClipboard(query)} />
            </div>
            {mode !== 'create' && (
              <ComboBox options={actionComboOptions} onChange={handleActionComboBoxChange}
                        defaultValue={getDefaultActionValue()} />
            )}
          </div>
        </div>
        <div className={style.presentationDefinitionDetailContentContainer}>
          <div style={{minWidth: '150px', maxWidth: '550px'}}>
            {mode !== 'show' ? (
              <TextInputField
                label={translate('presentation_definition_queryid')}
                onChangeValue={onQueryIdChange}
                initialValue={partialDefinitionItem.queryId}
                maxLength={MAX_QUERYID_LENGTH}
              />
            ) : (
              <div>
                <label>{translate('presentation_definition_queryid')}</label>
                <div>{partialDefinitionItem.queryId}</div>
              </div>
            )}
          </div>
          <JsonEditor
            initialPayload={query}
            isNewDocument={mode === 'create'}
            isReadOnly={mode === 'show'}
            onEditorContentChanged={(value: string) => setQuery(value)}
            customValidator={dcqlValidator}
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
  ): UseFormProps<DcqlQueryItem, HttpError, Partial<DcqlQueryItem>> {
    if (!idToLoad && (formAction === 'edit' || formAction === 'clone')) {
      throw new Error(`Mode ${formAction} requires idToLoad to be set`)
    }

    return {
      resource: DataResource.QUERIES,
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

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) =>
  staticPropsWithSST({locale})

export default PresentationDefinitionPage

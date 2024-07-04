import React, {FC, useEffect, useCallback, useState, useRef, useMemo} from 'react'
import {EditorView, basicSetup} from 'codemirror'
import {json} from '@codemirror/lang-json'
import {Diagnostic, linter, lintGutter, LintSource} from '@codemirror/lint'
import {jsonParseLinter} from '@codemirror/lang-json'
import {EditorState} from '@codemirror/state'
import style from './index.module.css'
import {useTranslate} from '@refinedev/core'
import {smoothy} from 'thememirror'

export type ValidationResult = {
  message: string
  error: boolean
}

type JsonEditorProps = {
  isNewDocument?: boolean
  isReadOnly?: boolean
  onEditorContentChanged?: (value: string) => void
  initialPayload?: string
}

const defaultDefinitionPayload = '{\n\t\n}'

const JsonEditor: FC<JsonEditorProps> = ({initialPayload, isNewDocument, isReadOnly, onEditorContentChanged}) => {
  const [editorView, setEditorView] = useState<EditorView | null>(null)
  const initialContent = initialPayload !== undefined && initialPayload.length > 0 ? initialPayload : isNewDocument ? defaultDefinitionPayload : ''
  const [editorContent, setEditorContent] = useState<string>('')
  const initialSet = useRef(false)
  const [validationResult, setValidationResult] = useState<ValidationResult>()
  const isReadOnlyRef = useRef(isReadOnly)
  const translate = useTranslate()

  const trimDiagnosticMessage = useCallback((message: string): string => {
    const regex = / in JSON at position \d+ \(line \d+ column \d+\)$/
    return message.replace(regex, '')
  }, [])

  const handleValidationResult = useCallback((newMessage: string, hasError: boolean) => {
    if (validationResult?.message !== newMessage || validationResult?.error !== hasError) {
      setValidationResult({message: newMessage, error: hasError})
    }
  }, [])

  const jsonLinter: LintSource = useCallback((view: EditorView) => {
    const diagnostics: Diagnostic[] = jsonParseLinter()(view) as Diagnostic[]
    if (diagnostics.length === 0) {
      handleValidationResult(translate('json_editor_validation_success'), false)
    } else {
      const messages: string[] = diagnostics.map(diagnostic => diagnostic.message)
      handleValidationResult(messages.join(), true)
    }
    return diagnostics.map(diagnostic => ({
      ...diagnostic,
      message: trimDiagnosticMessage(diagnostic.message),
    }))
  }, [])

  const extensions = useMemo(() => {
    const baseExtensions = [basicSetup, json(), smoothy, lintGutter(), linter(jsonLinter)]
    if (isReadOnly) {
      baseExtensions.push(EditorState.readOnly.of(true), EditorView.editable.of(false))
    }
    return baseExtensions
  }, [isReadOnly])

  const editorContainerRef = useCallback((node: HTMLDivElement) => {
    if (node) {
      const startState = EditorState.create({
        doc: editorContent,
        extensions: extensions,
      })

      const view = new EditorView({
        state: startState,
        parent: node,
        dispatch: tr => {
          view.update([tr])
          if (tr.docChanged) {
            const updatedContent = tr.state.doc.toString()
            setEditorContent(updatedContent)
            onEditorContentChanged?.(updatedContent)
          }
        },
      })

      const cmEditorElement = node.querySelector('.cm-editor') as HTMLElement
      if (cmEditorElement) {
        cmEditorElement.style.height = '100%'
      }
      setEditorView(view)
    }
  }, [])

  // effects to hande read-only switching
  useEffect(() => {
    isReadOnlyRef.current = isReadOnly
  }, [isReadOnly])

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (isReadOnlyRef.current) {
        e.preventDefault()
      }
    }

    if (isReadOnly) {
      editorView?.dom.addEventListener('keydown', handleKeydown)
    }

    return () => {
      editorView?.dom.removeEventListener('keydown', handleKeydown)
    }
  }, [isReadOnly, editorView?.dom])

  // Effects for handling editor content setup
  useEffect(() => {
    setEditorContent(initialContent)
  }, [initialPayload, isNewDocument])

  useEffect(() => {
    if (!initialSet.current && editorView) {
      const transaction = editorView.state.update({
        changes: {from: 0, to: editorView.state.doc.length, insert: editorContent},
      })
      editorView.dispatch(transaction)
      initialSet.current = true

      // Set cursor at a convenient position when starting a new doc
      if (editorContent === defaultDefinitionPayload) {
        editorView.dispatch({
          selection: {anchor: editorContent.length - 2},
        })
      }
    }
  }, [editorContent])

  useEffect(() => {
    editorView?.focus()
  }, [editorView])

  useEffect(() => {
    return () => {
      editorView?.destroy()
    }
  }, [editorView])

  return (
    <>
      <div ref={editorContainerRef} className={style.editorContainer} />
      {isReadOnly !== true && (
        <textarea
          className={`${style.validationMessageBox} ${validationResult?.error ? style.validationMessageBoxFailed : style.validationMessageBoxSuccess}`}
          value={validationResult?.message ?? ''}
          readOnly
          aria-label={translate('presentation_definition_details_validation_result')}
          style={{resize: 'none'}}
        />
      )}
    </>
  )
}

export default JsonEditor

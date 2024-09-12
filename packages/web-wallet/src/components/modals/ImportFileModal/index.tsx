import React, {FC, ReactElement, useState} from 'react';
import {useTranslate} from '@refinedev/core';
import {PrimaryButton} from '@sphereon/ui-components.ssi-react';
import CrossIcon from '@components/assets/icons/CrossIcon';
import DragAndDropBox from '@components/fields/DragAndDropBox';
import FileSelectionField from '@components/fields/FileSelectionField';
import style from './index.module.css'

type Props = {
    headerTitle?: string
    headerSubTitle?: string
    dragBoxCaption: string
    dragBoxDescription?: string
    onImportFile: (file: File) => Promise<void>
    onValidateFile?: (file: File) => Promise<boolean>
    onClose: () => Promise<void>
    fileMask?: RegExp
}

const ImportFileModal: FC<Props> = (props: Props): ReactElement => {
    const {
        headerTitle,
        headerSubTitle,
        dragBoxCaption,
        dragBoxDescription,
        onImportFile,
        onValidateFile,
        onClose
    } = props
    const translate = useTranslate()
    const [file, setFile] = useState<File | undefined>()

    const onChangeFile = async (file: File): Promise<void> => {
        if (onValidateFile) {
            const validationResult = await onValidateFile(file).then(
                (result) => result,
                () => false
            );

            if (!validationResult) {
                return
            }
        }

        setFile(file)
    }

    const onImport = async (): Promise<void> => {
        if (!file) {
            return
        }

        void onImportFile(file)
    }

    return (
        <div
            className={style.overlay}
            onClick={onClose}
        >
            <div className={style.container} onClick={(event: React.MouseEvent<HTMLDivElement, MouseEvent>) => event.stopPropagation()}>
                <div className={style.headerContainer}>
                    {(headerTitle || headerSubTitle) &&
                        <div className={style.headerCaptionContainer}>
                            {headerTitle && <div className={style.titleCaption}>{headerTitle}</div>}
                            {headerSubTitle && <div className={style.subTitleCaption}>{headerSubTitle}</div>}
                        </div>
                    }
                    <div className={style.headerCloseContainer}>
                        <div className={style.closeButton} onClick={onClose}>
                            <CrossIcon />
                        </div>
                    </div>
                </div>
                <div className={style.contentContainer}>
                    <DragAndDropBox
                        caption={dragBoxCaption}
                        description={dragBoxDescription}
                        onChangeFile={onChangeFile}
                    />
                    {file && <FileSelectionField file={file} />}
                    <PrimaryButton
                        style={{width: 180, marginLeft: 'auto'}}
                        caption={translate('action_import_label')}
                        disabled={!file}
                        onClick={onImport}
                    />
                </div>
            </div>
        </div>
    )
}

export default ImportFileModal

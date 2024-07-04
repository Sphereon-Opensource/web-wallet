import React, {FC, ReactElement, useMemo, useState} from 'react'
import style from './index.module.css'
import {Document, Page} from 'react-pdf'
import 'react-pdf/dist/esm/Page/TextLayer.css'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css'
import {Options} from 'react-pdf/dist/esm/shared/types'

import {pdfjs} from 'react-pdf'
import DownloadIcon from '@components/assets/icons/DownloadIcon'
import {ObjectStorage} from '@objectstorage'
import {OnDocumentLoadSuccess} from 'react-pdf/src/shared/types'

// Import PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString()

export type Props = {
  pdfPath: string
  storage?: ObjectStorage
  scale?: number
  renderAllPages?: boolean
}

type PdfData = {
  data: Uint8Array
}
type PdfSource = string | PdfData | null

const PdfViewer: FC<Props> = (props: Props): ReactElement => {
  const {scale = 1.5, renderAllPages = false, pdfPath, storage} = props
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pdfSource, setPdfSource] = useState<PdfSource>(null)
  if (!pdfSource && pdfPath) {
    if (storage) {
      storage.download(pdfPath).then(result => {
        const {data, error} = result
        if (error) {
          throw error
        }
        if (data) {
          const blob: Blob = data as Blob
          blob.arrayBuffer().then(data => {
            setPdfSource({data: new Uint8Array(data)})
          })
        }
      })
    } else {
      setPdfSource(pdfPath)
    }
  }

  const onDocumentLoadSuccess: OnDocumentLoadSuccess = document => {
    setTimeout(() => setNumPages(document.numPages), 500)
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => prevPageNumber + offset)
  }

  const previousPage = () => {
    changePage(-1)
  }

  const nextPage = () => {
    changePage(1)
  }

  const onDownloadPdf = async (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.preventDefault()
    if (storage === undefined) {
      window.open(pdfPath, '_blank') // TODO from BLOB storage and see if we can avoid it to be opened by the browser's PDF viewer
    }
  }

  const extractFilenameFromURL = (url: string): string | null => {
    const pathArray = url.split('/')
    const lastSegment = pathArray[pathArray.length - 1]

    // Check if the last segment contains a query string and remove it
    const filename = lastSegment.split('?')[0]

    return filename || null
  }

  function selectPdfData(): PdfSource | undefined {
    if (!pdfSource) {
      return null
    }
    if (typeof pdfSource === 'string') {
      return pdfSource
    }
    if (typeof pdfSource === 'object') {
      return {data: (pdfSource as PdfData).data.slice(0)} // Copy the data for every time pdf-js reads it
    }
  }

  const documentOptions = {
    cMapUrl: '/cmaps/',
    standardFontDataUrl: '/standard_fonts/',
  } as Options

  const document = useMemo(() => {
    return (
      <Document
        className={style.pdfViewerDocument}
        file={selectPdfData()}
        key={pdfSource as string}
        options={documentOptions}
        onLoadSuccess={numPages == null ? onDocumentLoadSuccess : undefined}>
        {numPages ? (
          <div className={style.pdfViewerPagesWrapper}>
            {renderAllPages ? (
              Array.from(new Array(numPages), (el, index) => (
                <Page
                  key={`page_${index + 1}`}
                  pageNumber={index + 1}
                  scale={scale}
                  inputRef={pageNumber === index + 1 ? ref => (!!ref ? ref.scrollIntoView() : undefined) : undefined}
                  loading={''}
                />
              ))
            ) : (
              <Page pageNumber={pageNumber} loading={''} />
            )}
          </div>
        ) : null}
      </Document>
    )
  }, [pdfSource, pageNumber, numPages, renderAllPages])

  return (
    <div className={style.pdfViewerContainer}>
      <div className={style.pdfViewerToolbar}>
        <p className={style.pdfViewerTexts}>{extractFilenameFromURL(pdfPath)}</p>
        <div className={style.pdfViewerButton} onClick={onDownloadPdf}>
          <div className={style.pdfViewerIcon}>
            <DownloadIcon />
          </div>
          <div className={style.pdfViewerTexts}>Download</div>
        </div>
      </div>
      <div className={style.pdfDocumentContainer}>{document}</div>
    </div>
  )
}

export default PdfViewer

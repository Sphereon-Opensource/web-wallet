import React, {useEffect} from 'react'
import {useNavigate} from 'react-router-dom'
import {staticPropsWithSST} from '../../src/i18n/server'

/**
 * Documents page - redirects to /assets
 *
 * Documents are stored in the asset store (document store).
 * This page simply redirects to the assets page where all documents can be viewed.
 */
const DocumentsListPage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Redirect to assets page where documents are stored
    navigate('/assets', {replace: true})
  }, [navigate])

  // Show nothing while redirecting
  return null
}

export const getStaticProps = async ({locale = 'en'}: {locale?: string}) => staticPropsWithSST({locale})

export default DocumentsListPage

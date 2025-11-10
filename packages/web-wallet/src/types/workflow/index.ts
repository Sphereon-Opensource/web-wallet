import {Asset} from '../asset'
import {getMatchingIdentity} from '@helpers/IdentityFilters'
import {TranslateFn} from '../type-commons'
import type {Identity, Party} from '@sphereon/ssi-sdk.data-store-types'
import {formatDate} from '@sphereon/ui-components.ssi-react'
import {getEnv} from '@/src/services/env'

export const getProcessOwnerDid = () =>
  getEnv('BROWSER_PUBLIC_PROCESS_OWNER_DID') ??
  'did:jwk:eyJhbGciOiJFUzI1NiIsInVzZSI6InNpZyIsImt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoiWjY3eEc3UFZUUHBDdlp3UjVlR2pteHhqQjdlb2M1cWdYbm9LMloxR2R6YyIsInkiOiJ1ZkpCc3BlNTV5WkZXVWN1T21GRUMtX3MOET1nVXRndF8tbmV2WHd4UVdZIn0'

export const getSupplierDid = () => getEnv('BROWSER_PUBLIC_SUPPLIER_DID') ?? 'did:web:localhost:stonebase'

export const getTesterDid = () => getEnv('BROWSER_PUBLIC_TESTER_DID') ?? 'did:web:localhost:sgs'
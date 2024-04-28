import { getDefaultDID } from '../utils'
import { STATUS_LIST_ISSUER } from '../environment'
import { getOrCreateConfiguredStatusList } from '../utils/statuslist'
import { addContacts } from './contact-fixtures'

const defaultDID = await getDefaultDID()

await addContacts()
  .catch((e) => console.log(`Error: ${e}`))
  .then(() => {
    getOrCreateConfiguredStatusList({
      issuer: STATUS_LIST_ISSUER ?? defaultDID,
    }).catch((e) => console.log(`ERROR statuslist ${e}`))
  })

console.log('Demo data initialized')

process.exit(0)

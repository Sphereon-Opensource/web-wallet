import { getDefaultDID } from '../utils'
import { addContactsRWS } from './demo-data/rws/contact-fixtures'
import { addContactsKonkuk } from './demo-data/konkuk/contact-fixtures'
import { addFormDefsKonkuk } from './demo-data/konkuk/formdef-fixtures'
import { addFormDefsBelastingdienst } from './demo-data/belastingdienst/formdef-fixtures'
import * as process from 'node:process'

const allowedFixtureVals = ['contacts', 'formdefs'] as const
const allowedDemoVals = ['rws', 'konkuk', 'belastingdienst'] as const
type FixtureType = (typeof allowedFixtureVals)[number]
type Demo = (typeof allowedDemoVals)[number]

async function handleDemo(fixtureType: FixtureType, demo: Demo) {
  try {
    const defaultDID = await getDefaultDID()

    switch (fixtureType) {
      case 'contacts':
        switch (demo) {
          case 'rws':
            await addContactsRWS()
            break
          case 'konkuk':
            await addContactsKonkuk()
            break
          default:
            throw new Error(`Unsupported demo type for contacts: ${demo}, allowed: ${allowedDemoVals}`)
        }
        break
      case 'formdefs':
        switch (demo) {
          case 'rws':
            break
          case 'konkuk':
            await addFormDefsKonkuk()
            break
          case 'belastingdienst':
            await addFormDefsBelastingdienst()
            break
          default:
            throw new Error(`Unsupported demo type for form definitions: ${demo}, allowed: ${allowedDemoVals}`)
        }
        break
      default:
        throw new Error(`Unsupported type: ${fixtureType}. Allowed: ${allowedFixtureVals}`)
    }

    console.log(`##### Demo data start ##########################################`)
    console.log(`Demo data initialized for type "${fixtureType}" and demo "${demo}"`)
    console.log(`##### Demo data end ##########################################`)
  } catch (error) {
    console.log(`##### Demo error ##########################################`)
    console.log(`Initialization failed: ${error}`)
    console.log(`##### Demo error ##########################################`)
    process.exit(1)
  }
}

function parseArgs(args?: string[]): { fixture: FixtureType; demo: Demo } {
  // todo: We really should use a lib for commands/args
  if (!args || args.length !== 2) {
    console.log(
      `Expected exactly two arguments: fixture and demo. Fixture values one of: "${allowedFixtureVals}", demo values one of "${allowedFixtureVals}". Args length: ${args?.length ?? 0}, args: ${args}`,
    )
    console.log('example:')
    console.log('  pnpm demo:init contacts konkuk')
    console.log('  pnpm demo:init formdefs konkuk')
    process.exit(1)
  }

  const fixture = args[0].toLowerCase()
  const demo = args[1].toLowerCase()

  // @ts-ignore
  if (!allowedFixtureVals.includes(fixture) || !allowedDemoVals.includes(demo)) {
    console.log(`Invalid arguments. Known types is one of  "${allowedFixtureVals}", demos is one of : "${allowedDemoVals}"`)
    console.log('example:')
    console.log('  pnpm demo:init contacts konkuk')
    console.log('  pnpm demo:init formdefs konkuk')
    process.exit(1)
  }

  return { fixture: fixture as FixtureType, demo: demo as Demo }
}

async function main() {
  const args = process.argv
  console.log(args)
  // We remove -- from args, as that gets included as arg on some platforms it seems
  const { fixture, demo } = parseArgs(args.filter((val) => val !== '--').slice(2))
  await handleDemo(fixture, demo)
}

main()

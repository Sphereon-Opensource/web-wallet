import {
  DB_TYPE
} from '../environment-vars'
console.log(`Database type '${DB_TYPE}' is being used`) // This forces the env to be loaded before typeorm

import {addContactsRWS} from './demo-data/rws/contact-fixtures'
import {addContactsKonkuk} from './demo-data/konkuk/contact-fixtures'
import {addFormDefsKonkuk} from './demo-data/konkuk/formdef-fixtures'
import {addFormDefsBelastingdienst} from './demo-data/belastingdienst/formdef-fixtures'
import * as process from 'node:process'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import {addFormDefs} from './formdef-fixtures'

// Define allowed fixture and demo values
const allowedFixtureVals = ['contacts', 'formdefs'] as const
const allowedDemoVals = ['rws', 'konkuk', 'belastingdienst'] as const
type FixtureType = (typeof allowedFixtureVals)[number]
type PredefinedDemo = (typeof allowedDemoVals)[number]

// Extend Demo type to include any string (for directory paths)
type Demo = PredefinedDemo | string

/**
 * Handles adding demo data based on fixture type and demo identifier or directory.
 * @param fixtureType - The type of fixture ('contacts' or 'formdefs').
 * @param demo - The demo identifier or directory path.
 */
async function handleDemo(fixtureType: FixtureType, demo: Demo) {
  try {
//    const defaultDID = await getDefaultDID()

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
            throw new Error(
              `Unsupported demo type for contacts: "${demo}". Allowed demos: ${allowedDemoVals.join(
                ', ',
              )}`,
            )
        }
        break
      case 'formdefs':
        if (allowedDemoVals.includes(demo as PredefinedDemo)) {
          switch (demo) {
            case 'rws':
              console.warn(`No form definitions to add for demo "${demo}".`)
              break
            case 'konkuk':
              await addFormDefsKonkuk()
              break
            case 'belastingdienst':
              await addFormDefsBelastingdienst()
              break
          }
        } else {
          // Treat 'demo' as a directory path
          const fixturesDirectory = path.resolve(demo)
          const directoryExists = await directoryExistsAsync(fixturesDirectory)

          if (!directoryExists) {
            throw new Error(
              `The specified fixtures directory "${fixturesDirectory}" does not exist.`,
            )
          }

          const configPath = path.join(fixturesDirectory, 'form-fixtures.json')
          const configExists = await fileExistsAsync(configPath)

          if (!configExists) {
            throw new Error(
              `The fixtures directory "${fixturesDirectory}" does not contain a "form-fixtures.json" file.`,
            )
          }

          // Call the generic addFormDefs function with the directory
          await addFormDefs(fixturesDirectory)
        }
        break
      default:
        throw new Error(
          `Unsupported fixture type: "${fixtureType}". Allowed types: ${allowedFixtureVals.join(
            ', ',
          )}`,
        )
    }

    console.log(`##### Demo data start ##########################################`)
    console.log(
      `Demo data initialized for type "${fixtureType}" and demo "${demo}"`,
    )
    console.log(`##### Demo data end ##########################################`)
  } catch (error) {
    console.log(`##### Demo error ##########################################`)
    console.error(`Initialization failed: ${error instanceof Error ? error.message : error}`)
    console.log(`##### Demo error ##########################################`)
    process.exit(1)
  }
}

/**
 * Checks if a directory exists.
 * @param dirPath - The path to the directory.
 * @returns True if the directory exists, false otherwise.
 */
async function directoryExistsAsync(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

/**
 * Checks if a file exists.
 * @param filePath - The path to the file.
 * @returns True if the file exists, false otherwise.
 */
async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

function examples() {
  console.log('Examples:')
  console.log('  pnpm demo:init contacts konkuk')
  console.log('  pnpm demo:init formdefs konkuk')
  console.log('  pnpm demo:init formdefs /path/to/agent/fixtures/forms')
}

/**
 * Parses command-line arguments to extract fixture type and demo.
 * @param args - Array of command-line arguments.
 * @returns An object containing fixture and demo.
 */
function parseArgs(args?: string[]): {fixture: FixtureType; demo: Demo} {
  // todo: We really should use a lib for commands/args
  if (!args || args.length !== 2) {
    console.log(
      `Expected exactly two arguments: fixture and demo. Fixture values one of: "${allowedFixtureVals.join(
        '", "',
      )}", demo values can be one of: "${allowedDemoVals.join(
        '", "',
      )}" or a directory path.`,
    )
    examples()
    process.exit(1)
  }

  const fixture = args[0].toLowerCase()
  const demo = args[1].toLowerCase()

  if (
    !allowedFixtureVals.includes(fixture as FixtureType) ||
    (!allowedDemoVals.includes(demo as PredefinedDemo) && !isValidPath(demo))
  ) {
    console.log(`Invalid arguments.`)
    console.log(
      `Allowed fixture types: "${allowedFixtureVals.join(
        '", "',
      )}". Allowed demos: "${allowedDemoVals.join(
        '", "',
      )}" or a valid directory path.`,
    )
    examples()
    process.exit(1)
  }

  return {fixture: fixture as FixtureType, demo}
}

/**
 * Validates if the provided path is a valid path string.
 * Basic validation to check if it's a plausible path.
 * @param p - The path string to validate.
 * @returns True if valid, false otherwise.
 */
function isValidPath(p: string): boolean {
  // Basic check: non-empty and does not contain illegal characters
  return typeof p === 'string' && p.trim().length > 0
}

/**
 * The main function to execute the script.
 */
async function main() {
  const args = process.argv
  const filteredArgs = args.filter((val) => val !== '--').slice(2)
  const {fixture, demo} = parseArgs(filteredArgs)
  await handleDemo(fixture, demo)
}

main()

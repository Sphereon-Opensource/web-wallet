
import { dropDatabase, revertMigration } from './databaseService'
import {dbConnection} from "../index";

enum Action {
  RevertMigration = 'revert-migration',
  DropDatabase = 'drop-db',
}

async function handleAction(action: string) {
  try {
    const connection = await dbConnection
    switch (action) {
      case Action.RevertMigration:
        await revertMigration(connection)
        console.log('Migration reverted successfully.')
        break
      case Action.DropDatabase:
        await dropDatabase(connection)
        console.log('Database dropped successfully.')
        break
      default:
        console.warn(`Action ${action} not found.`)
        console.log('Known actions:', Object.values(Action).join(', '))
        process.exit(1)
    }
  } catch (error) {
    console.error(`Failed to execute action ${action}:`, error)
    process.exit(1)
  }
}

function getActionFromArgs(args: string[]): string {
  if (args.length === 0) {
    console.error('Missing action argument.')
    console.log('Known actions:', Object.values(Action).join(', '))
    process.exit(1)
  }
  return args[0]
}

async function main() {
  const action = getActionFromArgs(process.argv.slice(2))
  await handleAction(action)
}

main()

import {dropDatabase, getDbConnection, revertMigration} from './databaseService'
import { dbConnection } from '../index'
import {DB_CONNECTION_NAME} from '../environment-vars'

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

  process.on('uncaughtException', (err) => {
    console.error('UNCUGHT EXCEPTION >>>');
    console.error(err);
    if (err && typeof err === 'object') console.dir(err, { depth: 20 });
    console.error('<<< END');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION >>>');
    console.error(reason);
    if (reason && typeof reason === 'object') console.dir(reason, { depth: 20 });
    console.error('<<< END');
    process.exit(1);
  });

  await handleAction(action)
}


main()

import {DB_CONNECTION_NAME} from "../../dist/environment";
import {revertMigration} from "./databaseService";


revertMigration(DB_CONNECTION_NAME)
    .then(() => console.log('Migration reverted successfully.'))
    .catch(error => console.error('Failed to revert migration:', error));

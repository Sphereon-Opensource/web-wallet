import {getDefaultDID} from '../utils';
import {addContactsRWS} from "./demo-data/rws/contact-fixtures";
import {addContactsKonkuk} from "./demo-data/konkuk/contact-fixtures";
import {addFormDefsKonkuk} from "./demo-data/konkuk/formdef-fixtures";
import {addFormDefsBelastingdienst} from "./demo-data/belastingdienst/formdef-fixtures";

enum FixtureType {
    Contacts = 'contacts',
    FormDef = 'formdef'
}

enum Demo {
    RWS = 'rws',
    Konkuk = 'konkuk',
    Belastingdienst = 'belastingdienst'
}

async function handleDemo(fixture: FixtureType, demo: Demo) {
    try {
        const defaultDID = await getDefaultDID();

        switch (fixture) {
            case FixtureType.Contacts:
                switch (demo) {
                    case Demo.RWS:
                        await addContactsRWS();
                        break;
                    case Demo.Konkuk:
                        await addContactsKonkuk();
                        break;
                    default:
                        throw new Error(`Unsupported demo type for contacts: ${demo}`);
                }
                break;
            case FixtureType.FormDef:
                switch (demo) {
                    case Demo.RWS:
                        break;
                    case Demo.Konkuk:
                        await addFormDefsKonkuk();
                        break;
                    case Demo.Belastingdienst:
                        await addFormDefsBelastingdienst();
                        break;
                    default:
                        throw new Error(`Unsupported demo type for form definitions: ${demo}`);
                }
                break;
            default:
                throw new Error(`Unsupported type: ${fixture}`);
        }

        console.log('Demo data initialized');
    } catch (error) {
        console.error(`Initialization failed: ${error}`);
        process.exit(1);
    }
}

function parseArgs(args: string[]): { fixture: FixtureType; demo: Demo } {
    if (args.length !== 2) {
        console.error('Expected exactly two arguments: fixture and demo');
        console.log('example:');
        console.log('  pnpm demo:init -- contacts rws');
        process.exit(1);
    }

    const fixture = args[0] as FixtureType;
    const demo = args[1] as Demo;

    if (!Object.values(FixtureType).includes(fixture) || !Object.values(Demo).includes(demo)) {
        console.error(`Invalid arguments. Known types: ${Object.values(FixtureType).join(', ')}, demos: ${Object.values(Demo).join(', ')}`);
        process.exit(1);
    }

    return {fixture: fixture, demo};
}

async function main() {
    const {fixture, demo} = parseArgs(process.argv.slice(2));
    await handleDemo(fixture, demo);
}

main();

// We import the plain env vars first. To make sure no code that relies on them gets executed first
import "./environment-vars.js";

// Env vars with some dependencies. Mainly to type the constants
//import './environment-deps'
export * from './types/index.js'
export * from './utils/index.js'
export * from './database/index.js'

export * from './agent.js'


process.on('uncaughtException', (err) => {
  console.error('UNCUGHT EXCEPTION >>>');
  console.error(err);
  // If it’s a non-Error object, dump its keys deeply:
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
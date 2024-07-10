This directory contains several Docker files and docker compose files. Be aware that these are currently mutually
exclusive. In other words, by default you cannot run multiple docker compose files together. This mainly has to do with
the fact they are sharing the same ports and configuration variables. It would be relatively straightforward to adjust
these in case you do need to run multiple instances simultaneously.

The different docker(compose files):
- standalone-agent-full: This image allows you to run a standalone agent, without the web-wallet being involved. It has most features enabled by default. You can adjust them via the .env file

The below docker files are currently being worked on, so they might not work
- standalone-agent-verifier: This image allows you to run a standalone agent, without the web-wallet being involved, and focused on verifier/RP functionality.
- standalone-agent-issuer: This image allows you to run a standalone agent, without the web-wallet being involved, and focused on issuer/provider functionality.
- wallet-agent-full: This image runs the agent, including support for the web wallet. It requires a postgresql (only) database. Sqlite is not supported in this mode currently.
- wallet-frontend-only: This image runs the web wallet frontend only. Be aware that the frontend always needs the backend/agent to run as well

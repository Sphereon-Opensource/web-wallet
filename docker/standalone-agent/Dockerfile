FROM node:20-bookworm
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/agent
RUN npm -g install pnpm && SHELL=bash pnpm setup && source /root/.bashrc && pnpm self-update

RUN pnpm add typescript tslib

COPY ./packages/agent packages/agent
COPY ./patches patches
COPY *.json .
COPY *.yaml .
RUN pnpm install -r
RUN rm -rf packages/agent/conf/examples
RUN rm packages/agent/.env*

WORKDIR /opt/agent/packages/agent
RUN pnpm build

ENTRYPOINT ["pnpm", "start:dev"]

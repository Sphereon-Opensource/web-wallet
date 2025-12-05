FROM node:iron-bullseye
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/agent
RUN npm -g install pnpm@9 && SHELL=bash pnpm setup && source /root/.bashrc && pnpm self-update

RUN pnpm add typescript tslib

COPY ./packages/agent packages/agent
COPY ./patches patches
COPY *.json .
COPY *.yaml .
RUN pnpm install -r

RUN rm -rf packages/agent/conf/examples

WORKDIR /opt/agent/packages/agent
RUN pnpm build

ENTRYPOINT ["pnpm", "start:dev"]

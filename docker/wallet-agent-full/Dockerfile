FROM node:20.12.1-bookworm
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/wallet/agent
RUN npm -g install pnpm@9 && SHELL=bash pnpm setup && source /root/.bashrc && pnpm self-update

RUN pnpm add typescript tslib

COPY packages/agent packages/agent
COPY patches patches
COPY *.json .
COPY *.yaml .
RUN pnpm install -r
WORKDIR /opt/wallet/agent/packages/agent
RUN rm -rf /opt/wallet/agent/packages/agent/conf/examples
RUN pnpm build

ENTRYPOINT ["pnpm", "start:dev"]

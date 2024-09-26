FROM node:20.12.1-bullseye
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/wallet/agent
RUN npm -g install pnpm && SHELL=bash pnpm setup && source /root/.bashrc && pnpm add -g pnpm
RUN pnpm add typescript tslib

COPY packages packages
COPY patches patches
COPY *.json .
COPY *.yaml .
RUN pnpm install -r
WORKDIR /opt/wallet/agent/packages/agent
RUN rm -rf /opt/wallet/agent/packages/agent/conf/demos
RUN pnpm build

ENTRYPOINT ["pnpm", "start:dev"]

FROM node:20-bullseye
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/wallet/frontend
RUN npm -g install pnpm && SHELL=bash pnpm setup && source /root/.bashrc && pnpm add -g pnpm
RUN pnpm add typescript tslib

COPY packages packages
COPY patches patches
COPY *.json .
COPY *.yaml .
RUN rm -rf /opt/wallet/frontend/packages/agent
WORKDIR /opt/wallet/frontend/packages/web-wallet
RUN pnpm install
RUN pnpm build

ENTRYPOINT ["pnpm", "start:prod"]

FROM node:lts-bullseye
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/wallet/agent
RUN npm -g install pnpm && SHELL=bash pnpm setup && source /root/.bashrc && pnpm add -g pnpm
RUN pnpm add typescript tslib

COPY ./ .
RUN ls -al
RUN pnpm install -r
RUN pnpm build

ENTRYPOINT ["pnpm", "start:dev"]

FROM node:lts-bullseye
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/agent
RUN npm -g install pnpm && SHELL=bash pnpm setup && source /root/.bashrc && pnpm add -g pnpm
RUN pnpm add typescript tslib

COPY ./ .
RUN pnpm install -r
RUN pnpm build

ENTRYPOINT ["pnpm", "start:dev"]

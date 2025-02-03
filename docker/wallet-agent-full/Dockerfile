FROM node:lts-bookworm
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/wallet/agent
RUN node -v
RUN npm install -g pnpm && SHELL=bash pnpm setup && source /root/.bashrc && pnpm self-update

RUN pnpm add typescript tslib

COPY ./ .
RUN ls -al
RUN pnpm install -r
RUN pnpm build

ENTRYPOINT ["pnpm", "start:dev"]

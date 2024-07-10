FROM node:lts-bullseye
SHELL ["/bin/bash", "-c"]
RUN npm -g install pnpm && SHELL=bash pnpm setup && source /root/.bashrc && pnpm add -g pnpm
RUN pnpm add typescript tslib
WORKDIR /opt/wallet/frontend

COPY . .
RUN pnpm install -r
RUN pnpm build

ENTRYPOINT ["pnpm", "start:prod"]

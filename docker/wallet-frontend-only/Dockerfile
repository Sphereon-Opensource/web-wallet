FROM node:lts-bullseye
SHELL ["/bin/bash", "-c"]
RUN npm -g install pnpm && SHELL=bash pnpm setup && source /root/.bashrc && pnpm add -g pnpm
RUN pnpm add typescript tslib
WORKDIR /opt/web-wallet

COPY ./ .
RUN pnpm install -r
RUN pnpm build

WORKDIR /opt/ssi-agent/packages/web-wallet
ENTRYPOINT ["pnpm", "start:prod"]

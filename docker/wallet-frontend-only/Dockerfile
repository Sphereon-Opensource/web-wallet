FROM node:20.12.1-bullseye
SHELL ["/bin/bash", "-c"]
WORKDIR /opt/wallet/frontend
RUN npm -g install pnpm@8 && SHELL=bash pnpm setup && source /root/.bashrc && pnpm add -g pnpm@8
RUN pnpm add typescript tslib

COPY packages packages
COPY patches patches
COPY *.json .
COPY *.yaml .
RUN pnpm install
#CMD ["/bin/bash"]
WORKDIR /opt/wallet/frontend/packages/web-wallet
RUN pnpm build

ENTRYPOINT ["pnpm", "start:prod"]


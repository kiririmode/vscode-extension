FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:20

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    python3-pip python3-setuptools python3-wheel \
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

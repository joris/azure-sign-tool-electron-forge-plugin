# azure-sign-tool-electron-forge-plugin

I wanted to sign the Windows app that we’re building (www.recordonce.com) with an EV certificate in a Github Actions build pipeline.

[This article provided](https://melatonin.dev/blog/how-to-code-sign-windows-installers-with-an-ev-cert-on-github-actions/) 99% of the solution. But as Electron Forge does not use AzureCodeSign which is necessary to work with HSM and Azure Key Vault, I adapted another plugin ([@burzo/electron-forge-ssl-code-sign-plugin](https://github.com/Burzo/electron-forge-ssl-code-sign-plugin/)) to hopefully fix that.

The code is inspired by [@burzo/electron-forge-ssl-code-sign-plugin](https://github.com/Burzo/electron-forge-ssl-code-sign-plugin/), and originally heavily borrowed from that project.

## Prerequisites

This plugin works with electron-forge version >=7.

Additionally, you need to install the [AzureSignTool](https://github.com/vcsjones/AzureSignTool).

This plugin only supports building on Windows-based machines. That’s because both Squirrel and AzureSignTool only work on Windows.

## Installation

```
npm i --save-dev azure-sign-tool-electron-forge-plugin
```

or

```
yarn add --dev azure-sign-tool-electron-forge-plugin
```

## Configuration

The plugin accepts the configuration variables that are used by this guide on how to sign code with an EV certificate.
The variables correspond to [AzureCodeSign’s paramaters](https://github.com/vcsjones/AzureSignTool#parameters).

### Make sure you make with Squirrel:

forge.config.ts:

```
import { MakerSquirrel } from "@electron-forge/maker-squirrel";

  ...,
  makers: [
    new MakerSquirrel((arch) => ({
```

## Include the plugin in your Forge config as follows:

forge.config.ts:

```
import { ElectronForgeAzureSignToolPlugin } from "azure-sign-tool-electron-forge-plugin";

const config: ForgeConfig = {
  ...,
  plugins: [
    // Make sure you
    new ElectronForgeAzureSignToolPlugin({
      azureKeyVaultUri: process.env.AZURE_KEY_VAULT_URI || "",
      azureClientId: process.env.AZURE_CLIENT_ID || "",
      azureTenantId: process.env.AZURE_TENANT_ID || "",
      azureClientSecret: process.env.AZURE_CLIENT_SECRET || "",
      azureCertificateName: process.env.AZURE_CERTIFICATE_NAME || "",
    }),
  ],
  ...,
```

### Your Github Actions workflow should look something like this:

```
# taken from https://github.com/electron/fiddle/blob/main/.github/workflows/build.yaml
name: Build & Release

on:
  push:
    branches:
      - master
    tags:
      - v*
  pull_request:

env:
  NPM_REGISTRY: npm.pkg.github.com

jobs:
  build:
    if: startsWith(github.ref, 'refs/tags/')
    name: Build (${{ matrix.os }} - ${{ matrix.arch }})
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        # Build for supported platforms
        # https://github.com/electron/electron-packager/blob/ebcbd439ff3e0f6f92fa880ff28a8670a9bcf2ab/src/targets.js#L9
        # 32-bit Linux unsupported as of 2019: https://www.electronjs.org/blog/linux-32bit-support
        os: [macos-latest, ubuntu-latest, windows-latest]
        arch: [x64]
        include:
          - os: macos-latest
            arch: universal
          - os: macos-latest
            arch: arm64
          - os: windows-latest
            arch: ia32

    steps:
      […]

      - name: Install AzureSignTool on Windows
        if: matrix.os == 'windows-latest'
        shell: bash
        run: dotnet tool install --global AzureSignTool

      - name: Make & Publish
        if: startsWith(github.ref, 'refs/tags/')
        run: yarn electron-forge publish --arch=${{ matrix.arch }}
        env:
          AZURE_KEY_VAULT_URI: ${{ secrets.AZURE_KEY_VAULT_URI }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_CERTIFICATE_NAME: ${{ secrets.AZURE_CERTIFICATE_NAME }}
```

## Contribution

Feel free to submit a PR :)

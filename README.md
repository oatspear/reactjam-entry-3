# ReactJam Entry 2

## Install

This repository requires a version of NPM that at least supports `npx`.

This project was created following the instructions of [Rune's Quick Start guide](https://developers.rune.ai/docs/quick-start/#install).

Namely, the project's initial files were created using the following command:

```
npx rune-games-cli@latest create
```

## Build

The following command installs all necessary dependencies. This is required both in order to test and to build the final distribution.

```
npm install
```

The following command builds the final distribution (the one the should be uploaded). The code is placed in the `dist` directory.

```
npm build
```

## Test

In order to run the project, run the following command (after installing dependencies with `ǹpm install`).

```
npm run dev
```

This should start a server with Vite on a `localhost:NNNN` address.

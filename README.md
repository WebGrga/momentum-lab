# Momentum Lab

[![CI](https://github.com/WebGrga/momentum-lab/actions/workflows/ci.yml/badge.svg)](https://github.com/WebGrga/momentum-lab/actions/workflows/ci.yml)

Momentum Lab is a local-first desktop app for running personal experiments, building routines, capturing notes, and reviewing progress without sending personal data to a cloud service.

I built the original version as my individual college project under the working name **Project G**. This repository contains my maintained TypeScript and Electron version under its public name, Momentum Lab.

## What it demonstrates

- Product design for experiments, routines, notes, and ideas in one connected workspace
- A typed canonical data model shared across the application
- Browser persistence with an Electron file-storage bridge
- Import and export of human-readable JSON backups
- A responsive dark interface built without a component framework
- A migration from a single-file prototype to a maintainable Vite project

## Architecture

```text
src/
  app.ts       application state, rendering, interactions, and migrations
  model.ts     canonical TypeScript data model
  styles.css   complete visual system
electron/
  main.cjs     desktop lifecycle and file-backed persistence
  preload.cjs  narrow IPC bridge exposed to the renderer
```

The browser version stores data in `localStorage`. The desktop version additionally writes a JSON file inside Electron's application-data directory. Data is local to the device; the repository contains no user records.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm run dev
```

Desktop mode:

```bash
npm start
```

Create a Windows installer:

```bash
npm run dist
```

## Status

Momentum Lab is a functional prototype. Local persistence, the core data model, navigation, backups, routines, notes, ideas, and experiment tracking are implemented. Cross-device synchronization and mobile packaging are future work.

## Privacy

No analytics or remote database is included. Avoid committing exported backups because they may contain private notes.

## Author

Created by [Roko Grga](https://github.com/WebGrga).

## License

MIT

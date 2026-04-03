# Patch Me If You Can

This repository is a prototype for reviewing AI-generated code changes as if they were incoming mutations.

The system does three main things:

- blocks changes that touch protected files
- quarantines changes that fail verification
- visualizes the decision flow in a frontend interface

The current version was assembled in less than 3 hours, so the focus is on demonstrating the workflow clearly rather than shipping a complete production system.

## Assets

## What The Project Does

The backend models a patch review pipeline:

1. A patch or hook event enters the system.
2. Protected file rules run first.
3. Verification runs through tests, lint, and typecheck.
4. Passing changes are released.
5. Failing changes are quarantined.
6. A repair loop can attempt recovery for repairable failures.

The frontend visualizes that flow as a control-room style interface built with Phaser.

## Main Behaviors

### Protected files

If a patch touches protected areas, it is blocked immediately.

Examples include:

- `src/auth/`
- `src/security/`
- `config/secrets.ts`
- protected SQL or schema paths

### Verification

The backend evaluates:

- tests
- lint
- typecheck

If all checks pass, the patch is released.

If checks fail, the patch is quarantined.

### Repair loop

For repairable failures, the system can simulate a repair cycle:

- generate diagnosis
- generate treatment instructions
- attempt repair
- re-run checks
- either release or keep quarantined

### Operator guardrails

The right-side frontend panel lets you define natural-language constraints for the repair process.

Examples:

- do not touch auth files
- do not change the main SQL database
- keep the fix minimal
- do not modify production seed data

These instructions are reflected in the displayed agent prompt and the repair flow.

## Cursor Hooks

The repo also includes a Cursor hook bridge.

The goal of that piece is to let editor activity be forwarded into the backend as mutation-like events, so the system can react to file edits and visualize them in the same pipeline.

When the backend is running, it also exposes a live websocket feed at `/ws` so the frontend can receive hook, timeline, and mutation-status updates without polling.

## Repository Layout

- `backend/`
  TypeScript backend for scenarios, policy handling, verification flow, and mutation processing
- `front end/gamevis/phaser-rpg/`
  Phaser frontend for the visual interface
- `scripts/`
  helper scripts, including the Cursor hook bridge

## Local Development

### Backend

From `backend/`:

```bash
npm install
npm run build
npm run start
```

Run scenario output directly:

```bash
node dist/cli/run-scenario.js healthy
```

### Frontend

From `front end/gamevis/phaser-rpg/`:

```bash
npm install
npm run build
```

Serve `dist/` locally to preview the built app.



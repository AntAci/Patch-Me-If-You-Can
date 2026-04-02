# Mainline Immunity

This document is the current root-level source of truth for the repo as it exists locally on April 2, 2026.

It replaces the earlier team-split planning note with a practical handoff document so the next backend pull and merge can happen cleanly.

## Project intent

Mainline Immunity treats AI-generated patches like incoming mutations:

- inspect the patch
- verify health
- quarantine risky changes
- diagnose failures
- generate a treatment path
- retry once when appropriate
- release only healthy code

The demo still centers on three deterministic scenarios:

- healthy
- infected-healed
- protected-zone-blocked

## Current repo shape

The repo is currently split into two working areas:

- `backend/`
- `front end/gamevis/phaser-rpg/`

The backend already contains the scenario runner and event pipeline logic.
The frontend already contains the visual demo client that renders those scenario results.

## Backend status

Local backend status today:

- TypeScript Node service
- package name: `mainline-immunity-backend`
- entry exports in `backend/src/index.ts`
- scenario runner in `backend/src/runner.ts`
- REST + WebSocket server in `backend/src/server.ts`
- deterministic scenario fixtures in `backend/src/scenarios/*.json`
- pipeline/event schema in `backend/src/schemas/events.ts`

### What the backend already does locally

- loads one of the scripted scenarios
- runs it through `runPipeline(...)`
- returns structured result data for the frontend
- exposes `GET /api/scenarios`
- exposes `POST /api/run/:name`
- exposes WebSocket live channel at `/ws`

### Current backend contract

The backend result shape already includes:

- `scenarioId`
- `patchId`
- `task`
- `zone`
- `status`
- `symptoms`
- `health`
- `finalVerdict`
- `quarantined`
- `diagnosis`
- `treatment`
- `checks`
- `protectedZone`
- `retry`
- `timeline`

### Current scenario names

- `healthy`
- `infected-healed`
- `protected-zone-blocked`

### Current backend scripts

- `npm run build`
- `npm run run:scenario`
- `npm run serve`

## Frontend status

Local frontend status today:

- Phaser + Vite app
- root at `front end/gamevis/phaser-rpg/`
- boot entry in `src/index.ts`
- main visualization scene in `src/scenes/Dashboard.ts`
- API bridge in `src/data/api.ts`
- static fallback data in `src/data/staticResults.ts`

### What the frontend already does locally

- starts a Phaser-based single-screen dashboard
- visualizes repo zones and pipeline stages
- runs the demo from scenario result payloads
- calls backend scenario endpoints when available
- falls back to static scenario payloads if the backend is unavailable
- can connect to `/ws` for live timeline events

### Frontend expectations from backend

The frontend is built around:

- a scenario result payload for demo playback
- a `timeline` array for staged animation
- verdict/health data for UI state transitions
- zone labels that align with the backend contract:
  `Auth`, `UI`, `API`, `Config`, `Tests`

## Integration status

The local frontend and backend are already aligned around scripted scenario playback.

This means the repo is beyond the original planning stage. The root document should now be treated as an architecture and merge-prep note, not a task split.

## Pending backend sync from GitHub

Important current constraint:

There is an unpulled GitHub version of the backend that contains the Cursor hooks work.

That remote backend state has not been pulled into this local workspace yet.

For now, do not describe Cursor hooks as already integrated locally.
Document them only as pending backend sync work until the pull actually happens.

### Assumption to preserve

Until the GitHub backend version is pulled, the local backend should be treated as:

- scenario-driven
- deterministic
- frontend-compatible
- not yet updated with the latest Cursor hooks integration

### Merge goal for the later pull

When the backend GitHub version is pulled, the merge should preserve:

- existing frontend scenario compatibility
- current scenario names
- current result fields used by the frontend
- REST endpoint compatibility where possible
- WebSocket compatibility where possible

### Merge guardrails

When pulling the backend Cursor hooks work later, check these first:

- does `POST /api/run/:name` still exist or need an adapter
- does the scenario result payload still include all current frontend fields
- do timeline event names remain compatible with the dashboard playback
- do zone names remain exactly `Auth`, `UI`, `API`, `Config`, `Tests`
- does live mode continue to publish events on `/ws`
- does any new Cursor hooks behavior require frontend copy or state updates

### Preferred merge approach later

1. Pull backend changes only after reviewing the current local backend contract.
2. Diff the incoming Cursor hooks implementation against:
   `backend/src/server.ts`, `backend/src/runner.ts`, `backend/src/schemas/events.ts`, and the scenario fixtures.
3. Keep the frontend contract stable first.
4. If the Cursor hooks backend changes the payload shape, add an adapter layer instead of breaking the frontend directly.
5. Re-test all three scripted scenarios after the merge.

## Local truth to keep stable before that pull

These are the local assumptions that currently appear to drive the frontend:

- the backend can run named demo scenarios
- the frontend can fetch those results from `/api/run/:name`
- the frontend can still demo successfully using static fallback data
- the core experience is a control-room style pipeline visualization, not a generic CRUD UI

## Recommended next step after this doc update

When ready, the next operation should be:

- pull the newer GitHub backend version with Cursor hooks
- inspect contract drift
- merge in a way that preserves the existing frontend demo flow
- update this document again after the pull so it reflects the new local truth

## Files most relevant for that later merge

- `backend/src/server.ts`
- `backend/src/runner.ts`
- `backend/src/schemas/events.ts`
- `backend/src/scenarios/healthy.json`
- `backend/src/scenarios/infected-healed.json`
- `backend/src/scenarios/protected-zone-blocked.json`
- `front end/gamevis/phaser-rpg/src/data/api.ts`
- `front end/gamevis/phaser-rpg/src/data/types.ts`
- `front end/gamevis/phaser-rpg/src/scenes/Dashboard.ts`

## Bottom line

The repo already has a working local frontend/backend split for the Mainline Immunity demo.

The main unresolved integration item is the unpulled GitHub backend version that adds Cursor hooks.

Until that pull happens, this document should be read as:

- current local architecture summary
- current frontend/backend contract summary
- merge-prep checklist for the upcoming backend sync

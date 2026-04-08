## Description

<!-- What does this PR do? Link the related issue if applicable. -->

Closes #

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Refactor / code cleanup
- [ ] Documentation
- [ ] Infrastructure / CI

## How Was It Tested?

<!-- Describe the steps you took to verify your changes work correctly. -->

## Pre-merge Checklist

**All boxes must be checked before requesting review.**

### General

- [ ] My branch is up to date with `main`
- [ ] I have not committed any `.env` files or secrets
- [ ] I have removed all debug / temporary `console.log` or `print` statements

### Frontend (`ui/`) — if changed

- [ ] `npm run lint` passes with no errors
- [ ] `npx tsc --noEmit` passes with no TypeScript errors
- [ ] `npm test` passes

### Backend (`api/`) — if changed

- [ ] `ruff check .` passes with no errors
- [ ] `ruff format --check .` passes
- [ ] `pyright` passes with no errors
- [ ] `uv run pytest` passes

### Crons (`crons/`) — if changed

- [ ] `ruff check .` passes with no errors
- [ ] `ruff format --check .` passes
- [ ] `uv run pytest` passes

### Documentation

- [ ] I have updated relevant README or docs if my change affects setup or usage

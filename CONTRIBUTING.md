# Contributing to ResearchTeam

Thank you for your interest in contributing! This document covers how to get set up, the pull request process, and the standards we follow.

## Table of Contents

- [Contributing to ResearchTeam](#contributing-to-researchteam)
  - [Table of Contents](#table-of-contents)
  - [Code of Conduct](#code-of-conduct)
  - [Prerequisites](#prerequisites)
  - [Getting Started](#getting-started)
  - [Development Setup](#development-setup)
    - [Frontend (`ui/`)](#frontend-ui)
    - [Backend (`api/`)](#backend-api)
    - [Crons (`crons/`)](#crons-crons)
    - [Both (Docker)](#both-docker)
  - [How to Contribute](#how-to-contribute)
    - [Reporting Bugs](#reporting-bugs)
    - [Suggesting Features](#suggesting-features)
    - [Picking Up Issues](#picking-up-issues)
  - [Pull Request Process](#pull-request-process)
    - [PR Rules](#pr-rules)
  - [Coding Standards](#coding-standards)
    - [Python (backend / crons)](#python-backend--crons)
    - [TypeScript (frontend)](#typescript-frontend)
    - [General](#general)
  - [Commit Messages](#commit-messages)
  - [Security Issues](#security-issues)

---

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

---

## Prerequisites

| Tool    | Version                  | Install                                            |
| ------- | ------------------------ | -------------------------------------------------- |
| Node.js | 22+                      | [nodejs.org](https://nodejs.org)                   |
| Python  | 3.12 (api) / 3.9 (crons) | [python.org](https://python.org)                   |
| uv      | latest                   | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| Docker  | latest                   | [docker.com](https://docker.com)                   |

> **Why `uv`?** This project uses `uv` as its Python package manager. It is significantly faster than pip and handles virtual environments automatically. All Python commands in this guide use `uv`.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/research-team.git
   cd research-team
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/[REDACTED FOR BLIND REVIEW]/research-team.git
   ```
4. **Install pre-commit hooks** (runs lint/format/type checks automatically before each commit):
   ```bash
   npm install
   ```

---

## Development Setup

### Frontend (`ui/`)

```bash
cd ui
npm install
cp .env.example .env.local   # then fill in your values
npm run dev                  # http://localhost:3000
```

See [ui/.env.example](ui/.env.example) for all required variables and descriptions.

### Backend (`api/`)

```bash
cd api
uv sync                      # creates .venv and installs dependencies
cp .env.example .env         # then fill in your values
uv run fastapi dev main.py --port 8080
```

See [api/.env.example](api/.env.example) for all required variables and descriptions.

### Crons (`crons/`)

```bash
cd crons
uv sync
cp .env.example .env         # then fill in your values
uv run python main.py
```

See [crons/.env.example](crons/.env.example) for all required variables and descriptions.

### Both (Docker)

```bash
docker compose up
```

---

## How to Contribute

### Reporting Bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template. Include:

- Steps to reproduce
- Expected vs. actual behavior
- Screenshots or logs if applicable

### Suggesting Features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md) template.

### Picking Up Issues

Look for issues labeled `good first issue` or `help wanted`. Comment on the issue before starting work so we can assign it and avoid duplication.

---

## Pull Request Process

1. **Sync with upstream** before branching:

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch** off `main`:

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/short-description
   ```

3. **Make your changes**, keeping commits small and focused.

4. **Run all checks** for the components you touched before pushing:

   **Frontend (`ui/`)**

   ```bash
   cd ui
   npm run lint          # ESLint — must pass with no errors
   npx tsc --noEmit      # TypeScript — must pass with no errors
   npm test              # Vitest — all tests must pass
   ```

   **Backend (`api/`)**

   ```bash
   cd api
   uv run ruff check .          # linter — must pass with no errors
   uv run ruff format --check . # formatter — must pass
   uv run pyright               # type checker — must pass with no errors
   uv run pytest                # tests — all must pass
   ```

   **Crons (`crons/`)**

   ```bash
   cd crons
   uv run ruff check .
   uv run ruff format --check .
   uv run pytest
   ```

5. **Push** your branch and open a PR against `main`:

   ```bash
   git push origin feature/your-feature-name
   ```

6. Fill out the **PR template** completely — description, testing steps, and all checklist items.

7. A maintainer will review within a few days. Address review comments by pushing new commits (do not force-push after review has started).

8. PRs require **at least one approving review** before merge. The maintainer will squash-merge into `main`.

### PR Rules

- PRs must target `main` — never push directly to `main`
- Keep PRs focused; one logical change per PR
- All checks listed above must pass before requesting review
- Do not include `.env` files, secrets, or personal credentials

---

## Coding Standards

### Python (backend / crons)

- Package manager: `uv`
- Formatter: `uv run ruff format`
- Linter: `uv run ruff check`
- Type checker: `uv run pyright` (api only)
- Follow existing patterns for router/service separation in `api/`

### TypeScript (frontend)

- Linter: `npm run lint` (ESLint)
- Type checker: `npx tsc --noEmit`
- Use existing component patterns (shadcn/ui, Tailwind CSS)

### General

- Do not commit `.env` files or any credentials — use `.env.example` as a template
- Remove debug/console logs before submitting
- Write clear variable and function names — avoid abbreviations

---

## Commit Messages

Use the imperative mood and keep the subject line under 72 characters:

```
feat: add researcher profile card component
fix: correct grant deadline date parsing
docs: update local dev setup instructions
refactor: extract vector search into service layer
```

Common prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

---

## Security Issues

Do **not** open a public issue for security vulnerabilities. See [SECURITY.md](SECURITY.md).

---

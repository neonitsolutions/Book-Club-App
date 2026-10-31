# Branching strategy

```
feature/*  ──PR (squash)──►  frontend  ──┐
                                         ├──PR (merge commit)──►  main  ──►  staging ──approve──► production
feature/*  ──PR (squash)──►  backend   ──┘                          ▲
                                                                    │
fix/*  ─────────────────────PR (squash)──────────────────────────────┘   (urgent production fixes only)
```

## Branches

| Branch | Purpose | Who writes to it | Jenkins |
| --- | --- | --- | --- |
| `main` | Always deployable; what runs in production | Pull requests only | Full pipeline: push images to ECR, deploy staging, approval, deploy production |
| `frontend` | Integration branch for `apps/frontend` | Pull requests from `feature/*` | Lint, test, build, Docker build + scan |
| `backend` | Integration branch for `apps/backend` | Pull requests from `feature/*` | Lint, test, build, Docker build + scan |
| `feature/<area>-<short-name>` | One piece of work, e.g. `feature/backend-auth-jwt` | You | Lint, test, build |
| `fix/<short-name>` | Urgent fix for production, branched from `main` | You | Lint, test, build |
| Tag `vX.Y.Z` | Release marker on `main` | You | Re-tags the deployed images with the version |

## Day-to-day workflow

```bash
# 1. Start from the up-to-date integration branch
git checkout backend
git pull

# 2. Create a feature branch
git checkout -b feature/backend-auth-jwt

# 3. Commit and push
git push -u origin feature/backend-auth-jwt

# 4. Open a pull request: feature/backend-auth-jwt -> backend  (Squash and merge)
# 5. When backend is ready to release, open a pull request: backend -> main  (Create a merge commit)
```

## Rules

- Never push directly to `main`, `frontend` or `backend`; always open a pull request.
- Feature → `frontend`/`backend`: **Squash and merge** (one tidy commit per feature).
- `frontend`/`backend` → `main`: **Create a merge commit**, never squash. Squashing here
  makes the integration branch's commits look unmerged and causes the same conflicts again next time.
- After anything lands on `main`, bring both integration branches up to date:

  ```bash
  git checkout frontend && git pull && git merge origin/main && git push
  git checkout backend  && git pull && git merge origin/main && git push
  ```

- Changes that touch both apps (an API contract, `docker-compose.yml`, the `Jenkinsfile`) go through
  `backend` first, then `frontend`, or as a `feature/*` branch straight to `main` if they must land together.
- Delete feature branches after they are merged (GitHub can do this automatically).
- Never force-push a shared branch.

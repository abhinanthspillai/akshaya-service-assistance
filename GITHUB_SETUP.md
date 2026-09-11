# GitHub Setup

1. Create an empty GitHub repository, recommended name: `akshaya-service-assistance`.
2. Extract this package so this folder is the repository root.
3. Edit `.github/CODEOWNERS` and replace `@YOUR_GITHUB_USERNAME`.
4. Initialize and push:

```powershell
git init
git branch -M main
git add .
git commit -m "docs: establish Akshaya implementation baseline"
git remote add origin https://github.com/YOUR_USERNAME/akshaya-service-assistance.git
git push -u origin main
```

5. Enable Issues and Actions.
6. Create a ruleset for `main`: require PRs; block force-push. Once CI checks have completed successfully at least once, require the relevant checks.
7. Prefer squash merge.
8. Create the first issue from `tasks/001_repository_ci_foundation.md`.

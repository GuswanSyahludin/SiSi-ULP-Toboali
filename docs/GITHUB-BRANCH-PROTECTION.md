# GitHub branch protection audit

`main` must require the security and release checks before merge. The repository-local script `scripts/verify_branch_protection.py` queries GitHub's live branch-protection API so the result cannot be confused with a copied configuration file.

## Required checks

The default required checks are:

- `Backend syntax and security tests`
- `Flutter analyze and compile`
- `Reject auth tokens in query strings`

The audit also requires the protected branch to be up to date before merge, at least one approving review, dismissal of stale approvals, administrator enforcement, disabled force-push and deletion, and required conversation resolution.

## Run manually

Use a GitHub token with permission to read repository branch protection:

```bash
GITHUB_TOKEN=*** \\
GITHUB_REPOSITORY=GuswanSyahludin/SiSi-ULP-Toboali \\
BRANCH_NAME=main \\
python3 scripts/verify_branch_protection.py
```

The script prints the observed checks and a machine-readable pass/fail result. It never prints the token or any protected value.

## Operational requirement

Run this audit after changing the ruleset and before treating the release gate as complete. A green repository CI run alone is not evidence that the GitHub branch-protection settings require those checks. Keep the token in a secret store or a short-lived local environment variable, never in the repository or task comments.

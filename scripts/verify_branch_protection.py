#!/usr/bin/env python3
"""Verify the security and release gates required on main.

This intentionally checks live GitHub branch protection, not a repository-local
copy of the settings. Run it with a token that can read repository protection.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


DEFAULT_REQUIRED_CHECKS = (
    "Backend syntax and security tests",
    "Flutter analyze and compile",
    "Reject auth tokens in query strings",
)


def github_json(path: str) -> dict:
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        raise SystemExit("GITHUB_TOKEN or GH_TOKEN is required")
    url = "https://api.github.com" + path
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "sisi-branch-protection-audit",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return json.load(response)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"GitHub protection API returned HTTP {exc.code}: {body[:300]}") from exc
    except urllib.error.URLError as exc:
        raise SystemExit(f"GitHub protection API request failed: {exc.reason}") from exc


def main() -> int:
    repository = os.environ.get("GITHUB_REPOSITORY", "GuswanSyahludin/SiSi-ULP-Toboali")
    branch = os.environ.get("BRANCH_NAME", "main")
    required = tuple(
        item.strip()
        for item in os.environ.get("REQUIRED_CHECKS", ",".join(DEFAULT_REQUIRED_CHECKS)).split(",")
        if item.strip()
    )
    protection = github_json(f"/repos/{repository}/branches/{branch}/protection")

    failures: list[str] = []
    checks = protection.get("required_status_checks") or {}
    contexts = set(checks.get("contexts") or [])
    checks_objects = {item.get("context") for item in checks.get("checks") or []}
    available_checks = contexts | {item for item in checks_objects if item}
    missing = [name for name in required if name not in available_checks]
    if not checks.get("strict"):
        failures.append("required status checks must require the branch to be up to date")
    if missing:
        failures.append("missing required checks: " + ", ".join(missing))

    reviews = protection.get("required_pull_request_reviews") or {}
    if int(reviews.get("required_approving_review_count") or 0) < 1:
        failures.append("at least one approving pull-request review is required")
    if not reviews.get("dismiss_stale_reviews"):
        failures.append("stale approvals must be dismissed after new commits")
    if not (protection.get("enforce_admins") or {}).get("enabled"):
        failures.append("admin enforcement must be enabled")
    if (protection.get("allow_force_pushes") or {}).get("enabled"):
        failures.append("force pushes must be disabled")
    if (protection.get("allow_deletions") or {}).get("enabled"):
        failures.append("branch deletion must be disabled")
    if not (protection.get("required_conversation_resolution") or {}).get("enabled"):
        failures.append("conversation resolution must be required")

    print(json.dumps({
        "repository": repository,
        "branch": branch,
        "requiredChecks": list(required),
        "observedChecks": sorted(available_checks),
        "ok": not failures,
        "failures": failures,
    }, indent=2, ensure_ascii=False))
    if failures:
        print("Branch protection audit failed.", file=sys.stderr)
        return 1
    print("Branch protection audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

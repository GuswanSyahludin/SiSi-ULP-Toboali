#!/usr/bin/env python3
from pathlib import Path
import re, sys
ROOT = Path(__file__).resolve().parents[1]
WF = ROOT / '.github' / 'workflows'
TRIGGER = re.compile(r'(?m)^\s*(push|pull_request|pull_request_target)\s*:')
RULES = [
 ('write permission', re.compile(r'(?mi)^\s*(contents|pull-requests|issues|actions|checks|deployments|packages|statuses)\s*:\s*write\s*$')),
 ('git mutation', re.compile(r'(?i)\bgit\s+(?:add|commit|push|rm)\b')),
 ('PR merge', re.compile(r'(?i)\bgh\s+pr\s+merge\b')),
]
def active(path):
 return '\n'.join(x for x in path.read_text(encoding='utf-8').splitlines() if not x.lstrip().startswith('#'))
def main():
 failures=[]
 for path in sorted([*WF.glob('*.yml'), *WF.glob('*.yaml')]):
  text=active(path)
  if not text.strip() or not TRIGGER.search(text): continue
  for label, rule in RULES:
   m=rule.search(text)
   if m: failures.append(f'{path.relative_to(ROOT)}: {label}: {m.group(0).strip()}')
 if failures:
  print('Workflow mutation policy violations:')
  print('\n'.join('- '+x for x in failures))
  return 1
 print('PASS: push/PR workflows are read-only.')
 return 0
if __name__ == '__main__': sys.exit(main())

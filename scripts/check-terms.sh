#!/usr/bin/env bash
# Greps publishable content for terms that must never be published.
# Run before declaring any content task complete.
#
# Usage: ./scripts/check-terms.sh
# Exit 0 = clean, exit 1 = leak found.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TERMS="$ROOT/private/banned-terms.txt"
SCAN=("$ROOT/resources" "$ROOT/progress" "$ROOT/README.md" "$ROOT/CLAUDE.md" "$ROOT/TASKS.md")

if [[ ! -f "$TERMS" ]]; then
  echo "FAIL: $TERMS not found. Cannot verify. Refusing to pass."
  exit 1
fi

found=0
while IFS= read -r term; do
  [[ -z "$term" || "$term" == \#* ]] && continue
  hits=$(grep -rniI --exclude-dir=.git -- "$term" "${SCAN[@]}" 2>/dev/null || true)
  if [[ -n "$hits" ]]; then
    echo "LEAK: '$term'"
    echo "$hits" | sed 's/^/    /'
    found=1
  fi
done < "$TERMS"

# private/ must be ignored by git
if ! git -C "$ROOT" check-ignore -q private 2>/dev/null; then
  echo "FAIL: private/ is NOT gitignored."
  found=1
fi

# private/ must not be tracked already
if git -C "$ROOT" ls-files --error-unmatch private >/dev/null 2>&1; then
  echo "FAIL: private/ is tracked by git. Run: git rm -r --cached private"
  found=1
fi

if [[ $found -eq 0 ]]; then
  echo "OK — no banned terms in publishable content, private/ is excluded."
else
  echo
  echo "Confidentiality check FAILED. Do not publish."
fi

exit $found

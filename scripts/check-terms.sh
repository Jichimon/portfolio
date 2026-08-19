#!/usr/bin/env bash
# Thin wrapper. The check itself is scripts/guards/gate/check-terms.mjs — ported to Node so
# it runs identically in PowerShell, Git Bash and CI (D6); this file exists so the documented
# command keeps working and so the check has a name someone can remember.
#
# Run before declaring any content task complete. Exit 0 = clean, exit 1 = leak found.

exec node "$(dirname "${BASH_SOURCE[0]}")/guards/gate/check-terms.mjs" "$@"

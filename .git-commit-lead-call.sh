#!/bin/zsh
set -euo pipefail
cd /Users/brandonnkawu/Desktop/DEA/LORO/web
git add app/leads/components/lead-detail-dialog.tsx
git commit -m "$(cat <<'EOF'
Skip PBX on lead Start Call so reps can dial without an extension.

EOF
)"
git status
git log -1 --oneline
git push origin dev-env
git status
git log -1 --oneline
git rev-parse --abbrev-ref HEAD

#!/usr/bin/env bash

set -euo pipefail

required_files=(
  "README.md"
  "AGENTS.md"
  "ARCHITECTURE.md"
  "docs/README.md"
  "docs/design-docs/index.md"
  "docs/design-docs/core-beliefs.md"
  "docs/exec-plans/index.md"
  "docs/exec-plans/active/README.md"
  "docs/exec-plans/completed/README.md"
  "docs/exec-plans/tech-debt-tracker.md"
  "docs/generated/README.md"
  "docs/product-specs/index.md"
  "docs/references/index.md"
  "docs/DESIGN.md"
  "docs/FRONTEND.md"
  "docs/PLANS.md"
  "docs/PRODUCT_SENSE.md"
  "docs/QUALITY_SCORE.md"
  "docs/RELIABILITY.md"
  "docs/SECURITY.md"
  ".github/workflows/repo-hygiene.yml"
)

missing=0

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "missing required file: $file"
    missing=1
  fi
done

if ! grep -q "docs/README.md" AGENTS.md; then
  echo "AGENTS.md must link to docs/README.md"
  missing=1
fi

if ! grep -q "AGENTS.md" README.md; then
  echo "README.md should reference AGENTS.md"
  missing=1
fi

if ! grep -q "tideglass-rss-reader.md" docs/product-specs/index.md; then
  echo "product spec index must reference tideglass-rss-reader.md"
  missing=1
fi

if ! grep -q "tech-debt-tracker.md" docs/exec-plans/index.md; then
  echo "exec plans index must reference tech-debt-tracker.md"
  missing=1
fi

if [[ "$missing" -ne 0 ]]; then
  exit 1
fi

echo "repository documentation checks passed"

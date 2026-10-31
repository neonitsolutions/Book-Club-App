#!/usr/bin/env bash
# Usage: smoke-test.sh https://staging.example.com
set -euo pipefail
BASE=$1

for _ in $(seq 1 10); do
  if curl -fsS "$BASE/api/health" > /dev/null && curl -fsS "$BASE/" > /dev/null; then
    echo "Smoke test passed for $BASE"
    exit 0
  fi
  sleep 6
done

echo "Smoke test FAILED for $BASE" >&2
exit 1

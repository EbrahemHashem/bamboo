#!/usr/bin/env bash
# Run all 11 Bamboo routines with mocked APIs + env vars.

set +e

TESTING_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$TESTING_DIR/scripts"
RESULTS_DIR="$TESTING_DIR/results"
mkdir -p "$RESULTS_DIR"

export PATH="$HOME/bin:$PATH"

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq not found in PATH (expected ~/bin/jq.exe)"
  exit 1
fi

TOTAL=0
PASSED=0
FAILED=0
FAILED_NAMES=()

echo ""
echo "=========================================="
echo "  Bamboo Routines — Mock Test Harness"
echo "=========================================="
echo ""

for script in "$SCRIPTS_DIR"/bm-*.sh; do
  [ -f "$script" ] || continue
  name=$(basename "$script" .sh)
  TOTAL=$((TOTAL + 1))

  log_file="$RESULTS_DIR/$name.log"

  echo -n "Testing $name ... "

  timeout 20 bash -c "
    export PATH=\"\$HOME/bin:\$PATH\"
    source '$TESTING_DIR/mock_env.sh'
    source '$TESTING_DIR/mock_curl.sh'
    bash '$script'
  " > "$log_file" 2>&1
  exit_code=$?

  if [ $exit_code -eq 124 ]; then
    echo "[TIMEOUT after 20s]" >> "$log_file"
  fi

  if [ $exit_code -eq 0 ]; then
    echo "PASS"
    PASSED=$((PASSED + 1))
  else
    echo "FAIL (exit $exit_code)"
    FAILED=$((FAILED + 1))
    FAILED_NAMES+=("$name")
  fi
done

echo ""
echo "=========================================="
echo "  Results: $PASSED/$TOTAL passed"
echo "=========================================="
if [ ${#FAILED_NAMES[@]} -gt 0 ]; then
  echo ""
  echo "Failed routines:"
  for n in "${FAILED_NAMES[@]}"; do
    echo "  - $n"
    echo "    log: $RESULTS_DIR/$n.log"
  done
fi
echo ""

if [ $FAILED -gt 0 ]; then
  exit 1
fi

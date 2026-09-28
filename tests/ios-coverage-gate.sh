#!/usr/bin/env bash
# ==============================================================================
# iOS Logic Coverage Gate (tests/ios-coverage-gate.sh)
#
# Reads an `xcrun xccov view --report --json` export and enforces 100% line
# coverage on the app's LOGIC surface:
#   - every .swift file under Sources/App/Services and Sources/App/Models
#     (derived from the repo tree — xccov reports bare filenames on some
#     Xcode versions and full paths on others, so we match both)
#   - logic-bearing components: AmountFormatter, SyncStatusPresenter
#
# Deliberate exclusions (Fowler/Google: gate critical logic, exclude thin
# glue around system APIs; report everything else for visibility):
#   - KeychainTokenStore.swift  (SecItem glue, exercised via in-memory fake)
#   - ConnectivityMonitor.swift (NWPathMonitor wrapper, needs real path flips)
#   - GlassInputField.swift     (SwiftUI onChange plumbing; its pure clamping
#                                rule is fully unit-tested via clamp())
#
# Usage: ios-coverage-gate.sh <xccov-report.json> [xcresult-path]
# When the gate fails and an xcresult bundle is provided, annotated source
# (with exact uncovered-line markers) is printed for each gap file so the
# missing tests can be written without guesswork.
set -euo pipefail

REPORT="${1:-}"
XCRESULT="${2:-}"
if [ -z "$REPORT" ] || [ ! -f "$REPORT" ]; then
  echo "❌ Usage: $0 <xccov-report.json> [xcresult-path]"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IOS_SRC="$SCRIPT_DIR/../ios/Sources/App"

# Basenames of every logic file, derived from the repo itself.
LOGIC_BASENAMES="$(
  {
    find "$IOS_SRC/Services" "$IOS_SRC/Models" -name '*.swift' -exec basename {} \;
    printf 'AmountFormatter.swift\nSyncStatusPresenter.swift\n'
  } | sort -u
)"

GAP_FILE="$(mktemp)"
export GAP_FILE
set +e
node - "$REPORT" "$LOGIC_BASENAMES" <<'EOF'
const fs = require('fs');

const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const basenames = new Set(process.argv[3].split('\n').filter(Boolean));
const excluded = new Set([
  'KeychainTokenStore.swift',
  'ConnectivityMonitor.swift',
  'GlassInputField.swift',
]);

const targets = report.targets || [];
const appTarget = targets.find((t) => {
  const name = (t.name || '').toLowerCase();
  return name.includes('tekyida') && !name.includes('test');
});
if (!appTarget) {
  console.error(`❌ Could not find the Tekyida app target. Targets seen: ${targets.map((t) => t.name).join(', ') || '(none)'}`);
  process.exit(1);
}

const files = appTarget.files || [];
if (files.length === 0) {
  console.error(`❌ Coverage report target "${appTarget.name}" has no files. Target keys: ${Object.keys(appTarget).join(', ')}`);
  process.exit(1);
}

const isLogic = (name) => {
  const path = name.replace(/\\/g, '/');
  const base = path.split('/').pop();
  if (excluded.has(base)) return false;
  if (basenames.has(base)) return true;
  return path.includes('/Services/') || path.startsWith('Services/') ||
         path.includes('/Models/') || path.startsWith('Models/');
};

const logicFiles = files.filter((f) => isLogic(f.name));
if (logicFiles.length === 0) {
  console.error('❌ No logic files matched. File names seen in the report (first 60):');
  files.slice(0, 60).forEach((f) => console.error(`    ${f.name}`));
  process.exit(1);
}

const gapFile = process.env.GAP_FILE || '';
let covered = 0;
let executable = 0;
const gaps = [];
const gapBasenames = [];
for (const file of logicFiles) {
  covered += file.coveredLines;
  executable += file.executableLines;
  if (file.coveredLines < file.executableLines) {
    gaps.push(`  ✗ ${file.name}: ${file.coveredLines}/${file.executableLines} lines (${(file.lineCoverage * 100).toFixed(2)}%)`);
    gapBasenames.push(file.name.split('/').pop());
  }
}
if (gapFile && gapBasenames.length > 0) {
  fs.writeFileSync(gapFile, gapBasenames.join('\n'));
}

const overall = files.reduce((acc, f) => {
  acc.covered += f.coveredLines;
  acc.executable += f.executableLines;
  return acc;
}, { covered: 0, executable: 0 });

const logicPct = executable === 0 ? 100 : (covered / executable) * 100;
const overallPct = overall.executable === 0 ? 100 : (overall.covered / overall.executable) * 100;

console.log('========================================================');
console.log('                 iOS COVERAGE DASHBOARD                 ');
console.log('========================================================');
console.log(`  Logic surface : ${logicFiles.length} files, ${covered}/${executable} lines → ${logicPct.toFixed(2)}%`);
console.log(`  Whole app     : ${files.length} files → ${overallPct.toFixed(2)}% (reported, not gated)`);
console.log('');

if (gaps.length > 0) {
  console.log('Files below the threshold:');
  gaps.forEach((g) => console.log(g));
  console.log('');
}

if (covered < executable) {
  console.error(`❌ iOS logic coverage gate FAILED: ${logicPct.toFixed(2)}% < 100%`);
  process.exit(1);
}
console.log('✓ iOS logic coverage gate PASSED (100% of logic lines covered).');
EOF
NODE_STATUS=$?
set -e

if [ "$NODE_STATUS" -ne 0 ] && [ -n "$XCRESULT" ] && [ -d "$XCRESULT" ] && [ -s "$GAP_FILE" ]; then
  echo ''
  echo 'Annotated source per gap file (raw xccov output; uncovered lines carry an E marker):'
  while IFS= read -r base; do
    [ -n "$base" ] || continue
    src_path="$(find "$SCRIPT_DIR/../ios/Sources" -name "$base" -print -quit 2>/dev/null || true)"
    if [ -n "$src_path" ]; then
      echo "--- $base ---"
      xcrun xccov view --file "$src_path" "$XCRESULT" | head -500
    else
      echo "--- $base: source file not found ---"
    fi
  done < "$GAP_FILE"
fi
rm -f "$GAP_FILE"
exit "$NODE_STATUS"

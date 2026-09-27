#!/usr/bin/env bash
# ==============================================================================
# iOS Logic Coverage Gate (tests/ios-coverage-gate.sh)
#
# Reads an `xcrun xccov view --report --json` export and enforces 100% line
# coverage on the app's LOGIC surface only:
#   - Sources/App/Services/**   (AppState, backend, offline engine, engines)
#   - Sources/App/Models/**     (Codable contracts)
#   - Logic-bearing components  (AmountFormatter, SyncStatusPresenter,
#                                GlassInputField)
#
# Declarative SwiftUI view bodies and the Keychain glue (KeychainTokenStore)
# are deliberately excluded per the agreed gate design (Fowler/Google: gate
# critical code, report the rest). Overall coverage is printed for visibility.
#
# Usage: ios-coverage-gate.sh <xccov-report.json>
# ==============================================================================
set -euo pipefail

REPORT="${1:-}"
if [ -z "$REPORT" ] || [ ! -f "$REPORT" ]; then
  echo "❌ Usage: $0 <xccov-report.json>"
  exit 1
fi

node - "$REPORT" <<'EOF'
const fs = require('fs');

const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const appTarget = report.targets.find((t) => (t.name || '').startsWith('Tekyida.app') || (t.name || '') === 'Tekyida');
if (!appTarget) {
  console.error('❌ Could not find the Tekyida app target in the coverage report.');
  process.exit(1);
}

// Logic files that MUST be at 100% line coverage.
const logicSuffixes = [
  'Sources/App/Services/',
  'Sources/App/Models/',
  'Sources/App/Components/AmountFormatter.swift',
  'Sources/App/Components/SyncStatusPresenter.swift',
  'Sources/App/Components/GlassInputField.swift',
];
// I/O glue excluded from the logic gate (documented exception).
const excludedSuffixes = [
  'Services/KeychainTokenStore.swift',
];

const isLogic = (name) =>
  logicSuffixes.some((s) => name.includes(s)) &&
  !excludedSuffixes.some((s) => name.includes(s));

const files = appTarget.files || [];
const logicFiles = files.filter((f) => isLogic(f.name));
if (logicFiles.length === 0) {
  console.error('❌ No logic files found in the coverage report — check paths.');
  process.exit(1);
}

let covered = 0;
let executable = 0;
const gaps = [];
for (const file of logicFiles) {
  covered += file.coveredLines;
  executable += file.executableLines;
  if (file.coveredLines < file.executableLines) {
    gaps.push(`  ✗ ${file.name}: ${file.coveredLines}/${file.executableLines} lines (${(file.lineCoverage * 100).toFixed(2)}%)`);
  }
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

#!/usr/bin/env bash
# ==============================================================================
# iOS Logic Coverage Gate (tests/ios-coverage-gate.sh)
#
# Reads an `xcrun xccov view --report --json` export and enforces 100% line
# coverage on the app's LOGIC surface only:
#   - any path segment .../Services/**   (AppState, backend, offline engine)
#   - any path segment .../Models/**     (Codable contracts)
#   - logic-bearing components by file name (AmountFormatter,
#     SyncStatusPresenter, GlassInputField)
#
# Matching is deliberately loose (path-segment + basename) because xccov file
# names vary between project layouts and Xcode versions (absolute, project-
# relative, or source-root-relative). Declarative SwiftUI view bodies and the
# Keychain glue (KeychainTokenStore) are deliberately excluded per the agreed
# gate design (Fowler/Google: gate critical code, report the rest).
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

// Logic files that MUST be at 100% line coverage.
const isLogic = (name) => {
  const path = name.replace(/\\/g, '/');
  if (path.endsWith('KeychainTokenStore.swift')) return false;
  if (path.includes('/Services/') || path.startsWith('Services/')) return true;
  if (path.includes('/Models/') || path.startsWith('Models/')) return true;
  return [
    'AmountFormatter.swift',
    'SyncStatusPresenter.swift',
    'GlassInputField.swift',
  ].some((base) => path === base || path.endsWith('/' + base));
};

const logicFiles = files.filter((f) => isLogic(f.name));
if (logicFiles.length === 0) {
  console.error('❌ No logic files matched. File names seen in the report (first 60):');
  files.slice(0, 60).forEach((f) => console.error(`    ${f.name}`));
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

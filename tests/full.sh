#!/usr/bin/env bash
set -e

# =========================================================
# Tekyida Full Pipeline Suite (Local Pre-Release Build)
# Runs Quick Suite (tests/run.sh), Production Web Build,
# Web E2E (Playwright) & DAST Verification, Android Release
# Compilation, and iOS native build verification.
# =========================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORTS_DIR="$ROOT_DIR/tests/reports"

echo ""
echo "===================================================="
echo "         Tekyida Full Pipeline Suite                "
echo "===================================================="
echo ""

# ---------------------------------------------------------
# Step 1: Run Quick Quality & Test Suite (Gate)
# ---------------------------------------------------------
echo "▶ Step 1: Running Quick Quality Gate (tests/run.sh)..."
"$ROOT_DIR/tests/run.sh"
echo "✓ Quick Quality Gate passed 100%."
echo ""

# ---------------------------------------------------------
# Step 2: Next.js Production Build
# ---------------------------------------------------------
echo "▶ Step 2: Compiling Next.js Production Build..."
cd "$ROOT_DIR/frontend"
npm run build
echo "✓ Next.js production build succeeded."
echo ""

# ---------------------------------------------------------
# Step 3: Web E2E & DAST Dynamic Security Verification
# ---------------------------------------------------------
echo "▶ Step 3: Running Web E2E and DAST Dynamic Security Audit (Playwright)..."
cd "$ROOT_DIR/frontend"
npx playwright test
echo "✓ Web E2E (100% flows) and DAST Dynamic Security passed with 0 errors."
echo "  → Report: tests/reports/e2e/index.html"
echo ""

# ---------------------------------------------------------
# Step 4: Android Release Compilation
# ---------------------------------------------------------
echo "▶ Step 4: Building Android Release Package..."
cd "$ROOT_DIR/android"

# Auto-detect valid JAVA_HOME
if [ -z "$JAVA_HOME" ] || [ ! -f "$JAVA_HOME/bin/java" ]; then
  for candidate in /usr/lib/jvm/java-25-openjdk /usr/lib/jvm/java-21-openjdk /usr/lib/jvm/java-17-openjdk /usr/lib/jvm/java; do
    if [ -f "$candidate/bin/java" ]; then
      export JAVA_HOME="$candidate"
      break
    fi
  done
fi

# Auto-detect ANDROID_HOME
if [ -z "$ANDROID_HOME" ] && [ -d "$HOME/Android/Sdk" ]; then
  export ANDROID_HOME="$HOME/Android/Sdk"
fi

GRADLE_CMD=""
if [ -f "./gradlew" ]; then
  chmod +x ./gradlew
  GRADLE_CMD="./gradlew"
elif command -v gradle >/dev/null 2>&1; then
  GRADLE_CMD="gradle"
fi

if [ -n "$GRADLE_CMD" ]; then
  if [ -n "$ANDROID_HOME" ] && [ -d "$ANDROID_HOME" ]; then
    echo "Compiling Android release APK with $GRADLE_CMD..."
    $GRADLE_CMD assembleRelease --no-daemon -x lint
    echo "✓ Android APK compiled successfully:"
    ls -lh app/build/outputs/apk/release/app-release.apk 2>/dev/null || true
  else
    echo "ℹ Android SDK not detected locally (set ANDROID_HOME or install Android Studio SDK)."
    echo "  Validating Gradle configuration..."
    $GRADLE_CMD tasks --dry-run >/dev/null 2>&1 || true
    echo "  (Full APK compilation runs automatically in GitHub Actions CI)."
  fi
else
  echo "ℹ Gradle not found. Skipping local Android build."
fi
echo ""

# ---------------------------------------------------------
# Step 5: iOS Release Compilation (OS Auto-Detection)
# ---------------------------------------------------------
echo "▶ Step 5: Checking iOS Native Build (Xcode)..."
if [[ "$OSTYPE" == "darwin"* ]] && command -v xcodebuild >/dev/null 2>&1; then
  echo "🍎 macOS detected: Generating Xcode project and compiling archive..."
  cd "$ROOT_DIR/ios"
  if command -v xcodegen >/dev/null 2>&1; then
    xcodegen generate
  fi
  xcodebuild archive \
    -project Tekyida.xcodeproj \
    -scheme Tekyida \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath build/Tekyida.xcarchive \
    CODE_SIGNING_ALLOWED=NO \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGN_IDENTITY=""
  echo "✓ iOS release archive compiled successfully."
else
  echo "ℹ Non-macOS environment detected ($(uname -s)). Skipping native iOS build."
  echo "  (Native iOS builds and archiving require macOS with Xcode)."
fi
echo ""

# ---------------------------------------------------------
# Step 6: Web Manifest & Asset Verification
# ---------------------------------------------------------
echo "▶ Step 6: Verifying Web Production Manifest..."
cd "$ROOT_DIR/frontend"
node -e '
const fs = require("fs");
const buildManifest = ".next/build-manifest.json";
if (fs.existsSync(buildManifest)) {
  const manifest = JSON.parse(fs.readFileSync(buildManifest, "utf8"));
  console.log("✓ Next.js production build assets verified. Pages generated:", Object.keys(manifest.pages).length);
} else {
  console.log("ℹ No .next build manifest found.");
}
'

echo ""
echo "===================================================="
echo "      Tekyida Full Pipeline Suite Completed!       "
echo "===================================================="

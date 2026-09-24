#!/usr/bin/env bash
set -e

# Tekyida Unified Test & Quality Runner
# Centralized in tests/ with all reports saved to tests/reports/

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TESTS_DIR="$ROOT_DIR/tests"
REPORTS_DIR="$TESTS_DIR/reports"
cd "$ROOT_DIR"

BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\n${BOLD}${BLUE}====================================================${NC}"
echo -e "${BOLD}${BLUE}         Tekyida Test & Quality Suite               ${NC}"
echo -e "${BOLD}${BLUE}====================================================${NC}\n"

# Prepare centralized reports directory
mkdir -p "$REPORTS_DIR/duplication" "$REPORTS_DIR/backend" "$REPORTS_DIR/frontend"

# ---------------------------------------------------------
# 1. Duplication Analysis (jscpd)
# ---------------------------------------------------------
echo -e "${BOLD}[1/4] Running Code Duplication Analysis (jscpd)...${NC}"
if npx jscpd --config "$TESTS_DIR/jscpd.json" backend frontend/app frontend/components frontend/hooks frontend/lib ios android; then
  echo -e "${GREEN}✓ Duplication check passed within tolerance.${NC}"
  echo -e "${CYAN}  → Report: tests/reports/duplication/jscpd-report.json${NC}\n"
else
  echo -e "${RED}✗ Duplication check detected excessive clones.${NC}\n"
  exit 1
fi

# ---------------------------------------------------------
# 2. Convex Backend Unit Tests & Coverage
# ---------------------------------------------------------
echo -e "${BOLD}[2/4] Running Convex Backend Tests & Coverage (Vitest)...${NC}"
cd "$ROOT_DIR/backend"
if npx vitest run --coverage; then
  echo -e "${GREEN}✓ Backend tests and coverage passed successfully.${NC}"
  echo -e "${CYAN}  → Report: tests/reports/backend/index.html${NC}\n"
else
  echo -e "${RED}✗ Backend tests failed or did not meet coverage thresholds.${NC}\n"
  exit 1
fi

# ---------------------------------------------------------
# 3. Frontend Unit Tests & Coverage
# ---------------------------------------------------------
echo -e "${BOLD}[3/4] Running Frontend Tests & Coverage (Vitest)...${NC}"
cd "$ROOT_DIR/frontend"
if npx vitest run --coverage; then
  echo -e "${GREEN}✓ Frontend tests and coverage passed successfully.${NC}"
  echo -e "${CYAN}  → Report: tests/reports/frontend/index.html${NC}\n"
else
  echo -e "${RED}✗ Frontend tests failed or did not meet coverage thresholds.${NC}\n"
  exit 1
fi

# ---------------------------------------------------------
# 4. iOS Unit Tests
# ---------------------------------------------------------
echo -e "${BOLD}[4/4] Checking iOS Unit Tests (TekyidaTests)...${NC}"
cd "$ROOT_DIR/ios"
if command -v xcodebuild >/dev/null 2>&1 && [[ "$(uname)" == "Darwin" ]]; then
  echo "Running iOS tests with xcodebuild on macOS..."
  if command -v xcodegen >/dev/null 2>&1; then
    xcodegen generate
  fi
  xcodebuild test -project Tekyida.xcodeproj -scheme TekyidaTests -destination 'platform=iOS Simulator,name=iPhone 16'
  echo -e "${GREEN}✓ iOS unit tests passed.${NC}\n"
else
  echo -e "${YELLOW}ℹ Skipping native iOS test execution (macOS/Xcode not detected on this host).${NC}"
  echo -e "${YELLOW}  iOS tests are located in ios/Tests/TekyidaTests/TekyidaTests.swift and will execute on macOS / CI.${NC}\n"
fi

# ---------------------------------------------------------
# Summary
# ---------------------------------------------------------
echo -e "${BOLD}${GREEN}====================================================${NC}"
echo -e "${BOLD}${GREEN}       ALL TESTS & QUALITY CHECKS COMPLETED!        ${NC}"
echo -e "${BOLD}${GREEN}====================================================${NC}"
echo -e "${BOLD}Centralized Reports Location: tests/reports/${NC}"
echo -e "  • Duplication: tests/reports/duplication/jscpd-report.json"
echo -e "  • Backend Coverage: tests/reports/backend/index.html"
echo -e "  • Frontend Coverage: tests/reports/frontend/index.html\n"

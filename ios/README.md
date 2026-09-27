# iOS App

Native iOS application for Tekyida built with SwiftUI.

## Structure

```text
ios/
├── Sources/
│   └── App/
│       ├── Assets.xcassets/
│       ├── ContentView.swift
│       ├── Info.plist
│       └── TekyidaApp.swift
└── project.yml            # XcodeGen configuration
```

## Opening & Building

1. Ensure Xcode and [XcodeGen](https://github.com/yonaskolb/XcodeGen) are installed on your Mac:
   ```bash
   brew install xcodegen
   ```
2. Generate the Xcode project:
   ```bash
   cd ios
   xcodegen generate
   ```
3. Open `Tekyida.xcodeproj` in Xcode:
   ```bash
   open Tekyida.xcodeproj
   ```

## Testing

Unit tests use [Swift Testing](https://developer.apple.com/xcode/swift-testing/) (`import Testing`);
UI automation tests use XCTest/XCUITest (the only framework Apple provides for UI automation).

```bash
cd ios
xcodegen generate
xcodebuild test -project Tekyida.xcodeproj -scheme Tekyida \
  -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
  -enableCodeCoverage YES -resultBundlePath build/TekyidaTests.xcresult
xcrun xccov view --report build/TekyidaTests.xcresult
```

- `Tests/TekyidaTests/` — unit tests grouped by feature; `TestSupport/` holds shared
  fakes (`MockBackend`, `URLProtocolStub`, `InMemoryTokenStore`) and isolated-fixture
  helpers (temp `OfflineCache` directories, private `UserDefaults` suites).
- `Tests/TekyidaUITests/` — launch smoke tests.
- The quality suite (`tests/run.sh`) and CI enforce a **100% line-coverage gate on the
  logic surface** (`Services/`, `Models/`, logic-bearing components) via
  `tests/ios-coverage-gate.sh`; declarative view bodies are smoke-tested and reported
  but not gated. iOS tests run on `main` only (fast-track CI on feature branches).

## CI/CD

An automated GitHub Actions workflow is located at `.github/workflows/build.yml` to compile unsigned IPAs and publish releases.

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
│       └── iOSApp.swift
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
3. Open `MyiOSApp.xcodeproj` in Xcode:
   ```bash
   open MyiOSApp.xcodeproj
   ```

## CI/CD

An automated GitHub Actions workflow is located at `.github/workflows/build.yml` to compile unsigned IPAs and publish releases.

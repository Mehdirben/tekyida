# Android App

Native Android application for Tekyida built with Kotlin & Jetpack Compose.

## Structure

```text
android/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/tekyida/MainActivity.kt
│       └── res/values/strings.xml
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```

## Opening & Building

1. Open Android Studio.
2. Select **Open** and choose the `android/` directory.
3. Let Gradle sync project dependencies.
4. Run on an Android Emulator or physical device.

## Connecting to Backend

Use the [Convex Kotlin SDK](https://github.com/get-convex/convex-kotlin) to interact with the backend:
```kotlin
val client = ConvexClient(BuildConfig.CONVEX_URL)
```

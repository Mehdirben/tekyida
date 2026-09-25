package com.tekyida

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class AndroidSecurityTest {

    @Test
    fun testManifestSecurityConfiguration() {
        val manifestFile = File("src/main/AndroidManifest.xml")
        assertTrue("AndroidManifest.xml must exist", manifestFile.exists())

        val content = manifestFile.readText()

        // Verify cleartext HTTP traffic is not globally permitted
        assertFalse(
            "Cleartext HTTP traffic must not be explicitly allowed",
            content.contains("android:usesCleartextTraffic=\"true\"")
        )

        // Verify package identifier
        assertTrue(
            "Manifest must declare com.tekyida package or activity",
            content.contains(".MainActivity")
        )
    }

    @Test
    fun testPermissionsMinimalFootprint() {
        val manifestFile = File("src/main/AndroidManifest.xml")
        val content = manifestFile.readText()

        // Verify dangerous high-risk permissions are not requested
        assertFalse(content.contains("android.permission.READ_SMS"))
        assertFalse(content.contains("android.permission.READ_CONTACTS"))
        assertFalse(content.contains("android.permission.RECORD_AUDIO"))
    }
}

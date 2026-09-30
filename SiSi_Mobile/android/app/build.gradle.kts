import java.util.Properties

plugins {
    id("com.android.application")
    id("dev.flutter.flutter-gradle-plugin")
}

val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

val keystoreProperties = Properties()
val keystorePropertiesFile = rootProject.file("key.properties")
var signingPropertiesReadError: String? = null
if (keystorePropertiesFile.exists()) {
    try {
        keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
    } catch (_: Exception) {
        // A local release-signing setup must not prevent building an unsigned
        // debug APK. A release task reports this configuration error below.
        signingPropertiesReadError = "Release signing configuration could not be read."
    }
}
val requiredSigningKeys = listOf("keyAlias", "keyPassword", "storeFile", "storePassword")
val missingSigningKeys = requiredSigningKeys.filter { keystoreProperties.getProperty(it).isNullOrBlank() }
val signingStoreFile = keystoreProperties.getProperty("storeFile")
    ?.takeIf { it.isNotBlank() }
    ?.let { rootProject.file(it) }
val hasReleaseSigning = keystorePropertiesFile.isFile &&
    signingPropertiesReadError == null &&
    missingSigningKeys.isEmpty() &&
    signingStoreFile?.isFile == true

// Never allow a release artifact to silently fall back to unsigned output.
// Keep all signing validation behind a release task so debug builds do not
// depend on a developer's local release keystore.
gradle.taskGraph.whenReady {
    val releaseRequested = allTasks.any { it.name.contains("Release", ignoreCase = true) }
    if (releaseRequested) {
        when {
            !keystorePropertiesFile.isFile ->
                error("Release signing is required. Provide a complete key.properties and keystore outside the repository.")
            signingPropertiesReadError != null ->
                error(signingPropertiesReadError!!)
            missingSigningKeys.isNotEmpty() ->
                error("Release signing configuration is incomplete. Missing: ${missingSigningKeys.joinToString(", ")}")
            signingStoreFile?.isFile != true ->
                error("Release signing keystore does not exist at the configured storeFile")
        }
    }
}

android {
    namespace = "id.co.ulptoboali.sisi"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        applicationId = "id.co.ulptoboali.sisi"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
        manifestPlaceholders["MAPS_API_KEY"] = localProperties.getProperty("MAPS_API_KEY", "")
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("release") {
                keyAlias = keystoreProperties.getProperty("keyAlias")
                keyPassword = keystoreProperties.getProperty("keyPassword")
                storeFile = signingStoreFile!!
                storePassword = keystoreProperties.getProperty("storePassword")
            }
        }
    }

    buildTypes {
        release {
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}

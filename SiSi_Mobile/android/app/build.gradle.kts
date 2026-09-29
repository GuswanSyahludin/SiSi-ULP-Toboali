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
val requiredSigningKeys = listOf("keyAlias", "keyPassword", "storeFile", "storePassword")
val hasReleaseSigning = keystorePropertiesFile.exists()
if (hasReleaseSigning) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
    val missingSigningKeys = requiredSigningKeys.filter { keystoreProperties.getProperty(it).isNullOrBlank() }
    require(missingSigningKeys.isEmpty()) {
        "Release signing configuration is incomplete. Missing: ${missingSigningKeys.joinToString(", ")}"
    }
    require(rootProject.file(keystoreProperties.getProperty("storeFile")).isFile) {
        "Release signing keystore does not exist at the configured storeFile"
    }
}

// Never allow a release artifact to silently fall back to unsigned output.
gradle.taskGraph.whenReady {
    val releaseRequested = allTasks.any { it.name.contains("Release", ignoreCase = true) }
    if (releaseRequested && !hasReleaseSigning) {
        error("Release signing is required. Provide a complete key.properties and keystore outside the repository.")
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
                storeFile = file(keystoreProperties.getProperty("storeFile"))
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

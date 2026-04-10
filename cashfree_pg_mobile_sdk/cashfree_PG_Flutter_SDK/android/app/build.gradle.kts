plugins {
    id("com.android.application")
    id("kotlin-android")
    id("dev.flutter.flutter-gradle-plugin")
}

android {
    namespace = "com.example.cashfreefl.cashfree_fl_integration"
    compileSdk = flutter.compileSdkVersion

    // ✅ Correct NDK version assignment
    ndkVersion = "27.0.12077973"

    defaultConfig {
        applicationId = "com.example.cashfreefl.cashfree_fl_integration"
        minSdk = 23  // Ensure it's 23 or above due to androidx.security
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("debug")
        }
    }
}

flutter {
    source = "../.."
}

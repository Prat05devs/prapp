const { withAppBuildGradle } = require('expo/config-plugins');

// Signs Android release builds (APK + AAB) with the NewsVio upload key instead of the template's
// debug key. The keystore and passwords never live in the repo: Gradle reads them from
// ~/.gradle/gradle.properties (NEWSVIO_UPLOAD_*). Without them, release builds fail rather than
// silently falling back to the debug key.
const SIGNING = `
        release {
            if (!project.hasProperty('NEWSVIO_UPLOAD_STORE_FILE')) {
                throw new GradleException('Set NEWSVIO_UPLOAD_* in ~/.gradle/gradle.properties to sign release builds')
            }
            storeFile file(NEWSVIO_UPLOAD_STORE_FILE)
            storePassword NEWSVIO_UPLOAD_STORE_PASSWORD
            keyAlias NEWSVIO_UPLOAD_KEY_ALIAS
            keyPassword NEWSVIO_UPLOAD_KEY_PASSWORD
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (!gradle.includes('NEWSVIO_UPLOAD_STORE_FILE')) {
      gradle = gradle.replace(/(signingConfigs \{\n\s*debug \{[^}]*\})/, `$1${SIGNING}`);
      gradle = gradle.replace(
        /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/,
        '$1signingConfig signingConfigs.release',
      );
      if (!gradle.includes('signingConfig signingConfigs.release')) {
        throw new Error('with-release-signing: build.gradle template changed, update the plugin');
      }
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
};

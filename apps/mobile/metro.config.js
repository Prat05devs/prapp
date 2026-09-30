const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// inlineRem 16 matches the web app's rem (React Native Reusables' recommended setting).
module.exports = withNativeWind(config, { input: './global.css', inlineRem: 16 });

const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro's package "exports" resolution picks zustand's ESM build for the web
// platform (it only auto-adds the "react-native" export condition for
// native platforms), and that build contains raw `import.meta.env` checks —
// a SyntaxError outside a `type="module"` script, which is how Expo serves
// the web bundle. Disabling package-exports resolution falls back to the
// classic "main" field (zustand's plain CJS build), which has none of that.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;

const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// On Windows with hoisted node_modules Metro may try to resolve some Expo deps
// as if they were installed under `node_modules/expo/node_modules/...`,
// which breaks asset lookup (e.g. @expo/vector-icons font files).
// Force resolution from the app's top-level node_modules.
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  // Prefer app-level deps first
  path.resolve(__dirname, 'node_modules'),
  // But allow Expo's nested deps too (some aren't hoisted on Windows)
  path.resolve(__dirname, 'node_modules', 'expo', 'node_modules'),
];

module.exports = config;


// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Add workspace support
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Configure asset handling
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

// Add support for Node.js modules
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
    'web-streams-polyfill': path.resolve(__dirname, 'node_modules/web-streams-polyfill'),
    'process': path.resolve(__dirname, 'node_modules/process/browser.js'),
    'util': path.resolve(__dirname, 'node_modules/util/util.js'),
    'events': path.resolve(__dirname, 'node_modules/events/events.js'),
    'stream': path.resolve(__dirname, 'node_modules/stream-browserify/index.js'),
    'buffer': path.resolve(__dirname, 'node_modules/buffer/index.js'),
    'crypto': path.resolve(__dirname, 'node_modules/crypto-browserify/index.js'),
  },
  assetExts: [...config.resolver.assetExts, 'db', 'sqlite', 'cjs'],
  sourceExts: [...config.resolver.sourceExts, 'mjs'],
};

module.exports = config; 
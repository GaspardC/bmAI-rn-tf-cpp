/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

// module.exports = {
//   transformer: {
//     getTransformOptions: async () => ({
//       transform: {
//         experimentalImportSupport: false,
//         inlineRequires: false,
//       },
//     }),
//   },
// };

const blacklist = require('metro-config/src/defaults/blacklist');
const {getDefaultConfig} = require('metro-config');
module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();
  const {assetExts} = defaultConfig.resolver;
  return {
    resolver: {
      // Add bin to assetExts
      assetExts: [...assetExts, 'txt', 'jpg', 'bin'],
      sourceExts: ['js', 'json', 'ts', 'tsx', 'jsx'],
      blacklistRE: blacklist([/platform_node/]),
    },
    transform: {
      experimentalImportSupport: false,
      inlineRequires: false,
    },
  };
})();

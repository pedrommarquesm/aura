// `babel-preset-expo` is an explicit devDependency even though `expo` already depends on
// it: npm installs it nested under `expo/node_modules`, and Babel resolves preset names
// from the project root, so without the top-level entry this config cannot find it.
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      // `jsxImportSource: 'nativewind'` is what gives every RN element a `className` prop.
      // `worklets: true` keeps babel-preset-expo's automatic `react-native-worklets/plugin`
      // injection on — that is the Reanimated 4 Babel plugin, and Reanimated silently
      // degrades to JS-thread animations without it.
      ['babel-preset-expo', { jsxImportSource: 'nativewind', worklets: true }],
      'nativewind/babel',
    ],
  };
};

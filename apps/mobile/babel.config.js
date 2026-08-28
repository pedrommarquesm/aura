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

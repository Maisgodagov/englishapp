module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
          alias: {
            '@core': './src/core',
            '@entities': './src/entities',
            '@features': './src/features',
            '@shared': './src/shared',
          },
        },
      ],
      'react-native-reanimated/plugin', // Должен быть последним!
    ],
  };
};


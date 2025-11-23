module.exports = ({ config }) => {
  return {
    ...config,
    plugins: [
      ...(config.plugins || []),
      'expo-sqlite',
    ],
    extra: {
      ...config.extra,
      // Read API URL from environment variable during build
      // This allows eas.json env vars to be accessible at runtime via Constants.expoConfig.extra
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || config.extra?.EXPO_PUBLIC_API_URL || 'https://api.slothary.ru/api',
    },
  };
};

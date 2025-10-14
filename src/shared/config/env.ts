export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api',
  enableMockApi: process.env.EXPO_PUBLIC_USE_MOCKS === 'true',
};



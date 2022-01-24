// @ts-nocheck
export const isProduction = import.meta.env.PROD;

const useMocks = import.meta.env.VITE_ENABLE_MOCKS === 'true';
const apiUrl = String(import.meta.env.VITE_PUBLIC_API_URL ?? '');

export const EnvConfig = {
  dev: import.meta.env.DEV,
  prod: import.meta.env.PROD,
  graphqlEndpoint: apiUrl,
  useMocks,
};

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN as
  | string
  | undefined;

export function resolveBackendOrigin() {
  if (backendOrigin && backendOrigin.trim()) {
    return backendOrigin.trim().replace(/\/$/, '');
  }
  if (location.port === '3847') {
    return location.origin;
  }
  return null;
}

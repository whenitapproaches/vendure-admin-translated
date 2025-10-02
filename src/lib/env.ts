// Env accessors for client-side Vite variables
// Ensure vite-env types are available via src/vite-env.d.ts

export const ADMIN_SECRET: string | undefined = import.meta.env.VITE_ADMIN_SECRET as
  | string
  | undefined;

export const STOREFRONT_URL: string | undefined = import.meta.env.VITE_STOREFRONT_URL as
  | string
  | undefined;

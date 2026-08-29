const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL;
const serverBase = process.env.API_BASE_URL;

export const apiConfig = {
  /**
   * Browser calls. Inlined at build time.
   */
  publicBaseUrl: (publicBase && publicBase.length > 0
    ? publicBase
    : "https://api.aurarankd.com"
  ).replace(/\/$/, ""),
  /**
   * Server-side NextAuth callbacks. Falls back to the public URL so a
   * local clone only has to set one variable.
   */
  serverBaseUrl: (serverBase && serverBase.length > 0
    ? serverBase
    : publicBase && publicBase.length > 0
      ? publicBase
      : "https://api.aurarankd.com"
  ).replace(/\/$/, ""),
} as const;

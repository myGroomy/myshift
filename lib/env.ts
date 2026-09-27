// Runtime environment validation. Deliberately lazy (validated on read, never at module
// load) so a missing value cannot break `next build`, and dependency-free (no zod) so
// nothing extra is needed at runtime.
export type ServerEnv = { MYSHIFT_API_KEY: string };

export function getEnv(): ServerEnv {
  const apiKey = process.env.MYSHIFT_API_KEY;
  if (!apiKey || apiKey.length < 32) {
    throw new Error("MYSHIFT_API_KEY must be configured with at least 32 characters (see .env.example)");
  }
  return { MYSHIFT_API_KEY: apiKey };
}

export default getEnv;

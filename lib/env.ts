import { z } from "zod";

const env = z.object({
  MYSHIFT_API_KEY: z.string().min(32, "MYSHIFT_API_KEY must be at least 32 characters"),
});

export const validatedEnv = env.parse(process.env);
export default env;
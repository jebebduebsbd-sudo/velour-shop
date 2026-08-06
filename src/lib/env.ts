import { z } from "zod";

/**
 * Server-side environment validation.
 *
 * This module must never be imported from client components. Client-exposed
 * configuration (none yet) must use a separate schema and the NEXT_PUBLIC_
 * prefix; server secrets must never be serialized to the client.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  APP_ORIGIN: z.string().url().default("http://localhost:3000"),
  /**
   * 32-byte base64 master key for deliverable encryption. Optional until the
   * delivery phase, but validated for shape whenever present.
   */
  DELIVERY_MASTER_KEY_B64: z
    .string()
    .refine(
      (value) => {
        try {
          return Buffer.from(value, "base64").length === 32;
        } catch {
          return false;
        }
      },
      { message: "DELIVERY_MASTER_KEY_B64 must decode to exactly 32 bytes" },
    )
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) {
    const parsed = serverEnvSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      throw new Error(`Invalid server environment: ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

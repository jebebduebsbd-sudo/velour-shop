import { config } from "dotenv";

/**
 * Test environment bootstrap.
 *
 * Loads .env, then forces the dedicated test database so integration tests
 * never write to the development dataset. Secrets are fixed values here so
 * hash-derived assertions are stable across runs.
 */
config({ quiet: true });

process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://velour:velour_dev@localhost:5432/velour_test";
process.env.APP_ORIGIN ??= "http://localhost:3000";
process.env.SESSION_SECRET ??=
  "velour-test-session-secret-value-000000000000";
process.env.EMAIL_TOKEN_PEPPER ??= "velour-test-email-pepper";

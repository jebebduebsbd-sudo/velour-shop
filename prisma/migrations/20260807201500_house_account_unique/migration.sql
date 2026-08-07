-- House ledger accounts have a NULL userId, and Postgres treats NULLs as
-- distinct in the composite unique index, so it would not prevent duplicate
-- house accounts. This partial unique index guarantees exactly one house
-- account per (kind, currency).
CREATE UNIQUE INDEX "LedgerAccount_house_unique"
  ON "LedgerAccount" ("kind", "currency")
  WHERE "userId" IS NULL;

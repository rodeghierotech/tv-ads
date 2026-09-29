ALTER TABLE "tv" ADD COLUMN "device_token_hash" text;
--> statement-breakpoint
CREATE TABLE "player_rate_limit" (
  "key" text PRIMARY KEY NOT NULL,
  "count" integer NOT NULL,
  "expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "player_rate_limit_expires_at_idx" ON "player_rate_limit" ("expires_at");
--> statement-breakpoint
ALTER TABLE "account" ADD COLUMN IF NOT EXISTS "issuer" text;
--> statement-breakpoint
UPDATE "account" SET "issuer" = 'local:credential' WHERE "issuer" IS NULL AND "provider_id" = 'credential';
--> statement-breakpoint
-- Unknown providers require an explicit issuer mapping; never guess account identity.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "account" WHERE "issuer" IS NULL) THEN
    RAISE EXCEPTION 'Contas sem issuer: revise provedores antes de continuar a migration.';
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;

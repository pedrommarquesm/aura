ALTER TYPE "auth_provider" ADD VALUE IF NOT EXISTS 'password';--> statement-breakpoint
ALTER TABLE "auth_identities" ADD COLUMN "password_hash" text;

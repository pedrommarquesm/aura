ALTER TABLE "waitlist_entries" ADD COLUMN "referral_credited_at" timestamp with time zone;
--> statement-breakpoint
-- Staging already paid referrers at join. Mark those joiners so the first
-- real signup does not pay the same referral again.
UPDATE "waitlist_entries"
SET "referral_credited_at" = "created_at"
WHERE "referred_by_id" IS NOT NULL;

CREATE TABLE "waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"email" varchar(320) NOT NULL,
	"referral_code" varchar(12) NOT NULL,
	"referred_by_id" text,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"aura" bigint DEFAULT 0 NOT NULL,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"claimed_user_id" text,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_outbox" (
	"id" text PRIMARY KEY NOT NULL,
	"to_email" varchar(320) NOT NULL,
	"template" varchar(40) NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"subject" varchar(200) NOT NULL,
	"text_body" text NOT NULL,
	"html_body" text NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(80) NOT NULL,
	"email" varchar(320) NOT NULL,
	"message" text NOT NULL,
	"locale" varchar(10) DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_claimed_user_id_users_id_fk" FOREIGN KEY ("claimed_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_referred_by_id_waitlist_entries_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."waitlist_entries"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_email_lower_idx" ON "waitlist_entries" USING btree (lower("email"));
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_referral_code_idx" ON "waitlist_entries" USING btree ("referral_code");
--> statement-breakpoint
CREATE UNIQUE INDEX "waitlist_entries_claimed_user_idx" ON "waitlist_entries" USING btree ("claimed_user_id");
--> statement-breakpoint
CREATE INDEX "waitlist_entries_referred_by_idx" ON "waitlist_entries" USING btree ("referred_by_id");
--> statement-breakpoint
CREATE INDEX "email_outbox_status_idx" ON "email_outbox" USING btree ("status","created_at");
--> statement-breakpoint
CREATE INDEX "email_outbox_to_idx" ON "email_outbox" USING btree ("to_email","created_at");
--> statement-breakpoint
CREATE INDEX "contact_messages_created_idx" ON "contact_messages" USING btree ("created_at");

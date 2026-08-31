CREATE TABLE "post_hashtags" (
	"post_id" text NOT NULL,
	"tag" text NOT NULL,
	CONSTRAINT "post_hashtags_post_id_tag_pk" PRIMARY KEY("post_id","tag")
);
--> statement-breakpoint
ALTER TABLE "post_hashtags" ADD CONSTRAINT "post_hashtags_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_hashtags_tag_idx" ON "post_hashtags" USING btree ("tag");--> statement-breakpoint
INSERT INTO "post_hashtags" ("post_id", "tag")
SELECT p.id, lower(m[1])
FROM "posts" p
CROSS JOIN LATERAL regexp_matches(coalesce(p.caption, ''), '#([A-Za-z0-9_]{1,64})', 'g') AS m
ON CONFLICT DO NOTHING;

CREATE TABLE "tv_schedule" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tv_id" uuid NOT NULL,
  "playlist_id" uuid NOT NULL,
  "name" text NOT NULL,
  "days" integer[] NOT NULL,
  "start_minute" integer NOT NULL,
  "end_minute" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "tv_schedule_tv_id_tv_id_fk" FOREIGN KEY ("tv_id") REFERENCES "tv"("id") ON DELETE CASCADE,
  CONSTRAINT "tv_schedule_playlist_id_playlist_id_fk" FOREIGN KEY ("playlist_id") REFERENCES "playlist"("id") ON DELETE CASCADE,
  CONSTRAINT "tv_schedule_minutes_check" CHECK ("start_minute" >= 0 AND "start_minute" < "end_minute" AND "end_minute" <= 1440),
  CONSTRAINT "tv_schedule_days_check" CHECK (cardinality("days") BETWEEN 1 AND 7 AND "days" <@ ARRAY[0,1,2,3,4,5,6]::integer[] AND array_position("days", NULL) IS NULL)
);
--> statement-breakpoint
CREATE INDEX "tv_schedule_tv_id_idx" ON "tv_schedule" USING btree ("tv_id");

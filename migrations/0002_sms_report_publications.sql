CREATE TABLE IF NOT EXISTS "sms_report_publications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" varchar NOT NULL,
	"scope_type" varchar(30) NOT NULL,
	"academic_year_id" varchar,
	"term_id" varchar,
	"exam_id" varchar,
	"class_id" varchar,
	"student_id" varchar,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sms_report_publications" ADD CONSTRAINT "sms_report_publications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sms_report_publications" ADD CONSTRAINT "sms_report_publications_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sms_report_publications" ADD CONSTRAINT "sms_report_publications_term_id_academic_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."academic_terms"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sms_report_publications" ADD CONSTRAINT "sms_report_publications_exam_id_sms_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."sms_exams"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sms_report_publications" ADD CONSTRAINT "sms_report_publications_class_id_school_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."school_classes"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sms_report_publications" ADD CONSTRAINT "sms_report_publications_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "sms_report_publications" ADD CONSTRAINT "sms_report_publications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

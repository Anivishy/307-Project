CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "display_name" VARCHAR(120),
    "allergies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "medical_restrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "never_include_ingredient_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

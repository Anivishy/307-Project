ALTER TABLE "groups"
ADD COLUMN "allow_missing_ingredients" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "staples_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "custom_staples" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

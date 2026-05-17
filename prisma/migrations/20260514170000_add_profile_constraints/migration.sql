ALTER TABLE "profiles"
  ADD COLUMN "allergies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "medical_restrictions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "never_include_ingredient_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

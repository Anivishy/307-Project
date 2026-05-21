ALTER TABLE "ingredients"
ADD COLUMN "canonical_ingredient_id" VARCHAR(80);

CREATE INDEX "ingredients_canonical_ingredient_id_idx"
ON "ingredients"("canonical_ingredient_id");

ALTER TABLE "groups"
ADD COLUMN "pantry_snapshot_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "active_bundle_version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "selected_bundle_id" VARCHAR(120);

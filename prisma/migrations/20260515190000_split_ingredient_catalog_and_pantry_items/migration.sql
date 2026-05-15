-- CreateTable
CREATE TABLE "ingredient_catalog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "category" VARCHAR(80),
    "default_unit" VARCHAR(40) NOT NULL,
    "allowed_units" TEXT[] NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingredient_catalog_pkey" PRIMARY KEY ("id")
);

-- Backfill catalog rows from existing pantry ingredient names before renaming
-- the user-owned rows. Existing free-text names become catalog entries.
INSERT INTO "ingredient_catalog" (
    "id",
    "name",
    "category",
    "default_unit",
    "allowed_units",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    "name",
    NULL,
    COALESCE(
        (ARRAY_AGG(DISTINCT NULLIF("unit", '') ORDER BY NULLIF("unit", '')) FILTER (WHERE NULLIF("unit", '') IS NOT NULL))[1],
        'unit'
    ),
    COALESCE(
        ARRAY_AGG(DISTINCT NULLIF("unit", '') ORDER BY NULLIF("unit", '')) FILTER (WHERE NULLIF("unit", '') IS NOT NULL),
        ARRAY['unit']::TEXT[]
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "ingredients"
GROUP BY "name";

-- Seed a small MVP catalog so a fresh database has useful dropdown data.
INSERT INTO "ingredient_catalog" ("name", "category", "default_unit", "allowed_units", "updated_at")
VALUES
    ('Olive oil', 'pantry', 'tbsp', ARRAY['tbsp', 'tsp', 'cups', 'ml']::TEXT[], CURRENT_TIMESTAMP),
    ('Butter', 'dairy', 'tbsp', ARRAY['tbsp', 'sticks', 'grams']::TEXT[], CURRENT_TIMESTAMP),
    ('Salt', 'pantry', 'tsp', ARRAY['tsp', 'tbsp', 'grams']::TEXT[], CURRENT_TIMESTAMP),
    ('Pepper', 'pantry', 'tsp', ARRAY['tsp', 'tbsp', 'grams']::TEXT[], CURRENT_TIMESTAMP),
    ('Tomatoes', 'produce', 'whole', ARRAY['whole', 'cups', 'grams']::TEXT[], CURRENT_TIMESTAMP),
    ('Garlic', 'produce', 'cloves', ARRAY['cloves', 'tsp', 'tbsp', 'grams']::TEXT[], CURRENT_TIMESTAMP),
    ('Pasta', 'pantry', 'boxes', ARRAY['boxes', 'grams', 'servings']::TEXT[], CURRENT_TIMESTAMP),
    ('Chicken fillets', 'protein', 'fillets', ARRAY['fillets', 'lbs', 'grams']::TEXT[], CURRENT_TIMESTAMP),
    ('Mushrooms', 'produce', 'cups', ARRAY['cups', 'whole', 'grams']::TEXT[], CURRENT_TIMESTAMP),
    ('Cream', 'dairy', 'cups', ARRAY['cups', 'ml']::TEXT[], CURRENT_TIMESTAMP),
    ('Bread loaf', 'bakery', 'loaf', ARRAY['loaf', 'slices']::TEXT[], CURRENT_TIMESTAMP),
    ('Basil leaves', 'produce', 'leaves', ARRAY['leaves', 'grams']::TEXT[], CURRENT_TIMESTAMP),
    ('Fresh thyme', 'produce', 'sprigs', ARRAY['sprigs', 'tsp', 'tbsp']::TEXT[], CURRENT_TIMESTAMP),
    ('Saffron threads', 'spice', 'tsp', ARRAY['tsp', 'tbsp', 'grams']::TEXT[], CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;

-- CreateTable
CREATE TABLE "pantry_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "ingredient_catalog_id" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" VARCHAR(40) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pantry_items_pkey" PRIMARY KEY ("id")
);

-- Copy existing user pantry rows into the new pantry table.
INSERT INTO "pantry_items" (
    "id",
    "owner_id",
    "ingredient_catalog_id",
    "quantity",
    "unit",
    "notes",
    "created_at",
    "updated_at"
)
SELECT
    existing."id",
    existing."owner_id",
    catalog."id",
    COALESCE(existing."quantity", 0),
    COALESCE(NULLIF(existing."unit", ''), catalog."default_unit"),
    existing."notes",
    existing."created_at",
    existing."updated_at"
FROM "ingredients" existing
JOIN "ingredient_catalog" catalog ON catalog."name" = existing."name";

-- Drop old pantry table after backfill.
DROP TABLE "ingredients";

-- CreateIndex
CREATE UNIQUE INDEX "ingredient_catalog_name_key" ON "ingredient_catalog"("name");

-- CreateIndex
CREATE INDEX "pantry_items_owner_id_idx" ON "pantry_items"("owner_id");

-- CreateIndex
CREATE INDEX "pantry_items_ingredient_catalog_id_idx" ON "pantry_items"("ingredient_catalog_id");

-- CreateIndex
CREATE UNIQUE INDEX "pantry_items_owner_id_ingredient_catalog_id_unit_key" ON "pantry_items"("owner_id", "ingredient_catalog_id", "unit");

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_ingredient_catalog_id_fkey" FOREIGN KEY ("ingredient_catalog_id") REFERENCES "ingredient_catalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- EnableRLS
ALTER TABLE "ingredient_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pantry_items" ENABLE ROW LEVEL SECURITY;

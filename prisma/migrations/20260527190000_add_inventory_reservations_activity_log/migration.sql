CREATE TYPE "ActivityEventType" AS ENUM (
  'bundleSelection',
  'adminPantryEdit',
  'softPreferenceOverride'
);

ALTER TABLE "ingredients"
  ADD COLUMN "available_quantity" DECIMAL(10, 2),
  ADD COLUMN "last_updated_by" VARCHAR(80),
  ADD COLUMN "last_updated_at" TIMESTAMPTZ(6);

UPDATE "ingredients"
SET "available_quantity" = "quantity"
WHERE "available_quantity" IS NULL;

CREATE TABLE "inventory_reservations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pantry_item_id" UUID NOT NULL,
  "bundle_id" VARCHAR(120) NOT NULL,
  "reserved_quantity" DECIMAL(10, 2) NOT NULL,
  "unit" VARCHAR(40) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_reservations_pantry_item_id_fkey"
    FOREIGN KEY ("pantry_item_id")
    REFERENCES "ingredients"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX "inventory_reservations_pantry_item_id_idx"
  ON "inventory_reservations"("pantry_item_id");

CREATE INDEX "inventory_reservations_bundle_id_idx"
  ON "inventory_reservations"("bundle_id");

CREATE TABLE "activity_log_entries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "group_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "event_type" "ActivityEventType" NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "activity_log_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "activity_log_entries_group_id_fkey"
    FOREIGN KEY ("group_id")
    REFERENCES "groups"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT "activity_log_entries_actor_id_fkey"
    FOREIGN KEY ("actor_id")
    REFERENCES "profiles"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX "activity_log_entries_group_id_created_at_idx"
  ON "activity_log_entries"("group_id", "created_at");

CREATE INDEX "activity_log_entries_actor_id_idx"
  ON "activity_log_entries"("actor_id");

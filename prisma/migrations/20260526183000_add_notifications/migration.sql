-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INGREDIENT_ADDED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "actor_id" UUID,
    "group_id" UUID,
    "ingredient_id" UUID,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_at_created_at_idx"
ON "notifications"("recipient_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_created_at_idx"
ON "notifications"("recipient_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_group_id_created_at_idx"
ON "notifications"("group_id", "created_at");

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_recipient_id_fkey"
FOREIGN KEY ("recipient_id") REFERENCES "profiles"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_actor_id_fkey"
FOREIGN KEY ("actor_id") REFERENCES "profiles"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_group_id_fkey"
FOREIGN KEY ("group_id") REFERENCES "groups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications"
ADD CONSTRAINT "notifications_ingredient_id_fkey"
FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- EnableRLS
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

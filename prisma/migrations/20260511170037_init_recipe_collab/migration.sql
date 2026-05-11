-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MenuRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MealCategory" AS ENUM ('APPETIZER', 'MAIN', 'SIDE', 'DESSERT', 'DRINK', 'OTHER');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(320) NOT NULL,
    "display_name" VARCHAR(120),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "quantity" DECIMAL(10,2),
    "unit" VARCHAR(40),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "invite_code" VARCHAR(32),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "profile_id" UUID NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "prompt" TEXT,
    "cuisine" VARCHAR(80),
    "meal_count" INTEGER,
    "status" "MenuRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "group_id" UUID NOT NULL,
    "request_id" UUID,
    "title" VARCHAR(160) NOT NULL,
    "summary" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "menu_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "category" "MealCategory" NOT NULL DEFAULT 'OTHER',
    "instructions" TEXT,
    "servings" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipe_id" UUID NOT NULL,
    "from_profile_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "quantity" DECIMAL(10,2),
    "unit" VARCHAR(40),
    "notes" TEXT,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "ingredients_owner_id_idx" ON "ingredients"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "ingredients_owner_id_name_key" ON "ingredients"("owner_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "groups_invite_code_key" ON "groups"("invite_code");

-- CreateIndex
CREATE INDEX "groups_owner_id_idx" ON "groups"("owner_id");

-- CreateIndex
CREATE INDEX "group_members_profile_id_idx" ON "group_members"("profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_profile_id_key" ON "group_members"("group_id", "profile_id");

-- CreateIndex
CREATE INDEX "menu_requests_group_id_created_at_idx" ON "menu_requests"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "menu_requests_requested_by_id_idx" ON "menu_requests"("requested_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "menus_request_id_key" ON "menus"("request_id");

-- CreateIndex
CREATE INDEX "menus_group_id_created_at_idx" ON "menus"("group_id", "created_at");

-- CreateIndex
CREATE INDEX "recipes_menu_id_idx" ON "recipes"("menu_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_from_profile_id_idx" ON "recipe_ingredients"("from_profile_id");

-- AddForeignKey
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_requests" ADD CONSTRAINT "menu_requests_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_requests" ADD CONSTRAINT "menu_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "menu_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_from_profile_id_fkey" FOREIGN KEY ("from_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- EnableRLS
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menu_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "menus" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe_ingredients" ENABLE ROW LEVEL SECURITY;

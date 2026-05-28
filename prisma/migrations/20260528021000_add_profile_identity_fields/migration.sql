ALTER TABLE "profiles"
ADD COLUMN "profile_picture_url" VARCHAR(2048),
ADD COLUMN "profile_picture_storage_ref" VARCHAR(512),
ADD COLUMN "profile_picture_content_type" VARCHAR(80),
ADD COLUMN "profile_picture_size_bytes" INTEGER;

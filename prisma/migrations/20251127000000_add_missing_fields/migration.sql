-- CreateTable Settings
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex Settings_key_key
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- AlterTable Image - add missing fields
ALTER TABLE "Image" ADD COLUMN "publicPath" TEXT;
ALTER TABLE "Image" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Image" ADD COLUMN "storageType" TEXT NOT NULL DEFAULT 'cos';

-- CreateIndex Image_publicPath_key
CREATE UNIQUE INDEX "Image_publicPath_key" ON "Image"("publicPath");

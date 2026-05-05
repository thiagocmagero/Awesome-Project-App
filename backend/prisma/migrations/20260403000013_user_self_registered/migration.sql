-- Add selfRegistered field to User
-- false  = created by another user (admin/inviter) — pending self-registration
-- true   = user registered themselves, or is a pre-existing account (backwards compatible)

ALTER TABLE "User" ADD COLUMN "selfRegistered" BOOLEAN NOT NULL DEFAULT false;

-- All existing users are treated as self-registered to preserve backwards compatibility.
-- Only users created AFTER this migration start with selfRegistered = false.
UPDATE "User" SET "selfRegistered" = true;

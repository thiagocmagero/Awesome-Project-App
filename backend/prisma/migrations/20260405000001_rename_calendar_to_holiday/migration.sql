-- DropForeignKey
ALTER TABLE "CalendarDate" DROP CONSTRAINT "CalendarDate_calendarId_fkey";
ALTER TABLE "ProjectCalendar" DROP CONSTRAINT "ProjectCalendar_calendarId_fkey";
ALTER TABLE "ProjectCalendar" DROP CONSTRAINT "ProjectCalendar_projectId_fkey";

-- Delete existing global calendar row (no owner, would violate new design)
DELETE FROM "ProjectCalendar";
DELETE FROM "CalendarDate";
DELETE FROM "Calendar";

-- RenameTables
ALTER TABLE "Calendar" RENAME TO "Holiday";
ALTER TABLE "CalendarDate" RENAME TO "HolidayDate";
ALTER TABLE "ProjectCalendar" RENAME TO "ProjectHoliday";

-- RenameColumns
ALTER TABLE "HolidayDate" RENAME COLUMN "calendarId" TO "holidayId";
ALTER TABLE "ProjectHoliday" RENAME COLUMN "calendarId" TO "holidayId";

-- RenamePrimaryKeyConstraints
ALTER TABLE "Holiday" RENAME CONSTRAINT "Calendar_pkey" TO "Holiday_pkey";
ALTER TABLE "HolidayDate" RENAME CONSTRAINT "CalendarDate_pkey" TO "HolidayDate_pkey";
ALTER TABLE "ProjectHoliday" RENAME CONSTRAINT "ProjectCalendar_pkey" TO "ProjectHoliday_pkey";

-- RenameIndexes
ALTER INDEX "Calendar_publicId_key" RENAME TO "Holiday_publicId_key";
ALTER INDEX "CalendarDate_publicId_key" RENAME TO "HolidayDate_publicId_key";
ALTER INDEX "CalendarDate_calendarId_date_key" RENAME TO "HolidayDate_holidayId_date_key";
ALTER INDEX "ProjectCalendar_projectId_calendarId_key" RENAME TO "ProjectHoliday_projectId_holidayId_key";

-- AddColumn ownerId
ALTER TABLE "Holiday" ADD COLUMN "ownerId" INTEGER;

-- DropColumn isGlobal
ALTER TABLE "Holiday" DROP COLUMN "isGlobal";

-- AddForeignKey (new names)
ALTER TABLE "HolidayDate" ADD CONSTRAINT "HolidayDate_holidayId_fkey"
  FOREIGN KEY ("holidayId") REFERENCES "Holiday"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectHoliday" ADD CONSTRAINT "ProjectHoliday_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectHoliday" ADD CONSTRAINT "ProjectHoliday_holidayId_fkey"
  FOREIGN KEY ("holidayId") REFERENCES "Holiday"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

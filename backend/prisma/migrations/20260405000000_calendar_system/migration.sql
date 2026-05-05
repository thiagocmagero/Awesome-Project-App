-- CreateTable
CREATE TABLE "Calendar" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Calendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarDate" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "calendarId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCalendar" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "calendarId" INTEGER NOT NULL,

    CONSTRAINT "ProjectCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Calendar_publicId_key" ON "Calendar"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDate_publicId_key" ON "CalendarDate"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDate_calendarId_date_key" ON "CalendarDate"("calendarId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCalendar_projectId_calendarId_key" ON "ProjectCalendar"("projectId", "calendarId");

-- AddForeignKey
ALTER TABLE "CalendarDate" ADD CONSTRAINT "CalendarDate_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCalendar" ADD CONSTRAINT "ProjectCalendar_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCalendar" ADD CONSTRAINT "ProjectCalendar_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "Calendar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

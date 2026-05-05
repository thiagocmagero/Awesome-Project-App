-- ─────────────────────────────────────────────────────────────────────────────
-- Gantt Foundation — 5 novos modelos para futura integração com DHTMLX Gantt Pro
-- ─────────────────────────────────────────────────────────────────────────────

-- CreateTable: GanttTask
CREATE TABLE "GanttTask" (
    "id"             SERIAL NOT NULL,
    "projectId"      INTEGER NOT NULL,
    "text"           TEXT NOT NULL,
    "type"           TEXT NOT NULL DEFAULT 'task',
    "startDate"      TIMESTAMP(3) NOT NULL,
    "endDate"        TIMESTAMP(3),
    "duration"       DOUBLE PRECISION NOT NULL DEFAULT 1,
    "progress"       DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ownerIds"       TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parentId"       INTEGER,
    "priority"       INTEGER,
    "constraintType" TEXT,
    "constraintDate" TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GanttTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GanttLink
CREATE TABLE "GanttLink" (
    "id"        SERIAL NOT NULL,
    "sourceId"  INTEGER NOT NULL,
    "targetId"  INTEGER NOT NULL,
    "type"      TEXT NOT NULL DEFAULT '0',
    "lag"       INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GanttLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GanttResource
CREATE TABLE "GanttResource" (
    "id"        SERIAL NOT NULL,
    "text"      TEXT NOT NULL,
    "parentId"  INTEGER,
    "userId"    INTEGER,
    "projectId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GanttResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GanttAssignment
CREATE TABLE "GanttAssignment" (
    "id"         SERIAL NOT NULL,
    "taskId"     INTEGER NOT NULL,
    "resourceId" INTEGER NOT NULL,
    "units"      DOUBLE PRECISION NOT NULL DEFAULT 1,
    "value"      DOUBLE PRECISION,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GanttAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GanttBaseline
CREATE TABLE "GanttBaseline" (
    "id"        SERIAL NOT NULL,
    "taskId"    INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate"   TIMESTAMP(3) NOT NULL,
    "duration"  DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GanttBaseline_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: GanttTask → Project (cascade delete)
ALTER TABLE "GanttTask" ADD CONSTRAINT "GanttTask_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: GanttTask → GanttTask (self-reference para hierarquia)
ALTER TABLE "GanttTask" ADD CONSTRAINT "GanttTask_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "GanttTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: GanttLink → GanttTask source (cascade delete)
ALTER TABLE "GanttLink" ADD CONSTRAINT "GanttLink_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "GanttTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: GanttLink → GanttTask target (cascade delete)
ALTER TABLE "GanttLink" ADD CONSTRAINT "GanttLink_targetId_fkey"
    FOREIGN KEY ("targetId") REFERENCES "GanttTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: GanttResource → GanttResource (self-reference para hierarquia)
ALTER TABLE "GanttResource" ADD CONSTRAINT "GanttResource_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "GanttResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: GanttResource → User (opcional)
ALTER TABLE "GanttResource" ADD CONSTRAINT "GanttResource_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: GanttResource → Project (cascade delete)
ALTER TABLE "GanttResource" ADD CONSTRAINT "GanttResource_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: GanttAssignment → GanttTask (cascade delete)
ALTER TABLE "GanttAssignment" ADD CONSTRAINT "GanttAssignment_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "GanttTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: GanttAssignment → GanttResource (cascade delete)
ALTER TABLE "GanttAssignment" ADD CONSTRAINT "GanttAssignment_resourceId_fkey"
    FOREIGN KEY ("resourceId") REFERENCES "GanttResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: GanttBaseline → GanttTask (cascade delete)
ALTER TABLE "GanttBaseline" ADD CONSTRAINT "GanttBaseline_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "GanttTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

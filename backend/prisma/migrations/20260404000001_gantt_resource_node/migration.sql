-- GanttResourceNode: tabela dedicada para montar o resource datastore do DHTMLX Gantt.
-- IDs auto-increment simples que o Gantt usa directamente — elimina colisões entre User.id e GanttResource.id.

CREATE TABLE "GanttResourceNode" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "parentId" INTEGER,
    "projectId" INTEGER NOT NULL,
    "userTypeId" INTEGER,
    "userId" INTEGER,
    "ganttResourceId" INTEGER,
    "hoursPerDay" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "isGroup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GanttResourceNode_pkey" PRIMARY KEY ("id")
);

-- Unique indexes
CREATE UNIQUE INDEX "GanttResourceNode_publicId_key" ON "GanttResourceNode"("publicId");

-- Performance index
CREATE INDEX "GanttResourceNode_projectId_idx" ON "GanttResourceNode"("projectId");

-- Um grupo por tipo funcional por projecto
CREATE UNIQUE INDEX "GanttResourceNode_group_uq"
  ON "GanttResourceNode"("projectId", "userTypeId")
  WHERE "isGroup" = true AND "userTypeId" IS NOT NULL;

-- Um nó por user por projecto
CREATE UNIQUE INDEX "GanttResourceNode_user_uq"
  ON "GanttResourceNode"("projectId", "userId")
  WHERE "userId" IS NOT NULL;

-- Um nó por recurso externo por projecto
CREATE UNIQUE INDEX "GanttResourceNode_ext_uq"
  ON "GanttResourceNode"("projectId", "ganttResourceId")
  WHERE "ganttResourceId" IS NOT NULL;

-- Foreign keys
ALTER TABLE "GanttResourceNode" ADD CONSTRAINT "GanttResourceNode_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "GanttResourceNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GanttResourceNode" ADD CONSTRAINT "GanttResourceNode_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GanttResourceNode" ADD CONSTRAINT "GanttResourceNode_userTypeId_fkey"
  FOREIGN KEY ("userTypeId") REFERENCES "UserType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GanttResourceNode" ADD CONSTRAINT "GanttResourceNode_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "GanttResourceNode" ADD CONSTRAINT "GanttResourceNode_ganttResourceId_fkey"
  FOREIGN KEY ("ganttResourceId") REFERENCES "GanttResource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

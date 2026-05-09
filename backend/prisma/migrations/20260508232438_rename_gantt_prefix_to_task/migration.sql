-- RenameForeignKey
ALTER TABLE "Task" RENAME CONSTRAINT "GanttTask_boardColumnId_fkey" TO "Task_boardColumnId_fkey";

-- RenameForeignKey
ALTER TABLE "Task" RENAME CONSTRAINT "GanttTask_boardSwimlaneId_fkey" TO "Task_boardSwimlaneId_fkey";

-- RenameForeignKey
ALTER TABLE "Task" RENAME CONSTRAINT "GanttTask_parentId_fkey" TO "Task_parentId_fkey";

-- RenameForeignKey
ALTER TABLE "Task" RENAME CONSTRAINT "GanttTask_projectId_fkey" TO "Task_projectId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskAssignment" RENAME CONSTRAINT "GanttAssignment_resourceId_fkey" TO "TaskAssignment_resourceId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskAssignment" RENAME CONSTRAINT "GanttAssignment_taskId_fkey" TO "TaskAssignment_taskId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskBaseline" RENAME CONSTRAINT "GanttBaseline_taskId_fkey" TO "TaskBaseline_taskId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskLink" RENAME CONSTRAINT "GanttLink_sourceId_fkey" TO "TaskLink_sourceId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskLink" RENAME CONSTRAINT "GanttLink_targetId_fkey" TO "TaskLink_targetId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResource" RENAME CONSTRAINT "GanttResource_parentId_fkey" TO "TaskResource_parentId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResource" RENAME CONSTRAINT "GanttResource_projectId_fkey" TO "TaskResource_projectId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResource" RENAME CONSTRAINT "GanttResource_userId_fkey" TO "TaskResource_userId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResource" RENAME CONSTRAINT "GanttResource_userTypeId_fkey" TO "TaskResource_userTypeId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_ganttResourceId_fkey" TO "TaskResourceNode_taskResourceId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_parentId_fkey" TO "TaskResourceNode_parentId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_projectId_fkey" TO "TaskResourceNode_projectId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_userId_fkey" TO "TaskResourceNode_userId_fkey";

-- RenameForeignKey
ALTER TABLE "TaskResourceNode" RENAME CONSTRAINT "GanttResourceNode_userTypeId_fkey" TO "TaskResourceNode_userTypeId_fkey";

-- RenameIndex
ALTER INDEX "GanttAssignment_publicId_key" RENAME TO "TaskAssignment_publicId_key";

-- RenameIndex
ALTER INDEX "GanttBaseline_publicId_key" RENAME TO "TaskBaseline_publicId_key";

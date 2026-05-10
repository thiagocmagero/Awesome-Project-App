-- Tornar Task.startDate opcional para suportar tasks sem data de início.
-- A obrigatoriedade real fica delegada às regras de campos (TaskFieldKey.schedule).
ALTER TABLE "Task" ALTER COLUMN "startDate" DROP NOT NULL;

import { createContext, useContext, type ReactNode } from 'react';
import { DEFAULT_DATE_FORMAT, type ProjectDateFormat } from '../lib/dateFormatting';

const ProjectDateFormatContext = createContext<ProjectDateFormat | string | undefined>(undefined);

interface ProviderProps {
  /** Formato persistido no `Project.dateFormat` (`null`/`undefined` ⇒ default). */
  projectFormat?: ProjectDateFormat | string | null;
  children: ReactNode;
}

/**
 * Envolve uma vista que opera no contexto dum projecto e expõe o formato
 * de data definido por esse projecto. Consumir via `useResolvedDateFormat()`.
 *
 * Pages globais sem contexto de projecto (ProjectsPage listing, HolidaysPage,
 * SessionsPage, AppLayout) **não** usam o Provider — chamam directamente
 * `formatDate(d)` que cai no `DEFAULT_DATE_FORMAT`.
 */
export function ProjectDateFormatProvider({ projectFormat, children }: ProviderProps) {
  return (
    <ProjectDateFormatContext.Provider value={projectFormat ?? undefined}>
      {children}
    </ProjectDateFormatContext.Provider>
  );
}

/** Devolve sempre uma string válida (`project.dateFormat ?? DEFAULT`). */
export function useResolvedDateFormat(): ProjectDateFormat | string {
  const projectFormat = useContext(ProjectDateFormatContext);
  return projectFormat ?? DEFAULT_DATE_FORMAT;
}

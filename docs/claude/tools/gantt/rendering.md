# Claude: carregar para tarefas de layout e rendering do Gantt

## Layout — 2 painéis

```typescript
gantt.config.layout = {
  css: 'gantt_container',
  rows: [
    {
      cols: [
        { view: 'grid',     id: 'grid',     scrollX: 'scrollHor', scrollY: 'scrollVer' },
        { resizer: true, width: 1 },
        { view: 'timeline', id: 'timeline', scrollX: 'scrollHor', scrollY: 'scrollVer' },
        { view: 'scrollbar', id: 'scrollVer' },
      ]
    },
    { view: 'scrollbar', id: 'scrollHor', height: 20 },
    // Painel de recursos (abaixo da linha separadora):
    {
      cols: [
        { view: 'resourceGrid',     id: 'resourceGrid',     scrollY: 'scrollResVer' },
        { resizer: true, width: 1 },
        { view: 'resourceTimeline', id: 'resourceTimeline', scrollX: 'scrollHor', scrollY: 'scrollResVer' },
        { view: 'scrollbar', id: 'scrollResVer' },
      ]
    }
  ]
};
```

## Colunas da grid — configuração dinâmica (3 níveis)

```typescript
const BASE_COLUMNS    = ['text', 'start_date', 'duration']; // sempre visíveis
const OPTIONAL_COLUMNS = ['owner', 'progress', 'type', 'add']; // toggled via config

function applyColumnConfig(config: Record<string, boolean>) {
  gantt.config.columns = ALL_COLUMNS.filter(col =>
    BASE_COLUMNS.includes(col.name) || config[col.name] !== false
  );
  gantt.render();
}
```

Hook: `useGanttConfig(projectPublicId?)` em `frontend/src/hooks/useGanttConfig.ts`.
Resolução de níveis: `PROJECT` > `USER` > `GLOBAL` — nível mais específico ganha.
Offcanvas na `PlanningPage` → `toggleColumn` persiste via `updateProjectConfig` (fire-and-forget, optimista).
`GanttSettingsPage` (`/settings/gantt`) → tabs Global (admin) + Utilizador.

## CSS — dias não-úteis

```typescript
gantt.templates.scale_cell_class = (date) => {
  if (nonWorkingDaysRef.current.includes(toYYYYMMDD(date))) return 'holiday';
  if (date.getDay() === 0 || date.getDay() === 6) return 'weekend';
  return '';
};

gantt.templates.timeline_cell_class = (task, date) => {
  if (nonWorkingDaysRef.current.includes(toYYYYMMDD(date))) return 'holiday';
  if (date.getDay() === 0 || date.getDay() === 6) return 'weekend';
  return '';
};
```

CSS: `.holiday { background: #fff3cd; }` (âmbar) vs `.weekend { background: #f0f0f0; }` (cinzento).

`setWorkTime` para excluir dias do cálculo de duração:
```typescript
gantt.setWorkTime({ day: 0, hours: false }); // domingo
gantt.setWorkTime({ day: 6, hours: false }); // sábado
nonWorkingDaysRef.current.forEach(d =>
  gantt.setWorkTime({ date: new Date(d), hours: false })
);
```

> `nonWorkingDaysRef` usa `useRef` para evitar stale closure em templates. Actualizar ref sempre que `nonWorkingDays` mudar.

> O **backend** usa o mesmo conceito de dias úteis ao calcular `endDate`
> (helper [`addBusinessDaysInclusive`](backend/src/planning/business-days.util.ts)).
> `nonWorkingDays` vem de `HolidaysService.getNonWorkingDaysForProject` — **mesmo
> conjunto** que alimenta o `setWorkTime` acima. Garantia: backend e DHTMLX usam
> idêntica definição de "dia útil"; sem isto, a duração mostrada drift-a face à
> guardada após save (ver @docs/claude/tools/gantt/data-model.md §"Cálculo de
> `endDate`").

## Resource Grid — agrupamento

- Recursos agrupados por `userType` (DEVELOPER, QA, etc.).
- Grupo "Externos" para `GanttResource` sem `userId` (contractors).
- `hoursPerDay` dos membros: vem de `ProjectMemberHours`.
- `hoursPerDay` dos externos: vem directamente de `GanttResource.hoursPerDay`.

## Zoom

```typescript
// Botão ti-zoom-cancel no btn-group → reset para nível padrão
gantt.ext.zoom.setLevel('day');
```

## Anti-padrões

- ❌ `gantt.init()` mais do que uma vez — singleton por página, não reinicializar
- ❌ `gantt.render()` sem actualizar `gantt.config.columns` primeiro
- ❌ Calcular `nonWorkingDays` no frontend — vêm sempre do backend (`GET /planning`)
- ❌ Usar variáveis de estado directamente em `templates.*` — usar `useRef`

# Relacionados: @docs/claude/tools/gantt/overview.md @docs/claude/tools/gantt/interactions.md @docs/claude/tools/gantt/data-model.md

import { useRef, useState } from 'react';
import {
  AwesomeKanban,
  AwesomeKanbanToolbar,
  applyCardMove,
  applyColumnReorder,
  applyRowReorder,
  defaultColumnColors,
  type AwesomeKanbanApi,
  type Card,
  type CardShape,
  type Column,
  type EditorField,
  type Link,
  type Row,
} from '../index';

const editorShape: EditorField[] = [
  { type: 'text', key: 'label', label: 'Title' },
  { type: 'textarea', key: 'description', label: 'Description' },
  {
    type: 'select',
    key: 'priority',
    label: 'Priority',
    values: [
      { id: 'high', label: 'High' },
      { id: 'medium', label: 'Medium' },
      { id: 'low', label: 'Low' },
      { id: 'none', label: 'None' },
    ],
  },
  { type: 'progress', key: 'progress', label: 'Progress' },
  { type: 'date', key: 'startDate', label: 'Start date' },
  { type: 'date', key: 'endDate', label: 'End date' },
  { type: 'comments', key: 'comments', label: 'Comments' },
  { type: 'files', key: 'attached', label: 'Attachments' },
  { type: 'links', key: 'links', label: 'Links' },
];

const initialColumns: Column[] = [
  { id: 'todo', label: 'A fazer', color: defaultColumnColors.lavender, limit: 5 },
  { id: 'doing', label: 'Em Progresso', color: defaultColumnColors.violet, limit: 3 },
  { id: 'review', label: 'Validação', color: defaultColumnColors.peach, limit: 4 },
  { id: 'done', label: 'Concluído', color: defaultColumnColors.sage },
];

const initialRows: Row[] = [
  { id: 'feature', label: 'Feature', color: '#7c5cff' },
  { id: 'task', label: 'Task', color: '#3b82f6' },
  { id: 'bug', label: 'Bug', color: '#ef4444' },
];

const users = [
  { id: 'u1', label: 'Ana Souza' },
  { id: 'u2', label: 'Bruno Lima' },
  { id: 'u3', label: 'Carla Mendes' },
  { id: 'u4', label: 'Diego Pinto' },
  { id: 'u5', label: 'Eva Tavares' },
];

const initialCards: Card[] = [
  {
    id: 'c1',
    label: 'Investigar lentidão na home',
    description: 'Métricas mostram TTFB elevado em mobile.',
    columnId: 'todo',
    rowId: 'bug',
    priority: 'high',
    users: ['u1', 'u2'],
    startDate: '2026-04-28',
    endDate: '2026-05-02',
    progress: 0,
    comments: [
      { id: 'cm1', userId: 'u1', text: 'Reproduz no iPhone 12.', date: '2026-04-28' },
      { id: 'cm2', userId: 'u2', text: 'Profile pendente.', date: '2026-04-29' },
    ],
  },
  {
    id: 'c2',
    label: 'Refatorar componente de Header',
    description: 'Extrair ações para subcomponente.',
    columnId: 'doing',
    rowId: 'task',
    priority: 'medium',
    users: ['u3'],
    startDate: '2026-04-25',
    endDate: '2026-04-30',
    progress: 60,
  },
  {
    id: 'c3',
    label: 'API de exportação CSV',
    columnId: 'doing',
    rowId: 'feature',
    priority: 'high',
    users: ['u4', 'u5', 'u1'],
    startDate: '2026-04-20',
    endDate: '2026-05-04',
    progress: 35,
  },
  {
    id: 'c4',
    label: 'Subtarefa: validação de upload',
    columnId: 'todo',
    rowId: 'task',
    priority: 'low',
    users: ['u4'],
    subtaskOf: 'c3',
  },
  {
    id: 'c5',
    label: 'Atualizar documentação do design system',
    columnId: 'review',
    rowId: 'task',
    priority: 'low',
    users: ['u2', 'u5'],
    startDate: '2026-04-22',
    endDate: '2026-04-29',
    progress: 80,
    comments: [
      { id: 'cm3', userId: 'u2', text: 'Faltam tokens de spacing.', date: '2026-04-26' },
    ],
  },
  {
    id: 'c6',
    label: 'Migração de banco — etapa 1',
    columnId: 'done',
    rowId: 'feature',
    priority: 'medium',
    users: ['u1'],
    startDate: '2026-04-10',
    endDate: '2026-04-20',
    progress: 100,
  },
  {
    id: 'c7',
    label: 'Bug: formulário não persiste rascunho',
    columnId: 'todo',
    rowId: 'bug',
    priority: 'medium',
    users: ['u3', 'u4'],
  },
];

const cardShape: CardShape = {
  comments: { show: true },
  progress: { show: true },
  showSubtaskLink: true,
  users: { show: true, values: users, maxCount: 3 },
};

export function App() {
  const [columns, setColumns] = useState(initialColumns);
  const [rows, setRows] = useState(initialRows);
  const [cards, setCards] = useState(initialCards);
  const [links, setLinks] = useState<Link[]>([]);
  const [showSwimlanes, setShowSwimlanes] = useState(true);
  const [density, setDensity] = useState<'compact' | 'normal' | 'wide'>('compact');
  const [primary, setPrimary] = useState('#7c5cff');
  const [accent, setAccent] = useState<'cap' | 'bar' | 'dot' | 'soft'>('cap');
  const [priorityStyle, setPriorityStyle] = useState<'pill' | 'dot' | 'stripe'>('pill');

  const apiRef = useRef<AwesomeKanbanApi | null>(null);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <DemoControls
        density={density}
        setDensity={setDensity}
        primary={primary}
        setPrimary={setPrimary}
        accent={accent}
        setAccent={setAccent}
        priorityStyle={priorityStyle}
        setPriorityStyle={setPriorityStyle}
        showSwimlanes={showSwimlanes}
        setShowSwimlanes={setShowSwimlanes}
      />

      <AwesomeKanbanToolbar apiRef={apiRef} />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <AwesomeKanban
          apiRef={apiRef}
          columns={columns}
          rows={showSwimlanes ? rows : []}
          cards={cards}
          links={links}
          editorShape={editorShape}
          currentUser="u1"
          density={density}
          primaryColor={primary}
          columnAccentStyle={accent}
          priorityStyle={priorityStyle}
          cardShape={cardShape}
          onLinkAdd={(e) => setLinks((prev) => [...prev, e.link])}
          onLinkDelete={(e) => setLinks((prev) => prev.filter((l) => l.id !== e.id))}
          onCardUpdate={(e) => {
            setCards((prev) =>
              prev.map((c) => (c.id === e.id ? { ...c, ...e.patch } : c))
            );
          }}
          onCardAdd={(e) => {
            setCards((prev) => [...prev, e.card]);
          }}
          onCardDelete={(e) => {
            const ids = new Set(Array.isArray(e.id) ? e.id : [e.id]);
            setCards((prev) => prev.filter((c) => !ids.has(c.id)));
          }}
          onCardMove={(e) => {
            setCards((prev) => applyCardMove(prev, e));
          }}
          onCardDuplicate={(e) => {
            // The lib appends duplicates internally but in controlled mode
            // setCards is a no-op; mirror the duplication on our state.
            setCards((prev) => {
              const additions = e.ids
                .map((sourceId, idx) => {
                  const original = prev.find((c) => c.id === sourceId);
                  if (!original) return null;
                  return { ...original, id: e.newIds[idx]! };
                })
                .filter((c): c is Card => c !== null);
              return [...prev, ...additions];
            });
          }}
          onCommentAdd={(e) => {
            setCards((prev) =>
              prev.map((c) =>
                c.id === e.cardId
                  ? { ...c, comments: [...(c.comments ?? []), e.comment] }
                  : c
              )
            );
          }}
          onCommentUpdate={(e) => {
            setCards((prev) =>
              prev.map((c) => {
                if (c.id !== e.cardId) return c;
                return {
                  ...c,
                  comments: (c.comments ?? []).map((cm) =>
                    cm.id === e.comment.id ? e.comment : cm
                  ),
                };
              })
            );
          }}
          onCommentDelete={(e) => {
            setCards((prev) =>
              prev.map((c) => {
                if (c.id !== e.cardId) return c;
                return {
                  ...c,
                  comments: (c.comments ?? []).filter(
                    (cm) => cm.id !== e.comment.id
                  ),
                };
              })
            );
          }}
          onColumnCollapse={(e) => {
            setColumns((prev) =>
              prev.map((c) =>
                c.id === e.id ? { ...c, collapsed: e.collapsed } : c
              )
            );
          }}
          onColumnAdd={(e) => {
            setColumns((prev) => [...prev, e.column]);
          }}
          onColumnUpdate={(e) => {
            setColumns((prev) =>
              prev.map((c) => (c.id === e.id ? { ...c, ...e.patch } : c))
            );
          }}
          onColumnDelete={(e) => {
            setColumns((prev) => prev.filter((c) => c.id !== e.id));
          }}
          onColumnMove={(e) => {
            setColumns((prev) => applyColumnReorder(prev, e));
          }}
          onRowCollapse={(e) => {
            setRows((prev) =>
              prev.map((r) =>
                r.id === e.id ? { ...r, collapsed: e.collapsed } : r
              )
            );
          }}
          onRowAdd={(e) => {
            setRows((prev) => [...prev, e.row]);
          }}
          onRowUpdate={(e) => {
            setRows((prev) =>
              prev.map((r) => (r.id === e.id ? { ...r, ...e.patch } : r))
            );
          }}
          onRowDelete={(e) => {
            setRows((prev) => prev.filter((r) => r.id !== e.id));
          }}
          onRowMove={(e) => {
            setRows((prev) => applyRowReorder(prev, e));
          }}
        />
      </div>
    </div>
  );
}

function DemoControls(props: {
  density: 'compact' | 'normal' | 'wide';
  setDensity: (v: 'compact' | 'normal' | 'wide') => void;
  primary: string;
  setPrimary: (v: string) => void;
  accent: 'cap' | 'bar' | 'dot' | 'soft';
  setAccent: (v: 'cap' | 'bar' | 'dot' | 'soft') => void;
  priorityStyle: 'pill' | 'dot' | 'stripe';
  setPriorityStyle: (v: 'pill' | 'dot' | 'stripe') => void;
  showSwimlanes: boolean;
  setShowSwimlanes: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        padding: '10px 14px',
        background: '#fff',
        borderBottom: '1px solid #ececf1',
        fontFamily: 'Inter, sans-serif',
        fontSize: 12.5,
        alignItems: 'center',
      }}
    >
      <strong style={{ marginRight: 8 }}>Demo controls:</strong>

      <label>
        Density:{' '}
        <select
          value={props.density}
          onChange={(e) => props.setDensity(e.target.value as 'compact' | 'normal' | 'wide')}
        >
          <option value="compact">compact</option>
          <option value="normal">normal</option>
          <option value="wide">wide</option>
        </select>
      </label>

      <label>
        Primary:{' '}
        <input
          type="color"
          value={props.primary}
          onChange={(e) => props.setPrimary(e.target.value)}
          style={{ verticalAlign: 'middle' }}
        />
      </label>

      <label>
        Accent:{' '}
        <select
          value={props.accent}
          onChange={(e) =>
            props.setAccent(e.target.value as 'cap' | 'bar' | 'dot' | 'soft')
          }
        >
          <option value="cap">cap</option>
          <option value="bar">bar</option>
          <option value="dot">dot</option>
          <option value="soft">soft</option>
        </select>
      </label>

      <label>
        Priority:{' '}
        <select
          value={props.priorityStyle}
          onChange={(e) =>
            props.setPriorityStyle(e.target.value as 'pill' | 'dot' | 'stripe')
          }
        >
          <option value="pill">pill</option>
          <option value="dot">dot</option>
          <option value="stripe">stripe</option>
        </select>
      </label>

      <label>
        <input
          type="checkbox"
          checked={props.showSwimlanes}
          onChange={(e) => props.setShowSwimlanes(e.target.checked)}
        />{' '}
        Swimlanes
      </label>
    </div>
  );
}

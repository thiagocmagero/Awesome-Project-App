/* eslint-disable */
// Direction A — "Stratos" · Dark, dense, Linear-inspired.
// Single electric-lime accent, monospace numerals, hover-revealed actions,
// no per-row CRUD buttons, status as text + dot (not pills).

const stratosTokens = {
  bg: 'oklch(0.18 0.012 270)',
  panel: 'oklch(0.205 0.013 270)',
  panel2: 'oklch(0.235 0.013 270)',
  line: 'oklch(0.30 0.013 270)',
  ink: 'oklch(0.96 0.005 270)',
  dim: 'oklch(0.68 0.012 270)',
  mute: 'oklch(0.52 0.012 270)',
  accent: 'oklch(0.86 0.18 130)',     // electric lime
  accentInk: 'oklch(0.22 0.04 130)',
  todo: 'oklch(0.65 0.012 270)',
  doing: 'oklch(0.80 0.14 75)',
  done: 'oklch(0.78 0.14 155)',
  high: 'oklch(0.70 0.20 25)',
  med: 'oklch(0.78 0.14 75)',
  low: 'oklch(0.70 0.10 220)',
  font: '"Inter", "Inter Tight", -apple-system, system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace',
};

const stratosBaseRows = [
  { t: 'Remover ID da tabela em /teams',                  s: '11 May', e: '13 May', d: '2d',  p: 'Low',  st: 'todo'  },
  { t: 'Regras nas tasks',                                s: '—',      e: '—',      d: '5d',  p: null,    st: 'done'  },
  { t: 'Notificação ao adicionar/remover de projeto',     s: '11 May', e: '16 May', d: '5d',  p: null,    st: 'doing' },
  { t: '[urgent] Mudar path S3',                          s: '11 May', e: '16 May', d: '5d',  p: 'High', st: 'done'  },
  { t: 'Editor rich text com imagens seguras',            s: '11 May', e: '16 May', d: '5d',  p: 'Med',  st: 'todo'  },
  { t: 'Bug — Salvar sem data de início',                 s: '11 May', e: '16 May', d: '5d',  p: 'High', st: 'done'  },
  { t: 'Implementar sistema de Tags',                     s: '11 May', e: '16 May', d: '5d',  p: 'Med',  st: 'doing' },
  { t: 'Implementar feature "Seguir" na task',            s: '11 May', e: '16 May', d: '5d',  p: null,    st: 'todo'  },
  { t: 'Contador da lista de tarefas',                    s: '11 May', e: '16 May', d: '5d',  p: 'Low',  st: 'todo'  },
];

function StratosShell({ children, page }) {
  const t = stratosTokens;
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.ink,
      fontFamily: t.font, display: 'flex', overflow: 'hidden',
      fontFeatureSettings: '"cv11", "ss01", "ss03"', fontSize: 13, letterSpacing: -0.01,
    }}>
      {/* Sidebar */}
      <aside style={{
        width: 196, flex: '0 0 auto', borderRight: `1px solid ${t.line}`,
        padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 2, background: t.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px 14px' }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6, background: t.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.accentInk, fontWeight: 700, fontSize: 13, letterSpacing: -0.5,
          }}>◣</div>
          <div style={{ fontWeight: 600, letterSpacing: -0.2 }}>Stratos</div>
          <div style={{ marginLeft: 'auto', color: t.mute, fontSize: 11 }}>⌘K</div>
        </div>

        <SidebarItem icon="▤" label="Inbox"     count="3"  t={t} />
        <SidebarItem icon="◇" label="My issues" t={t} />
        <SidebarItem icon="↗" label="Activity"  t={t} />

        <div style={{ height: 10 }} />
        <div style={{ padding: '6px 8px', fontSize: 11, color: t.mute, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Workspace</span><span style={{ opacity: 0.5 }}>+</span>
        </div>
        <SidebarItem icon="●" iconColor={t.accent} label="Awesome Project App" active t={t} />
        <SidebarItem icon="●" iconColor="oklch(0.68 0.14 28)" label="Internal Tools" t={t} />
        <SidebarItem icon="●" iconColor="oklch(0.72 0.13 220)" label="Marketing Site" t={t} />

        <div style={{ height: 10 }} />
        <div style={{ padding: '6px 8px', fontSize: 11, color: t.mute }}>Views</div>
        <SidebarItem icon="▦" label="All tasks" t={t} />
        <SidebarItem icon="◐" label="In progress" t={t} />
        <SidebarItem icon="▢" label="Backlog"     t={t} />
        <SidebarItem icon="✓" label="Completed"   t={t} />

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px', borderTop: `1px solid ${t.line}` }}>
          <div style={{ width: 22, height: 22, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
            <span style={{ fontSize: 12 }}>Thiago Mágero</span>
            <span style={{ fontSize: 10, color: t.mute }}>thiago@stratos.app</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top breadcrumb */}
        <div style={{
          height: 38, display: 'flex', alignItems: 'center', padding: '0 16px',
          borderBottom: `1px solid ${t.line}`, gap: 8, fontSize: 12, color: t.dim,
        }}>
          <span>Awesome Project App</span>
          <span style={{ color: t.mute }}>/</span>
          <span style={{ color: t.ink }}>{page}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', color: t.mute }}>
            <span style={{ padding: '2px 6px', border: `1px solid ${t.line}`, borderRadius: 4, fontFamily: t.mono, fontSize: 10 }}>F</span>
            Filter
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}

function SidebarItem({ icon, iconColor, label, count, active, t }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '5px 8px',
      borderRadius: 5, cursor: 'pointer', fontSize: 13,
      background: active ? t.panel2 : 'transparent',
      color: active ? t.ink : t.dim,
    }}>
      <span style={{ width: 14, textAlign: 'center', color: iconColor || (active ? t.ink : t.mute), fontSize: 11 }}>{icon}</span>
      <span style={{ flex: 1, letterSpacing: -0.1 }}>{label}</span>
      {count && <span style={{ fontSize: 11, color: t.mute, fontFamily: t.mono }}>{count}</span>}
    </div>
  );
}

function StratosList() {
  const t = stratosTokens;
  const groups = [
    { name: 'In Progress', count: 2, rows: stratosBaseRows.filter(r => r.st === 'doing') },
    { name: 'Todo',        count: 4, rows: stratosBaseRows.filter(r => r.st === 'todo') },
    { name: 'Done',        count: 3, rows: stratosBaseRows.filter(r => r.st === 'done') },
  ];

  const statusGlyph = (st) => {
    if (st === 'done') return <span style={{ color: t.done }}>●</span>;
    if (st === 'doing') return <span style={{ color: t.doing }}>◐</span>;
    return <span style={{ color: t.mute }}>○</span>;
  };
  const priColor = { High: t.high, Med: t.med, Low: t.low };

  return (
    <StratosShell page="All tasks">
      {/* Toolbar */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
        borderBottom: `1px solid ${t.line}`,
      }}>
        <Tab active label="List" t={t} />
        <Tab label="Board" t={t} />
        <Tab label="Timeline" t={t} />
        <Tab label="Calendar" t={t} />
        <div style={{ marginLeft: 16, display: 'flex', gap: 6 }}>
          <Chip label="Status" value="any" t={t} />
          <Chip label="Priority" value="any" t={t} />
          <Chip label="Assignee" value="me" t={t} />
          <Chip label="+ Filter" muted t={t} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
          <input placeholder="Search tasks…" style={{
            background: t.panel, border: `1px solid ${t.line}`, color: t.ink,
            padding: '5px 10px', borderRadius: 6, fontSize: 12, width: 180, outline: 'none', fontFamily: t.font,
          }} />
          <button style={{
            background: t.accent, color: t.accentInk, border: 'none',
            padding: '6px 11px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14, lineHeight: 0.8 }}>+</span> New task <span style={{ fontFamily: t.mono, fontSize: 10, opacity: 0.6, marginLeft: 4 }}>C</span>
          </button>
        </div>
      </div>

      {/* Column header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 90px 90px 70px 90px 80px 36px',
        padding: '8px 16px', fontSize: 11, color: t.mute, letterSpacing: 0.04,
        textTransform: 'uppercase', borderBottom: `1px solid ${t.line}`, gap: 12,
      }}>
        <span>Title</span><span>Start</span><span>Due</span>
        <span>Est.</span><span>Priority</span><span>Owner</span><span></span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {groups.map(g => (
          <div key={g.name}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px',
              fontSize: 12, color: t.dim, background: 'transparent',
              borderBottom: `1px solid ${t.line}`,
            }}>
              <span style={{ color: t.mute, fontSize: 9 }}>▾</span>
              <span style={{ fontWeight: 600, color: t.ink }}>{g.name}</span>
              <span style={{ color: t.mute, fontFamily: t.mono }}>{g.count}</span>
              <span style={{ marginLeft: 'auto', color: t.mute, fontSize: 11 }}>+ Add</span>
            </div>
            {g.rows.map((r, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '1fr 90px 90px 70px 90px 80px 36px',
                padding: '0 16px', height: 34, alignItems: 'center', gap: 12,
                borderBottom: `1px solid ${t.line}`, fontSize: 13,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  {statusGlyph(r.st)}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.t}</span>
                </div>
                <span style={{ fontFamily: t.mono, color: t.dim, fontSize: 12 }}>{r.s}</span>
                <span style={{ fontFamily: t.mono, color: t.dim, fontSize: 12 }}>{r.e}</span>
                <span style={{ fontFamily: t.mono, color: t.dim, fontSize: 12 }}>{r.d}</span>
                <span style={{ color: r.p ? priColor[r.p] : t.mute, fontSize: 12 }}>
                  {r.p ? <>● <span style={{ color: t.dim }}>{r.p}</span></> : '—'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)' }}></div>
                  <span style={{ color: t.dim, fontSize: 12 }}>TM</span>
                </div>
                <span style={{ color: t.mute, textAlign: 'right' }}>⋯</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </StratosShell>
  );
}

function Tab({ label, active, t }) {
  return (
    <div style={{
      padding: '4px 10px', fontSize: 12, borderRadius: 5, cursor: 'pointer',
      color: active ? t.ink : t.dim,
      background: active ? t.panel2 : 'transparent',
      border: active ? `1px solid ${t.line}` : '1px solid transparent',
    }}>{label}</div>
  );
}
function Chip({ label, value, muted, t }) {
  return (
    <div style={{
      padding: '3px 9px', fontSize: 11, borderRadius: 12, cursor: 'pointer',
      border: `1px dashed ${t.line}`, color: muted ? t.mute : t.dim,
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      <span>{label}</span>
      {value && <span style={{ color: t.ink }}>{value}</span>}
    </div>
  );
}

function StratosGantt() {
  const t = stratosTokens;
  const days = Array.from({ length: 28 }, (_, i) => 4 + i);  // 4 May → 31 May
  const todayCol = 11 - 4;  // index of "11"
  const cellW = 28;

  const bars = [
    { row: 0, start: 7, len: 2, label: 'Remover ID …', tone: t.accent, done: 1 },
    { row: 1, start: 7, len: 5, label: 'Notificação ao adic.', tone: t.doing, done: 0.4 },
    { row: 2, start: 7, len: 5, label: '[urgent] path S3', tone: t.done, done: 1 },
    { row: 3, start: 7, len: 5, label: 'Editor rich text', tone: t.accent, done: 0 },
    { row: 4, start: 7, len: 5, label: 'Bug — sem data início', tone: t.done, done: 1 },
    { row: 5, start: 7, len: 5, label: 'Sistema de Tags', tone: t.doing, done: 0.6 },
    { row: 6, start: 7, len: 5, label: 'Feature "Seguir"', tone: t.accent, done: 0 },
    { row: 7, start: 7, len: 5, label: 'Contador lista tarefas', tone: t.accent, done: 0 },
  ];

  return (
    <StratosShell page="Timeline">
      {/* Toolbar */}
      <div style={{
        height: 44, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8,
        borderBottom: `1px solid ${t.line}`,
      }}>
        <Tab label="List" t={t} />
        <Tab active label="Timeline" t={t} />
        <Tab label="Board" t={t} />
        <div style={{ marginLeft: 16, display: 'flex', gap: 4, alignItems: 'center', background: t.panel, padding: 2, borderRadius: 6, border: `1px solid ${t.line}` }}>
          <Seg label="Hour" t={t} />
          <Seg label="Day" active t={t} />
          <Seg label="Week" t={t} />
          <Seg label="Month" t={t} />
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: t.dim, fontSize: 12, marginLeft: 8 }}>
          <span style={{ padding: '3px 7px', border: `1px solid ${t.line}`, borderRadius: 5, fontFamily: t.mono, fontSize: 11 }}>−</span>
          <span style={{ fontFamily: t.mono }}>100%</span>
          <span style={{ padding: '3px 7px', border: `1px solid ${t.line}`, borderRadius: 5, fontFamily: t.mono, fontSize: 11 }}>+</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: t.dim }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, background: t.accent, borderRadius: 2 }}></span>Critical</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, background: t.doing, borderRadius: 2 }}></span>In progress</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 8, height: 8, background: t.done, borderRadius: 2 }}></span>Done</span>
        </div>
      </div>

      {/* Gantt body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Grid (left) */}
        <div style={{ width: 340, flex: '0 0 auto', borderRight: `1px solid ${t.line}` }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 60px 60px',
            padding: '0 12px', height: 56, alignItems: 'center', gap: 8,
            fontSize: 11, color: t.mute, textTransform: 'uppercase', letterSpacing: 0.04,
            borderBottom: `1px solid ${t.line}`,
          }}>
            <span>Task</span><span>Start</span><span>End</span>
          </div>
          {bars.map((b, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '1fr 60px 60px',
              padding: '0 12px', height: 30, alignItems: 'center', gap: 8,
              borderBottom: `1px solid ${t.line}`, fontSize: 12, color: t.dim,
            }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: t.ink }}>{b.label}</span>
              <span style={{ fontFamily: t.mono, fontSize: 11 }}>{`${4 + b.start}/05`}</span>
              <span style={{ fontFamily: t.mono, fontSize: 11 }}>{`${4 + b.start + b.len - 1}/05`}</span>
            </div>
          ))}
        </div>

        {/* Chart (right) */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: cellW * days.length }}>
            {/* Scale rows */}
            <div style={{ height: 28, display: 'flex', borderBottom: `1px solid ${t.line}`, fontSize: 11, color: t.mute, alignItems: 'center' }}>
              <div style={{ width: cellW * 7, padding: '0 10px', borderRight: `1px solid ${t.line}`, textTransform: 'uppercase', letterSpacing: 0.04 }}>04 — 10 May</div>
              <div style={{ width: cellW * 7, padding: '0 10px', borderRight: `1px solid ${t.line}`, color: t.ink, textTransform: 'uppercase', letterSpacing: 0.04 }}>11 — 17 May</div>
              <div style={{ width: cellW * 7, padding: '0 10px', borderRight: `1px solid ${t.line}`, textTransform: 'uppercase', letterSpacing: 0.04 }}>18 — 24 May</div>
              <div style={{ width: cellW * 7, padding: '0 10px', textTransform: 'uppercase', letterSpacing: 0.04 }}>25 — 31 May</div>
            </div>
            <div style={{ height: 28, display: 'flex', borderBottom: `1px solid ${t.line}` }}>
              {days.map((d, i) => (
                <div key={i} style={{
                  width: cellW, fontSize: 11, color: i === todayCol ? t.accent : t.dim,
                  fontFamily: t.mono, textAlign: 'center', lineHeight: '28px',
                  borderRight: `1px solid ${t.line}`,
                  background: [0,1,7,8,14,15,21,22].includes(i) ? 'oklch(0.21 0.013 270)' : 'transparent',
                }}>{d}</div>
              ))}
            </div>

            {/* Today line */}
            <div style={{
              position: 'absolute', top: 56, bottom: 0, left: cellW * todayCol,
              width: 1, background: t.accent, zIndex: 2, boxShadow: `0 0 8px ${t.accent}`,
            }}>
              <div style={{
                position: 'absolute', top: -16, left: -22, width: 44, textAlign: 'center',
                fontSize: 9, color: t.accentInk, background: t.accent, padding: '1px 4px',
                fontFamily: t.mono, letterSpacing: 0.1, fontWeight: 700, borderRadius: 2, textTransform: 'uppercase',
              }}>Today</div>
            </div>

            {/* Bars */}
            {bars.map((b, i) => (
              <div key={i} style={{ height: 30, position: 'relative', borderBottom: `1px solid ${t.line}` }}>
                {/* row hover band */}
                <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                  {days.map((_, j) => (
                    <div key={j} style={{ width: cellW, borderRight: `1px solid oklch(0.22 0.012 270 / 0.5)`,
                      background: [0,1,7,8,14,15,21,22].includes(j) ? 'oklch(0.20 0.012 270 / 0.5)' : 'transparent' }} />
                  ))}
                </div>
                <div style={{
                  position: 'absolute', top: 5, left: cellW * b.start, width: cellW * b.len - 2, height: 20,
                  background: 'oklch(0.30 0.013 270)', borderRadius: 4, overflow: 'hidden',
                  border: `1px solid ${b.tone === t.accent ? t.accent : t.line}`,
                  display: 'flex', alignItems: 'center', padding: '0 8px',
                  fontSize: 11, color: t.ink, whiteSpace: 'nowrap',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0, width: `${b.done * 100}%`,
                    background: b.tone, opacity: b.tone === t.accent ? 0.28 : 0.35,
                  }}></div>
                  <span style={{ position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
                  <span style={{ marginLeft: 'auto', position: 'relative', color: t.dim, fontFamily: t.mono, fontSize: 10, paddingLeft: 8 }}>{Math.round(b.done * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Resource histogram */}
      <div style={{ borderTop: `1px solid ${t.line}`, background: t.panel, display: 'flex', height: 76 }}>
        <div style={{ width: 340, padding: '12px 14px', borderRight: `1px solid ${t.line}`, fontSize: 12 }}>
          <div style={{ color: t.mute, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.06 }}>Workload</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 18, height: 18, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)' }}></div>
            <span>Thiago Mágero</span>
            <span style={{ marginLeft: 'auto', color: t.mute, fontFamily: t.mono, fontSize: 11 }}>8h/d · 320h</span>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'flex-end', padding: '8px 0' }}>
          {days.map((_, i) => {
            const v = [4,4,0,0,16,16,16,16,16,12,8,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i] || 0;
            const over = v > 8;
            return (
              <div key={i} style={{ width: cellW, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {v > 0 && <div style={{
                  width: cellW - 8, height: `${Math.min(100, v / 16 * 100)}%`,
                  background: over ? t.high : t.accent, borderRadius: 2,
                }} title={`${v}h`}></div>}
              </div>
            );
          })}
        </div>
      </div>
    </StratosShell>
  );
}

function Seg({ label, active, t }) {
  return (
    <div style={{
      padding: '3px 9px', fontSize: 11, borderRadius: 4, cursor: 'pointer',
      color: active ? t.accentInk : t.dim,
      background: active ? t.accent : 'transparent',
      fontWeight: active ? 600 : 400,
    }}>{label}</div>
  );
}

Object.assign(window, { StratosList, StratosGantt });

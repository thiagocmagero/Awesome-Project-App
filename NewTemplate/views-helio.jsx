/* eslint-disable */
// Direction C — "Helio" · Bright, opinionated SaaS — color-as-data.
// Status as fully-filled cells (Monday-style), strong indigo brand,
// medium density (44px), avatar groups, collapsible status groups.

const helioTokens = {
  bg: 'oklch(0.985 0.003 250)',
  panel: 'oklch(1 0 0)',
  panel2: 'oklch(0.96 0.005 250)',
  line: 'oklch(0.92 0.008 250)',
  ink: 'oklch(0.22 0.02 250)',
  dim: 'oklch(0.48 0.014 250)',
  mute: 'oklch(0.65 0.012 250)',
  brand: 'oklch(0.55 0.20 264)',
  brandSoft: 'oklch(0.94 0.04 264)',
  todo: 'oklch(0.74 0.04 250)',
  todoInk: 'oklch(0.30 0.02 250)',
  doing: 'oklch(0.74 0.16 70)',
  doingInk: 'oklch(0.30 0.10 70)',
  done: 'oklch(0.70 0.16 155)',
  doneInk: 'oklch(0.28 0.10 155)',
  blocked: 'oklch(0.68 0.22 25)',
  blockedInk: 'oklch(0.28 0.12 25)',
  high: 'oklch(0.66 0.22 25)',
  med: 'oklch(0.72 0.16 70)',
  low: 'oklch(0.70 0.10 220)',
  font: '"Geist", "Inter", -apple-system, system-ui, sans-serif',
  mono: '"Geist Mono", ui-monospace, Menlo, monospace',
};

const helioRows = [
  { t: 'Remover ID da tabela em /teams',                   s: '11 mai', e: '13 mai', d: '2d', p: 'Baixa',  st: 'todo'  },
  { t: 'Notificação ao adicionar/remover de projeto',      s: '11 mai', e: '16 mai', d: '5d', p: 'Média',  st: 'doing' },
  { t: 'Implementar sistema de Tags',                      s: '11 mai', e: '16 mai', d: '5d', p: 'Média',  st: 'doing' },
  { t: 'Editor rich text com imagens seguras — Tiptap',    s: '11 mai', e: '16 mai', d: '5d', p: null,     st: 'todo'  },
  { t: 'Implementar feature "Seguir" na task',             s: '11 mai', e: '16 mai', d: '5d', p: 'Baixa',  st: 'todo'  },
  { t: 'Contador da lista de tarefas',                     s: '11 mai', e: '16 mai', d: '5d', p: null,     st: 'todo'  },
  { t: '[urgente] Mudar path S3',                          s: '11 mai', e: '16 mai', d: '5d', p: 'Alta',   st: 'done'  },
  { t: 'Bug — Salvar sem data de início',                  s: '11 mai', e: '16 mai', d: '5d', p: 'Alta',   st: 'done'  },
  { t: 'Regras nas tasks',                                 s: '—',      e: '—',      d: '5d', p: null,     st: 'done'  },
];

const helioStatusMeta = {
  todo:    { label: 'A fazer',     bg: 'oklch(0.94 0.012 250)', ink: 'oklch(0.30 0.02 250)' },
  doing:   { label: 'Em curso',    bg: 'oklch(0.92 0.10 70)',   ink: 'oklch(0.28 0.10 60)' },
  done:    { label: 'Concluído',   bg: 'oklch(0.88 0.13 155)',  ink: 'oklch(0.24 0.10 155)' },
  blocked: { label: 'Bloqueada',   bg: 'oklch(0.88 0.16 25)',   ink: 'oklch(0.28 0.12 25)' },
};

function HelioShell({ children, page }) {
  const t = helioTokens;
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.ink,
      fontFamily: t.font, display: 'flex', overflow: 'hidden', fontSize: 13,
    }}>
      <aside style={{
        width: 64, flex: '0 0 auto', borderRight: `1px solid ${t.line}`, background: t.panel,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0', gap: 6,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: t.brand,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700,
          fontSize: 16, boxShadow: '0 6px 14px -4px ' + t.brand,
        }}>H</div>
        <div style={{ height: 8 }} />
        <HelioIcon icon="▦" active t={t} />
        <HelioIcon icon="◇" t={t} count="3" />
        <HelioIcon icon="◐" t={t} />
        <HelioIcon icon="▤" t={t} />
        <HelioIcon icon="◷" t={t} />
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <HelioIcon icon="?" t={t} />
          <div style={{ width: 30, height: 30, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)' }}></div>
        </div>
      </aside>

      <aside style={{
        width: 220, flex: '0 0 auto', borderRight: `1px solid ${t.line}`,
        padding: '16px 12px', background: t.panel, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '0 6px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 600, letterSpacing: -0.2, fontSize: 14 }}>Acme Studio</div>
          <span style={{ marginLeft: 'auto', color: t.mute, fontSize: 10 }}>▾</span>
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '0 6px 10px' }}>
          <input placeholder="Procurar" style={{
            flex: 1, background: t.panel2, border: 'none', outline: 'none', padding: '6px 10px',
            fontSize: 12, fontFamily: t.font, borderRadius: 6, color: t.ink,
          }} />
        </div>

        <div style={{ padding: '6px 8px', fontSize: 11, color: t.mute, fontWeight: 600, letterSpacing: 0.04 }}>FAVORITOS</div>
        <HelioRow label="Awesome Project" color={t.brand} active t={t} />
        <HelioRow label="Backlog 2026" color="oklch(0.72 0.16 70)" t={t} />

        <div style={{ height: 8 }} />
        <div style={{ padding: '6px 8px', fontSize: 11, color: t.mute, fontWeight: 600, letterSpacing: 0.04, display: 'flex', alignItems: 'center' }}>
          <span>WORKSPACES</span><span style={{ marginLeft: 'auto', fontWeight: 400 }}>+</span>
        </div>
        <HelioRow label="Awesome Project App" color={t.brand} active t={t} expanded>
          <HelioSubRow label="Tarefas" active t={t} />
          <HelioSubRow label="Quadro" t={t} />
          <HelioSubRow label="Linha do tempo" t={t} />
          <HelioSubRow label="Calendário" t={t} />
          <HelioSubRow label="Arquivos" t={t} />
        </HelioRow>
        <HelioRow label="Internal Tools" color={t.todo} t={t} />
        <HelioRow label="Marketing Site" color="oklch(0.66 0.18 320)" t={t} />
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${t.line}`, background: t.panel }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 11, color: t.mute }}>Awesome Project App</div>
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: -0.4 }}>{page}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: -8, marginLeft: 24 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: 999,
                background: ['linear-gradient(135deg,#f4a261,#e76f51)','linear-gradient(135deg,#a8dadc,#457b9d)','linear-gradient(135deg,#ffb4a2,#e5989b)','linear-gradient(135deg,#cdb4db,#9d4edd)'][i],
                border: `2px solid ${t.panel}`, marginLeft: i === 0 ? 0 : -8,
              }}></div>
            ))}
            <div style={{
              width: 28, height: 28, borderRadius: 999, marginLeft: -8,
              background: t.panel2, border: `2px solid ${t.panel}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: t.dim, fontWeight: 600,
            }}>+3</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{
              background: t.panel, border: `1px solid ${t.line}`, color: t.ink,
              padding: '7px 12px', borderRadius: 8, fontSize: 12, fontFamily: t.font, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}><span>⇪</span> Exportar</button>
            <button style={{
              background: t.brand, color: '#fff', border: 'none',
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontFamily: t.font, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              boxShadow: '0 4px 12px -4px ' + t.brand,
            }}><span style={{ fontSize: 15, lineHeight: 0.7 }}>+</span> Nova tarefa</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function HelioIcon({ icon, active, count, t }) {
  return (
    <div style={{
      width: 38, height: 38, borderRadius: 9, position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? t.brandSoft : 'transparent',
      color: active ? t.brand : t.dim, cursor: 'pointer', fontSize: 16,
    }}>
      {icon}
      {count && <div style={{
        position: 'absolute', top: 4, right: 4, width: 14, height: 14, fontSize: 9,
        background: t.brand, color: '#fff', borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600,
      }}>{count}</div>}
    </div>
  );
}

function HelioRow({ label, color, active, children, expanded, t }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px',
        borderRadius: 6, cursor: 'pointer', fontSize: 13,
        background: active && !expanded ? t.brandSoft : 'transparent',
        color: active && !expanded ? t.brand : t.ink,
        fontWeight: active && !expanded ? 600 : 400,
      }}>
        <span style={{ width: 9, height: 9, borderRadius: 3, background: color }}></span>
        <span style={{ flex: 1 }}>{label}</span>
        {expanded && <span style={{ color: t.mute, fontSize: 10 }}>▾</span>}
      </div>
      {expanded && <div style={{ paddingLeft: 16 }}>{children}</div>}
    </div>
  );
}

function HelioSubRow({ label, active, t }) {
  return (
    <div style={{
      padding: '5px 8px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
      background: active ? t.brandSoft : 'transparent',
      color: active ? t.brand : t.dim,
      fontWeight: active ? 600 : 400,
    }}>{label}</div>
  );
}

function HelioList() {
  const t = helioTokens;
  const groups = [
    { name: 'Em curso', key: 'doing', color: t.doing,   rows: helioRows.filter(r => r.st === 'doing') },
    { name: 'A fazer',  key: 'todo',  color: t.todo,    rows: helioRows.filter(r => r.st === 'todo') },
    { name: 'Concluído',key: 'done',  color: t.done,    rows: helioRows.filter(r => r.st === 'done') },
  ];
  const priMeta = { Alta: t.high, Média: t.med, Baixa: t.low };

  return (
    <HelioShell page="Tarefas">
      {/* Filter row */}
      <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, background: t.panel, borderBottom: `1px solid ${t.line}` }}>
        <FilterPill label="Estado" value="Tudo" t={t} />
        <FilterPill label="Prioridade" value="Tudo" t={t} />
        <FilterPill label="Responsável" value="Eu" t={t} active />
        <FilterPill label="+ Adicionar filtro" t={t} dashed />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <ViewToggle label="Lista" active t={t} />
          <ViewToggle label="Quadro" t={t} />
          <ViewToggle label="Linha do tempo" t={t} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {/* Column header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '28px 1fr 130px 90px 90px 70px 110px 80px 36px',
          padding: '0 24px', height: 36, alignItems: 'center', gap: 0,
          background: t.panel, borderBottom: `1px solid ${t.line}`,
          fontSize: 11, color: t.mute, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase',
        }}>
          <span></span><span>Tarefa</span><span>Estado</span><span>Início</span><span>Fim</span><span>Est.</span><span>Prioridade</span><span>Resp.</span><span></span>
        </div>

        {groups.map(g => (
          <div key={g.key}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px',
              fontSize: 12, color: t.ink, background: 'transparent',
              borderBottom: `1px solid ${t.line}`,
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 4, background: g.color }}></span>
              <span style={{ fontWeight: 600 }}>{g.name}</span>
              <span style={{ color: t.mute }}>{g.rows.length}</span>
              <span style={{ marginLeft: 'auto', color: t.mute, fontSize: 11, cursor: 'pointer' }}>+ Adicionar</span>
            </div>
            {g.rows.map((r, i) => {
              const stMeta = helioStatusMeta[r.st];
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '28px 1fr 130px 90px 90px 70px 110px 80px 36px',
                  padding: '0 24px', height: 44, alignItems: 'center',
                  borderBottom: `1px solid ${t.line}`, fontSize: 13, background: t.panel,
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 999,
                    border: `1.5px solid ${r.st === 'done' ? t.done : t.line}`,
                    background: r.st === 'done' ? t.done : 'transparent',
                    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10,
                  }}>{r.st === 'done' ? '✓' : ''}</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13.5 }}>{r.t}</span>
                  <div style={{
                    background: stMeta.bg, color: stMeta.ink, padding: '4px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, textAlign: 'center', maxWidth: 110, marginRight: 12,
                  }}>{stMeta.label}</div>
                  <span style={{ color: t.dim, fontSize: 12, fontFamily: t.mono }}>{r.s}</span>
                  <span style={{ color: t.dim, fontSize: 12, fontFamily: t.mono }}>{r.e}</span>
                  <span style={{ color: t.dim, fontSize: 12, fontFamily: t.mono }}>{r.d}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    {r.p ? (
                      <>
                        <span style={{ width: 12, height: 12, borderRadius: 3, background: priMeta[r.p] }}></span>
                        <span>{r.p}</span>
                      </>
                    ) : <span style={{ color: t.mute }}>—</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)', border: `2px solid ${t.panel}` }}></div>
                    <div style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg,#a8dadc,#457b9d)', border: `2px solid ${t.panel}`, marginLeft: -8 }}></div>
                  </div>
                  <span style={{ color: t.mute, textAlign: 'right' }}>⋯</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </HelioShell>
  );
}

function FilterPill({ label, value, active, dashed, t }) {
  return (
    <div style={{
      padding: '5px 11px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
      border: dashed ? `1px dashed ${t.line}` : `1px solid ${t.line}`,
      background: active ? t.brandSoft : t.panel,
      color: active ? t.brand : t.ink2 || t.ink,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{ color: dashed ? t.mute : t.dim, fontSize: 11 }}>{label}{value && ':'}</span>
      {value && <span style={{ fontWeight: 600 }}>{value}</span>}
      {!dashed && <span style={{ color: t.mute, fontSize: 9 }}>▾</span>}
    </div>
  );
}

function ViewToggle({ label, active, t }) {
  return (
    <div style={{
      padding: '5px 11px', borderRadius: 7, fontSize: 12, cursor: 'pointer',
      background: active ? t.panel : 'transparent',
      color: active ? t.ink : t.dim,
      boxShadow: active ? '0 1px 2px rgba(0,0,0,.06), 0 0 0 1px ' + t.line : 'none',
      fontWeight: active ? 600 : 400,
    }}>{label}</div>
  );
}

function HelioGantt() {
  const t = helioTokens;
  const days = Array.from({ length: 28 }, (_, i) => 4 + i);
  const todayCol = 7;
  const cellW = 28;
  const bars = [
    { label: 'Remover ID — /teams',       start: 7, len: 2, tone: 'done',  done: 1 },
    { label: 'Notificação ao adicionar',  start: 7, len: 5, tone: 'doing', done: 0.5 },
    { label: '[urgente] Mudar path S3',   start: 7, len: 5, tone: 'done',  done: 1, pri: t.high },
    { label: 'Editor rich text Tiptap',   start: 7, len: 5, tone: 'todo',  done: 0 },
    { label: 'Bug — sem data início',     start: 7, len: 5, tone: 'done',  done: 1, pri: t.high },
    { label: 'Sistema de Tags',           start: 7, len: 5, tone: 'doing', done: 0.6 },
    { label: 'Feature "Seguir" na task',  start: 7, len: 5, tone: 'todo',  done: 0 },
    { label: 'Contador lista tarefas',    start: 7, len: 5, tone: 'todo',  done: 0 },
  ];
  const toneMeta = {
    todo:  { bar: t.todo,  ink: t.todoInk },
    doing: { bar: t.doing, ink: t.doingInk },
    done:  { bar: t.done,  ink: t.doneInk },
  };

  return (
    <HelioShell page="Linha do tempo">
      <div style={{ padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8, background: t.panel, borderBottom: `1px solid ${t.line}` }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: t.panel2, borderRadius: 8 }}>
          <ViewToggle label="Dia" t={t} />
          <ViewToggle label="Semana" active t={t} />
          <ViewToggle label="Mês" t={t} />
        </div>
        <FilterPill label="Caminho" value="Crítico" t={t} active />
        <FilterPill label="Responsável" value="Eu" t={t} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <ViewToggle label="Lista" t={t} />
          <ViewToggle label="Quadro" t={t} />
          <ViewToggle label="Linha do tempo" active t={t} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 280, flex: '0 0 auto', borderRight: `1px solid ${t.line}`, background: t.panel }}>
          <div style={{
            padding: '0 16px', height: 56, display: 'flex', alignItems: 'center',
            borderBottom: `1px solid ${t.line}`, fontSize: 11, color: t.mute, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase',
          }}>Tarefa</div>
          {bars.map((b, i) => {
            const m = toneMeta[b.tone];
            return (
              <div key={i} style={{ padding: '0 16px', height: 40, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${t.line}` }}>
                {b.pri && <span style={{ width: 4, height: 16, background: b.pri, borderRadius: 2 }}></span>}
                <span style={{ width: 10, height: 10, borderRadius: 3, background: m.bar, flex: '0 0 auto' }}></span>
                <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative', background: t.panel }}>
          <div style={{ width: cellW * days.length }}>
            <div style={{ height: 28, display: 'flex', borderBottom: `1px solid ${t.line}`, fontSize: 11, color: t.mute, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase' }}>
              <div style={{ width: cellW * 7, padding: '0 12px', lineHeight: '28px', borderRight: `1px solid ${t.line}` }}>04 — 10 mai</div>
              <div style={{ width: cellW * 7, padding: '0 12px', lineHeight: '28px', borderRight: `1px solid ${t.line}`, color: t.brand }}>11 — 17 mai</div>
              <div style={{ width: cellW * 7, padding: '0 12px', lineHeight: '28px', borderRight: `1px solid ${t.line}` }}>18 — 24 mai</div>
              <div style={{ width: cellW * 7, padding: '0 12px', lineHeight: '28px' }}>25 — 31 mai</div>
            </div>
            <div style={{ height: 28, display: 'flex', borderBottom: `1px solid ${t.line}` }}>
              {days.map((d, i) => (
                <div key={i} style={{
                  width: cellW, fontSize: 11, color: i === todayCol ? t.brand : t.dim,
                  fontFamily: t.mono, textAlign: 'center', lineHeight: '28px',
                  borderRight: `1px solid ${t.line}`,
                  background: [0,1,7,8,14,15,21,22].includes(i) ? t.panel2 : 'transparent',
                  fontWeight: i === todayCol ? 700 : 400,
                }}>{d}</div>
              ))}
            </div>

            <div style={{
              position: 'absolute', top: 56, bottom: 0, left: cellW * todayCol,
              width: 2, background: t.brand, zIndex: 2,
            }}>
              <div style={{
                position: 'absolute', top: -16, left: -18, width: 38, textAlign: 'center',
                fontSize: 9, color: '#fff', background: t.brand, padding: '2px 4px',
                fontWeight: 700, letterSpacing: 0.1, borderRadius: 4, textTransform: 'uppercase',
              }}>Hoje</div>
            </div>

            {bars.map((b, i) => {
              const m = toneMeta[b.tone];
              return (
                <div key={i} style={{ height: 40, position: 'relative', borderBottom: `1px solid ${t.line}` }}>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                    {days.map((_, j) => (
                      <div key={j} style={{
                        width: cellW, borderRight: `1px solid ${t.line}`, opacity: 0.6,
                        background: [0,1,7,8,14,15,21,22].includes(j) ? t.panel2 : 'transparent',
                      }} />
                    ))}
                  </div>
                  <div style={{
                    position: 'absolute', top: 8, left: cellW * b.start + 2, width: cellW * b.len - 6, height: 24,
                    background: m.bar, borderRadius: 6, overflow: 'hidden',
                    display: 'flex', alignItems: 'center', padding: '0 10px',
                    fontSize: 11.5, color: m.ink, whiteSpace: 'nowrap', fontWeight: 600,
                    boxShadow: '0 1px 0 rgba(0,0,0,.04)',
                  }}>
                    <div style={{
                      position: 'absolute', inset: 0, width: `${b.done * 100}%`,
                      background: 'rgba(0,0,0,.15)',
                    }}></div>
                    <span style={{ position: 'relative', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${t.line}`, background: t.panel, display: 'flex', height: 84 }}>
        <div style={{ width: 280, padding: '14px 16px', borderRight: `1px solid ${t.line}` }}>
          <div style={{ fontSize: 11, color: t.mute, fontWeight: 600, letterSpacing: 0.04, textTransform: 'uppercase' }}>Carga</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)' }}></div>
            <span style={{ fontSize: 13 }}>Thiago Mágero</span>
            <span style={{ marginLeft: 'auto', color: t.high, fontFamily: t.mono, fontSize: 11, fontWeight: 600 }}>320h</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', padding: '8px 0', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: `1px dashed ${t.line}` }}></div>
          {days.map((_, i) => {
            const v = [4,4,0,0,16,16,16,16,16,12,8,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i] || 0;
            const over = v > 8;
            return (
              <div key={i} style={{ width: cellW, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'relative' }}>
                {v > 0 && <div style={{
                  width: cellW - 8, height: `${Math.min(100, v / 16 * 92)}%`,
                  background: over ? t.high : t.brand, borderRadius: 4, opacity: over ? 1 : 0.85,
                }}></div>}
              </div>
            );
          })}
        </div>
      </div>
    </HelioShell>
  );
}

Object.assign(window, { HelioList, HelioGantt });

/* eslint-disable */
// Direction B — "Boreal" · Warm editorial light, refined typography,
// generous density, terracotta accent, subtle teal secondary.
// Status as leading colored bars + text labels, no pills.

const borealTokens = {
  bg: 'oklch(0.965 0.008 80)',
  panel: 'oklch(0.99 0.005 80)',
  panel2: 'oklch(0.93 0.012 80)',
  line: 'oklch(0.88 0.012 80)',
  ink: 'oklch(0.22 0.012 60)',
  dim: 'oklch(0.45 0.012 60)',
  mute: 'oklch(0.62 0.010 60)',
  accent: 'oklch(0.58 0.16 35)',           // terracotta
  accentSoft: 'oklch(0.92 0.05 35)',
  teal: 'oklch(0.55 0.10 200)',
  ink2: 'oklch(0.35 0.012 60)',
  todoBar: 'oklch(0.75 0.05 80)',
  doingBar: 'oklch(0.65 0.13 65)',
  doneBar: 'oklch(0.60 0.10 150)',
  highBar: 'oklch(0.55 0.18 30)',
  font: '"Söhne", "Inter", -apple-system, system-ui, sans-serif',
  display: '"GT Sectra", "Tiempos Headline", "Source Serif Pro", "Iowan Old Style", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
};

const borealRows = [
  { t: 'Remover ID da tabela em /teams',                  s: '11 mai', e: '13 mai', d: '2 dias', p: 'Baixa', st: 'A fazer', bar: 'todoBar' },
  { t: 'Regras nas tasks',                                s: '—',      e: '—',      d: '5 dias', p: null,    st: 'Concluído', bar: 'doneBar' },
  { t: 'Notificação ao adicionar/remover projeto',        s: '11 mai', e: '16 mai', d: '5 dias', p: null,    st: 'Em curso', bar: 'doingBar' },
  { t: '[urgente] Mudar path S3',                         s: '11 mai', e: '16 mai', d: '5 dias', p: 'Alta',  st: 'Concluído', bar: 'doneBar' },
  { t: 'Editor rich text com imagens seguras',            s: '11 mai', e: '16 mai', d: '5 dias', p: 'Média', st: 'A fazer', bar: 'todoBar' },
  { t: 'Bug — Salvar sem data de início',                 s: '11 mai', e: '16 mai', d: '5 dias', p: 'Alta',  st: 'Concluído', bar: 'doneBar' },
  { t: 'Implementar sistema de Tags',                     s: '11 mai', e: '16 mai', d: '5 dias', p: 'Média', st: 'Em curso', bar: 'doingBar' },
  { t: 'Implementar feature "Seguir" na task',            s: '11 mai', e: '16 mai', d: '5 dias', p: null,    st: 'A fazer', bar: 'todoBar' },
];

function BorealShell({ children, page }) {
  const t = borealTokens;
  return (
    <div style={{
      width: '100%', height: '100%', background: t.bg, color: t.ink,
      fontFamily: t.font, display: 'flex', overflow: 'hidden', fontSize: 13,
    }}>
      <aside style={{
        width: 212, flex: '0 0 auto', borderRight: `1px solid ${t.line}`,
        padding: '18px 14px', display: 'flex', flexDirection: 'column', gap: 1, background: t.bg,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '0 4px 18px' }}>
          <span style={{ fontFamily: t.display, fontSize: 22, fontWeight: 500, letterSpacing: -0.6 }}>Boreal</span>
          <span style={{ color: t.mute, fontSize: 10, letterSpacing: 0.1 }}>v3</span>
        </div>

        <BorSide label="Hoje" icon="◯" t={t} count="4" />
        <BorSide label="Esta semana" icon="◐" t={t} />
        <BorSide label="Próximas" icon="◑" t={t} />
        <BorSide label="Tudo" icon="●" t={t} />

        <div style={{ height: 14 }} />
        <div style={{ fontFamily: t.display, fontSize: 11, color: t.mute, padding: '4px 6px', fontStyle: 'italic' }}>Projetos</div>
        <BorSide label="Awesome Project App" t={t} dot={t.accent} active />
        <BorSide label="Internal Tools" t={t} dot={t.teal} />
        <BorSide label="Marketing Site" t={t} dot="oklch(0.62 0.10 280)" />
        <BorSide label="Brand 2026" t={t} dot="oklch(0.72 0.08 110)" />

        <div style={{ height: 14 }} />
        <div style={{ fontFamily: t.display, fontSize: 11, color: t.mute, padding: '4px 6px', fontStyle: 'italic' }}>Equipa</div>
        <BorSide label="Membros" icon="◇" t={t} />
        <BorSide label="Convidar" icon="✦" t={t} />

        <div style={{ marginTop: 'auto', padding: '12px 4px 0', borderTop: `1px solid ${t.line}`, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontSize: 13 }}>Thiago</span>
            <span style={{ fontSize: 10, color: t.mute }}>Pro plan</span>
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '22px 32px 12px', display: 'flex', alignItems: 'baseline', gap: 14, borderBottom: `1px solid ${t.line}` }}>
          <div>
            <div style={{ fontSize: 11, color: t.mute, letterSpacing: 0.04, textTransform: 'uppercase' }}>Projeto · 30 tarefas</div>
            <h1 style={{ margin: '4px 0 0', fontFamily: t.display, fontSize: 30, fontWeight: 500, letterSpacing: -0.8, lineHeight: 1 }}>
              Awesome Project App <span style={{ color: t.mute, fontStyle: 'italic', fontWeight: 400 }}>· {page}</span>
            </h1>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button style={{
              background: 'transparent', border: `1px solid ${t.line}`, color: t.ink2,
              padding: '8px 14px', borderRadius: 999, fontSize: 12, fontFamily: t.font, cursor: 'pointer',
            }}>Exportar</button>
            <button style={{
              background: t.ink, color: t.bg, border: 'none', padding: '8px 16px', borderRadius: 999,
              fontSize: 12, fontFamily: t.font, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>Nova tarefa</button>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

function BorSide({ label, icon, count, dot, active, t }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
      borderRadius: 6, cursor: 'pointer',
      color: active ? t.ink : t.ink2,
      background: active ? t.panel2 : 'transparent',
    }}>
      {icon && <span style={{ width: 12, color: t.mute, fontSize: 11 }}>{icon}</span>}
      {dot && <span style={{ width: 8, height: 8, borderRadius: 2, background: dot, display: 'inline-block' }}></span>}
      <span style={{ flex: 1, fontSize: 13, letterSpacing: -0.1 }}>{label}</span>
      {count && <span style={{ fontSize: 11, color: t.mute, fontFamily: t.mono }}>{count}</span>}
    </div>
  );
}

function BorealList() {
  const t = borealTokens;
  return (
    <BorealShell page="Tarefas">
      {/* Filter strip */}
      <div style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${t.line}` }}>
        <div style={{ display: 'flex', gap: 4, padding: 3, background: t.panel2, borderRadius: 999 }}>
          <BorPill active label="Tudo" count="30" t={t} />
          <BorPill label="A fazer" count="21" t={t} />
          <BorPill label="Em curso" count="3"  t={t} />
          <BorPill label="Concluído" count="7" t={t} />
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10, color: t.dim, fontSize: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: t.display, fontStyle: 'italic' }}>agrupado por</span>
            <span style={{ color: t.ink, textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>estado</span>
          </span>
          <span style={{ width: 1, height: 16, background: t.line }}></span>
          <input placeholder="Procurar…" style={{
            background: 'transparent', border: 'none', outline: 'none', color: t.ink,
            fontSize: 13, fontFamily: t.font, fontStyle: 'italic',
          }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '8px 0' }}>
        <div style={{ padding: '14px 32px 6px', display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontFamily: t.display, fontSize: 18, fontWeight: 500 }}>A fazer</span>
          <span style={{ color: t.mute, fontFamily: t.mono, fontSize: 12 }}>21</span>
        </div>
        <div>
          {borealRows.map((r, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '4px 1fr 90px 90px 80px 100px 60px 100px',
              alignItems: 'center', padding: '0 32px 0 0', height: 52,
              borderBottom: `1px solid ${t.line}`, fontSize: 13,
            }}>
              <div style={{ height: '60%', background: t[r.bar], marginLeft: 16 }}></div>
              <div style={{ padding: '0 12px 0 16px', minWidth: 0 }}>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, letterSpacing: -0.1 }}>{r.t}</div>
                <div style={{ color: t.mute, fontSize: 11, marginTop: 2, fontFamily: t.display, fontStyle: 'italic' }}>
                  #{1320 + i} · criada há 2 dias · {r.st}
                </div>
              </div>
              <span style={{ fontFamily: t.mono, color: t.dim, fontSize: 12 }}>{r.s}</span>
              <span style={{ fontFamily: t.mono, color: t.dim, fontSize: 12 }}>{r.e}</span>
              <span style={{ fontFamily: t.mono, color: t.dim, fontSize: 12 }}>{r.d}</span>
              <span style={{ color: r.p === 'Alta' ? t.accent : t.dim, fontSize: 12 }}>
                {r.p ? <><span style={{ width: 6, height: 6, background: 'currentColor', borderRadius: 999, display: 'inline-block', marginRight: 6 }}></span>{r.p}</> : ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 24, height: 24, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)' }}></div>
              </div>
              <span style={{ color: t.mute, textAlign: 'right', letterSpacing: 2 }}>⋯</span>
            </div>
          ))}
        </div>
      </div>
    </BorealShell>
  );
}

function BorPill({ label, count, active, t }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
      borderRadius: 999, fontSize: 12, cursor: 'pointer',
      background: active ? t.panel : 'transparent',
      color: active ? t.ink : t.ink2,
      boxShadow: active ? '0 1px 2px rgba(0,0,0,.06)' : 'none',
    }}>
      <span>{label}</span>
      {count && <span style={{ color: t.mute, fontFamily: t.mono, fontSize: 11 }}>{count}</span>}
    </div>
  );
}

function BorealGantt() {
  const t = borealTokens;
  const days = Array.from({ length: 28 }, (_, i) => 4 + i);
  const todayCol = 7;
  const cellW = 28;
  const bars = [
    { label: 'Remover ID da tabela em /teams', start: 7, len: 2, tone: t.doneBar, done: 1 },
    { label: 'Notificação ao adicionar projeto', start: 7, len: 5, tone: t.doingBar, done: 0.5 },
    { label: '[urgente] Mudar path S3',         start: 7, len: 5, tone: t.doneBar, done: 1, p: 'high' },
    { label: 'Editor rich text com imagens',    start: 7, len: 5, tone: t.todoBar, done: 0 },
    { label: 'Bug — Salvar sem data de início', start: 7, len: 5, tone: t.doneBar, done: 1, p: 'high' },
    { label: 'Implementar sistema de Tags',     start: 7, len: 5, tone: t.doingBar, done: 0.6 },
    { label: 'Feature "Seguir" na task',        start: 7, len: 5, tone: t.todoBar, done: 0 },
    { label: 'Contador da lista de tarefas',    start: 7, len: 5, tone: t.todoBar, done: 0 },
  ];

  return (
    <BorealShell page="Linha do tempo">
      {/* Toolbar */}
      <div style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: `1px solid ${t.line}` }}>
        <div style={{ display: 'flex', gap: 3, padding: 3, background: t.panel2, borderRadius: 999 }}>
          <BorPill label="Dia" active t={t} />
          <BorPill label="Semana" t={t} />
          <BorPill label="Mês" t={t} />
        </div>
        <div style={{ color: t.dim, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, fontFamily: t.display, fontStyle: 'italic' }}>
          a mostrar <span style={{ color: t.ink, fontStyle: 'normal', fontFamily: t.font }}>04 mai – 31 mai</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', fontSize: 12, color: t.dim }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 6, background: t.todoBar, borderRadius: 3 }}></span>A fazer</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 6, background: t.doingBar, borderRadius: 3 }}></span>Em curso</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 6, background: t.doneBar, borderRadius: 3 }}></span>Concluído</span>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Grid */}
        <div style={{ width: 340, flex: '0 0 auto', borderRight: `1px solid ${t.line}` }}>
          <div style={{ padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${t.line}`, fontFamily: t.display, fontSize: 13, fontStyle: 'italic', color: t.mute }}>
            8 tarefas planeadas
          </div>
          {bars.map((b, i) => (
            <div key={i} style={{ padding: '0 24px', height: 38, display: 'flex', alignItems: 'center', borderBottom: `1px solid ${t.line}` }}>
              {b.p === 'high' && <span style={{ width: 4, height: 14, background: t.highBar, marginRight: 8 }}></span>}
              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.label}</span>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: cellW * days.length }}>
            <div style={{ height: 30, display: 'flex', borderBottom: `1px solid ${t.line}`, fontFamily: t.display, fontSize: 13, color: t.dim, alignItems: 'center', fontStyle: 'italic' }}>
              <div style={{ width: cellW * 7, padding: '0 12px', borderRight: `1px solid ${t.line}` }}>04 — 10 maio</div>
              <div style={{ width: cellW * 7, padding: '0 12px', borderRight: `1px solid ${t.line}`, color: t.ink, fontStyle: 'normal' }}>11 — 17 maio</div>
              <div style={{ width: cellW * 7, padding: '0 12px', borderRight: `1px solid ${t.line}` }}>18 — 24 maio</div>
              <div style={{ width: cellW * 7, padding: '0 12px' }}>25 — 31 maio</div>
            </div>
            <div style={{ height: 30, display: 'flex', borderBottom: `1px solid ${t.line}` }}>
              {days.map((d, i) => (
                <div key={i} style={{
                  width: cellW, fontSize: 11, color: i === todayCol ? t.accent : t.mute, fontFamily: t.mono,
                  textAlign: 'center', lineHeight: '30px', borderRight: `1px solid ${t.line}`,
                  background: [0,1,7,8,14,15,21,22].includes(i) ? t.panel2 : 'transparent',
                  fontWeight: i === todayCol ? 600 : 400,
                }}>{d}</div>
              ))}
            </div>

            {/* Today line */}
            <div style={{ position: 'absolute', top: 60, bottom: 0, left: cellW * todayCol, width: 1, background: t.accent, zIndex: 2 }}>
              <div style={{ position: 'absolute', top: -18, left: -16, width: 32, textAlign: 'center', fontSize: 10, fontFamily: t.display, fontStyle: 'italic', color: t.accent }}>hoje</div>
            </div>

            {bars.map((b, i) => (
              <div key={i} style={{ height: 38, position: 'relative', borderBottom: `1px solid ${t.line}` }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
                  {days.map((_, j) => (
                    <div key={j} style={{
                      width: cellW,
                      borderRight: `1px solid ${t.line}`,
                      background: [0,1,7,8,14,15,21,22].includes(j) ? t.panel2 : 'transparent', opacity: 0.4,
                    }} />
                  ))}
                </div>
                <div style={{
                  position: 'absolute', top: 9, left: cellW * b.start + 1, width: cellW * b.len - 4, height: 20,
                  background: t.panel, border: `1px solid ${t.line}`, borderRadius: 10, overflow: 'hidden',
                  display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 11,
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${b.done * 100}%`, background: b.tone, opacity: 0.30 }}></div>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: b.tone }}></div>
                  <span style={{ position: 'relative', color: t.ink, fontFamily: t.font, paddingLeft: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {b.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Workload */}
      <div style={{ borderTop: `1px solid ${t.line}`, background: t.panel, display: 'flex', height: 84 }}>
        <div style={{ width: 340, padding: '14px 24px', borderRight: `1px solid ${t.line}` }}>
          <div style={{ fontFamily: t.display, fontStyle: 'italic', color: t.mute, fontSize: 12 }}>Carga de trabalho</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 22, height: 22, borderRadius: 999, background: 'linear-gradient(135deg,#f4a261,#e76f51)' }}></div>
            <span style={{ fontSize: 13 }}>Thiago Mágero</span>
            <span style={{ marginLeft: 'auto', color: t.mute, fontFamily: t.mono, fontSize: 11 }}>320h</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', padding: '8px 0' }}>
          {days.map((_, i) => {
            const v = [4,4,0,0,16,16,16,16,16,12,8,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0][i] || 0;
            const over = v > 8;
            return (
              <div key={i} style={{ width: cellW, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                {v > 0 && <div style={{
                  width: cellW - 10, height: `${Math.min(100, v / 16 * 88)}%`,
                  background: over ? t.highBar : t.doingBar, opacity: over ? 1 : 0.7, borderRadius: 2,
                }}></div>}
              </div>
            );
          })}
        </div>
      </div>
    </BorealShell>
  );
}

Object.assign(window, { BorealList, BorealGantt });

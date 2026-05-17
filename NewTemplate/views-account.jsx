/* eslint-disable */
// AWP — Account settings (top-level, opened from user menu).
// Sections: Conta · Região e Idioma · Notificações · Segurança.
// Plus a persistent "Alterar Senha" card in the sub-nav.

const { useState: useStateA, useEffect: useEffectA } = React;

const accountCss = `
.acc-page { flex: 1; overflow: auto; background: var(--bg); display: flex; flex-direction: column; }
.acc-head {
  padding: 22px 28px 18px;
  background: var(--panel);
  border-bottom: 1px solid var(--line);
}
.acc-head .title { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; display: flex; align-items: center; gap: 10px; }
.acc-head .sub { font-size: 13px; color: var(--dim); margin-top: 4px; }

.acc-body {
  flex: 1; padding: 22px 28px 40px;
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 22px;
  align-items: flex-start;
  overflow: auto;
}

/* Left rail */
.acc-rail { display: flex; flex-direction: column; gap: 14px; }
.acc-nav {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 6px;
  display: flex; flex-direction: column; gap: 2px;
  box-shadow: var(--shadow-card);
}
.acc-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13.5px; font-weight: 500;
  color: var(--ink2);
  transition: background .12s, color .12s;
}
.acc-nav-item:hover { background: var(--panel2); color: var(--ink); }
.acc-nav-item.active {
  background: var(--brand);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 1px 0 oklch(0.40 0.18 264 / .35);
}
.acc-nav-item .ic { width: 16px; display: inline-flex; }

.acc-pw {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 16px 16px;
  box-shadow: var(--shadow-card);
}
.acc-pw .title { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.acc-pw .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
.acc-pw .field label { font-size: 12px; color: var(--dim); }
.acc-pw .field input {
  height: 36px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-family: var(--font); font-size: 13px;
}
.acc-pw .field input:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.acc-pw .meter {
  height: 4px; border-radius: 999px; background: var(--panel3);
  overflow: hidden; margin-top: 6px;
}
.acc-pw .meter .fill { height: 100%; border-radius: 999px; transition: width .2s, background .2s; }
.acc-pw .meter-lab { font-size: 11px; margin-top: 4px; color: var(--dim); }
.acc-pw .submit {
  width: 100%; height: 36px;
  border-radius: 8px;
  background: var(--brand); color: #fff; border: none;
  font-weight: 600; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
}
.acc-pw .submit:hover { background: var(--brandHover); }
.acc-pw .submit:disabled { opacity: 0.5; cursor: not-allowed; }

/* Right content panels */
.acc-section {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
}
.acc-section .sec-head {
  padding: 16px 22px;
  border-bottom: 1px solid var(--lineSoft);
}
.acc-section .sec-head .tt { font-size: 16px; font-weight: 600; }
.acc-section .sec-head .sd { font-size: 12.5px; color: var(--dim); margin-top: 2px; }
.acc-section .sec-body { padding: 20px 22px 22px; }

/* Generic fields used in all panels */
.acc-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.acc-field label.lab { font-size: 12px; font-weight: 600; color: var(--ink2); }
.acc-field input, .acc-field select {
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--panel);
  color: var(--ink);
  font-family: var(--font); font-size: 13.5px;
}
.acc-field input:focus, .acc-field select:focus { outline: none; border-color: var(--brand); box-shadow: 0 0 0 3px var(--brandSoft); }
.acc-field input:disabled { background: var(--panel2); color: var(--dim); cursor: not-allowed; }
.acc-field .hint { font-size: 11.5px; color: var(--mute); margin-top: 2px; line-height: 1.45; }
.acc-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.acc-avatar-row {
  display: flex; align-items: center; gap: 16px;
  padding: 6px 0 18px;
  border-bottom: 1px solid var(--lineSoft);
  margin-bottom: 18px;
}
.acc-avatar {
  width: 72px; height: 72px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  font-size: 24px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  flex: 0 0 auto;
  background-image: linear-gradient(135deg, oklch(0.62 0.18 264), oklch(0.55 0.22 290));
}
.acc-avatar .nm { user-select: none; }
.acc-avatar-row .who { flex: 1; min-width: 0; }
.acc-avatar-row .who .nm { font-size: 15px; font-weight: 600; color: var(--ink); }
.acc-avatar-row .who .em { font-size: 12.5px; color: var(--dim); margin-top: 2px; }
.acc-avatar-row .actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }

.acc-btn-primary {
  height: 36px; padding: 0 16px;
  border-radius: 8px;
  background: var(--brand); color: #fff; border: none;
  font-weight: 600; font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
}
.acc-btn-primary:hover { background: var(--brandHover); }
.acc-btn-ghost {
  height: 32px; padding: 0 12px;
  border-radius: 7px;
  background: var(--panel); color: var(--ink2); border: 1px solid var(--line);
  font-size: 13px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.acc-btn-ghost:hover { background: var(--panel2); color: var(--ink); }
.acc-btn-link {
  background: transparent; border: none;
  color: oklch(0.50 0.20 25); font-weight: 500; font-size: 13px;
  cursor: pointer; padding: 0 6px; height: 32px;
}
.acc-btn-link:hover { text-decoration: underline; }
[data-theme="dark"] .acc-btn-link { color: oklch(0.78 0.18 25); }

.acc-save-row {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--lineSoft);
  display: flex; gap: 10px; justify-content: flex-start;
}

/* Notifications table */
.notif-tbl-wrap { margin: -6px -2px 0; overflow-x: auto; }
.notif-tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.notif-tbl th, .notif-tbl td {
  padding: 12px 12px;
  text-align: left;
  border-bottom: 1px solid var(--lineSoft);
  vertical-align: middle;
}
.notif-tbl th {
  font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--mute);
  background: var(--panel2);
  border-bottom: 1px solid var(--line);
}
.notif-tbl th.col-c, .notif-tbl td.col-c { text-align: center; width: 90px; }
.notif-tbl td.tname { font-weight: 600; color: var(--ink); }
.notif-tbl td.tdesc { color: var(--dim); }
.notif-tbl tr:last-child td { border-bottom: none; }
.notif-tbl tr.section td {
  background: var(--panel2);
  font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--mute);
  padding: 10px 12px;
}

.acc-check {
  width: 18px; height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--line);
  background: var(--panel);
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  color: transparent;
  transition: background .14s, border-color .14s, color .14s;
}
.acc-check.on { background: var(--brand); border-color: var(--brand); color: #fff; }
.acc-check.disabled { opacity: 0.4; cursor: not-allowed; }

.pp-pill.soon {
  background: oklch(0.94 0.06 35); color: oklch(0.42 0.16 35);
  font-size: 10px; padding: 2px 7px;
}
[data-theme="dark"] .pp-pill.soon { background: oklch(0.32 0.10 35 / 0.45); color: oklch(0.86 0.14 35); }

/* Security panel */
.acc-sec-row {
  display: flex; align-items: center; gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid var(--lineSoft);
}
.acc-sec-row:last-child { border-bottom: none; }
.acc-sec-row .body { flex: 1; min-width: 0; }
.acc-sec-row .nm { font-size: 14px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 8px; }
.acc-sec-row .sd { font-size: 12.5px; color: var(--dim); margin-top: 3px; max-width: 60ch; line-height: 1.45; }

/* Sub-row (nested option). Slight indent + subtle background to show it depends
   on the row above. */
.acc-sec-row.acc-sec-sub {
  padding-left: 32px;
  background: var(--panel2);
  margin: 0 -22px;
  padding-right: 22px;
  padding-left: calc(22px + 28px);
  border-radius: 0;
}

/* Toggle switch matching the rest of the design system */
.acc-switch {
  width: 38px; height: 22px;
  background: var(--panel3);
  border-radius: 999px;
  position: relative;
  cursor: pointer;
  border: none;
  padding: 0;
  transition: background .15s ease;
  flex: 0 0 auto;
}
.acc-switch::after {
  content: '';
  position: absolute; left: 2px; top: 2px;
  width: 18px; height: 18px;
  background: #fff;
  border-radius: 999px;
  transition: left .15s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,.18);
}
.acc-switch.on { background: var(--brand); }
.acc-switch.on::after { left: 18px; }

.acc-session {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  margin-top: 10px;
}
.acc-session + .acc-session { margin-top: 8px; }
.acc-session .ic {
  width: 36px; height: 36px;
  border-radius: 9px;
  background: var(--panel2); color: var(--ink2);
  display: inline-flex; align-items: center; justify-content: center;
  flex: 0 0 auto;
}
.acc-session.current .ic { background: var(--brandSoft); color: var(--brand); }
.acc-session .body { flex: 1; min-width: 0; }
.acc-session .nm { font-size: 13.5px; font-weight: 600; color: var(--ink); display: flex; align-items: center; gap: 8px; }
.acc-session .nm .pp-pill { padding: 1px 7px; font-size: 10px; }
.acc-session .sd { font-size: 11.5px; color: var(--dim); margin-top: 2px; font-family: var(--mono); }

@media (max-width: 1024px) {
  .acc-head { padding: 16px 16px 12px; }
  .acc-body { padding: 16px 16px 24px; grid-template-columns: 1fr; }
  .acc-row-2 { grid-template-columns: 1fr; }
}
`;

// ============================================================
// Sub-panels
// ============================================================

function AccountPanel({ user, onSave }) {
  const [name,    setName]    = useStateA(user.name);
  const [phone,   setPhone]   = useStateA(user.phone || '');
  const [website, setWebsite] = useStateA(user.website || '');
  const [address, setAddress] = useStateA(user.address || '');
  const [savedTick, setSavedTick] = useStateA(false);

  function save() {
    onSave({ ...user, name, phone, website, address });
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1400);
  }
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase() || 'U';

  return (
    <div className="acc-section">
      <div className="sec-head">
        <div className="tt">Conta</div>
        <div className="sd">Informação visível para colegas e usada em menções e atribuições.</div>
      </div>
      <div className="sec-body">
        <div className="acc-avatar-row">
          <div className="acc-avatar"><span className="nm">{initials}</span></div>
          <div className="who">
            <div className="nm">{name || 'Sem nome'}</div>
            <div className="em">{user.email}</div>
            <div className="actions">
              <button className="acc-btn-ghost">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                Alterar foto
              </button>
              <button className="acc-btn-link">Remover foto</button>
            </div>
          </div>
        </div>

        <div className="acc-row-2">
          <div className="acc-field">
            <label className="lab">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="acc-field">
            <label className="lab">Email</label>
            <input value={user.email} disabled />
            <span className="hint">O email é usado para iniciar sessão e não pode ser alterado aqui.</span>
          </div>
          <div className="acc-field">
            <label className="lab">Telemóvel</label>
            <input placeholder="+351 ..." value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="acc-field">
            <label className="lab">Website</label>
            <input placeholder="https://" value={website} onChange={e => setWebsite(e.target.value)} />
          </div>
        </div>
        <div className="acc-field">
          <label className="lab">Endereço</label>
          <input placeholder="Rua, número, cidade…" value={address} onChange={e => setAddress(e.target.value)} />
        </div>

        <div className="acc-save-row">
          <button className="acc-btn-primary" onClick={save}>
            {savedTick ? (
              <React.Fragment>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Alterações guardadas
              </React.Fragment>
            ) : 'Guardar alterações'}
          </button>
        </div>
      </div>
    </div>
  );
}

const accTimezones = [
  'Europe/Lisbon — UTC+1',
  'Europe/Madrid — UTC+1',
  'Europe/London — UTC+0',
  'America/Sao_Paulo — UTC-3',
  'America/New_York — UTC-5',
  'America/Los_Angeles — UTC-8',
  'Asia/Tokyo — UTC+9',
];
const accLangs = ['Português (PT)','Português (BR)','English','Español','Français','Deutsch'];
const accDateFmts = ['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD'];
const accFirstDay = ['Segunda-feira','Domingo'];

function RegionPanel() {
  const [tz, setTz] = useStateA(accTimezones[0]);
  const [lang, setLang] = useStateA(accLangs[0]);
  const [df,   setDf]   = useStateA(accDateFmts[0]);
  const [fd,   setFd]   = useStateA(accFirstDay[0]);
  const [tf,   setTf]   = useStateA('24h');

  return (
    <div className="acc-section">
      <div className="sec-head">
        <div className="tt">Região e idioma</div>
        <div className="sd">Determinam como datas, números e e-mails transacionais lhe são apresentados.</div>
      </div>
      <div className="sec-body">
        <div className="acc-field">
          <label className="lab">Fuso horário</label>
          <select value={tz} onChange={e => setTz(e.target.value)}>
            {accTimezones.map(t => <option key={t}>{t}</option>)}
          </select>
          <span className="hint">Usado em páginas globais (notificações, sessões) e como padrão ao criar novos projetos. Dentro de um projeto, o fuso do projeto tem prioridade.</span>
        </div>

        <div className="acc-field">
          <label className="lab">Idioma da aplicação</label>
          <select value={lang} onChange={e => setLang(e.target.value)}>
            {accLangs.map(l => <option key={l}>{l}</option>)}
          </select>
          <span className="hint">Usado em toda a aplicação e nos e-mails transacionais. Por padrão usa o idioma do navegador até alterar aqui.</span>
        </div>

        <div className="acc-row-2">
          <div className="acc-field">
            <label className="lab">Formato de data</label>
            <select value={df} onChange={e => setDf(e.target.value)}>
              {accDateFmts.map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="acc-field">
            <label className="lab">Formato de hora</label>
            <select value={tf} onChange={e => setTf(e.target.value)}>
              <option value="24h">24 horas (14:30)</option>
              <option value="12h">12 horas (2:30 PM)</option>
            </select>
          </div>
        </div>

        <div className="acc-field">
          <label className="lab">Primeiro dia da semana</label>
          <select value={fd} onChange={e => setFd(e.target.value)}>
            {accFirstDay.map(x => <option key={x}>{x}</option>)}
          </select>
        </div>

        <div className="acc-save-row">
          <button className="acc-btn-primary">Guardar preferências</button>
        </div>
      </div>
    </div>
  );
}

const notifGroups = [
  {
    label: 'Atividade em tarefas',
    rows: [
      { key: 'mention',  name: 'Menções',                 desc: 'Quando é mencionado num comentário.' },
      { key: 'assign',   name: 'Atribuição de tarefas',   desc: 'Quando lhe é atribuída uma tarefa.' },
      { key: 'comment',  name: 'Reações a comentários',   desc: 'Quando alguém reage a um comentário seu.' },
      { key: 'status',   name: 'Alterações de estado',    desc: 'Tarefas que segue mudam de estado.' },
    ],
  },
  {
    label: 'Convites e projetos',
    rows: [
      { key: 'inv-recv', name: 'Convites de projeto',     desc: 'Quando recebe um convite para um projeto.' },
      { key: 'inv-acc',  name: 'Convite aceite',          desc: 'Quando alguém aceita o seu convite.' },
      { key: 'inv-rej',  name: 'Convite recusado',        desc: 'Quando alguém recusa o seu convite.' },
    ],
  },
  {
    label: 'Timesheets',
    rows: [
      { key: 'ts-sub',   name: 'Envios de timesheet',     desc: 'Quando alguém submete uma timesheet para aprovação.' },
      { key: 'ts-apr',   name: 'Aprovações totais',       desc: 'Quando a sua timesheet é totalmente aprovada.' },
      { key: 'ts-par',   name: 'Aprovações parciais',     desc: 'Quando parte da sua timesheet é aprovada.' },
      { key: 'ts-rej',   name: 'Rejeições de timesheet',  desc: 'Quando parte da sua timesheet é rejeitada.' },
    ],
  },
];

function NotificationsPanel() {
  const [prefs, setPrefs] = useStateA(() => {
    const map = {};
    notifGroups.forEach(g => g.rows.forEach(r => {
      map[r.key] = { app: true, email: true, browser: false };
    }));
    return map;
  });
  function toggle(key, channel) {
    if (channel === 'browser') return; // "Em breve"
    setPrefs(s => ({ ...s, [key]: { ...s[key], [channel]: !s[key][channel] } }));
  }
  function setAll(channel, value) {
    if (channel === 'browser') return;
    setPrefs(s => {
      const cp = { ...s };
      Object.keys(cp).forEach(k => { cp[k] = { ...cp[k], [channel]: value }; });
      return cp;
    });
  }

  return (
    <div className="acc-section">
      <div className="sec-head">
        <div className="tt">Notificações</div>
        <div className="sd">Escolha como prefere ser avisado para cada tipo de evento.</div>
      </div>
      <div className="sec-body">
        <div className="notif-tbl-wrap">
          <table className="notif-tbl">
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Tipo de notificação</th>
                <th>Descrição</th>
                <th className="col-c">No aplicativo</th>
                <th className="col-c">E-mail</th>
                <th className="col-c">Navegador <span className="pp-pill soon">Em breve</span></th>
              </tr>
            </thead>
            <tbody>
              {notifGroups.map(g => (
                <React.Fragment key={g.label}>
                  <tr className="section"><td colSpan="5">{g.label}</td></tr>
                  {g.rows.map(r => {
                    const p = prefs[r.key];
                    return (
                      <tr key={r.key}>
                        <td className="tname">{r.name}</td>
                        <td className="tdesc">{r.desc}</td>
                        <td className="col-c"><span className={'acc-check' + (p.app ? ' on' : '')} onClick={() => toggle(r.key, 'app')}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span></td>
                        <td className="col-c"><span className={'acc-check' + (p.email ? ' on' : '')} onClick={() => toggle(r.key, 'email')}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span></td>
                        <td className="col-c"><span className="acc-check disabled" title="Em breve"></span></td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
              <tr>
                <td colSpan="2" style={{ fontWeight: 600 }}>Selecionar tudo no canal</td>
                <td className="col-c">
                  <button className="acc-btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 11 }} onClick={() => setAll('app', true)}>Tudo</button>
                </td>
                <td className="col-c">
                  <button className="acc-btn-ghost" style={{ height: 26, padding: '0 10px', fontSize: 11 }} onClick={() => setAll('email', true)}>Tudo</button>
                </td>
                <td className="col-c"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SecurityPanel() {
  return (
    <div className="acc-section">
      <div className="sec-head">
        <div className="tt">Segurança</div>
        <div className="sd">Proteja a sua conta com camadas adicionais e gerencie as sessões ativas.</div>
      </div>
      <div className="sec-body">
        <div className="acc-sec-row">
          <div className="body">
            <div className="nm">
              Autenticação de dois fatores
              <span className="pp-pill soon">Em breve</span>
            </div>
            <div className="sd">Quando ativada, será solicitado um código adicional via app autenticadora sempre que iniciar sessão num novo dispositivo.</div>
          </div>
          <button className="acc-btn-ghost" disabled style={{ opacity: 0.55, cursor: 'not-allowed' }}>Configurar</button>
        </div>

        <div className="acc-sec-row">
          <div className="body">
            <div className="nm">Sessões ativas</div>
            <div className="sd">Dispositivos e localizações atualmente com sessão iniciada. Termine sessões que não reconheça.</div>

            <div className="acc-session current">
              <div className="ic">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
              </div>
              <div className="body">
                <div className="nm">MacBook Pro · Chrome <span className="pp-pill st-active">Esta sessão</span></div>
                <div className="sd">Lisboa, PT · 192.168.1.42 · há 4 minutos</div>
              </div>
            </div>
            <div className="acc-session">
              <div className="ic">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
              </div>
              <div className="body">
                <div className="nm">iPhone 14 · Safari</div>
                <div className="sd">Porto, PT · 2.81.12.34 · ontem às 22:14</div>
              </div>
              <button className="acc-btn-link">Terminar sessão</button>
            </div>
            <div className="acc-session">
              <div className="ic">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/></svg>
              </div>
              <div className="body">
                <div className="nm">Windows · Edge</div>
                <div className="sd">Lisboa, PT · 88.157.22.10 · há 3 dias</div>
              </div>
              <button className="acc-btn-link">Terminar sessão</button>
            </div>

            <div style={{ marginTop: 14 }}>
              <button className="acc-btn-link" style={{ paddingLeft: 0 }}>Terminar todas as outras sessões</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Password card
// ============================================================

function PasswordCard() {
  const [cur, setCur] = useStateA('');
  const [n1,  setN1]  = useStateA('');
  const [n2,  setN2]  = useStateA('');

  function strengthOf(pw) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s; // 0..5
  }
  const strength = strengthOf(n1);
  const strengthLab = ['Muito fraca','Fraca','Razoável','Boa','Forte','Excelente'][strength];
  const strengthColor = ['oklch(0.65 0.20 25)','oklch(0.65 0.20 25)','oklch(0.72 0.16 70)','oklch(0.70 0.14 90)','oklch(0.65 0.16 155)','oklch(0.62 0.16 155)'][strength];
  const match = n1.length > 0 && n1 === n2;
  const canSubmit = cur.length > 0 && strength >= 2 && match;

  return (
    <div className="acc-pw">
      <div className="title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Alterar senha
      </div>
      <div className="field">
        <label>Senha atual</label>
        <input type="password" value={cur} onChange={e => setCur(e.target.value)} placeholder="••••••••" />
      </div>
      <div className="field">
        <label>Nova senha</label>
        <input type="password" value={n1} onChange={e => setN1(e.target.value)} placeholder="Mínimo 8 caracteres" />
        {n1 && (
          <React.Fragment>
            <div className="meter"><div className="fill" style={{ width: `${(strength / 5) * 100}%`, background: strengthColor }}></div></div>
            <div className="meter-lab" style={{ color: strengthColor }}>{strengthLab}</div>
          </React.Fragment>
        )}
      </div>
      <div className="field">
        <label>Confirmar senha</label>
        <input type="password" value={n2} onChange={e => setN2(e.target.value)} placeholder="••••••••" />
        {n2 && !match && <div className="meter-lab" style={{ color: 'oklch(0.55 0.20 25)' }}>As senhas não coincidem.</div>}
      </div>
      <button className="submit" disabled={!canSubmit}>Atualizar senha</button>
    </div>
  );
}

// ============================================================
// Appearance — theme + chrome variant
// ============================================================

function AppearancePanel({ theme, onToggleTheme, chrome, setChrome }) {
  const dark = theme === 'dark';
  const superLight = chrome === 'super-light';
  return (
    <div className="acc-section">
      <div className="sec-head">
        <div className="tt">Aparência</div>
        <div className="sd">Escolha como a interface se apresenta. As preferências são guardadas no seu navegador.</div>
      </div>
      <div className="sec-body">
        <div className="acc-sec-row">
          <div className="body">
            <div className="nm">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}>
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
              </svg>
              Tema claro
            </div>
            <div className="sd">Use cores claras no conteúdo da aplicação. Desligue para mudar para o tema escuro.</div>
          </div>
          <button
            className={'acc-switch' + (!dark ? ' on' : '')}
            onClick={onToggleTheme}
            aria-pressed={!dark ? 'true' : 'false'}
            aria-label="Alternar tema claro/escuro">
          </button>
        </div>

        {!dark && (
          <div className="acc-sec-row acc-sec-sub">
            <div className="body">
              <div className="nm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}>
                  <path d="M12 3v2M12 19v2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M3 12h2M19 12h2M5.2 18.8l1.4-1.4M17.4 6.6l1.4-1.4"/>
                  <circle cx="12" cy="12" r="5" fill="currentColor" opacity="0.15"/>
                  <circle cx="12" cy="12" r="5"/>
                </svg>
                Super claro
              </div>
              <div className="sd">Também ilumina a barra superior e o menu lateral. Recomendado para ambientes muito iluminados ou quando você prefere uma interface totalmente branca.</div>
            </div>
            <button
              className={'acc-switch' + (superLight ? ' on' : '')}
              onClick={() => setChrome(c => c === 'super-light' ? 'default' : 'super-light')}
              aria-pressed={superLight ? 'true' : 'false'}
              aria-label="Alternar super claro">
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main
// ============================================================

function AccountView({ initialTab, theme, onToggleTheme, chrome, setChrome }) {
  const [tab, setTab] = useStateA(initialTab || 'account');
  const [user, setUser] = useStateA({
    name: 'Thiago Mágero',
    email: 'thiagocmagero@gmail.com',
    phone: '+351 912 345 678',
    website: '',
    address: 'Lisboa, Portugal',
  });

  useEffectA(() => { if (initialTab) setTab(initialTab); }, [initialTab]);

  const navItems = [
    { key: 'account',  label: 'Conta',            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    { key: 'appearance', label: 'Aparência',       icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M5.6 18.4 18.4 5.6"/><circle cx="12" cy="12" r="9"/></svg> },
    { key: 'region',   label: 'Região e idioma',  icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18"/></svg> },
    { key: 'notif',    label: 'Notificações',     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
    { key: 'security', label: 'Segurança',        icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  ];

  return (
    <div className="acc-page">
      <div className="acc-head">
        <div className="title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand)' }}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6 20.4A8 8 0 0 1 18 20.4"/></svg>
          Definições da conta
        </div>
        <div className="sub">Gerencie a sua identidade, preferências e segurança na plataforma.</div>
      </div>

      <div className="acc-body">
        <aside className="acc-rail">
          <div className="acc-nav">
            {navItems.map(it => (
              <div key={it.key} className={'acc-nav-item' + (tab === it.key ? ' active' : '')} onClick={() => setTab(it.key)}>
                <span className="ic">{it.icon}</span>
                <span>{it.label}</span>
              </div>
            ))}
          </div>

          <PasswordCard />
        </aside>

        <main>
          {tab === 'account'  && <AccountPanel user={user} onSave={setUser} />}
          {tab === 'appearance' && <AppearancePanel theme={theme} onToggleTheme={onToggleTheme} chrome={chrome} setChrome={setChrome} />}
          {tab === 'region'   && <RegionPanel />}
          {tab === 'notif'    && <NotificationsPanel />}
          {tab === 'security' && <SecurityPanel />}
        </main>
      </div>
    </div>
  );
}

Object.assign(window, { AccountView, accountCss });

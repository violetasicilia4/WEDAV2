import { useRef, useState } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { GroupsView } from '@/components/panel/groups-view';
import { Field, Locked, useToast } from '@/components/panel/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { menus } from '@/lib/demo-wedding';
import { downloadXlsx, parseCsv, readXlsx } from '@/lib/weda/xlsx';
import { exportRows, parseGuestRows, templateRows, type ImportResult } from '@/lib/weda/guests-io';
import { addGuest, addGuests, assignGuest, guestName, guestStats, menuName, norm, removeGuest, STATUS_LABEL, updateGuest, validateGuest } from '@/lib/weda/logic';
import { can } from '@/lib/weda/plans';
import { update, useAppState } from '@/lib/weda/store';
import type { Group, Guest, GuestStatus } from '@/lib/weda/types';

export const Route = createFileRoute('/panel/invitados')({
  validateSearch: (s: Record<string, unknown>): { vista?: 'mesas' } => (s['vista'] === 'mesas' ? { vista: 'mesas' } : {}),
  component: GuestsModule,
});

/* Formulario de una persona: sirve para agregarla a mano y para editarla. El grupo es opcional. */
function GuestForm({ initial, groups, submitLabel, onSubmit, onCancel }: { initial?: Guest | undefined; groups: Group[]; submitLabel: string; onSubmit: (v: { first: string; last: string; status: GuestStatus; menu: string; groupId: string | null }) => void; onCancel: () => void }) {
  const [first, setFirst] = useState(initial?.first ?? '');
  const [last, setLast] = useState(initial?.last ?? '');
  const [status, setStatus] = useState<GuestStatus>(initial?.status ?? 'pending');
  const [menu, setMenu] = useState(initial?.menu ?? '');
  const [groupId, setGroupId] = useState(initial?.groupId ?? '');
  const [errors, setErrors] = useState<ReturnType<typeof validateGuest>>({});
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateGuest({ first, last });
    setErrors(found);
    if (Object.keys(found).length) return;
    onSubmit({ first: first.trim(), last: last.trim(), status, menu: status === 'confirmed' ? menu : '', groupId: groupId || null });
  };
  return (
    <form onSubmit={submit} noValidate className="pn-form">
      <div className="pn-two">
        <Field label="Nombre" error={errors.first}>{a => <input id={a.id} type="text" autoComplete="off" value={first} onChange={e => { setFirst(e.target.value); setErrors(x => ({ ...x, first: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
        <Field label="Apellido" error={errors.last}>{a => <input id={a.id} type="text" autoComplete="off" value={last} onChange={e => { setLast(e.target.value); setErrors(x => ({ ...x, last: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
      </div>
      <Field label="Asistencia" hint="Podés cargar a alguien aunque todavía no haya respondido.">
        {a => <select id={a.id} value={status} onChange={e => setStatus(e.target.value as GuestStatus)} aria-describedby={a.describedBy}>{(Object.keys(STATUS_LABEL) as GuestStatus[]).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}</select>}
      </Field>
      {status === 'confirmed' && (
        <Field label="Restricción alimentaria" optional hint="Para avisarle al catering si alguien no puede comer algo.">
          {a => <select id={a.id} value={menu} onChange={e => setMenu(e.target.value)}><option value="">Sin dato</option>{menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>}
        </Field>
      )}
      <Field label="Grupo o mesa" optional>
        {a => <select id={a.id} value={groupId} onChange={e => setGroupId(e.target.value)}><option value="">Sin grupo</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>}
      </Field>
      <div className="pn-actions is-end">
        <button type="button" className="pn-btn is-ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="pn-btn">{submitLabel}</button>
      </div>
    </form>
  );
}

function GuestsModule() {
  const s = useAppState();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<GuestStatus | 'all' | 'site'>('all');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Guest | null>(null);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<{ name: string; result: ImportResult } | null>(null);
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const vista = Route.useSearch().vista === 'mesas' && can(s.planId, 'groups') ? 'mesas' : 'lista';

  if (!can(s.planId, 'guests')) return <Locked feature="guests" />;
  const st = guestStats(s);
  const groupName = (id: string | null) => s.groups.find(g => g.id === id)?.name ?? '';
  // Eliminar no pide confirmación: se puede deshacer desde el aviso (también se vuelve a su grupo).
  const removeNow = (g: Guest) => {
    const before = s.guests;
    update(x => removeGuest(x, g.id));
    toast(`Eliminaste a ${guestName(g)}.`, 'ok', { label: 'Deshacer', onClick: () => update(x => ({ ...x, guests: before })) });
  };
  const closeImport = () => { setImporting(false); setImported(null); setImportError(''); };
  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    setImportError(''); setImported(null);
    try {
      const rows = /\.csv$/i.test(f.name) ? parseCsv(await f.text()) : await readXlsx(await f.arrayBuffer());
      setImported({ name: f.name, result: parseGuestRows(rows, s.guests) });
    } catch (e) { setImportError(e instanceof Error ? e.message : 'No pudimos leer el archivo.'); }
    finally { if (fileRef.current) fileRef.current.value = ''; }
  };
  const doImport = () => {
    if (!imported?.result.ok.length) return;
    const list = imported.result.ok;
    const before = s.guests;
    update(x => addGuests(x, list));
    toast(`Importaste ${list.length} ${list.length === 1 ? 'invitado' : 'invitados'}.`, 'ok', { label: 'Deshacer', onClick: () => update(x => ({ ...x, guests: before })) });
    closeImport();
  };
  const shown = s.guests.filter(g => (filter === 'all' || (filter === 'site' ? g.source === 'rsvp' : g.status === filter)) && (!q.trim() || norm(guestName(g)).includes(norm(q))));

  return (
    <div className="pn-page">
      <header className="pn-page-head">
        <div>
          <h1>Invitados</h1>
          <p className="pn-sub">Quién viene, quién no, a quién le falta responder y dónde se sienta cada uno.</p>
        </div>
        <div className="pn-head-actions"><button type="button" className="pn-btn" onClick={() => setAdding(true)}><Plus size={16} aria-hidden="true" />Agregar invitado</button></div>
      </header>

      {can(s.planId, 'groups') && (
        <div className="pn-switch pn-views" role="group" aria-label="Qué querés ver">
          <button type="button" className={vista === 'lista' ? 'on' : ''} aria-pressed={vista === 'lista'} onClick={() => void navigate({ to: '/panel/invitados', search: {}, replace: true })}>Invitados <span className="pn-count">{st.total}</span></button>
          <button type="button" className={vista === 'mesas' ? 'on' : ''} aria-pressed={vista === 'mesas'} onClick={() => void navigate({ to: '/panel/invitados', search: { vista: 'mesas' }, replace: true })}>Mesas y grupos{st.withoutGroup > 0 && s.groups.length > 0 && <span className="pn-count" title="Personas sin lugar">{st.withoutGroup}</span>}</button>
        </div>
      )}

      {vista === 'mesas' ? <GroupsView /> : null}
      {vista === 'mesas' ? null : (
        <>
      {st.total === 0 ? (
        <div className="pn-empty">
          <h2>Sumá a tu primera persona</h2>
          <p>Cargá a tus invitados a mano o esperá a que respondan desde la página de tu casamiento: las respuestas aparecen acá solas.</p>
          <div className="pn-actions"><button type="button" className="pn-btn is-ghost" onClick={() => setImporting(true)}><Upload size={15} aria-hidden="true" />Importar desde Excel</button><button type="button" className="pn-btn" onClick={() => setAdding(true)}>Agregar invitado</button><Link to="/panel/vista-previa" className="pn-btn is-ghost">Probar el formulario de confirmación</Link></div>
        </div>
      ) : (
        <>
          <section className="pn-stats is-guests" aria-label="Confirmaciones de asistencia">
            {([['all', 'Total de invitados', st.total], ['confirmed', 'Confirmados', st.confirmed], ['declined', 'Rechazados', st.declined], ['pending', 'Sin responder', st.pending]] as const).map(([k, label, n]) => (
              <button key={k} type="button" className={`pn-stat is-btn${filter === k ? ' on' : ''}`} aria-pressed={filter === k} onClick={() => setFilter(filter === k ? 'all' : k)}>
                <span className="pn-stat-label">{label}</span><strong>{n}</strong>
              </button>
            ))}
          </section>
          {st.fromSite > 0 && (
            <p className="pn-note">{st.fromSite} {st.fromSite === 1 ? 'persona respondió' : 'personas respondieron'} desde el sitio y ya {st.fromSite === 1 ? 'figura' : 'figuran'} en tu lista. <button type="button" className="pn-link" onClick={() => setFilter(filter === 'site' ? 'all' : 'site')}>{filter === 'site' ? 'Ver todos' : 'Verlos'}</button></p>
          )}
          <div className="pn-sheet-actions" role="group" aria-label="Importar y exportar la lista">
            <button type="button" className="pn-btn is-ghost is-small" onClick={() => setImporting(true)}><Upload size={15} aria-hidden="true" />Importar desde Excel</button>
            <button type="button" className="pn-btn is-ghost is-small" onClick={() => downloadXlsx(exportRows(s), 'invitados-weda.xlsx')}><Download size={15} aria-hidden="true" />Exportar a Excel</button>
          </div>
          <div className="pn-filters is-guests">
            <label className="pn-sr" htmlFor="g-q">Buscar un invitado</label>
            <input id="g-q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por nombre" autoComplete="off" />
          </div>

          {shown.length === 0 ? <p className="pn-note">No hay invitados con ese filtro. <button type="button" className="pn-link" onClick={() => { setQ(''); setFilter('all'); }}>Limpiar filtros</button></p> : (
            <table className="pn-table">
              <caption className="pn-sr">Lista de invitados</caption>
              <thead><tr><th scope="col">Nombre</th><th scope="col">Asistencia</th><th scope="col">Restricción alimentaria</th><th scope="col">Grupo o mesa</th><th scope="col">Origen</th><th scope="col"><span className="pn-sr">Acciones</span></th></tr></thead>
              <tbody>
                {shown.map(g => (
                  <tr key={g.id}>
                    <th scope="row" data-label="Nombre">{guestName(g)}</th>
                    <td className="pn-g-sum">
                      <button type="button" onClick={() => setEditing(g)} aria-label={`Editar a ${guestName(g)}`}>
                        <span><i className={`pn-dot is-${g.status}`} aria-hidden="true" />{STATUS_LABEL[g.status]}</span>
                        {s.groups.length > 0 && <span>{groupName(g.groupId) || 'Sin grupo'}</span>}
                        {g.status === 'confirmed' && menuName(g.menu) && <span>{menuName(g.menu)}</span>}
                      </button>
                    </td>
                    <td data-label="Asistencia">
                      <select className={`pn-select is-${g.status}`} value={g.status} aria-label={`Asistencia de ${guestName(g)}`} onChange={e => update(x => updateGuest(x, g.id, { status: e.target.value as GuestStatus }))}>
                        {(Object.keys(STATUS_LABEL) as GuestStatus[]).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
                      </select>
                    </td>
                    <td data-label="Restricción">{g.status === 'confirmed' ? (menuName(g.menu) || <span className="pn-muted">Sin dato</span>) : <span className="pn-muted">—</span>}</td>
                    <td data-label="Grupo o mesa">
                      {s.groups.length
                        ? <select className="pn-select" value={g.groupId ?? ''} aria-label={`Grupo de ${guestName(g)}`} onChange={e => update(x => assignGuest(x, g.id, e.target.value || null))}><option value="">Sin grupo</option>{s.groups.map(gr => <option key={gr.id} value={gr.id}>{gr.name}</option>)}</select>
                        : <span className="pn-muted">{groupName(g.groupId) || 'Sin grupo'}</span>}
                    </td>
                    <td data-label="Origen"><span className="pn-muted">{g.source === 'rsvp' ? 'Respondió en el sitio' : 'Cargado por ustedes'}</span></td>
                    <td className="pn-row-actions">
                      <button type="button" className="pn-icon" onClick={() => setEditing(g)} aria-label={`Editar a ${guestName(g)}`}><Pencil size={16} aria-hidden="true" /></button>
                      <button type="button" className="pn-icon" onClick={() => removeNow(g)} aria-label={`Eliminar a ${guestName(g)}`}><Trash2 size={16} aria-hidden="true" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="pn-status-line" role="status" aria-live="polite">{shown.length} de {st.total} {st.total === 1 ? 'invitado' : 'invitados'}</p>
          {can(s.planId, 'rsvp') && <p className="pn-note">Las personas que responden desde la página de tu casamiento se suman solas a esta lista. <Link to="/panel/vista-previa" className="pn-link">Probar el formulario</Link></p>}
        </>
      )}

        </>
      )}

      <Dialog open={importing} onOpenChange={o => { if (!o) closeImport(); }}>
        <DialogContent className="pn-dialog">
          <DialogTitle>Importar invitados desde Excel</DialogTitle>
          <DialogDescription>Usá una planilla con estas columnas, en la primera hoja: Nombre, Apellido, Asistencia (Confirmado, No asiste o Pendiente) y Restricción alimentaria (opcional).</DialogDescription>
          <div className="pn-form">
            <button type="button" className="pn-link" onClick={() => downloadXlsx(templateRows(), 'modelo-invitados-weda.xlsx')}><Download size={14} aria-hidden="true" /> Descargar el modelo para completar</button>
            <input ref={fileRef} className="pn-sr" type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" aria-label="Elegir la planilla" onChange={e => void pickFile(e.target.files?.[0])} />
            <button type="button" className="pn-btn is-ghost" onClick={() => fileRef.current?.click()}><Upload size={15} aria-hidden="true" />{imported ? 'Elegir otra planilla' : 'Elegir la planilla (.xlsx o .csv)'}</button>
            {importError && <p className="pn-error" role="alert">{importError}</p>}
            {imported && (
              <div className="pn-import-result" role="status">
                {imported.result.missingColumns.length > 0
                  ? <p className="pn-error">A la planilla le faltan las columnas: {imported.result.missingColumns.join(' y ')}. Descargá el modelo para ver el formato.</p>
                  : (
                    <>
                      <p><strong>{imported.result.ok.length}</strong> {imported.result.ok.length === 1 ? 'invitado listo' : 'invitados listos'} para importar. Revisalos antes de confirmar: no se cambia nada hasta que toques «Importar».</p>
                      {imported.result.ok.length > 0 && (
                        <table className="pn-table is-compact">
                          <caption className="pn-sr">Vista previa de lo que se va a importar</caption>
                          <thead><tr><th scope="col">Nombre</th><th scope="col">Asistencia</th></tr></thead>
                          <tbody>{imported.result.ok.slice(0, 6).map((g, i) => <tr key={`${g.first}-${g.last}-${i}`}><th scope="row">{guestName(g)}</th><td>{STATUS_LABEL[g.status]}</td></tr>)}</tbody>
                        </table>
                      )}
                      {imported.result.ok.length > 6 && <p className="pn-muted">…y {imported.result.ok.length - 6} más.</p>}
                      {imported.result.duplicates > 0 && <p className="pn-muted">{imported.result.duplicates} {imported.result.duplicates === 1 ? 'fila repetida o que ya estaba' : 'filas repetidas o que ya estaban'} en tu lista; no se tocan ni se pisan: {imported.result.duplicateNames.slice(0, 4).join(', ')}{imported.result.duplicateNames.length > 4 ? '…' : ''}.</p>}
                      {imported.result.problems.length > 0 && (
                        <>
                          <p className="pn-muted">{imported.result.problems.length} {imported.result.problems.length === 1 ? 'fila no se puede importar' : 'filas no se pueden importar'}:</p>
                          <ul>{imported.result.problems.slice(0, 5).map(p => <li key={p.row}>Fila {p.row}: {p.reason}</li>)}{imported.result.problems.length > 5 && <li>…y {imported.result.problems.length - 5} más.</li>}</ul>
                        </>
                      )}
                    </>
                  )}
              </div>
            )}
            <div className="pn-actions is-end">
              <button type="button" className="pn-btn is-ghost" onClick={closeImport}>Cancelar</button>
              <button type="button" className="pn-btn" disabled={!imported?.result.ok.length} onClick={doImport}>{imported?.result.ok.length ? `Importar ${imported.result.ok.length}` : 'Importar'}</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="pn-dialog is-sheet">
          <DialogTitle>Agregar invitado</DialogTitle>
          <DialogDescription>Aparece en tu lista aunque todavía no haya confirmado.</DialogDescription>
          <GuestForm groups={s.groups} submitLabel="Agregar" onCancel={() => setAdding(false)} onSubmit={v => { update(x => addGuest(x, v)); setAdding(false); toast(`Agregaste a ${v.first} ${v.last}.`); }} />
        </DialogContent>
      </Dialog>

      {editing && (
        <Dialog open onOpenChange={o => { if (!o) setEditing(null); }}>
          <DialogContent className="pn-dialog is-sheet">
            <DialogTitle>Editar invitado</DialogTitle>
            <DialogDescription>{guestName(editing)}</DialogDescription>
            <GuestForm initial={editing} groups={s.groups} submitLabel="Guardar" onCancel={() => setEditing(null)} onSubmit={v => { update(x => updateGuest(x, editing.id, v)); setEditing(null); toast('Cambios guardados.'); }} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

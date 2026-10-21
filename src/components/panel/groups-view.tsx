import { useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { ConfirmDialog, Field, useToast } from '@/components/panel/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { addGroup, assignGuest, guestName, guestStats, nextGroupName, removeGroup, STATUS_LABEL, updateGroup, validateCapacity, validateGroupName } from '@/lib/weda/logic';
import { update, useAppState } from '@/lib/weda/store';
import type { Group, Guest } from '@/lib/weda/types';

/* Una persona sin mesa, con un selector simple para asignarla. Sirve igual en el celular y en la compu. */
function Loose({ guest, groups, onMove }: { guest: Guest; groups: Group[]; onMove: (groupId: string | null) => void }) {
  return (
    <li className="pn-member">
      <div className="pn-gmeta">
        <strong>{guestName(guest)}</strong>
        <span><span className={`pn-dot is-${guest.status}`} aria-hidden="true" />{STATUS_LABEL[guest.status]}</span>
      </div>
      <label className="pn-sr" htmlFor={`mv-${guest.id}`}>Asignar a {guestName(guest)}</label>
      <select id={`mv-${guest.id}`} className="pn-select" value="" onChange={e => onMove(e.target.value || null)}>
        <option value="">Asignar a…</option>
        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </li>
  );
}

type Editing = { group: Group | null };

/* Mesas y grupos: totales, una tarjeta por mesa (ocupación, invitados y selector para sentar) y, aparte, quién todavía no tiene lugar.
   Los lugares y la descripción son opcionales: sin lugares la tarjeta cuenta personas y no muestra barra. */
export function GroupsView() {
  const s = useAppState();
  const toast = useToast();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [capacity, setCapacity] = useState('');
  const [errors, setErrors] = useState<{ name?: string | undefined; capacity?: string | undefined }>({});
  const [removing, setRemoving] = useState<Group | null>(null);

  const st = guestStats(s);
  const unassigned = s.guests.filter(g => !g.groupId && g.status !== 'declined');
  const seated = s.guests.filter(g => g.groupId && s.groups.some(x => x.id === g.groupId));
  const totalCapacity = s.groups.reduce((n, g) => n + (g.capacity ?? 0), 0);
  const seatedInSized = s.groups.filter(g => g.capacity).reduce((n, g) => n + s.guests.filter(x => x.groupId === g.id).length, 0);
  const move = (id: string, groupId: string | null) => update(x => assignGuest(x, id, groupId));

  const openNew = () => { setEditing({ group: null }); setName(nextGroupName(s.groups)); setNote(''); setCapacity(''); setErrors({}); };
  const openEdit = (g: Group) => { setEditing({ group: g }); setName(g.name); setNote(g.note ?? ''); setCapacity(g.capacity ? String(g.capacity) : ''); setErrors({}); };
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const label = name.trim();
    const found = { name: validateGroupName(label, s.groups, editing.group?.id), capacity: validateCapacity(capacity) };
    if (found.name || found.capacity) { setErrors(found); return; }
    const extras = { note, capacity: capacity.trim() ? Number(capacity) : undefined };
    if (editing.group) { const id = editing.group.id; update(x => updateGroup(x, id, label, extras)); toast('Cambios guardados.'); }
    else { update(x => addGroup(x, label, extras)); toast(`Creaste «${label}».`); }
    setEditing(null);
  };

  return (
    <div className="pn-groups-view mg">
      <div className="mg-head">
        <p className="pn-muted">{s.groups.length ? 'Armá la distribución, controlá los lugares y ubicá a cada invitado. Ya tenés una mesa de ejemplo: renombrala, borrala o sumá las que necesites.' : 'Creá una mesa o un grupo y sentá a tus invitados.'}</p>
        <button type="button" className="pn-btn" onClick={openNew}><Plus size={16} aria-hidden="true" />Crear mesa</button>
      </div>

      {/* Los cuatro totales están siempre, también sin mesas (en cero): así se entiende qué se va a controlar. */}
      {(
        <ul className="gl-stats" aria-label="Resumen de mesas">
          <li><span>Total de mesas</span><strong>{s.groups.length}</strong><small>Mesas y grupos</small></li>
          <li><span>Lugares</span><strong>{totalCapacity}</strong><small>{totalCapacity ? 'Lugares configurados' : 'Sin lugares cargados'}</small></li>
          <li><span>Invitados sentados</span><strong>{seated.length}</strong><small className={totalCapacity ? 'is-ok' : ''}>{totalCapacity ? `${Math.round((seatedInSized / totalCapacity) * 100)}% de ocupación` : 'Con mesa asignada'}</small></li>
          <li><span>Sin mesa asignada</span><strong>{unassigned.length}</strong><small className={unassigned.length ? 'is-warn' : ''}>{unassigned.length ? 'Pendientes de asignar' : 'Todos tienen lugar'}</small></li>
        </ul>
      )}

      {s.guests.length === 0 && <p className="pn-note">Primero cargá a tus invitados en la solapa «Invitados» para poder sentarlos.</p>}

      {s.groups.length > 0 && (
        <ul className="mg-grid" aria-label="Mesas y grupos">
          {s.groups.map(g => {
            const members = s.guests.filter(x => x.groupId === g.id);
            const full = !!g.capacity && members.length >= g.capacity;
            const pct = g.capacity ? Math.min(100, Math.round((members.length / g.capacity) * 100)) : 0;
            return (
              <li key={g.id} className="mg-card">
                <header className="mg-card-head">
                  <div>
                    <h3>{g.name}</h3>
                    {g.note && <p className="pn-muted">{g.note}</p>}
                  </div>
                  <div className="pn-gactions">
                    <button type="button" className="pn-icon" aria-label={`Editar ${g.name}`} onClick={() => openEdit(g)}><Pencil size={16} aria-hidden="true" /></button>
                    <button type="button" className="pn-icon" aria-label={`Eliminar ${g.name}`} onClick={() => setRemoving(g)}><Trash2 size={16} aria-hidden="true" /></button>
                  </div>
                </header>
                <div className="mg-occ">
                  <span>Ocupación</span>
                  <strong>{g.capacity ? `${members.length} / ${g.capacity} lugares` : `${members.length} ${members.length === 1 ? 'persona' : 'personas'}`}</strong>
                </div>
                {g.capacity ? <div className="mg-bar" role="img" aria-label={`${pct}% de ocupación`}><i className={full ? 'is-full' : ''} style={{ width: `${pct}%` }} /></div> : null}
                <p className="rg-label">Invitados ({members.length})</p>
                {members.length === 0
                  ? <p className="mg-empty">Mesa vacía. Podés sentar invitados abajo.</p>
                  : (
                    <ul className="mg-members">
                      {members.map(m => (
                        <li key={m.id}>
                          <span className={`pn-dot is-${m.status}`} aria-hidden="true" />
                          <span className="mg-mname">{guestName(m)}<small>{STATUS_LABEL[m.status]}</small></span>
                          <button type="button" className="pn-icon" aria-label={`Sacar a ${guestName(m)} de ${g.name}`} onClick={() => move(m.id, null)}><X size={15} aria-hidden="true" /></button>
                        </li>
                      ))}
                    </ul>
                  )}
                <label className="pn-sr" htmlFor={`seat-${g.id}`}>Sentar un invitado en {g.name}</label>
                <select id={`seat-${g.id}`} className="mg-seat" value="" disabled={full || unassigned.length === 0} onChange={e => { if (e.target.value) move(e.target.value, g.id); }}>
                  <option value="">{full ? 'Mesa completa' : unassigned.length === 0 ? 'No quedan invitados sin mesa' : '+ Sentar un invitado…'}</option>
                  {unassigned.map(u => <option key={u.id} value={u.id}>{guestName(u)}</option>)}
                </select>
              </li>
            );
          })}
        </ul>
      )}

      {s.guests.length > 0 && s.groups.length > 0 && unassigned.length > 0 && (
        <section className="pn-group is-loose" aria-labelledby="grp-none">
          <header><div><h2 id="grp-none">Sin mesa asignada</h2><p className="pn-muted">{unassigned.length} {unassigned.length === 1 ? 'persona' : 'personas'}{st.declined ? ` · ${st.declined} que no asisten no necesitan lugar` : ''}</p></div></header>
          <ul className="pn-members">{unassigned.map(m => <Loose key={m.id} guest={m} groups={s.groups} onMove={id => move(m.id, id)} />)}</ul>
        </section>
      )}

      <Dialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null); }}>
        <DialogContent className="pn-dialog is-small">
          <DialogTitle>{editing?.group ? 'Editar mesa' : 'Crear mesa'}</DialogTitle>
          <DialogDescription>{editing?.group ? 'Las personas sentadas se mantienen.' : 'Poné el nombre que quieras. La descripción y los lugares son opcionales.'}</DialogDescription>
          <form onSubmit={save} noValidate className="pn-form">
            <Field label="Nombre" error={errors.name}>{a => <input id={a.id} type="text" value={name} onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
            <Field label="Descripción" optional>{a => <input id={a.id} type="text" value={note} placeholder="Familia directa, amigos de la facu…" onChange={e => setNote(e.target.value)} />}</Field>
            <Field label="Lugares" optional error={errors.capacity}>{a => <input id={a.id} type="text" inputMode="numeric" value={capacity} placeholder="Ej.: 10" onChange={e => { setCapacity(e.target.value); setErrors(x => ({ ...x, capacity: undefined })); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
            <div className="pn-actions is-end"><button type="button" className="pn-btn is-ghost" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" className="pn-btn">{editing?.group ? 'Guardar' : 'Crear'}</button></div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!removing} title="¿Eliminar esta mesa?" text={removing ? `Se elimina «${removing.name}». Las personas sentadas no se borran: quedan sin mesa.` : ''} confirmLabel="Sí, eliminar" onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) { update(x => removeGroup(x, removing.id)); toast(`Eliminaste «${removing.name}».`); } setRemoving(null); }} />
    </div>
  );
}

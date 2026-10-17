import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog, Field, useToast } from '@/components/panel/ui';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { addGroup, assignGuest, guestName, guestStats, nextGroupName, removeGroup, renameGroup, STATUS_LABEL, validateGroupName } from '@/lib/weda/logic';
import { update, useAppState } from '@/lib/weda/store';
import type { Group, Guest } from '@/lib/weda/types';

/* Una persona dentro de un grupo (o sin grupo), con un selector simple para moverla. Sirve igual en el celular y en la compu. */
function Member({ guest, groups, onMove }: { guest: Guest; groups: Group[]; onMove: (groupId: string | null) => void }) {
  return (
    <li className="pn-member">
      <div className="pn-gmeta">
        <strong>{guestName(guest)}</strong>
        <span><span className={`pn-dot is-${guest.status}`} aria-hidden="true" />{STATUS_LABEL[guest.status]}</span>
      </div>
      <label className="pn-sr" htmlFor={`mv-${guest.id}`}>Mover a {guestName(guest)}</label>
      <select id={`mv-${guest.id}`} className="pn-select" value={guest.groupId ?? ''} onChange={e => onMove(e.target.value || null)}>
        <option value="">Sin grupo</option>
        {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </li>
  );
}

export function GroupsView() {
  const s = useAppState();
  const toast = useToast();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [renaming, setRenaming] = useState<Group | null>(null);
  const [newName, setNewName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [removing, setRemoving] = useState<Group | null>(null);

  const st = guestStats(s);
  const unassigned = s.guests.filter(g => !g.groupId && g.status !== 'declined');
  const move = (id: string, groupId: string | null) => update(x => assignGuest(x, id, groupId));

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const label = name.trim() || nextGroupName(s.groups);
    const err = validateGroupName(label, s.groups);
    if (err) { setError(err); return; }
    update(x => addGroup(x, label)); setName(''); setError(''); toast(`Creaste «${label}».`);
  };
  const doRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renaming) return;
    const err = validateGroupName(newName, s.groups, renaming.id);
    if (err) { setRenameError(err); return; }
    update(x => renameGroup(x, renaming.id, newName)); setRenaming(null); toast('Nombre actualizado.');
  };

  return (
    <div className="pn-groups-view">
      <p className="pn-muted">{s.groups.length ? `${s.groups.length} ${s.groups.length === 1 ? 'grupo' : 'grupos'} · ${st.withoutGroup} ${st.withoutGroup === 1 ? 'persona sin lugar' : 'personas sin lugar'}` : 'Creá una mesa o un grupo y asignale personas con un selector.'}</p>

      <form onSubmit={create} noValidate className="pn-inline-form">
        <Field label="Nuevo grupo o mesa" error={error || undefined} hint="Ponele el nombre que quieras: «Mesa 1», «Familia», «Amigos del club»…">
          {a => <input id={a.id} type="text" value={name} placeholder={nextGroupName(s.groups)} onChange={e => { setName(e.target.value); setError(''); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}
        </Field>
        <button type="submit" className="pn-btn"><Plus size={16} aria-hidden="true" />Crear</button>
      </form>

      {s.guests.length === 0 && <p className="pn-note">Primero cargá a tus invitados en la solapa «Invitados» para poder asignarlos.</p>}

      {s.guests.length > 0 && (
        <section className="pn-group is-loose" aria-labelledby="grp-none">
          <header><div><h2 id="grp-none">Sin grupo</h2><p className="pn-muted">{unassigned.length} {unassigned.length === 1 ? 'persona' : 'personas'} sin asignar{st.declined ? ` · ${st.declined} que no asisten no necesitan lugar` : ''}</p></div></header>
          {unassigned.length === 0
            ? <p className="pn-muted">Todos los que asisten o pueden asistir tienen grupo.</p>
            : s.groups.length === 0
              ? <p className="pn-muted">Creá un grupo o una mesa para empezar a asignar.</p>
              : <ul className="pn-members">{unassigned.map(m => <Member key={m.id} guest={m} groups={s.groups} onMove={id => move(m.id, id)} />)}</ul>}
        </section>
      )}

      {s.groups.map(g => {
        const members = s.guests.filter(x => x.groupId === g.id);
        const confirmed = members.filter(x => x.status === 'confirmed').length;
        return (
          <section key={g.id} className="pn-group" aria-labelledby={`grp-${g.id}`}>
            <header>
              <div>
                <h2 id={`grp-${g.id}`}>{g.name}</h2>
                <p className="pn-muted">{members.length} {members.length === 1 ? 'persona' : 'personas'} · {confirmed} confirmadas</p>
              </div>
              <div className="pn-gactions">
                <button type="button" className="pn-icon" aria-label={`Cambiar el nombre de ${g.name}`} onClick={() => { setRenaming(g); setNewName(g.name); setRenameError(''); }}><Pencil size={16} aria-hidden="true" /></button>
                <button type="button" className="pn-icon" aria-label={`Eliminar ${g.name}`} onClick={() => setRemoving(g)}><Trash2 size={16} aria-hidden="true" /></button>
              </div>
            </header>
            {members.length === 0
              ? <p className="pn-muted">Nadie asignado todavía. Elegí este grupo en el selector de cada persona.</p>
              : <ul className="pn-members">{members.map(m => <Member key={m.id} guest={m} groups={s.groups} onMove={id => move(m.id, id)} />)}</ul>}
          </section>
        );
      })}

      <Dialog open={!!renaming} onOpenChange={o => { if (!o) setRenaming(null); }}>
        <DialogContent className="pn-dialog is-small">
          <DialogTitle>Cambiar el nombre</DialogTitle>
          <DialogDescription>Las personas asignadas se mantienen.</DialogDescription>
          <form onSubmit={doRename} noValidate className="pn-form">
            <Field label="Nombre del grupo o la mesa" error={renameError || undefined}>{a => <input id={a.id} type="text" value={newName} onChange={e => { setNewName(e.target.value); setRenameError(''); }} aria-invalid={a.invalid} aria-describedby={a.describedBy} />}</Field>
            <div className="pn-actions is-end"><button type="button" className="pn-btn is-ghost" onClick={() => setRenaming(null)}>Cancelar</button><button type="submit" className="pn-btn">Guardar</button></div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!removing} title="¿Eliminar este grupo?" text={removing ? `Se elimina «${removing.name}». Las personas asignadas no se borran: quedan sin grupo.` : ''} confirmLabel="Sí, eliminar" onCancel={() => setRemoving(null)}
        onConfirm={() => { if (removing) { update(x => removeGroup(x, removing.id)); toast(`Eliminaste «${removing.name}».`); } setRemoving(null); }} />
    </div>
  );
}

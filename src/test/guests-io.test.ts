import { describe, expect, it } from 'vitest';
import { buildXlsx, parseCsv, readXlsx } from '@/lib/weda/xlsx';
import { exportRows, parseGuestRows, templateRows } from '@/lib/weda/guests-io';
import { seedState } from '@/lib/weda/seed';

describe('planilla de invitados', () => {
  it('el .xlsx que escribimos se vuelve a leer igual (con tildes y comillas)', async () => {
    const rows = [['Nombre', 'Apellido'], ['Ñandú', 'O\'Brien "Jr" & Co'], ['Zoé', '<x>']];
    const bytes = buildXlsx(rows);
    const back = await readXlsx(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
    expect(back).toEqual(rows);
  });
  it('lee csv con punto y coma y comillas', () => {
    expect(parseCsv('Nombre;Apellido\nAna;"Pérez; López"\n')).toEqual([['Nombre', 'Apellido'], ['Ana', 'Pérez; López']]);
  });
  it('exporta todos los invitados con grupo y origen', () => {
    const s = seedState();
    const rows = exportRows(s);
    expect(rows[0]).toEqual(['Nombre', 'Apellido', 'Asistencia', 'Restricción alimentaria', 'Grupo o mesa', 'Origen']);
    expect(rows).toHaveLength(s.guests.length + 1);
  });
  it('importa el modelo, detecta duplicados y filas con problemas', () => {
    const r = parseGuestRows([...templateRows(), ['Ana', 'Pérez', 'Confirmado', ''], ['', 'Sola', 'Pendiente', ''], ['Eva', 'Ríos', 'quizás', ''], ['Tito', 'Paz', 'confirmado', 'raro']], []);
    expect(r.ok.map(g => g.first)).toEqual(['Ana', 'Luis']);
    expect(r.duplicates).toBe(1);
    expect(r.problems.map(p => p.row)).toEqual([5, 6, 7]);
    expect(r.ok[0]).toMatchObject({ status: 'confirmed', menu: 'vegetariano' });
  });
  it('avisa si faltan columnas obligatorias y acepta otro orden de columnas', () => {
    expect(parseGuestRows([['Apellido', 'Asistencia'], ['Paz', 'si']], []).missingColumns).toEqual(['Nombre']);
    const r = parseGuestRows([['Apellido', 'Nombre', 'Asistencia'], ['Paz', 'Ana', 'No asiste']], []);
    expect(r.ok).toEqual([{ first: 'Ana', last: 'Paz', status: 'declined', menu: '' }]);
  });
});

describe('importación: duplicados sin pisar datos', () => {
  it('saltea los que ya están o se repiten en la planilla y dice cuáles', () => {
    const r = parseGuestRows([['Nombre', 'Apellido', 'Asistencia'], ['Ana', 'Pérez', 'Confirmado'], ['ana', 'perez', 'Pendiente'], ['Luis', 'Gómez', 'Pendiente']], [{ first: 'Luis', last: 'Gómez' }]);
    expect(r.ok.map(g => `${g.first} ${g.last}`)).toEqual(['Ana Pérez']);
    expect(r.duplicates).toBe(2);
    expect(r.duplicateNames).toEqual(['ana perez', 'Luis Gómez']);
  });
});

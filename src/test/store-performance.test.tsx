import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { flushStorage, reset, STORAGE_KEY, update, useAppSelector } from '@/lib/weda/store';

afterEach(() => { reset(); vi.useRealTimers(); });

/* Rendimiento del almacén: los componentes solo se redibujan por lo que eligen, y el guardado en localStorage se junta en uno solo. */
describe('useAppSelector', () => {
  it('no vuelve a renderizar cuando cambia algo que el componente no usa', () => {
    let renders = 0;
    function Probe() { renders++; const onboarded = useAppSelector(s => s.onboarded); return <p>{String(onboarded)}</p>; }
    render(<Probe />);
    const base = renders;
    act(() => update(s => ({ ...s, gifts: { ...s.gifts, alias: 'otro.alias' } })));
    act(() => update(s => ({ ...s, date: '2027-04-17' })));
    expect(renders).toBe(base);
    act(() => update(s => ({ ...s, onboarded: true })));
    expect(renders).toBe(base + 1);
  });

  it('un objeto elegido solo cambia de identidad cuando cambia ese pedazo del estado', () => {
    let renders = 0;
    function Probe() { renders++; const couple = useAppSelector(s => s.couple); return <p>{couple.first}</p>; }
    render(<Probe />);
    const base = renders;
    act(() => update(s => ({ ...s, date: '2027-04-17' })));
    expect(renders).toBe(base);
    act(() => update(s => ({ ...s, couple: { ...s.couple, first: 'Ana' } })));
    expect(renders).toBe(base + 1);
  });
});

describe('guardado diferido', () => {
  it('junta varios cambios seguidos en una sola escritura', () => {
    vi.useFakeTimers();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    for (let i = 0; i < 20; i++) update(s => ({ ...s, couple: { ...s.couple, first: `Ana${i}` } }));
    expect(write).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(write).toHaveBeenCalledTimes(1);
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').couple.first).toBe('Ana19');
    write.mockRestore();
  });

  it('flushStorage guarda al instante lo pendiente', () => {
    vi.useFakeTimers();
    update(s => ({ ...s, couple: { ...s.couple, second: 'Luis' } }));
    flushStorage();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}').couple.second).toBe('Luis');
  });
});

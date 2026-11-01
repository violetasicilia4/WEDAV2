import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PayoutForm } from '@/components/panel/payout-form';

// El pedido al servidor se reemplaza: acá se prueba el formulario (pasos, validación, confirmación y errores); el servidor tiene sus propias pruebas.
const change = vi.hoisted(() => vi.fn());
vi.mock('@/lib/weda/remote', async orig => ({ ...(await orig<typeof import('@/lib/weda/remote')>()), changePayout: change }));

const current = { alias: 'ana.leo.mp', bank: 'Banco Uno', cbu: '0170099220000067797370' };
const setup = (props: Partial<Parameters<typeof PayoutForm>[0]> = {}) => {
  const onDone = vi.fn();
  render(<PayoutForm current={current} onDone={onDone} onCancel={() => {}} {...props} />);
  return onDone;
};
const type = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

afterEach(() => { cleanup(); change.mockReset(); });

describe('cambiar los datos de cobro', () => {
  it('valida el formato antes de pedir la clave y no deja «cambiar» por lo mismo', () => {
    setup();
    type('Alias', 'no');
    click('Revisar');
    expect(screen.getByText(/entre 6 y 20 caracteres/)).toBeInTheDocument();
    type('Alias', 'Ana.Leo.MP'); // en minúsculas es el mismo
    click('Revisar');
    expect(screen.getByRole('alert')).toHaveTextContent('Son los mismos datos que ya tenías.');
    expect(screen.queryByLabelText('Tu clave actual')).toBeNull();
  });

  it('confirma mostrando lo anterior enmascarado y lo nuevo completo; con la clave guarda', async () => {
    change.mockResolvedValue({ ok: true });
    const onDone = setup();
    type('Alias', 'Nuevo.Alias.MP');
    type(/CBU/, '');
    click('Revisar');
    expect(screen.getByText('an•••mp · CBU ••••7370')).toBeInTheDocument();
    expect(screen.getByText('nuevo.alias.mp')).toBeInTheDocument();
    click('Confirmar cambio');
    expect(screen.getByText('Escribí tu clave actual.')).toBeInTheDocument();
    expect(change).not.toHaveBeenCalled();
    type('Tu clave actual', 'Clave1234');
    await act(async () => { click('Confirmar cambio'); });
    expect(change).toHaveBeenCalledWith({ alias: 'nuevo.alias.mp', bank: 'Banco Uno', cbu: '' }, 'Clave1234');
    expect(onDone).toHaveBeenCalled();
  });

  it('clave incorrecta: lo dice en el campo y lo vacía; otros errores, en un aviso', async () => {
    change.mockResolvedValueOnce({ ok: false, code: 'wrong_password' }).mockResolvedValueOnce({ ok: false, code: 'too_many_changes' });
    const onDone = setup();
    type('Alias', 'nuevo.alias.mp');
    click('Revisar');
    type('Tu clave actual', 'Mala1234');
    await act(async () => { click('Confirmar cambio'); });
    expect(screen.getByText('La clave actual no es correcta.')).toBeInTheDocument();
    expect(screen.getByLabelText('Tu clave actual')).toHaveValue('');
    type('Tu clave actual', 'Clave1234');
    await act(async () => { click('Confirmar cambio'); });
    expect(screen.getByRole('alert')).toHaveTextContent('Ya cambiaste tus datos de cobro 3 veces hoy.');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('el primer alias (o uno cargado antes de tener cuenta) también se confirma con la clave', () => {
    setup({ current: { alias: '', bank: '', cbu: '' }, initial: { alias: 'lucia.vio.mp', bank: '', cbu: '' } });
    expect(screen.getByLabelText('Alias')).toHaveValue('lucia.vio.mp');
    click('Revisar');
    expect(screen.queryByText('Antes')).toBeNull();
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeInTheDocument();
    expect(screen.getByLabelText('Tu clave actual')).toBeInTheDocument();
  });
});

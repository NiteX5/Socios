import { expect, test } from '@playwright/test';

const EMAIL = 'admin@test.cl';
const PASS = 'Password-123456';
const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';

async function sembrarAdmin() {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS, returnSecureToken: true }),
  });
  const { localId } = (await r.json()) as { localId: string };
  await fetch(`${FS}/v1/projects/demo-socios/databases/(default)/documents/admins?documentId=${localId}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { creado: { booleanValue: true } } }),
  });
}

test.beforeAll(async () => {
  await sembrarAdmin();
});

test('login, crear, buscar, ver, editar, retirar y reactivar', async ({ page }) => {
  await page.goto('/socios');
  await expect(page).toHaveURL(/\/login$/);

  // credenciales malas: mensaje generico
  await page.getByLabel(/Correo electrónico/).fill(EMAIL);
  await page.getByLabel(/^Contraseña/).fill('incorrecta-123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Correo o contraseña incorrectos' })).toBeVisible();

  await page.getByLabel(/^Contraseña/).fill(PASS);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/socios$/);
  await expect(page.getByText('Aún no hay socios registrados')).toBeVisible();

  // crear
  await page.getByRole('link', { name: 'Registrar socio' }).first().click();
  await page.getByLabel(/Nombre completo/).fill('María Fernanda Pérez Soto');
  await page.getByLabel(/^RUT/).fill('12345678-5');
  await page.getByLabel(/N° de socio/).fill('231');
  await page.getByLabel(/N° de página/).fill('142');
  await page.getByLabel(/Fecha de ingreso/).fill('2025-03-12');
  await page.getByLabel(/Lugar de votación/).fill('Escuela N° 12');
  await page.getByRole('button', { name: 'Guardar socio' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'María Fernanda Pérez Soto' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Página 142 del libro' })).toBeVisible();
  expect(page.url()).not.toContain('12345678');

  // duplicado
  await page.goto('/socios/nuevo');
  await page.getByLabel(/Nombre completo/).fill('Otra Persona');
  await page.getByLabel(/^RUT/).fill('12.345.678-5');
  await page.getByLabel(/N° de socio/).fill('999');
  await page.getByLabel(/N° de página/).fill('3');
  await page.getByLabel(/Fecha de ingreso/).fill('2025-03-12');
  await page.getByRole('button', { name: 'Guardar socio' }).click();
  await expect(page.getByText('Ya existe un socio con este RUT.').first()).toBeVisible();

  // buscar por RUT con puntos y por nombre sin tildes
  await page.goto('/socios');
  await page.getByLabel('Buscar socio').fill('maria perez');
  await expect(page.getByText('1 socio que coinciden')).toBeVisible();
  await page.getByLabel('Buscar socio').fill('12.345.678-5');
  await expect(page.getByText('1 socio que coinciden')).toBeVisible();
  await page.getByLabel('Buscar socio').fill('zzzz');
  await expect(page.getByText('No encontramos socios con esa búsqueda')).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar búsqueda y filtros' }).click();

  // abrir ficha, editar
  await page.getByRole('link', { name: 'María Fernanda Pérez Soto' }).first().click();
  await page.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel(/N° de página/).fill('150');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('group', { name: 'Página 150 del libro' })).toBeVisible();

  // retirar con confirmacion
  await page.getByRole('button', { name: 'Retirar socio' }).click();
  const dlg = page.getByRole('alertdialog');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await dlg.getByRole('button', { name: 'Retirar socio' }).click();
  await expect(page.getByText('Este socio fue retirado el')).toBeVisible();
  await page.getByRole('button', { name: 'Reactivar socio' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivar socio' }).click();
  await expect(page.getByRole('button', { name: 'Retirar socio' })).toBeVisible();

  // cerrar sesion
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('autenticado sin admins/{uid} ve acceso denegado', async ({ page }) => {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'intruso@test.cl', password: PASS, returnSecureToken: true }),
  });
  expect(r.ok).toBe(true);
  await page.goto('/login');
  await page.getByLabel(/Correo electrónico/).fill('intruso@test.cl');
  await page.getByLabel(/^Contraseña/).fill(PASS);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'no tiene acceso' })).toBeVisible();
});

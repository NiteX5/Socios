import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { construirBusqueda } from '../../src/lib/search';

// QA independiente (no escrito por el desarrollador). Datos ficticios, solo emuladores (demo-socios).
// Deja las bases limpias al terminar para no afectar a smoke.spec.ts.
const SHOTS =
  process.env.QA_SHOTS_DIR ??
  'C:/Users/Nite/AppData/Local/Temp/claude/D--Programacion-Socios/7bc6c9bf-ac34-48e0-8cc5-df31b4ed4d5d/scratchpad/shots';
fs.mkdirSync(SHOTS, { recursive: true });

const AUTH = 'http://127.0.0.1:9099';
const FS = 'http://127.0.0.1:8080';
const FSDOC = `${FS}/v1/projects/demo-socios/databases/(default)/documents`;
const PASS = 'Password-123456';
const ADMIN = 'qa-admin@test.cl';
const INTRUSO = 'qa-intruso@test.cl';
const ts = (iso: string) => ({ timestampValue: iso });

async function signUp(email: string): Promise<string> {
  const r = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASS, returnSecureToken: true }),
  });
  const j = (await r.json()) as { localId: string };
  return j.localId;
}

interface SeedSocio {
  id: string;
  nombre: string;
  rut: string;
  numero: string;
  pagina: number;
  lugar: string | null;
  estado: 'ACTIVO' | 'RETIRADO';
}

async function seedSocio(s: SeedSocio) {
  const now = new Date().toISOString();
  const busqueda = construirBusqueda({ nombreCompleto: s.nombre, rut: s.rut, numeroSocio: s.numero, lugarVotacion: s.lugar });
  const fields: Record<string, unknown> = {
    numeroSocio: { stringValue: s.numero },
    rut: { stringValue: s.rut },
    nombreCompleto: { stringValue: s.nombre },
    fechaIngreso: ts('2025-03-12T03:00:00Z'),
    estado: { stringValue: s.estado },
    paginaLibro: { integerValue: String(s.pagina) },
    lugarVotacion: s.lugar === null ? { nullValue: null } : { stringValue: s.lugar },
    fechaRetiro: s.estado === 'RETIRADO' ? ts('2025-08-15T12:00:00Z') : { nullValue: null },
    createdAt: ts(now),
    updatedAt: ts(now),
    busqueda: { stringValue: busqueda },
  };
  const r = await fetch(`${FSDOC}/socios?documentId=${s.id}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error('seed ' + r.status + ' ' + (await r.text()));
  for (const clave of ['rut_' + s.rut, 'num_' + s.numero.toLowerCase()]) {
    const u = await fetch(`${FSDOC}/unicos?documentId=${clave}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
      body: JSON.stringify({ fields: { socioId: { stringValue: s.id } } }),
    });
    if (!u.ok) throw new Error('seed unicos ' + u.status);
  }
}

async function limpiar() {
  await fetch(`${FS}/emulator/v1/projects/demo-socios/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`${AUTH}/emulator/v1/projects/demo-socios/accounts`, { method: 'DELETE' });
}

async function login(page: Page, email = ADMIN) {
  await page.goto('/login');
  await page.getByLabel(/Correo electrónico/).fill(email);
  await page.getByLabel(/^Contraseña/).fill(PASS);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

async function sinScrollHorizontal(page: Page): Promise<{ sw: number; cw: number }> {
  return page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
}

const shot = (page: Page, nombre: string) => page.screenshot({ path: path.join(SHOTS, nombre + '.png'), fullPage: true });

const rellenos: SeedSocio[] = Array.from({ length: 30 }, (_, i) => ({
  id: 'qa-r' + String(i + 1).padStart(2, '0'),
  nombre: `Relleno Socio ${String(i + 1).padStart(2, '0')}`,
  rut: `${20000000 + i}-${(() => {
    const c = String(20000000 + i);
    let suma = 0;
    let f = 2;
    for (let k = c.length - 1; k >= 0; k--) {
      suma += Number(c[k]) * f;
      f = f === 7 ? 2 : f + 1;
    }
    const r = 11 - (suma % 11);
    return r === 11 ? '0' : r === 10 ? 'K' : String(r);
  })()}`,
  numero: 'R-' + (i + 1),
  pagina: 300 + i,
  lugar: i % 3 === 0 ? 'Liceo Comercial' : null,
  estado: 'ACTIVO',
}));

const PRINCIPAL: SeedSocio = {
  id: 'qa-001',
  nombre: 'María Fernanda Pérez Soto',
  rut: '12345678-5',
  numero: '231',
  pagina: 142,
  lugar: 'Escuela Básica N° 12',
  estado: 'ACTIVO',
};
const LARGO: SeedSocio = {
  id: 'qa-002',
  nombre: 'José Ignacio Alejandro de la Santísima Trinidad Villarroel-Montenegro y Fernández de Córdoba',
  rut: '9876543-3',
  numero: 'LARGO-2025-0001',
  pagina: 987654,
  lugar: 'Escuela Particular Subvencionada Nuestra Señora del Perpetuo Socorro de los Andes, sala 14',
  estado: 'RETIRADO',
};

test.describe.configure({ mode: 'default' });

async function prepararBase() {
  await limpiar();
  const uid = await signUp(ADMIN);
  await fetch(`${FSDOC}/admins?documentId=${uid}`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { creado: { booleanValue: true } } }),
  });
  await signUp(INTRUSO);
}
async function sembrar() {
  for (const s of [PRINCIPAL, LARGO, ...rellenos]) await seedSocio(s);
}

test.beforeAll(async () => {
  await prepararBase();
  await sembrar();
});
test.afterAll(async () => {
  await limpiar();
});

test('01 estado vacio (sin socios)', async ({ page }) => {
  await prepararBase();
  await page.setViewportSize({ width: 1280, height: 800 });
  await login(page);
  await expect(page.getByText('Aún no hay socios registrados')).toBeVisible();
  await shot(page, '01-vacio-1280');
  await page.setViewportSize({ width: 375, height: 800 });
  await shot(page, '01-vacio-375');
});

test('02 sembrar datos', async () => {
  await sembrar();
});

test('03 acceso: anonimo, sin admin y admin', async ({ page }) => {
  for (const ruta of ['/socios', '/socios/nuevo', '/socios/qa-001', '/socios/qa-001/editar']) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('body')).not.toContainText('María Fernanda');
  }
  // sin admin
  await login(page, INTRUSO);
  await expect(page.getByRole('alert').filter({ hasText: 'no tiene acceso' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Pérez Soto');
  await expect(page.locator('body')).not.toContainText('12.345.678');
  await page.goto('/socios/qa-001');
  await expect(page.locator('body')).not.toContainText('Pérez Soto');
  await shot(page, '03-sin-permiso');
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  // admin
  await login(page);
  await expect(page).toHaveURL(/\/socios$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
  // tras cerrar sesion, atras no muestra datos
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goBack();
  await expect(page.locator('body')).not.toContainText('Pérez Soto');
});

for (const ancho of [375, 768, 1280]) {
  test(`04 responsive ${ancho}px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    // login
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect.soft(await sinScrollHorizontal(page), 'login').toMatchObject({});
    const l = await sinScrollHorizontal(page);
    expect.soft(l.sw, `login scroll horizontal ${ancho}`).toBeLessThanOrEqual(l.cw);
    await shot(page, `04-login-${ancho}`);

    await login(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
    await expect(page.getByText(/socios$/).first()).toBeVisible();
    const idx = await sinScrollHorizontal(page);
    expect.soft(idx.sw, `indice scroll horizontal ${ancho}`).toBeLessThanOrEqual(idx.cw);
    await expect(page.locator('a[href^="/socios/qa-"]:visible').first()).toBeVisible();
    const tablaVisible = await page.locator('table').isVisible();
    const tarjetasVisibles = await page.locator('ul li a[href^="/socios/"]').first().isVisible();
    if (ancho >= 1024) {
      expect.soft(tablaVisible, 'tabla en escritorio').toBe(true);
      expect.soft(tarjetasVisibles, 'sin tarjetas en escritorio').toBe(false);
    } else {
      expect.soft(tablaVisible, 'sin tabla en movil/tablet').toBe(false);
      expect.soft(tarjetasVisibles, 'tarjetas en movil/tablet').toBe(true);
    }
    await shot(page, `04-indice-${ancho}`);

    // pagina 2 y busqueda con resultados
    await expect(page.getByRole('navigation', { name: /Paginación/ })).toBeVisible();
    await shot(page, `04-indice-paginacion-${ancho}`);
    await page.getByLabel('Buscar socio').fill('perez');
    await expect(page.getByText(/1 socio que coinciden/)).toBeVisible();
    await shot(page, `04-busqueda-${ancho}`);

    // objetivos tactiles (solo informativo en movil)
    if (ancho < 640) {
      const chicos = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('a, button, input, select'))
          .filter((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed')
          .map((e) => ({ t: (e.textContent || e.getAttribute('aria-label') || e.id || e.tagName).trim().slice(0, 30), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) }))
          .filter((x) => x.h > 0 && (x.h < 44 || x.w < 44)),
      );
      test.info().annotations.push({ type: 'targets<44', description: JSON.stringify(chicos) });
    }

    // ficha, ficha larga, nuevo, editar
    for (const [ruta, nombre] of [
      ['/socios/qa-001', 'ficha'],
      ['/socios/qa-002', 'ficha-larga'],
      ['/socios/nuevo', 'nuevo'],
      ['/socios/qa-001/editar', 'editar'],
    ] as const) {
      await page.getByRole('link', { name: 'Ir al índice' }).count();
      await page.evaluate((r) => (window.location.href = r), ruta);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30000 });
      await page.waitForTimeout(500);
      const o = await sinScrollHorizontal(page);
      expect.soft(o.sw, `${nombre} scroll horizontal ${ancho}`).toBeLessThanOrEqual(o.cw);
      await shot(page, `04-${nombre}-${ancho}`);
    }
    // formulario con errores
    await page.goto('/socios/nuevo');
    await page.getByRole('button', { name: 'Guardar socio' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    const o = await sinScrollHorizontal(page);
    expect.soft(o.sw, `form errores scroll ${ancho}`).toBeLessThanOrEqual(o.cw);
    await shot(page, `04-nuevo-errores-${ancho}`);
    // dialogo de retiro
    await page.goto('/socios/qa-001');
    await page.getByRole('button', { name: 'Retirar socio' }).click();
    await expect(page.getByRole('alertdialog')).toBeVisible();
    const od = await sinScrollHorizontal(page);
    expect.soft(od.sw, `dialogo scroll ${ancho}`).toBeLessThanOrEqual(od.cw);
    await shot(page, `04-dialogo-${ancho}`);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('alertdialog')).toBeHidden();
  });
}

test('05 teclado: foco inicial, tab order, foco visible, "/" y Esc', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
  // foco inicial en el buscador en escritorio
  await expect(page.getByLabel('Buscar socio')).toBeFocused();
  // "/" desde otro lugar
  await page.getByRole('button', { name: 'Actualizar' }).focus();
  await page.keyboard.press('/');
  await expect(page.getByLabel('Buscar socio')).toBeFocused();
  // "/" dentro del input no se captura
  await page.keyboard.type('a/b');
  await expect(page.getByLabel('Buscar socio')).toHaveValue('a/b');
  // Esc borra, Esc de nuevo quita el foco
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Buscar socio')).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Buscar socio')).not.toBeFocused();

  // orden de tabulacion desde el inicio del documento
  await page.goto('/socios');
  await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
  const primeroDom = await page.evaluate(() => (document.querySelector('a[href], button, input, select, [tabindex="0"]') as HTMLElement | null)?.textContent?.trim() ?? '');
  test.info().annotations.push({ type: 'primer-focusable-DOM', description: primeroDom });
  expect.soft(primeroDom).toContain('Saltar');
  const orden: string[] = [];
  const sinFoco: string[] = [];
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const e = document.activeElement as HTMLElement | null;
      if (!e || e === document.body) return null;
      const cs = getComputedStyle(e);
      const row = e.closest('tr');
      const rs = row ? getComputedStyle(row) : null;
      const visible =
        (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
        cs.boxShadow !== 'none' ||
        (rs && rs.outlineStyle !== 'none' && parseFloat(rs.outlineWidth) > 0) ||
        e.matches('input') /* borde 2px */;
      const label = (e.getAttribute('aria-label') || e.textContent || e.id || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 40);
      return { label: e.tagName + ':' + label, visible: !!visible };
    });
    if (info) {
      orden.push(info.label);
      if (!info.visible) sinFoco.push(info.label);
    }
  }
  test.info().annotations.push({ type: 'tab-order', description: orden.join(' > ') });
    expect.soft(sinFoco, 'elementos sin indicador de foco visible').toEqual([]);
  await shot(page, '05-foco-teclado');

  // skip link funciona
  await page.goto('/socios');
  await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press('Tab');
  await shot(page, '05-skip-link');
});

test('06 dialogo: foco, Esc, retorno de foco, trampa de foco, reactivar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);
  await page.goto('/socios/qa-001');
  const abrir = page.getByRole('button', { name: 'Retirar socio' });
  await abrir.focus();
  await page.keyboard.press('Enter');
  const dlg = page.getByRole('alertdialog');
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await expect(dlg).toHaveAttribute('aria-labelledby', /.+/);
  await expect(dlg).toHaveAttribute('aria-describedby', /.+/);
  // trampa de foco
  const dentro: boolean[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    dentro.push(await page.evaluate(() => { const a = document.activeElement; return !!a?.closest('dialog') || a?.tagName === 'BODY'; /* BODY = foco sale al navegador, nunca al fondo inerte */ }));
    test.info().annotations.push({ type: 'trap-step' + i, description: await page.evaluate(() => document.activeElement?.tagName + ':' + (document.activeElement?.textContent ?? '').trim().slice(0, 20)) });
  }
  expect.soft(dentro.every(Boolean), 'foco atrapado en el dialogo').toBe(true);
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await expect(abrir).toBeFocused();
  // clic en overlay cancela
  await abrir.click();
  await expect(dlg).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(dlg).toBeHidden();
  // retirar y verificar fecha de retiro, y reactivar
  await abrir.click();
  await dlg.getByRole('button', { name: 'Retirar socio' }).click();
  await expect(page.getByText(/Este socio fue retirado el \d{1,2} [a-z]{3} \d{4}/)).toBeVisible();
  await expect(page.getByText('Fecha de retiro')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reactivar socio' })).toBeFocused();
  await shot(page, '06-retirado');
  await page.getByRole('button', { name: 'Reactivar socio' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reactivar socio' }).click();
  await expect(page.getByRole('button', { name: 'Retirar socio' })).toBeVisible();
  await expect(page.getByText('Fecha de retiro')).toHaveCount(0);
  // indice: el retirado aparece con filtro Retirados
  await page.goto('/socios');
  await page.getByRole('radio', { name: 'Retirados' }).check({ force: true }).catch(async () => {
    await page.getByText('Retirados', { exact: true }).click();
  });
  await expect(page.getByText(/Villarroel/).first()).toBeVisible();
});

test('07 formulario: obligatorios, RUT, opcional, duplicados, sin bloquearse y conflicto', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);
  await page.goto('/socios/nuevo');
  await page.getByRole('button', { name: 'Guardar socio' }).click();
  // 5 obligatorios con error, lugar sin error
  for (const id of ['nombreCompleto', 'rut', 'numeroSocio', 'paginaLibro', 'fechaIngreso']) {
    await expect(page.locator(`#campo-${id}`)).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator(`#campo-${id}`)).toHaveAttribute('aria-describedby', /error/);
  }
  await expect(page.locator('#campo-lugarVotacion')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#campo-nombreCompleto')).toBeFocused();
  const alerta = page.getByRole('alert').first();
  await expect(alerta).toContainText('Revisa estos campos');
  // RUT con DV malo
  await page.locator('#campo-nombreCompleto').fill('Prueba Nueva');
  await page.locator('#campo-rut').fill('11.111.111-2');
  await page.locator('#campo-numeroSocio').fill('qa-n1');
  await page.locator('#campo-paginaLibro').fill('77');
  await page.locator('#campo-fechaIngreso').fill('2025-01-15');
  await page.locator('#campo-lugarVotacion').focus();
  await expect(page.locator('#campo-rut-error')).toContainText('dígito verificador');
  await shot(page, '07-rut-dv-malo');
  // RUT valido se formatea al salir
  await page.locator('#campo-rut').fill('111111111');
  await page.locator('#campo-lugarVotacion').focus();
  await expect(page.locator('#campo-rut')).toHaveValue('11.111.111-1');
  // duplicado de numero (case-insensitive) con RUT nuevo
  await page.locator('#campo-numeroSocio').fill('R-1');
  await page.getByRole('button', { name: 'Guardar socio' }).click();
  await expect(page.getByText('Ya existe un socio con este número.').first()).toBeVisible();
  // arreglo y guardado sin lugar de votacion
  await page.locator('#campo-numeroSocio').fill('qa-n1');
  await page.getByRole('button', { name: 'Guardar socio' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Prueba Nueva' })).toBeVisible();
  await expect(page.getByText('Lugar de votación')).toHaveCount(0);
  await expect(page.getByText('Socio registrado correctamente.')).toBeVisible();
  const urlNueva = page.url();
  // editar sin tocar claves: no se bloquea a si mismo
  await page.getByRole('link', { name: 'Editar' }).click();
  await expect(page.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled();
  await page.locator('#campo-numeroSocio').fill('QA-N1');
  await page.locator('#campo-paginaLibro').fill('78');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('group', { name: 'Página 78 del libro' })).toBeVisible();
  await expect(page.getByText('QA-N1', { exact: true })).toBeVisible();
  // conflicto: otro admin modifica updatedAt por REST
  await page.getByRole('link', { name: 'Editar' }).click();
  const id = urlNueva.split('/').pop()!;
  await page.locator('#campo-paginaLibro').fill('79');
  const r = await fetch(`${FSDOC}/socios/${id}?updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=paginaLibro`, {
    method: 'PATCH',
    headers: { Authorization: 'Bearer owner', 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { updatedAt: ts(new Date(Date.now() + 5000).toISOString()), paginaLibro: { integerValue: '500' } } }),
  });
  expect(r.ok).toBe(true);
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText(/Otra persona modificó este socio/)).toBeVisible();
  await shot(page, '07-conflicto');
  // cancelar con cambios pide confirmacion
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('08 busqueda UI: acentos, mayusculas, RUT con/sin puntos, numero, sin resultados, limpiar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);
  const b = page.getByLabel('Buscar socio');
  const casos: [string, RegExp][] = [
    ['MARIA', /1 socio que coinciden/],
    ['pérez   soto', /1 socio que coinciden/],
    ['12.345.678-5', /1 socio que coinciden/],
    ['123456785', /1 socio que coinciden/],
    ['12345678-5', /1 socio que coinciden/],
    ['231', /1 socio que coinciden/],
    ['villarroel', /1 socio que coinciden/],
    ['relleno', /\d+ socios que coinciden/],
    ['zzzz', /Ningún socio/],
  ];
  for (const [q, esperado] of casos) {
    await b.fill(q);
    await expect(page.getByRole('heading', { level: 2 }).first(), q).toHaveText(esperado);
  }
  // el contador es aria-live
  await expect(page.locator('h2[aria-live="polite"]')).toHaveCount(1);
  // limpiar con X
  await b.fill('zzzz');
  await page.getByRole('button', { name: 'Limpiar búsqueda', exact: true }).click();
  await expect(b).toHaveValue('');
  // el RUT nunca aparece en URL
  await b.fill('12.345.678-5');
  expect(page.url()).not.toContain('12345678');
  // estado se conserva al volver desde la ficha
  await page.getByRole('link', { name: /María Fernanda/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: /María Fernanda/ })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al índice' }).click();
  await expect(b).toHaveValue('12.345.678-5');
});

test('09 estados de carga y error', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await login(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);

  // carga lenta => skeleton
  await page.route('**/127.0.0.1:8080/**', async (route) => {
    await new Promise((r) => setTimeout(r, 3500));
    await route.continue().catch(() => {});
  });
  await page.getByLabel(/Correo electrónico/).fill(ADMIN);
  await page.getByLabel(/^Contraseña/).fill(PASS);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const skeleton = page.locator('[aria-busy="true"], [role="status"]').filter({ hasText: /Cargando|Verificando/ }).first();
  await expect(skeleton).toBeVisible({ timeout: 10000 });
  await shot(page, '09-cargando');
  await expect(page.getByText('Relleno Socio 01').first()).toBeVisible({ timeout: 30000 });
  await page.unroute('**/127.0.0.1:8080/**');

  // error de red al actualizar
  await context.setOffline(true);
  await expect(page.getByText('Sin conexión.')).toBeVisible();
  await shot(page, '09-offline-banner');
  await page.getByRole('button', { name: 'Actualizar' }).click();
  const hayError = await page
    .getByText('No pudimos cargar los socios')
    .waitFor({ timeout: 40000 })
    .then(() => true)
    .catch(() => false);
  await shot(page, '09-error-carga');
  test.info().annotations.push({ type: 'error-carga-visible', description: String(hayError) });
  await context.setOffline(false);
  if (hayError) {
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText('Relleno Socio 01').first()).toBeVisible({ timeout: 30000 });
  }

  // socio inexistente
  await page.goto('/socios/no-existe-xyz');
  await expect(page.getByText(/No encontramos este socio/)).toBeVisible({ timeout: 30000 });
  await shot(page, '09-no-existe');
  // 404
  await page.goto('/ruta-que-no-existe');
  await expect(page.getByRole('heading', { level: 2, name: 'Página no encontrada' })).toBeVisible();
});

async function contrastes(page: Page) {
  return page.evaluate(() => {
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1]!.split(/[ ,/]+/).filter(Boolean).map(Number);
      return { r: p[0]!, g: p[1]!, b: p[2]!, a: p[3] ?? 1 };
    };
    const lum = (c: { r: number; g: number; b: number }) => {
      const f = (v: number) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
    };
    const fondo = (el: Element | null): { r: number; g: number; b: number } => {
      let acum: { r: number; g: number; b: number } | null = null;
      for (let e = el; e; e = e.parentElement) {
        const c = parse(getComputedStyle(e).backgroundColor);
        if (c && c.a > 0.95) return c;
        if (c && c.a > 0 && !acum) acum = c;
      }
      return acum ?? { r: 255, g: 255, b: 255 };
    };
    const malos: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const vistos = new Set<Element>();
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const el = n.parentElement;
      if (!el || vistos.has(el) || !n.textContent?.trim()) continue;
      vistos.add(el);
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || el.closest('.sr-only')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const fg = parse(cs.color);
      if (!fg) continue;
      const bg = fondo(el);
      const L1 = lum(fg);
      const L2 = lum(bg);
      const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
      const px = parseFloat(cs.fontSize);
      const grande = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight) >= 700);
      if (ratio < (grande ? 3 : 4.5)) malos.push(`${el.tagName}.${(el.className || '').toString().slice(0, 30)} "${n.textContent!.trim().slice(0, 25)}" ${ratio.toFixed(2)}`);
    }
    return malos;
  });
}

test('10 accesibilidad basica', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  // login
  await page.goto('/login');
  expect.soft(await page.locator('html').getAttribute('lang')).toMatch(/^es/);
  await expect.soft(page).toHaveTitle(/SocioÍndice|Ingresar/);
  expect.soft(await page.locator('h1').count(), 'un h1 en login').toBe(1);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  const errLogin = page.getByRole('alert');
  test.info().annotations.push({ type: 'login-vacio-alertas', description: String(await errLogin.count()) });
  await shot(page, '10-login-vacio');
  await page.getByLabel(/Correo electrónico/).fill(ADMIN);
  await page.getByLabel(/^Contraseña/).fill('mala-clave-123');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'incorrectos' })).toBeVisible();
  const toggle = page.getByRole('button', { name: /Mostrar contraseña/ });
  expect.soft(await toggle.count(), 'boton mostrar contraseña').toBe(1);
  if (await toggle.count()) expect.soft(await toggle.getAttribute('aria-pressed')).not.toBeNull();
  test.info().annotations.push({ type: 'contraste-login', description: JSON.stringify(await contrastes(page)) });
  await shot(page, '10-login-error');

  await login(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
  await expect.soft(page).toHaveTitle(/Índice de socios/);
  // todos los inputs/selects/botones con nombre accesible
  const sinNombre = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('input, select, textarea, button, a[href]'))
      .filter((e) => e.offsetParent !== null)
      .filter((e) => {
        const n = (e.getAttribute('aria-label') || (e as HTMLInputElement).labels?.[0]?.textContent || e.textContent || e.getAttribute('title') || '').trim();
        return !n;
      })
      .map((e) => e.outerHTML.slice(0, 80)),
  );
  expect.soft(sinNombre, 'controles sin nombre accesible en indice').toEqual([]);
  // grupo de filtro
  const grupo = await page.getByRole('radiogroup', { name: 'Filtrar por estado' }).count();
  expect.soft(grupo, 'radiogroup de filtro').toBe(1);
  // tabla con caption y th scope
  expect.soft(await page.locator('table caption').count()).toBe(1);
  expect.soft(await page.locator('th[scope="col"]').count()).toBe(5);
  // landmarks
  expect.soft(await page.locator('header').count()).toBe(1);
  expect.soft(await page.locator('main#contenido').count()).toBe(1);
  // tabla + tarjetas no duplicadas para AT
  const tarjetasAccesibles = await page.locator('ul li a[href^="/socios/qa-"]').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetParent !== null).length);
  expect.soft(tarjetasAccesibles, 'tarjetas visibles en escritorio').toBe(0);
  test.info().annotations.push({ type: 'contraste-indice', description: JSON.stringify(await contrastes(page)) });

  await page.getByRole('link', { name: /María Fernanda/ }).first().click();
  await expect(page.getByRole('heading', { level: 1, name: /María Fernanda/ })).toBeVisible();
  test.info().annotations.push({ type: 'titulo-ficha-navegacion-cliente', description: await page.title() });
  await page.goto('/socios/qa-001');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  test.info().annotations.push({ type: 'titulo-ficha-carga-completa', description: await page.title() });
  expect.soft(await page.locator('h1').count()).toBe(1);
  await expect.soft(page).toHaveTitle(/María Fernanda Pérez Soto/);
  expect.soft(await page.getByRole('group', { name: 'Página 142 del libro' }).count()).toBe(1);
  test.info().annotations.push({ type: 'contraste-ficha', description: JSON.stringify(await contrastes(page)) });

  await page.goto('/socios/nuevo');
  await page.getByRole('button', { name: 'Guardar socio' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  const liveErr = await page.evaluate(() => Array.from(document.querySelectorAll('[id$="-error"]')).map((e) => ({ id: e.id, role: e.getAttribute('role'), live: e.getAttribute('aria-live'), inLive: !!e.closest('[role=alert],[aria-live]') })));
  test.info().annotations.push({ type: 'errores-campo-live', description: JSON.stringify(liveErr) });
  expect.soft(liveErr.length, 'errores por campo presentes').toBeGreaterThan(0);
  test.info().annotations.push({ type: 'contraste-form-errores', description: JSON.stringify(await contrastes(page)) });

  // tema oscuro (opcional en diseno)
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/socios');
  await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
  await shot(page, '10-indice-oscuro');
  test.info().annotations.push({ type: 'contraste-oscuro', description: JSON.stringify(await contrastes(page)) });
  await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
  await page.goto('/socios');
  await shot(page, '10-reduced-motion');
});

test('11 fuera de alcance: sin importar/exportar/borrar/analytics/votacion', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const peticiones: string[] = [];
  context.on('request', (r) => peticiones.push(r.url()));
  await login(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Índice de socios' })).toBeVisible();
  const prohibidos = /importar|exportar|descargar|csv|excel|eliminar|borrar|delete|analytics|estad[ií]sticas|reporte|votar|votaci[oó]n masiva|elecci[oó]n/i;
  for (const ruta of ['/socios', '/socios/qa-001', '/socios/qa-001/editar', '/socios/nuevo']) {
    await page.goto(ruta);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const acciones = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>('button, a[href], [role=menuitem]'))
        .map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim())
        .filter(Boolean),
    );
    expect.soft(acciones.filter((a) => prohibidos.test(a)), 'acciones prohibidas en ' + ruta).toEqual([]);
    expect.soft(await page.locator('input[type=file]').count(), 'sin input file en ' + ruta).toBe(0);
  }
  for (const ruta of ['/socios/importar', '/socios/exportar', '/estadisticas', '/votacion', '/admin']) {
    const resp = await page.goto(ruta);
    const status = resp?.status();
    await page.getByText(/Página no encontrada|No encontramos/).first().waitFor({ timeout: 30000 }).catch(() => {});
    const cuerpo = await page.locator('body').innerText();
    expect.soft(/Página no encontrada|No encontramos/.test(cuerpo) || status === 404, 'ruta inexistente ' + ruta).toBe(true);
  }
  const analytics = peticiones.filter((u) => /google-analytics|googletagmanager|firebaseinstallations|analytics/i.test(u));
  expect.soft(analytics, 'sin trafico de analytics').toEqual([]);
  const externas = peticiones.filter((u) => !/localhost|127\.0\.0\.1/.test(u) && !u.startsWith('data:'));
  test.info().annotations.push({ type: 'peticiones-externas', description: JSON.stringify(externas.slice(0, 10)) });
  expect.soft(externas, 'sin peticiones externas (solo emuladores)').toEqual([]);
});

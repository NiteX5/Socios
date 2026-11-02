# SocioÍndice - Informe de QA independiente

Fecha: 2026-10-27. Entorno: Windows 11, Node 24.22.1, Java 26 (emuladores), Chromium (Playwright 1.64.1). Solo datos ficticios y emuladores (`demo-socios`); no se tocó ningún proyecto real.

Nota: el repositorio no define las historias HU-01..HU-07; se derivaron del README ("Funciones"):

| HU | Historia |
|---|---|
| HU-01 | Inicio/cierre de sesión de administradores; acceso denegado a anónimos y a usuarios sin `admins/{uid}` |
| HU-02 | Listar el índice (tabla escritorio / tarjetas móvil) con estados de carga, vacío y error |
| HU-03 | Buscar (nombre, RUT, N° socio, página, lugar), filtrar por estado y paginar de a 25 |
| HU-04 | Registrar socio (obligatorios, RUT válido, lugar opcional, unicidad RUT/N°) |
| HU-05 | Ver ficha (página del libro destacada) |
| HU-06 | Editar socio (sin bloquearse a sí mismo, conflicto de edición) |
| HU-07 | Retirar y reactivar con confirmación (`fechaRetiro`) |

## 1. Resultado de las suites existentes (ejecutadas de verdad)

| Comando | Resultado |
|---|---|
| `npm run lint` | PASÓ (0 avisos) |
| `npm run typecheck` | PASÓ |
| `npm test` | PASÓ - 3 archivos, 32 tests |
| `npm run build` | PASÓ - 7 rutas |
| `npm run test:rules` | PASÓ - 92 tests (incluye `adversarial.test.ts`, escrito por otro agente; en una primera pasada falló 1 test por un bug del propio test -`unicos/num_a/b` no es una referencia válida-, ya corregido) |
| `npm run test:integration` | PASÓ - 1 test |
| `npm run test:e2e` | `smoke.spec.ts` PASÓ (2/2). `qa-ui.spec.ts` 12/13 (ver D-01) |

## 2. Pruebas añadidas por QA

| Archivo | Cómo ejecutar | Resultado |
|---|---|---|
| `tests/qa/qa-rut.unit.test.ts`, `qa-validacion.unit.test.ts`, `qa-busqueda.unit.test.ts` | `npx vitest run --config tests/qa/vitest.config.ts` | PASÓ - 42 tests |
| `tests/qa/qa-socios.int.test.ts` | `npx firebase emulators:exec --only auth,firestore --project demo-socios "vitest run --config tests/qa/vitest.int.config.ts"` | PASÓ - 12 tests |
| `tests/e2e/qa-ui.spec.ts` | `npm run test:e2e` o `npx playwright test qa-ui` (dentro de emulators:exec) | 12 PASARON, 1 FALLÓ (test 10, por D-01). Limpia emuladores al terminar para no afectar a `smoke.spec.ts` |

Capturas (revisadas visualmente): `C:\Users\Nite\AppData\Local\Temp\claude\D--Programacion-Socios\7bc6c9bf-ac34-48e0-8cc5-df31b4ed4d5d\scratchpad\shots\`.

## 3. Matriz HU -> casos de prueba

| HU | Caso | Dónde | Estado |
|---|---|---|---|
| HU-01 | Anónimo redirige a /login en 4 rutas protegidas, sin datos | qa-ui 03 | PASÓ |
| HU-01 | Usuario autenticado sin admin: pantalla de acceso denegado, sin datos, ni en ficha directa | qa-ui 03, smoke 2 | PASÓ |
| HU-01 | Tras cerrar sesión, "atrás" no muestra datos | qa-ui 03 | PASÓ |
| HU-01 | Reglas: anónimo (sin sesión y anónimo Firebase), sin admin y admin; no puede autoconcederse admin | qa int, rules | PASÓ |
| HU-01 | Credenciales malas: mensaje genérico con role=alert | smoke, qa-ui 10 | PASÓ |
| HU-02 | Estado vacío ("Aún no hay socios registrados") 1280/375 | qa-ui 01 | PASÓ |
| HU-02 | Responsive 375/768/1280: sin scroll horizontal en login, índice, ficha, ficha con nombre/lugar muy largos, nuevo, editar, errores y diálogo | qa-ui 04 | PASÓ |
| HU-02 | Tarjetas < 1024 px, tabla >= 1024 px (sin duplicar para lector de pantalla) | qa-ui 04, 10 | PASÓ |
| HU-02 | Estado de carga (esqueleto del listado) | qa-ui 09 | NO EJECUTADO (la prueba capturó "Verificando tu sesión…", no el esqueleto de lista) |
| HU-02 | Estado de error de carga ("No pudimos cargar los socios") | qa-ui 09 | NO EJECUTADO (offline + Actualizar no produce error; ver D-05) |
| HU-02 | Banner "Sin conexión" | qa-ui 09 | PASÓ |
| HU-02 | 404 y socio inexistente | qa-ui 09 | PASÓ |
| HU-03 | Nombre parcial, mayúsculas, acentos, ñ, NFD, multi-término, caracteres regex | qa unit | PASÓ |
| HU-03 | RUT con/sin puntos y guion, parcial, K mayúscula/minúscula | qa unit, qa-ui 08 | PASÓ |
| HU-03 | N° de socio (alfanumérico, mayúsculas), página exacta, lugar | qa unit, qa-ui 08 | PASÓ |
| HU-03 | Filtro estado, limpiar, "sin resultados", RUT no va a la URL, estado de búsqueda se conserva al volver de la ficha | qa-ui 08 | PASÓ |
| HU-03 | Paginación: límites, y número de página actual legible | qa unit / qa-ui 04 | límites PASÓ; legibilidad FALLÓ (D-02) |
| HU-03 | Teclado: foco inicial en buscador, `/`, Esc (borra y luego desenfoca), orden de tab, foco visible, skip link primero | qa-ui 05 | PASÓ |
| HU-04 | RUT: 7/8 dígitos, K, 0, ceros, 6/9 dígitos, DV incorrecto (11 DV), basura, dígitos Unicode | qa unit | PASÓ |
| HU-04 | Obligatorios vacíos o con espacios; lugar opcional (null); límites nombre/N°/página/fecha | qa unit | PASÓ |
| HU-04 | UI: errores por campo con aria-invalid + aria-describedby, resumen role=alert, foco al primer error, RUT se formatea al salir | qa-ui 07 | PASÓ |
| HU-04 | Duplicado de RUT, de N° (también solo por mayúsculas), ambos | qa int, qa-ui 07 | PASÓ |
| HU-04 | Concurrencia: 40 altas distintas en paralelo; 15 con mismo RUT -> 1 gana; 15 con mismo N° en 5 capitalizaciones -> 1 gana | qa int | PASÓ |
| HU-05 | Ficha: folio con aria-label, datos, título de pestaña con nombre (carga completa) | qa-ui 10 | PASÓ |
| HU-05 | Título de pestaña al navegar desde el índice | qa-ui 10 | FALLÓ (D-01) |
| HU-06 | Editar sin cambiar claves, cambiar solo mayúsculas del N°, quitar lugar; "Guardar" deshabilitado sin cambios | qa int, qa-ui 07 | PASÓ |
| HU-06 | Cambiar RUT/N° libera los antiguos y bloquea los nuevos; colisión con otro socio | qa int | PASÓ |
| HU-06 | Conflicto (token `updatedAt` viejo) en edición y en cambio de estado; 3 operaciones concurrentes -> 1 gana | qa int; UI con aviso "Otra persona modificó…" | PASÓ |
| HU-07 | `fechaRetiro` al retirar, null al reactivar, se conserva al editar retirado, re-retiro | qa int | PASÓ |
| HU-07 | RUT/N° de retirado siguen reservados; retirar dos veces -> ESTADO_INVALIDO | qa int | PASÓ |
| HU-07 | Diálogo: foco inicial en Cancelar, aria-labelledby/describedby, Esc cierra, foco vuelve al disparador, clic en overlay cancela, foco no llega al fondo | qa-ui 06 | PASÓ |
| HU-07 | UI: texto "retirado el …", fila "Fecha de retiro", foco en "Reactivar socio" | qa-ui 06, smoke | PASÓ |
| Alcance | Sin importar/exportar/borrar/analytics/votación (DOM, rutas, tráfico, código) | qa-ui 11 + grep | PASÓ (ver §5) |

## 4. Defectos

| ID | Sev. | Defecto | Reproducción | Archivo probable |
|---|---|---|---|---|
| D-01 | Media | El título de la pestaña no cambia en navegación del lado cliente: queda "SocioÍndice". Con carga completa de la URL sí es correcto ("María … · SocioÍndice"). Incumple docs/diseno.md §6 y WCAG 2.4.2 | Iniciar sesión (o abrir una ficha desde el índice) y leer `document.title`. Falla `qa-ui.spec.ts` test 10 | `src/lib/useTitulo.ts` (Next restablece el `metadata.title` de `layout.tsx` tras el efecto; usar `generateMetadata`/`<title>` o re-aplicar tras la navegación) |
| D-02 | Media | En escritorio (>= 1024 px, también modo oscuro) el número de la página actual de la paginación es invisible: texto `text-primary` sobre fondo `bg-primary` (contraste 1.00:1). Visto en captura `04-indice-1280.png` | Tener > 25 socios, abrir /socios a 1280 px y mirar el botón de la página actual | `src/components/ui/Pagination.tsx` línea ~57 (`btn` ya define `text-primary` y gana a `text-on-primary`) |
| D-03 | Baja | Errores por campo (`#campo-*-error`) sin `role`/`aria-live`; solo se anuncia el resumen tras enviar. Los errores al salir del campo (blur) o servidor quedan solo vía `aria-describedby` | Enfocar RUT, escribir un DV malo y salir, con lector de pantalla | `src/components/ui/Field.tsx` |
| D-04 | Baja | Columna "N° socio" de 90 px parte números largos en 3 líneas (`LARGO-2025-0001`) en tabla | Socio con N° de 15-20 caracteres en escritorio (`04-indice-1280.png`) | `src/components/ui/SociosTable.tsx` |
| D-05 | Baja | "Actualizar" estando sin conexión no muestra error: el SDK devuelve la caché, el listado queda igual y "Última actualización" se actualiza como si hubiera tenido éxito (solo el banner "Sin conexión" avisa) | Iniciar sesión, desconectar red, pulsar Actualizar | `src/providers/SociosProvider.tsx` / `src/lib/socios.ts` (`getDocs` con `source: 'server'`) |
| D-06 | Info | El enlace del wordmark mide 28 px de alto (< 44 px del diseño) en móvil; placeholder del buscador se corta en 375 px ("Nombre, RUT, N° de s…") | Ver `04-indice-375.png` | `Wordmark.tsx`, `SearchBox.tsx` |
| D-07 | Info (repo) | Archivo vacío `1024` en la raíz del proyecto (creado a las 09:59, origen desconocido; probablemente una redirección `> 1024` accidental) | `ls` en la raíz | eliminar |

Observaciones (no defectos): el RUT acepta solo cuerpos de 7-8 dígitos (documentado; excluye RUT antiguos de 6 dígitos); `npm run test:e2e` incluye `qa-ui.spec.ts` y fallará hasta corregir D-01.

## 5. Calidad visual frente a docs/diseno.md

Cumple: papel cálido, azul marino con acento ocre, wordmark con marcador, folio destacado en la ficha, badges icono+texto, tarjetas con "Pág." a la derecha, tabla estilo libro, sin gradientes/emojis/imágenes, tema oscuro correcto (contraste verificado en captura), foco visible con anillo, objetivos táctiles >= 44 px (salvo D-06). Barrido de contraste automático (texto vs. fondo) en login, índice, ficha, formulario con errores y modo oscuro: sin incumplimientos salvo D-02. Problemas: D-02, D-04, D-06. La captura del diálogo a 375 px salió semitransparente (se tomó durante la animación de 180 ms; no confirmado como defecto).

No ejecutado: Safari/Firefox, lector de pantalla real, reduced-motion verificado solo por captura, `npm audit`, despliegue.

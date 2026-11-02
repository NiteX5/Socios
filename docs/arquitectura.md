# SocioIndice - Arquitectura

Estado: fijado por el arquitecto. Alcance: ~500 socios, pocos administradores, Firebase cliente (sin backend ni Admin SDK), Vercel. Principio rector: lo minimo que funcione y sea seguro; las reglas de Firestore son la autoridad, el cliente es UX.

## 1. Versiones (verificadas con `npm view` el 2026-10-26, Node 24.22.1)

Fijar EXACTAS (sin `^`/`~`) y commitear `package-lock.json`; usar `npm ci`.

| Paquete | Version | engines / peers | Nota |
|---|---|---|---|
| next | 16.4.3 | node >=20.9; react ^18.2 o ^19 | `latest` |
| react / react-dom | 19.3.1 | react-dom peer react ^19.3.1 | misma version ambos |
| firebase | 13.1.0 | - | ya es la `latest` real |
| tailwindcss + @tailwindcss/postcss | 4.3.3 | - | v4: sin tailwind.config, `@import "tailwindcss"` en CSS |
| typescript | **6.0.3** (NO 7.0.2) | - | `latest` es 7.0.2 pero `typescript-eslint` (via eslint-config-next 16) declara `typescript <6.1.0`; fijar 6.0.3 evita peer-dep rotas. Reevaluar al salir typescript-eslint con soporte 7 |
| eslint | 10.13.0 | node ^20.19 / ^22.13 / >=24 | eslint-config-next acepta >=9; si algun plugin (react-hooks/jsx-a11y/import) falla con 10, bajar a 9.x (ultima 9) |
| eslint-config-next | 16.4.3 | eslint >=9 | igual a next |
| vitest | 5.0.5 | node ^22.12 / ^24 / >=26 | peer vite ^6.4/^7/^8 (instalar vite explicito si npm no lo resuelve) |
| @firebase/rules-unit-testing | 6.0.0 | node >=24.12 (OK con 24.22.1); peer firebase ^13 | alineado con firebase 13.1.0 |
| firebase-tools | 15.34.1 | node >=20/22/24 | devDependency (no global); emulador Firestore requiere Java |
| @playwright/test | 1.64.1 | node >=20 | opcional; next lo lista como peer opcional |
| lucide-react | 1.61.0 | react 16.5-19 | solo importar iconos individuales |

Compatibilidad Node 24.22.1: todos los `engines` lo admiten. `rules-unit-testing@6` EXIGE >=24.12, por lo que Node 22 queda descartado para tests de reglas.

Vercel (doc oficial `functions/runtimes/node-js/node-js-versions`, actualizada 2026-02): disponibles 24.x (por defecto) y 22.x; solo versiones mayores, Vercel aplica parches. Por tanto `engines.node` = `"24.x"` en package.json (un rango como `>=24.22.1 <25` tambien resuelve a la ultima 24.x, pero `24.x` es lo documentado). `.nvmrc` = `24.22.1` para local. Node 20 se deprecia en Vercel el 2026-10-01.

Vercel Hobby (doc `limits/fair-use-guidelines`, 2026-09-14): "restricted to non-commercial personal use only"; uso comercial = cualquier deployment con fin de lucro de CUALQUIERA involucrado en la produccion, incluido un empleado o consultor pagado por escribirlo. Donaciones no cuentan. Cuotas Hobby: 100 GB transferencia, 1M invocaciones de funciones, 4 h CPU activa. Esta app es casi estatica (sin funciones propias), asi que las cuotas sobran. RIESGO DE POLITICA: un colegio es institucion; si alguien cobra por desarrollar/mantener la app, Hobby no aplica de forma estricta. Documentar en README; alternativa: Pro, o Firebase Hosting (Spark) que no tiene esa clausula.

Firebase Spark / Firestore (doc `firestore/quotas`): gratis por dia 50.000 lecturas, 20.000 escrituras, 20.000 borrados; 1 GiB almacenado; 10 GiB/mes salida; reset ~medianoche Pacifico. Documento max 1 MiB. Calculo: 500 socios x (1 carga completa) = 500 lecturas; con 10 admins x 10 cargas/dia = 50.000 -> limite. Por eso la estrategia de cache (seccion 7) NO relee en cada navegacion. Una creacion cuesta 2 lecturas de `unicos` + 3 escrituras; una edicion con cambio de claves ~3 lecturas + 5 escrituras. Las llamadas `exists/get/getAfter` de las reglas tambien se facturan como lecturas (unas pocas por peticion; despreciable frente al cupo).

Nota de rules: el `firestore.rules` existente ya define `busqueda` como campo obligatorio, `updatedAt == request.time`, `createdAt` inmutable, regex `numeroSocio ^[A-Za-z0-9._-]{1,20}$`, clave `num_` en minuscula, RUT `^[0-9]{7,8}-[0-9K]$`. Esta arquitectura se ajusta a eso (cualquier cambio de modelo debe cambiarse en ambos).

## 2. Estructura de carpetas

```
.nvmrc  .env.example  firebase.json  firestore.rules  firestore.indexes.json
next.config.ts  postcss.config.mjs  tsconfig.json  eslint.config.mjs  vitest.config.ts
docs/arquitectura.md
src/
  app/
    layout.tsx  globals.css
    login/page.tsx
    (app)/                      # layout protegido: AuthGuard
      layout.tsx
      socios/page.tsx           # listado + busqueda + filtro estado
      socios/nuevo/page.tsx
      socios/[id]/page.tsx      # ficha (id = doc id Firestore)
      socios/[id]/editar/page.tsx
    page.tsx                    # redirect a /socios
    not-found.tsx  error.tsx
  components/                   # presentacionales; sin logica Firestore
    SocioForm.tsx  SocioTable.tsx  SocioCard.tsx  SearchBar.tsx  EstadoFilter.tsx
    EstadoBadge.tsx  ConfirmDialog.tsx  Paginacion.tsx  EstadoVacio.tsx  AuthGuard.tsx
  lib/
    firebase.ts   rut.ts   validation.ts   errors.ts   socios.ts   search.ts   auth.tsx
  providers/SociosProvider.tsx  # cache en contexto
  types/socio.ts
tests/
  unit/{rut,validation,search}.test.ts
  rules/firestore.rules.test.ts   # emulador
  e2e/                            # Playwright (opcional)
```

Todo componente que use Firebase/hooks es `'use client'`. No hay API routes ni server actions. `lib/` es TS puro salvo `firebase.ts`/`auth.tsx`/`socios.ts` (dependen de SDK). `rut.ts`, `validation.ts`, `search.ts` NO importan Firebase (testeables con vitest sin emulador).

## 3. Tipos y modulos

```ts
// types/socio.ts
import type { Timestamp } from 'firebase/firestore';

export type Estado = 'ACTIVO' | 'RETIRADO';

/** Documento tal como esta en Firestore. */
export interface SocioDoc {
  numeroSocio: string;        // trim; unicidad case-insensitive (clave num_<lower>)
  rut: string;                // normalizado "12345678-K"
  nombreCompleto: string;     // trim, espacios colapsados, 1..200
  fechaIngreso: Timestamp;
  estado: Estado;
  paginaLibro: number;        // entero 1..1_000_000
  lugarVotacion: string | null; // <=200; ausente en docs viejos => null
  fechaRetiro: Timestamp | null; // null si ACTIVO; Timestamp si RETIRADO
  createdAt: Timestamp;
  updatedAt: Timestamp;       // serverTimestamp; token de concurrencia
  busqueda: string;           // derivado, ver search.ts
}
export interface Socio extends SocioDoc { id: string }

/** Entrada del formulario ya validada/normalizada (sin campos de servidor). */
export interface SocioInput {
  numeroSocio: string; rut: string; nombreCompleto: string;
  fechaIngreso: Date; paginaLibro: number; lugarVotacion: string | null;
}
```

### src/lib/rut.ts (puro)
```ts
export function normalizarRut(raw: string): string;      // "12.345.678-k" | "12345678k" -> "12345678-K"; no valida DV; quita todo salvo [0-9kK], DV en mayuscula, inserta guion. Devuelve '' si <2 chars
export function calcularDv(cuerpo: string): string;      // modulo 11 -> '0'-'9' | 'K'
export function validarRut(raw: string): boolean;        // normaliza + cuerpo 7-8 digitos, sin ceros a la izquierda, DV correcto
export function formatearRut(normalizado: string): string; // "12.345.678-K" solo para mostrar
export function claveBusquedaRut(raw: string): string;   // solo [0-9K] sin guion, para search.ts
```
Decision: se aceptan solo cuerpos de 7 u 8 digitos (coincide con la regex de las reglas). Rechazar cuerpos de 1-6 digitos y con ceros a la izquierda ("0012345678"): evitaria dos claves distintas para el mismo RUT.

### src/lib/validation.ts (puro)
```ts
export type CampoSocio = keyof SocioInput;
export type ErroresCampo = Partial<Record<CampoSocio, string>>; // mensajes es-CL

export type ResultadoValidacion =
  | { ok: true; datos: SocioInput }
  | { ok: false; errores: ErroresCampo };

/** Entrada cruda de formulario (todo string). */
export interface SocioFormRaw {
  numeroSocio: string; rut: string; nombreCompleto: string;
  fechaIngreso: string;   // "YYYY-MM-DD" de <input type=date>
  paginaLibro: string; lugarVotacion: string;
}
export function validarSocio(raw: SocioFormRaw, hoy?: Date): ResultadoValidacion;
// Reglas: numeroSocio ^[A-Za-z0-9._-]{1,20}$ tras trim; rut via validarRut; nombre 1..200 sin caracteres de control;
// fechaIngreso valida, no futura, >= 1900-01-01, se interpreta como medianoche LOCAL; paginaLibro entero >0 <=1_000_000;
// lugarVotacion vacio -> null, <=200.
export function normalizarNumeroSocio(s: string): string;  // trim
export function claveNumero(numero: string): string;       // 'num_' + trim.toLowerCase()
export function claveRut(rutNormalizado: string): string;  // 'rut_' + rutNormalizado
```
Sin librerias de esquema (zod no hace falta para 6 campos).

### src/lib/search.ts (puro)
```ts
export function normalizarTexto(s: string): string;   // NFD, quita diacriticos \p{M}, minusculas, colapsa espacios, trim ("ñ" -> "n": aceptado)
export function construirBusqueda(d: Pick<SocioInput,'nombreCompleto'|'rut'|'numeroSocio'|'lugarVotacion'>): string;
//  = normalizarTexto(nombre) + ' ' + rutSinGuion('12345678k') + ' ' + normalizarTexto(numero) [+ ' ' + lugar]
export interface FiltroSocios { texto: string; estado: Estado | 'TODOS' }
export function filtrarSocios(socios: readonly Socio[], f: FiltroSocios): Socio[];
//  tokens = normalizarTexto(texto).split(' '); un RUT con puntos/guion se normaliza a [0-9k]; cada token debe estar contenido (AND) en `busqueda`; orden: nombreCompleto localeCompare 'es'
export function paginar<T>(items: readonly T[], pagina: number, tam: number): { items: T[]; total: number; paginas: number };
```
Por que `busqueda` (justificado, ya exigido por las reglas): permite filtrar con un solo `includes` por token sin recalcular normalizacion sobre 500 docs en cada tecla. Coste: debe recalcularse en TODA escritura que cambie nombre/rut/numero/lugar; las reglas solo validan tipo/tamano (no recomputan), asi que `busqueda` es solo conveniencia, no seguridad. Alternativa mas simple (calcular en memoria al cargar) tambien valida; se mantiene el campo porque las reglas ya lo exigen. `construirBusqueda` es la UNICA funcion que lo produce.

### src/lib/errors.ts - contrato de errores
```ts
export type CodigoError =
  | 'VALIDACION'          // entrada invalida (con errores por campo)
  | 'RUT_DUPLICADO'       // existe unicos/rut_<x> de otro socio
  | 'NUMERO_DUPLICADO'    // existe unicos/num_<x> de otro socio
  | 'DUPLICADO_MULTIPLE'  // ambos (details.campos = ['rut','numeroSocio'])
  | 'NO_ENCONTRADO'       // socios/{id} no existe
  | 'CONFLICTO'           // updatedAt local != servidor (otro admin edito)
  | 'ESTADO_INVALIDO'     // retirar a RETIRADO / reactivar a ACTIVO
  | 'NO_AUTORIZADO'       // permission-denied
  | 'SIN_CONEXION'        // unavailable / network
  | 'CUOTA'               // resource-exhausted
  | 'DESCONOCIDO';

export class SocioError extends Error {
  readonly codigo: CodigoError;
  readonly errores?: ErroresCampo;       // solo VALIDACION
  constructor(codigo: CodigoError, mensaje: string, errores?: ErroresCampo, cause?: unknown);
}
export function traducirErrorFirebase(e: unknown): SocioError; // FirebaseError.code -> CodigoError
export function mensajeUsuario(e: unknown): string;            // texto es-CL, sin datos sensibles
```
Regla: `socios.ts` solo lanza `SocioError`; la UI hace `switch (e.codigo)`. Nunca se registra (console) RUT ni payloads; solo `codigo`.

### src/lib/socios.ts (SDK)
```ts
export function sociosCol(): CollectionReference;           // db, 'socios'
export async function listarSocios(): Promise<Socio[]>;     // getDocs(socios) ordenado en cliente; 1 lectura por doc
export async function obtenerSocio(id: string): Promise<Socio>; // NO_ENCONTRADO si no existe
export async function crearSocio(datos: SocioInput): Promise<Socio>;
export async function actualizarSocio(id: string, datos: SocioInput, esperadoUpdatedAt: Timestamp): Promise<Socio>;
export async function cambiarEstado(id: string, nuevo: Estado, esperadoUpdatedAt: Timestamp): Promise<Socio>;
```
Todas las escrituras usan `runTransaction`. El retorno es el doc releido (get fuera de la transaccion no; se construye el `Socio` local con `updatedAt` re-leido via `getDoc` tras commit, porque `serverTimestamp()` no tiene valor local en transacciones) - una lectura extra aceptable.

### src/lib/auth.tsx
```ts
export type EstadoAuth =
  | { estado: 'cargando' }
  | { estado: 'no-autenticado' }
  | { estado: 'sin-permiso'; user: User }   // autenticado, sin admins/{uid}
  | { estado: 'admin'; user: User };
export function AuthProvider(props: { children: ReactNode }): JSX.Element; // onAuthStateChanged + getDoc(admins/uid)
export function useAuth(): EstadoAuth & { login(email: string, password: string): Promise<void>; logout(): Promise<void> };
```
`login` hace `signInWithEmailAndPassword`; cualquier fallo se mapea a un unico mensaje generico ("Credenciales invalidas") salvo `network-request-failed` y `too-many-requests`. `AuthGuard` redirige segun estado. `getDoc(admins/uid)` con `permission-denied`/inexistente => `sin-permiso`.

### src/lib/firebase.ts
Inicializa app una sola vez (`getApps().length ? getApp() : initializeApp(cfg)`), con config de `process.env.NEXT_PUBLIC_FIREBASE_*`. `getAuth`, `getFirestore` (cache en memoria por defecto, SIN persistencia IndexedDB multi-tab: evita datos stale entre admins). Conecta a emuladores solo si `NEXT_PUBLIC_USE_EMULATORS === 'true'`. No se inicializa Analytics.

## 4. Transacciones de unicidad

Convencion de IDs: `socios/{auto}`; `unicos/rut_<12345678-K>`; `unicos/num_<numero en minusculas>`. Doc `unicos` = `{ socioId: string }`.
Regla SDK: en `runTransaction` TODAS las lecturas van antes de cualquier escritura. `runTransaction` reintenta solo ante contencion (default 5); los errores que lanzamos nosotros (SocioError) abortan sin reintento.
Siempre: `datos.numeroSocio` ya trim; `busqueda = construirBusqueda(datos)`; `serverTimestamp()` para `createdAt`/`updatedAt` (las reglas exigen `== request.time`).

### 4.1 crearSocio
```
socioRef = doc(sociosCol())          // id generado en cliente, sin I/O
rutRef = doc(db,'unicos',claveRut(rut)); numRef = doc(db,'unicos',claveNumero(num))
runTransaction:
  [rutSnap, numSnap] = await Promise.all([tx.get(rutRef), tx.get(numRef)])
  si rutSnap.exists && numSnap.exists -> DUPLICADO_MULTIPLE
  si rutSnap.exists -> RUT_DUPLICADO ; si numSnap.exists -> NUMERO_DUPLICADO
  tx.set(rutRef,{socioId: socioRef.id}); tx.set(numRef,{socioId: socioRef.id})
  tx.set(socioRef,{...datos, estado:'ACTIVO', fechaRetiro:null, createdAt:ST, updatedAt:ST, busqueda})
```
Concurrencia: dos creaciones paralelas con el mismo RUT leen ambas "no existe"; Firestore detecta la contencion sobre `rutRef` y reintenta una; la reintentada ve el doc y lanza RUT_DUPLICADO. Defensa en profundidad: las reglas rechazan `create` sobre una reserva existente (seria update, denegado).
Si `reservas` quedan huerfanas (socio inexistente): no puede ocurrir por regla (`existsAfter` del socio). Si un RUT queda "reservado" por un socio, aunque este RETIRADO, sigue bloqueando (intencional: un retirado se reactiva, no se recrea).

### 4.2 actualizarSocio (puede cambiar rut/numero)
```
socioRef = doc(db,'socios',id)
runTransaction:
  snap = await tx.get(socioRef); si !exists -> NO_ENCONTRADO
  actual = snap.data()
  si !actual.updatedAt.isEqual(esperadoUpdatedAt) -> CONFLICTO
  rutCambia = actual.rut !== datos.rut
  numCambia = actual.numeroSocio.toLowerCase() !== datos.numeroSocio.toLowerCase()
  (solo si cambian) leer nuevos: tx.get(nuevoRutRef) / tx.get(nuevoNumRef)   <- todas las lecturas primero
     si existe (sea de otro socio o, por corrupcion manual, del mismo) -> RUT_DUPLICADO / NUMERO_DUPLICADO / DUPLICADO_MULTIPLE
     (un set sobre una reserva existente seria update, denegado por reglas; no se intenta)
  escrituras:
     si rutCambia: tx.delete(viejoRutRef); tx.set(nuevoRutRef,{socioId:id})
     si numCambia: tx.delete(viejoNumRef); tx.set(nuevoNumRef,{socioId:id})
     tx.update(socioRef,{numeroSocio,rut,nombreCompleto,fechaIngreso,paginaLibro,lugarVotacion,busqueda,updatedAt:ST})
```
Notas: NO se envian `estado`, `fechaRetiro`, `createdAt` (edicion de datos no cambia estado). Si solo cambia mayusculas del numero ("a1" -> "A1") la clave `num_a1` no cambia: no se toca `unicos`. Maximo de documentos tocados: socio + 2 viejos + 2 nuevos = 5 (rules limitan a 20 accesos exists/get por operacion multi-documento; el rules actual usa ~8). Si hay `lugarVotacion` null, escribir `null` explicito (la regla acepta ausente o null).

### 4.3 cambiarEstado (retirar / reactivar)
```
runTransaction:
  snap = await tx.get(socioRef); !exists -> NO_ENCONTRADO
  si updatedAt != esperado -> CONFLICTO
  si actual.estado === nuevo -> ESTADO_INVALIDO
  tx.update(socioRef, <segun nuevo, abajo>)
```
`fechaRetiro` debe ser Timestamp (las reglas piden `is timestamp`; `serverTimestamp()` lo satisface).
`RETIRADO`: `{estado:'RETIRADO', fechaRetiro: serverTimestamp(), updatedAt: serverTimestamp()}`.
`ACTIVO`: `{estado:'ACTIVO', fechaRetiro: null, updatedAt: serverTimestamp()}`.
Las reservas `unicos` NO se tocan (el socio conserva su RUT/numero). Una sola lectura + una escritura en el socio; las reglas verifican igualmente `reservasOk` (2 getAfter).

## 5. Conflicto con updatedAt
- La ficha/formulario guarda el `updatedAt` del `Socio` cargado (de la cache) como `esperadoUpdatedAt`.
- Dentro de la transaccion se compara con `isEqual` contra el valor del servidor. Distinto => `CONFLICTO`.
- UI ante CONFLICTO: mensaje "Otro administrador modifico este socio" + boton "Recargar datos" (refresca cache y el formulario; los cambios del usuario se pierden, aceptado: edicion concurrente es rarisima con pocos admins). Sin merge por campos.
- Tras toda escritura exitosa se actualiza el socio en cache con el doc releido (nuevo updatedAt).
- `updatedAt` lo fija el servidor, el cliente nunca lo manda; las reglas lo fuerzan a `request.time`.
- Un unico limite aceptado: la comparacion de la cache puede estar vieja (otro admin edito antes de que yo abriera) y ese es exactamente el caso detectado.

## 6. Politica de rutas
- IDs en URL = ID automatico de Firestore. NUNCA RUT ni numero de socio en URL, query string, `<title>`, ni logs.
- `/login`, `/socios`, `/socios/nuevo`, `/socios/[id]`, `/socios/[id]/editar`. La busqueda y el filtro viven en estado de UI (NO usar `?q=` porque el texto puede ser un RUT; `?estado=` si se permite, no es sensible).
- `/socios/[id]` y `editar` resuelven desde cache; si el id no esta en cache tras carga, `NO_ENCONTRADO` -> `not-found` UI. Con export dinamico `[id]` es CSR puro: la pagina lee `useParams()`; no usar `generateStaticParams`.
- `next.config.ts`: cabeceras de seguridad (CSP con `connect-src` a `*.googleapis.com`, `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `firestore.googleapis.com`, y `frame-src`/`script-src` minimos; `Referrer-Policy: no-referrer`; `X-Frame-Options: DENY`; `nosniff`; HSTS; `Permissions-Policy` vacia), mas `<meta name="robots" content="noindex,nofollow">` y `X-Robots-Tag: noindex` (datos privados). Evaluar CSP con nonce solo si Next lo exige; `'unsafe-inline'` en `style-src` es aceptable por Tailwind/Next; para `script-src` empezar con `'self'` + hashes/`'unsafe-inline'` de Next solo si hace falta, probado en build.

## 7. Carga, cache y busqueda
- `SociosProvider` (dentro del layout `(app)`, solo montado si estado auth = admin): `{ socios: Socio[]; cargando; error; recargar(): Promise<void>; upsert(s: Socio): void }`.
- Una carga (`getDocs(socios)`, ~500 lecturas) al montar tras autenticar admin. NO listeners `onSnapshot` (cada cambio ajeno costaria lecturas y ~500 por reconexion; 500 socios no lo justifican). Refresco manual con boton "Actualizar" + indicador "Actualizado hace X min". Tras escribir, `upsert(socio)` actualiza la cache localmente (sin recarga completa).
- Presupuesto: ~500 lecturas por carga; recargas solo bajo demanda. Con 50.000 lecturas/dia se admiten ~100 cargas completas/dia: suficiente. Al cerrar sesion, se vacia la cache (datos personales).
- Busqueda: `filtrarSocios` sobre el array en memoria, `useDeferredValue` o debounce 150-200 ms; `paginar` a 25 por pagina en cliente; el filtro por estado es parte de `FiltroSocios`. Default del filtro: ACTIVO (prioridad al caso comun), con opcion TODOS y RETIRADO.
- Sin indices compuestos (`firestore.indexes.json` vacio): no hay consultas filtradas en servidor.
- Limite documentado: hasta ~5.000 socios el enfoque sigue siendo razonable (carga 5.000 lecturas y <2 MB); mas alla migrar a paginacion en servidor + prefijo normalizado.

## 8. Convenciones de codigo
- TS `strict: true` + `noUncheckedIndexedAccess`, `noImplicitOverride`; prohibido `any` (eslint `@typescript-eslint/no-explicit-any` error). Alias `@/*` -> `src/*`.
- Idioma: identificadores de dominio en espanol (`socio`, `rut`, `paginaLibro`), infraestructura en ingles (`provider`, `guard`); textos UI en es-CL; fechas con `Intl.DateTimeFormat('es-CL')`; fechas de ingreso se tratan como fecha local (medianoche local) y se muestran en zona local.
- Archivos: componentes `PascalCase.tsx`, libs `camelCase.ts`. Exportaciones con nombre (no default salvo paginas Next).
- Un archivo = un dueno (el agente Full-Stack es el unico que edita `src/`).
- Componentes presentacionales sin acceso a Firestore; toda E/S en `lib/socios.ts` y `lib/auth.tsx`.
- Funciones puras (`rut`, `validation`, `search`) con cobertura vitest completa: casos DV K, DV 0, RUT con puntos, minusculas, 7 vs 8 digitos, acentos, nombres con ñ, tokens multiples.
- Accesibilidad: labels asociados, `aria-live` para errores/resultados, foco visible, dialogo con trap de foco (Radix Dialog), `prefers-reduced-motion`.
- Errores: nunca mostrar `error.message` crudo de Firebase; usar `mensajeUsuario`.
- Secretos: solo `NEXT_PUBLIC_FIREBASE_*` (publicas por diseno; la seguridad son las reglas y restriccion de API key por dominio). `.env` fuera de git; `.env.example` sin valores.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (vitest), `test:rules` (`firebase emulators:exec --only firestore,auth "vitest run tests/rules"`), `test:e2e`.
- Dependencias minimas: no agregar zod, react-query, zustand, RHF, shadcn CLI. Radix solo `@radix-ui/react-dialog` si hace falta el trap de foco.

## 9. Riesgos tecnicos y mitigacion

| Riesgo | Mitigacion |
|---|---|
| TypeScript 7 (`latest`) incompatible con typescript-eslint (<6.1) | Fijar TS 6.0.3; revisar `npm ls` en CI |
| ESLint 10 con plugins de eslint-config-next aun sin soporte | Probar `npm run lint` tras instalar; fallback a ESLint 9 ultima |
| Vitest 5 con peers vite | Instalar vite explicito en rango soportado si npm avisa; probar `npm test` |
| Registro publico de Auth: cualquiera con la API key puede crear usuarios | Deshabilitar sign-up (Auth > Settings > "Enable create (sign-up)") y/o usar solo usuarios creados manualmente; aun asi sin `admins/{uid}` las reglas niegan todo |
| Reglas con `exists()`: 1 lectura facturada por evaluacion | Aceptado (son <1% del cupo); cache en cliente |
| Cuota diaria Spark (50k lecturas) | Sin listeners, carga unica, refresco manual; alertas de presupuesto |
| Cache obsoleta entre admins | `updatedAt` + CONFLICTO; boton Actualizar; recarga al volver a foco tras >10 min (opcional) |
| `busqueda` desincronizada si algun codigo escribe datos sin recalcularla | Unica funcion `construirBusqueda` usada solo desde `socios.ts`; test unitario; las reglas exigen presencia |
| Reservas `unicos` huerfanas si alguien edita a mano en la consola | Documentar en README; script de auditoria manual (opcional); las reglas no permiten crearlas sin socio |
| Edicion de RUT: usuario cambia RUT y choca con otro socio | RUT_DUPLICADO con mensaje que NO revela datos del otro socio (solo "ya existe un socio con ese RUT"); se puede ofrecer link al socio por id, valido solo para admins |
| Perdida de datos: no hay borrado, pero sin backups | Documentar `gcloud firestore export` manual; no afirmar backups automaticos |
| Hobby de Vercel es no comercial | Documentar; plan B Firebase Hosting o Pro |
| Emulador requiere Java | Verificar `java -version`; si falta, informar limitacion y entregar tests de reglas sin ejecutar |
| `serverTimestamp()` en transacciones no devuelve valor | Releer doc tras commit (1 lectura) |
| Zona horaria en fechas | Guardar medianoche local convertida a Timestamp; mostrar con `es-CL`; test de borde |
| CSP rompe auth/Firestore | Probar login y carga en build de produccion local antes de entregar |
| Exceso de ingenieria | Sin onSnapshot, sin libs de estado/forms, sin Admin SDK, sin Cloud Functions |

## 10. Decisiones fuera de alcance (explicito)
Sin roles distintos de admin, sin historial/auditoria de cambios, sin borrado, sin importacion masiva, sin offline, sin Cloud Functions, sin Analytics, sin SSR de datos.

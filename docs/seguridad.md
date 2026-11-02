# Seguridad de SocioIndice

Aplicacion Next.js + Firebase Auth + Firestore consumido directamente desde el navegador, sin backend propio. Contiene datos personales (nombre, RUT) de unos 500 socios. **Las reglas de Firestore son la unica autoridad de autorizacion**; los guards de la interfaz son solo UX.

## 1. Modelo de amenazas

| Amenaza | Mitigacion |
|---|---|
| Visitante anonimo lee/escribe Firestore con la config publica (la `apiKey` no es secreta) | Reglas deny-by-default; solo UIDs presentes en `admins/{uid}` leen o escriben. |
| Usuario autenticado que no es admin (p. ej. alguien que se registra si el sign-up esta abierto) | Autenticacion no implica autorizacion: sin documento `admins/{uid}` todo es denegado. Ademas se deshabilita el registro publico. |
| Auto-asignarse admin | `admins` es `write: false` para todos; `get` solo del propio doc; sin `list`. Se crea manualmente en la consola. |
| Duplicados de RUT / numero de socio, condiciones de carrera | Coleccion `unicos` con reservas; las reglas (`existsAfter`/`getAfter`) exigen que socio y reservas se escriban en el mismo commit, que cada reserva apunte a un socio que posee esa clave y que no se pueda pisar una reserva existente. |
| Datos corruptos o campos inyectados | Validacion de tipos, longitudes, enumeraciones y `hasOnly` en reglas; `createdAt` inmutable, `updatedAt == request.time`; coherencia `estado`/`fechaRetiro`. |
| Borrado de datos | `delete` de socios denegado; las reservas solo se liberan al cambiar el RUT/numero del dueno en el mismo commit. Backups con `gcloud firestore export` (manual). |
| Robo de credenciales de un admin | Contrasena fuerte, MFA recomendado, limites de intentos de Firebase, cierre de sesion explicito. |
| XSS / clickjacking / exfiltracion | CSP estricta, `X-Frame-Options`/`frame-ancestors`, React escapa por defecto (no usar `dangerouslySetInnerHTML`). |
| Fuga de RUT por URL, logs, referrer | Rutas por ID de documento Firestore; RUT jamas en URL ni en logs; `Referrer-Policy`. |
| Abuso de cuota (DoS economico) | API key restringida, App Check (opcional), presupuesto/alertas en Google Cloud. |

Limites aceptados: un admin comprometido puede leer y modificar todos los socios (no hay roles finos ni borrado). Cualquier admin ve todos los datos. El RUT se valida en cliente con modulo 11; las reglas solo verifican el formato (`^[0-9]{7,8}-[0-9K]$`) porque las reglas no tienen bucles.

### Contrato de las reglas con el cliente

- Claves de reserva: `rut_<rut>` (RUT normalizado, p. ej. `rut_12345678-5`, K mayuscula) y `num_<numeroSocio en minusculas>`. El `numeroSocio` debe cumplir `^[A-Za-z0-9._-]{1,20}$`.
- `createdAt` y `updatedAt` deben enviarse con `serverTimestamp()` en la creacion; en updates, `updatedAt: serverTimestamp()` y `createdAt` sin cambios (en una transaccion hay que reenviar el valor leido).
- `lugarVotacion` y `fechaRetiro` pueden estar ausentes o `null`. `RETIRADO` exige `fechaRetiro` timestamp; `ACTIVO` exige null/ausente.
- Crear/editar/retirar/reactivar se hace con `runTransaction` o `writeBatch`: socio + reservas en la misma operacion. Cambiar RUT o numero = actualizar socio + borrar reserva vieja + crear reserva nueva.
- Limite de Firestore Rules: 10 accesos `get/exists/getAfter/existsAfter` en peticiones de un documento y 20 en batch/transaccion (los repetidos al mismo documento se cachean). Las reglas actuales usan como maximo ~8 documentos distintos por commit.
- Una reserva huerfana (si algo falla fuera del flujo) no se puede borrar desde el cliente; se corrige a mano en la consola.

## 2. Autenticacion

1. **Metodo**: solo Email/Contrasena. Consola Firebase > Authentication > Sign-in method: habilitar solo "Email/Password"; dejar el enlace por correo desactivado y no habilitar proveedores sociales ni anonimo.
2. **Deshabilitar el registro publico**: Authentication > Settings > User actions > desactivar "Enable create (sign-up)" (disponible con Identity Platform / Authentication con actualizacion). Si no esta disponible, no exponer sign-up en la UI y confiar en que sin `admins/{uid}` un usuario nuevo no accede a nada (las reglas lo garantizan, pero se acumularian usuarios basura). Los usuarios se crean manualmente en la consola.
3. **Politica de contrasenas**: activar la politica de contrasenas (longitud minima >= 12) en Authentication > Settings > Password policy cuando este disponible.
4. **Limites de intentos**: Firebase Auth aplica limitacion propia (`auth/too-many-requests`) y proteccion de enumeracion de correos (activa por defecto en proyectos nuevos). La UI muestra siempre un mensaje generico ("Correo o contrasena incorrectos") sin distinguir usuario inexistente de contrasena erronea.
5. **MFA (recomendado)**: MFA por SMS/TOTP requiere Identity Platform (upgrade de Authentication; puede tener costo/uso de SMS). Si se activa, la UI de login debe soportar el segundo factor (`auth/multi-factor-auth-required`). Alternativa minima: contrasenas largas unicas en gestor de contrasenas y pocos admins.
6. **Restringir la API key por dominio**: Google Cloud Console > APIs y servicios > Credenciales > la "Browser key" del proyecto > Restricciones de aplicacion = "Sitios web (referentes HTTP)": `https://<tu-dominio>/*`, `https://<tu-proyecto>.vercel.app/*`, `http://localhost:3000/*` (solo para desarrollo; quitarlo despues) y `https://<tu-proyecto>.firebaseapp.com/*`. Restricciones de API: limitar a Identity Toolkit API, Token Service API y Cloud Firestore API. No es un secreto, pero evita uso desde otros origenes.
7. **Dominios autorizados**: Authentication > Settings > Authorized domains: dejar solo el dominio de produccion, el de preview de Vercel si se usa, y `localhost` mientras se desarrolla. Eliminar los que sobren.
8. **Sesion**: persistencia local de Firebase por defecto; boton de cerrar sesion visible. En equipos compartidos, usar `browserSessionPersistence`.
9. **App Check (opcional)**: reCAPTCHA Enterprise/v3 con enforcement en Firestore reduce el trafico automatizado; agregar origenes de reCAPTCHA a la CSP si se activa.

## 3. Primer administrador (manual)

1. Consola Firebase > Authentication > Users > "Add user": correo y contrasena fuerte. Copiar el **UID**.
2. Firestore Database > "Start collection" `admins` > ID de documento = el UID copiado > un campo cualquiera (p. ej. `creado: true`, boolean).
3. Publicar las reglas: `firebase deploy --only firestore:rules,firestore:indexes` (con `.firebaserc` apuntando al proyecto) o pegarlas en la consola.
4. Iniciar sesion en la app. Para agregar o quitar admins se repite el paso 1-2 / se borra el documento en la consola; el cliente nunca puede hacerlo.
5. Despues de crear el admin, desactivar el sign-up (seccion 2.2).

## 4. Cabeceras de seguridad y CSP (Next.js)

Origenes exactos requeridos por Firebase Auth (email/contrasena) + Firestore con el SDK modular:

- `https://identitytoolkit.googleapis.com` (login, `signInWithPassword`, `accounts:lookup`)
- `https://securetoken.googleapis.com` (refresh de tokens)
- `https://firestore.googleapis.com` (Firestore, fetch streaming / long polling)
- `https://www.googleapis.com` (algunos endpoints auxiliares de Auth)
- `https://apis.google.com`, `https://<projectId>.firebaseapp.com` y `https://accounts.google.com` **solo** si se usan `signInWithPopup/Redirect`. Con email/contrasena no se necesitan: inicializar con `initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] })` en vez de `getAuth` evita cargar el resolver de popup/iframe.
- Con MFA por SMS, App Check o reCAPTCHA: `https://www.google.com/recaptcha/`, `https://www.gstatic.com/recaptcha/` en `script-src`/`frame-src`/`connect-src`.

Ejemplo para `next.config.ts` (ajustar a lo que realmente use la app; verificar en consola del navegador que no haya violaciones):

```ts
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  // Next inyecta scripts inline para hidratacion: usar nonce via middleware (recomendado)
  // o 'unsafe-inline' si no se usa nonce. 'unsafe-eval' solo en desarrollo.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  [
    "connect-src 'self'",
    'https://identitytoolkit.googleapis.com',
    'https://securetoken.googleapis.com',
    'https://firestore.googleapis.com',
    'https://www.googleapis.com',
    ...(isDev ? ['http://127.0.0.1:8080', 'http://127.0.0.1:9099', 'ws://127.0.0.1:8080'] : []),
  ].join(' '),
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];
```

Notas: `'unsafe-inline'` en `script-src` debilita la CSP; para eliminarlo se necesita un nonce por peticion (proxy/middleware de Next) y renderizado dinamico. Si se usan Auth por popup, `Cross-Origin-Opener-Policy: same-origin` rompe `signInWithPopup` (no aplica a email/contrasena). Quitar `preload` de HSTS hasta confirmar que todo el dominio es HTTPS. Si no se usa `frame-src 'none'` junto a popup/MFA, ajustarlo.

## 5. Logs y datos personales

- Nunca registrar (`console.*`, servicios de error, analytics) RUT, nombre completo, correo ni objetos de socio. Registrar solo el ID de documento de Firestore y codigos de error (`error.code`).
- Los errores de Firebase pueden incluir rutas/valores: mostrar al usuario mensajes genericos y registrar solo `code`.
- Sin analytics ni session replay. Sin RUT en URL, `title`, `localStorage` ni `sessionStorage`; rutas con ID de documento.
- Vercel: los logs de funciones/Runtime no deben contener PII; no hay funciones propias en este proyecto. `.env` no se sube (ya esta en `.gitignore`); las variables `NEXT_PUBLIC_FIREBASE_*` son publicas por diseno, no poner secretos con prefijo `NEXT_PUBLIC_`.
- Exportaciones/backups (`gcloud firestore export`) contienen datos personales: guardarlos en un bucket privado con acceso minimo y retencion definida.

## 6. Pruebas de reglas

`tests/rules/firestore.rules.test.ts` (vitest + `@firebase/rules-unit-testing`) cubre: anonimo, autenticado sin admin, admin, auto-asignacion de admin, reservas ajenas/huerfanas/duplicadas, socio sin reservas, concurrencia, estado/fechaRetiro inconsistentes, campos extra/tipos invalidos, inmutabilidad de `createdAt`, cambio atomico de RUT/numero y delete.

devDependencies necesarias: `@firebase/rules-unit-testing`, `firebase-tools`, `vitest` (y `firebase`, ya dependencia). Script sugerido:

```
"test:rules": "firebase emulators:exec --only firestore --project demo-socios-rules \"vitest run --config tests/rules/vitest.config.ts\""
```

Requisitos: **JDK 21 o superior** (firebase-tools 15 ya no acepta Java 17) y puerto 8080 libre. Ver la seccion de verificacion del README.

## 7. Auditoria final (independiente)

Verificado ejecutando: `npm run test:rules` (92 pruebas OK, incluida `tests/rules/adversarial.test.ts` con 35 casos adversarios: no-admin, auto-asignacion de admin, robo/pisado de reservas, cambio de rut/numero sin reservas, campos extra, tipos, estado/fechaRetiro, delete); `npm run build` + `npm start` con `curl -I` (CSP y cabeceras presentes en todas las rutas); Chromium/Playwright cargando /login en produccion sin errores de consola ni violaciones CSP; `/socios` sin sesion redirige a /login sin mostrar contenido; `npm audit --omit=dev`: 0; `npm audit` completo: 5 moderadas, solo dev (firebase-tools -> pubsub/gaxios/uuid/opentelemetry), sin impacto en el bundle.

Hallazgos (ninguno critico/alto): (1) Bajo: `script-src 'unsafe-inline'` (necesario sin nonce; mitigado: sin dangerouslySetInnerHTML, React escapa; Resaltado usa nodos React). (2) Bajo, no verificable desde el repo: confirmar en consola de Firebase que el registro publico (sign-up) esta deshabilitado y activar proteccion contra enumeracion de correos; la API key es publica y cualquiera puede llamar a identitytoolkit. (3) Info: las reglas no validan que `busqueda` coincida con los campos ni `fechaRetiro >= fechaIngreso`; solo admins escriben. (4) Info: este documento difiere del codigo en Referrer-Policy (codigo: no-referrer) y HSTS (sin preload). (5) Info: el cache en memoria de Firestore sobrevive al logout en la misma pestana; recomendable `terminate()`/recarga al cerrar sesion si se comparte equipo.

# SocioÍndice

Índice digital de socios (aprox. 500) para reemplazar la búsqueda en un libro físico. Permite encontrar un socio y ver en qué **página del libro** está registrado. Es una aplicación Next.js (App Router) que habla directamente con Firebase Auth y Firestore desde el navegador; **no tiene backend propio**. La seguridad real la imponen las reglas de Firestore (`firestore.rules`); la interfaz solo ayuda a la experiencia de uso.

Funciones: inicio de sesión de administradores, índice con búsqueda (nombre, RUT, número de socio, página) y filtro por estado, paginación de 25, crear, ver ficha, editar, retirar y reactivar (con confirmación). No hay borrado de socios, importación/exportación ni analytics (ver "Limitaciones").

Documentación técnica: `docs/arquitectura.md`, `docs/diseno.md`, `docs/seguridad.md`.

## 1. Requisitos

- **Node.js 24.22.1** (línea LTS 24.x). Se fija en `.nvmrc` y `engines.node` es `24.x`.
- **Java 21 o superior** (solo para los emuladores de Firebase y `npm run test:rules`; `firebase-tools` 15 ya no acepta Java 17).
- Un proyecto de Firebase (plan Spark sirve) con Authentication (correo/contraseña) y Firestore.

### Por qué Node 24.22.1 y nvm

Node 24 es la línea LTS activa y es la que usa Vercel por defecto; `@firebase/rules-unit-testing@6` exige Node >= 24.12, por lo que Node 22 queda descartado para las pruebas de reglas. Se fija la versión exacta localmente (`.nvmrc`) para que todos los desarrolladores usen el mismo parche (las versiones anteriores de 24.x tienen parches de seguridad pendientes), y `24.x` en `engines` porque Vercel solo permite elegir la versión mayor y aplica los parches por su cuenta.

Con nvm (en Windows, [nvm-windows](https://github.com/coreybutler/nvm-windows)):

```bash
nvm install 24.22.1
nvm use 24.22.1
node -v   # v24.22.1
```

(En Linux/macOS, `nvm use` sin argumentos lee `.nvmrc`.)

## 2. Instalación

```bash
npm ci
```

`npm ci` instala exactamente lo que está en `package-lock.json`. Las versiones de `package.json` están fijadas sin `^` ni `~`; si cambias una dependencia, usa `npm install` y sube el `package-lock.json` actualizado. TypeScript está fijado en 6.0.3 (y no en la 7.x) porque `typescript-eslint` aún no soporta la 7; reevalúalo cuando lo haga.

## 3. Variables de entorno

Copia `.env.example` a `.env` y rellena los valores desde Firebase Console > Configuración del proyecto > Tus apps (app web):

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_EMULATORS=
```

- Estas variables son **públicas por diseño** (van en el JavaScript del navegador). La seguridad no depende de ocultarlas sino de las reglas de Firestore y de restringir la API key por dominio (sección 5).
- `.env` está en `.gitignore`: **nunca lo subas**. Solo `.env.example` (sin valores) va al repositorio.
- No se usa `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`: la aplicación no usa Analytics.
- `NEXT_PUBLIC_USE_EMULATORS=true` solo funciona en desarrollo (`npm run dev`); en una compilación de producción se ignora.

## 4. Ejecución local

### 4.1 Con Firebase real (proyecto de desarrollo)

```bash
npm run dev
```

Abre <http://localhost:3000>. Necesitas haber hecho antes la configuración de la sección 5 (usuario administrador y reglas publicadas) en tu proyecto. Usa preferentemente un proyecto de desarrollo, no el de producción.

### 4.2 Con emuladores (recomendado, sin tocar datos reales)

Con `NEXT_PUBLIC_USE_EMULATORS=true` la app usa un proyecto ficticio (`demo-socios`) y se conecta a Auth (puerto 9099) y Firestore (8080) en `127.0.0.1`. Necesita Java.

Terminal 1:

```bash
npx firebase emulators:start --only auth,firestore --project demo-socios
```

Terminal 2:

```bash
# PowerShell: $env:NEXT_PUBLIC_USE_EMULATORS="true"; npm run dev
NEXT_PUBLIC_USE_EMULATORS=true npm run dev
```

Los emuladores cargan `firestore.rules`. Para entrar necesitas un usuario administrador en el emulador: crea el usuario en la interfaz del emulador de Auth (o con su API REST) y un documento `admins/<uid>` en Firestore del emulador (el script `tests/e2e/smoke.spec.ts` muestra cómo sembrarlos por API). Los datos del emulador se pierden al detenerlo.

## 5. Configuración de Firebase

### 5.1 Authentication

1. Consola Firebase > Authentication > Sign-in method: habilita **solo Email/Contraseña** (sin enlace por correo, anónimo ni proveedores sociales).
2. **Deshabilita el registro público**: Authentication > Settings > User actions > desactiva "Enable create (sign-up)" (según el plan puede requerir actualizar a Identity Platform). La aplicación no tiene pantalla de registro ni enlaces a registro; los usuarios se crean a mano en la consola. Aunque alguien se registrara, sin documento `admins/{uid}` las reglas le niegan todo.
3. Activa la política de contraseñas (mínimo 12 caracteres) si está disponible. MFA es recomendable (requiere Identity Platform).
4. Authentication > Settings > Authorized domains: deja solo tu dominio de producción, el de Vercel si lo usas y `localhost` mientras desarrollas.
5. Google Cloud Console > APIs y servicios > Credenciales > "Browser key": restringe por referente HTTP a tus dominios y limita las APIs a Identity Toolkit, Token Service y Cloud Firestore.

### 5.2 Reglas de Firestore

Las reglas están en `firestore.rules` (deny por defecto; solo los UID presentes en `admins/{uid}` leen o escriben). Publícalas:

```bash
cp .firebaserc.example .firebaserc      # y edita el ID de tu proyecto
npx firebase deploy --only firestore:rules,firestore:indexes
```

(o pégalas en la consola de Firebase). `.firebaserc` está ignorado por git.

### 5.3 Primer administrador (manual)

1. Authentication > Users > "Add user": correo y contraseña fuerte. Copia el **UID**.
2. Firestore Database > "Start collection" `admins` > ID de documento = el UID copiado > un campo cualquiera (por ejemplo `creado: true`).
3. Inicia sesión en la app. Para agregar o quitar administradores se repite el procedimiento o se borra el documento en la consola; el cliente nunca puede modificar `admins`.
4. Después, desactiva el registro público (5.1.2).

### 5.4 Modelo de datos y unicidad

- `socios/{id}`: datos del socio (el `id` es el ID automático de Firestore; el RUT nunca va en la URL).
- `unicos/{clave}`: reservas `rut_<rut normalizado>` y `num_<número en minúsculas>` que garantizan que no haya RUT ni número de socio duplicados. Crear/editar se hace en una transacción que toca socio y reservas; las reglas lo verifican.
- `admins/{uid}`: lista de administradores (solo manual).
- Un socio retirado conserva su RUT y número reservados (se reactiva, no se vuelve a crear).

## 6. Pruebas y verificación

```bash
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm test             # Vitest: rut, validation, search (sin emulador)
npm run test:rules   # reglas de Firestore contra el emulador (requiere Java)
npm run test:integration  # lib/socios.ts contra emuladores Auth+Firestore (requiere Java)
npm run test:e2e     # Playwright contra la app + emuladores (requiere Java)
npm run build        # compilación de producción
npm audit
```

Para Playwright la primera vez instala el navegador: `npx playwright install chromium`.

Los RUT de las pruebas son ficticios con dígito verificador calculado, no corresponden a personas reales.

## 7. Compilación y despliegue en Vercel

```bash
npm run build
npm start
```

En Vercel: importa el repositorio, framework Next.js, versión de Node 24.x, y define en Settings > Environment Variables las seis variables `NEXT_PUBLIC_FIREBASE_*` (no definas `NEXT_PUBLIC_USE_EMULATORS`). Agrega el dominio de Vercel a los dominios autorizados de Auth y a la restricción de la API key. Las cabeceras de seguridad y la CSP se configuran en `next.config.ts` (la CSP mantiene `'unsafe-inline'` en `script-src` por la hidratación de Next; eliminarlo exigiría nonces por petición).

> **Advertencia sobre el plan Hobby de Vercel.** Según las guías de uso justo de Vercel (revisadas el 2026-09-14), Hobby está restringido a **uso personal no comercial**; se considera comercial cualquier despliegue con fines de lucro de cualquiera de los involucrados, incluida una persona pagada por escribir o mantener la aplicación. Si esta aplicación la usa una institución (colegio, club, organización) y alguien cobra por desarrollarla o mantenerla, Hobby probablemente **no** aplica: usa el plan Pro o aloja en Firebase Hosting (Spark). Verifica las condiciones vigentes antes de publicar.

## 8. Copias de seguridad

**No hay copias de seguridad automáticas configuradas por este proyecto.** Firestore no hace backups programados por defecto. Una exportación manual con `gcloud`:

```bash
gcloud firestore export gs://<tu-bucket-privado>/socios-$(date +%F) --project <tu-proyecto>
```

Requiere `gcloud` autenticado, plan Blaze (facturación) para usar el bucket y permisos. Las exportaciones contienen datos personales: guárdalas en un bucket privado con acceso mínimo y define su retención. Programar y probar la restauración (`gcloud firestore import`) es responsabilidad de quien opere el sistema.

## 9. Límites y limitaciones

- **Cuota gratuita (Spark)**: 50.000 lecturas/día. La app descarga todos los socios una vez al entrar (~500 lecturas) y no usa listeners en tiempo real; se refresca con el botón "Actualizar". Las reglas también consumen algunas lecturas por escritura.
- **Escala**: el enfoque (descarga completa + búsqueda en el navegador) es razonable hasta unos 5.000 socios; más allá habría que migrar a búsqueda/paginación en el servidor.
- **Datos obsoletos**: la caché no se actualiza sola; si dos administradores editan a la vez, el segundo recibe un aviso de conflicto y debe recargar.
- **Sin roles**: todo administrador ve y modifica todo. No hay historial de cambios ni borrado de socios.
- **Validación de RUT**: el dígito verificador se valida en el cliente; las reglas solo comprueban el formato. Se aceptan RUT de 7 u 8 dígitos.
- **Reservas huérfanas**: si alguien edita `unicos` a mano en la consola, puede quedar una reserva sin socio; solo se corrige manualmente en la consola.
- Sin modo sin conexión, sin App Check, sin MFA propio de la app.
- Un administrador comprometido puede leer y modificar todos los datos.

## 10. Ideas futuras (no implementadas)

Roles y auditoría de cambios, importación/exportación, copias de seguridad programadas, App Check, MFA, búsqueda en servidor para volúmenes mayores, ordenación por columnas, alta masiva.

## 11. Estructura

```
src/app/            rutas: /login, /socios, /socios/nuevo, /socios/[id], /socios/[id]/editar
src/components/     componentes (ui/ presentacionales)
src/lib/            rut, validation, search (puros) · socios, auth, firebase (SDK) · errors
src/providers/      caché de socios en memoria
tests/unit|rules|integration|e2e
firestore.rules  firebase.json  next.config.ts
```

## Migración inicial desde CSV (seed)

`seeds/Registro_Socios_Colegio_Vicente.csv` se migra con `seeds/migrar-socios.mjs` (Admin SDK, se salta las reglas):

```bash
node seeds/migrar-socios.mjs                          # simulación: valida y genera seeds/reporte-migracion.json
# Emulador (Java 21+):
firebase emulators:exec --only firestore --project demo-socios "node seeds/migrar-socios.mjs --apply"
# Proyecto real (credenciales: GOOGLE_APPLICATION_CREDENTIALS o gcloud ADC):
node seeds/migrar-socios.mjs --apply --proyecto <id-del-proyecto>
```

- Importa **todas** las filas. Lo anómalo (RUT vacío/ilegible/repetido/con dígito verificador incorrecto, fecha faltante) queda anotado en el campo `observacion` con el prefijo `[Migración]`; la lista completa está en `seeds/reporte-migracion.json`.
- Es idempotente: los socios ya migrados (`mig-NNNN`) se omiten.
- Los retirados reciben como fecha de retiro la del momento de la migración (el libro no la registra).
- Edad, estado civil, profesión y domicilio del CSV no tienen campo en la app y no se migran.
- Los socios migrados sin RUT o con RUT compartido se pueden editar; para corregir el RUT basta ingresar uno válido.

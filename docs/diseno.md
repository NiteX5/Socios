# SocioÍndice — Especificación de diseño UI/UX

Versión 1.0. Destinatario: desarrollador full-stack. Stack: Next.js App Router + Tailwind CSS + `lucide-react`. Idioma: español de Chile (tuteo neutro, sin voseo, sin modismos).

## 0. Supuestos y alcance

- Producto: índice digital de ~500 socios que reemplaza buscar en un libro físico. La tarea principal es **encontrar un socio y leer en qué página del libro está**. Todo el diseño prioriza esa tarea.
- Usuarios: 1 a 3 administradores, adultos, uso en escritorio y celular. Pueden ser poco técnicos: lectura grande, acciones explícitas, cero jerga.
- Modelo de socio (exacto, sin otros campos): `numeroSocio`, `rut`, `nombreCompleto`, `fechaIngreso` (obligatoria, input de fecha), `estado` (`ACTIVO` | `RETIRADO`), `paginaLibro` (entero positivo; página del libro físico), `lugarVotacion` (texto opcional, máx. 120), `fechaRetiro` (solo lectura; se fija al retirar), `createdAt`, `updatedAt`. El RUT se muestra formateado (`12.345.678-5`) pero nunca va en la URL.
- No hay métricas inventadas: el único contador permitido es el real "N resultados" calculado sobre los datos cargados.
- Prohibido: gradientes decorativos, glassmorphism, emojis, imágenes externas, ilustraciones de stock, sombras de color, animaciones de rebote.

## 1. Identidad

- **Nombre**: SocioÍndice (una palabra, "Í" con tilde siempre).
- **Wordmark textual** (sin imagen): `Socio` en serif peso 600 color `--color-primary` + `Índice` en serif peso 600 color `--color-accent-text`. Delante, un pequeño marcador tipográfico: un rectángulo vertical de 4 px de ancho x altura del texto, color `--color-accent`, radio 1 px (evoca un marcapáginas/lomo de libro). Es un `<span aria-hidden>` con CSS, no una imagen.
  - Tamaño en cabecera: 22 px (móvil) / 24 px (escritorio). En login: 32 px.
  - El wordmark es un enlace a `/socios` cuando hay sesión; texto plano en login.
- **Carácter**: institucional y sobrio, como un registro de secretaría de colegio: papel cálido, tinta azul marino, un acento ocre usado con escasez (marcador de página, número de página, foco de atención). Tipografía serif en títulos le da carácter de libro; la UI funcional va en sans.
- **Cómo evitar el aspecto de plantilla**: fondo papel cálido (no blanco ni gris azulado), bordes finos de 1 px en lugar de sombras pesadas, tablas con filas separadas por líneas finas (estilo libro de registro), número de página en serif grande con "caja de folio", esquinas poco redondeadas (6 px), sin tarjetas flotantes ni iconos decorativos en círculos de colores.

## 2. Tokens

### 2.1 Color (claro, es el tema principal)

Todas las razones de contraste fueron calculadas con la fórmula WCAG 2.x de luminancia relativa (script node). Mínimos: texto normal 4.5:1, texto grande y componentes de UI 3:1.

| Token (CSS var) | Hex | Uso |
|---|---|---|
| `--color-bg` | `#F7F5F0` | Fondo de página (papel) |
| `--color-surface` | `#FFFFFF` | Tarjetas, tabla, inputs, diálogos |
| `--color-ink` | `#1B2433` | Texto principal |
| `--color-muted` | `#4A5463` | Texto secundario, etiquetas auxiliares |
| `--color-placeholder` | `#6B7280` | Placeholder (nunca reemplaza a la label) |
| `--color-border` | `#D5D0C4` | Líneas decorativas, separadores de fila, bordes de tarjeta |
| `--color-border-input` | `#7A8190` | Borde de inputs/selects/checkbox (componente de UI) |
| `--color-primary` | `#14305A` | Botón primario, enlaces, wordmark, encabezados |
| `--color-primary-hover` | `#0E2444` | Hover/active del primario |
| `--color-primary-soft` | `#E6ECF5` | Fondo de hover de filas, fila seleccionada, botón secundario hover |
| `--color-accent` | `#C77A1E` | Solo decorativo: marcador del wordmark, línea bajo el folio (no texto) |
| `--color-accent-text` | `#8A4200` | Texto/iconos acento ("Índice", número de página) |
| `--color-accent-soft` | `#FBEBD3` | Fondo del folio (número de página) |
| `--color-activo` / `--color-activo-bg` | `#17603A` / `#E3F2E8` | Badge ACTIVO |
| `--color-retirado` / `--color-retirado-bg` | `#7A2E1D` / `#F9E4DE` | Badge RETIRADO |
| `--color-error` / `--color-error-bg` | `#A4262C` / `#FDECEC` | Errores, acción destructiva |
| `--color-warn` / `--color-warn-bg` | `#6B4A00` / `#FFF3CD` | Avisos |
| `--color-info` / `--color-info-bg` | `#14305A` / `#E6ECF5` | Información |
| `--color-focus` | `#1F5FBF` | Anillo de foco |
| `--color-overlay` | `rgba(16, 22, 31, 0.55)` | Fondo del diálogo (plano, sin blur) |

**Contrastes verificados (claro)**

| Par (texto sobre fondo) | Razón | Resultado |
|---|---|---|
| ink / bg | 14.31 | AAA |
| ink / surface | 15.59 | AAA |
| muted / bg | 7.04 | AAA |
| muted / surface | 7.67 | AAA |
| placeholder / surface | 4.83 | AA |
| primary / bg | 12.05 | AAA |
| blanco / primary | 13.12 | AAA |
| blanco / primary-hover | 15.50 | AAA |
| primary / primary-soft | 11.05 | AAA |
| accent-text / accent-soft | 6.27 | AA |
| accent-text / bg | 6.74 | AA |
| activo / activo-bg | 6.54 | AA |
| retirado / retirado-bg | 7.68 | AAA |
| error / surface | 7.26 | AAA |
| error / error-bg | 6.36 | AA |
| warn / warn-bg | 7.28 | AAA |
| border-input / surface | 3.91 | AA UI (>=3) |
| border-input / bg | 3.59 | AA UI (>=3) |
| focus / surface | 6.09 | AA UI |
| focus / bg | 5.59 | AA UI |

`--color-border` (`#D5D0C4`) es solo decorativo (separadores); jamás delimita un control interactivo.

### 2.2 Tema oscuro (opcional, barato)

Se implementa solo redefiniendo variables bajo `@media (prefers-color-scheme: dark)` (sin conmutador manual en v1). Si el tiempo apremia, omitirlo: el tema claro es el entregable obligatorio.

| Token | Hex oscuro |
|---|---|
| bg / surface | `#10161F` / `#18202C` |
| ink / muted | `#E8EAEE` / `#A9B1BF` |
| border / border-input | `#2A3445` / `#6B7587` |
| primary (botón fondo) / texto sobre primary | `#9DBBEA` / `#0B1220` |
| primary-hover / primary-soft | `#B6CDF0` / `#22314A` |
| accent-text / accent-soft | `#F0B070` / `#3A2A14` |
| activo / activo-bg | `#8FD6A8` / `#16301F` |
| retirado / retirado-bg | `#F2A898` / `#3A1D16` |
| error / error-bg | `#F4A3A6` / `#3A1A1D` |
| focus | `#7DB0FF` |

Contrastes verificados (oscuro): ink/bg 15.07; muted/surface 7.59; primary-texto/surface 8.37; texto/primary 9.57; activo 8.36; retirado 7.92; error 8.30; focus 7.43; border-input/surface 3.53; accent-text/surface 8.70. Todos AA o más.

### 2.3 Configuración Tailwind

Definir las variables en `:root` (`globals.css`) y mapearlas en `tailwind.config.ts` (`theme.extend.colors`: `bg`, `surface`, `ink`, `muted`, `border`, `primary`, `accent`, `activo`, `retirado`, `error`, `warn`, etc. con `var(--color-...)`). Los componentes usan clases semánticas (`bg-surface text-ink`), nunca hex sueltos.

### 2.4 Tipografía

Cargar con `next/font/google` en `app/layout.tsx` (autohospedadas por Next, sin petición a Google en runtime), `display: "swap"`, subset `latin`.

- **Títulos y número de página**: `Source Serif 4` (pesos 600 y 700; variable CSS `--font-serif`). Serif legible, sobria, con cifras claras.
- **UI y cuerpo**: `Inter` (pesos 400, 500, 600; variable `--font-sans`). Cifras tabulares activadas en tablas y número de página: `font-variant-numeric: tabular-nums`.
- Fallbacks: serif `Georgia, "Times New Roman", serif`; sans `system-ui, "Segoe UI", sans-serif`.
- `html { font-family: var(--font-sans); }`; clase utilitaria `font-serif` para títulos.

**Escala** (tamaño / interlineado). Base de 16 px; nada del cuerpo por debajo de 14 px; en móvil los inputs usan 16 px para evitar el zoom automático de iOS.

| Token | Tamaño | Interlín. | Uso |
|---|---|---|---|
| `text-caption` | 13 px | 18 px | Ayuda, metadatos, pie de tabla (solo texto no esencial) |
| `text-sm` | 14 px | 20 px | Encabezado de tabla, badges, etiquetas secundarias |
| `text-base` | 16 px | 24 px | Cuerpo, inputs, botones |
| `text-lg` | 18 px | 28 px | Nombre del socio en lista/tarjeta, texto destacado |
| `text-h3` (serif 600) | 20 px | 28 px | Títulos de sección/diálogo |
| `text-h2` (serif 600) | 24 px | 32 px (móvil 22/30) | Título de pantalla |
| `text-h1` (serif 700) | 32 px | 40 px (móvil 28/36) | Login, nombre en ficha |
| `text-folio` (serif 700, tabular) | 72 px escritorio / 56 px móvil | 1 | Número de página en ficha |

Longitud de línea máxima en formularios: 36 rem (576 px).

### 2.5 Espaciado, radios, sombras

- **Espaciado**: escala de 4 px de Tailwind. Usar solo: 4, 8, 12, 16, 24, 32, 48, 64. Padding de página: 16 px (móvil), 24 px (tablet), 32 px (escritorio). Ancho máximo de contenido: 1100 px centrado (formularios y ficha: 720 px).
- **Radios**: `--radius-sm` 4 px (badges, checkbox), `--radius` 6 px (botones, inputs, tarjetas, tabla), `--radius-lg` 10 px (diálogo). Nada de pastillas completas excepto el badge (4 px, no pastilla).
- **Sombras** (casi planas, solo para separar capas):
  - `--shadow-sm`: `0 1px 2px rgba(27, 36, 51, 0.08)` (tarjetas al hover, menú).
  - `--shadow-dialog`: `0 8px 24px rgba(16, 22, 31, 0.25)` (diálogo, toast).
  - Reposo: sin sombra; se usa borde 1 px `--color-border`.
- **Altura mínima de objetivos táctiles**: 44 px (botones, filas-tarjeta, items de paginación, checkbox con área de 44 px).

### 2.6 Iconografía

`lucide-react`, trazo 2 px (`strokeWidth={2}`), `aria-hidden="true"` cuando acompañan texto; si el icono va solo, el botón lleva `aria-label`. Tamaños: 16 px (dentro de badge y texto 14 px), 20 px (botones, inputs), 24 px (cabecera de estado vacío/error), 40 px (iconos grandes de estado vacío). Color: `currentColor`.

| Concepto | Icono |
|---|---|
| Buscar | `Search` |
| Limpiar búsqueda | `X` |
| Registrar socio | `UserPlus` |
| Editar | `Pencil` |
| Volver | `ArrowLeft` |
| ACTIVO | `CircleCheck` |
| RETIRADO | `CircleMinus` |
| Retirar | `UserMinus` |
| Reactivar | `UserCheck` |
| Cerrar sesión | `LogOut` |
| Error | `CircleAlert` |
| Aviso | `TriangleAlert` |
| Información | `Info` |
| Éxito | `CircleCheck` |
| Sin resultados | `SearchX` |
| Acceso denegado | `ShieldAlert` |
| Mostrar/ocultar contraseña | `Eye` / `EyeOff` |
| Refrescar datos | `RefreshCw` |
| Libro/página (folio) | `BookOpen` |
| Paginación | `ChevronLeft` / `ChevronRight` |
| Cargando (botón) | `LoaderCircle` (gira) |

### 2.7 Foco

Anillo visible en todo elemento interactivo, solo con `:focus-visible`:
`outline: 2px solid var(--color-focus); outline-offset: 2px;`
Clase Tailwind utilitaria `focus-ring`: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]`. En inputs, el anillo se dibuja además del borde (que pasa a 2 px de `--color-primary`). Nunca `outline: none` sin sustituto. Enlace "Saltar al contenido" (primer elemento tabulable, visible al recibir foco) apuntando a `#contenido`.

### 2.8 Movimiento

- Duraciones: 120 ms (hover/color), 180 ms (aparición de toast, diálogo), 200 ms máximo para todo. Curva `cubic-bezier(0.2, 0, 0, 1)`.
- Solo se animan `opacity`, `transform` (translateY de 4 px) y colores. Sin rebotes, sin parallax.
- `@media (prefers-reduced-motion: reduce)`: todas las transiciones y animaciones pasan a `0.01ms`; el spinner se sustituye por un icono estático con el texto "Cargando…"; el skeleton deja de pulsar (queda color plano); el scroll al enfocar es `auto`.

## 3. Layout global

Breakpoints (Tailwind personalizado):

| Nombre | Ancho | Comportamiento |
|---|---|---|
| móvil | < 640 px | Una columna, resultados como tarjetas-lista, cabecera compacta |
| tablet | 640 a 1023 px | Una columna ancha, resultados como tarjetas-lista de 2 líneas con más aire; formularios a 2 columnas desde 640 px |
| escritorio | >= 1024 px | Resultados como tabla; ficha en dos bloques |

**Cabecera** (altura 56 px, fondo `--color-surface`, borde inferior 1 px `--color-border`, sticky): wordmark a la izquierda; a la derecha el email del admin (solo >= 640 px, truncado, color muted, 14 px) y botón "Cerrar sesión" (icono `LogOut` + texto; en < 640 px solo icono con `aria-label="Cerrar sesión"`). Sin menú hamburguesa: no hay más navegación.

**Estructura de página**: `<header>`, `<main id="contenido">` con un único `<h1>` por pantalla, sin pie salvo en login (texto: "Acceso solo para administradores autorizados").

## 4. Componentes

Cada componente es un archivo en `src/components/ui/`. Estados obligatorios: normal, hover, foco, activo (pressed), deshabilitado, cargando donde aplique.

### 4.1 Botón (`Button`)

Base: altura 44 px (tamaño `md`), 40 px en `sm` (solo dentro de tablas/diálogo no táctil; en móvil siempre 44), padding horizontal 16 px, radio 6 px, texto 16 px peso 600, icono 20 px a la izquierda con 8 px de separación. Transición 120 ms.

| Variante | Reposo | Hover | Uso |
|---|---|---|---|
| `primary` | fondo `primary`, texto blanco | `primary-hover` | Acción principal por pantalla (Registrar socio, Guardar, Ingresar) |
| `secondary` | fondo surface, borde 1 px `primary`, texto `primary` | fondo `primary-soft` | Editar, Cancelar, Volver |
| `ghost` | sin fondo ni borde, texto `primary` | fondo `primary-soft` | Acciones de baja jerarquía (Limpiar filtros, Cerrar sesión) |
| `danger` | fondo `error`, texto blanco | oscurecer 8% (`#8B1F25`) | Confirmar retiro |

- Activo (pressed): `transform: translateY(1px)`.
- Deshabilitado: opacidad 0.5, `cursor: not-allowed`, `aria-disabled` (no quitar del orden de foco si explica algo por tooltip; en general usar `disabled`).
- Cargando: se mantiene el ancho, el icono pasa a `LoaderCircle` girando, texto cambia a gerundio ("Guardando…", "Ingresando…"), `aria-busy="true"`, el botón se deshabilita para evitar doble envío.
- Solo un botón `primary` visible por vista (excepto en diálogo).
- En móvil, los botones de formulario ocupan el ancho completo, apilados con el primario arriba; desde 640 px se alinean a la derecha en fila (secundario a la izquierda del primario).

### 4.2 Input, label y error (`Field`, `Input`, `Textarea`)

Estructura vertical con 6 px de separación:

```
Etiqueta *                       <- label 14 px, peso 600, color ink
[ Input 44 px de alto          ]
Texto de ayuda (opcional)        <- 13 px, muted
(!) Mensaje de error             <- 14 px, error, icono CircleAlert 16 px
```

- Label siempre visible y asociada (`<label htmlFor>`); el placeholder solo es ejemplo ("Ej.: 12.345.678-5"), nunca sustituye la etiqueta.
- Campo obligatorio: asterisco `*` en `--color-error` más `aria-hidden`, y texto `(obligatorio)` visualmente oculto en la label. Opcionales llevan "(opcional)" en muted.
- Input: fondo surface, borde 1 px `border-input`, radio 6 px, padding 0 12 px, texto 16 px. Hover: borde `ink`. Foco: borde 2 px `primary` + anillo de foco. Error: borde 2 px `error`, fondo `surface`, mensaje debajo con icono (el color nunca es la única señal). Deshabilitado: fondo `bg`, texto muted.
- `aria-invalid="true"` y `aria-describedby` apuntando a ayuda y error; el contenedor del error tiene `id` estable. Al enviar con errores: foco al primer campo inválido y un resumen no modal arriba del formulario (ver 4.12, alerta de error) con enlaces a cada campo.
- Validación: al salir del campo (blur) y al enviar; tras el primer error, valida mientras se escribe. Nunca validar al primer carácter.
- Campo contraseña: botón de mostrar/ocultar (`Eye`/`EyeOff`, 44 px de área, `aria-label` "Mostrar contraseña"/"Ocultar contraseña", `aria-pressed`).
- Campo RUT: `inputMode="text"`, `autocomplete="off"`, formatea al salir del campo (`12.345.678-5`), acepta con o sin puntos y guion.
- Campo número (N° socio, N° página): `inputMode="numeric"`, `pattern="[0-9]*"`, sin spinners.
- Campo fecha (`fechaIngreso`): `<input type="date">` nativo con las mismas medidas del input, `max` = hoy; muestra el selector del sistema. Los valores se muestran al usuario como "12 mar 2025".
- Campo `lugarVotacion`: input de texto opcional con contador "0 / 120" en 13 px muted alineado a la derecha.

### 4.3 Select (`Select`)

Se usa `<select>` nativo estilizado (mejor accesibilidad y teclado móvil; no se necesita Radix para esto). Mismas medidas, borde y estados que el input; flecha `ChevronDown` 20 px superpuesta a la derecha (`pointer-events: none`), `appearance: none`, padding derecho 40 px. Etiqueta siempre visible. Usado para el filtro de estado cuando no se usa el control segmentado (ver 4.5).

### 4.4 Badge de estado (`EstadoBadge`)

Siempre **icono + texto**; el color refuerza pero no es la única señal.

| Estado | Icono | Texto | Colores |
|---|---|---|---|
| ACTIVO | `CircleCheck` 16 px | `Activo` (se muestra "Activo"; en mayúsculas pequeñas no, para legibilidad) | texto/icono `activo`, fondo `activo-bg` |
| RETIRADO | `CircleMinus` 16 px | `Retirado` | texto/icono `retirado`, fondo `retirado-bg` |

Medidas: altura 28 px, padding 0 10 px, radio 4 px, texto 14 px peso 600, icono + 6 px de separación, borde 1 px del mismo color del texto al 35% de opacidad. El valor de datos sigue siendo `ACTIVO`/`RETIRADO`; la etiqueta mostrada es "Activo"/"Retirado". `aria-label` no necesario (el texto es visible).

### 4.5 Buscador (`SearchBox`) y filtro de estado

Es el elemento protagonista de la pantalla Índice.

- Input de búsqueda de 56 px de alto (móvil y escritorio), texto 18 px, borde 2 px `primary` en reposo (única excepción de borde grueso: realza el foco de la tarea), icono `Search` 24 px a la izquierda (dentro, 16 px de margen), botón `X` (limpiar, 44 px de área) a la derecha, visible solo con texto. `type="search"` con `role="searchbox"` implícito, `enterKeyHint="search"`, `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`.
- Etiqueta visible encima: "Buscar socio". Placeholder: "Nombre, RUT, N° de socio o página".
- Debounce 150 ms (el filtrado es local; no hay red). Busca en nombre, RUT (sin puntos/guion), N° socio y página; normaliza minúsculas y sin tildes. Multi-término: todos los términos deben coincidir (AND).
- Atajo: la tecla `/` lleva el foco al buscador desde cualquier lugar de la pantalla Índice (si el foco no está en un campo editable). Se anuncia en un hint visible solo en escritorio dentro del input, a la derecha antes del botón limpiar: `kbd` con "/" (13 px, borde 1 px). `Esc` con foco en el buscador: si hay texto lo borra; si está vacío, quita el foco. Al cargar el Índice, el buscador recibe `autoFocus` solo en escritorio (en móvil no, para no abrir el teclado).
- **Filtro de estado**: control segmentado de tres opciones debajo del buscador (grupo de radio, `role="radiogroup"` con `aria-label="Filtrar por estado"`): `Todos` (por defecto), `Activos`, `Retirados`. Cada opción 44 px de alto, mínimo 96 px de ancho; la seleccionada con fondo `primary`, texto blanco e icono de check `Check` 16 px (no solo color); las demás surface con borde `border-input`. Flechas izquierda/derecha cambian la opción. En móvil ocupa el ancho completo (tres partes iguales).
- Contador de resultados bajo el filtro, `aria-live="polite"`: "23 socios" / "1 socio" / "Ningún socio". Con filtros activos: "23 socios que coinciden con 'perez'". Es un conteo real.

### 4.6 Tabla (escritorio, >= 1024 px) (`SociosTable`)

Semántica `<table>` real con `<caption class="sr-only">Resultados de la búsqueda de socios</caption>`, `<th scope="col">`.

Columnas (de izquierda a derecha, anchos orientativos): **N° socio** (90 px, tabular, alineado a la derecha), **Nombre** (flexible; sans 16 px peso 600, enlace a la ficha; si existe `lugarVotacion`, aparece bajo el nombre en 14 px muted con el prefijo "Votación: "), **RUT** (150 px, tabular), **Estado** (140 px, badge), **Página** (110 px, serif 700 20 px en accent-text, tabular, alineado a la derecha). Sin columna de acciones: la fila completa lleva a la ficha (el enlace del nombre se extiende con `::after` sobre la fila para clic completo). La columna Página se destaca porque es el dato que se busca.

- Encabezado: fondo `bg`, texto 14 px peso 600 muted en mayúsculas no; en capitalización normal, borde inferior 2 px `primary`.
- Filas: altura mínima 56 px, fondo surface, borde inferior 1 px `border`, hover fondo `primary-soft`, foco visible en el enlace del nombre (anillo sobre toda la fila con `:focus-within`).
- Contenedor: borde 1 px `border`, radio 6 px, `overflow: hidden`.
- Ordenación: por defecto orden alfabético por nombre (es-CL, `localeCompare`). En v1 no hay ordenación interactiva por columna (decisión explícita para simplificar).
- Filas RETIRADO: texto del nombre en `muted` (el badge ya lo marca; no se tacha ni se atenúa más allá de eso para no perjudicar lectura).
- Coincidencia: el término buscado se resalta dentro del nombre con `<mark>` (fondo `accent-soft`, texto `ink`, sin cursiva).

### 4.7 Tarjeta-lista móvil/tablet (`SocioCard`), < 1024 px

Lista `<ul>` de enlaces; cada tarjeta es un `<a>` completo, mínimo 72 px de alto, fondo surface, borde 1 px `border`, radio 6 px, separación de 8 px entre tarjetas, padding 12 px 16 px.

```
+-------------------------------------------+
| María Fernanda Pérez Soto        [ P. 142 ]|
| N° 231 · 12.345.678-5                      |
| Votación: Escuela Básica Nº 12             |
| (v) Activo                                 |
+-------------------------------------------+
```

La línea "Votación" solo se muestra si `lugarVotacion` existe.

- Línea 1: nombre 18 px peso 600 (hasta 2 líneas, sin truncar nombres), a la derecha "folio" de página: caja con fondo `accent-soft`, texto serif 700 22 px `accent-text`, precedido de la abreviatura "Pág." 13 px; ancho mínimo 64 px.
- Línea 2: N° socio y RUT en 14 px muted, separados por punto medio con espacios.
- Línea 3 (condicional): lugar de votación, 14 px muted, con prefijo "Votación: ", hasta 2 líneas.
- Línea final: badge de estado.
- Active (pressed): fondo `primary-soft`. Hover igual. Foco: anillo estándar.
- En tablet (640 a 1023 px) la lista pasa a 2 columnas de tarjetas con `grid` y `gap-3`.

### 4.8 Paginación (`Pagination`)

Cliente, 25 resultados por página. Aparece solo si hay más de 25 resultados. `<nav aria-label="Paginación de resultados">`.

- Escritorio: "Anterior" (con `ChevronLeft`), números de página (ventana: primera, última, actual +/- 1, con elipsis `…` no interactiva), "Siguiente" (con `ChevronRight`). Elementos de 44 x 44 px, página actual con fondo `primary`, texto blanco y `aria-current="page"`.
- Móvil: solo "Anterior", texto "Página 2 de 7", "Siguiente" (los botones 44 px, el texto centrado).
- Texto adicional bajo la paginación, 13 px muted: "Mostrando 26 a 50 de 123".
- Al cambiar de página: scroll suave al inicio de los resultados (instantáneo con reduced motion) y el foco pasa al encabezado de resultados (`tabIndex={-1}`).
- La página y el filtro se reinician a la primera al cambiar la búsqueda o el estado.
- Opcional recomendado: reflejar `?q=` y `?estado=` en la URL (nunca RUT completo: si la búsqueda parece un RUT completo, no se escribe en la URL).

### 4.9 Diálogo de confirmación (`ConfirmDialog`)

Basado en `<dialog>` modal o Radix Dialog (permitido). Requisitos: `role="dialog"` / `alertdialog` para el retiro, `aria-modal`, `aria-labelledby` (título) y `aria-describedby` (descripción), foco inicial en el botón **Cancelar** (acción segura), foco atrapado dentro, `Esc` cierra (cancela), clic en overlay cancela, al cerrar el foco vuelve al botón que lo abrió. Bloquea el scroll del fondo.

- Overlay `--color-overlay` plano. Panel: surface, radio 10 px, `shadow-dialog`, ancho `min(92vw, 440px)`, padding 24 px.
- Contenido: título (serif 20 px), descripción (16 px), nombre del socio en negrita, botones a la derecha (escritorio) o apilados a ancho completo (móvil, con la acción destructiva/confirmar **arriba** y Cancelar abajo para pulgar; el foco inicial sigue siendo Cancelar).
- Animación: opacidad 0 a 1 y translateY 4 px a 0 en 180 ms (nula con reduced motion).
- Durante la operación: botón de confirmar en estado cargando; Cancelar y Esc deshabilitados hasta terminar; si falla, el error aparece dentro del diálogo en una alerta (4.10) y el diálogo no se cierra.

### 4.10 Toast y alerta (`Toast`, `Alert`)

**Alerta en línea (`Alert`)**: bloque dentro del flujo con icono 20 px a la izquierda, título opcional (peso 600) y texto, borde izquierdo de 4 px del color de la variante, fondo de la variante, radio 6 px, padding 12 px 16 px. Variantes: `error` (`CircleAlert`, role="alert"), `warn` (`TriangleAlert`, role="status"), `info` (`Info`, role="status"), `success` (`CircleCheck`, role="status", fondo `activo-bg`, texto `activo`). El texto siempre usa color de tinta del par verificado en 2.1.

**Toast**: para confirmaciones breves tras una acción ("Socio guardado"). Posición: abajo centrado en móvil (16 px sobre el borde, ancho `calc(100vw - 32px)`), abajo a la derecha en escritorio (ancho 360 px). Mismo aspecto que Alert (con `shadow-dialog`), botón cerrar `X` 44 px. Región `aria-live="polite"` (errores `assertive`). Duración: éxito 5 s (se pausa al hover/foco), errores no se cierran solos. Máximo 3 apilados. Con reduced motion aparecen sin deslizamiento.

### 4.11 Skeleton (`Skeleton`)

Bloques de fondo `--color-border` al 60% con radio 4 px y pulso suave de opacidad (1 a 0.55, 1.4 s). Se usa para: lista de resultados (6 filas/tarjetas de la misma altura que las reales para evitar saltos de layout), ficha (título + folio + 4 filas de datos). Contenedor con `aria-busy="true"` y texto oculto "Cargando socios…" (`role="status"`). Con reduced motion: sin pulso.

### 4.12 Estados vacío, error y acceso denegado (`EmptyState`)

Bloque centrado, ancho máx. 440 px, padding vertical 48 px: icono lucide 40 px en `muted` (sin círculos de color), título (serif 20 px), texto (16 px muted), acción opcional.

| Estado | Icono | Título | Texto | Acción |
|---|---|---|---|---|
| Sin datos aún | `BookOpen` | Aún no hay socios registrados | Registra el primer socio para empezar a usar el índice. | Botón primario "Registrar socio" |
| Sin resultados | `SearchX` | No encontramos socios con esa búsqueda | Revisa la ortografía o prueba con otro nombre, RUT o número. Si filtraste por estado, prueba con "Todos". | Botón ghost "Limpiar búsqueda y filtros" |
| Error de carga | `CircleAlert` | No pudimos cargar los socios | Revisa tu conexión a internet e inténtalo de nuevo. | Botón secundario "Reintentar" (icono `RefreshCw`) |
| Sin permisos (datos) | `ShieldAlert` | No tienes permiso para ver estos datos | Tu cuenta no está autorizada. | "Cerrar sesión" |
| Socio no existe | `SearchX` | No encontramos este socio | Puede haber sido eliminado o el enlace es incorrecto. | "Volver al índice" |
| Sin conexión | `TriangleAlert` | Sin conexión | Algunas acciones no funcionarán hasta que vuelva internet. | (banner `warn` en el top, no bloquea) |

**Acceso denegado (pantalla completa, usuario autenticado sin documento admin)**: ver sección 5.7.

## 5. Pantallas

Convenciones de los wireframes: `[ ]` input o botón, `(v)` icono, `<...>` enlace, `{...}` texto contextual. Todos los anchos de ejemplo son escritorio salvo indicación.

### 5.1 Login (`/login`)

Una sola columna centrada, sin cabecera. Fondo `bg`. Panel surface, borde 1 px `border`, radio 6 px, ancho `min(92vw, 400px)`, padding 32 px (24 px en móvil), alineado verticalmente algo por encima del centro (margen superior `12vh`).

```
                     |SocioIndice            <- wordmark 32 px, centrado
              Registro digital de socios      <- 16 px muted

        +------------------------------------+
        |  Ingresar                          |  <- h1 serif 24 px
        |                                    |
        |  Correo electrónico *              |
        |  [ nombre@ejemplo.cl             ] |
        |                                    |
        |  Contraseña *                      |
        |  [ ********************      (o) ] |
        |                                    |
        |  [        Ingresar               ] |  <- primary, ancho completo
        +------------------------------------+
        Acceso solo para administradores autorizados.
```

Comportamiento:
- Campos: `type="email"` `autocomplete="username"`; contraseña `autocomplete="current-password"`. Foco inicial en correo. `Enter` envía.
- Errores por campo (al blur/envío): correo vacío "Ingresa tu correo electrónico."; formato inválido "Revisa el correo: falta el @ o el dominio."; contraseña vacía "Ingresa tu contraseña.".
- Error de credenciales (genérico, no revela si el correo existe): alerta `error` sobre el botón: "Correo o contraseña incorrectos. Inténtalo de nuevo." Demasiados intentos: "Demasiados intentos. Espera unos minutos e inténtalo otra vez." Red: "No hay conexión. Revisa tu internet e inténtalo de nuevo."
- Cargando: botón "Ingresando…"; campos deshabilitados.
- Tras éxito: redirige a `/socios`. Si ya hay sesión, `/login` redirige a `/socios`.
- No hay enlace de registro ni de "olvidé mi contraseña" en v1 (las cuentas se crean manualmente; incluir la frase "Si olvidaste tu contraseña, pide ayuda al administrador responsable." en 13 px muted bajo el botón).
- Móvil: panel sin borde, fondo directamente `bg`, padding 16 px; el contenido sube para quedar visible con el teclado abierto.

### 5.2 Índice (`/socios`)

```
+------------------------------------------------------------------+
| |SocioIndice                      correo@x.cl   [(>) Cerrar sesión]|
+------------------------------------------------------------------+
|                                                                  |
|  Índice de socios                       [ (+) Registrar socio ]  |
|                                                                  |
|  Buscar socio                                                    |
|  +------------------------------------------------------[/]--+   |
|  | (lupa)  Nombre, RUT, N° de socio o página           ( X ) |   |
|  +-----------------------------------------------------------+   |
|  Estado:  [(v) Todos] [ Activos ] [ Retirados ]                  |
|                                                                  |
|  23 socios                                      (r) Actualizar   |
|  +-----------------------------------------------------------+   |
|  | N° socio Nombre             RUT          Estado     Página|   |
|  |-----------------------------------------------------------|   |
|  |      231 Pérez Soto, María  12.345.678-5 (v)Activo     142|   |
|  |          Votación: Esc. N° 12                              |   |
|  |      118 Rojas Díaz, Juan   9.876.543-2  (-)Retirado    57|   |
|  | ...                                                       |   |
|  +-----------------------------------------------------------+   |
|  Mostrando 1 a 25 de 123        [<Anterior] 1 2 3 ... [Siguiente>]|
+------------------------------------------------------------------+
```

Móvil (< 640 px):

```
+--------------------------+
| |SocioIndice        [->]  |
+--------------------------+
| Índice de socios          |
| [ (+) Registrar socio   ] |  <- primario, ancho completo
|                           |
| Buscar socio              |
| [(lupa) Nombre, RUT...(X)]|
| [Todos][Activos][Retirad.]|
| 23 socios      (r)        |
| +-----------------------+ |
| | Pérez Soto, María [P.142]|
| | N° 231 · 12.345.678-5  | |
| | Votación: Esc. N° 12   | |
| | (v) Activo             | |
| +-----------------------+ |
| ...                       |
| [<]  Página 1 de 5  [>]   |
+--------------------------+
```

Comportamiento:
- Jerarquía: 1) buscador, 2) resultados, 3) botón "Registrar socio" (primario, arriba a la derecha del título en escritorio; ancho completo bajo el título en móvil).
- Carga: skeleton de 6 filas hasta que lleguen los datos. Datos se descargan una vez (ver plan); el botón "Actualizar" (ghost, icono `RefreshCw`, gira mientras recarga) vuelve a leer; muestra "Última actualización: 14:32" en 13 px muted (hora real local) junto al botón.
- Sin texto de búsqueda: se listan todos los socios, orden alfabético por apellido/nombre tal como se almacena, paginados.
- Se mantiene el estado de búsqueda, filtro y página al volver desde la ficha (con el botón Atrás del navegador o "Volver al índice"): guardar en la URL (`?q=&estado=&pagina=`) o en contexto.
- Teclado: `/` enfoca el buscador; Tab recorre buscador, filtro (grupo de radio como una sola parada), "Actualizar", filas (un enlace por fila), paginación. `Enter` en una fila abre la ficha. En el buscador, flecha abajo mueve el foco al primer resultado (opcional).
- Si el resultado único es exacto por RUT o N° de socio, no se redirige automáticamente (evita sorpresa); simplemente aparece el único resultado.

### 5.3 Crear socio (`/socios/nuevo`)

Ancho de formulario 720 px. Encabezado: enlace "Volver al índice" (ghost, `ArrowLeft`), h1 "Registrar socio".

```
<- Volver al índice

Registrar socio
Los campos con * son obligatorios.

Nombre completo *
[                                              ]

RUT *                          N° de socio *
[ 12.345.678-5               ] [ 231           ]
Ej.: 12.345.678-5

N° de página del libro *       Fecha de ingreso *
[ 142                        ] [ 12/03/2025  (cal) ]

Lugar de votación (opcional)
[                                              ]
                                        0 / 120

Estado
(v) Activo   (fijo al crear)

                       [ Cancelar ] [ Guardar socio ]
```

Comportamiento:
- Estado en creación: siempre ACTIVO, mostrado como texto con badge (no editable).
- Orden de tabulación: nombreCompleto, RUT, N° socio, paginaLibro, fechaIngreso, lugarVotacion, Cancelar, Guardar.
- Errores por campo (mensajes exactos):
  - `nombreCompleto` vacío: "Ingresa el nombre completo."; menos de 3 caracteres: "El nombre es demasiado corto."; más de 120: "El nombre no puede superar los 120 caracteres."
  - RUT vacío: "Ingresa el RUT."; formato: "El RUT no tiene un formato válido. Ejemplo: 12.345.678-5."; dígito verificador: "El dígito verificador no corresponde a este RUT. Revísalo."; duplicado: "Ya existe un socio con este RUT." (con enlace "Ver ficha" si se conoce el id).
  - N° socio vacío: "Ingresa el número de socio."; no numérico: "Usa solo números."; duplicado: "Ya existe un socio con este número."
  - `paginaLibro` vacío: "Ingresa el número de página."; no numérico/cero/negativo/decimal: "Ingresa un número de página válido (entero mayor que 0)."
  - `fechaIngreso` vacía: "Ingresa la fecha de ingreso."; inválida: "La fecha de ingreso no es válida."; futura: "La fecha de ingreso no puede ser posterior a hoy."
  - `lugarVotacion` > 120: "El lugar de votación no puede superar los 120 caracteres."
- Los duplicados pueden detectarse tras el envío (transacción); en ese caso se marcan en el campo y el foco va al primero con error.
- Éxito: redirige a la ficha del nuevo socio con toast "Socio registrado correctamente."
- Error general: alerta `error` arriba del formulario: "No se pudo guardar el socio. Revisa tu conexión e inténtalo de nuevo." Los datos escritos se conservan.
- "Cancelar": si hay cambios sin guardar, pregunta con diálogo ("Hay cambios sin guardar. ¿Salir de todos modos?" Botones "Seguir editando" (foco inicial) y "Salir sin guardar"). `beforeunload` solo con cambios.
- Guardar con botón en estado cargando "Guardando…". Doble envío impedido.
- Móvil: una columna, campos RUT/N° socio y N° página/Estado apilados; botones apilados a ancho completo.

### 5.4 Ficha del socio (`/socios/[id]`)

El **número de página** es lo primero que se ve y lo más grande.

```
<- Volver al índice

+----------------------------------------------------------------+
|  Pérez Soto, María Fernanda                    (v) Activo       |
|                                                                |
|  +--------------------------+                                  |
|  |  (libro) PÁGINA DEL LIBRO |   RUT         12.345.678-5       |
|  |                          |   N° de socio 231                |
|  |          142             |   Estado      (v) Activo         |
|  |  ----------------------  |   Fecha de ingreso 12 mar 2025   |
|  +--------------------------+   Lugar de votación Esc. N° 12   |
|                                 Fecha de retiro 15 ago 2025    |
|                                 (solo si está retirado)        |
|                                                                |
|  [ (lápiz) Editar ]            [ (retirar) Retirar socio ]      |
+----------------------------------------------------------------+
```

Móvil: el folio va primero (arriba, ancho completo), luego el nombre y los datos en lista de definición apilada; los botones apilados a ancho completo (Editar arriba).

Detalles del folio ("caja de folio"):
- Caja con fondo `accent-soft`, borde 1 px `accent` (decorativo), radio 6 px, padding 16 px 24 px; etiqueta "Página del libro" 14 px peso 600 `accent-text` mayúscula inicial solo; número en `text-folio` (72 px escritorio / 56 px móvil) serif 700 `accent-text`, tabular; debajo línea de 3 px `--color-accent` (decorativa) de ancho 48 px. `aria-label` del bloque: "Página 142 del libro". Alto contraste verificado 6.27:1.
- Si el socio está RETIRADO, el folio se mantiene (la información del libro sigue siendo válida); se añade una alerta `warn` bajo el título: "Este socio fue retirado el 15 ago 2025." (usa `fechaRetiro`; si por datos antiguos faltara, "Este socio está retirado."). Al reactivar, la fecha de retiro deja de mostrarse. "Lugar de votación" solo se muestra si existe; "Fecha de retiro" solo si el estado es RETIRADO. `createdAt` y `updatedAt` no se muestran en la ficha.

Datos: lista de definición `<dl>`, etiqueta (14 px muted) sobre valor (16 px ink peso 500) en móvil; en escritorio etiqueta a la izquierda de 140 px. Fechas en formato "12 mar 2025" (es-CL, `Intl.DateTimeFormat`).

Acciones:
- "Editar" (secundario, `Pencil`) → `/socios/[id]/editar`.
- ACTIVO: "Retirar socio" (secundario con texto `error` y borde `error`, `UserMinus`; no es el botón rojo sólido: la confirmación lo es).
- RETIRADO: "Reactivar socio" (secundario, `UserCheck`).
- Sin acción "Eliminar" (el plan no permite borrar socios).
- Cargando: skeleton de la ficha. No existe: estado vacío "Socio no existe". Error: estado de error con "Reintentar".

### 5.5 Editar (`/socios/[id]/editar`)

Mismo formulario que Crear, precargado, con:
- h1 "Editar socio" y debajo el nombre en muted. Campos editables: nombreCompleto, RUT, N° socio, paginaLibro, fechaIngreso, lugarVotacion. El campo Estado (y fechaRetiro) se muestra de solo lectura con badge y una nota: "Para cambiar el estado usa Retirar o Reactivar en la ficha." (13 px muted).
- Botones: "Cancelar" (vuelve a la ficha, con confirmación si hay cambios) y "Guardar cambios".
- "Guardar cambios" está deshabilitado mientras no haya cambios (con `aria-disabled` y tooltip/ayuda "No hay cambios para guardar").
- Conflicto de edición (otro admin modificó el socio): alerta `warn` en la parte superior del formulario: "Otra persona modificó este socio mientras lo editabas. Recarga los datos para ver los cambios más recientes." con botón "Recargar datos" (se pierden los cambios locales; confirmar con diálogo "Se perderán tus cambios. ¿Recargar?").
- Éxito: redirige a la ficha con toast "Cambios guardados."
- Los errores por campo son los mismos que en Crear; duplicado de RUT/N° se valida excluyendo al propio socio.

### 5.6 Diálogo de retiro y reactivación

**Retirar** (alertdialog):

```
+--------------------------------------------+
|  Retirar socio                              |
|                                             |
|  ¿Confirmas que quieres retirar a           |
|  María Fernanda Pérez Soto (N° 231)?        |
|                                             |
|  Seguirá apareciendo en el índice con el    |
|  estado "Retirado". Puedes reactivarlo      |
|  cuando quieras.                            |
|                                             |
|            [ Cancelar ]  [ Retirar socio ]  |
+--------------------------------------------+
```

- Botón de confirmar: variante `danger`, icono `UserMinus`, texto "Retirar socio". Cancelar con foco inicial.
- Éxito: se cierra, la ficha se actualiza (badge, alerta de retirado, botón cambia a "Reactivar socio") y toast "Socio retirado." El foco vuelve al botón (que ahora dice "Reactivar socio").
- Error: dentro del diálogo, alerta `error`: "No se pudo retirar al socio. Inténtalo de nuevo." Conflicto: "Este socio fue modificado por otra persona. Recarga la ficha e inténtalo de nuevo."

**Reactivar**:
- Título "Reactivar socio". Texto: "¿Confirmas que quieres reactivar a María Fernanda Pérez Soto (N° 231)? Volverá a aparecer con el estado "Activo"."
- Botón de confirmar: variante `primary` (no es destructivo), icono `UserCheck`, texto "Reactivar socio".
- Éxito toast "Socio reactivado."

### 5.7 Estados especiales

**Acceso denegado** (autenticado sin `admins/{uid}`), pantalla completa sin cabecera de navegación (solo el wordmark y "Cerrar sesión"):

```
              |SocioIndice

             (escudo-alerta 40 px)
        Tu cuenta no tiene acceso a SocioÍndice

   Iniciaste sesión como correo@ejemplo.cl, pero esta
   cuenta no está autorizada como administradora.
   Pide a la persona responsable que habilite tu acceso.

              [ (>) Cerrar sesión ]
```

`role="alert"` en el título para anunciarlo. No se muestra ningún dato. Botón secundario "Cerrar sesión" con foco inicial.

**Cargando la sesión (AuthProvider inicial)**: pantalla `bg` con wordmark centrado y texto "Verificando tu sesión…" (`role="status"`, sin spinner con reduced motion). Evita parpadeo del contenido protegido.

**Sesión expirada / cerrada en otra pestaña**: redirige a `/login` con mensaje `info` encima del formulario: "Tu sesión terminó. Ingresa nuevamente para continuar."

**404 (`not-found`)**: estado vacío con título "Página no encontrada", texto "La dirección no existe o fue movida.", botón "Ir al índice".

**Error global (`error.tsx`)**: título "Algo salió mal", texto "Ocurrió un error inesperado. Puedes intentarlo de nuevo.", botones "Reintentar" y "Ir al índice". No se muestra detalle técnico ni datos personales.

**Sin conexión**: banner `warn` sticky bajo la cabecera con "Sin conexión. Los cambios no se guardarán hasta que vuelva internet." (se escucha `online`/`offline` del navegador; `role="status"`).

## 6. Accesibilidad y teclado (resumen operativo)

- Objetivo: WCAG 2.2 AA. Contrastes ya verificados (sección 2).
- Idioma: `<html lang="es-CL">`. Títulos de página (`<title>`): "Índice de socios · SocioÍndice", "Registrar socio · SocioÍndice", "{Nombre} · SocioÍndice", etc. Cambiar el título en cada ruta.
- Un `h1` por pantalla; jerarquía sin saltos.
- Orden de foco = orden visual. Enlace "Saltar al contenido" primero.
- Atajos: `/` enfoca el buscador (solo en Índice y no cuando se escribe en un campo); `Esc` limpia/quita foco del buscador, cierra diálogos; `Enter` abre la fila enfocada. No hay otros atajos de una tecla (evita colisiones; WCAG 2.1.4).
- Los anuncios dinámicos usan `aria-live` (contador de resultados, toasts, errores).
- Nada depende solo del color: estado = icono+texto; errores = icono+texto+borde grueso; selección de filtro = check + relleno.
- Objetivos táctiles >= 44 x 44 px; separación mínima de 8 px entre objetivos adyacentes.
- Zoom: la interfaz debe funcionar hasta 200% y con texto ampliado sin desplazamiento horizontal de la página (excepto la tabla, que solo existe desde 1024 px; por debajo se usan tarjetas). Unidades `rem` para tipografía y espaciado de componentes.
- Formularios: `autocomplete` correcto, errores asociados con `aria-describedby`, resumen de errores al enviar.
- Imágenes: ninguna decorativa. Iconos lucide `aria-hidden` salvo que sean el único contenido del control.

## 7. Microinteracciones (sutiles, todas con alternativa reduced-motion)

- Botones: cambio de color 120 ms; pressed desplaza 1 px.
- Filas/tarjetas: fondo `primary-soft` en 120 ms al hover.
- Buscador: al enfocar, el anillo aparece de inmediato (sin transición para el foco); el botón `X` aparece con fade de 120 ms.
- Lista de resultados: al cambiar el filtro, el listado hace fade de 120 ms (opacidad 0.6 a 1). No se anima fila por fila.
- Contador de resultados: sin animación numérica.
- Badge: sin animación.
- Folio de la ficha: aparece con fade + translateY(4 px) en 180 ms la primera vez.
- Toast: entra con translateY(8 px) y fade en 180 ms; sale con fade en 120 ms.
- Diálogo: ver 4.9.
- Icono `RefreshCw` gira mientras actualiza (una vuelta por segundo); con reduced motion se reemplaza por texto "Actualizando…".

## 8. Textos de interfaz (referencia rápida)

Tono: claro, directo, respetuoso, tuteo. Sin exclamaciones ni jerga técnica. Los mensajes de error dicen qué pasó y cómo resolverlo.

| Contexto | Texto |
|---|---|
| Botón crear | Registrar socio |
| Botón guardar (crear) | Guardar socio |
| Botón guardar (editar) | Guardar cambios |
| Botón cancelar | Cancelar |
| Botón volver | Volver al índice |
| Botón cerrar sesión | Cerrar sesión |
| Botón login | Ingresar |
| Etiqueta buscador | Buscar socio |
| Placeholder buscador | Nombre, RUT, N° de socio o página |
| Filtro | Todos / Activos / Retirados |
| Contador | "1 socio" / "N socios" / "Ningún socio" |
| Estado vacío inicial | Aún no hay socios registrados |
| Sin resultados | No encontramos socios con esa búsqueda |
| Éxito crear | Socio registrado correctamente. |
| Éxito editar | Cambios guardados. |
| Éxito retiro / reactivación | Socio retirado. / Socio reactivado. |
| Error genérico de guardado | No se pudo guardar. Revisa tu conexión e inténtalo de nuevo. |
| Error de carga | No pudimos cargar los socios. Revisa tu conexión e inténtalo de nuevo. |
| Permiso denegado en operación | No tienes permiso para realizar esta acción. |
| Sesión terminada | Tu sesión terminó. Ingresa nuevamente para continuar. |
| Cambios sin guardar | Hay cambios sin guardar. ¿Salir de todos modos? |
| Carga | Cargando socios… / Verificando tu sesión… / Guardando… / Ingresando… |

Mensajes de campo: ver 5.1 (login) y 5.3 (socio). Etiquetas de campos de socio: "Nombre completo", "RUT", "N° de socio", "N° de página del libro", "Fecha de ingreso", "Lugar de votación", "Estado", "Fecha de retiro" (solo lectura).

## 9. Notas de implementación para el desarrollador

1. Crear `globals.css` con las variables de 2.1 (y 2.2 en el media query oscuro) y mapear en `tailwind.config.ts`.
2. `layout.tsx`: `Source_Serif_4` e `Inter` desde `next/font/google`, aplicar variables en `<html>`; `lang="es-CL"`.
3. Componentes en `src/components/ui/`: `Button`, `Field`/`Input`/`Textarea`, `Select`, `EstadoBadge`, `SearchBox`, `SegmentedFilter`, `SociosTable`, `SocioCard`, `Pagination`, `ConfirmDialog`, `Toast`/`ToastProvider`, `Alert`, `Skeleton`, `EmptyState`, `Folio` (caja de número de página), `Wordmark`.
4. El valor de datos del estado es `ACTIVO`/`RETIRADO`; la etiqueta visible es "Activo"/"Retirado".
5. La tabla (>= 1024 px) y las tarjetas (< 1024 px) se renderizan con CSS (`hidden lg:block` / `lg:hidden`) o `matchMedia`; si se usa CSS, ambas deben compartir los mismos datos y no duplicar enlaces para lectores de pantalla (usar `aria-hidden` y `hidden` real, no solo clases de opacidad).
6. Revisión visual esperada por el diseñador con capturas en 375, 768 y 1280 px, claro y (si se implementa) oscuro, con foco de teclado visible y reduced-motion activado.
7. Lista de criterios de aceptación visual: sin gradientes, sin blur, sin emojis, sin imágenes; todos los contrastes de 2.1; foco visible en todo control; objetivos de 44 px; el número de página es lo más grande de la ficha; el buscador es lo más prominente del índice.

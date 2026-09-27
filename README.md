# Codle · retos diarios de programación estilo Wordle

Cada día hay **4 retos** (Fácil, Medio, Difícil y Experto). Se resuelven en un editor tipo LeetCode en **Python, JavaScript, TypeScript, Java, C++, C#, Go o Rust**. Al terminar cada reto se desbloquean la solución oficial y su explicación. Tienes **5 envíos** por reto, y cada envío pinta una fila de casillas (una por test), como en Wordle.

> "Codle" es un nombre provisional. Para cambiarlo, edita `Logo` en `client/src/components/Layout.tsx` y el `<title>` de `client/index.html`.

## Stack

| Parte | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript, Monaco Editor (cargado desde jsDelivr), react-router |
| Backend | Node + Express + TypeScript |
| Base de datos | MongoDB (Mongoose) |
| Ejecución de código | [Wandbox](https://wandbox.org) (gratis, sin clave), Judge0 (de pago) o un ejecutor `local` solo para desarrollo |

## Publicar en internet

**Código en GitHub:** doble clic en `conectar-github.bat`. Crea un repositorio privado en tu cuenta, sube todo y deja una tarea de Windows que sube los cambios nuevos cada hora.

Consulta **[DESPLIEGUE.md](DESPLIEGUE.md)**: guía paso a paso, gratis y sin tarjeta, con Render, MongoDB Atlas, Wandbox y UptimeRobot.

## Arranque rápido en Windows

Haz **doble clic en `iniciar.bat`**. El script:

1. Instala Node.js si no está (con winget).
2. Crea `server/.env` en modo local.
3. Instala las dependencias y descarga MongoDB la primera vez (sin Docker ni instalación).
4. Arranca la base de datos, la API y la web.
5. Abre http://localhost:5173.

Para pararlo, pulsa `Ctrl+C` en la ventana. Los registros quedan en `logs/` y los datos en `.data/`.

En modo local, cada lenguaje necesita su compilador instalado: Python, Java (JDK) y g++ (MinGW) para C++. JavaScript funciona siempre, porque usa Node.

## Puesta en marcha manual (Windows, macOS o Linux)

Requisitos: **Node 20+** y una base de datos MongoDB.

1. **MongoDB**. Elige una opción:
   - Docker: `docker compose up -d` (levanta Mongo en `localhost:27017`).
   - MongoDB Atlas (gratis): crea un cluster y copia la URI `mongodb+srv://…`.
   - MongoDB Community instalado en local.

2. **Configuración**
   ```bash
   copy .env.example server\.env      # Windows
   cp .env.example server/.env        # macOS / Linux
   ```
   Rellena `MONGODB_URI`, `JWT_SECRET` y el ejecutor:
   - **Wandbox (por defecto)**: `EXECUTOR=wandbox`. Gratis y sin clave; no hay que configurar nada más.
   - **Judge0**: `EXECUTOR=judge0` con `JUDGE0_RAPIDAPI_KEY` ([Judge0 CE en RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce), de pago por uso desde 2026) o `JUDGE0_URL` de una instancia propia.
   - **Local (solo desarrollo)**: `EXECUTOR=local` ejecuta el código directamente en tu PC, **sin aislamiento**. Necesitas `python`, `node`, `javac`/`java` y `g++` en el PATH. En Windows, pon `LOCAL_PYTHON=python`.

3. **Instalar, cargar retos y arrancar**
   ```bash
   npm install
   npm run seed     # 12 retos de ejemplo: hoy, ayer y anteayer
   npm run dev      # servidor en :4000 y web en http://localhost:5173
   ```
   Otra opción es `npm run dev:local`, que además arranca un MongoDB local embebido (sin Docker) y carga los retos de ejemplo si hoy no hay ninguno.
   Mientras no esté hecha la generación con IA (fase 3), vuelve a lanzar `npm run seed` otro día para mover los retos de ejemplo a las fechas actuales.

### Otros comandos

```bash
npm test                               # tests del motor en los 8 lenguajes (necesita python3, node, java, g++, go, rustc, mcs/mono y tsc)
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test   # además, tests de integración de la API
npm run build && npm start -w server   # producción: Express sirve también el frontend
python server/src/seed/generate_seed.py   # regenera problems.json desde las soluciones de referencia
```

## Retos diarios generados por un agente

Cada noche, a las 21:48 (hora de Madrid), una tarea programada lanza un agente de IA en este PC. Su trabajo es dejar preparados los retos de los próximos 3 días:

1. Mira qué días faltan con `python3 tools/retos/build.py --status 3`.
2. Escribe un *spec* por día en `retos/specs/AAAA-MM-DD.py`: 4 problemas con enunciado es/en, tests, solución de referencia y fuerza bruta.
3. Lo construye con `python3 tools/retos/build.py retos/specs/AAAA-MM-DD.py`. El script calcula las salidas con la referencia, las contrasta con la fuerza bruta, valida tipos y tamaños, y escribe `retos/AAAA-MM-DD.json`.
4. Hace commit del spec. El JSON no se versiona porque se puede regenerar a partir del spec.

El servidor importa `retos/*.json` al arrancar y cada 5 minutos (`npm run import -w server` lo fuerza al momento). Además:

- Un día que aún no ha llegado se vuelve a importar si su fichero cambia.
- Los retos de ejemplo que nadie ha jugado se sustituyen por los generados.

Para generar un día a mano, copia un spec existente, cámbialo y ejecuta `build.py`.

## Panel de administración (`/admin`)

**Acceso.** Tienes dos formas:
- Pon tu email en `ADMIN_EMAILS` de `server/.env` y reinicia el servidor.
- O ejecuta `npm run make-admin -w server -- <email|usuario>`.

Una vez dentro, verás un enlace **⚙ Admin** en el menú de tu cuenta.

**Qué ofrece:**
- **Resumen:** usuarios, jugadores, envíos de las últimas 24 h, retos por estado y cuántos retos hay publicados en los próximos 8 días. Esto último sirve para ver si al agente le ha faltado algún día.
- **Listado:** filtros por estado, fechas y texto. Por cada reto, jugadores, resueltos y envíos. Botones para publicar o retirar.
- **Editor de retos:**
  - Datos y firma.
  - Enunciado en español e inglés, con vista previa.
  - Casos en JSON. Escribe solo los `input` y pulsa **Recalcular salidas** para que la solución de referencia rellene los `output`.
  - Solución de referencia.
  - **Probar una solución** contra todos los casos, sin contar intentos. Sirve, por ejemplo, para comprobar que una solución O(n²) no pasa.
- **Importar ahora** fuerza la lectura de `retos/*.json`. Los retos del agente que edites a mano ya no se sobrescriben al reimportar.
- **Borrar** un reto solo es posible si nadie lo ha jugado. Si ya lo ha jugado alguien, se retira.

## Cómo funciona la ejecución

```
código del usuario + driver generado  ──►  Wandbox / Judge0  ──►  stdout con marcadores  ──►  veredicto por test
             ▲                                   ▲
   plantilla a partir de la firma      tests codificados por stdin
```

- Cada reto define una **firma tipada** (`functionName`, parámetros y tipo de retorno). A partir de ella se generan la plantilla del editor y un *driver* para cada lenguaje (`server/src/harness/`).
- Tipos soportados: `int, long, double, bool, string`, sus arrays `[]`, y `int[][]` y `string[][]`.
- Los tests viajan por **stdin** como tokens simples, así se admiten entradas grandes (hasta 700 KB por test).
- Si todos los tests no caben en una petición (Wandbox admite 1 MB), el runner los reparte en varias y junta los resultados.
- Con Wandbox, el driver vigila el límite de tiempo: si se agota imprime `NONCE:i:TLE` y termina.
- El driver imprime `NONCE:i:OK:<json>` por test. El nonce es aleatorio en cada ejecución, así que el usuario no puede falsificar resultados imprimiendo esas líneas.
- La comparación se hace en el servidor: exacta con tolerancia `1e-6` en decimales, `unordered` o `unordered-deep`.
- **Los errores de compilación o sintaxis no gastan intento.**
- En un envío, los tests ocultos nunca se muestran. De un test oculto solo se indica el tipo de error.

## Estructura

```
client/                React + Vite
  src/pages/           DayPage (hoy / día X), ArchivePage (calendario), ProblemPage (editor)
  src/components/      Layout, casillas estilo Wordle
  src/lib/             api, i18n (es/en), monaco, formato
server/                Express + Mongo
  src/harness/         tipos, plantillas, drivers por lenguaje, codificación, parseo y comparación
  src/executor/        Wandbox, Judge0 y ejecutor local
  src/services/game.ts lógica de días, progreso, ejecutar y enviar (con bloqueo anti-envíos simultáneos)
  src/seed/            problemas de ejemplo + generador en Python
  src/tests/           tests end-to-end del harness
```

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/meta` | fecha de hoy, tiempo hasta el siguiente día, nº de intentos |
| GET | `/api/days/:date` | retos de un día (`today` o `YYYY-MM-DD`) con el progreso del jugador |
| GET | `/api/calendar` | días con retos y cuántos ha resuelto el jugador |
| GET | `/api/problems/:id` | enunciado, ejemplos, plantillas y progreso |
| POST | `/api/problems/:id/run` | ejecuta con los ejemplos (ilimitado, con límite de frecuencia) |
| POST | `/api/problems/:id/submit` | envío evaluado con ejemplos + tests ocultos (máx. 5) |
| GET | `/api/auth/me` | usuario actual (o `null` si es invitado) y racha |
| POST | `/api/auth/register` | crea una cuenta y le pasa el progreso del invitado |
| POST | `/api/auth/login` | inicia sesión con email o usuario y le pasa el progreso del invitado |
| POST | `/api/auth/logout` | cierra sesión y vuelve a modo invitado |
| GET | `/api/stats` | estadísticas: racha, distribución de envíos, por nivel y por lenguaje |

### Cuentas y rachas

- Se puede jugar sin cuenta: el progreso se guarda en el servidor asociado a una cookie de invitado.
- Al registrarte o entrar, el progreso del invitado pasa a tu cuenta. Si los dos tienen el mismo reto, se conserva el de la cuenta salvo que el invitado lo resolviera y la cuenta no.
- Las contraseñas se guardan con scrypt.
- La **racha** cuenta los días seguidos en los que resuelves al menos un reto el mismo día en que se publica. Los días anteriores suman a las estadísticas pero no a la racha.
- Un **día perfecto** es uno en el que resuelves los 4 retos ese mismo día.

## Hoja de ruta

- [x] **Fase 1**: base, editor, ejecución en 4 lenguajes, retos diarios, días anteriores, i18n y tema oscuro
- [x] **Mejoras (27-sep)**: Go, Rust, C# y TypeScript; tiempo de ejecución por test; solución oficial con explicación; modo claro
- [x] **Fase 2**: cuentas (registro/login, y pasar el progreso de invitado a la cuenta), rachas y estadísticas
- [x] **Fase 3**: generación diaria de retos con un agente programado (sin clave de API), validada con la referencia y una fuerza bruta
- [x] **Fase 4**: panel de administración para revisar, editar y publicar retos
- [x] **Fase 5**: despliegue gratis en Render + MongoDB Atlas + Wandbox + UptimeRobot, explicado en [DESPLIEGUE.md](DESPLIEGUE.md)

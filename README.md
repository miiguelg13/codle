# Codle · retos diarios de programación estilo Wordle

Cada día hay **4 retos** (Fácil, Medio, Difícil y Experto). Se resuelven en un editor tipo LeetCode en **Python, JavaScript, Java o C++**. Tienes **5 envíos** por reto, y cada envío pinta una fila de casillas (una por test), como en Wordle.

> "Codle" es un nombre provisional. Para cambiarlo, edita `Logo` en `client/src/components/Layout.tsx` y el `<title>` de `client/index.html`.

## Stack

| Parte | Tecnología |
|---|---|
| Frontend | React 19 + Vite + TypeScript, Monaco Editor, react-router |
| Backend | Node + Express + TypeScript |
| Base de datos | MongoDB (Mongoose) |
| Ejecución de código | Judge0 (API), o un ejecutor `local` solo para desarrollo |

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
   - **Judge0 (recomendado)**: suscríbete al plan gratuito de [Judge0 CE en RapidAPI](https://rapidapi.com/judge0-official/api/judge0-ce) y pon tu clave en `JUDGE0_RAPIDAPI_KEY`. El plan gratuito tiene un límite diario de peticiones. Cada "Ejecutar" y cada "Enviar" gastan **una** petición, porque todos los tests van en la misma.
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
npm test                               # tests del motor en los 4 lenguajes (necesita python3, node, java y g++)
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm test   # además, tests de integración de la API
npm run build && npm start -w server   # producción: Express sirve también el frontend
python server/src/seed/generate_seed.py   # regenera problems.json desde las soluciones de referencia
```

## Cómo funciona la ejecución

```
código del usuario + driver generado  ──►  Judge0 (1 petición)  ──►  stdout con marcadores  ──►  veredicto por test
             ▲                                   ▲
   plantilla a partir de la firma      tests codificados por stdin
```

- Cada reto define una **firma tipada** (`functionName`, parámetros y tipo de retorno). A partir de ella se generan la plantilla del editor y un *driver* para cada lenguaje (`server/src/harness/`).
- Tipos soportados: `int, long, double, bool, string`, sus arrays `[]`, y `int[][]` y `string[][]`.
- Los tests viajan por **stdin** como tokens simples, así se admiten entradas grandes (10⁵ elementos).
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
  src/executor/        Judge0 y ejecutor local
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
- [x] **Fase 2**: cuentas (registro/login, y pasar el progreso de invitado a la cuenta), rachas y estadísticas
- [ ] **Fase 3**: generación diaria con IA (API de Claude), validada con la solución de referencia en Judge0
- [ ] **Fase 4**: panel de administración para revisar, editar y publicar retos
- [ ] **Fase 5**: despliegue

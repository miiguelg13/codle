# Publicar Codle en internet (gratis y siempre encendido)

Todo lo que hay aquí es gratis y no pide tarjeta. Tardarás unos 30–45 minutos la primera vez.

| Pieza | Para qué | Servicio (plan gratis) |
|---|---|---|
| Código | Render despliega desde aquí | **GitHub** |
| Base de datos | usuarios, progreso, retos | **MongoDB Atlas** (M0, 512 MB) |
| Ejecutar código | "Ejecutar" y "Enviar" | **Wandbox** (gratis, sin cuenta ni clave) |
| La web | servidor + frontend | **Render** (Web Service Free) |
| Que no se duerma | visita la web cada 5 min | **UptimeRobot** (50 monitores) |

> Render duerme los servicios gratis tras 15 min sin visitas. UptimeRobot la visita cada 5 minutos para que no llegue a dormirse. Render da 750 horas gratis al mes, suficientes para tenerla encendida el mes entero.

> **Nunca** subas a GitHub `server/.env` ni `.codle-deploy`. Ya están en `.gitignore`.

---

## 1. Subir el código a GitHub

Haz doble clic en **`conectar-github.bat`** (en la carpeta del proyecto). Usa Git for Windows, que ya tienes instalado:

1. Te pregunta el nombre del repositorio. Pulsa Enter para dejar `codle`.
2. La primera vez se abre el navegador para que inicies sesión en GitHub y autorices a **Git Credential Manager**. El script no ve tu contraseña.
3. Crea el repositorio **privado** en tu cuenta y sube todo el historial. Los retos (`retos/specs/`) no se suben: se quedan en tu PC para que nadie vea las soluciones antes de tiempo. Si ya existe un repositorio con ese nombre, lo reutiliza.
4. Crea la tarea de Windows **"Codle - subir a GitHub"**, que cada hora sube tus commits nuevos. Nunca pide contraseña. Si la sesión de GitHub caduca, verás el error en `logs/subida-github.log`; vuelve a ejecutar `conectar-github.bat`.

## 2. Base de datos: MongoDB Atlas

1. Crea una cuenta en https://www.mongodb.com/cloud/atlas/register.
2. **Create cluster** → **M0 (Free)**. Proveedor AWS, región **Frankfurt (eu-central-1)**, la más cercana a Render Frankfurt.
3. **Database Access → Add New Database User**. Usuario, por ejemplo, `codle`, con una contraseña larga: pulsa "Autogenerate" y **cópiala**.
4. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`). Render gratis no tiene una IP fija.
5. **Connect → Drivers** y copia la cadena de conexión. Tiene esta forma:
   ```
   mongodb+srv://codle:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
   - Sustituye `<password>` por la contraseña.
   - Añade el nombre de la base de datos, **`codle`**, justo antes del `?`:
   ```
   mongodb+srv://codle:TU_CONTRASEÑA@cluster0.xxxxx.mongodb.net/codle?retryWrites=true&w=majority&appName=Cluster0
   ```
   Esta es tu **MONGODB_URI**.

## 3. Ejecución de código: Wandbox (no hay que hacer nada)

El código de los jugadores se ejecuta en [Wandbox](https://wandbox.org), un compilador online gratuito que no pide cuenta ni clave. Ya viene configurado (`EXECUTOR=wandbox` en `render.yaml`).

- Wandbox no acepta peticiones de más de 1 MB. Si los tests de un reto no caben en una, el servidor los reparte en varias. `build.py` impide que un test pase de 700 KB.
- Wandbox no aplica el límite de tiempo de cada reto: lo vigila el propio programa, que se corta al agotarlo y marca ese test como "Tiempo límite excedido".
- Es un servicio comunitario sin garantías. Si algún día va lento o se cae, "Ejecutar" y "Enviar" mostrarán un error y no se gasta intento. Como alternativa de pago está Judge0 en RapidAPI (`EXECUTOR=judge0` y `JUDGE0_RAPIDAPI_KEY`), que cuesta unos 0,0017 $ por ejecución.

## 4. La web: Render

1. Crea una cuenta en https://render.com con **Sign in with GitHub** y dale acceso al repositorio.
2. **New → Blueprint** y elige el repositorio. Render lee el fichero `render.yaml` y crea el servicio `codle`.
3. Te pedirá dos valores:
   - `MONGODB_URI`: la del paso 2.
   - `ADMIN_EMAILS`: tu email, que te dará acceso al panel `/admin`.

   `JWT_SECRET` y `RETOS_UPLOAD_TOKEN` se generan solos.
4. **Apply**. El primer despliegue tarda unos 5 minutos. Al terminar tendrás una URL como `https://codle-xxxx.onrender.com`.
5. Ábrela: deberían salir los retos de ejemplo. Si la base de datos está vacía, se cargan solos al arrancar.

## 5. Que no se duerma: UptimeRobot

1. Crea una cuenta en https://uptimerobot.com.
2. **New monitor** con esta configuración:
   - Tipo **HTTP(s)**.
   - URL `https://codle-xxxx.onrender.com/api/health`, la tuya.
   - Intervalo **5 minutes**.
3. Guarda. Además, te avisará por email si la web se cae.

## 6. Conectar los retos diarios del agente

El agente genera los retos en tu PC. Una tarea de Windows los sube a la web cada hora.

1. En Render, abre el servicio `codle` → **Environment** y copia el valor de `RETOS_UPLOAD_TOKEN`.
2. En la carpeta del proyecto hay un fichero **`.codle-deploy`**. Ábrelo con el Bloc de notas y rellena los dos valores:
   ```
   URL=https://codle-xxxx.onrender.com
   TOKEN=el-token-que-has-copiado
   ```
   - Guárdalo **sin** extensión `.txt`: en el Bloc de notas, elige "Todos los archivos".
   - Si no existe, créalo.
3. Haz doble clic en **`programar-subida.bat`**. Hace dos cosas:
   - Crea la tarea "Codle - subir retos", que se ejecuta cada hora.
   - Sube ya los retos pendientes.

   Solo se suben los ficheros nuevos o cambiados. El registro queda en `logs/subida-retos.log`.

También puedes subir ficheros `retos/AAAA-MM-DD.json` a mano desde el panel: **⚙ Admin → Subir ficheros de retos**.

## 7. Primeros pasos en la web publicada

1. Regístrate con el email que pusiste en `ADMIN_EMAILS`.
2. En el menú de tu cuenta aparecerá **⚙ Admin**. En la tira **Próximos días** puedes comprobar que los días siguientes tienen sus 4 retos.

---

## Cómo se actualiza

- **Código:** los commits que hagas en tu carpeta llegan a GitHub en menos de una hora, con la tarea "Codle - subir a GitHub". Render redespliega solo en 3–5 minutos. Para subirlos ya, vuelve a ejecutar `conectar-github.bat`.
- **Retos:** el agente los genera cada noche en tu PC, y la tarea de Windows los sube a la web. El PC tiene que estar encendido a esas horas.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| El despliegue falla con "JWT_SECRET es obligatorio" | La variable no existe en Render → Environment. Añádela con un valor aleatorio largo. |
| La web no arranca: "MongoServerSelectionError" | Falta `0.0.0.0/0` en Atlas → Network Access, o la contraseña de la URI no es correcta. Si la contraseña tiene símbolos, codifícalos para URL o genera otra solo con letras y números. |
| "Ejecutar" da "El motor de ejecución no responde" | Wandbox está caído o saturado. Prueba en https://wandbox.org; si no va, espera un rato. |
| La web tarda ~1 min en cargar | Se durmió. Revisa que el monitor de UptimeRobot está activo. |
| GitHub no recibe los cambios | Mira `logs/subida-github.log`. Si pone "Authentication failed", ejecuta `conectar-github.bat` para volver a iniciar sesión. |
| No aparecen los retos nuevos | Mira `logs/subida-retos.log` en tu PC y comprueba `.codle-deploy`. |
| El build se queda sin memoria | En Render → Environment, añade `NODE_OPTIONS=--max-old-space-size=460`. |

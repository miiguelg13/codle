# Publicar Codle en internet (gratis y siempre encendido)

Todo lo que hay aquí es gratis y no pide tarjeta. Tardarás unos 30–45 minutos la primera vez.

| Pieza | Para qué | Servicio (plan gratis) |
|---|---|---|
| Código | Render despliega desde aquí | **GitHub** (repositorio privado) |
| Base de datos | usuarios, progreso, retos | **MongoDB Atlas** (M0, 512 MB) |
| Ejecutar código | "Ejecutar" y "Enviar" | **Judge0 CE en RapidAPI** (plan Basic) |
| La web | servidor + frontend | **Render** (Web Service Free) |
| Que no se duerma | visita la web cada 5 min | **UptimeRobot** (50 monitores) |

> Render duerme los servicios gratis tras 15 min sin visitas. UptimeRobot la visita cada 5 minutos para que no llegue a dormirse. Render da 750 horas gratis al mes, suficientes para tenerla encendida el mes entero.

> **Nunca** subas a GitHub `server/.env` ni `.codle-deploy`. Ya están en `.gitignore`.

---

## 1. Subir el código a GitHub (privado)

La forma más sencilla es con **GitHub Desktop**:

1. Crea una cuenta en https://github.com si no la tienes, e instala https://desktop.github.com.
2. En GitHub Desktop: **File → Add local repository…** y elige la carpeta `Wordle programacion`. Ya es un repositorio git con todo el historial.
3. Pulsa **Publish repository**. Deja marcada la casilla **Keep this code private**: el repositorio lleva soluciones y tests de los retos, que no deben ser públicos.

Cada vez que haya cambios, ábrelo y pulsa **Commit to main** y luego **Push origin**. Render se vuelve a desplegar solo.

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

## 3. Ejecución de código: Judge0 en RapidAPI

1. Crea una cuenta en https://rapidapi.com.
2. Abre https://rapidapi.com/judge0-official/api/judge0-ce/pricing y suscríbete al plan **Basic** (gratis).
3. En la pestaña **Endpoints**, copia el valor de **X-RapidAPI-Key**. Esa es tu **JUDGE0_RAPIDAPI_KEY**.

El plan gratis tiene un límite diario de peticiones. Cada "Ejecutar" y cada "Enviar" gasta **una** petición, porque todos los tests van juntos. Si se agota, los jugadores ven el aviso "Se ha agotado la cuota diaria del ejecutor". Si la web crece, puedes pasar a un plan de pago sin tocar código.

## 4. La web: Render

1. Crea una cuenta en https://render.com con **Sign in with GitHub** y dale acceso al repositorio.
2. **New → Blueprint** y elige el repositorio. Render lee el fichero `render.yaml` y crea el servicio `codle`.
3. Te pedirá tres valores:
   - `MONGODB_URI`: la del paso 2.
   - `JUDGE0_RAPIDAPI_KEY`: la del paso 3.
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

- **Código:** cuando Claude haga cambios en tu carpeta, haz Commit + Push en GitHub Desktop. Render redespliega solo en 3–5 minutos.
- **Retos:** el agente los genera cada noche en tu PC, y la tarea de Windows los sube a la web. El PC tiene que estar encendido a esas horas.

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| El despliegue falla con "JWT_SECRET es obligatorio" | La variable no existe en Render → Environment. Añádela con un valor aleatorio largo. |
| La web no arranca: "MongoServerSelectionError" | Falta `0.0.0.0/0` en Atlas → Network Access, o la contraseña de la URI no es correcta. Si la contraseña tiene símbolos, codifícalos para URL o genera otra solo con letras y números. |
| "Ejecutar" da "El motor de ejecución no responde" | `JUDGE0_RAPIDAPI_KEY` está vacía o no es correcta, o no te suscribiste al plan Basic. |
| La web tarda ~1 min en cargar | Se durmió. Revisa que el monitor de UptimeRobot está activo. |
| No aparecen los retos nuevos | Mira `logs/subida-retos.log` en tu PC y comprueba `.codle-deploy`. |
| El build se queda sin memoria | En Render → Environment, añade `NODE_OPTIONS=--max-old-space-size=460`. |

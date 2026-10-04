# Proyecto 1 - Bases de Datos II

Aplicación web para consultar y presentar datos de **WideWorldImporters**. El
trabajo de búsqueda, filtrado y agregación debe resolverse en SQL Server mediante
procedimientos almacenados; la API recibe parámetros y devuelve resultados a la
interfaz. Se seguirá la arquitectura de la [Tarea 1: API sobre AdventureWorks](https://github.com/Q-ARAYA/Tarea-1-Bases-API): Node.js, Express, `mssql`, procedimientos almacenados y sinónimos.

## Integrante

- Quiriat Mata — 2023379891

## Requisitos del proyecto

- SQL Server y base de ejemplo WideWorldImporters.
- Módulos de clientes, proveedores, inventario/productos y ventas.
- Diez reportes/consultas estadísticas indicados en el enunciado.
- Sinónimos de seguridad y procedimientos almacenados; transacciones con
  `BEGIN TRANSACTION`, `COMMIT` y `ROLLBACK` donde haya escrituras.
- Aplicación web, API, validación y presentación clara de errores.
- Video de demostración con narración y enlace en este README.

La matriz de requisitos, comprobaciones verificables, alcance técnico y decisiones
de modelado está en [PLAN-Y-REQUISITOS.md](PLAN-Y-REQUISITOS.md).

## Entorno local: Windows + WSL 2 + Docker Engine + VS Code

SQL Server se ejecuta como contenedor **Linux** con Docker Engine instalado
directamente dentro de Ubuntu/WSL, igual que en la tarea anterior. No hace falta
crear una VM aparte ni instalar Docker Desktop. VS Code se conecta a Ubuntu con
la extensión WSL. El repositorio permanece en la carpeta sincronizada de Windows.

### 1. Instalar herramientas en Windows

1. En PowerShell como administrador, instalar WSL y Ubuntu:

   ```powershell
   wsl --install -d Ubuntu-24.04
   ```

   Reinicia si Windows lo solicita y completa la creación del usuario de Ubuntu.
2. Desde Ubuntu instala y arranca Docker Engine y Compose:

   ```bash
   sudo apt update
   sudo apt install -y docker.io docker-compose-v2
   sudo service docker start
   docker --version
   docker compose version
   ```

   Si Docker indica permiso denegado, antepón `sudo` a los comandos `docker`.
   El servicio puede necesitar `sudo service docker start` cada vez que se
   reinicia WSL, como en la tarea anterior.
3. Instala VS Code y las extensiones recomendadas (`.vscode/extensions.json`).
   Desde Ubuntu, abre el repositorio con VS Code y Remote - WSL para que las
   terminales y Node.js se ejecuten dentro de Linux:

   ```bash
   cd "/mnt/c/Users/quiri/OneDrive/Documents/Proyectos TEC/Bases II/Proyecto-1-BasesII"
   code .
   ```

### 2. Configurar el contenedor de SQL Server

Desde la raíz del repositorio, en una terminal Ubuntu/WSL de VS Code:

```bash
cp .env.example .env
```

Edita `.env` y reemplaza el valor de `MSSQL_SA_PASSWORD` por una contraseña
local fuerte. `.env` está ignorado por Git.

```bash
sudo docker compose up -d
sudo docker compose ps
sudo docker compose logs -f sqlserver
```

El primer inicio descarga la imagen y puede tardar. Espera a que el servicio
aparezca como `healthy`. SQL Server Developer escucha solo en tu máquina en
`localhost,1433`; usuario `sa`, contraseña en `.env`. En la extensión MSSQL de
VS Code, acepta confiar en el certificado de desarrollo si lo solicita.

Para detener el motor: `sudo docker compose down`. Los datos sobreviven gracias al
volumen nombrado. Para borrar también permanentemente esos datos locales:
`sudo docker compose down -v`.

### 3. WideWorldImporters

Descarga `WideWorldImporters-Full.bak` desde la versión enlazada en el enunciado
y guárdalo localmente (los `.bak` están excluidos de Git). La base de datos deberá
restaurarse en el contenedor una vez que el motor esté iniciado. Antes de preparar
el script de restauración hay que consultar los nombres lógicos de archivos del
respaldo con `RESTORE FILELISTONLY`, porque varían según el backup. No subas el
respaldo al repositorio.

## Tecnología y patrones que se reutilizan de la Tarea 1

- **Se conserva:** Node.js/Express, el paquete `mssql`, configuración mediante variables de entorno, un pool SQL compartido, parámetros tipados y llamadas a sinónimos de procedimientos almacenados.
- **Se conserva:** scripts SQL separados para procedimientos y sinónimos; los SP usan `SET NOCOUNT ON` y dejan a la base de datos el filtrado y la transformación.
- **Se adapta:** las rutas de productos de AdventureWorks se sustituyen por los módulos de WideWorldImporters: clientes, proveedores, productos, ventas y reportes.
- **Se adapta:** escrituras con transacciones, `TRY/CATCH`, `COMMIT` y `ROLLBACK`, como exige el nuevo enunciado.
- **No se copian:** consultas, nombres de tablas/SP/sinónimos, campos ni datos propios de AdventureWorks. Todo se basará en el esquema de WideWorldImporters.

Referencias del código anterior: [`server.js`](https://github.com/Q-ARAYA/Tarea-1-Bases-API/blob/main/server.js), [`db.js`](https://github.com/Q-ARAYA/Tarea-1-Bases-API/blob/main/db.js) y [`sql_scripts/`](https://github.com/Q-ARAYA/Tarea-1-Bases-API/tree/main/sql_scripts).

## Estructura

```text
Api/              Servicio HTTP Node.js/Express
Script/           Esquema, sinónimos, procedimientos y ejemplos SQL
WebSite/          Interfaz web
compose.yaml      SQL Server Linux para desarrollo
```

Las carpetas preexistentes `codigo/`, `proyectos/` y `Script sql/` se conservan
como material inicial del repositorio.

## Iniciar la API

Con SQL Server arriba y los procedimientos ya desplegados, desde WSL abre una
terminal en `Api/` y ejecuta `npm install` y `npm run dev`. La API lee la
configuración del `.env` ubicado en la raíz. La guía de rutas, parámetros,
respuestas y configuración se encuentra en [Api/README.md](Api/README.md).

## Iniciar la interfaz web

En otra terminal Ubuntu/WSL de VS Code:

```bash
cd "/mnt/c/Users/quiri/OneDrive/Documents/Proyectos TEC/Bases II/Proyecto-1-BasesII/WebSite"
npm install
npm run dev
```

Abre `http://localhost:5173`. La interfaz se conecta a `http://localhost:3000/api`;
consulta [WebSite/README.md](WebSite/README.md) para el alcance de cada pantalla.

## Plan de seis días

Fecha límite del enunciado: **4 de octubre de 2026, 10:00 p. m.** Organiza cada
día en un tracto pequeño: objetivo, implementación y anotación de pendientes.

| Día | Entrega del tracto |
|---|---|
| 1 — 28 sep | WSL 2, Docker, SQL Server Linux; descargar/restaurar WideWorldImporters; revisar esquema y repartir módulos. |
| 2 — 29 sep | Conexión de API; sinónimos, permisos y procedimientos de clientes/proveedores; consultas de ejemplo. |
| 3 — 30 sep | Procedimientos y pantallas de productos/inventario y ventas; parámetros y detalles. |
| 4 — 1 oct | Reportes 1–5: agregaciones, `ROLLUP`, `DENSE_RANK` y `PARTITION BY`. |
| 5 — 2 oct | Reportes 6–10, incluyendo rotación de inventario y método de envío favorito; pulir la interfaz y validaciones. |
| 6 — 3 oct | Integración completa, revisar criterios/rúbrica, README y objetivos alcanzados; grabar y publicar el video. Dejar el 4 oct para revisión final y entrega antes de las 10 p. m. |

## Estado y video

- Objetivos alcanzados: WSL 2 con Ubuntu 24.04; Docker Engine y Compose; SQL Server 2022 en contenedor Linux; WideWorldImporters restaurada; conexión desde VS Code; 25 sinónimos; procedimientos de listas/detalles de los cuatro módulos, catálogos de filtros y diez reportes; paginación SQL; operaciones transaccionales de cliente verificadas con rollback.
- Pendientes: API Express; interfaz React/MUI; validaciones integradas desde la interfaz; prueba de los cambios de cliente desde la aplicación; permisos limitados para el usuario de la API; completar los objetivos finales y el enlace al video narrado.
- SQL: el orden de ejecución y los ejemplos están documentados en [Script/README.md](Script/README.md). Los procedimientos fueron creados en la instancia local y se ejecutaron con resultados sobre WideWorldImporters; revisa esa instancia antes de volver a desplegar.
- Video de demostración: _agregar enlace de YouTube al finalizar_.

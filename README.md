# Proyecto 1 — Bases de Datos II

Sistema web conectado a **WideWorldImporters** para consultar clientes, proveedores,
inventario y ventas, además de ejecutar diez reportes estadísticos. SQL Server realiza
las consultas y agregaciones mediante procedimientos almacenados; la API Node.js
transmite los parámetros y resultados a la interfaz React.

## Integrante

- **Quiriat Mata** — **Carnet: 2023379891**

## Estado del proyecto

Excelente. La solución está implementada e integrada localmente con SQL Server 2022 en Linux,
ejecutándose en Docker Engine dentro de Ubuntu 24.04/WSL 2. Los flujos principales se
probaron con WideWorldImporters.

### Objetivos logrados

- Configurar Ubuntu/WSL 2 y Docker Engine para ejecutar SQL Server sobre Linux.
- Restaurar y consultar WideWorldImporters desde la extensión MSSQL de VS Code.
- Crear el esquema `app`, 25 sinónimos y procedimientos almacenados para los módulos,
  catálogos, paginación y diez reportes.
- Implementar una API REST con Node.js, Express y `mssql`, parámetros tipados,
  validaciones, manejo de errores y rutas de salud.
- Implementar una interfaz React, Vite y Material UI con resumen, filtros,
  listados, detalles y formularios de clientes.
  
## Módulos disponibles

- **Resumen:** conteos del sistema y estado de conexión con la API/base de datos.
- **Clientes:** filtros, detalle y operaciones de alta, edición y eliminación.
- **Proveedores:** filtros, lista y detalle.
- **Inventario:** filtros por nombre, grupo y existencias mínima/máxima; detalle de
  producto y proveedor.
- **Ventas:** filtros por cliente, fechas y monto; detalle de factura y líneas.
- **Estadísticas:** diez reportes calculados en SQL Server, con filtros y paginación
  de resultados en pantalla.

## Tecnologías y estructura

- SQL Server 2022 Developer sobre Linux en Docker Engine/WSL 2.
- API: Node.js, Express y `mssql`.
- Sitio web: React, Vite y Material UI.
- SQL: sinónimos y procedimientos almacenados bajo el esquema `app`.

```text
Api/       API REST
Script/    Sinónimos, procedimientos y consultas SQL
WebSite/   Interfaz web
compose.yaml
           Contenedor SQL Server y volumen persistente
```

La arquitectura y los parámetros de la API continúan el patrón empleado en la
[Tarea 1: API sobre AdventureWorks](https://github.com/Q-ARAYA/Tarea-1-Bases-API):
pool SQL compartido, variables de entorno y procedimientos con parámetros tipados.
Se adaptaron las entidades y consultas a WideWorldImporters.

## Requisitos locales

- Windows con WSL 2 y Ubuntu 24.04.
- Docker Engine y Docker Compose instalados dentro de Ubuntu/WSL.
- VS Code con las extensiones **WSL** y **SQL Server (mssql)**.
- Node.js **20.19 o posterior** (se recomienda Node 22).

El repositorio puede permanecer en la carpeta sincronizada de Windows y abrirse desde
Ubuntu/WSL. Para ubicarse en él:

```bash
cd "Proyecto-1-BasesII"
code .
```

## Preparar SQL Server y WideWorldImporters

En la raíz del repositorio, dentro de Ubuntu/WSL, crea la configuración local y define
una contraseña fuerte para SQL Server:

```bash
cp .env.example .env
```

Edita `.env` y cambia `MSSQL_SA_PASSWORD`. No publiques ese archivo ni la copia de
seguridad `.bak`; ambos están excluidos de Git.

Inicia Docker y el contenedor:

```bash
sudo service docker start
sudo docker compose up -d
sudo docker compose ps
```

Espera hasta que `basesii-sqlserver` aparezca como `healthy`. El puerto local es
`127.0.0.1:1433`; el usuario es `sa` y la contraseña está en `.env`.

Restaura la base de ejemplo **WideWorldImporters** una sola vez en el contenedor. El
archivo de respaldo oficial debe copiarse al contenedor; antes de restaurar, ejecuta
`RESTORE FILELISTONLY` para consultar los nombres lógicos incluidos en ese respaldo y
úsalos en el comando `RESTORE DATABASE`. No incluyas el respaldo en este repositorio.
Conéctate desde VS Code a `localhost`, selecciona `WideWorldImporters` y, si la
extensión lo solicita, activa **Trust server certificate** para el certificado local
de desarrollo.

## Desplegar los objetos SQL

Con MSSQL conectado a `WideWorldImporters`, ejecuta los scripts en este orden:

1. [`Script/synonyms.sql`](Script/synonyms.sql)
2. [`Script/customers-read.sql`](Script/customers-read.sql)
3. [`Script/customers-write.sql`](Script/customers-write.sql)
4. [`Script/suppliers-read.sql`](Script/suppliers-read.sql)
5. [`Script/stock-items-read.sql`](Script/stock-items-read.sql)
6. [`Script/sales-read.sql`](Script/sales-read.sql)
7. [`Script/lookups.sql`](Script/lookups.sql)
8. [`Script/reports.sql`](Script/reports.sql)

Las escrituras de clientes usan transacciones y `TRY/CATCH` para confirmar o revertir
los cambios. Los scripts empiezan con `USE [WideWorldImporters]`; verifica que la base
restaurada tenga ese nombre.

## Ejecutar la solución

Mantén SQL Server iniciado y abre dos terminales Ubuntu/WSL desde VS Code.

**Terminal 1 — API**

```bash
cd "Proyecto-1-BasesII/Api"
npm install
npm run check
npm run dev
```

La API escucha en `http://localhost:3000/api`. Comprueba su estado y conexión a la
base de datos con:

```bash
curl http://localhost:3000/api/health/live
curl http://localhost:3000/api/health/ready
```

**Terminal 2 — sitio web**

```bash
cd "Proyecto-1-BasesII/WebSite"
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173). Para compilar la versión de
entrega ejecuta `npm run build` dentro de `WebSite/`.

Para detener SQL Server sin borrar sus datos: `sudo docker compose down`. El volumen
`sqlserver-data` conserva la base. `sudo docker compose down -v` elimina también ese
volumen y sus datos.

## Documentación complementaria

- [Plan y matriz de requisitos](PLAN-Y-REQUISITOS.md)
- [Descripción de la interfaz](WebSite/README.md)
- [Scripts SQL](Script/)

## Video de demostración

https://youtu.be/j1cjJLyT1D0

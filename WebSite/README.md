# Interfaz web

Interfaz React + Vite + Material UI para los cinco módulos de WideWorldImporters. La aplicación envía los filtros a la API y presenta los resultados devueltos por SQL Server; no filtra, agrupa ni calcula estadísticas en el navegador.

## Ejecución en Ubuntu/WSL y VS Code

Necesitas Node.js 20.19 o posterior, el motor SQL del proyecto iniciado y la API ejecutándose en el puerto 3000. Desde una segunda terminal de VS Code Remote - WSL:

```bash
cd "/mnt/c/Users/quiri/OneDrive/Documents/Proyectos TEC/Bases II/Proyecto-1-BasesII/WebSite"
npm install
npm run dev
```

Abre `http://localhost:5173`. La dirección de la API predeterminada es `http://localhost:3000/api`; puedes cambiarla con `VITE_API_URL` en el entorno de Vite si es necesario. Compilación de entrega: `npm run build`.

En otra terminal se arranca la API siguiendo [`../Api/README.md`](../Api/README.md). Antes de usar edición de clientes, vuelve a ejecutar `../Script/customers-read.sql` en WideWorldImporters, que ahora incluye en el detalle todos los campos necesarios para precargar el formulario.

## Pantallas

- **Resumen:** conteos obtenidos de los metadatos de paginación de SQL Server y acceso directo a las secciones.
- **Clientes:** lista filtrable y paginada, detalle, ubicación, alta, edición y eliminación. La base actual no publica catálogos de ciudades ni contactos; esos identificadores se introducen manualmente en el formulario y el procedimiento SQL valida las referencias.
- **Proveedores:** filtros, lista, detalle de contacto, dirección y datos bancarios solo en la vista de detalle.
- **Inventario:** filtros de nombre, grupo y existencia; detalle de atributos del producto y proveedor relacionado.
- **Ventas:** filtros por cliente, fecha y monto; nota de crédito identificada, factura y líneas de detalle.
- **Estadísticas:** los diez procedimientos de reporte con los parámetros disponibles, años obtenidos desde SQL Server y presentación tabular.

Las listas cargan una página de 25 filas y envían la paginación y los criterios a la API. Los valores de importes, unidades y reportes provienen de los procedimientos almacenados. La pantalla de rotación declara la fórmula documentada en [`../Script/reports.sql`](../Script/reports.sql).

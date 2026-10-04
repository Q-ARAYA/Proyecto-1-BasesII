# Requisitos verificables y alcance

Fuente: enunciado «Proyecto 1 - Bases 2», entrega 4 de octubre de 2026 a las 10:00 p. m. Este documento convierte sus requisitos en comprobaciones concretas y registra las decisiones de implementación.

## Hito SQL actual

- [x] Se inspeccionaron las seis páginas completas del enunciado y se mapearon los cuatro módulos, los diez reportes, la rúbrica y los entregables.
- [x] Se eligió arquitectura SQL Server en contenedor Linux + API Express/`mssql` + web React/Vite/Material UI.
- [x] Se crearon y desplegaron procedimientos de lectura y detalle para los cuatro módulos, las operaciones transaccionales existentes para clientes y diez procedimientos de reportes.
- [x] Se agregaron procedimientos de catálogos para filtros de selección y paginación de listas (25 por omisión, 100 máximo, total de filas incluido).
- [x] Se ejecutaron los diez scripts SQL/ejemplos contra WideWorldImporters (26 procedimientos en `app`, 25 sinónimos); las listas devolvieron sus primeras páginas y total; también se probó alta/edición/eliminación de cliente dentro de una transacción exterior revertida, confirmando que no quedó el registro de prueba.
- [x] Se implementó la API Express para módulos, catálogos y los diez reportes; todas las rutas ejecutan procedimientos almacenados con parámetros tipados. Se agregaron manejo de errores, validación, CORS, salud y guía de arranque.
- [x] Se implementó en React el resumen y las cinco áreas del proyecto: clientes, proveedores, inventario, ventas y los diez reportes, con filtros del servidor, paginación, detalles y formularios de clientes.
- [ ] Falta probar los flujos web de extremo a extremo contra SQL Server y revisar visualmente los casos con datos reales.

## Arquitectura acordada

- **Base de datos:** SQL Server 2022 Developer sobre Linux, dentro de Docker Engine en Ubuntu 24.04/WSL 2. WideWorldImporters OLTP restaurada como `WideWorldImporters`.
- **Capa SQL:** objetos bajo el esquema `app`; sinónimos para tablas base; procedimientos almacenados para filtros, cálculos, agregaciones y reportes. La API solo valida/formatea parámetros y presenta resultados.
- **API:** Node.js + Express + `mssql`, siguiendo la estructura reutilizable de Tarea 1 (pool compartido, configuración por variables de entorno y ejecución parametrizada de stored procedures).
- **Interfaz:** React + Vite + Material UI, recomendados por el propio enunciado. Tablas/formularios para búsqueda, páginas o diálogos para detalle, mapa para las ubicaciones y mensajes de validación/error.
- **Ejecución:** API y web se ejecutan dentro de Ubuntu/WSL desde VS Code; SQL Server permanece en Docker. Nunca versionar `.env`, contraseñas ni el backup `.bak`.

### Contrato propuesto de API

- `GET /api/customers`, `GET /api/customers/:id`
- `POST /api/customers`, `PUT /api/customers/:id`, `DELETE /api/customers/:id`
- `GET /api/suppliers`, `GET /api/suppliers/:id`
- `GET /api/stock-items`, `GET /api/stock-items/:id`
- `GET /api/invoices`, `GET /api/invoices/:id` (el detalle contiene encabezado y líneas)
- `GET /api/lookups/customer-categories`
- `GET /api/lookups/supplier-categories`
- `GET /api/lookups/delivery-methods`
- `GET /api/lookups/stock-groups`
- `GET /api/reports/years?dataset=Ventas|Compras|Inventario`
- `GET /api/reports/purchase-amounts`, `sales-amounts`, `top-products`, `top-customers`, `top-suppliers`, `sales-matrix`, `monthly-customer-sales`, `monthly-supplier-purchases`, `inventory-rotation`, `favorite-delivery-method`

Cada endpoint enviará parámetros tipados a un único procedimiento. Los diálogos de detalle de cliente/proveedor mostrarán las coordenadas del mapa; productos y clientes/proveedores se enlazarán por ID. El módulo de estadísticas solo organizará y mostrará las filas que devuelve SQL Server.

Los cuatro endpoints de listado incluirán `pageNumber` y `pageSize` (25 por omisión, máximo 100) y devolverán `TotalRows` para que la tabla pagine sin cargar las 70 mil facturas de la muestra en una sola respuesta. Los filtros de selección se alimentarán de procedimientos de catálogos, no de lecturas directas de tablas desde la API.

## Requisitos funcionales y cómo comprobarlos

### Clientes

- [ ] Tabla con nombre, categoría y método de entrega; nombre contiene texto libre y categoría/método son filtros acumulativos; limpiar filtros devuelve todos; orden predeterminado por nombre ascendente.
- [ ] Detalle en vista separada con categoría, grupo de compra, cliente de facturación, contactos primario/alternativo, método, ciudad, códigos postales, teléfonos/fax, días de pago, web, direcciones y coordenadas para mapa.
- [ ] Alta, edición y eliminación usan procedimientos transaccionales; mostrar errores de FK/validación sin perder el estado del formulario.
- [ ] Verificación: ejecutar lista sin filtros, filtros combinados, detalle existente/inexistente y pruebas de escritura en una base de desarrollo (crear, editar, revertir o eliminar solo un registro de prueba).

### Proveedores

- [ ] Tabla con nombre, categoría y método; filtro de nombre parcial y categoría acumulativos; restablecer, ordenar por nombre ascendente.
- [ ] Detalle en vista separada con referencia, contactos, método, ciudad/código postal, teléfono/fax, web, direcciones, mapa, banco/cuenta y días de pago.
- [ ] Verificación: lista con filtros y detalle válido/inválido; proteger datos bancarios para que solo se muestren en la vista de detalle.

### Inventario/productos

- [ ] Tabla con nombre, grupo(s) y existencia; nombre parcial, grupo y rango de existencia acumulativos; restablecer y ordenar por nombre.
- [ ] Detalle con proveedor enlazable, color, empaques/unidades, marca, talla, impuesto, precio, precio sugerido, peso, existencia, ubicación, palabras clave y grupos.
- [ ] Verificación: filtros individuales/combinados, productos que pertenezcan a varios grupos y detalle inexistente.

### Ventas/facturas

- [ ] Tabla con factura, fecha, cliente, método y total; nombre parcial, fechas y rango de monto acumulativos; restablecer filtros y orden por cliente ascendente.
- [ ] Detalle separado: encabezado (cliente enlazable, método, orden de compra, contacto, vendedor, fecha e instrucciones) y líneas (producto enlazable, cantidad, precio, impuesto y total por línea).
- [ ] Verificación: búsqueda por nombre y rangos; factura con varias líneas; factura inexistente; los abonos/notas de crédito quedan identificados para no confundirlos con ventas.

### Reportes SQL (10)

- [ ] 1. Compras a proveedores: máximo, mínimo y promedio por categoría/proveedor; `ROLLUP`; filtros libres de nombre y categoría.
- [ ] 2. Ventas a clientes: máximo, mínimo y promedio por categoría/cliente; `ROLLUP`; filtros libres de nombre y categoría.
- [ ] 3. Cinco productos con más ganancia por año; años disponibles, `DENSE_RANK` y `PARTITION BY`.
- [ ] 4. Cinco clientes por cantidad de facturas por año y monto facturado; filtro de rango de años válidos; `DENSE_RANK` y `PARTITION BY`.
- [ ] 5. Cinco proveedores por cantidad de órdenes por año y monto comprado; filtro de rango de años válidos; `DENSE_RANK` y `PARTITION BY`.
- [ ] 6. Matriz de ventas por grupo/categoría de producto y año.
- [ ] 7. Resumen mensual de ventas a clientes: importe, primera/última fecha de factura, unidades total/mínima/máxima; filtros por año, mes y agrupación de producto.
- [ ] 8. Resumen mensual de compras recibidas de proveedores: importe, primera/última fecha, unidades total/mínima/máxima; filtros por año, mes y agrupación de producto.
- [ ] 9. Días promedio de rotación por producto; filtros por grupo de producto, año y proveedor. La métrica debe declarar su fórmula en la interfaz/README.
- [ ] 10. Método de entrega más usado por destino; filtros por año, mes, categoría de cliente, grupo de producto y producto.
- [ ] Verificación común: ejecutar cada procedimiento en WideWorldImporters, contrastar filtros sin y con parámetros, revisar sumas contra consultas base y capturar ejemplos en `Script/queries-ejemplo.sql`.

### Calidad, rúbrica y entrega

- [x] Las pantallas pasan filtros y paginación a la API y presentan respuestas SQL sin agrupar, filtrar resultados ni calcular totales en el navegador.
- [ ] Sinónimos usados por todos los stored procedures; la autorización efectiva se configura mediante permisos de ejecución limitados, ya que un sinónimo por sí solo no es un límite de seguridad.
- [ ] Validación de parámetros/datos, presentación consistente, accesibilidad/legibilidad, mensajes claros y manejo de errores.
- [ ] Confirmar el segundo integrante: el enunciado pide trabajo en grupos de dos.
- [ ] README con integrantes, objetivos alcanzados/no alcanzados y enlace al video narrado.
- [ ] `Script/` contiene objetos y consultas de ejemplo; `Api/` contiene API; `WebSite/` contiene la aplicación.
- [ ] Video publicado en YouTube, con narración del uso/funcionamiento; enlace comprobado desde README.

| Área de rúbrica | Puntos | Desglose indicado |
|---|---:|---|
| SQL Server | 55 | Estadísticas 15; clientes, proveedores, productos e invoices (ventas) 10 cada uno |
| API | 20 | Evaluación de la API |
| Aplicación web | 25 | Cinco secciones (clientes, proveedores, productos, ventas, estadísticas), 5 puntos cada una; cada sección divide 2.5 usabilidad y 2.5 funcionalidad |
| **Total** | **100** | |

## Decisiones de modelado que el equipo debe mostrar

- WideWorldImporters tiene grupos planos (`Warehouse.StockGroups`), no una jerarquía nativa categoría/subcategoría. Para los filtros del enunciado se modelará grupo como categoría y producto como subcategoría seleccionable, dejando esta equivalencia visible en la UI.
- El destino de entrega se obtiene de la ciudad de entrega del cliente (`Sales.Customers.DeliveryCityID`); la factura del modelo OLTP no almacena una ciudad de entrega propia.
- Reportes de ventas incluirán importes con impuestos y tratarán notas de crédito con signo negativo cuando se calcule venta neta. Compras se calcularán como unidades recibidas × precio esperado por empaque, y la interfaz declarará esa aproximación del modelo.
- La rotación se medirá como días de inventario: inventario promedio ponderado por tiempo del año dividido por unidades vendidas durante ese año, multiplicado por los días del año. El saldo inicial se reconstruye desde la existencia actual menos los movimientos posteriores. Productos sin ventas tendrán resultado `NULL` y no se presentarán como rotación cero.
- Facturas y movimientos históricos no se borrarán desde la interfaz. «Gestionar» ventas significa consultar y abrir su detalle; los datos maestros editables se limitan a operaciones que no rompan el historial. Las escrituras que sí se habiliten serán transaccionales.
- El enunciado usa «gestionar» para proveedores e inventario, pero solo enumera listas, filtros y detalles, sin definir flujos o campos para alta/edición/baja. El alcance inicial los interpreta como consulta de registros. Si el docente espera CRUD también para estos catálogos, se deben añadir y probar stored procedures transaccionales antes de marcar esa parte como completa.

## Prioridad de trabajo restante

1. Terminar, desplegar y validar los procedimientos de los cuatro módulos y los diez reportes.
2. Construir la API con endpoints que solo llamen esos procedimientos.
3. Probar pantallas React, filtros, formularios y detalles contra la instancia WideWorldImporters.
4. Validar casos normales y límites con WideWorldImporters, preparar consultas demostrativas y README.
5. Grabar/publicar video narrado y enlazarlo; revisar la rúbrica antes de entregar.

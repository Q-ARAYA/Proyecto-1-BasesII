/*
    Inspección del esquema de WideWorldImporters
    Ejecutar desde VS Code conectado al servidor del proyecto.
    Este script solo consulta metadatos; no modifica la base.
*/
USE [WideWorldImporters];
GO

-- Columnas y tipos de las tablas que cubren módulos y reportes.
SELECT
    s.name AS Esquema,
    t.name AS Tabla,
    c.column_id AS Orden,
    c.name AS Columna,
    ty.name AS Tipo,
    CASE
        WHEN ty.name IN (N'nvarchar', N'nchar') AND c.max_length <> -1
            THEN CONVERT(varchar(12), c.max_length / 2)
        WHEN c.max_length = -1 THEN N'MAX'
        ELSE CONVERT(varchar(12), c.max_length)
    END AS Longitud,
    c.is_nullable AS PermiteNull,
    c.is_identity AS EsIdentity,
    dc.definition AS ValorDefault
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
JOIN sys.columns AS c ON c.object_id = t.object_id
JOIN sys.types AS ty ON ty.user_type_id = c.user_type_id
LEFT JOIN sys.default_constraints AS dc
    ON dc.parent_object_id = c.object_id
   AND dc.parent_column_id = c.column_id
WHERE CONCAT(s.name, N'.', t.name) IN
(
    N'Sales.Customers',
    N'Sales.CustomerCategories',
    N'Sales.BuyingGroups',
    N'Sales.Invoices',
    N'Sales.InvoiceLines',
    N'Purchasing.Suppliers',
    N'Purchasing.SupplierCategories',
    N'Purchasing.PurchaseOrders',
    N'Purchasing.PurchaseOrderLines',
    N'Warehouse.StockItems',
    N'Warehouse.StockItemHoldings',
    N'Warehouse.Colors',
    N'Warehouse.PackageTypes',
    N'Warehouse.StockGroups',
    N'Warehouse.StockItemStockGroups',
    N'Application.People',
    N'Application.DeliveryMethods',
    N'Application.Cities',
    N'Application.StateProvinces'
)
ORDER BY s.name, t.name, c.column_id;
GO

-- Relaciones entre esas tablas para orientar los JOIN de procedimientos.
SELECT
    OBJECT_SCHEMA_NAME(fkc.parent_object_id) AS EsquemaTabla,
    OBJECT_NAME(fkc.parent_object_id) AS Tabla,
    COL_NAME(fkc.parent_object_id, fkc.parent_column_id) AS Columna,
    OBJECT_SCHEMA_NAME(fkc.referenced_object_id) AS EsquemaReferido,
    OBJECT_NAME(fkc.referenced_object_id) AS TablaReferida,
    COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) AS ColumnaReferida,
    fk.name AS Restriccion
FROM sys.foreign_key_columns AS fkc
JOIN sys.foreign_keys AS fk
    ON fk.object_id = fkc.constraint_object_id
WHERE CONCAT(OBJECT_SCHEMA_NAME(fkc.parent_object_id), N'.',
             OBJECT_NAME(fkc.parent_object_id)) IN
(
    N'Sales.Customers',
    N'Sales.CustomerCategories',
    N'Sales.BuyingGroups',
    N'Sales.Invoices',
    N'Sales.InvoiceLines',
    N'Purchasing.Suppliers',
    N'Purchasing.SupplierCategories',
    N'Purchasing.PurchaseOrders',
    N'Purchasing.PurchaseOrderLines',
    N'Warehouse.StockItems',
    N'Warehouse.StockItemHoldings',
    N'Warehouse.Colors',
    N'Warehouse.PackageTypes',
    N'Warehouse.StockGroups',
    N'Warehouse.StockItemStockGroups',
    N'Application.People',
    N'Application.DeliveryMethods',
    N'Application.Cities',
    N'Application.StateProvinces'
)
   OR CONCAT(OBJECT_SCHEMA_NAME(fkc.referenced_object_id), N'.',
             OBJECT_NAME(fkc.referenced_object_id)) IN
(
    N'Sales.Customers',
    N'Sales.CustomerCategories',
    N'Sales.BuyingGroups',
    N'Sales.Invoices',
    N'Sales.InvoiceLines',
    N'Purchasing.Suppliers',
    N'Purchasing.SupplierCategories',
    N'Purchasing.PurchaseOrders',
    N'Purchasing.PurchaseOrderLines',
    N'Warehouse.StockItems',
    N'Warehouse.StockItemHoldings',
    N'Warehouse.Colors',
    N'Warehouse.PackageTypes',
    N'Warehouse.StockGroups',
    N'Warehouse.StockItemStockGroups',
    N'Application.People',
    N'Application.DeliveryMethods',
    N'Application.Cities',
    N'Application.StateProvinces'
)
ORDER BY EsquemaTabla, Tabla, Restriccion;
GO

/*
    Sinónimos para los procedimientos de la aplicación.
    Ejecutar después de restaurar WideWorldImporters.
*/
USE [WideWorldImporters];
GO

IF SCHEMA_ID(N'app') IS NULL
    EXEC(N'CREATE SCHEMA [app] AUTHORIZATION [dbo];');
GO

DECLARE @Synonyms TABLE
(
    SynonymName sysname NOT NULL,
    BaseObject nvarchar(300) NOT NULL
);

INSERT INTO @Synonyms (SynonymName, BaseObject)
VALUES
    (N'Customers',              N'Sales.Customers'),
    (N'CustomerCategories',     N'Sales.CustomerCategories'),
    (N'BuyingGroups',            N'Sales.BuyingGroups'),
    (N'Invoices',               N'Sales.Invoices'),
    (N'InvoiceLines',           N'Sales.InvoiceLines'),
    (N'Orders',                 N'Sales.Orders'),
    (N'OrderLines',             N'Sales.OrderLines'),
    (N'CustomerTransactions',   N'Sales.CustomerTransactions'),
    (N'TransactionTypes',       N'Application.TransactionTypes'),
    (N'Suppliers',              N'Purchasing.Suppliers'),
    (N'SupplierCategories',     N'Purchasing.SupplierCategories'),
    (N'PurchaseOrders',         N'Purchasing.PurchaseOrders'),
    (N'PurchaseOrderLines',     N'Purchasing.PurchaseOrderLines'),
    (N'SupplierTransactions',   N'Purchasing.SupplierTransactions'),
    (N'StockItems',             N'Warehouse.StockItems'),
    (N'StockItemHoldings',      N'Warehouse.StockItemHoldings'),
    (N'StockItemTransactions',  N'Warehouse.StockItemTransactions'),
    (N'StockGroups',            N'Warehouse.StockGroups'),
    (N'StockItemStockGroups',   N'Warehouse.StockItemStockGroups'),
    (N'Colors',                 N'Warehouse.Colors'),
    (N'PackageTypes',           N'Warehouse.PackageTypes'),
    (N'People',                 N'Application.People'),
    (N'DeliveryMethods',        N'Application.DeliveryMethods'),
    (N'Cities',                 N'Application.Cities'),
    (N'StateProvinces',         N'Application.StateProvinces');

DECLARE @SynonymName sysname;
DECLARE @BaseObject nvarchar(300);
DECLARE @Sql nvarchar(max);

DECLARE SynonymCursor CURSOR LOCAL FAST_FORWARD FOR
    SELECT SynonymName, BaseObject
    FROM @Synonyms
    ORDER BY SynonymName;

OPEN SynonymCursor;
FETCH NEXT FROM SynonymCursor INTO @SynonymName, @BaseObject;

WHILE @@FETCH_STATUS = 0
BEGIN
    IF NOT EXISTS
    (
        SELECT 1
        FROM sys.synonyms
        WHERE schema_id = SCHEMA_ID(N'app')
          AND name = @SynonymName
    )
    BEGIN
        SET @Sql =
            N'CREATE SYNONYM [app].' + QUOTENAME(@SynonymName)
            + N' FOR ' + QUOTENAME(PARSENAME(@BaseObject, 2))
            + N'.' + QUOTENAME(PARSENAME(@BaseObject, 1)) + N';';

        EXEC sys.sp_executesql @Sql;
    END;

    FETCH NEXT FROM SynonymCursor INTO @SynonymName, @BaseObject;
END;

CLOSE SynonymCursor;
DEALLOCATE SynonymCursor;
GO

SELECT name AS Sinonimo, base_object_name AS ObjetoBase
FROM sys.synonyms
WHERE schema_id = SCHEMA_ID(N'app')
ORDER BY name;
GO

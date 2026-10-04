/* Ejemplos de llamadas a procedimientos usados por la aplicación. */
USE [WideWorldImporters];
GO

-- Módulos: los filtros omitidos equivalen a NULL.
EXEC [app].[usp_Customers_List]
    @CustomerName = N'Ltd', @CustomerCategoryID = NULL, @DeliveryMethodID = NULL;
EXEC [app].[usp_Suppliers_List]
    @SupplierName = N'Ltd', @SupplierCategoryID = NULL, @DeliveryMethodID = NULL;
EXEC [app].[usp_StockItems_List]
    @StockItemName = N'USB', @StockGroupID = NULL,
    @MinQuantityOnHand = NULL, @MaxQuantityOnHand = NULL;
EXEC [app].[usp_Invoices_List]
    @CustomerName = N'Ltd', @InvoiceDateFrom = NULL, @InvoiceDateTo = NULL,
    @MinTotal = NULL, @MaxTotal = NULL, @PageNumber = 1, @PageSize = 25;
GO

-- Catálogos requeridos por los filtros de selección.
EXEC [app].[usp_Lookups_CustomerCategories];
EXEC [app].[usp_Lookups_SupplierCategories];
EXEC [app].[usp_Lookups_DeliveryMethods];
EXEC [app].[usp_Lookups_StockGroups];
GO

-- Detalles. Se toma un ID real solo para que este ejemplo funcione tras restaurar la BD.
DECLARE @CustomerID int = (SELECT MIN(CustomerID) FROM [app].[Customers]);
DECLARE @SupplierID int = (SELECT MIN(SupplierID) FROM [app].[Suppliers]);
DECLARE @StockItemID int = (SELECT MIN(StockItemID) FROM [app].[StockItems]);
DECLARE @InvoiceID int = (SELECT MIN(InvoiceID) FROM [app].[Invoices]);
EXEC [app].[usp_Customers_GetById] @CustomerID = @CustomerID;
EXEC [app].[usp_Suppliers_GetById] @SupplierID = @SupplierID;
EXEC [app].[usp_StockItems_GetById] @StockItemID = @StockItemID;
EXEC [app].[usp_Invoices_GetById] @InvoiceID = @InvoiceID;
GO

-- Años admitidos por cada conjunto; usar esos valores en filtros de reportes.
EXEC [app].[usp_Reports_GetYears] @Dataset = N'Ventas';
EXEC [app].[usp_Reports_GetYears] @Dataset = N'Compras';
EXEC [app].[usp_Reports_GetYears] @Dataset = N'Inventario';
GO

-- Reportes 1-2: parámetros de texto parcial opcionales.
EXEC [app].[usp_Report_PurchaseAmountsBySupplier]
    @SupplierName = NULL, @SupplierCategoryName = NULL;
EXEC [app].[usp_Report_SalesAmountsByCustomer]
    @CustomerName = NULL, @CustomerCategoryName = NULL;
GO

-- Reportes 3-5: los años salen de los resultados de usp_Reports_GetYears.
DECLARE @SalesYear int = (SELECT MIN(YEAR(InvoiceDate)) FROM [app].[Invoices]);
DECLARE @PurchaseYear int = (SELECT MIN(YEAR(OrderDate)) FROM [app].[PurchaseOrders]);
EXEC [app].[usp_Report_TopProductsByProfit] @Year = @SalesYear;
EXEC [app].[usp_Report_TopCustomersByInvoices] @YearFrom = @SalesYear, @YearTo = @SalesYear;
EXEC [app].[usp_Report_TopSuppliersByOrders] @YearFrom = @PurchaseYear, @YearTo = @PurchaseYear;
GO

-- Reporte 6: matriz de ventas por grupo y año.
EXEC [app].[usp_Report_SalesMatrixByStockGroup];
GO

-- Reportes 7-8: grupo = categoría del producto; StockItemID = subcategoría/producto.
DECLARE @SalesYear int = (SELECT MIN(YEAR(InvoiceDate)) FROM [app].[Invoices]);
DECLARE @PurchaseYear int = (SELECT MIN(YEAR(OrderDate)) FROM [app].[PurchaseOrders]);
EXEC [app].[usp_Report_MonthlySalesByCustomer]
    @Year = @SalesYear, @Month = NULL, @StockGroupID = NULL, @StockItemID = NULL;
EXEC [app].[usp_Report_MonthlyPurchasesBySupplier]
    @Year = @PurchaseYear, @Month = NULL, @StockGroupID = NULL, @StockItemID = NULL;
GO

-- Reportes 9-10.
DECLARE @InventoryYear int = (SELECT MIN(YEAR(TransactionOccurredWhen)) FROM [app].[StockItemTransactions]);
DECLARE @SalesYear int = (SELECT MIN(YEAR(InvoiceDate)) FROM [app].[Invoices]);
EXEC [app].[usp_Report_InventoryRotationDays]
    @Year = @InventoryYear, @StockGroupID = NULL, @SupplierID = NULL;
EXEC [app].[usp_Report_FavoriteDeliveryMethodByDestination]
    @Year = @SalesYear, @Month = NULL, @CustomerCategoryID = NULL,
    @StockGroupID = NULL, @StockItemID = NULL;
GO

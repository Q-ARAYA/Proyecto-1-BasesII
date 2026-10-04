/* Diez procedimientos de reportes. Todos los cálculos se ejecutan en SQL Server. */
USE [WideWorldImporters];
GO

CREATE OR ALTER PROCEDURE [app].[usp_Reports_GetYears]
    @Dataset nvarchar(20) = N'Ventas'
AS
BEGIN
    SET NOCOUNT ON;
    IF @Dataset = N'Ventas'
        SELECT DISTINCT YEAR(InvoiceDate) AS [Year]
        FROM [app].[Invoices] ORDER BY [Year];
    ELSE IF @Dataset = N'Compras'
        SELECT DISTINCT YEAR(OrderDate) AS [Year]
        FROM [app].[PurchaseOrders] ORDER BY [Year];
    ELSE IF @Dataset = N'Inventario'
        SELECT DISTINCT YEAR(TransactionOccurredWhen) AS [Year]
        FROM [app].[StockItemTransactions] ORDER BY [Year];
    ELSE
        THROW 51300, N'El conjunto debe ser Ventas, Compras o Inventario.', 1;
END;
GO

/* 1. Importe por proveedor y categoría con ROLLUP. Compras realizadas = cantidad recibida × precio por empaque. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_PurchaseAmountsBySupplier]
    @SupplierName nvarchar(100) = NULL,
    @SupplierCategoryName nvarchar(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @SupplierName = NULLIF(LTRIM(RTRIM(@SupplierName)), N'');
    SET @SupplierCategoryName = NULLIF(LTRIM(RTRIM(@SupplierCategoryName)), N'');

    ;WITH PurchaseTotals AS
    (
        SELECT po.PurchaseOrderID, po.SupplierID,
               CONVERT(decimal(18,2), SUM(CONVERT(decimal(28,4), pol.ReceivedOuters)
                   * COALESCE(pol.ExpectedUnitPricePerOuter, 0))) AS PurchaseAmount
        FROM [app].[PurchaseOrders] AS po
        INNER JOIN [app].[PurchaseOrderLines] AS pol ON pol.PurchaseOrderID = po.PurchaseOrderID
        GROUP BY po.PurchaseOrderID, po.SupplierID
    )
    SELECT CASE WHEN GROUPING(sc.SupplierCategoryName) = 1 THEN N'Total general'
                WHEN GROUPING(s.SupplierName) = 1 THEN N'Subtotal de categoría'
                ELSE N'Detalle' END AS [Level],
           sc.SupplierCategoryName, s.SupplierName,
           CONVERT(decimal(18,2), MAX(pt.PurchaseAmount)) AS HighestPurchase,
           CONVERT(decimal(18,2), MIN(pt.PurchaseAmount)) AS LowestPurchase,
           CONVERT(decimal(18,2), AVG(pt.PurchaseAmount)) AS AveragePurchase,
           COUNT_BIG(*) AS PurchaseOrderCount
    FROM PurchaseTotals AS pt
    INNER JOIN [app].[Suppliers] AS s ON s.SupplierID = pt.SupplierID
    INNER JOIN [app].[SupplierCategories] AS sc ON sc.SupplierCategoryID = s.SupplierCategoryID
    WHERE (@SupplierName IS NULL OR CHARINDEX(@SupplierName, s.SupplierName) > 0)
      AND (@SupplierCategoryName IS NULL OR CHARINDEX(@SupplierCategoryName, sc.SupplierCategoryName) > 0)
    GROUP BY ROLLUP (sc.SupplierCategoryName, s.SupplierName)
    ORDER BY GROUPING(sc.SupplierCategoryName), sc.SupplierCategoryName,
             GROUPING(s.SupplierName), s.SupplierName;
END;
GO

/* 2. Venta neta por cliente/categoría con notas de crédito como valores negativos. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_SalesAmountsByCustomer]
    @CustomerName nvarchar(100) = NULL,
    @CustomerCategoryName nvarchar(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET @CustomerName = NULLIF(LTRIM(RTRIM(@CustomerName)), N'');
    SET @CustomerCategoryName = NULLIF(LTRIM(RTRIM(@CustomerCategoryName)), N'');

    ;WITH InvoiceTotals AS
    (
        SELECT i.InvoiceID, i.CustomerID,
               CONVERT(decimal(18,2), SUM(COALESCE(il.ExtendedPrice, 0) + COALESCE(il.TaxAmount, 0))
                   * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END) AS NetAmount
        FROM [app].[Invoices] AS i
        LEFT JOIN [app].[InvoiceLines] AS il ON il.InvoiceID = i.InvoiceID
        GROUP BY i.InvoiceID, i.CustomerID, i.IsCreditNote
    )
    SELECT CASE WHEN GROUPING(cc.CustomerCategoryName) = 1 THEN N'Total general'
                WHEN GROUPING(c.CustomerName) = 1 THEN N'Subtotal de categoría'
                ELSE N'Detalle' END AS [Level],
           cc.CustomerCategoryName, c.CustomerName,
           CONVERT(decimal(18,2), MAX(it.NetAmount)) AS HighestSale,
           CONVERT(decimal(18,2), MIN(it.NetAmount)) AS LowestSale,
           CONVERT(decimal(18,2), AVG(it.NetAmount)) AS AverageSale,
           COUNT_BIG(*) AS InvoiceCount
    FROM InvoiceTotals AS it
    INNER JOIN [app].[Customers] AS c ON c.CustomerID = it.CustomerID
    INNER JOIN [app].[CustomerCategories] AS cc ON cc.CustomerCategoryID = c.CustomerCategoryID
    WHERE (@CustomerName IS NULL OR CHARINDEX(@CustomerName, c.CustomerName) > 0)
      AND (@CustomerCategoryName IS NULL OR CHARINDEX(@CustomerCategoryName, cc.CustomerCategoryName) > 0)
    GROUP BY ROLLUP (cc.CustomerCategoryName, c.CustomerName)
    ORDER BY GROUPING(cc.CustomerCategoryName), cc.CustomerCategoryName,
             GROUPING(c.CustomerName), c.CustomerName;
END;
GO

/* 3. Cinco productos con mayor ganancia neta por año; los empates se conservan. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_TopProductsByProfit]
    @Year int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Year IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [app].[Invoices] WHERE YEAR(InvoiceDate) = @Year)
        THROW 51303, N'El año solicitado no existe en las ventas.', 1;

    ;WITH ProductProfits AS
    (
        SELECT YEAR(i.InvoiceDate) AS [Year], si.StockItemID, si.StockItemName,
               CONVERT(decimal(18,2), SUM(il.LineProfit * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END)) AS NetProfit
        FROM [app].[Invoices] AS i
        INNER JOIN [app].[InvoiceLines] AS il ON il.InvoiceID = i.InvoiceID
        INNER JOIN [app].[StockItems] AS si ON si.StockItemID = il.StockItemID
        GROUP BY YEAR(i.InvoiceDate), si.StockItemID, si.StockItemName
    ), Ranked AS
    (
        SELECT *, DENSE_RANK() OVER (PARTITION BY [Year] ORDER BY NetProfit DESC) AS Position
        FROM ProductProfits
        WHERE @Year IS NULL OR [Year] = @Year
    )
    SELECT [Year], Position, StockItemID, StockItemName, NetProfit
    FROM Ranked WHERE Position <= 5
    ORDER BY [Year], Position, StockItemName;
END;
GO

/* 4. Cinco clientes por facturas por año, con el importe neto facturado. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_TopCustomersByInvoices]
    @YearFrom int = NULL,
    @YearTo int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @YearFrom IS NOT NULL AND @YearTo IS NOT NULL AND @YearFrom > @YearTo
        THROW 51304, N'El año inicial no puede superar el año final.', 1;
    IF @YearFrom IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [app].[Invoices] WHERE YEAR(InvoiceDate) = @YearFrom)
        THROW 51305, N'El año inicial no existe en las ventas.', 1;
    IF @YearTo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [app].[Invoices] WHERE YEAR(InvoiceDate) = @YearTo)
        THROW 51306, N'El año final no existe en las ventas.', 1;

    ;WITH InvoiceTotals AS
    (
        SELECT i.InvoiceID, i.CustomerID, YEAR(i.InvoiceDate) AS [Year],
               SUM(COALESCE(il.ExtendedPrice, 0) + COALESCE(il.TaxAmount, 0))
                   * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END AS NetAmount
        FROM [app].[Invoices] AS i
        LEFT JOIN [app].[InvoiceLines] AS il ON il.InvoiceID = i.InvoiceID
        WHERE (@YearFrom IS NULL OR YEAR(i.InvoiceDate) >= @YearFrom)
          AND (@YearTo IS NULL OR YEAR(i.InvoiceDate) <= @YearTo)
        GROUP BY i.InvoiceID, i.CustomerID, YEAR(i.InvoiceDate), i.IsCreditNote
    ), CustomerYear AS
    (
        SELECT it.[Year], c.CustomerID, c.CustomerName,
               COUNT_BIG(*) AS InvoiceCount,
               CONVERT(decimal(18,2), SUM(it.NetAmount)) AS NetInvoiced
        FROM InvoiceTotals AS it
        INNER JOIN [app].[Customers] AS c ON c.CustomerID = it.CustomerID
        GROUP BY it.[Year], c.CustomerID, c.CustomerName
    ), Ranked AS
    (
        SELECT *, DENSE_RANK() OVER (PARTITION BY [Year] ORDER BY InvoiceCount DESC) AS Position
        FROM CustomerYear
    )
    SELECT [Year], Position, CustomerID, CustomerName, InvoiceCount, NetInvoiced
    FROM Ranked WHERE Position <= 5
    ORDER BY [Year], Position, CustomerName;
END;
GO

/* 5. Cinco proveedores con más órdenes por año y valor ordenado. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_TopSuppliersByOrders]
    @YearFrom int = NULL,
    @YearTo int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @YearFrom IS NOT NULL AND @YearTo IS NOT NULL AND @YearFrom > @YearTo
        THROW 51307, N'El año inicial no puede superar el año final.', 1;
    IF @YearFrom IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [app].[PurchaseOrders] WHERE YEAR(OrderDate) = @YearFrom)
        THROW 51308, N'El año inicial no existe en las compras.', 1;
    IF @YearTo IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [app].[PurchaseOrders] WHERE YEAR(OrderDate) = @YearTo)
        THROW 51309, N'El año final no existe en las compras.', 1;

    ;WITH OrderAmounts AS
    (
        SELECT po.PurchaseOrderID, po.SupplierID, YEAR(po.OrderDate) AS [Year],
               SUM(CONVERT(decimal(28,4), pol.OrderedOuters) * COALESCE(pol.ExpectedUnitPricePerOuter, 0)) AS Amount
        FROM [app].[PurchaseOrders] AS po
        INNER JOIN [app].[PurchaseOrderLines] AS pol ON pol.PurchaseOrderID = po.PurchaseOrderID
        WHERE (@YearFrom IS NULL OR YEAR(po.OrderDate) >= @YearFrom)
          AND (@YearTo IS NULL OR YEAR(po.OrderDate) <= @YearTo)
        GROUP BY po.PurchaseOrderID, po.SupplierID, YEAR(po.OrderDate)
    ), SupplierYear AS
    (
        SELECT oa.[Year], s.SupplierID, s.SupplierName, COUNT_BIG(*) AS OrderCount,
               CONVERT(decimal(18,2), SUM(oa.Amount)) AS OrderedAmount
        FROM OrderAmounts AS oa
        INNER JOIN [app].[Suppliers] AS s ON s.SupplierID = oa.SupplierID
        GROUP BY oa.[Year], s.SupplierID, s.SupplierName
    ), Ranked AS
    (
        SELECT *, DENSE_RANK() OVER (PARTITION BY [Year] ORDER BY OrderCount DESC) AS Position
        FROM SupplierYear
    )
    SELECT [Year], Position, SupplierID, SupplierName, OrderCount, OrderedAmount
    FROM Ranked WHERE Position <= 5
    ORDER BY [Year], Position, SupplierName;
END;
GO

/* 6. Matriz de venta por grupo de producto y año de factura. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_SalesMatrixByStockGroup]
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Columns nvarchar(max);
    SELECT @Columns = STRING_AGG(CONVERT(nvarchar(max), QUOTENAME(CONVERT(nvarchar(4), Years.InvoiceYear))), N',')
                          WITHIN GROUP (ORDER BY Years.InvoiceYear)
    FROM (SELECT DISTINCT YEAR(InvoiceDate) AS InvoiceYear FROM [app].[Invoices]) AS Years;

    IF @Columns IS NULL
    BEGIN
        SELECT CAST(NULL AS nvarchar(100)) AS StockGroupName WHERE 1 = 0;
        RETURN;
    END;

    DECLARE @Sql nvarchar(max) = N'
        SELECT StockGroupName, ' + @Columns + N'
        FROM
        (
            SELECT sg.StockGroupName,
                   CONVERT(nvarchar(4), YEAR(i.InvoiceDate)) AS InvoiceYear,
                   CONVERT(decimal(18,2), (il.ExtendedPrice + il.TaxAmount)
                       * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END) AS NetSales
            FROM [app].[Invoices] AS i
            INNER JOIN [app].[InvoiceLines] AS il ON il.InvoiceID = i.InvoiceID
            INNER JOIN [app].[StockItemStockGroups] AS sisg ON sisg.StockItemID = il.StockItemID
            INNER JOIN [app].[StockGroups] AS sg ON sg.StockGroupID = sisg.StockGroupID
        ) AS SourceData
        PIVOT (SUM(NetSales) FOR InvoiceYear IN (' + @Columns + N')) AS SalesMatrix
        ORDER BY StockGroupName;';
    EXEC sys.sp_executesql @Sql;
END;
GO

/* 7. Resumen mensual de venta a clientes; grupo = categoría y producto = subcategoría. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_MonthlySalesByCustomer]
    @Year int = NULL,
    @Month int = NULL,
    @StockGroupID int = NULL,
    @StockItemID int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Month IS NOT NULL AND @Month NOT BETWEEN 1 AND 12
        THROW 51310, N'El mes debe estar entre 1 y 12.', 1;
    IF @Year IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [app].[Invoices] WHERE YEAR(InvoiceDate) = @Year)
        THROW 51311, N'El año solicitado no existe en las ventas.', 1;

    SELECT YEAR(i.InvoiceDate) AS [Year], MONTH(i.InvoiceDate) AS [Month],
           DATEFROMPARTS(YEAR(i.InvoiceDate), MONTH(i.InvoiceDate), 1) AS MonthStart,
           c.CustomerID, c.CustomerName,
           MIN(i.InvoiceDate) AS FirstInvoiceDate, MIN(i.InvoiceID) AS FirstInvoiceID,
           MAX(i.InvoiceDate) AS LastInvoiceDate, MAX(i.InvoiceID) AS LastInvoiceID,
           CONVERT(decimal(18,2), SUM((il.ExtendedPrice + il.TaxAmount)
               * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END)) AS NetSales,
           SUM(il.Quantity * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END) AS NetUnits,
           MIN(il.Quantity * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END) AS MinLineUnits,
           MAX(il.Quantity * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END) AS MaxLineUnits
    FROM [app].[Invoices] AS i
    INNER JOIN [app].[InvoiceLines] AS il ON il.InvoiceID = i.InvoiceID
    INNER JOIN [app].[Customers] AS c ON c.CustomerID = i.CustomerID
    WHERE (@Year IS NULL OR YEAR(i.InvoiceDate) = @Year)
      AND (@Month IS NULL OR MONTH(i.InvoiceDate) = @Month)
      AND (@StockItemID IS NULL OR il.StockItemID = @StockItemID)
      AND (@StockGroupID IS NULL OR EXISTS
          (SELECT 1 FROM [app].[StockItemStockGroups] AS x
           WHERE x.StockItemID = il.StockItemID AND x.StockGroupID = @StockGroupID))
    GROUP BY YEAR(i.InvoiceDate), MONTH(i.InvoiceDate), c.CustomerID, c.CustomerName
    ORDER BY [Year], [Month], c.CustomerName;
END;
GO

/* 8. Resumen mensual de compras recibidas a proveedores. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_MonthlyPurchasesBySupplier]
    @Year int = NULL,
    @Month int = NULL,
    @StockGroupID int = NULL,
    @StockItemID int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Month IS NOT NULL AND @Month NOT BETWEEN 1 AND 12
        THROW 51312, N'El mes debe estar entre 1 y 12.', 1;
    IF @Year IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [app].[PurchaseOrders] WHERE YEAR(OrderDate) = @Year)
        THROW 51313, N'El año solicitado no existe en las compras.', 1;

    SELECT YEAR(po.OrderDate) AS [Year], MONTH(po.OrderDate) AS [Month],
           DATEFROMPARTS(YEAR(po.OrderDate), MONTH(po.OrderDate), 1) AS MonthStart,
           s.SupplierID, s.SupplierName,
           MIN(po.OrderDate) AS FirstOrderDate, MIN(po.PurchaseOrderID) AS FirstPurchaseOrderID,
           MAX(po.PurchaseOrderID) AS LastPurchaseOrderID,
           MAX(COALESCE(pol.LastReceiptDate, po.OrderDate)) AS LastReceiptDate,
           CONVERT(decimal(18,2), SUM(CONVERT(decimal(28,4), pol.ReceivedOuters)
               * COALESCE(pol.ExpectedUnitPricePerOuter, 0))) AS ReceivedPurchaseAmount,
           SUM(pol.ReceivedOuters) AS ReceivedOuters,
           MIN(pol.ReceivedOuters) AS MinLineOuters,
           MAX(pol.ReceivedOuters) AS MaxLineOuters
    FROM [app].[PurchaseOrders] AS po
    INNER JOIN [app].[PurchaseOrderLines] AS pol ON pol.PurchaseOrderID = po.PurchaseOrderID
    INNER JOIN [app].[Suppliers] AS s ON s.SupplierID = po.SupplierID
    WHERE (@Year IS NULL OR YEAR(po.OrderDate) = @Year)
      AND (@Month IS NULL OR MONTH(po.OrderDate) = @Month)
      AND (@StockItemID IS NULL OR pol.StockItemID = @StockItemID)
      AND (@StockGroupID IS NULL OR EXISTS
          (SELECT 1 FROM [app].[StockItemStockGroups] AS x
           WHERE x.StockItemID = pol.StockItemID AND x.StockGroupID = @StockGroupID))
    GROUP BY YEAR(po.OrderDate), MONTH(po.OrderDate), s.SupplierID, s.SupplierName
    ORDER BY [Year], [Month], s.SupplierName;
END;
GO

/* 9. Días de inventario = inventario promedio ponderado por tiempo × días del año / unidades vendidas. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_InventoryRotationDays]
    @Year int,
    @StockGroupID int = NULL,
    @SupplierID int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Year IS NULL OR NOT EXISTS
       (SELECT 1 FROM [app].[StockItemTransactions] WHERE YEAR(TransactionOccurredWhen) = @Year)
        THROW 51314, N'El año solicitado no existe en los movimientos de inventario.', 1;

    DECLARE @Start datetime2(7) = DATETIME2FROMPARTS(@Year, 1, 1, 0, 0, 0, 0, 7);
    DECLARE @End datetime2(7) = DATETIME2FROMPARTS(@Year + 1, 1, 1, 0, 0, 0, 0, 7);
    DECLARE @SecondsInYear bigint = DATEDIFF_BIG(SECOND, @Start, @End);

    ;WITH ProductSet AS
    (
        SELECT si.StockItemID, si.StockItemName, si.SupplierID, s.SupplierName
        FROM [app].[StockItems] AS si
        INNER JOIN [app].[Suppliers] AS s ON s.SupplierID = si.SupplierID
        WHERE (@SupplierID IS NULL OR si.SupplierID = @SupplierID)
          AND (@StockGroupID IS NULL OR EXISTS
              (SELECT 1 FROM [app].[StockItemStockGroups] AS x
               WHERE x.StockItemID = si.StockItemID AND x.StockGroupID = @StockGroupID))
    ), Opening AS
    (
        /* Reconstruye existencias al inicio desde la foto actual menos movimientos posteriores. */
        SELECT p.StockItemID,
               COALESCE(h.QuantityOnHand, 0) - COALESCE(SUM(tx.Quantity), 0) AS OpeningQuantity
        FROM ProductSet AS p
        LEFT JOIN [app].[StockItemHoldings] AS h ON h.StockItemID = p.StockItemID
        LEFT JOIN [app].[StockItemTransactions] AS tx
            ON tx.StockItemID = p.StockItemID AND tx.TransactionOccurredWhen >= @Start
        GROUP BY p.StockItemID, h.QuantityOnHand
    ), Events AS
    (
        SELECT tx.StockItemID, tx.TransactionOccurredWhen AS EventAt,
               SUM(tx.Quantity) AS QuantityChange
        FROM [app].[StockItemTransactions] AS tx
        INNER JOIN ProductSet AS p ON p.StockItemID = tx.StockItemID
        WHERE tx.TransactionOccurredWhen >= @Start AND tx.TransactionOccurredWhen < @End
        GROUP BY tx.StockItemID, tx.TransactionOccurredWhen
    ), TimelineRaw AS
    (
        SELECT p.StockItemID, @Start AS EventAt, CONVERT(decimal(18,3), 0) AS QuantityChange
        FROM ProductSet AS p
        UNION ALL
        SELECT StockItemID, EventAt, QuantityChange FROM Events
        UNION ALL
        SELECT p.StockItemID, @End AS EventAt, CONVERT(decimal(18,3), 0) AS QuantityChange
        FROM ProductSet AS p
    ), Timeline AS
    (
        SELECT StockItemID, EventAt, SUM(QuantityChange) AS QuantityChange
        FROM TimelineRaw GROUP BY StockItemID, EventAt
    ), Balances AS
    (
        SELECT t.StockItemID, t.EventAt,
               COALESCE(o.OpeningQuantity, 0)
                 + SUM(t.QuantityChange) OVER (PARTITION BY t.StockItemID ORDER BY t.EventAt ROWS UNBOUNDED PRECEDING) AS QuantityOnHand
        FROM Timeline AS t
        LEFT JOIN Opening AS o ON o.StockItemID = t.StockItemID
    ), Segments AS
    (
        SELECT StockItemID, QuantityOnHand, EventAt,
               LEAD(EventAt) OVER (PARTITION BY StockItemID ORDER BY EventAt) AS NextEventAt
        FROM Balances
    ), AverageInventory AS
    (
        SELECT StockItemID,
               SUM(CONVERT(float, QuantityOnHand)
                   * DATEDIFF_BIG(SECOND, EventAt, NextEventAt)) / NULLIF(@SecondsInYear, 0) AS AverageQuantity
        FROM Segments
        WHERE NextEventAt IS NOT NULL
        GROUP BY StockItemID
    ), AnnualSales AS
    (
        SELECT il.StockItemID,
               SUM(CONVERT(decimal(18,3), il.Quantity)
                   * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END) AS SoldUnits
        FROM [app].[Invoices] AS i
        INNER JOIN [app].[InvoiceLines] AS il ON il.InvoiceID = i.InvoiceID
        WHERE i.InvoiceDate >= CONVERT(date, @Start) AND i.InvoiceDate < CONVERT(date, @End)
        GROUP BY il.StockItemID
    )
    SELECT @Year AS [Year], p.StockItemID, p.StockItemName, p.SupplierID, p.SupplierName,
           CONVERT(decimal(18,2), ai.AverageQuantity) AS AverageInventory,
           CONVERT(decimal(18,2), s.SoldUnits) AS NetUnitsSold,
           CONVERT(decimal(18,2), CASE WHEN ai.AverageQuantity > 0 AND s.SoldUnits > 0
               THEN ai.AverageQuantity * DATEDIFF(day, CONVERT(date, @Start), CONVERT(date, @End)) / s.SoldUnits
               ELSE NULL END) AS RotationDays
    FROM ProductSet AS p
    LEFT JOIN AverageInventory AS ai ON ai.StockItemID = p.StockItemID
    LEFT JOIN AnnualSales AS s ON s.StockItemID = p.StockItemID
    ORDER BY RotationDays DESC, p.StockItemName;
END;
GO

/* 10. Método de entrega favorito por ciudad de entrega del cliente. Cuenta facturas, no líneas. */
CREATE OR ALTER PROCEDURE [app].[usp_Report_FavoriteDeliveryMethodByDestination]
    @Year int = NULL,
    @Month int = NULL,
    @CustomerCategoryID int = NULL,
    @StockGroupID int = NULL,
    @StockItemID int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    IF @Month IS NOT NULL AND @Month NOT BETWEEN 1 AND 12
        THROW 51315, N'El mes debe estar entre 1 y 12.', 1;
    IF @Year IS NOT NULL AND NOT EXISTS (SELECT 1 FROM [app].[Invoices] WHERE YEAR(InvoiceDate) = @Year)
        THROW 51316, N'El año solicitado no existe en las ventas.', 1;

    ;WITH DeliveryCounts AS
    (
        SELECT city.CityID, city.CityName, dm.DeliveryMethodID, dm.DeliveryMethodName,
               COUNT_BIG(DISTINCT i.InvoiceID) AS SalesCount
        FROM [app].[Invoices] AS i
        INNER JOIN [app].[Customers] AS c ON c.CustomerID = i.CustomerID
        INNER JOIN [app].[Cities] AS city ON city.CityID = c.DeliveryCityID
        INNER JOIN [app].[DeliveryMethods] AS dm ON dm.DeliveryMethodID = i.DeliveryMethodID
        WHERE i.IsCreditNote = 0
          AND (@Year IS NULL OR YEAR(i.InvoiceDate) = @Year)
          AND (@Month IS NULL OR MONTH(i.InvoiceDate) = @Month)
          AND (@CustomerCategoryID IS NULL OR c.CustomerCategoryID = @CustomerCategoryID)
          AND (@StockItemID IS NULL OR EXISTS
              (SELECT 1 FROM [app].[InvoiceLines] AS il
               WHERE il.InvoiceID = i.InvoiceID AND il.StockItemID = @StockItemID
                 AND (@StockGroupID IS NULL OR EXISTS
                     (SELECT 1 FROM [app].[StockItemStockGroups] AS x
                      WHERE x.StockItemID = il.StockItemID AND x.StockGroupID = @StockGroupID))))
          AND (@StockItemID IS NOT NULL OR @StockGroupID IS NULL OR EXISTS
              (SELECT 1 FROM [app].[InvoiceLines] AS il
               INNER JOIN [app].[StockItemStockGroups] AS x ON x.StockItemID = il.StockItemID
               WHERE il.InvoiceID = i.InvoiceID AND x.StockGroupID = @StockGroupID))
        GROUP BY city.CityID, city.CityName, dm.DeliveryMethodID, dm.DeliveryMethodName
    ), Ranked AS
    (
        SELECT *, DENSE_RANK() OVER (PARTITION BY CityID ORDER BY SalesCount DESC) AS PreferencePosition
        FROM DeliveryCounts
    )
    SELECT CityID, CityName, PreferencePosition, DeliveryMethodID, DeliveryMethodName, SalesCount
    FROM Ranked
    WHERE PreferencePosition = 1
    ORDER BY CityName, PreferencePosition, DeliveryMethodName;
END;
GO

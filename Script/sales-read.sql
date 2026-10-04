/* Consultas del módulo de facturas/ventas. Las facturas son registros históricos. */
USE [WideWorldImporters];
GO

CREATE OR ALTER PROCEDURE [app].[usp_Invoices_List]
    @CustomerName nvarchar(100) = NULL,
    @InvoiceDateFrom date = NULL,
    @InvoiceDateTo date = NULL,
    @MinTotal decimal(18,2) = NULL,
    @MaxTotal decimal(18,2) = NULL,
    @PageNumber int = 1,
    @PageSize int = 25
AS
BEGIN
    SET NOCOUNT ON;
    SET @CustomerName = NULLIF(LTRIM(RTRIM(@CustomerName)), N'');
    IF @PageNumber IS NULL OR @PageSize IS NULL
       OR @PageNumber < 1 OR @PageSize < 1 OR @PageSize > 100
        THROW 51200, N'La página debe ser positiva y su tamaño debe estar entre 1 y 100.', 1;
    IF @InvoiceDateFrom IS NOT NULL AND @InvoiceDateTo IS NOT NULL
       AND @InvoiceDateFrom > @InvoiceDateTo
        THROW 51201, N'La fecha inicial no puede ser posterior a la fecha final.', 1;
    IF @MinTotal IS NOT NULL AND @MaxTotal IS NOT NULL AND @MinTotal > @MaxTotal
        THROW 51202, N'El monto mínimo no puede superar el máximo.', 1;

    ;WITH InvoiceAmounts AS
    (
        SELECT i.InvoiceID, i.CustomerID, i.InvoiceDate, i.DeliveryMethodID,
               i.IsCreditNote, c.CustomerName, dm.DeliveryMethodName,
               SUM(COALESCE(il.ExtendedPrice, 0) + COALESCE(il.TaxAmount, 0)) AS GrossTotal
        FROM [app].[Invoices] AS i
        INNER JOIN [app].[Customers] AS c ON c.CustomerID = i.CustomerID
        LEFT JOIN [app].[DeliveryMethods] AS dm ON dm.DeliveryMethodID = i.DeliveryMethodID
        LEFT JOIN [app].[InvoiceLines] AS il ON il.InvoiceID = i.InvoiceID
        GROUP BY i.InvoiceID, i.CustomerID, i.InvoiceDate, i.DeliveryMethodID,
                 i.IsCreditNote, c.CustomerName, dm.DeliveryMethodName
    )
    ,FilteredInvoices AS
    (
    SELECT InvoiceID, CustomerID, CustomerName, InvoiceDate, DeliveryMethodID,
           DeliveryMethodName, IsCreditNote,
           CONVERT(decimal(18,2), CASE WHEN IsCreditNote = 1 THEN -GrossTotal ELSE GrossTotal END) AS Total
    FROM InvoiceAmounts
    WHERE (@CustomerName IS NULL OR CHARINDEX(@CustomerName, CustomerName) > 0)
      AND (@InvoiceDateFrom IS NULL OR InvoiceDate >= @InvoiceDateFrom)
      AND (@InvoiceDateTo IS NULL OR InvoiceDate <= @InvoiceDateTo)
      AND (@MinTotal IS NULL OR CASE WHEN IsCreditNote = 1 THEN -GrossTotal ELSE GrossTotal END >= @MinTotal)
      AND (@MaxTotal IS NULL OR CASE WHEN IsCreditNote = 1 THEN -GrossTotal ELSE GrossTotal END <= @MaxTotal)
    )
    SELECT *, COUNT_BIG(*) OVER () AS TotalRows
    FROM FilteredInvoices
    ORDER BY CustomerName, InvoiceDate DESC, InvoiceID DESC
    OFFSET (CONVERT(bigint, @PageNumber - 1) * @PageSize) ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_Invoices_GetById]
    @InvoiceID int
AS
BEGIN
    SET NOCOUNT ON;
    SELECT i.InvoiceID, i.CustomerID, c.CustomerName,
           i.BillToCustomerID, billTo.CustomerName AS BillToCustomerName,
           i.DeliveryMethodID, dm.DeliveryMethodName, i.OrderID,
           i.CustomerPurchaseOrderNumber, i.ContactPersonID,
           contact.FullName AS ContactPersonName, i.SalespersonPersonID,
           salesperson.FullName AS SalespersonName, i.InvoiceDate,
           i.IsCreditNote, i.DeliveryInstructions, i.Comments,
           CONVERT(decimal(18,2), SUM(COALESCE(il.ExtendedPrice, 0) + COALESCE(il.TaxAmount, 0))) AS GrossTotal,
           CONVERT(decimal(18,2), SUM(COALESCE(il.ExtendedPrice, 0) + COALESCE(il.TaxAmount, 0))
               * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END) AS NetTotal
    FROM [app].[Invoices] AS i
    INNER JOIN [app].[Customers] AS c ON c.CustomerID = i.CustomerID
    LEFT JOIN [app].[Customers] AS billTo ON billTo.CustomerID = i.BillToCustomerID
    LEFT JOIN [app].[DeliveryMethods] AS dm ON dm.DeliveryMethodID = i.DeliveryMethodID
    LEFT JOIN [app].[People] AS contact ON contact.PersonID = i.ContactPersonID
    LEFT JOIN [app].[People] AS salesperson ON salesperson.PersonID = i.SalespersonPersonID
    LEFT JOIN [app].[InvoiceLines] AS il ON il.InvoiceID = i.InvoiceID
    WHERE i.InvoiceID = @InvoiceID
    GROUP BY i.InvoiceID, i.CustomerID, c.CustomerName, i.BillToCustomerID,
             billTo.CustomerName, i.DeliveryMethodID, dm.DeliveryMethodName,
             i.OrderID, i.CustomerPurchaseOrderNumber, i.ContactPersonID,
             contact.FullName, i.SalespersonPersonID, salesperson.FullName,
             i.InvoiceDate, i.IsCreditNote, i.DeliveryInstructions, i.Comments;

    SELECT il.InvoiceLineID, il.StockItemID, si.StockItemName,
           il.Description, il.Quantity, il.UnitPrice, il.TaxRate, il.TaxAmount,
           CONVERT(decimal(18,2), il.ExtendedPrice) AS ExtendedPrice,
           CONVERT(decimal(18,2), il.ExtendedPrice + il.TaxAmount) AS GrossLineTotal,
           CONVERT(decimal(18,2), (il.ExtendedPrice + il.TaxAmount)
               * CASE WHEN i.IsCreditNote = 1 THEN -1 ELSE 1 END) AS NetLineTotal
    FROM [app].[InvoiceLines] AS il
    INNER JOIN [app].[Invoices] AS i ON i.InvoiceID = il.InvoiceID
    INNER JOIN [app].[StockItems] AS si ON si.StockItemID = il.StockItemID
    WHERE il.InvoiceID = @InvoiceID
    ORDER BY il.InvoiceLineID;
END;
GO

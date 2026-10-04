/* Consultas del módulo de inventario/productos. */
USE [WideWorldImporters];
GO

CREATE OR ALTER PROCEDURE [app].[usp_StockItems_List]
    @StockItemName nvarchar(100) = NULL,
    @StockGroupID int = NULL,
    @MinQuantityOnHand int = NULL,
    @MaxQuantityOnHand int = NULL,
    @PageNumber int = 1,
    @PageSize int = 25
AS
BEGIN
    SET NOCOUNT ON;
    SET @StockItemName = NULLIF(LTRIM(RTRIM(@StockItemName)), N'');
    IF @PageNumber IS NULL OR @PageSize IS NULL
       OR @PageNumber < 1 OR @PageSize < 1 OR @PageSize > 100
        THROW 51100, N'La página debe ser positiva y su tamaño debe estar entre 1 y 100.', 1;
    IF @MinQuantityOnHand IS NOT NULL AND @MinQuantityOnHand < 0
        THROW 51101, N'La existencia mínima no puede ser negativa.', 1;
    IF @MaxQuantityOnHand IS NOT NULL AND @MaxQuantityOnHand < 0
        THROW 51102, N'La existencia máxima no puede ser negativa.', 1;
    IF @MinQuantityOnHand IS NOT NULL AND @MaxQuantityOnHand IS NOT NULL
       AND @MinQuantityOnHand > @MaxQuantityOnHand
        THROW 51103, N'La existencia mínima no puede superar la máxima.', 1;

    ;WITH FilteredStockItems AS
    (
    SELECT si.StockItemID, si.StockItemName, si.SupplierID, s.SupplierName,
           h.QuantityOnHand,
           groups.StockGroups
    FROM [app].[StockItems] AS si
    INNER JOIN [app].[Suppliers] AS s ON s.SupplierID = si.SupplierID
    LEFT JOIN [app].[StockItemHoldings] AS h ON h.StockItemID = si.StockItemID
    OUTER APPLY
    (
        SELECT STRING_AGG(CONVERT(nvarchar(max), sg.StockGroupName), N', ')
                   WITHIN GROUP (ORDER BY sg.StockGroupName) AS StockGroups
        FROM [app].[StockItemStockGroups] AS sisg
        INNER JOIN [app].[StockGroups] AS sg ON sg.StockGroupID = sisg.StockGroupID
        WHERE sisg.StockItemID = si.StockItemID
    ) AS groups
    WHERE (@StockItemName IS NULL OR CHARINDEX(@StockItemName, si.StockItemName) > 0)
      AND (@StockGroupID IS NULL OR EXISTS
          (SELECT 1 FROM [app].[StockItemStockGroups] AS f
           WHERE f.StockItemID = si.StockItemID AND f.StockGroupID = @StockGroupID))
      AND (@MinQuantityOnHand IS NULL OR h.QuantityOnHand >= @MinQuantityOnHand)
      AND (@MaxQuantityOnHand IS NULL OR h.QuantityOnHand <= @MaxQuantityOnHand)
    )
    SELECT *, COUNT_BIG(*) OVER () AS TotalRows
    FROM FilteredStockItems
    ORDER BY StockItemName, StockItemID
    OFFSET (CONVERT(bigint, @PageNumber - 1) * @PageSize) ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_StockItems_GetById]
    @StockItemID int
AS
BEGIN
    SET NOCOUNT ON;
    SELECT si.StockItemID, si.StockItemName, si.SupplierID, s.SupplierName,
           si.ColorID, c.ColorName,
           si.UnitPackageID, up.PackageTypeName AS UnitPackageName,
           si.OuterPackageID, op.PackageTypeName AS OuterPackageName,
           si.Brand, si.Size, si.LeadTimeDays, si.QuantityPerOuter,
           si.IsChillerStock, si.Barcode, si.TaxRate, si.UnitPrice,
           si.RecommendedRetailPrice, si.TypicalWeightPerUnit, si.Tags,
           si.SearchDetails, h.QuantityOnHand, h.BinLocation,
           groups.StockGroups
    FROM [app].[StockItems] AS si
    INNER JOIN [app].[Suppliers] AS s ON s.SupplierID = si.SupplierID
    LEFT JOIN [app].[Colors] AS c ON c.ColorID = si.ColorID
    LEFT JOIN [app].[PackageTypes] AS up ON up.PackageTypeID = si.UnitPackageID
    LEFT JOIN [app].[PackageTypes] AS op ON op.PackageTypeID = si.OuterPackageID
    LEFT JOIN [app].[StockItemHoldings] AS h ON h.StockItemID = si.StockItemID
    OUTER APPLY
    (
        SELECT STRING_AGG(CONVERT(nvarchar(max), sg.StockGroupName), N', ')
                   WITHIN GROUP (ORDER BY sg.StockGroupName) AS StockGroups
        FROM [app].[StockItemStockGroups] AS sisg
        INNER JOIN [app].[StockGroups] AS sg ON sg.StockGroupID = sisg.StockGroupID
        WHERE sisg.StockItemID = si.StockItemID
    ) AS groups
    WHERE si.StockItemID = @StockItemID;
END;
GO

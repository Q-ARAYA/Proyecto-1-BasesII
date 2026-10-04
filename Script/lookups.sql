/* Catálogos de selección usados por los formularios y filtros de la interfaz. */
USE [WideWorldImporters];
GO

CREATE OR ALTER PROCEDURE [app].[usp_Lookups_CustomerCategories]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CustomerCategoryID, CustomerCategoryName
    FROM [app].[CustomerCategories]
    ORDER BY CustomerCategoryName, CustomerCategoryID;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_Lookups_SupplierCategories]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT SupplierCategoryID, SupplierCategoryName
    FROM [app].[SupplierCategories]
    ORDER BY SupplierCategoryName, SupplierCategoryID;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_Lookups_DeliveryMethods]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT DeliveryMethodID, DeliveryMethodName
    FROM [app].[DeliveryMethods]
    ORDER BY DeliveryMethodName, DeliveryMethodID;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_Lookups_StockGroups]
AS
BEGIN
    SET NOCOUNT ON;
    SELECT StockGroupID, StockGroupName
    FROM [app].[StockGroups]
    ORDER BY StockGroupName, StockGroupID;
END;
GO

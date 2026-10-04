USE [WideWorldImporters];
GO

SELECT DB_NAME() AS BaseActual,
       OBJECT_ID(N'app.usp_StockItems_List', N'P') AS Procedimiento;

GO

EXEC [app].[usp_StockItems_List]
    @MaxQuantityOnHand = 25;
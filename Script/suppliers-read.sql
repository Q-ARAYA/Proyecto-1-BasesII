/* Consultas del módulo de proveedores. Ejecutar después de synonyms.sql. */
USE [WideWorldImporters];
GO

CREATE OR ALTER PROCEDURE [app].[usp_Suppliers_List]
    @SupplierName nvarchar(100) = NULL,
    @SupplierCategoryID int = NULL,
    @DeliveryMethodID int = NULL,
    @PageNumber int = 1,
    @PageSize int = 25
AS
BEGIN
    SET NOCOUNT ON;
    SET @SupplierName = NULLIF(LTRIM(RTRIM(@SupplierName)), N'');
    IF @PageNumber IS NULL OR @PageSize IS NULL
       OR @PageNumber < 1 OR @PageSize < 1 OR @PageSize > 100
        THROW 51104, N'La página debe ser positiva y su tamaño debe estar entre 1 y 100.', 1;

    ;WITH FilteredSuppliers AS
    (
    SELECT s.SupplierID, s.SupplierReference, s.SupplierName,
           sc.SupplierCategoryID, sc.SupplierCategoryName,
           s.DeliveryMethodID, dm.DeliveryMethodName
    FROM [app].[Suppliers] AS s
    INNER JOIN [app].[SupplierCategories] AS sc
        ON sc.SupplierCategoryID = s.SupplierCategoryID
    LEFT JOIN [app].[DeliveryMethods] AS dm
        ON dm.DeliveryMethodID = s.DeliveryMethodID
    WHERE (@SupplierName IS NULL OR CHARINDEX(@SupplierName, s.SupplierName) > 0)
      AND (@SupplierCategoryID IS NULL OR s.SupplierCategoryID = @SupplierCategoryID)
      AND (@DeliveryMethodID IS NULL OR s.DeliveryMethodID = @DeliveryMethodID)
    )
    SELECT *, COUNT_BIG(*) OVER () AS TotalRows
    FROM FilteredSuppliers
    ORDER BY SupplierName, SupplierID
    OFFSET (CONVERT(bigint, @PageNumber - 1) * @PageSize) ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_Suppliers_GetById]
    @SupplierID int
AS
BEGIN
    SET NOCOUNT ON;
    SELECT s.SupplierID, s.SupplierReference, s.SupplierName,
           s.SupplierCategoryID, sc.SupplierCategoryName,
           s.PrimaryContactPersonID, p.FullName AS PrimaryContactName,
           p.PhoneNumber AS PrimaryContactPhone, p.EmailAddress AS PrimaryContactEmail,
           s.AlternateContactPersonID, ap.FullName AS AlternateContactName,
           ap.PhoneNumber AS AlternateContactPhone, ap.EmailAddress AS AlternateContactEmail,
           s.DeliveryMethodID, dm.DeliveryMethodName,
           s.DeliveryCityID, dc.CityName AS DeliveryCityName,
           s.PostalCityID, pc.CityName AS PostalCityName,
           s.DeliveryPostalCode, s.PostalPostalCode,
           s.PhoneNumber, s.FaxNumber, s.WebsiteURL, s.PaymentDays,
           s.BankAccountName, s.BankAccountBranch, s.BankAccountCode,
           s.BankAccountNumber, s.BankInternationalCode,
           s.DeliveryAddressLine1, s.DeliveryAddressLine2,
           s.PostalAddressLine1, s.PostalAddressLine2,
           CONVERT(decimal(9,6), s.DeliveryLocation.Lat) AS DeliveryLatitude,
           CONVERT(decimal(9,6), s.DeliveryLocation.Long) AS DeliveryLongitude
    FROM [app].[Suppliers] AS s
    INNER JOIN [app].[SupplierCategories] AS sc
        ON sc.SupplierCategoryID = s.SupplierCategoryID
    LEFT JOIN [app].[People] AS p ON p.PersonID = s.PrimaryContactPersonID
    LEFT JOIN [app].[People] AS ap ON ap.PersonID = s.AlternateContactPersonID
    LEFT JOIN [app].[DeliveryMethods] AS dm ON dm.DeliveryMethodID = s.DeliveryMethodID
    LEFT JOIN [app].[Cities] AS dc ON dc.CityID = s.DeliveryCityID
    LEFT JOIN [app].[Cities] AS pc ON pc.CityID = s.PostalCityID
    WHERE s.SupplierID = @SupplierID;
END;
GO

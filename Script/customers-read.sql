/*
    Consultas de lectura del módulo de clientes
    Ejecutar después de synonyms.sql.
*/
USE [WideWorldImporters];
GO

CREATE OR ALTER PROCEDURE [app].[usp_Customers_List]
    @CustomerName nvarchar(100) = NULL,
    @CustomerCategoryID int = NULL,
    @DeliveryMethodID int = NULL,
    @PageNumber int = 1,
    @PageSize int = 25
AS
BEGIN
    SET NOCOUNT ON;

    SET @CustomerName = NULLIF(LTRIM(RTRIM(@CustomerName)), N'');
    IF @PageNumber IS NULL OR @PageSize IS NULL
       OR @PageNumber < 1 OR @PageSize < 1 OR @PageSize > 100
        THROW 51001, N'La página debe ser positiva y su tamaño debe estar entre 1 y 100.', 1;

    ;WITH FilteredCustomers AS
    (
    SELECT
        c.CustomerID,
        c.CustomerName,
        cc.CustomerCategoryID,
        cc.CustomerCategoryName,
        c.DeliveryMethodID,
        dm.DeliveryMethodName
    FROM [app].[Customers] AS c
    INNER JOIN [app].[CustomerCategories] AS cc
        ON cc.CustomerCategoryID = c.CustomerCategoryID
    LEFT JOIN [app].[DeliveryMethods] AS dm
        ON dm.DeliveryMethodID = c.DeliveryMethodID
    WHERE
        (@CustomerName IS NULL OR CHARINDEX(@CustomerName, c.CustomerName) > 0)
        AND (@CustomerCategoryID IS NULL OR c.CustomerCategoryID = @CustomerCategoryID)
        AND (@DeliveryMethodID IS NULL OR c.DeliveryMethodID = @DeliveryMethodID)
    )
    SELECT *, COUNT_BIG(*) OVER () AS TotalRows
    FROM FilteredCustomers
    ORDER BY CustomerName ASC, CustomerID ASC
    OFFSET (CONVERT(bigint, @PageNumber - 1) * @PageSize) ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_Customers_GetById]
    @CustomerID int
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CustomerID,
        c.CustomerName,
        c.CustomerCategoryID,
        cc.CustomerCategoryName,
        c.BuyingGroupID,
        bg.BuyingGroupName,
        c.BillToCustomerID,
        billTo.CustomerName AS BillToCustomerName,
        c.PrimaryContactPersonID,
        primaryContact.FullName AS PrimaryContactName,
        primaryContact.PhoneNumber AS PrimaryContactPhone,
        primaryContact.EmailAddress AS PrimaryContactEmail,
        c.AlternateContactPersonID,
        alternateContact.FullName AS AlternateContactName,
        alternateContact.PhoneNumber AS AlternateContactPhone,
        alternateContact.EmailAddress AS AlternateContactEmail,
        c.DeliveryMethodID,
        dm.DeliveryMethodName,
        c.CreditLimit,
        c.AccountOpenedDate,
        c.StandardDiscountPercentage,
        c.IsStatementSent,
        c.IsOnCreditHold,
        c.DeliveryRun,
        c.RunPosition,
        c.DeliveryCityID,
        deliveryCity.CityName AS DeliveryCityName,
        c.PostalCityID,
        postalCity.CityName AS PostalCityName,
        c.PhoneNumber,
        c.FaxNumber,
        c.PaymentDays,
        c.WebsiteURL,
        c.DeliveryAddressLine1,
        c.DeliveryAddressLine2,
        c.DeliveryPostalCode,
        c.PostalAddressLine1,
        c.PostalAddressLine2,
        c.PostalPostalCode,
        CONVERT(decimal(9, 6), c.DeliveryLocation.Lat) AS DeliveryLatitude,
        CONVERT(decimal(9, 6), c.DeliveryLocation.Long) AS DeliveryLongitude
    FROM [app].[Customers] AS c
    INNER JOIN [app].[CustomerCategories] AS cc
        ON cc.CustomerCategoryID = c.CustomerCategoryID
    LEFT JOIN [app].[BuyingGroups] AS bg
        ON bg.BuyingGroupID = c.BuyingGroupID
    LEFT JOIN [app].[Customers] AS billTo
        ON billTo.CustomerID = c.BillToCustomerID
    LEFT JOIN [app].[People] AS primaryContact
        ON primaryContact.PersonID = c.PrimaryContactPersonID
    LEFT JOIN [app].[People] AS alternateContact
        ON alternateContact.PersonID = c.AlternateContactPersonID
    LEFT JOIN [app].[DeliveryMethods] AS dm
        ON dm.DeliveryMethodID = c.DeliveryMethodID
    LEFT JOIN [app].[Cities] AS deliveryCity
        ON deliveryCity.CityID = c.DeliveryCityID
    LEFT JOIN [app].[Cities] AS postalCity
        ON postalCity.CityID = c.PostalCityID
    WHERE c.CustomerID = @CustomerID;
END;
GO

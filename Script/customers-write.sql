/*
    Operaciones de escritura del módulo de clientes
    Requiere synonyms.sql.
    Las operaciones de alta, actualización y eliminación son transaccionales.
*/
USE [WideWorldImporters];
GO

CREATE OR ALTER PROCEDURE [app].[usp_Customers_Create]
    @CustomerName nvarchar(100),
    @CustomerCategoryID int,
    @PrimaryContactPersonID int,
    @DeliveryMethodID int,
    @DeliveryCityID int,
    @PostalCityID int,
    @PaymentDays int,
    @PhoneNumber nvarchar(20),
    @FaxNumber nvarchar(20),
    @WebsiteURL nvarchar(256),
    @DeliveryAddressLine1 nvarchar(60),
    @DeliveryPostalCode nvarchar(10),
    @PostalAddressLine1 nvarchar(60),
    @PostalPostalCode nvarchar(10),
    @BillToCustomerID int = NULL,
    @BuyingGroupID int = NULL,
    @AlternateContactPersonID int = NULL,
    @CreditLimit decimal(18, 2) = NULL,
    @AccountOpenedDate date = NULL,
    @StandardDiscountPercentage decimal(18, 3) = 0,
    @IsStatementSent bit = 0,
    @IsOnCreditHold bit = 0,
    @DeliveryRun nvarchar(10) = NULL,
    @RunPosition nvarchar(10) = NULL,
    @DeliveryAddressLine2 nvarchar(60) = NULL,
    @DeliveryLatitude float = NULL,
    @DeliveryLongitude float = NULL,
    @PostalAddressLine2 nvarchar(60) = NULL,
    @LastEditedBy int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NULLIF(LTRIM(RTRIM(@CustomerName)), N'') IS NULL
        THROW 51010, N'El nombre del cliente es obligatorio.', 1;

    IF @PaymentDays < 0
        THROW 51011, N'Los días de pago no pueden ser negativos.', 1;

    IF @CreditLimit < 0
        THROW 51012, N'El límite de crédito no puede ser negativo.', 1;

    IF @StandardDiscountPercentage < 0 OR @StandardDiscountPercentage > 100
        THROW 51013, N'El descuento debe estar entre 0 y 100.', 1;

    IF (@DeliveryLatitude IS NULL AND @DeliveryLongitude IS NOT NULL)
       OR (@DeliveryLatitude IS NOT NULL AND @DeliveryLongitude IS NULL)
        THROW 51014, N'La latitud y longitud deben enviarse juntas.', 1;

    IF @DeliveryLatitude IS NOT NULL
       AND (@DeliveryLatitude < -90 OR @DeliveryLatitude > 90
            OR @DeliveryLongitude < -180 OR @DeliveryLongitude > 180)
        THROW 51015, N'Las coordenadas de entrega están fuera de rango.', 1;

    IF @LastEditedBy IS NULL
    BEGIN
        -- Fallback para el proyecto local mientras no exista autenticación de usuarios.
        SELECT TOP (1) @LastEditedBy = PersonID
        FROM [app].[People]
        WHERE IsEmployee = 1
        ORDER BY PersonID;
    END;

    IF @LastEditedBy IS NULL
        THROW 51016, N'No hay una persona válida para registrar LastEditedBy.', 1;

    DECLARE @CustomerID int;
    DECLARE @DeliveryLocation geography = NULL;

    IF @DeliveryLatitude IS NOT NULL
        SET @DeliveryLocation = geography::Point(@DeliveryLatitude, @DeliveryLongitude, 4326);

    BEGIN TRY
        BEGIN TRANSACTION;

        SET @CustomerID = NEXT VALUE FOR [Sequences].[CustomerID];

        INSERT INTO [app].[Customers]
        (
            CustomerID, CustomerName, BillToCustomerID, CustomerCategoryID,
            BuyingGroupID, PrimaryContactPersonID, AlternateContactPersonID,
            DeliveryMethodID, DeliveryCityID, PostalCityID, CreditLimit,
            AccountOpenedDate, StandardDiscountPercentage, IsStatementSent,
            IsOnCreditHold, PaymentDays, PhoneNumber, FaxNumber, DeliveryRun,
            RunPosition, WebsiteURL, DeliveryAddressLine1, DeliveryAddressLine2,
            DeliveryPostalCode, DeliveryLocation, PostalAddressLine1,
            PostalAddressLine2, PostalPostalCode, LastEditedBy
        )
        VALUES
        (
            @CustomerID, LTRIM(RTRIM(@CustomerName)),
            COALESCE(@BillToCustomerID, @CustomerID), @CustomerCategoryID,
            @BuyingGroupID, @PrimaryContactPersonID, @AlternateContactPersonID,
            @DeliveryMethodID, @DeliveryCityID, @PostalCityID, @CreditLimit,
            COALESCE(@AccountOpenedDate, CONVERT(date, SYSDATETIME())),
            @StandardDiscountPercentage, @IsStatementSent, @IsOnCreditHold,
            @PaymentDays, @PhoneNumber, @FaxNumber, @DeliveryRun, @RunPosition,
            @WebsiteURL, @DeliveryAddressLine1, @DeliveryAddressLine2,
            @DeliveryPostalCode, @DeliveryLocation, @PostalAddressLine1,
            @PostalAddressLine2, @PostalPostalCode, @LastEditedBy
        );

        COMMIT TRANSACTION;

        SELECT @CustomerID AS CustomerID;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_Customers_Update]
    @CustomerID int,
    @CustomerName nvarchar(100),
    @CustomerCategoryID int,
    @PrimaryContactPersonID int,
    @DeliveryMethodID int,
    @DeliveryCityID int,
    @PostalCityID int,
    @PaymentDays int,
    @PhoneNumber nvarchar(20),
    @FaxNumber nvarchar(20),
    @WebsiteURL nvarchar(256),
    @DeliveryAddressLine1 nvarchar(60),
    @DeliveryPostalCode nvarchar(10),
    @PostalAddressLine1 nvarchar(60),
    @PostalPostalCode nvarchar(10),
    @BillToCustomerID int,
    @BuyingGroupID int = NULL,
    @AlternateContactPersonID int = NULL,
    @CreditLimit decimal(18, 2) = NULL,
    @AccountOpenedDate date,
    @StandardDiscountPercentage decimal(18, 3),
    @IsStatementSent bit,
    @IsOnCreditHold bit,
    @DeliveryRun nvarchar(10) = NULL,
    @RunPosition nvarchar(10) = NULL,
    @DeliveryAddressLine2 nvarchar(60) = NULL,
    @DeliveryLatitude float = NULL,
    @DeliveryLongitude float = NULL,
    @PostalAddressLine2 nvarchar(60) = NULL,
    @LastEditedBy int = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @CustomerID IS NULL OR @CustomerID <= 0
        THROW 51020, N'El identificador del cliente no es válido.', 1;

    IF NULLIF(LTRIM(RTRIM(@CustomerName)), N'') IS NULL
        THROW 51021, N'El nombre del cliente es obligatorio.', 1;

    IF @PaymentDays < 0
        THROW 51022, N'Los días de pago no pueden ser negativos.', 1;

    IF @CreditLimit < 0
        THROW 51023, N'El límite de crédito no puede ser negativo.', 1;

    IF @StandardDiscountPercentage < 0 OR @StandardDiscountPercentage > 100
        THROW 51024, N'El descuento debe estar entre 0 y 100.', 1;

    IF (@DeliveryLatitude IS NULL AND @DeliveryLongitude IS NOT NULL)
       OR (@DeliveryLatitude IS NOT NULL AND @DeliveryLongitude IS NULL)
        THROW 51025, N'La latitud y longitud deben enviarse juntas.', 1;

    IF @DeliveryLatitude IS NOT NULL
       AND (@DeliveryLatitude < -90 OR @DeliveryLatitude > 90
            OR @DeliveryLongitude < -180 OR @DeliveryLongitude > 180)
        THROW 51026, N'Las coordenadas de entrega están fuera de rango.', 1;

    IF @LastEditedBy IS NULL
    BEGIN
        -- Fallback para el proyecto local mientras no exista autenticación de usuarios.
        SELECT TOP (1) @LastEditedBy = PersonID
        FROM [app].[People]
        WHERE IsEmployee = 1
        ORDER BY PersonID;
    END;

    IF @LastEditedBy IS NULL
        THROW 51027, N'No hay una persona válida para registrar LastEditedBy.', 1;

    DECLARE @DeliveryLocation geography = NULL;

    IF @DeliveryLatitude IS NOT NULL
        SET @DeliveryLocation = geography::Point(@DeliveryLatitude, @DeliveryLongitude, 4326);

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE [app].[Customers]
        SET
            CustomerName = LTRIM(RTRIM(@CustomerName)),
            BillToCustomerID = @BillToCustomerID,
            CustomerCategoryID = @CustomerCategoryID,
            BuyingGroupID = @BuyingGroupID,
            PrimaryContactPersonID = @PrimaryContactPersonID,
            AlternateContactPersonID = @AlternateContactPersonID,
            DeliveryMethodID = @DeliveryMethodID,
            DeliveryCityID = @DeliveryCityID,
            PostalCityID = @PostalCityID,
            CreditLimit = @CreditLimit,
            AccountOpenedDate = @AccountOpenedDate,
            StandardDiscountPercentage = @StandardDiscountPercentage,
            IsStatementSent = @IsStatementSent,
            IsOnCreditHold = @IsOnCreditHold,
            PaymentDays = @PaymentDays,
            PhoneNumber = @PhoneNumber,
            FaxNumber = @FaxNumber,
            DeliveryRun = @DeliveryRun,
            RunPosition = @RunPosition,
            WebsiteURL = @WebsiteURL,
            DeliveryAddressLine1 = @DeliveryAddressLine1,
            DeliveryAddressLine2 = @DeliveryAddressLine2,
            DeliveryPostalCode = @DeliveryPostalCode,
            DeliveryLocation = @DeliveryLocation,
            PostalAddressLine1 = @PostalAddressLine1,
            PostalAddressLine2 = @PostalAddressLine2,
            PostalPostalCode = @PostalPostalCode,
            LastEditedBy = @LastEditedBy
        WHERE CustomerID = @CustomerID;

        IF @@ROWCOUNT = 0
            THROW 51028, N'No existe un cliente con ese identificador.', 1;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END;
GO

CREATE OR ALTER PROCEDURE [app].[usp_Customers_Delete]
    @CustomerID int
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @CustomerID IS NULL OR @CustomerID <= 0
        THROW 51030, N'El identificador del cliente no es válido.', 1;

    BEGIN TRY
        BEGIN TRANSACTION;

        DELETE FROM [app].[Customers]
        WHERE CustomerID = @CustomerID;

        IF @@ROWCOUNT = 0
            THROW 51031, N'No existe un cliente con ese identificador.', 1;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorNumber int = ERROR_NUMBER();

        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        IF @ErrorNumber = 547
            THROW 51032, N'No se puede eliminar este cliente porque tiene registros relacionados.', 1;

        THROW;
    END CATCH;
END;
GO

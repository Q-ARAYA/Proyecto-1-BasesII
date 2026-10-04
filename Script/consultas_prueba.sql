SELECT PersonID, FullName
FROM Application.People
WHERE PersonID = 8;

SELECT CityID, CityName
FROM Application.Cities
WHERE CityID = 70101;

SELECT CustomerCategoryID, CustomerCategoryName
FROM Sales.CustomerCategories
WHERE CustomerCategoryName = N'Agent';

SELECT DeliveryMethodID, DeliveryMethodName
FROM Application.DeliveryMethods
WHERE DeliveryMethodName = N'Post';

SELECT TOP (20)
    c.CityID,
    c.CityName
FROM Application.Cities AS c
WHERE EXISTS (
    SELECT 1
    FROM Sales.Customers AS sc
    WHERE sc.DeliveryCityID = c.CityID
       OR sc.PostalCityID = c.CityID
)
ORDER BY c.CityName;
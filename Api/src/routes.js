import { Router } from "express";
import { executeProcedure, sql } from "./db.js";
import { HttpError } from "./errors.js";
import {
  bodyBoolean, bodyCoordinatePair, bodyDate, bodyDecimal, bodyInteger,
  bodyInputs, bodyString, queryDate, queryDecimal, queryInteger, queryPage, queryText,
} from "./validation.js";

export const router = Router();

const types = {
  int: sql.Int,
  bit: sql.Bit,
  float: sql.Float,
  date: sql.Date,
  nvarchar: (size) => sql.NVarChar(size),
  decimal: (precision, scale) => sql.Decimal(precision, scale),
};

const input = (name, type, value) => ({ name, type, value });
const text = (query, key, max = 100, parameter = key) => input(parameter, types.nvarchar(max), queryText(query, key, max));
const integer = (query, key, parameter = key, options) => input(parameter, types.int, queryInteger(query, key, options));
const decimal = (query, key, parameter = key) => input(parameter, types.decimal(18, 2), queryDecimal(query, key));
const date = (query, key, parameter = key) => input(parameter, types.date, queryDate(query, key));
const pageInputs = (query) => {
  const page = queryPage(query);
  return [input("PageNumber", types.int, page.pageNumber), input("PageSize", types.int, page.pageSize)];
};
const sendData = (res, data, meta) => res.json({ data, ...(meta ? { meta } : {}) });

function idParam(raw, name = "id") {
  if (!/^\d+$/.test(raw || "")) throw new HttpError(400, `${name} debe ser un entero positivo.`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483647) {
    throw new HttpError(400, `${name} debe ser un entero positivo válido.`);
  }
  return value;
}

function optionalYear(query, key) {
  return queryInteger(query, key, { min: 1900, max: 9999 });
}

function yearRange(query) {
  return [
    input("YearFrom", types.int, optionalYear(query, "yearFrom")),
    input("YearTo", types.int, optionalYear(query, "yearTo")),
  ];
}

function reportMonthInputs(query) {
  const year = optionalYear(query, "year");
  const month = queryInteger(query, "month", { min: 1, max: 12 });
  return [
    input("Year", types.int, year),
    input("Month", types.int, month),
    integer(query, "stockGroupId", "StockGroupID"),
    integer(query, "stockItemId", "StockItemID"),
  ];
}

function registerList(path, procedure, fields, { singular, idField } = {}) {
  router.get(path, async (req, res) => {
    const page = queryPage(req.query);
    const args = [...fields(req.query), ...pageInputs(req.query)];
    const result = await executeProcedure(procedure, args);
    const rows = result.recordset || [];
    const totalRows = rows.length ? Number(rows[0].TotalRows) : 0;
    const data = rows.map(({ TotalRows, ...row }) => row);
    sendData(res, data, { pageNumber: page.pageNumber, pageSize: page.pageSize, totalRows });
  });
}

function registerGet(path, procedure, param, singular) {
  router.get(path, async (req, res) => {
    const result = await executeProcedure(procedure, [input(param, types.int, idParam(req.params.id))]);
    const row = result.recordset?.[0];
    if (!row) throw new HttpError(404, `${singular} no encontrado.`);
    sendData(res, row);
  });
}

registerList("/customers", "usp_Customers_List", (q) => [
  text(q, "customerName", 100, "CustomerName"),
  integer(q, "customerCategoryId", "CustomerCategoryID"),
  integer(q, "deliveryMethodId", "DeliveryMethodID"),
]);
registerGet("/customers/:id", "usp_Customers_GetById", "CustomerID", "Cliente");

const customerFields = [
  ["customerName", "CustomerName", "nvarchar", 100, true],
  ["customerCategoryId", "CustomerCategoryID", "int", 0, true],
  ["primaryContactPersonId", "PrimaryContactPersonID", "int", 0, true],
  ["deliveryMethodId", "DeliveryMethodID", "int", 0, true],
  ["deliveryCityId", "DeliveryCityID", "int", 0, true],
  ["postalCityId", "PostalCityID", "int", 0, true],
  ["paymentDays", "PaymentDays", "int", 0, true],
  ["phoneNumber", "PhoneNumber", "nvarchar", 20, true],
  ["faxNumber", "FaxNumber", "nvarchar", 20, true],
  ["websiteUrl", "WebsiteURL", "nvarchar", 256, true],
  ["deliveryAddressLine1", "DeliveryAddressLine1", "nvarchar", 60, true],
  ["deliveryPostalCode", "DeliveryPostalCode", "nvarchar", 10, true],
  ["postalAddressLine1", "PostalAddressLine1", "nvarchar", 60, true],
  ["postalPostalCode", "PostalPostalCode", "nvarchar", 10, true],
  ["billToCustomerId", "BillToCustomerID", "int", 0, false, true],
  ["buyingGroupId", "BuyingGroupID", "int", 0, false, true],
  ["alternateContactPersonId", "AlternateContactPersonID", "int", 0, false, true],
  ["creditLimit", "CreditLimit", "decimal", [18, 2], false, true],
  ["accountOpenedDate", "AccountOpenedDate", "date", 0, false, true],
  ["standardDiscountPercentage", "StandardDiscountPercentage", "decimal", [18, 3], false, true],
  ["isStatementSent", "IsStatementSent", "bit", 0, false, true],
  ["isOnCreditHold", "IsOnCreditHold", "bit", 0, false, true],
  ["deliveryRun", "DeliveryRun", "nvarchar", 10, false, true],
  ["runPosition", "RunPosition", "nvarchar", 10, false, true],
  ["deliveryAddressLine2", "DeliveryAddressLine2", "nvarchar", 60, false, true],
  ["postalAddressLine2", "PostalAddressLine2", "nvarchar", 60, false, true],
  ["lastEditedBy", "LastEditedBy", "int", 0, false, true],
];

function customerBody(body, { update = false } = {}) {
  const nullableOnCreateOrUpdate = new Set([
    "billToCustomerId", "buyingGroupId", "alternateContactPersonId", "creditLimit",
    "deliveryRun", "runPosition", "deliveryAddressLine2", "postalAddressLine2", "lastEditedBy",
  ]);
  const definitions = customerFields.map(([key, parameter, kind, size, required, nullable]) => {
    const type = kind === "nvarchar" ? types.nvarchar(size)
      : kind === "decimal" ? types.decimal(...size)
        : types[kind];
    let parse;
    if (kind === "nvarchar") parse = (v) => bodyString(v, key, { maxLength: size, required });
    if (kind === "int") parse = (v) => bodyInteger(v, key, { min: key === "paymentDays" ? 0 : 1 });
    if (kind === "bit") parse = (v) => bodyBoolean(v, key);
    if (kind === "date") parse = (v) => bodyDate(v, key);
    if (kind === "decimal") parse = (v) => bodyDecimal(v, key, {
      min: key === "standardDiscountPercentage" ? 0 : 0,
      max: key === "standardDiscountPercentage" ? 100 : 9999999999999999,
      scale: size[1],
    });
    const allowNull = nullableOnCreateOrUpdate.has(key) || (!update && key === "accountOpenedDate");
    return { key, parameter, type, required: (update && key !== "lastEditedBy") || required, nullable: allowNull, parse };
  });

  const customerValues = { ...body };
  delete customerValues.deliveryLatitude;
  delete customerValues.deliveryLongitude;
  const inputs = bodyInputs(customerValues, definitions);
  const coordinates = bodyCoordinatePair(body);
  if (coordinates) {
    inputs.push(input("DeliveryLatitude", types.float, coordinates[0].value));
    inputs.push(input("DeliveryLongitude", types.float, coordinates[1].value));
  }
  return inputs;
}

router.post("/customers", async (req, res) => {
  const result = await executeProcedure("usp_Customers_Create", customerBody(req.body));
  const customerId = result.recordset?.[0]?.CustomerID;
  res.status(201).json({ data: { customerId } });
});

router.put("/customers/:id", async (req, res) => {
  const customerId = idParam(req.params.id, "customerId");
  const existing = await executeProcedure("usp_Customers_GetById", [input("CustomerID", types.int, customerId)]);
  const current = existing.recordset?.[0];
  if (!current) throw new HttpError(404, "Cliente no encontrado.");
  const body = req.body;
  const inputs = customerBody(body, { update: true });
  inputs.unshift(input("CustomerID", types.int, customerId));

  // El procedimiento actual interpreta coordenadas omitidas como una solicitud para borrarlas.
  // Si no se proporcionan, conserva las que devolvió el procedimiento de detalle.
  if (!Object.hasOwn(body, "deliveryLatitude")) {
    inputs.push(input("DeliveryLatitude", types.float, current.DeliveryLatitude));
    inputs.push(input("DeliveryLongitude", types.float, current.DeliveryLongitude));
  }
  await executeProcedure("usp_Customers_Update", inputs);
  res.status(204).end();
});

router.delete("/customers/:id", async (req, res) => {
  await executeProcedure("usp_Customers_Delete", [input("CustomerID", types.int, idParam(req.params.id, "customerId"))]);
  res.status(204).end();
});

registerList("/suppliers", "usp_Suppliers_List", (q) => [
  text(q, "supplierName", 100, "SupplierName"),
  integer(q, "supplierCategoryId", "SupplierCategoryID"),
  integer(q, "deliveryMethodId", "DeliveryMethodID"),
]);
registerGet("/suppliers/:id", "usp_Suppliers_GetById", "SupplierID", "Proveedor");

registerList("/stock-items", "usp_StockItems_List", (q) => [
  text(q, "stockItemName", 100, "StockItemName"),
  integer(q, "stockGroupId", "StockGroupID"),
  integer(q, "minQuantityOnHand", "MinQuantityOnHand", { min: 0 }),
  integer(q, "maxQuantityOnHand", "MaxQuantityOnHand", { min: 0 }),
]);
registerGet("/stock-items/:id", "usp_StockItems_GetById", "StockItemID", "Producto");

registerList("/invoices", "usp_Invoices_List", (q) => [
  text(q, "customerName", 100, "CustomerName"),
  date(q, "invoiceDateFrom", "InvoiceDateFrom"),
  date(q, "invoiceDateTo", "InvoiceDateTo"),
  decimal(q, "minTotal", "MinTotal"),
  decimal(q, "maxTotal", "MaxTotal"),
]);
router.get("/invoices/:id", async (req, res) => {
  const result = await executeProcedure("usp_Invoices_GetById", [input("InvoiceID", types.int, idParam(req.params.id, "invoiceId"))]);
  const invoice = result.recordsets?.[0]?.[0];
  if (!invoice) throw new HttpError(404, "Factura no encontrada.");
  sendData(res, { invoice, lines: result.recordsets?.[1] || [] });
});

const lookups = [
  ["customer-categories", "usp_Lookups_CustomerCategories"],
  ["supplier-categories", "usp_Lookups_SupplierCategories"],
  ["delivery-methods", "usp_Lookups_DeliveryMethods"],
  ["stock-groups", "usp_Lookups_StockGroups"],
];
for (const [path, procedure] of lookups) {
  router.get(`/lookups/${path}`, async (_req, res) => {
    const result = await executeProcedure(procedure);
    sendData(res, result.recordset || []);
  });
}

router.get("/reports/years", async (req, res) => {
  const dataset = queryText(req.query, "dataset", 20, "Dataset") || "Ventas";
  if (dataset && !["Ventas", "Compras", "Inventario"].includes(dataset)) {
    throw new HttpError(400, "dataset debe ser Ventas, Compras o Inventario.");
  }
  const result = await executeProcedure("usp_Reports_GetYears", [input("Dataset", types.nvarchar(20), dataset)]);
  sendData(res, result.recordset || []);
});

router.get("/reports/purchase-amounts", async (req, res) => sendReport(res, "usp_Report_PurchaseAmountsBySupplier", [
  text(req.query, "supplierName", 100, "SupplierName"),
  text(req.query, "supplierCategoryName", 100, "SupplierCategoryName"),
]));
router.get("/reports/sales-amounts", async (req, res) => sendReport(res, "usp_Report_SalesAmountsByCustomer", [
  text(req.query, "customerName", 100, "CustomerName"),
  text(req.query, "customerCategoryName", 100, "CustomerCategoryName"),
]));
router.get("/reports/top-products", async (req, res) => sendReport(res, "usp_Report_TopProductsByProfit", [
  input("Year", types.int, optionalYear(req.query, "year")),
]));
router.get("/reports/top-customers", async (req, res) => sendReport(res, "usp_Report_TopCustomersByInvoices", yearRange(req.query)));
router.get("/reports/top-suppliers", async (req, res) => sendReport(res, "usp_Report_TopSuppliersByOrders", yearRange(req.query)));
router.get("/reports/sales-matrix", async (_req, res) => sendReport(res, "usp_Report_SalesMatrixByStockGroup"));
router.get("/reports/monthly-customer-sales", async (req, res) => sendReport(res, "usp_Report_MonthlySalesByCustomer", reportMonthInputs(req.query)));
router.get("/reports/monthly-supplier-purchases", async (req, res) => sendReport(res, "usp_Report_MonthlyPurchasesBySupplier", reportMonthInputs(req.query)));
router.get("/reports/inventory-rotation", async (req, res) => sendReport(res, "usp_Report_InventoryRotationDays", [
  input("Year", types.int, queryInteger(req.query, "year", { min: 1900, max: 9999, required: true })),
  integer(req.query, "stockGroupId", "StockGroupID"),
  integer(req.query, "supplierId", "SupplierID"),
]));
router.get("/reports/favorite-delivery-method", async (req, res) => sendReport(res, "usp_Report_FavoriteDeliveryMethodByDestination", [
  input("Year", types.int, optionalYear(req.query, "year")),
  input("Month", types.int, queryInteger(req.query, "month", { min: 1, max: 12 })),
  integer(req.query, "customerCategoryId", "CustomerCategoryID"),
  integer(req.query, "stockGroupId", "StockGroupID"),
  integer(req.query, "stockItemId", "StockItemID"),
]));

async function sendReport(res, procedure, inputs = []) {
  const result = await executeProcedure(procedure, inputs);
  sendData(res, result.recordset || []);
}

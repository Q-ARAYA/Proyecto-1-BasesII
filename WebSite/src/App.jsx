import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert, AppBar, Avatar, Box, Breadcrumbs, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, Divider, Drawer, FormControl, IconButton,
  InputAdornment, InputLabel, LinearProgress, MenuItem, Paper, Select, Snackbar, Stack, Table,
  TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Toolbar,
  Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import BusinessRounded from "@mui/icons-material/BusinessRounded";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import Groups2Rounded from "@mui/icons-material/Groups2Rounded";
import Inventory2Rounded from "@mui/icons-material/Inventory2Rounded";
import LocalShippingRounded from "@mui/icons-material/LocalShippingRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import MoreHorizRounded from "@mui/icons-material/MoreHorizRounded";
import PersonAddAlt1Rounded from "@mui/icons-material/PersonAddAlt1Rounded";
import ReceiptLongRounded from "@mui/icons-material/ReceiptLongRounded";
import RefreshRounded from "@mui/icons-material/RefreshRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import ShowChartRounded from "@mui/icons-material/ShowChartRounded";
import StorefrontRounded from "@mui/icons-material/StorefrontRounded";
import VisibilityRounded from "@mui/icons-material/VisibilityRounded";
import WarningAmberRounded from "@mui/icons-material/WarningAmberRounded";
import { apiRequest, queryApi } from "./api.js";

const PAGE_SIZE = 25;
const REPORT_PAGE_SIZE = 50;
const NAV = [
  { id: "home", label: "Resumen", icon: DashboardRounded },
  { id: "customers", label: "Clientes", icon: Groups2Rounded, tag: "01" },
  { id: "suppliers", label: "Proveedores", icon: LocalShippingRounded, tag: "02" },
  { id: "stock-items", label: "Inventario", icon: Inventory2Rounded, tag: "03" },
  { id: "invoices", label: "Ventas", icon: ReceiptLongRounded, tag: "04" },
  { id: "reports", label: "Estadísticas", icon: BarChartRounded, tag: "05" },
];

const MODULES = {
  customers: {
    title: "Clientes", eyebrow: "DIRECTORIO COMERCIAL", subtitle: "Consulta, segmenta y administra tus cuentas.",
    path: "/customers", singular: "cliente", canWrite: true,
    filters: [
      { key: "customerName", label: "Buscar cliente", type: "search", placeholder: "Nombre del cliente" },
      { key: "customerCategoryId", label: "Categoría", type: "lookup", lookup: "customerCategories", id: "CustomerCategoryID", name: "CustomerCategoryName" },
      { key: "deliveryMethodId", label: "Método de entrega", type: "lookup", lookup: "deliveryMethods", id: "DeliveryMethodID", name: "DeliveryMethodName" },
    ],
    columns: [
      { key: "CustomerID", label: "ID", width: 82 }, { key: "CustomerName", label: "Cliente", primary: true },
      { key: "CustomerCategoryName", label: "Categoría" }, { key: "DeliveryMethodName", label: "Método de entrega" },
    ],
  },
  suppliers: {
    title: "Proveedores", eyebrow: "RED DE SUMINISTRO", subtitle: "Explora contactos, categorías y condiciones comerciales.",
    path: "/suppliers", singular: "proveedor",
    filters: [
      { key: "supplierName", label: "Buscar proveedor", type: "search", placeholder: "Nombre del proveedor" },
      { key: "supplierCategoryId", label: "Categoría", type: "lookup", lookup: "supplierCategories", id: "SupplierCategoryID", name: "SupplierCategoryName" },
      { key: "deliveryMethodId", label: "Método de entrega", type: "lookup", lookup: "deliveryMethods", id: "DeliveryMethodID", name: "DeliveryMethodName" },
    ],
    columns: [
      { key: "SupplierReference", label: "Referencia", width: 130 }, { key: "SupplierName", label: "Proveedor", primary: true },
      { key: "SupplierCategoryName", label: "Categoría" }, { key: "DeliveryMethodName", label: "Método" },
    ],
  },
  "stock-items": {
    title: "Inventario", eyebrow: "CATÁLOGO DE PRODUCTOS", subtitle: "Productos, grupos y existencias actuales.",
    path: "/stock-items", singular: "producto",
    filters: [
      { key: "stockItemName", label: "Buscar producto", type: "search", placeholder: "Nombre del producto" },
      { key: "stockGroupId", label: "Grupo", type: "lookup", lookup: "stockGroups", id: "StockGroupID", name: "StockGroupName" },
      { key: "minQuantityOnHand", label: "Existencia mínima", type: "number", min: 0 },
      { key: "maxQuantityOnHand", label: "Existencia máxima", type: "number", min: 0 },
    ],
    columns: [
      { key: "StockItemID", label: "ID", width: 82 }, { key: "StockItemName", label: "Producto", primary: true },
      { key: "SupplierName", label: "Proveedor" }, { key: "StockGroups", label: "Grupo(s)" },
      { key: "QuantityOnHand", label: "Existencia", align: "right" },
    ],
  },
  invoices: {
    title: "Ventas", eyebrow: "HISTORIAL DE FACTURAS", subtitle: "Filtra operaciones y revisa el detalle de cada venta.",
    path: "/invoices", singular: "factura",
    filters: [
      { key: "customerName", label: "Cliente", type: "search", placeholder: "Nombre del cliente" },
      { key: "invoiceDateFrom", label: "Desde", type: "date" }, { key: "invoiceDateTo", label: "Hasta", type: "date" },
      { key: "minTotal", label: "Monto mínimo", type: "number", step: "0.01" }, { key: "maxTotal", label: "Monto máximo", type: "number", step: "0.01" },
    ],
    columns: [
      { key: "InvoiceID", label: "Factura", width: 100, primary: true }, { key: "InvoiceDate", label: "Fecha" },
      { key: "CustomerName", label: "Cliente" }, { key: "DeliveryMethodName", label: "Entrega" },
      { key: "Total", label: "Total neto", align: "right", money: true }, { key: "IsCreditNote", label: "Tipo", type: "credit" },
    ],
  },
};

const REPORTS = [
  { id: "purchase-amounts", name: "Compras por proveedor", group: "COMPRAS", subtitle: "Máximos, mínimos y promedios con subtotales por categoría.", endpoint: "/reports/purchase-amounts", filters: [
    { key: "supplierName", label: "Proveedor", type: "text" }, { key: "supplierCategoryName", label: "Categoría de proveedor", type: "text" },
  ] },
  { id: "sales-amounts", name: "Ventas por cliente", group: "VENTAS", subtitle: "Importes netos, incluyendo notas de crédito, por categoría y cliente.", endpoint: "/reports/sales-amounts", filters: [
    { key: "customerName", label: "Cliente", type: "text" }, { key: "customerCategoryName", label: "Categoría de cliente", type: "text" },
  ] },
  { id: "top-products", name: "Productos más rentables", group: "VENTAS", subtitle: "Productos con mayor ganancia neta, clasificados por año.", endpoint: "/reports/top-products", dataset: "Ventas", filters: [
    { key: "year", label: "Año", type: "year", optional: true },
  ] },
  { id: "top-customers", name: "Clientes con más facturas", group: "VENTAS", subtitle: "Los cinco primeros clientes de cada año y su venta neta.", endpoint: "/reports/top-customers", dataset: "Ventas", filters: [
    { key: "yearFrom", label: "Año desde", type: "year", optional: true }, { key: "yearTo", label: "Año hasta", type: "year", optional: true },
  ] },
  { id: "top-suppliers", name: "Proveedores con más órdenes", group: "COMPRAS", subtitle: "Órdenes por proveedor y año junto con su monto comprado.", endpoint: "/reports/top-suppliers", dataset: "Compras", filters: [
    { key: "yearFrom", label: "Año desde", type: "year", optional: true }, { key: "yearTo", label: "Año hasta", type: "year", optional: true },
  ] },
  { id: "sales-matrix", name: "Matriz anual de ventas", group: "VENTAS", subtitle: "Ventas netas por grupo de producto y año.", endpoint: "/reports/sales-matrix", filters: [] },
  { id: "monthly-customer-sales", name: "Ventas mensuales por cliente", group: "VENTAS", subtitle: "Importe, fechas de factura y unidades agrupadas por cliente.", endpoint: "/reports/monthly-customer-sales", dataset: "Ventas", filters: [
    { key: "year", label: "Año", type: "year", optional: true }, { key: "month", label: "Mes", type: "month" },
    { key: "stockGroupId", label: "Grupo", type: "lookup", lookup: "stockGroups", id: "StockGroupID", name: "StockGroupName" }, { key: "stockItemId", label: "ID de producto", type: "number", min: 1 },
  ] },
  { id: "monthly-supplier-purchases", name: "Compras mensuales por proveedor", group: "COMPRAS", subtitle: "Importe recibido, fechas de recepción y unidades por proveedor.", endpoint: "/reports/monthly-supplier-purchases", dataset: "Compras", filters: [
    { key: "year", label: "Año", type: "year", optional: true }, { key: "month", label: "Mes", type: "month" },
    { key: "stockGroupId", label: "Grupo", type: "lookup", lookup: "stockGroups", id: "StockGroupID", name: "StockGroupName" }, { key: "stockItemId", label: "ID de producto", type: "number", min: 1 },
  ] },
  { id: "inventory-rotation", name: "Rotación de inventario", group: "INVENTARIO", subtitle: "Días estimados de inventario para cada producto.", endpoint: "/reports/inventory-rotation", dataset: "Inventario", filters: [
    { key: "year", label: "Año", type: "year", required: true }, { key: "stockGroupId", label: "Grupo", type: "lookup", lookup: "stockGroups", id: "StockGroupID", name: "StockGroupName" }, { key: "supplierId", label: "ID de proveedor", type: "number", min: 1 },
  ] },
  { id: "favorite-delivery-method", name: "Método favorito por destino", group: "VENTAS", subtitle: "Métodos más usados por ciudad de entrega del cliente.", endpoint: "/reports/favorite-delivery-method", dataset: "Ventas", filters: [
    { key: "year", label: "Año", type: "year", optional: true }, { key: "month", label: "Mes", type: "month" },
    { key: "customerCategoryId", label: "Categoría de cliente", type: "lookup", lookup: "customerCategories", id: "CustomerCategoryID", name: "CustomerCategoryName" },
    { key: "stockGroupId", label: "Grupo", type: "lookup", lookup: "stockGroups", id: "StockGroupID", name: "StockGroupName" }, { key: "stockItemId", label: "ID de producto", type: "number", min: 1 },
  ] },
];

const REPORT_LABELS = {
  Level: "Nivel", SupplierCategoryName: "Categoría", SupplierName: "Proveedor", HighestPurchase: "Compra máxima",
  LowestPurchase: "Compra mínima", AveragePurchase: "Promedio", PurchaseOrderCount: "Órdenes", CustomerCategoryName: "Categoría",
  CustomerName: "Cliente", HighestSale: "Venta máxima", LowestSale: "Venta mínima", AverageSale: "Promedio", InvoiceCount: "Facturas",
  Year: "Año", Position: "Posición", StockItemName: "Producto", NetProfit: "Ganancia neta", CustomerID: "ID cliente",
  NetInvoiced: "Venta neta", SupplierID: "ID proveedor", OrderedAmount: "Monto comprado", StockGroupName: "Grupo",
  Month: "Mes", MonthStart: "Inicio de mes", FirstInvoiceDate: "Primera factura", FirstInvoiceID: "Factura inicial",
  LastInvoiceDate: "Última factura", LastInvoiceID: "Factura final", NetSales: "Venta neta", NetUnits: "Unidades netas",
  MinLineUnits: "Mínimo por línea", MaxLineUnits: "Máximo por línea", FirstOrderDate: "Primera orden",
  FirstPurchaseOrderID: "Orden inicial", LastPurchaseOrderID: "Última orden", LastReceiptDate: "Última recepción",
  ReceivedPurchaseAmount: "Monto recibido", ReceivedOuters: "Empaques recibidos", MinLineOuters: "Mínimo por línea",
  MaxLineOuters: "Máximo por línea", AverageInventory: "Inventario promedio", NetUnitsSold: "Unidades vendidas",
  RotationDays: "Días de rotación", CityName: "Ciudad", PreferencePosition: "Preferencia", DeliveryMethodID: "ID método",
  DeliveryMethodName: "Método de entrega", SalesCount: "Facturas de venta", StockItemID: "ID producto",
};
const MONEY_KEYS = new Set(["HighestPurchase", "LowestPurchase", "AveragePurchase", "HighestSale", "LowestSale", "AverageSale", "NetProfit", "NetInvoiced", "OrderedAmount", "NetSales", "ReceivedPurchaseAmount"]);
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const LOOKUP_PATHS = { customerCategories: "/lookups/customer-categories", supplierCategories: "/lookups/supplier-categories", deliveryMethods: "/lookups/delivery-methods", stockGroups: "/lookups/stock-groups" };
const LOOKUP_IDS = ["customerCategories", "supplierCategories", "deliveryMethods", "stockGroups"];
const CUSTOMER_FORM_FIELDS = [
  { key: "customerName", label: "Nombre del cliente", section: "Identidad", required: true, maxLength: 100 },
  { key: "customerCategoryId", label: "Categoría", section: "Identidad", required: true, type: "lookup", lookup: "customerCategories", id: "CustomerCategoryID", name: "CustomerCategoryName" },
  { key: "buyingGroupId", label: "ID grupo de compra", section: "Identidad", type: "number", nullable: true },
  { key: "billToCustomerId", label: "ID cliente de facturación", section: "Identidad", type: "number", nullable: true },
  { key: "primaryContactPersonId", label: "ID contacto principal", section: "Contactos", required: true, type: "number" },
  { key: "alternateContactPersonId", label: "ID contacto alternativo", section: "Contactos", type: "number", nullable: true },
  { key: "phoneNumber", label: "Teléfono", section: "Contactos", required: true, maxLength: 20 },
  { key: "faxNumber", label: "Fax", section: "Contactos", required: true, maxLength: 20 },
  { key: "websiteUrl", label: "Sitio web", section: "Contactos", required: true, maxLength: 256 },
  { key: "deliveryMethodId", label: "Método de entrega", section: "Entrega", required: true, type: "lookup", lookup: "deliveryMethods", id: "DeliveryMethodID", name: "DeliveryMethodName" },
  { key: "deliveryCityId", label: "ID ciudad de entrega", section: "Entrega", required: true, type: "number" },
  { key: "deliveryAddressLine1", label: "Dirección de entrega", section: "Entrega", required: true, maxLength: 60 },
  { key: "deliveryAddressLine2", label: "Dirección de entrega (línea 2)", section: "Entrega", maxLength: 60, nullable: true },
  { key: "deliveryPostalCode", label: "Código postal de entrega", section: "Entrega", required: true, maxLength: 10 },
  { key: "deliveryLatitude", label: "Latitud", section: "Entrega", type: "number", nullable: true },
  { key: "deliveryLongitude", label: "Longitud", section: "Entrega", type: "number", nullable: true },
  { key: "postalCityId", label: "ID ciudad postal", section: "Dirección postal", required: true, type: "number" },
  { key: "postalAddressLine1", label: "Dirección postal", section: "Dirección postal", required: true, maxLength: 60 },
  { key: "postalAddressLine2", label: "Dirección postal (línea 2)", section: "Dirección postal", maxLength: 60, nullable: true },
  { key: "postalPostalCode", label: "Código postal", section: "Dirección postal", required: true, maxLength: 10 },
  { key: "paymentDays", label: "Días de pago", section: "Condiciones", required: true, type: "number", min: 0 },
  { key: "accountOpenedDate", label: "Fecha de apertura", section: "Condiciones", required: true, type: "date" },
  { key: "creditLimit", label: "Límite de crédito", section: "Condiciones", type: "number", step: "0.01", nullable: true },
  { key: "standardDiscountPercentage", label: "Descuento estándar (%)", section: "Condiciones", required: true, type: "number", step: "0.001" },
  { key: "isStatementSent", label: "Estado de cuenta enviado", section: "Condiciones", type: "boolean", required: true },
  { key: "isOnCreditHold", label: "En retención de crédito", section: "Condiciones", type: "boolean", required: true },
  { key: "deliveryRun", label: "Ruta de entrega", section: "Condiciones", maxLength: 10, nullable: true },
  { key: "runPosition", label: "Posición en ruta", section: "Condiciones", maxLength: 10, nullable: true },
];

function App() {
  const [section, setSection] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lookups, setLookups] = useState({});
  const [lookupError, setLookupError] = useState("");
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const activeNav = NAV.find((item) => item.id === section) || NAV[0];

  const loadLookups = useCallback(async () => {
    setLookupError("");
    const entries = await Promise.all(LOOKUP_IDS.map(async (id) => {
      const result = await queryApi(LOOKUP_PATHS[id]);
      return [id, result.data || []];
    }));
    setLookups(Object.fromEntries(entries));
  }, []);

  useEffect(() => { loadLookups().catch((error) => setLookupError(error.message)); }, [loadLookups]);
  const navigate = (id) => { setSection(id); setMobileOpen(false); };
  const drawer = <Sidebar active={section} onNavigate={navigate} />;

  return <Box className="app-shell">
    {!mobile && <Drawer variant="permanent" className="side-drawer" PaperProps={{ className: "side-paper" }}>{drawer}</Drawer>}
    {mobile && <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ className: "side-paper mobile-paper" }}>{drawer}</Drawer>}
    <Box className="main-shell">
      <AppBar position="sticky" color="inherit" elevation={0} className="topbar">
        <Toolbar className="topbar-inner">
          {mobile && <IconButton onClick={() => setMobileOpen(true)} aria-label="Abrir navegación"><MenuRounded /></IconButton>}
          <Breadcrumbs separator={<ChevronRightRounded fontSize="small" />} aria-label="ruta"><Typography color="text.secondary">WideWorld</Typography><Typography fontWeight={700}>{activeNav.label}</Typography></Breadcrumbs>
          <Box sx={{ flex: 1 }} />
          <ConnectionBadge />
          <Avatar className="profile-avatar">QM</Avatar>
        </Toolbar>
      </AppBar>
      <Box component="main" className="page-content">
        {lookupError && <Alert severity="warning" action={<Button color="inherit" onClick={() => loadLookups().catch((e) => setLookupError(e.message))}>Reintentar</Button>} sx={{ mb: 2 }}>{lookupError}. Los filtros de catálogo aparecerán al conectar con la API.</Alert>}
        {section === "home" && <HomePage lookups={lookups} onNavigate={navigate} />}
        {MODULES[section] && <ResourcePage key={section} config={MODULES[section]} lookups={lookups} />}
        {section === "reports" && <ReportsPage lookups={lookups} />}
      </Box>
      <Box component="footer" className="footer"><span>WideWorldImporters · Bases de Datos II</span><span>Datos consultados en SQL Server</span></Box>
    </Box>
  </Box>;
}

function Sidebar({ active, onNavigate }) {
  return <Box className="sidebar-content">
    <Box className="brand-lockup"><Box className="brand-mark"><StorefrontRounded /></Box><Box><Typography className="brand-name">wide<span>world</span></Typography><Typography className="brand-caption">OPERATIONS CONSOLE</Typography></Box></Box>
    <Box className="sidebar-label">ESPACIO DE TRABAJO</Box>
    <Box className="nav-list">{NAV.map(({ id, label, icon: Icon, tag }) => <Button key={id} className={`nav-link ${active === id ? "active" : ""}`} onClick={() => onNavigate(id)} startIcon={<Icon />}>
      <span>{label}</span>{tag && <span className="nav-tag">{tag}</span>}
    </Button>)}</Box>
    <Box className="sidebar-bottom"><Box className="sidebar-bottom-mark"><ShowChartRounded /></Box><Typography variant="caption">Tu espacio para entender<br />la operación, cada día.</Typography><Divider sx={{ borderColor: "rgba(255,255,255,.12)", my: 2 }} /><Typography className="side-version">BASES DE DATOS II · 2026</Typography></Box>
  </Box>;
}

function ConnectionBadge() {
  const [status, setStatus] = useState("checking");
  useEffect(() => {
    let live = true;
    const check = async () => {
      try { await queryApi("/health/ready"); if (live) setStatus("connected"); }
      catch { if (live) setStatus("offline"); }
    };
    check(); const timer = setInterval(check, 30000);
    return () => { live = false; clearInterval(timer); };
  }, []);
  const labels = { connected: "SQL conectado", offline: "Sin conexión", checking: "Conectando" };
  return <Chip size="small" className={`connection-chip ${status}`} icon={status === "connected" ? <CheckCircleRounded /> : status === "offline" ? <WarningAmberRounded /> : <CircularProgress size={13} />} label={labels[status]} />;
}

function HomePage({ lookups, onNavigate }) {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let live = true;
    Promise.all(Object.entries({ customers: "/customers", suppliers: "/suppliers", items: "/stock-items", invoices: "/invoices" }).map(async ([key, path]) => {
      const response = await queryApi(path, { pageNumber: 1, pageSize: 1 });
      return [key, response.meta?.totalRows ?? 0];
    })).then((pairs) => { if (live) { setCounts(Object.fromEntries(pairs)); setError(""); } })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [refresh]);
  const cards = [
    { key: "customers", label: "Clientes", icon: Groups2Rounded, hue: "mint", target: "customers" },
    { key: "suppliers", label: "Proveedores", icon: LocalShippingRounded, hue: "sand", target: "suppliers" },
    { key: "items", label: "Productos", icon: Inventory2Rounded, hue: "blue", target: "stock-items" },
    { key: "invoices", label: "Facturas", icon: ReceiptLongRounded, hue: "rose", target: "invoices" },
  ];
  return <>
    <Box className="welcome-row"><Box><Typography className="eyebrow">CENTRO DE OPERACIONES <span className="eyebrow-dot" /></Typography><Typography variant="h1" className="page-title">Buenos días, Quiriat.</Typography><Typography color="text.secondary" className="page-subtitle">Una mirada clara a tus datos comerciales.</Typography></Box><Button variant="outlined" startIcon={<RefreshRounded />} onClick={() => setRefresh((v) => v + 1)}>Actualizar</Button></Box>
    <Paper elevation={0} className="hero-panel"><Box className="hero-copy"><Chip label="WIDEWORLDIMPORTERS" size="small" className="hero-chip" /><Typography variant="h2">Todo conectado.<br /><span>Todo en contexto.</span></Typography><Typography>Explora clientes, compras, inventario y ventas desde un mismo lugar.</Typography><Button variant="contained" endIcon={<ArrowForwardRounded />} onClick={() => onNavigate("reports")}>Ir a estadísticas</Button></Box><Box className="hero-art" aria-hidden="true"><div className="hero-ring ring-one" /><div className="hero-ring ring-two" /><div className="hero-sun" /><div className="hero-line line-one" /><div className="hero-line line-two" /><div className="hero-spark">✳</div><div className="hero-caption">DATA<br />IN MOTION</div></Box></Paper>
    <Box className="section-heading"><Box><Typography className="eyebrow">TU OPERACIÓN, DE UN VISTAZO</Typography><Typography variant="h3">Datos esenciales</Typography></Box><Typography className="live-note"><span /> Actualizado desde SQL Server</Typography></Box>
    {error && <Alert severity="warning" sx={{ mb: 2 }} action={<Button color="inherit" onClick={() => setRefresh((v) => v + 1)}>Reintentar</Button>}>{error}</Alert>}
    <Box className="stats-grid">{cards.map(({ key, label, icon: Icon, hue, target }, index) => <Card key={key} elevation={0} className={`stat-card ${hue}`} onClick={() => onNavigate(target)} sx={{ animationDelay: `${index * 70}ms` }}>
      <CardContent><Box className="stat-top"><Box className="stat-icon"><Icon /></Box><ArrowForwardRounded className="stat-arrow" /></Box><Typography className="stat-value">{counts ? Number(counts[key]).toLocaleString("es-CR") : "—"}</Typography><Typography className="stat-label">{label} en el sistema</Typography><Typography className="stat-foot">Ver módulo <ChevronRightRounded fontSize="small" /></Typography></CardContent>
    </Card>)}</Box>
    <Box className="section-heading report-heading"><Box><Typography className="eyebrow">DECISIONES CON RESPALDO</Typography><Typography variant="h3">Explora por área</Typography></Box></Box>
    <Box className="quick-grid">{[
      ["customers", "Relaciones", "Conoce tus cuentas y contactos", Groups2Rounded, "Clientes"],
      ["suppliers", "Abastecimiento", "Entiende tu red de proveedores", LocalShippingRounded, "Proveedores"],
      ["stock-items", "Existencias", "Sigue grupos y disponibilidad", Inventory2Rounded, "Inventario"],
      ["invoices", "Transacciones", "Busca facturas y sus líneas", ReceiptLongRounded, "Ventas"],
    ].map(([id, title, text, Icon, link]) => <Paper className="quick-card" elevation={0} key={id} onClick={() => onNavigate(id)}><Box className="quick-icon"><Icon /></Box><Typography variant="h6">{title}</Typography><Typography color="text.secondary">{text}</Typography><Button endIcon={<ArrowForwardRounded />} onClick={() => onNavigate(id)}>{link}</Button></Paper>)}</Box>
    <Box className="bottom-note"><Box className="bottom-note-icon"><BarChartRounded /></Box><Box><Typography fontWeight={700}>Diez reportes listos para explorar</Typography><Typography variant="body2" color="text.secondary">Comparaciones, tendencias y rotación calculadas en SQL Server.</Typography></Box><Button sx={{ ml: "auto" }} onClick={() => onNavigate("reports")}>Ver reportes <ArrowForwardRounded fontSize="small" /></Button></Box>
  </>;
}

function ResourcePage({ config, lookups }) {
  const [filters, setFilters] = useState({});
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(0);
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const fetchRows = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await queryApi(config.path, { ...applied, pageNumber: page + 1, pageSize: PAGE_SIZE });
      setPayload(response);
    } catch (e) { setError(e.message); setPayload(null); }
    finally { setLoading(false); }
  }, [config.path, applied, page, reload]);
  useEffect(() => { fetchRows(); }, [fetchRows]);
  const openDetail = async (row) => {
    try {
      setDetail({ loading: true, row });
      const idKey = config.path === "/customers" ? "CustomerID" : config.path === "/suppliers" ? "SupplierID" : config.path === "/stock-items" ? "StockItemID" : "InvoiceID";
      const response = await queryApi(`${config.path}/${row[idKey]}`);
      setDetail({ row: response.data, id: row[idKey] });
    } catch (e) { setNotice(e.message); setDetail(null); }
  };
  const openRelated = async (module, id) => {
    const relatedConfig = MODULES[module];
    if (!relatedConfig || !id) return;
    const idKey = module === "customers" ? "CustomerID" : module === "suppliers" ? "SupplierID" : "StockItemID";
    setDetail({ loading: true, relatedConfig, id });
    try {
      const response = await queryApi(`${relatedConfig.path}/${id}`);
      setDetail({ row: response.data, relatedConfig, id });
    } catch (e) { setDetail(null); setNotice(e.message); }
  };
  const removeCustomer = async (id) => {
    if (!window.confirm("¿Eliminar este cliente? Si tiene registros relacionados, SQL Server rechazará la operación.")) return;
    setBusy(true);
    try { await apiRequest(`/customers/${id}`, { method: "DELETE" }); setDetail(null); setNotice("Cliente eliminado."); setReload((v) => v + 1); }
    catch (e) { setNotice(e.message); }
    finally { setBusy(false); }
  };
  const startEdit = async (row) => {
    try {
      const id = row.CustomerID || detail?.id;
      const response = await queryApi(`/customers/${id}`);
      setDetail(null); setForm({ mode: "edit", id, values: customerFromDetail(response.data) });
    } catch (e) { setNotice(e.message); }
  };
  const submitForm = async (values) => {
    setBusy(true);
    try {
      const body = customerPayload(values, form.mode === "edit");
      const result = form.mode === "create"
        ? await apiRequest("/customers", { method: "POST", body })
        : await apiRequest(`/customers/${form.id}`, { method: "PUT", body });
      setNotice(form.mode === "create" ? `Cliente creado · ID ${result?.data?.customerId ?? ""}` : "Cambios guardados.");
      setForm(null); setPage(0); setReload((v) => v + 1);
    } catch (e) { throw e; }
    finally { setBusy(false); }
  };
  const applyFilters = (event) => { event.preventDefault(); setApplied({ ...filters }); setPage(0); };
  const clearFilters = () => { setFilters({}); setApplied({}); setPage(0); };
  const rows = payload?.data || [];
  const total = payload?.meta?.totalRows || 0;

  return <>
    <PageHeader eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle}>
      {config.canWrite && <Button variant="contained" startIcon={<PersonAddAlt1Rounded />} onClick={() => setForm({ mode: "create", values: emptyCustomer() })}>Nuevo cliente</Button>}
    </PageHeader>
    <Paper elevation={0} className="filter-card">
      <Box component="form" onSubmit={applyFilters} className="filter-form">
        {config.filters.map((filter) => <FilterControl key={filter.key} filter={filter} value={filters[filter.key] || ""} lookups={lookups} onChange={(value) => setFilters((old) => ({ ...old, [filter.key]: value }))} />)}
        <Button type="submit" variant="contained" startIcon={<SearchRounded />} disabled={loading}>Buscar</Button>
        <Button type="button" color="inherit" onClick={clearFilters} disabled={loading}>Limpiar</Button>
      </Box>
    </Paper>
    <Paper elevation={0} className="table-card">
      <Box className="table-card-head"><Box><Typography variant="h6">Listado de {config.title.toLowerCase()}</Typography><Typography variant="body2" color="text.secondary">{total.toLocaleString("es-CR")} registros · ordenados desde SQL Server</Typography></Box><Tooltip title="Actualizar resultados"><IconButton onClick={() => setReload((v) => v + 1)} disabled={loading}><RefreshRounded /></IconButton></Tooltip></Box>
      {loading && <LinearProgress />}
      {error && <Alert severity="error" className="inline-alert" action={<Button color="inherit" onClick={fetchRows}>Reintentar</Button>}>{error}</Alert>}
      <DataTable rows={rows} columns={config.columns} empty={error ? "" : "No encontramos registros con estos filtros."} onRowClick={openDetail} action={(row) => <IconButton size="small" aria-label="Ver detalle" onClick={(event) => { event.stopPropagation(); openDetail(row); }}><VisibilityRounded fontSize="small" /></IconButton>} />
      <TablePagination component="div" count={total} page={page} onPageChange={(_e, p) => setPage(p)} rowsPerPage={PAGE_SIZE} rowsPerPageOptions={[PAGE_SIZE]} labelRowsPerPage="Filas por página" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
    </Paper>
    <DetailDialog config={detail?.relatedConfig || config} state={detail} onClose={() => setDetail(null)} onEdit={(detail?.relatedConfig || config).canWrite ? () => startEdit(detail?.row) : null} onDelete={(detail?.relatedConfig || config).canWrite ? () => removeCustomer(detail?.id || detail?.row?.CustomerID) : null} onRelated={openRelated} busy={busy} />
    <CustomerFormDialog state={form} onClose={() => !busy && setForm(null)} onSubmit={submitForm} busy={busy} lookups={lookups} />
    <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice("")} message={notice} />
  </>;
}

function PageHeader({ eyebrow, title, subtitle, children }) {
  return <Box className="page-header"><Box><Typography className="eyebrow">{eyebrow}</Typography><Typography variant="h1" className="page-title">{title}</Typography><Typography color="text.secondary" className="page-subtitle">{subtitle}</Typography></Box>{children}</Box>;
}

function FilterControl({ filter, value, lookups, onChange }) {
  if (filter.type === "lookup") {
    const options = lookups?.[filter.lookup] || [];
    return <FormControl size="small" className="filter-control"><InputLabel>{filter.label}</InputLabel><Select label={filter.label} value={value} onChange={(e) => onChange(e.target.value)} displayEmpty><MenuItem value=""><em>Todos</em></MenuItem>{options.map((item) => <MenuItem key={item[filter.id]} value={item[filter.id]}>{item[filter.name]}</MenuItem>)}</Select></FormControl>;
  }
  return <TextField className={`filter-control ${filter.type === "search" ? "search-control" : ""}`} label={filter.label} placeholder={filter.placeholder} type={filter.type === "search" ? "text" : filter.type} value={value} onChange={(e) => onChange(e.target.value)} inputProps={{ min: filter.min, step: filter.step }} InputProps={filter.type === "search" ? { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } : undefined} />;
}

function DataTable({ rows, columns, empty, onRowClick, action }) {
  return <TableContainer className="data-table-wrap"><Table stickyHeader size="small" aria-label="Resultados">
    <TableHead><TableRow>{columns.map((column) => <TableCell key={column.key} align={column.align || "left"} sx={{ minWidth: column.width }}>{column.label}</TableCell>)}{action && <TableCell align="right" width={70}> </TableCell>}</TableRow></TableHead>
    <TableBody>{rows.map((row, index) => <TableRow hover key={row.InvoiceID ?? row.CustomerID ?? row.StockItemID ?? row.SupplierID ?? index} onClick={() => onRowClick?.(row)} className={onRowClick ? "clickable-row" : ""}>
      {columns.map((column) => <TableCell key={column.key} align={column.align || "left"} className={column.primary ? "primary-cell" : ""}><CellValue value={row[column.key]} column={column} /></TableCell>)}
      {action && <TableCell align="right" onClick={(e) => e.stopPropagation()}>{action(row)}</TableCell>}
    </TableRow>)}
      {!rows.length && <TableRow><TableCell colSpan={columns.length + (action ? 1 : 0)}><Box className="empty-state"><Box className="empty-state-icon"><SearchRounded /></Box><Typography fontWeight={700}>{empty || "Ejecuta el reporte para ver resultados."}</Typography><Typography variant="body2" color="text.secondary">Prueba cambiar los filtros o limpiar la búsqueda.</Typography></Box></TableCell></TableRow>}
    </TableBody>
  </Table></TableContainer>;
}

function CellValue({ value, column = {} }) {
  if (value === null || value === undefined || value === "") return <span className="muted-dash">—</span>;
  if (column.type === "credit") return <Chip size="small" label={value ? "Nota de crédito" : "Factura"} className={value ? "credit-chip" : "invoice-chip"} />;
  if (column.money) return currency(value);
  if (value instanceof Date || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value))) return dateDisplay(value);
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return Number(value).toLocaleString("es-CR", { maximumFractionDigits: 2 });
  return String(value);
}

function DetailDialog({ config, state, onClose, onEdit, onDelete, onRelated, busy }) {
  const isInvoice = config.path === "/invoices";
  if (!state) return null;
  const invoice = state.row?.invoice;
  const detail = isInvoice ? invoice : state.row;
  const listFields = detail ? Object.entries(detail).filter(([key]) => !key.endsWith("ID") || ["InvoiceID", "CustomerID", "SupplierID", "StockItemID", "DeliveryMethodID", "CustomerCategoryID"].includes(key)) : [];
  const title = detail?.CustomerName || detail?.SupplierName || detail?.StockItemName || `Factura ${detail?.InvoiceID || state.id || ""}`;
  return <Dialog open onClose={onClose} fullWidth maxWidth={isInvoice ? "lg" : "md"} PaperProps={{ className: "detail-dialog" }}>
    <DialogTitle className="detail-title"><Box><Typography className="eyebrow">DETALLE · {config.singular.toUpperCase()}</Typography><Typography variant="h4" fontWeight={800}>{state.loading ? "Cargando…" : title}</Typography></Box><IconButton onClick={onClose} aria-label="Cerrar"><CloseRounded /></IconButton></DialogTitle>
    <DialogContent dividers>{state.loading ? <Box sx={{ py: 8, textAlign: "center" }}><CircularProgress /></Box> : <>
      {isInvoice && detail?.IsCreditNote && <Alert severity="info" sx={{ mb: 2 }}>Nota de crédito · los importes netos aparecen con signo negativo.</Alert>}
      <Box className="detail-grid">{listFields.map(([key, value]) => <DetailField key={key} label={humanize(key)} value={value} />)}</Box>
      {isInvoice && <><Typography variant="h6" className="detail-section-title">Líneas de la factura</Typography><DataTable rows={state.row?.lines || []} onRowClick={(line) => onRelated("stock-items", line.StockItemID)} columns={[
        { key: "StockItemName", label: "Producto", primary: true }, { key: "Description", label: "Descripción" }, { key: "Quantity", label: "Cantidad", align: "right" },
        { key: "UnitPrice", label: "Precio unitario", align: "right", money: true }, { key: "TaxRate", label: "Impuesto", align: "right" },
        { key: "GrossLineTotal", label: "Total bruto", align: "right", money: true }, { key: "NetLineTotal", label: "Total neto", align: "right", money: true },
      ]} empty="Esta factura no tiene líneas." />{detail?.CustomerID && <Button sx={{ mt: 1 }} startIcon={<Groups2Rounded />} onClick={() => onRelated("customers", detail.CustomerID)}>Abrir cliente · {detail.CustomerName}</Button>}</>}
      {config.path === "/stock-items" && detail?.SupplierID && <Button sx={{ mt: 2 }} startIcon={<BusinessRounded />} onClick={() => onRelated("suppliers", detail.SupplierID)}>Abrir proveedor · {detail.SupplierName}</Button>}
      {(config.path === "/customers" || config.path === "/suppliers") && detail?.DeliveryLatitude != null && detail?.DeliveryLongitude != null && <Button sx={{ mt: 2 }} href={`https://www.openstreetmap.org/?mlat=${detail.DeliveryLatitude}&mlon=${detail.DeliveryLongitude}#map=14/${detail.DeliveryLatitude}/${detail.DeliveryLongitude}`} target="_blank" rel="noreferrer" variant="outlined">Ver ubicación en mapa</Button>}
    </>}</DialogContent>
    {!state.loading && <DialogActions className="detail-actions">{onDelete && <Button color="error" startIcon={<DeleteOutlineRounded />} onClick={onDelete} disabled={busy}>Eliminar</Button>}<Box sx={{ flex: 1 }} />{onEdit && <Button variant="contained" startIcon={<EditRounded />} onClick={onEdit} disabled={busy}>Editar cliente</Button>}<Button onClick={onClose}>Cerrar</Button></DialogActions>}
  </Dialog>;
}

function DetailField({ label, value }) {
  return <Box className="detail-field"><Typography variant="caption">{label}</Typography><Typography variant="body2" fontWeight={600}>{value === null || value === undefined || value === "" ? "—" : formatValue(value)}</Typography></Box>;
}

function CustomerFormDialog({ state, onClose, onSubmit, busy, lookups }) {
  const [values, setValues] = useState({});
  const [error, setError] = useState("");
  useEffect(() => { setValues(state?.values || {}); setError(""); }, [state]);
  if (!state) return null;
  const groups = [...new Set(CUSTOMER_FORM_FIELDS.map((field) => field.section))];
  const submit = async (event) => {
    event.preventDefault(); setError("");
    try { await onSubmit(values); } catch (e) { setError(e.message); }
  };
  return <Dialog open onClose={onClose} fullWidth maxWidth="md" PaperProps={{ component: "form", onSubmit: submit, className: "form-dialog" }}>
    <DialogTitle className="detail-title"><Box><Typography className="eyebrow">CLIENTES · {state.mode === "create" ? "NUEVA CUENTA" : "EDITAR CUENTA"}</Typography><Typography variant="h4" fontWeight={800}>{state.mode === "create" ? "Agregar cliente" : "Actualizar cliente"}</Typography></Box><IconButton onClick={onClose} disabled={busy}><CloseRounded /></IconButton></DialogTitle>
    <DialogContent dividers>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Alert severity="info" icon={<MoreHorizRounded />} sx={{ mb: 2 }}>Los identificadores de contacto y ciudad se capturan como IDs de WideWorldImporters. Usa referencias existentes de la base.</Alert>
      {groups.map((group) => <Box key={group} className="form-section"><Typography variant="subtitle1" fontWeight={800}>{group}</Typography><Box className="form-grid">{CUSTOMER_FORM_FIELDS.filter((field) => field.section === group).map((field) => <CustomerInput key={field.key} field={field} value={values[field.key]} lookups={lookups} onChange={(value) => setValues((old) => ({ ...old, [field.key]: value }))} />)}</Box></Box>)}
    </DialogContent>
    <DialogActions className="detail-actions"><Button onClick={onClose} disabled={busy}>Cancelar</Button><Box sx={{ flex: 1 }} />{busy && <CircularProgress size={22} />}<Button variant="contained" type="submit" disabled={busy}>{state.mode === "create" ? "Crear cliente" : "Guardar cambios"}</Button></DialogActions>
  </Dialog>;
}

function CustomerInput({ field, value, onChange, lookups }) {
  if (field.type === "lookup") {
    const options = lookups?.[field.lookup] || [];
    return <FormControl className="form-input" size="small" required={field.required}><InputLabel>{field.label}</InputLabel><Select label={field.label} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>{options.map((option) => <MenuItem key={option[field.id]} value={option[field.id]}>{option[field.name]}</MenuItem>)}</Select></FormControl>;
  }
  if (field.type === "boolean") return <FormControl className="form-input" size="small"><InputLabel>{field.label}</InputLabel><Select label={field.label} value={value === true ? "true" : value === false ? "false" : ""} onChange={(e) => onChange(e.target.value === "true")}><MenuItem value="true">Sí</MenuItem><MenuItem value="false">No</MenuItem></Select></FormControl>;
  return <TextField className="form-input" label={field.label} type={field.type || "text"} required={field.required} value={value ?? ""} onChange={(e) => onChange(e.target.value)} inputProps={{ maxLength: field.maxLength, min: field.min, step: field.step }} InputLabelProps={field.type === "date" ? { shrink: true } : undefined} />;
}

function emptyCustomer() {
  const values = {};
  CUSTOMER_FORM_FIELDS.forEach(({ key, type }) => { values[key] = type === "boolean" ? false : ""; });
  values.standardDiscountPercentage = "0";
  values.accountOpenedDate = new Date().toISOString().slice(0, 10);
  return values;
}

function customerFromDetail(row) {
  const map = {
    customerName: "CustomerName", customerCategoryId: "CustomerCategoryID", buyingGroupId: "BuyingGroupID", billToCustomerId: "BillToCustomerID",
    primaryContactPersonId: "PrimaryContactPersonID", alternateContactPersonId: "AlternateContactPersonID", phoneNumber: "PhoneNumber", faxNumber: "FaxNumber",
    websiteUrl: "WebsiteURL", deliveryMethodId: "DeliveryMethodID", deliveryCityId: "DeliveryCityID", deliveryAddressLine1: "DeliveryAddressLine1",
    deliveryAddressLine2: "DeliveryAddressLine2", deliveryPostalCode: "DeliveryPostalCode", deliveryLatitude: "DeliveryLatitude", deliveryLongitude: "DeliveryLongitude",
    postalCityId: "PostalCityID", postalAddressLine1: "PostalAddressLine1", postalAddressLine2: "PostalAddressLine2", postalPostalCode: "PostalPostalCode",
    paymentDays: "PaymentDays", accountOpenedDate: "AccountOpenedDate", creditLimit: "CreditLimit", standardDiscountPercentage: "StandardDiscountPercentage",
    isStatementSent: "IsStatementSent", isOnCreditHold: "IsOnCreditHold", deliveryRun: "DeliveryRun", runPosition: "RunPosition",
  };
  const values = {};
  for (const [key, source] of Object.entries(map)) {
    const value = row[source];
    values[key] = key === "accountOpenedDate" && value ? String(value).slice(0, 10) : value ?? "";
  }
  values.lastEditedBy = "";
  return values;
}

function customerPayload(values, update) {
  const payload = {};
  const intKeys = new Set(["customerCategoryId", "primaryContactPersonId", "deliveryMethodId", "deliveryCityId", "postalCityId", "paymentDays", "billToCustomerId", "buyingGroupId", "alternateContactPersonId"]);
  const decimalKeys = new Set(["creditLimit", "standardDiscountPercentage", "deliveryLatitude", "deliveryLongitude"]);
  const nullableKeys = new Set(["billToCustomerId", "buyingGroupId", "alternateContactPersonId", "creditLimit", "deliveryRun", "runPosition", "deliveryAddressLine2", "postalAddressLine2"]);
  for (const field of CUSTOMER_FORM_FIELDS) {
    const value = values[field.key];
    if (field.key === "lastEditedBy") continue;
    if (value === "" || value === null || value === undefined) {
      if (field.key === "deliveryLatitude" || field.key === "deliveryLongitude") { payload[field.key] = null; continue; }
      payload[field.key] = nullableKeys.has(field.key) ? null : null;
    } else if (field.type === "boolean") payload[field.key] = Boolean(value);
    else if (intKeys.has(field.key)) payload[field.key] = Number(value);
    else if (decimalKeys.has(field.key)) payload[field.key] = Number(value);
    else payload[field.key] = value;
  }
  if (values.lastEditedBy !== "" && values.lastEditedBy != null) payload.lastEditedBy = Number(values.lastEditedBy);
  if (!update) {
    // Omit fields whose procedure defaults should apply on creation.
    for (const key of ["buyingGroupId", "alternateContactPersonId", "creditLimit", "standardDiscountPercentage", "isStatementSent", "isOnCreditHold", "deliveryRun", "runPosition", "deliveryAddressLine2", "deliveryLatitude", "deliveryLongitude", "postalAddressLine2", "lastEditedBy"]) {
      if (values[key] === "" || values[key] === undefined) delete payload[key];
    }
    if (values.accountOpenedDate === "") payload.accountOpenedDate = null;
  }
  return payload;
}

function ReportsPage({ lookups }) {
  const [selectedId, setSelectedId] = useState(REPORTS[0].id);
  const selected = REPORTS.find((report) => report.id === selectedId);
  const [filters, setFilters] = useState({});
  const [years, setYears] = useState([]);
  const [rows, setRows] = useState([]);
  const [resultPage, setResultPage] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [yearsLoading, setYearsLoading] = useState(false);
  useEffect(() => {
    setFilters({}); setRows([]); setResultPage(0); setHasRun(false); setError("");
  }, [selectedId]);
  useEffect(() => {
    if (!selected.dataset) { setYears([]); return; }
    let live = true; setYearsLoading(true);
    queryApi("/reports/years", { dataset: selected.dataset }).then((response) => {
      if (live) setYears((response.data || []).map((row) => row.Year));
    }).catch((e) => { if (live) setError(e.message); }).finally(() => { if (live) setYearsLoading(false); });
    return () => { live = false; };
  }, [selected.dataset]);
  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setError(""); setResultPage(0); setHasRun(true);
    try {
      const params = {};
      for (const field of selected.filters) if (filters[field.key] !== "" && filters[field.key] !== undefined) params[field.key] = filters[field.key];
      const response = await queryApi(selected.endpoint, params);
      setRows(response.data || []);
    } catch (e) { setError(e.message); setRows([]); }
    finally { setLoading(false); }
  };
  const reportColumns = useMemo(() => rows.length ? Object.keys(rows[0]).map((key) => ({ key, label: REPORT_LABELS[key] || key, money: MONEY_KEYS.has(key), align: typeof rows[0][key] === "number" ? "right" : "left" })) : [], [rows]);

  return <>
    <PageHeader eyebrow="ANÁLISIS Y TENDENCIAS" title="Estadísticas" subtitle="Diez reportes calculados por SQL Server para respaldar tus decisiones." />
    <Box className="reports-layout">
      <Paper elevation={0} className="report-selector"><Typography className="eyebrow">REPORTES DISPONIBLES</Typography>{REPORTS.map((report, index) => <Button key={report.id} onClick={() => setSelectedId(report.id)} className={`report-choice ${selectedId === report.id ? "selected" : ""}`}><span className="report-index">{String(index + 1).padStart(2, "0")}</span><span className="report-choice-copy"><strong>{report.name}</strong><small>{report.group}</small></span><ChevronRightRounded className="report-chevron" /></Button>)}</Paper>
      <Box className="report-workspace"><Paper elevation={0} className="report-intro"><Box className="report-intro-icon"><BarChartRounded /></Box><Box><Typography className="eyebrow">{selected.group} · REPORTE {String(REPORTS.indexOf(selected) + 1).padStart(2, "0")}</Typography><Typography variant="h4" fontWeight={800}>{selected.name}</Typography><Typography color="text.secondary">{selected.subtitle}</Typography></Box></Paper>
        <Paper component="form" onSubmit={submit} elevation={0} className="report-filter-card"><Box className="report-filter-head"><Box><Typography variant="subtitle1" fontWeight={800}>Parámetros de consulta</Typography><Typography variant="body2" color="text.secondary">Los filtros se aplican en SQL Server.</Typography></Box>{yearsLoading && <CircularProgress size={19} />}</Box><Box className="report-filter-grid">{selected.filters.map((filter) => <ReportFilter key={filter.key} filter={filter} value={filters[filter.key] || ""} years={years} lookups={lookups} onChange={(value) => setFilters((old) => ({ ...old, [filter.key]: value }))} />)}</Box><Box className="report-filter-actions"><Button type="button" color="inherit" onClick={() => { setFilters({}); setRows([]); setResultPage(0); setHasRun(false); }}>Limpiar</Button><Button type="submit" variant="contained" startIcon={<ShowChartRounded />} disabled={loading || yearsLoading}>{loading ? "Consultando…" : "Ejecutar reporte"}</Button></Box></Paper>
        {selected.id === "inventory-rotation" && <Alert severity="info" className="formula-note">Rotación (días) = inventario promedio ponderado por tiempo × días del año ÷ unidades netas vendidas. Los productos sin ventas aparecen sin valor de rotación.</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        <Paper elevation={0} className="table-card report-results"><Box className="table-card-head"><Box><Typography variant="h6">Resultados</Typography><Typography variant="body2" color="text.secondary">{hasRun ? `${rows.length.toLocaleString("es-CR")} filas devueltas por el procedimiento` : "Configura los filtros y ejecuta el reporte"}</Typography></Box>{hasRun && <Chip className="result-chip" label={rows.length ? "CONSULTA COMPLETA" : "SIN RESULTADOS"} />}</Box>{loading && <LinearProgress />}<DataTable rows={rows.slice(resultPage * REPORT_PAGE_SIZE, (resultPage + 1) * REPORT_PAGE_SIZE)} columns={reportColumns} empty={hasRun ? "El procedimiento no devolvió filas." : "Ejecuta el reporte para ver los resultados."} />{rows.length > 0 && <TablePagination component="div" count={rows.length} page={resultPage} onPageChange={(_event, nextPage) => setResultPage(nextPage)} rowsPerPage={REPORT_PAGE_SIZE} rowsPerPageOptions={[REPORT_PAGE_SIZE]} labelRowsPerPage="Filas por página" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />}{rows.length > 0 && <Typography className="sql-source-note">Los valores se recibieron directamente del procedimiento almacenado.</Typography>}</Paper>
      </Box>
    </Box>
  </>;
}

function ReportFilter({ filter, value, years, lookups, onChange }) {
  if (filter.type === "year") return <FormControl size="small" className="filter-control"><InputLabel>{filter.label}</InputLabel><Select value={value} label={filter.label} onChange={(e) => onChange(e.target.value)} required={filter.required}><MenuItem value=""><em>{filter.required ? "Selecciona un año" : "Todos"}</em></MenuItem>{years.map((year) => <MenuItem key={year} value={year}>{year}</MenuItem>)}</Select></FormControl>;
  if (filter.type === "month") return <FormControl size="small" className="filter-control"><InputLabel>{filter.label}</InputLabel><Select value={value} label={filter.label} onChange={(e) => onChange(e.target.value)}><MenuItem value=""><em>Todos</em></MenuItem>{MONTHS.map((month, index) => <MenuItem key={month} value={index + 1}>{month}</MenuItem>)}</Select></FormControl>;
  if (filter.type === "lookup") return <FilterControl filter={filter} value={value} lookups={lookups} onChange={onChange} />;
  return <TextField className="filter-control" label={filter.label} type={filter.type === "text" ? "text" : "number"} value={value} onChange={(e) => onChange(e.target.value)} inputProps={{ min: filter.min }} />;
}

function currency(value) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 2 }).format(Number(value));
}

function dateDisplay(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : new Intl.DateTimeFormat("es-CR", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatValue(value) {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (typeof value === "number") return Number(value).toLocaleString("es-CR", { maximumFractionDigits: 4 });
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return dateDisplay(value);
  return String(value);
}

function humanize(value) {
  return String(value).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/ID$/, "ID").replace(/URL$/, "URL");
}

export default App;

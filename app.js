const storageKey = "pcfix-system-v1";
const apiStorageKey = "pcfix-api-config-v1";
const apiSessionKey = "pcfix-api-session-v1";
const facebookReviewUrl = "https://www.facebook.com/pcfixcomitan";
const productionApiBaseUrl = "https://pcfix-backend.onrender.com";
const defaultApiEmail = "admin@pcfix.local";
const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dateFormat = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });
const defaultWarrantyTerms = "Garantia de 90 dias sobre la reparacion realizada y las refacciones instaladas por PCFIX, contados a partir de la entrega del equipo. Para hacerla valida, el cliente debe presentar esta orden y permitir revision tecnica. La garantia cubre unicamente la falla corregida o la pieza instalada; no cubre danos por humedad, golpes, descargas electricas, mal uso, software, virus, accesorios externos, manipulacion de terceros, equipos abiertos fuera de PCFIX, sellos retirados, piezas proporcionadas por el cliente ni fallas distintas a las diagnosticadas. Cualquier trabajo adicional requiere diagnostico y autorizacion previa.";
const inventoryCategories = [
  "Pantallas y display",
  "Baterias",
  "Puertos de carga y conectores",
  "Cables flex y antenas",
  "Camaras, microfonos y altavoces",
  "Tarjetas madre y placas",
  "RAM y almacenamiento",
  "Cargadores, fuentes y adaptadores",
  "Teclados, touchpads y botones",
  "Carcasas, tapas y bisagras",
  "Ventilacion y enfriamiento",
  "Adhesivos, sellos y tornilleria",
  "Herramientas de apertura",
  "Microsoldadura y soldadura",
  "Limpieza, ESD y seguridad",
  "Accesorios",
  "Consumibles"
];
const commercialDeviceCatalog = {
  Apple: [
    "iPhone 17 Pro Max",
    "iPhone 17 Pro",
    "iPhone 17",
    "iPhone Air",
    "iPhone 17e",
    "iPhone 16 Pro Max",
    "iPhone 16 Pro",
    "iPhone 16 Plus",
    "iPhone 16",
    "iPhone 16e",
    "iPhone 15 Pro Max",
    "iPhone 15 Pro",
    "iPhone 15 Plus",
    "iPhone 15",
    "MacBook Air 13 M4",
    "MacBook Air 15 M4",
    "MacBook Pro 14 M4",
    "MacBook Pro 16 M4",
    "iPad Pro 11 M4",
    "iPad Pro 13 M4",
    "iPad Air 11 M3",
    "iPad Air 13 M3"
  ],
  Samsung: [
    "Galaxy S26 Ultra",
    "Galaxy S26+",
    "Galaxy S26",
    "Galaxy S25 Ultra",
    "Galaxy S25+",
    "Galaxy S25",
    "Galaxy S25 FE",
    "Galaxy Z Fold 7",
    "Galaxy Z Flip 7",
    "Galaxy Z Flip 7 FE",
    "Galaxy A56 5G",
    "Galaxy A36 5G",
    "Galaxy A26 5G",
    "Galaxy A17 5G",
    "Galaxy A16",
    "Galaxy A07",
    "Galaxy M56 5G",
    "Galaxy M36 5G",
    "Galaxy Book5 Pro",
    "Galaxy Book5 360"
  ],
  Xiaomi: [
    "Xiaomi 15T Pro",
    "Xiaomi 15T",
    "Xiaomi 15 Ultra",
    "Xiaomi 15",
    "Xiaomi 14T Pro",
    "Xiaomi 14T",
    "Redmi Note 15 Pro+",
    "Redmi Note 15 Pro",
    "Redmi Note 15",
    "Redmi 15 5G",
    "Redmi 15",
    "Redmi 15C",
    "POCO F7 Ultra",
    "POCO F7 Pro",
    "POCO X7 Pro",
    "POCO M7 Pro 5G"
  ],
  Motorola: [
    "Razr Ultra 2025",
    "Razr 2025",
    "Edge 60 Pro",
    "Edge 60",
    "Edge 60 Fusion",
    "Moto G 2026",
    "Moto G Power 5G 2026",
    "Moto G Stylus 5G 2025",
    "Moto G 2025",
    "Moto G Power 5G 2025"
  ],
  Google: ["Pixel 10 Pro Fold", "Pixel 10 Pro XL", "Pixel 10 Pro", "Pixel 10", "Pixel 10a", "Pixel 9 Pro Fold", "Pixel 9 Pro XL", "Pixel 9 Pro", "Pixel 9", "Pixel 9a"],
  Dell: [
    "XPS 13",
    "XPS 14",
    "XPS 16",
    "Dell 14 Plus",
    "Dell 16 Plus",
    "Inspiron 14",
    "Inspiron 15",
    "Inspiron 16",
    "Latitude 5450",
    "Latitude 7450",
    "Precision 3590",
    "Alienware m16",
    "Alienware x16"
  ],
  HP: [
    "Spectre x360 14",
    "Spectre x360 16",
    "ENVY x360 14",
    "ENVY x360 16",
    "Pavilion 14",
    "Pavilion 15",
    "Pavilion Plus 14",
    "Victus 15",
    "OMEN 16",
    "EliteBook 840",
    "ProBook 450"
  ],
  Lenovo: [
    "ThinkPad X1 Carbon",
    "ThinkPad X1 Yoga",
    "ThinkPad T14",
    "ThinkPad T16",
    "ThinkPad E14",
    "IdeaPad Slim 3",
    "IdeaPad Slim 5",
    "Yoga Slim 7",
    "Yoga 7i",
    "Legion 5",
    "Legion Pro 7",
    "LOQ 15"
  ],
  ASUS: ["Zenbook 14", "Zenbook S 14", "Vivobook 15", "Vivobook S 14", "ROG Zephyrus G14", "ROG Strix G16", "TUF Gaming A15", "ExpertBook B5"],
  Acer: ["Aspire 3", "Aspire 5", "Swift Go 14", "Swift X 14", "Nitro V 15", "Nitro 16", "Predator Helios Neo 16", "TravelMate P4"],
  MSI: ["Modern 14", "Modern 15", "Prestige 14", "Katana 15", "Cyborg 15", "Stealth 16", "Raider 18", "Vector 16"],
  Huawei: ["Pura 70 Ultra", "Pura 70 Pro", "Mate 70 Pro", "Nova 13 Pro", "MateBook D 14", "MateBook D 16", "MateBook X Pro"],
  HONOR: ["Magic7 Pro", "Magic7 Lite", "Magic V3", "HONOR 400 Pro", "HONOR 400", "MagicBook X14", "MagicBook X16"],
  OPPO: ["Find X8 Pro", "Find X8", "Reno13 Pro", "Reno13", "A5 Pro 5G", "A3"],
  vivo: ["X200 Pro", "X200", "V50", "V40", "Y39 5G", "Y29 5G"],
  realme: ["GT 7 Pro", "GT 6", "13 Pro+", "13 Pro", "C75", "Note 60"],
  OnePlus: ["OnePlus 13", "OnePlus 13R", "OnePlus 12", "Nord 4", "Nord CE4 Lite"],
  Nokia: ["G42 5G", "C32", "C22"],
  "Nothing / CMF": ["Nothing Phone (3a) Pro", "Nothing Phone (3a)", "Nothing Phone (2a)", "CMF Phone 2 Pro", "CMF Phone 1"]
};

const defaultState = {
  settings: {
    businessName: "PCFIX COMITAN",
    businessPhone: "9631234567",
    businessAddress: "Comitan de Dominguez, Chiapas",
    whatsappTemplate:
      "Hola {cliente}, tu equipo {equipo} con folio {folio} esta en estado: {estado}. Total: {total}. Gracias por confiar en PCFIX.",
    theme: {
      brand: "#0B3B63",
      brandStrong: "#082C4A",
      sidebar: "#FFFFFF",
      page: "#F5F7FA",
      panel: "#ffffff",
      accent: "#20C7D8"
    }
  },
  clients: [],
  orders: [],
  inventory: [],
  suppliers: [],
  appointments: [],
  purchases: [],
  payments: [],
  inventoryMovements: [],
  warrantyClaims: [],
  auditLog: []
};

let state = loadState();
let apiConfig = loadApiConfig();
let activeView = "dashboard";
let syncTimer = null;
let isPullingFromBackend = false;
let isRefreshingFromBackend = false;
let lastBackendRefreshAt = 0;
let publicPortalContext = null;
let syncQueue = [];
let isSyncingNow = false;
let purchaseDraftItems = [];
let reconciliationTimer = null;
let backendRefreshTimer = null;

const ids = [
  "loginScreen",
  "loginForm",
  "loginApiBaseUrl",
  "loginEmail",
  "loginPassword",
  "brandName",
  "today",
  "globalSearch",
  "pageTitle",
  "pageSubtitle",
  "metricActive",
  "metricReady",
  "metricRevenue",
  "metricLowStock",
  "metricMargin",
  "priorityStrip",
  "businessHealthScore",
  "healthMargin",
  "healthMarginDetail",
  "healthReceivables",
  "healthReceivablesDetail",
  "healthRisk",
  "healthRiskDetail",
  "healthWarranty",
  "healthWarrantyDetail",
  "operationsInsights",
  "decisionSummary",
  "revenueChart",
  "statusChart",
  "deviceChart",
  "stockChart",
  "recentOrders",
  "lowStockList",
  "upcomingAppointments",
  "pendingPurchases",
  "clientForm",
  "clientId",
  "clientName",
  "clientPhone",
  "clientEmail",
  "clientAddress",
  "resetClientForm",
  "clientList",
  "clientCount",
  "orderForm",
  "orderId",
  "orderClient",
  "orderDevice",
  "orderDeviceModels",
  "orderTechnician",
  "orderSerial",
  "orderStatus",
  "orderDeposit",
  "orderTotal",
  "quickIssue",
  "orderIssue",
  "orderNotes",
  "orderAccessories",
  "orderPhysicalState",
  "orderPasscode",
  "patternSize",
  "clearPattern",
  "patternGrid",
  "patternValue",
  "orderEvidence",
  "addEvidencePhoto",
  "evidencePhotoInput",
  "evidencePhotoList",
  "orderWarrantyDays",
  "orderWarrantyTerms",
  "orderApproved",
  "orderPartSearch",
  "orderPartOptions",
  "addOrderPart",
  "orderParts",
  "quotePartName",
  "quoteSupplier",
  "quoteSupplierBtn",
  "signaturePad",
  "signatureData",
  "clearSignature",
  "resetOrderForm",
  "cancelOrderForm",
  "newOrderInlineBtn",
  "orderStatusForm",
  "statusOrderId",
  "statusOrderSummary",
  "statusOnlySelect",
  "addStatusEvidencePhoto",
  "statusEvidencePhotoInput",
  "statusEvidencePhotoList",
  "cancelStatusEdit",
  "orderList",
  "orderCount",
  "finishedOrderList",
  "finishedOrderCount",
  "inventoryForm",
  "itemId",
  "itemBrand",
  "itemModel",
  "deviceBrands",
  "deviceModels",
  "itemCategory",
  "inventoryCategories",
  "itemStock",
  "itemMin",
  "itemCost",
  "itemSubdealerPrice",
  "itemPrice",
  "resetInventoryForm",
  "inventoryTable",
  "inventoryCategoryFilter",
  "exportInventory",
  "supplierForm",
  "supplierId",
  "supplierName",
  "supplierContact",
  "supplierPhone",
  "supplierEmail",
  "supplierCategory",
  "supplierNotes",
  "resetSupplierForm",
  "supplierList",
  "supplierCount",
  "appointmentForm",
  "appointmentId",
  "appointmentClient",
  "appointmentOrder",
  "appointmentDate",
  "appointmentTime",
  "appointmentType",
  "appointmentNotes",
  "resetAppointmentForm",
  "appointmentList",
  "appointmentCount",
  "purchaseForm",
  "purchaseId",
  "purchaseSupplier",
  "purchaseOrderLink",
  "purchasePart",
  "purchaseQty",
  "purchaseCost",
  "addPurchaseItem",
  "purchaseItemsList",
  "purchaseStatus",
  "purchaseNotes",
  "resetPurchaseForm",
  "purchaseList",
  "purchaseCount",
  "paymentForm",
  "paymentId",
  "paymentOrder",
  "paymentAmount",
  "paymentMethod",
  "paymentReference",
  "resetPaymentForm",
  "paymentList",
  "cashSummary",
  "warrantyForm",
  "warrantyId",
  "warrantyOrder",
  "warrantyReason",
  "warrantyResolution",
  "warrantyStatus",
  "warrantyCost",
  "resetWarrantyForm",
  "warrantyList",
  "warrantyCount",
  "clientPortalForm",
  "portalFolio",
  "portalPhone",
  "portalStatusPill",
  "clientPortalResult",
  "settingsForm",
  "businessName",
  "businessPhone",
  "businessAddress",
  "whatsappTemplate",
  "themeBrand",
  "themeBrandStrong",
  "themeSidebar",
  "themePage",
  "themePanel",
  "themeAccent",
  "exportBackup",
  "exportReports",
  "apiStatus",
  "apiBaseUrl",
  "apiEmail",
  "apiPassword",
  "apiLogin",
  "apiPull",
  "apiDisconnect",
  "userCount",
  "newUserName",
  "newUserEmail",
  "newUserPassword",
  "newUserRole",
  "createUserBtn",
  "refreshUsersBtn",
  "userList",
  "auditList",
  "auditCount",
  "movementList",
  "movementCount",
  "newOrderBtn",
  "pdfDialog",
  "printArea",
  "closePdf",
  "printPdf",
  "emptyTemplate"
];

const el = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));

document.addEventListener("DOMContentLoaded", () => {
  purgeLegacyBrowserStorage();
  wireEvents();
  registerServiceWorker();
  el.today.textContent = dateFormat.format(new Date());
  applyTheme();
  hydrateSettingsForm();
  hydrateApiForm();
  hydratePortalFromHash();
  render();
  startBackgroundServices();
  enforceAccessMode();
  window.addEventListener("online", () => {
    updateApiStatus();
    if (apiConfig.token) cloudStartupSync();
  });
  window.addEventListener("focus", () => refreshBackendData({ silent: true, minInterval: 1000 }));
  window.addEventListener("offline", updateApiStatus);
});

function purgeLegacyBrowserStorage() {
  localStorage.removeItem("pcfix-system-v1");
  localStorage.removeItem("pcfix-pending-sync-v1");
  localStorage.removeItem("pcfix-local-snapshots-v1");
}

function startBackgroundServices() {
  reconcileReceivedPurchasesToOrders({ renderAfter: true, persistAfter: false });
  clearInterval(reconciliationTimer);
  reconciliationTimer = setInterval(() => {
    reconcileReceivedPurchasesToOrders({ renderAfter: true, persistAfter: false });
  }, 45000);
  clearInterval(backendRefreshTimer);
  backendRefreshTimer = setInterval(() => {
    refreshBackendData({ silent: true, minInterval: 10000 });
  }, 15000);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
  navigator.serviceWorker.register("./service-worker.js").catch(() => {
    // La app sigue funcionando aunque el navegador no permita cache instalable.
  });
}

function wireEvents() {
  bindSubmit(el.loginForm, loginFromScreen, "No se pudo iniciar sesion");
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  document.querySelectorAll("[data-view-link]").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.viewLink));
  });

  el.globalSearch.addEventListener("input", render);
  el.newOrderBtn.addEventListener("click", showNewOrderForm);

  bindSubmit(el.clientForm, saveClient);
  el.resetClientForm.addEventListener("click", resetClientForm);
  bindSubmit(el.orderForm, saveOrder);
  el.orderDevice.addEventListener("input", updateOrderPartContext);
  el.orderIssue.addEventListener("input", updateOrderPartSuggestion);
  el.orderNotes.addEventListener("input", updateOrderPartSuggestion);
  el.resetOrderForm.addEventListener("click", resetOrderForm);
  el.cancelOrderForm.addEventListener("click", hideOrderForm);
  el.newOrderInlineBtn.addEventListener("click", showNewOrderForm);
  bindSubmit(el.orderStatusForm, saveOrderStatus);
  el.cancelStatusEdit.addEventListener("click", hideStatusEditor);
  el.addStatusEvidencePhoto?.addEventListener("click", () => el.statusEvidencePhotoInput?.click());
  el.statusEvidencePhotoInput?.addEventListener("change", addStatusEvidencePhotos);
  el.quickIssue.addEventListener("change", applyQuickIssue);
  el.patternSize.addEventListener("change", () => setPattern([], Number(el.patternSize.value)));
  el.clearPattern.addEventListener("click", () => setPattern([], Number(el.patternSize.value)));
  wireSignaturePad();
  el.clearSignature.addEventListener("click", clearSignaturePad);
  el.addEvidencePhoto.addEventListener("click", () => el.evidencePhotoInput.click());
  el.evidencePhotoInput.addEventListener("change", addEvidencePhotos);
  el.addOrderPart.addEventListener("click", addOrderPartFromSearch);
  el.orderPartSearch.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addOrderPartFromSearch();
    }
  });
  el.quoteSupplierBtn.addEventListener("click", quoteMissingPart);
  bindSubmit(el.inventoryForm, saveInventoryItem);
  el.resetInventoryForm.addEventListener("click", resetInventoryForm);
  el.inventoryCategoryFilter.addEventListener("change", renderInventory);
  el.itemBrand.addEventListener("input", renderDeviceModels);
  el.itemCost.addEventListener("input", updateSubdealerPrice);
  bindSubmit(el.supplierForm, saveSupplier);
  el.resetSupplierForm.addEventListener("click", resetSupplierForm);
  bindSubmit(el.appointmentForm, saveAppointment);
  el.resetAppointmentForm.addEventListener("click", resetAppointmentForm);
  bindSubmit(el.purchaseForm, savePurchase);
  el.addPurchaseItem.addEventListener("click", addPurchaseItemFromForm);
  el.resetPurchaseForm.addEventListener("click", resetPurchaseForm);
  bindSubmit(el.paymentForm, savePayment);
  el.resetPaymentForm.addEventListener("click", resetPaymentForm);
  bindSubmit(el.warrantyForm, saveWarrantyClaim);
  el.resetWarrantyForm.addEventListener("click", resetWarrantyForm);
  bindSubmit(el.clientPortalForm, searchClientPortal, "No se pudo consultar");
  bindSubmit(el.settingsForm, saveSettings);
  document.querySelectorAll("[data-palette]").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.palette));
  });
  el.exportInventory.addEventListener("click", exportInventoryCsv);
  el.exportBackup.addEventListener("click", exportBackup);
  el.exportReports.addEventListener("click", exportReportsCsv);
  el.apiLogin.addEventListener("click", loginBackend);
  el.apiPull.addEventListener("click", pullBackendData);
  el.apiDisconnect.addEventListener("click", disconnectBackend);
  el.createUserBtn.addEventListener("click", createBackendUser);
  el.refreshUsersBtn.addEventListener("click", loadBackendUsers);
  el.closePdf.addEventListener("click", () => el.pdfDialog.close());
  el.printPdf.addEventListener("click", () => window.print());
}

function bindSubmit(form, handler, errorPrefix = "No se pudo guardar") {
  form.addEventListener("submit", async (event) => {
    try {
      await handler(event);
    } catch (error) {
      console.error(error);
      alert(`${errorPrefix}: ${error.message || error}`);
      updateApiStatus();
    }
  });
}

function loadState() {
  return structuredClone(defaultState);
}

function loadApiConfig() {
  try {
    const storedConfig = JSON.parse(localStorage.getItem(apiStorageKey) || "{}");
    const session = JSON.parse(sessionStorage.getItem(apiSessionKey) || "{}");
    return {
      baseUrl: productionApiBaseUrl,
      email: defaultApiEmail,
      token: "",
      user: null,
      serverMode: true,
      ...storedConfig,
      token: session.token || "",
      user: session.user || null,
      serverMode: true
    };
  } catch {
    return { baseUrl: productionApiBaseUrl, email: defaultApiEmail, token: "", user: null, serverMode: true };
  }
}

function saveApiConfig() {
  apiConfig.serverMode = true;
  const { token: _token, user: _user, serverMode: _serverMode, ...persistentConfig } = apiConfig;
  localStorage.setItem(apiStorageKey, JSON.stringify(persistentConfig));
  if (apiConfig.token) {
    sessionStorage.setItem(apiSessionKey, JSON.stringify({ token: apiConfig.token, user: apiConfig.user }));
  } else {
    sessionStorage.removeItem(apiSessionKey);
  }
}

function saveSyncQueue() {
  syncQueue = syncQueue.slice(-50);
}

function markPendingSync(reason = "Cambio local") {
  if (isPullingFromBackend) return;
  const pending = {
    id: id("sync"),
    reason,
    at: new Date().toISOString()
  };
  syncQueue = [...syncQueue, pending].slice(-50);
  saveSyncQueue();
  updateApiStatus();
}

function clearPendingSync() {
  syncQueue = [];
  saveSyncQueue();
  updateApiStatus();
}

function countBusinessRecords(source = state) {
  return ["clients", "orders", "inventory", "suppliers", "appointments", "purchases", "payments", "warrantyClaims"]
    .reduce((sum, key) => sum + (Array.isArray(source[key]) ? source[key].filter((item) => !item.archived).length : 0), 0);
}

function isLocalStateEmpty() {
  return countBusinessRecords() === 0;
}

function isLegacyTheme(theme) {
  return theme?.brand === "#0f766e" && theme?.sidebar === "#17202a";
}

function isPreviousPcfixTheme(theme) {
  return theme?.brand === "#0B3B63" && theme?.sidebar === "#0B3B63" && theme?.accent === "#20C7D8";
}

function persist() {
  markPendingSync();
  scheduleServerSync(true);
}

async function persistNow() {
  markPendingSync();
  const ok = await pushLocalData(false, { silent: true, notifyErrors: true });
  if (!ok) throw new Error("El servidor no confirmo el guardado.");
}

function persistLocalOnly() {
  // La BD es la fuente de verdad. Solo mantenemos estado en memoria.
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizePhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `52${digits}`;
  return digits;
}

function query() {
  return el.globalSearch.value.trim().toLowerCase();
}

function matches(value) {
  const q = query();
  return !q || String(value).toLowerCase().includes(q);
}

function showView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.getElementById(`${view}View`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });

  const copy = {
    dashboard: ["Panel administrativo", "Control de reparaciones, clientes e inventario."],
    clients: ["Clientes", "Registro, busqueda y contacto directo por WhatsApp."],
    orders: ["Ordenes de reparacion", "Diagnostico, estados, pagos, PDF y seguimiento."],
    inventory: ["Inventario", "Control de refacciones, costos, precios y stock minimo."],
    suppliers: ["Proveedores", "Directorio de contactos para cotizar refacciones."],
    appointments: ["Agenda", "Citas, entregas y recordatorios de seguimiento."],
    purchases: ["Compras", "Cotizaciones y ordenes de compra a proveedores."],
    cash: ["Caja", "Pagos, saldos y corte del dia."],
    warranties: ["Garantias", "Reclamos, resoluciones y costos absorbidos."],
    clientPortal: ["Portal cliente", "Consulta publica de seguimiento por folio y telefono."],
    settings: ["Configuracion", "Datos del negocio, conexion en linea y usuarios."]
  };
  el.pageTitle.textContent = copy[view][0];
  el.pageSubtitle.textContent = copy[view][1];
  if (view !== "clientPortal") refreshBackendData({ silent: true, minInterval: 3000 });
}

function render() {
  el.brandName.textContent = state.settings.businessName || "PCFIX";
  renderDashboard();
  renderDecisionCharts();
  renderClients();
  renderOrderSelectors();
  renderOrders();
  renderSupplierSelectors();
  renderSuppliers();
  renderAppointmentSelectors();
  renderAppointments();
  renderPurchaseSelectors();
  renderPurchases();
  renderPaymentSelectors();
  renderPayments();
  renderWarrantySelectors();
  renderWarrantyClaims();
  renderAuditLog();
  renderInventoryMovements();
  renderDeviceBrands();
  renderInventoryCategories();
  renderInventory();
  renderPatternGrid();
}

function hydratePortalFromHash() {
  const hash = location.hash || "";
  if (!hash.startsWith("#seguimiento")) return;
  const queryText = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(queryText);
  const folio = params.get("folio");
  const api = params.get("api");
  publicPortalContext = {
    folio: folio || "",
    code: params.get("code") || "",
    apiBaseUrl: api ? api.replace(/\/$/, "") : resolvePublicApiBaseUrl()
  };
  if (folio) el.portalFolio.value = folio;
  document.body.classList.add("public-portal-mode");
  showView("clientPortal");
  setTimeout(() => searchClientPortal(), 50);
}

function renderDashboard() {
  const activeOrders = state.orders.filter((order) => !order.archived && !["Entregado", "Cancelado"].includes(order.status));
  const readyOrders = state.orders.filter((order) => !order.archived && order.status === "Listo");
  const revenue = state.orders
    .filter((order) => !order.archived && order.status !== "Cancelado")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const margin = state.orders
    .filter((order) => !order.archived && order.status !== "Cancelado")
    .reduce((sum, order) => sum + getOrderMargin(order), 0);
  const lowStock = state.inventory.filter((item) => !item.archived && Number(item.stock) <= Number(item.min));

  el.metricActive.textContent = activeOrders.length;
  el.metricReady.textContent = readyOrders.length;
  el.metricRevenue.textContent = money.format(revenue);
  el.metricLowStock.textContent = lowStock.length;
  el.metricMargin.textContent = money.format(margin);
  renderPriorityStrip({ activeOrders, readyOrders, lowStock, revenue, margin });
  renderOperationsCenter({ activeOrders, readyOrders, lowStock, revenue, margin });

  const recent = [...state.orders]
    .filter((order) => !order.archived)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  el.recentOrders.innerHTML = recent.length
    ? recent.map((order) => {
        const client = getClient(order.clientId);
        return `<tr>
          <td>${escapeHtml(order.folio)}</td>
          <td>${escapeHtml(client?.name || "Sin cliente")}</td>
          <td>${escapeHtml(order.device)}</td>
          <td><span class="status ${statusClass(order.status)}">${escapeHtml(order.status)}</span></td>
          <td>${money.format(Number(order.total || 0))}</td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="6">${emptyHtml()}</td></tr>`;

  el.lowStockList.innerHTML = lowStock.length
    ? lowStock.map((item) => `<div class="stock-card">
        <strong>${escapeHtml(item.name)}</strong>
        <div class="record-meta">${escapeHtml(item.category)} | Stock ${item.stock} / minimo ${item.min}</div>
      </div>`).join("")
    : emptyHtml("Inventario estable", "No hay articulos por debajo del minimo.");

  const upcoming = [...state.appointments]
    .filter((appointment) => !appointment.archived && !isPastAppointment(appointment))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
    .slice(0, 4);
  el.upcomingAppointments.innerHTML = upcoming.length
    ? upcoming.map((appointment) => {
        const client = getClient(appointment.clientId);
        return `<div class="stock-card">
          <strong>${escapeHtml(appointment.type)} | ${escapeHtml(appointment.date)} ${escapeHtml(appointment.time || "")}</strong>
          <div class="record-meta">${escapeHtml(client?.name || "Sin cliente")} | ${escapeHtml(appointment.notes || "Sin notas")}</div>
        </div>`;
      }).join("")
    : emptyHtml("Sin citas proximas", "Agenda recepciones, entregas o seguimientos.");

  const pendingPurchases = state.purchases
    .filter((purchase) => !purchase.archived && !["Recibido", "Cancelado"].includes(purchase.status))
    .slice(0, 4);
  el.pendingPurchases.innerHTML = pendingPurchases.length
    ? pendingPurchases.map((purchase) => {
        const supplier = state.suppliers.find((item) => item.id === purchase.supplierId);
        return `<div class="stock-card">
          <strong>${escapeHtml(getPurchaseSummary(purchase))}</strong>
          <div class="record-meta">${escapeHtml(purchase.status)} | ${escapeHtml(supplier?.name || "Sin proveedor")} | ${normalizePurchaseItems(purchase).length} producto(s)</div>
        </div>`;
      }).join("")
    : emptyHtml("Sin compras pendientes", "Las compras recibidas o canceladas no aparecen aqui.");
}

function renderOperationsCenter({ activeOrders, readyOrders, lowStock, revenue, margin }) {
  const activeBusinessOrders = state.orders.filter((order) => !order.archived && order.status !== "Cancelado");
  const receivables = activeBusinessOrders.reduce((sum, order) => sum + getOrderBalance(order), 0);
  const warrantyCost = state.warrantyClaims
    .filter((claim) => !claim.archived && claim.status !== "Rechazada")
    .reduce((sum, claim) => sum + Number(claim.cost || 0), 0);
  const pendingPurchases = state.purchases.filter((purchase) => !purchase.archived && !["Recibido", "Cancelado"].includes(purchase.status));
  const staleOrders = activeOrders.filter((order) => daysSince(order.updatedAt || order.createdAt) >= 5);
  const unapprovedOrders = activeOrders.filter((order) => !order.approved);
  const negativeMarginOrders = activeBusinessOrders.filter((order) => getOrderMargin(order) < 0);
  const marginRate = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
  const riskCount = lowStock.length + staleOrders.length + pendingPurchases.length + negativeMarginOrders.length + unapprovedOrders.length;
  const score = Math.max(0, Math.min(100, 100
    - Math.min(35, lowStock.length * 4)
    - Math.min(20, staleOrders.length * 5)
    - Math.min(15, pendingPurchases.length * 3)
    - Math.min(20, negativeMarginOrders.length * 10)
    - Math.min(10, unapprovedOrders.length * 2)
    + (marginRate >= 35 ? 5 : 0)));

  el.businessHealthScore.textContent = `${score}%`;
  el.businessHealthScore.className = `count-pill ${score < 70 ? "danger-pill" : score < 85 ? "warn-pill" : "ok-pill"}`;
  el.healthMargin.textContent = `${marginRate}%`;
  el.healthMarginDetail.textContent = revenue ? `${money.format(margin)} sobre ${money.format(revenue)}` : "Sin ventas calculadas";
  el.healthReceivables.textContent = money.format(receivables);
  el.healthReceivablesDetail.textContent = receivables ? "Saldo pendiente por cobrar" : "Sin saldos pendientes";
  el.healthRisk.textContent = riskCount;
  el.healthRiskDetail.textContent = riskCount ? "Alertas requieren revision" : "Sin alertas criticas";
  el.healthWarranty.textContent = money.format(warrantyCost);
  el.healthWarrantyDetail.textContent = warrantyCost ? "Impacto de garantias" : "Sin costo absorbido";

  const insights = buildOperationalInsights({
    readyOrders,
    lowStock,
    pendingPurchases,
    staleOrders,
    unapprovedOrders,
    negativeMarginOrders,
    receivables,
    marginRate,
    warrantyCost
  });
  el.operationsInsights.innerHTML = insights.length
    ? insights.map((item) => `<div class="insight-item ${item.tone}">
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </div>`).join("")
    : `<div class="insight-item ok"><strong>Operacion estable</strong><span>No hay riesgos importantes detectados.</span></div>`;
}

function buildOperationalInsights(data) {
  const insights = [];
  if (data.readyOrders.length) {
    insights.push({ tone: "ok", title: "Entregas listas", detail: `${data.readyOrders.length} orden(es) pueden convertirse en caja hoy.` });
  }
  if (data.receivables > 0) {
    insights.push({ tone: "warn", title: "Cobranza pendiente", detail: `Hay ${money.format(data.receivables)} por recuperar en ordenes abiertas o entregadas.` });
  }
  if (data.lowStock.length) {
    insights.push({ tone: "danger", title: "Inventario critico", detail: `${data.lowStock.length} articulo(s) estan en minimo o por debajo.` });
  }
  if (data.pendingPurchases.length) {
    insights.push({ tone: "warn", title: "Compras sin cerrar", detail: `${data.pendingPurchases.length} compra(s) siguen cotizando, pedidas o en transito.` });
  }
  if (data.staleOrders.length) {
    insights.push({ tone: "danger", title: "Ordenes sin avance", detail: `${data.staleOrders.length} orden(es) llevan 5 dias o mas sin actualizacion.` });
  }
  if (data.unapprovedOrders.length) {
    insights.push({ tone: "warn", title: "Aprobaciones pendientes", detail: `${data.unapprovedOrders.length} orden(es) no tienen aceptacion del cliente registrada.` });
  }
  if (data.negativeMarginOrders.length) {
    insights.push({ tone: "danger", title: "Margen negativo", detail: `${data.negativeMarginOrders.length} orden(es) cuestan mas que su total capturado.` });
  }
  if (data.marginRate > 0 && data.marginRate < 30) {
    insights.push({ tone: "warn", title: "Margen bajo", detail: `El margen general esta en ${data.marginRate}%. Revisa precios y costos.` });
  }
  if (data.warrantyCost > 0) {
    insights.push({ tone: "warn", title: "Costo por garantias", detail: `Las garantias acumulan ${money.format(data.warrantyCost)} de costo absorbido.` });
  }
  return insights.slice(0, 6);
}

function renderPriorityStrip({ activeOrders, readyOrders, lowStock, revenue, margin }) {
  const pendingPurchases = state.purchases.filter((purchase) => !purchase.archived && !["Recibido", "Cancelado"].includes(purchase.status));
  const overdueAppointments = state.appointments.filter((appointment) => !appointment.archived && isPastAppointment(appointment)).length;
  const partsCost = state.orders
    .filter((order) => !order.archived && order.status !== "Cancelado")
    .reduce((sum, order) => sum + getOrderPartsCost(order), 0);
  const marginRate = revenue > 0 ? Math.round((margin / revenue) * 100) : 0;
  const priorities = [
    {
      label: "Entregas",
      value: readyOrders.length,
      detail: readyOrders.length ? "Listas para cerrar" : "Sin equipos listos",
      tone: readyOrders.length ? "accent" : ""
    },
    {
      label: "Seguimiento",
      value: activeOrders.length,
      detail: activeOrders.length ? "Ordenes activas" : "Operacion limpia",
      tone: activeOrders.length > 8 ? "warn" : ""
    },
    {
      label: "Inventario",
      value: lowStock.length,
      detail: lowStock.length ? "Stock bajo" : "Niveles estables",
      tone: lowStock.length ? "danger" : ""
    },
    {
      label: "Costo piezas",
      value: money.format(partsCost),
      detail: "Aplicado a ordenes",
      tone: partsCost ? "accent" : ""
    },
    {
      label: "Margen",
      value: `${marginRate}%`,
      detail: money.format(margin),
      tone: marginRate < 25 && revenue > 0 ? "warn" : ""
    },
    {
      label: "Compras",
      value: pendingPurchases.length,
      detail: pendingPurchases.length ? "Cotizaciones abiertas" : "Sin pendientes",
      tone: pendingPurchases.length ? "accent" : ""
    }
  ];
  el.priorityStrip.innerHTML = priorities.map((item) => `<article class="priority-card ${item.tone}">
    <span>${escapeHtml(item.label)}</span>
    <strong>${escapeHtml(item.value)}</strong>
    <small>${escapeHtml(item.detail)}</small>
  </article>`).join("");
}

function renderDecisionCharts() {
  const activeOrders = state.orders.filter((order) => !order.archived && !["Entregado", "Cancelado"].includes(order.status)).length;
  const lowStock = state.inventory.filter((item) => !item.archived && Number(item.stock) <= Number(item.min)).length;
  el.decisionSummary.textContent = `${state.orders.filter((order) => !order.archived).length} ordenes | ${lowStock} stock bajo`;
  renderRevenueChart();
  renderStatusChart(activeOrders);
  renderDeviceChart();
  renderStockChart();
}

function renderRevenueChart() {
  const months = getLastMonths(6);
  const totals = months.map((month) => {
    const total = state.orders
      .filter((order) => !order.archived && order.status !== "Cancelado" && order.createdAt?.slice(0, 7) === month.key)
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    return { ...month, value: total };
  });
  const max = Math.max(...totals.map((item) => item.value), 1);
  const bars = totals.map((item, index) => {
    const x = 32 + index * 52;
    const height = Math.round((item.value / max) * 118);
    const y = 144 - height;
    return `<g>
      <rect x="${x}" y="${y}" width="30" height="${height}" rx="5" class="chart-bar"></rect>
      <text x="${x + 15}" y="164" text-anchor="middle" class="chart-label">${item.label}</text>
      <text x="${x + 15}" y="${Math.max(18, y - 8)}" text-anchor="middle" class="chart-value">${compactMoney(item.value)}</text>
    </g>`;
  }).join("");
  el.revenueChart.innerHTML = chartSvg(`
    <line x1="24" y1="144" x2="348" y2="144" class="chart-axis"></line>
    ${bars}
  `, "Ingresos acumulados de los ultimos seis meses.");
}

function renderStatusChart(activeOrders) {
  const grouped = countBy(state.orders.filter((order) => !order.archived), "status");
  const rows = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  if (!rows.length) {
    el.statusChart.innerHTML = chartEmpty("Sin ordenes registradas");
    return;
  }
  const max = Math.max(...rows.map(([, count]) => count), 1);
  const list = rows.slice(0, 6).map(([status, count], index) => {
    const width = Math.max(12, Math.round((count / max) * 190));
    const y = 24 + index * 24;
    return `<g>
      <text x="12" y="${y + 11}" class="chart-label">${escapeHtml(status)}</text>
      <rect x="130" y="${y}" width="${width}" height="14" rx="7" class="chart-bar alt"></rect>
      <text x="${138 + width}" y="${y + 11}" class="chart-value">${count}</text>
    </g>`;
  }).join("");
  el.statusChart.innerHTML = chartSvg(`
    <text x="12" y="178" class="chart-note">${activeOrders} ordenes requieren seguimiento</text>
    ${list}
  `, "Distribucion de ordenes por estado.");
}

function renderDeviceChart() {
  const buckets = {};
  state.orders.filter((order) => !order.archived).forEach((order) => {
    const key = classifyDevice(order.device);
    buckets[key] = (buckets[key] || 0) + 1;
  });
  const rows = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!rows.length) {
    el.deviceChart.innerHTML = chartEmpty("Sin servicios registrados");
    return;
  }
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  let offset = 0;
  const segments = rows.map(([label, count], index) => {
    const width = Math.round((count / total) * 308);
    const x = 24 + offset;
    offset += width;
    return `<rect x="${x}" y="36" width="${width}" height="34" class="chart-segment segment-${index}"></rect>`;
  }).join("");
  const labels = rows.map(([label, count], index) => {
    const y = 104 + index * 20;
    return `<g>
      <rect x="24" y="${y - 10}" width="10" height="10" class="chart-segment segment-${index}"></rect>
      <text x="42" y="${y}" class="chart-label">${escapeHtml(label)}</text>
      <text x="318" y="${y}" text-anchor="end" class="chart-value">${count}</text>
    </g>`;
  }).join("");
  el.deviceChart.innerHTML = chartSvg(`
    <rect x="24" y="36" width="308" height="34" rx="8" class="chart-track"></rect>
    ${segments}
    ${labels}
  `, "Tipos de equipo o servicio con mayor demanda.");
}

function renderStockChart() {
  const items = [...state.inventory]
    .filter((item) => !item.archived)
    .sort((a, b) => stockRatio(a) - stockRatio(b))
    .slice(0, 6);
  if (!items.length) {
    el.stockChart.innerHTML = chartEmpty("Sin inventario registrado");
    return;
  }
  const rows = items.map((item, index) => {
    const ratio = Math.min(stockRatio(item), 1.5);
    const width = Math.max(8, Math.round((ratio / 1.5) * 170));
    const y = 22 + index * 24;
    const riskClass = Number(item.stock) <= Number(item.min) ? "danger" : "ok";
    return `<g>
      <text x="12" y="${y + 11}" class="chart-label">${truncate(item.name, 18)}</text>
      <rect x="150" y="${y}" width="170" height="14" rx="7" class="chart-track"></rect>
      <rect x="150" y="${y}" width="${width}" height="14" rx="7" class="chart-bar ${riskClass}"></rect>
      <text x="332" y="${y + 11}" text-anchor="end" class="chart-value">${item.stock}/${item.min}</text>
    </g>`;
  }).join("");
  el.stockChart.innerHTML = chartSvg(rows, "Comparativo de stock actual contra stock minimo.");
}

function chartSvg(content, description) {
  return `<svg viewBox="0 0 360 190" aria-label="${escapeHtml(description)}">
    <desc>${escapeHtml(description)}</desc>
    ${content}
  </svg>`;
}

function chartEmpty(message) {
  return chartSvg(`<text x="180" y="96" text-anchor="middle" class="chart-note">${escapeHtml(message)}</text>`, message);
}

function getLastMonths(count) {
  const months = [];
  const now = new Date();
  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("es-MX", { month: "short" }).replace(".", "")
    });
  }
  return months;
}

function daysSince(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return 0;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function countBy(collection, key) {
  return collection.reduce((acc, item) => {
    const value = item[key] || "Sin estado";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function compactMoney(value) {
  if (value >= 1000) return `$${Math.round(value / 1000)}k`;
  return `$${Math.round(value)}`;
}

function classifyDevice(device) {
  const text = String(device || "").toLowerCase();
  if (text.includes("laptop") || text.includes("lenovo") || text.includes("hp") || text.includes("dell")) return "Laptop";
  if (text.includes("iphone") || text.includes("cel") || text.includes("telefono") || text.includes("samsung")) return "Celular";
  if (text.includes("pc") || text.includes("desktop") || text.includes("gabinete")) return "PC escritorio";
  if (text.includes("impresora") || text.includes("printer")) return "Impresora";
  if (text.includes("tablet") || text.includes("ipad")) return "Tablet";
  return "Otros";
}

function stockRatio(item) {
  const min = Math.max(Number(item.min || 0), 1);
  return Number(item.stock || 0) / min;
}

function truncate(value, length) {
  const text = String(value || "");
  return text.length > length ? `${text.slice(0, length - 1)}...` : text;
}

function logAction(type, detail, refId = "") {
  state.auditLog = [
    {
      id: id("log"),
      type,
      detail,
      refId,
      createdAt: new Date().toISOString()
    },
    ...(state.auditLog || [])
  ].slice(0, 250);
}

function addInventoryMovement(itemId, qty, type, detail, refId = "") {
  const item = state.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  state.inventoryMovements = [
    {
      id: id("mov"),
      itemId,
      itemName: displayInventoryName(item),
      qty: Number(qty || 0),
      type,
      detail,
      refId,
      createdAt: new Date().toISOString()
    },
    ...(state.inventoryMovements || [])
  ].slice(0, 300);
}

function renderAuditLog() {
  el.auditCount.textContent = state.auditLog.length;
  el.auditList.innerHTML = state.auditLog.length
    ? state.auditLog.slice(0, 12).map((entry) => `<article class="record-card compact-card">
        <div class="record-head">
          <div class="record-title">
            <strong>${escapeHtml(entry.type)}</strong>
            <span>${dateFormat.format(new Date(entry.createdAt))}</span>
          </div>
        </div>
        <div class="record-meta">${escapeHtml(entry.detail)}</div>
      </article>`).join("")
    : emptyHtml("Sin bitacora", "Las acciones importantes apareceran aqui.");
}

function renderInventoryMovements() {
  el.movementCount.textContent = state.inventoryMovements.length;
  el.movementList.innerHTML = state.inventoryMovements.length
    ? state.inventoryMovements.slice(0, 12).map((movement) => `<article class="record-card compact-card">
        <div class="record-head">
          <div class="record-title">
            <strong>${escapeHtml(movement.itemName)}</strong>
            <span>${escapeHtml(movement.type)} | ${dateFormat.format(new Date(movement.createdAt))}</span>
          </div>
          <span class="count-pill">${movement.qty > 0 ? "+" : ""}${movement.qty}</span>
        </div>
        <div class="record-meta">${escapeHtml(movement.detail || "Sin detalle")}</div>
      </article>`).join("")
    : emptyHtml("Sin movimientos", "Las entradas y salidas de inventario apareceran aqui.");
}

function applyQuickIssue() {
  const value = el.quickIssue.value.trim();
  if (!value) return;
  const templates = {
    "No enciende": "El equipo no enciende. Cliente reporta que no muestra indicadores de energia ni imagen.",
    "No carga": "El equipo no carga o no reconoce cargador. Revisar centro de carga, bateria y cargador.",
    "Pantalla rota": "Pantalla rota o sin imagen por golpe. Revisar display, tactil y marco.",
    "Equipo mojado": "Equipo con posible contacto con liquido. Requiere limpieza, revision de sulfatacion y diagnostico.",
    "Equipo lento": "Equipo lento. Revisar almacenamiento, memoria, temperatura, sistema operativo y malware.",
    "No da imagen": "Equipo enciende pero no da imagen. Revisar pantalla, flex, GPU, RAM y salida externa.",
    "Se apaga solo": "Equipo se apaga solo. Revisar temperatura, bateria, fuente, placa y sistema.",
    "No detecta disco": "Equipo no detecta unidad de almacenamiento. Revisar SSD/HDD, flex, BIOS y sistema.",
    "Problema de software": "Cliente reporta problema de software. Revisar sistema, drivers, virus, respaldos y licencias."
  };
  el.orderIssue.value = templates[value] || value;
  updateOrderPartSuggestion();
}

function renderPaymentSelectors() {
  const selected = el.paymentOrder.value;
  const openOrders = state.orders.filter((order) => !order.archived && order.status !== "Cancelado");
  el.paymentOrder.innerHTML = openOrders.length
    ? openOrders.map((order) => {
        const client = getClient(order.clientId);
        return `<option value="${order.id}">${escapeHtml(order.folio)} - ${escapeHtml(client?.name || "Sin cliente")} - Saldo ${money.format(getOrderBalance(order))}</option>`;
      }).join("")
    : `<option value="">Sin ordenes disponibles</option>`;
  if (openOrders.some((order) => order.id === selected)) el.paymentOrder.value = selected;
}

function renderPayments() {
  const payments = [...state.payments]
    .filter((payment) => {
      const order = state.orders.find((item) => item.id === payment.orderId);
      const client = getClient(order?.clientId);
      return [payment.method, payment.reference, order?.folio, client?.name, client?.phone].some(matches);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTotal = state.payments
    .filter((payment) => payment.createdAt?.slice(0, 10) === todayKey)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  el.cashSummary.textContent = `Hoy ${money.format(todayTotal)}`;
  el.paymentList.innerHTML = payments.length
    ? payments.map(renderPaymentCard).join("")
    : emptyHtml("Sin pagos", "Registra anticipos, abonos y liquidaciones.");
}

function renderPaymentCard(payment) {
  const order = state.orders.find((item) => item.id === payment.orderId);
  const client = getClient(order?.clientId);
  return `<article class="record-card">
    <div class="record-head">
      <div class="record-title">
        <strong>${money.format(Number(payment.amount || 0))} | ${escapeHtml(payment.method)}</strong>
        <span>${escapeHtml(order?.folio || "Sin orden")} | ${escapeHtml(client?.name || "Sin cliente")}</span>
      </div>
      <span class="count-pill">${dateFormat.format(new Date(payment.createdAt))}</span>
    </div>
    <div class="record-meta">${escapeHtml(payment.reference || "Sin referencia")}</div>
    <div class="record-actions">
      <button class="btn danger" onclick="voidPayment('${payment.id}')">Anular pago</button>
    </div>
  </article>`;
}

function renderWarrantySelectors() {
  const selected = el.warrantyOrder.value;
  const orders = state.orders.filter((order) => !order.archived);
  el.warrantyOrder.innerHTML = orders.length
    ? orders.map((order) => `<option value="${order.id}">${escapeHtml(order.folio)} - ${escapeHtml(order.device)}</option>`).join("")
    : `<option value="">Sin ordenes</option>`;
  if (orders.some((order) => order.id === selected)) el.warrantyOrder.value = selected;
}

function renderWarrantyClaims() {
  const claims = (state.warrantyClaims || [])
    .filter((claim) => !claim.archived && [claim.reason, claim.resolution, claim.status, state.orders.find((order) => order.id === claim.orderId)?.folio].some(matches))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  el.warrantyCount.textContent = claims.length;
  el.warrantyList.innerHTML = claims.length
    ? claims.map((claim) => {
        const order = state.orders.find((item) => item.id === claim.orderId);
        return `<article class="record-card">
          <div class="record-head">
            <div class="record-title">
              <strong>${escapeHtml(order?.folio || "Sin orden")} | ${escapeHtml(claim.status)}</strong>
              <span>${dateFormat.format(new Date(claim.createdAt))}</span>
            </div>
            <span class="count-pill">${money.format(Number(claim.cost || 0))}</span>
          </div>
          <div class="record-meta"><strong>Motivo:</strong> ${escapeHtml(claim.reason)}</div>
          <div class="record-meta"><strong>Resolucion:</strong> ${escapeHtml(claim.resolution || "Pendiente")}</div>
          <div class="record-actions">
            <button class="btn ghost" onclick="editWarrantyClaim('${claim.id}')">Editar</button>
            <button class="btn danger" onclick="archiveWarrantyClaim('${claim.id}')">Archivar</button>
          </div>
        </article>`;
      }).join("")
    : emptyHtml("Sin garantias", "Registra reclamos de garantia y resoluciones.");
}

function saveWarrantyClaim(event) {
  event.preventDefault();
  const existing = state.warrantyClaims.find((item) => item.id === el.warrantyId.value);
  const payload = {
    id: el.warrantyId.value || id("war"),
    orderId: el.warrantyOrder.value,
    reason: el.warrantyReason.value.trim(),
    resolution: el.warrantyResolution.value.trim(),
    status: el.warrantyStatus.value,
    cost: Number(el.warrantyCost.value || 0),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.warrantyClaims = upsert(state.warrantyClaims, payload);
  logAction(existing ? "Garantia actualizada" : "Garantia creada", payload.reason, payload.id);
  persist();
  resetWarrantyForm();
  render();
}

function editWarrantyClaim(claimId) {
  const claim = state.warrantyClaims.find((item) => item.id === claimId);
  if (!claim) return;
  el.warrantyId.value = claim.id;
  el.warrantyOrder.value = claim.orderId;
  el.warrantyReason.value = claim.reason || "";
  el.warrantyResolution.value = claim.resolution || "";
  el.warrantyStatus.value = claim.status || "Recibida";
  el.warrantyCost.value = claim.cost || 0;
  showView("warranties");
}

function resetWarrantyForm() {
  el.warrantyForm.reset();
  el.warrantyId.value = "";
  el.warrantyCost.value = 0;
  if (state.orders.find((order) => !order.archived)) el.warrantyOrder.value = state.orders.find((order) => !order.archived).id;
}

function archiveWarrantyClaim(claimId) {
  const claim = state.warrantyClaims.find((item) => item.id === claimId);
  if (!claim || !confirm("Archivar reclamo de garantia?")) return;
  state.warrantyClaims = state.warrantyClaims.map((item) => item.id === claimId ? { ...item, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item);
  logAction("Garantia archivada", claim.reason, claimId);
  persist();
  render();
}

function savePayment(event) {
  event.preventDefault();
  const order = state.orders.find((item) => item.id === el.paymentOrder.value);
  if (!order) {
    alert("Selecciona una orden para registrar el pago.");
    return;
  }
  const amount = Number(el.paymentAmount.value || 0);
  if (amount <= 0) {
    alert("El monto debe ser mayor a cero.");
    return;
  }
  const payment = {
    id: el.paymentId.value || id("pay"),
    orderId: order.id,
    amount,
    method: el.paymentMethod.value,
    reference: el.paymentReference.value.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.payments = [payment, ...state.payments];
  applyPaymentsToOrder(order.id);
  logAction("Pago registrado", `${money.format(amount)} en ${order.folio} por ${payment.method}`, order.id);
  persist();
  resetPaymentForm();
  render();
}

function voidPayment(paymentId) {
  const payment = state.payments.find((item) => item.id === paymentId);
  if (!payment || !confirm("Anular este pago?")) return;
  state.payments = state.payments.filter((item) => item.id !== paymentId);
  applyPaymentsToOrder(payment.orderId);
  logAction("Pago anulado", `${money.format(Number(payment.amount || 0))} anulado`, payment.orderId);
  persist();
  render();
}

function resetPaymentForm() {
  el.paymentForm.reset();
  el.paymentId.value = "";
  el.paymentAmount.value = "";
  if (state.orders[0]) el.paymentOrder.value = state.orders[0].id;
}

function getOrderPaid(order) {
  const paymentsTotal = state.payments
    .filter((payment) => payment.orderId === order.id)
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return Math.max(Number(order.deposit || 0), paymentsTotal);
}

function getOrderBalance(order) {
  return Math.max(0, Number(order.total || 0) - getOrderPaid(order));
}

function applyPaymentsToOrder(orderId) {
  state.orders = state.orders.map((order) => {
    if (order.id !== orderId) return order;
    const paid = getOrderPaid(order);
    return { ...order, deposit: paid, paid: getOrderBalance({ ...order, deposit: paid }) <= 0, updatedAt: new Date().toISOString() };
  });
}

function renderClients() {
  const clients = state.clients.filter((client) =>
    !client.archived && [client.name, client.phone, client.email, client.address].some(matches)
  );
  el.clientCount.textContent = state.clients.filter((client) => !client.archived).length;
  el.clientList.innerHTML = clients.length
    ? clients.map((client) => `<article class="record-card">
        <div class="record-head">
          <div class="record-title">
            <strong>${escapeHtml(client.name)}</strong>
            <span>${escapeHtml(client.phone)} ${client.email ? "| " + escapeHtml(client.email) : ""}</span>
          </div>
        </div>
        <div class="record-meta">${escapeHtml(client.address || "Sin direccion registrada")}</div>
        <div class="record-actions">
          <button class="btn ghost" onclick="editClient('${client.id}')">Editar</button>
          <a class="btn ghost" href="${clientWhatsappUrl(client)}" target="_blank" rel="noreferrer">WhatsApp</a>
          <button class="btn danger" onclick="archiveClient('${client.id}')">Archivar</button>
        </div>
      </article>`).join("")
    : emptyHtml();
}

function renderOrderSelectors() {
  const clients = state.clients.filter((client) => !client.archived);
  el.orderClient.innerHTML = clients.length
    ? clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} - ${escapeHtml(client.phone)}</option>`).join("")
    : `<option value="">Registra un cliente primero</option>`;

  renderOrderDeviceModels();
  renderCompatibleOrderPartOptions();
  renderSelectedOrderParts();
}

function renderOrderDeviceModels() {
  const catalogDevices = Object.entries(commercialDeviceCatalog)
    .flatMap(([brand, models]) => models.map((model) => `${brand} ${model}`));
  const savedOrderDevices = state.orders
    .filter((order) => !order.archived)
    .map((order) => order.device)
    .filter(Boolean);
  const inventoryDevices = state.inventory
    .filter((item) => !item.archived)
    .map((item) => displayInventoryName(item))
    .filter(Boolean);
  const devices = [...new Set([...catalogDevices, ...savedOrderDevices, ...inventoryDevices])]
    .sort((a, b) => a.localeCompare(b, "es"));
  el.orderDeviceModels.innerHTML = devices
    .map((device) => `<option value="${escapeAttr(device)}"></option>`)
    .join("");
}

function renderCompatibleOrderPartOptions() {
  const compatibleParts = getCompatibleInventoryForOrder();
  el.orderPartOptions.innerHTML = compatibleParts
    .map((item) => `<option value="${escapeAttr(orderPartOptionLabel(item))}"></option>`)
    .join("");
}

function updateOrderPartContext() {
  renderCompatibleOrderPartOptions();
  setSelectedOrderParts(getSelectedOrderPartIds().filter((partId) => {
    const item = state.inventory.find((entry) => entry.id === partId);
    return item && isInventoryCompatibleWithOrderDevice(item);
  }));
  updateOrderPartSuggestion();
}

function updateOrderPartSuggestion() {
  const device = el.orderDevice.value.trim();
  if (!device) return;
  const compatibleParts = getCompatibleInventoryForOrder();
  if (compatibleParts.length) return;
  const suggestion = suggestPartForOrder();
  if (!suggestion) return;
  applyAutoSuggestion(el.quotePartName, suggestion);
  applyAutoSuggestion(el.purchasePart, suggestion);
  if (el.purchaseQty && !Number(el.purchaseQty.value || 0)) el.purchaseQty.value = 1;
  if (el.purchaseOrderLink && el.orderId.value) el.purchaseOrderLink.value = el.orderId.value;
}

function applyAutoSuggestion(input, suggestion) {
  if (!input) return;
  const previous = input.dataset.autoSuggestion || "";
  if (!input.value.trim() || input.value.trim() === previous) {
    input.value = suggestion;
    input.dataset.autoSuggestion = suggestion;
  }
}

function getCompatibleInventoryForOrder() {
  const available = state.inventory.filter((item) => !item.archived);
  const profile = getOrderDeviceProfile();
  if (!profile.model && !profile.brand) return available;
  const compatible = available.filter(isInventoryCompatibleWithOrderDevice);
  return compatible;
}

function isInventoryCompatibleWithOrderDevice(item) {
  const profile = getOrderDeviceProfile();
  if (!profile.model && !profile.brand) return true;
  const itemText = normalizeSearchText([displayInventoryName(item), item.name, item.brand, item.model, item.category].filter(Boolean).join(" "));
  const modelText = normalizeSearchText(profile.model);
  const fullDeviceText = normalizeSearchText(profile.full);
  const brandText = normalizeSearchText(profile.brand);
  const itemModelText = normalizeSearchText(item.model);
  if (modelText && (itemText.includes(modelText) || (itemModelText && fullDeviceText.includes(itemModelText)))) return true;
  if (brandText && normalizeSearchText(item.brand) === brandText && !modelText) return true;
  return false;
}

function getOrderDeviceProfile() {
  return parseDeviceText(el.orderDevice?.value || "");
}

function parseDeviceText(value) {
  const full = String(value || "").trim();
  const normalized = normalizeSearchText(full);
  if (!normalized) return { brand: "", model: "", full: "" };
  for (const [brand, models] of Object.entries(commercialDeviceCatalog)) {
    const brandNorm = normalizeSearchText(brand);
    if (normalized.startsWith(brandNorm)) {
      return { brand, model: full.slice(brand.length).trim(), full };
    }
    const matchedModel = models.find((model) => normalized.includes(normalizeSearchText(model)));
    if (matchedModel) return { brand, model: matchedModel, full };
  }
  const [brand, ...model] = full.split(" ");
  return { brand: brand || "", model: model.join(" "), full };
}

function suggestPartForOrder() {
  const device = el.orderDevice.value.trim();
  const text = normalizeSearchText([el.quickIssue.value, el.orderIssue.value, el.orderNotes.value].filter(Boolean).join(" "));
  if (!device || !text) return "";
  const partType = inferPartTypeFromDiagnosis(text, device);
  return partType ? `${partType} ${device}` : `Refaccion ${device}`;
}

function inferPartTypeFromDiagnosis(text, device) {
  const isLaptop = /laptop|thinkpad|ideapad|xps|inspiron|latitude|pavilion|spectre|envy|victus|omen|zenbook|vivobook|aspire|swift|nitro|predator|matebook|magicbook|macbook/.test(normalizeSearchText(device));
  const rules = [
    { keys: ["pantalla", "display", "tactil", "imagen", "vidrio"], phone: "Pantalla", laptop: "Pantalla" },
    { keys: ["no carga", "carga", "centro de carga", "conector", "puerto"], phone: "Centro de carga", laptop: "Jack de carga" },
    { keys: ["bateria", "pila", "se apaga", "descarga"], phone: "Bateria", laptop: "Bateria" },
    { keys: ["teclado", "tecla"], phone: "Flex teclado", laptop: "Teclado" },
    { keys: ["camara"], phone: "Camara", laptop: "Camara" },
    { keys: ["bocina", "audio", "altavoz"], phone: "Bocina", laptop: "Bocina" },
    { keys: ["microfono"], phone: "Microfono", laptop: "Microfono" },
    { keys: ["flex"], phone: "Flex", laptop: "Flex" },
    { keys: ["disco", "ssd", "almacenamiento", "lento"], phone: "Memoria / almacenamiento", laptop: "SSD" },
    { keys: ["ram", "memoria"], phone: "Memoria", laptop: "Memoria RAM" },
    { keys: ["temperatura", "calienta", "ventilador"], phone: "Disipador", laptop: "Ventilador" },
    { keys: ["bisagra"], phone: "Marco", laptop: "Bisagra" },
    { keys: ["tarjeta madre", "placa", "no enciende"], phone: "Revision de placa", laptop: "Revision de motherboard" }
  ];
  const rule = rules.find((item) => item.keys.some((key) => text.includes(normalizeSearchText(key))));
  if (!rule) return "";
  return isLaptop ? rule.laptop : rule.phone;
}

function renderSupplierSelectors() {
  const selected = el.quoteSupplier.value;
  const suppliers = state.suppliers.filter((supplier) => !supplier.archived);
  el.quoteSupplier.innerHTML = suppliers.length
    ? `<option value="">Selecciona proveedor</option>${suppliers.map((supplier) =>
        `<option value="${supplier.id}">${escapeHtml(supplier.name)} - ${escapeHtml(supplier.category || "General")}</option>`
      ).join("")}`
    : `<option value="">Registra un proveedor primero</option>`;
  if (suppliers.some((supplier) => supplier.id === selected)) el.quoteSupplier.value = selected;
}

function renderOrders() {
  const orders = state.orders.filter((order) => !order.archived && orderMatchesSearch(order));
  const activeOrders = orders.filter((order) => order.status !== "Entregado");
  const finishedOrders = orders.filter((order) => order.status === "Entregado");
  const activeCount = state.orders.filter((order) => !order.archived && order.status !== "Entregado").length;
  const finishedCount = state.orders.filter((order) => !order.archived && order.status === "Entregado").length;
  el.orderCount.textContent = activeCount;
  el.finishedOrderCount.textContent = finishedCount;
  el.orderList.innerHTML = activeOrders.length
    ? activeOrders.map((order) => renderOrderCard(order, true)).join("")
    : emptyHtml("Sin ordenes activas", "Las ordenes entregadas ya no aparecen en esta lista.");
  el.finishedOrderList.innerHTML = finishedOrders.length
    ? finishedOrders.map((order) => renderOrderCard(order, false)).join("")
    : emptyHtml("Sin ordenes finalizadas", "Cuando una orden pase a Entregado aparecera aqui.");
}

function orderMatchesSearch(order) {
  const client = getClient(order.clientId);
  return [order.folio, order.device, order.serial, order.issue, order.status, client?.name, client?.phone].some(matches);
}

function renderOrderCard(order, canEditStatus) {
  const client = getClient(order.clientId);
  const paid = getOrderPaid(order);
  const balance = getOrderBalance(order);
  const warranty = getWarrantySummary(order);
  const partsCost = getOrderPartsCost(order);
  const margin = getOrderMargin(order);
  return `<article class="record-card ${canEditStatus ? "" : "finished-card"}">
    <div class="record-head">
      <div class="record-title">
        <strong>${escapeHtml(order.folio)} | ${escapeHtml(order.device)}</strong>
        <span>${escapeHtml(client?.name || "Sin cliente")} | ${dateFormat.format(new Date(order.createdAt))}</span>
      </div>
      <span class="status ${statusClass(order.status)}">${escapeHtml(order.status)}</span>
    </div>
    <div class="record-meta">${escapeHtml(order.issue)}</div>
    ${order.technician ? `<div class="record-meta"><strong>Tecnico:</strong> ${escapeHtml(order.technician)}</div>` : ""}
    ${order.quotePartName ? `<div class="record-meta"><strong>Pieza a cotizar:</strong> ${escapeHtml(order.quotePartName)}</div>` : ""}
    ${order.physicalState ? `<div class="record-meta"><strong>Estado fisico:</strong> ${escapeHtml(order.physicalState)}</div>` : ""}
    ${warranty ? `<div class="record-meta"><strong>Garantia:</strong> ${escapeHtml(warranty)}</div>` : ""}
    <div class="record-meta">Pagado: ${money.format(paid)} | Saldo: ${balance <= 0 ? "Pagado" : money.format(balance)} | Total: ${money.format(Number(order.total || 0))}</div>
    <div class="record-meta">Costo refacciones: ${money.format(partsCost)} | Ganancia estimada: ${money.format(margin)}</div>
    ${renderOrderHistory(order)}
    <div class="record-actions">
      ${canEditStatus ? `<button class="btn ghost" onclick="editOrderStatus('${order.id}')">Modificar estatus</button>` : ""}
      <button class="btn ghost" onclick="openOrderPdf('${order.id}')">PDF</button>
      <button class="btn ghost" onclick="sendQuoteWhatsapp('${order.id}')">Cotizacion</button>
      <button class="btn ghost" onclick="sendTrackingWhatsapp('${order.id}')">Enviar seguimiento</button>
      ${order.status === "Entregado" ? `<button class="btn ghost" onclick="sendReviewWhatsapp('${order.id}')">Pedir resena</button>` : ""}
      <a class="btn ghost" href="${orderWhatsappUrl(order)}" target="_blank" rel="noreferrer">WhatsApp</a>
      <button class="btn danger" onclick="archiveOrder('${order.id}')">Archivar orden</button>
    </div>
  </article>`;
}

function renderOrderHistory(order) {
  const history = order.statusHistory || [];
  if (!history.length) return "";
  return `<details class="order-history">
    <summary>Historial de orden</summary>
    <div class="history-list">
      ${history.slice().reverse().map((entry) => `<div><strong>${escapeHtml(entry.status)}</strong><span>${dateFormat.format(new Date(entry.at))}${entry.user ? " | " + escapeHtml(entry.user) : ""}</span></div>`).join("")}
    </div>
  </details>`;
}

function renderInventory() {
  const selectedCategory = el.inventoryCategoryFilter.value;
  const items = state.inventory.filter((item) => {
    const categoryMatches = !selectedCategory || item.category === selectedCategory;
    return !item.archived && categoryMatches && [item.name, item.brand, item.model, item.category].some(matches);
  });
  el.inventoryTable.innerHTML = items.length
    ? items.map((item) => `<tr>
        <td>${escapeHtml(displayInventoryName(item))}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${item.stock <= item.min ? `<strong class="status Esperando">${item.stock}</strong>` : item.stock}</td>
        <td>${money.format(getSubdealerPrice(item))}</td>
        <td>${money.format(Number(item.price || 0))}</td>
        <td>
          <button class="btn ghost" onclick="editInventoryItem('${item.id}')">Editar</button>
          <button class="btn danger" onclick="archiveInventoryItem('${item.id}')">Archivar</button>
        </td>
      </tr>`).join("")
    : `<tr><td colspan="5">${emptyHtml()}</td></tr>`;
}

function displayInventoryName(item) {
  return [item.brand, item.model].filter(Boolean).join(" ") || item.name || "Sin modelo";
}

function orderPartOptionLabel(item) {
  return `${displayInventoryName(item)} | ${item.category || "Sin categoria"} | ${item.stock} disp.`;
}

function getSelectedOrderPartIds() {
  return [...el.orderParts.querySelectorAll("[data-part-id]")].map((node) => node.dataset.partId);
}

function setSelectedOrderParts(partIds) {
  const uniqueIds = [...new Set(partIds || [])].filter((partId) => state.inventory.some((item) => item.id === partId));
  el.orderParts.innerHTML = uniqueIds.length
    ? uniqueIds.map((partId) => {
        const item = state.inventory.find((entry) => entry.id === partId);
        return `<span class="part-chip" data-part-id="${escapeAttr(partId)}">
          ${escapeHtml(displayInventoryName(item))}
          <button type="button" aria-label="Quitar ${escapeAttr(displayInventoryName(item))}" onclick="removeOrderPart('${escapeAttr(partId)}')">x</button>
        </span>`;
      }).join("")
    : `<span class="part-empty">Sin refacciones seleccionadas</span>`;
}

function renderSelectedOrderParts() {
  setSelectedOrderParts(getSelectedOrderPartIds());
}

function addOrderPartFromSearch() {
  const text = el.orderPartSearch.value.trim();
  if (!text) return;
  const item = findInventoryItemFromPartSearch(text);
  if (!item) {
    updateOrderPartSuggestion();
    alert("No encontre una refaccion compatible para ese modelo. Deje una sugerencia lista en Cotizacion automatica y Compras.");
    return;
  }
  setSelectedOrderParts([...getSelectedOrderPartIds(), item.id]);
  el.orderPartSearch.value = "";
}

function findInventoryItemFromPartSearch(text) {
  const normalized = normalizeSearchText(text);
  const compatible = getCompatibleInventoryForOrder();
  return compatible.find((item) => normalizeSearchText(orderPartOptionLabel(item)) === normalized)
    || compatible.find((item) => normalizeSearchText(displayInventoryName(item)) === normalized)
    || compatible.find((item) => normalizeSearchText(orderPartOptionLabel(item)).includes(normalized));
}

function removeOrderPart(partId) {
  setSelectedOrderParts(getSelectedOrderPartIds().filter((id) => id !== partId));
}

function getEvidencePhotos() {
  return [...el.evidencePhotoList.querySelectorAll("[data-photo-src]")].map((node) => ({
    name: node.dataset.photoName || "evidencia.jpg",
    src: node.dataset.photoSrc
  }));
}

function setEvidencePhotos(photos) {
  const safePhotos = (photos || []).filter((photo) => photo?.src).slice(0, 6);
  el.evidencePhotoList.innerHTML = safePhotos.length
    ? safePhotos.map((photo, index) => `<figure class="photo-chip" data-photo-src="${escapeAttr(photo.src)}" data-photo-name="${escapeAttr(photo.name || "evidencia.jpg")}">
        <img src="${escapeAttr(photo.src)}" alt="Evidencia ${index + 1}">
        <figcaption>${escapeHtml(photo.name || `Foto ${index + 1}`)}</figcaption>
        <button type="button" aria-label="Quitar foto" onclick="removeEvidencePhoto(${index})">x</button>
      </figure>`).join("")
    : `<span class="part-empty">Sin fotos agregadas</span>`;
}

function getStatusEvidencePhotos() {
  if (!el.statusEvidencePhotoList) return [];
  return [...el.statusEvidencePhotoList.querySelectorAll("[data-photo-src]")].map((node) => ({
    name: node.dataset.photoName || "estatus.jpg",
    src: node.dataset.photoSrc
  }));
}

function setStatusEvidencePhotos(photos) {
  if (!el.statusEvidencePhotoList) return;
  const safePhotos = (photos || []).filter((photo) => photo?.src).slice(0, 6);
  el.statusEvidencePhotoList.innerHTML = safePhotos.length
    ? safePhotos.map((photo, index) => `<figure class="photo-chip" data-photo-src="${escapeAttr(photo.src)}" data-photo-name="${escapeAttr(photo.name || "estatus.jpg")}">
        <img src="${escapeAttr(photo.src)}" alt="Evidencia de estatus ${index + 1}">
        <figcaption>${escapeHtml(photo.name || `Foto ${index + 1}`)}</figcaption>
        <button type="button" aria-label="Quitar foto" onclick="removeStatusEvidencePhoto(${index})">x</button>
      </figure>`).join("")
    : `<span class="part-empty">Sin fotos agregadas</span>`;
}

function removeStatusEvidencePhoto(index) {
  setStatusEvidencePhotos(getStatusEvidencePhotos().filter((_, itemIndex) => itemIndex !== index));
}

async function addEvidencePhotos(event) {
  const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  const current = getEvidencePhotos();
  const remaining = Math.max(0, 6 - current.length);
  if (!remaining) {
    alert("Puedes agregar hasta 6 fotos por orden.");
    event.target.value = "";
    return;
  }
  const compressed = await Promise.all(files.slice(0, remaining).map(compressEvidencePhoto));
  setEvidencePhotos([...current, ...compressed]);
  event.target.value = "";
}

async function addStatusEvidencePhotos(event) {
  const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  const current = getStatusEvidencePhotos();
  const remaining = Math.max(0, 6 - current.length);
  if (!remaining) {
    alert("Puedes agregar hasta 6 fotos por cambio de estatus.");
    event.target.value = "";
    return;
  }
  const compressed = await Promise.all(files.slice(0, remaining).map(compressEvidencePhoto));
  setStatusEvidencePhotos([...current, ...compressed]);
  event.target.value = "";
}

window.removeStatusEvidencePhoto = removeStatusEvidencePhoto;

function compressEvidencePhoto(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxSize = 900;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve({ name: file.name, src: canvas.toDataURL("image/jpeg", 0.72) });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function removeEvidencePhoto(index) {
  setEvidencePhotos(getEvidencePhotos().filter((_, itemIndex) => itemIndex !== index));
}

function wireSignaturePad() {
  const canvas = el.signaturePad;
  const context = canvas.getContext("2d");
  let drawing = false;
  const getPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height)
    };
  };
  const start = (event) => {
    drawing = true;
    const point = getPoint(event);
    context.beginPath();
    context.moveTo(point.x, point.y);
    event.preventDefault();
  };
  const move = (event) => {
    if (!drawing) return;
    const point = getPoint(event);
    context.lineWidth = 2.4;
    context.lineCap = "round";
    context.strokeStyle = "#0B3B63";
    context.lineTo(point.x, point.y);
    context.stroke();
    el.signatureData.value = canvas.toDataURL("image/png");
    event.preventDefault();
  };
  const end = () => {
    drawing = false;
    if (!isCanvasBlank(canvas)) el.signatureData.value = canvas.toDataURL("image/png");
  };
  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", move);
  window.addEventListener("mouseup", end);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", end);
}

function clearSignaturePad() {
  const canvas = el.signaturePad;
  canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
  el.signatureData.value = "";
}

function setSignature(dataUrl) {
  clearSignaturePad();
  if (!dataUrl) return;
  const image = new Image();
  image.onload = () => {
    const context = el.signaturePad.getContext("2d");
    context.drawImage(image, 0, 0, el.signaturePad.width, el.signaturePad.height);
    el.signatureData.value = dataUrl;
  };
  image.src = dataUrl;
}

function isCanvasBlank(canvas) {
  const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  return !pixels.some((value) => value !== 0);
}

function renderPatternGrid() {
  const size = Number(el.patternSize.value || 3);
  const selected = parsePatternValue(el.patternValue.value);
  el.patternGrid.className = `pattern-grid pattern-${size}`;
  el.patternGrid.innerHTML = Array.from({ length: size * size }, (_, index) => {
    const number = index + 1;
    const active = selected.includes(number);
    const order = selected.indexOf(number) + 1;
    return `<button type="button" class="pattern-dot ${active ? "active" : ""}" data-pattern-number="${number}" onclick="togglePatternPoint(${number})">
      <span>${active ? order : number}</span>
    </button>`;
  }).join("");
}

function togglePatternPoint(number) {
  const selected = parsePatternValue(el.patternValue.value);
  const next = selected.includes(number)
    ? selected.filter((item) => item !== number)
    : [...selected, number];
  setPattern(next, Number(el.patternSize.value || 3));
}

function setPattern(sequence, size = 3) {
  const max = size * size;
  const safeSequence = [...new Set(sequence || [])]
    .map(Number)
    .filter((number) => Number.isInteger(number) && number >= 1 && number <= max);
  el.patternSize.value = String(size);
  el.patternValue.value = safeSequence.join("-");
  const patternText = safeSequence.length ? `Patron ${size}x${size}: ${safeSequence.join("-")}` : "";
  if (!el.orderPasscode.value || el.orderPasscode.value.startsWith("Patron ")) {
    el.orderPasscode.value = patternText;
  }
  renderPatternGrid();
}

function parsePatternValue(value) {
  return String(value || "")
    .split("-")
    .map((item) => Number(item))
    .filter((number) => Number.isInteger(number));
}

function parseInventoryName(item) {
  const text = String(item.name || "").trim();
  if (!text) return { brand: "", model: "" };
  const knownBrand = Object.keys(commercialDeviceCatalog).find((brand) => text.toLowerCase().startsWith(brand.toLowerCase()));
  if (knownBrand) {
    return { brand: knownBrand, model: text.slice(knownBrand.length).trim() };
  }
  const [brand, ...model] = text.split(" ");
  return { brand: brand || "", model: model.join(" ") || text };
}

function renderDeviceBrands() {
  const savedBrands = state.inventory.filter((item) => !item.archived).map((item) => item.brand).filter(Boolean);
  const brands = [...new Set([...Object.keys(commercialDeviceCatalog), ...savedBrands])].sort((a, b) => a.localeCompare(b, "es"));
  el.deviceBrands.innerHTML = brands.map((brand) => `<option value="${escapeHtml(brand)}"></option>`).join("");
  renderDeviceModels();
}

function renderDeviceModels() {
  const brand = el.itemBrand.value.trim();
  const savedModels = state.inventory
    .filter((item) => !item.archived && (!brand || item.brand === brand))
    .map((item) => item.model)
    .filter(Boolean);
  const catalogModels = brand ? commercialDeviceCatalog[brand] || [] : Object.values(commercialDeviceCatalog).flat();
  const models = [...new Set([...catalogModels, ...savedModels])].sort((a, b) => a.localeCompare(b, "es"));
  el.deviceModels.innerHTML = models.map((model) => `<option value="${escapeHtml(model)}"></option>`).join("");
}

function renderInventoryCategories() {
  const categories = getInventoryCategories();
  el.inventoryCategories.innerHTML = categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join("");

  const selected = el.inventoryCategoryFilter.value;
  el.inventoryCategoryFilter.innerHTML = `<option value="">Todas las categorias</option>${categories
    .map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
    .join("")}`;
  if (categories.includes(selected)) el.inventoryCategoryFilter.value = selected;
}

function getInventoryCategories() {
  const savedCategories = state.inventory.filter((item) => !item.archived).map((item) => item.category).filter(Boolean);
  return [...new Set([...inventoryCategories, ...savedCategories])].sort((a, b) => a.localeCompare(b, "es"));
}

function saveClient(event) {
  event.preventDefault();
  const payload = {
    id: el.clientId.value || id("cli"),
    name: el.clientName.value.trim(),
    phone: el.clientPhone.value.trim(),
    email: el.clientEmail.value.trim(),
    address: el.clientAddress.value.trim(),
    createdAt: state.clients.find((item) => item.id === el.clientId.value)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.clients = upsert(state.clients, payload);
  persist();
  resetClientForm();
  render();
}

function editClient(clientId) {
  const client = getClient(clientId);
  if (!client) return;
  el.clientId.value = client.id;
  el.clientName.value = client.name;
  el.clientPhone.value = client.phone;
  el.clientEmail.value = client.email || "";
  el.clientAddress.value = client.address || "";
  showView("clients");
}

function archiveClient(clientId) {
  const client = getClient(clientId);
  if (!client || !confirm("Archivar cliente y ocultar sus ordenes/citas activas?")) return;
  state.clients = state.clients.map((item) => item.id === clientId ? { ...item, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item);
  state.orders = state.orders.map((order) => order.clientId === clientId ? { ...order, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : order);
  state.appointments = state.appointments.map((appointment) => appointment.clientId === clientId ? { ...appointment, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : appointment);
  logAction("Cliente archivado", client.name, clientId);
  persist();
  render();
}

function resetClientForm() {
  el.clientForm.reset();
  el.clientId.value = "";
}

function renderSuppliers() {
  const suppliers = state.suppliers.filter((supplier) =>
    !supplier.archived && [supplier.name, supplier.contact, supplier.phone, supplier.email, supplier.category, supplier.notes].some(matches)
  );
  el.supplierCount.textContent = state.suppliers.filter((supplier) => !supplier.archived).length;
  el.supplierList.innerHTML = suppliers.length
    ? suppliers.map((supplier) => `<article class="record-card">
        <div class="record-head">
          <div class="record-title">
            <strong>${escapeHtml(supplier.name)}</strong>
            <span>${escapeHtml(supplier.category || "General")} | ${escapeHtml(supplier.phone)}</span>
          </div>
        </div>
        <div class="record-meta">${escapeHtml(supplier.contact || "Sin contacto")} ${supplier.email ? "| " + escapeHtml(supplier.email) : ""}</div>
        <div class="record-meta">${escapeHtml(supplier.notes || "Sin notas")}</div>
        <div class="record-actions">
          <button class="btn ghost" onclick="editSupplier('${supplier.id}')">Editar</button>
          <a class="btn ghost" href="${supplierWhatsappUrl(supplier, "Hola, te contactamos de PCFIX para solicitar informacion de refacciones.")}" target="_blank" rel="noreferrer">WhatsApp</a>
          <button class="btn danger" onclick="archiveSupplier('${supplier.id}')">Archivar</button>
        </div>
      </article>`).join("")
    : emptyHtml();
}

function saveSupplier(event) {
  event.preventDefault();
  const payload = {
    id: el.supplierId.value || id("sup"),
    name: el.supplierName.value.trim(),
    contact: el.supplierContact.value.trim(),
    phone: el.supplierPhone.value.trim(),
    email: el.supplierEmail.value.trim(),
    category: el.supplierCategory.value.trim(),
    notes: el.supplierNotes.value.trim(),
    createdAt: state.suppliers.find((item) => item.id === el.supplierId.value)?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.suppliers = upsert(state.suppliers, payload);
  persist();
  resetSupplierForm();
  render();
}

function editSupplier(supplierId) {
  const supplier = state.suppliers.find((item) => item.id === supplierId);
  if (!supplier) return;
  el.supplierId.value = supplier.id;
  el.supplierName.value = supplier.name;
  el.supplierContact.value = supplier.contact || "";
  el.supplierPhone.value = supplier.phone;
  el.supplierEmail.value = supplier.email || "";
  el.supplierCategory.value = supplier.category || "";
  el.supplierNotes.value = supplier.notes || "";
  showView("suppliers");
}

function archiveSupplier(supplierId) {
  const supplier = state.suppliers.find((item) => item.id === supplierId);
  if (!supplier || !confirm("Archivar proveedor?")) return;
  state.suppliers = state.suppliers.map((item) => item.id === supplierId ? { ...item, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item);
  logAction("Proveedor archivado", supplier.name, supplierId);
  persist();
  render();
}

function resetSupplierForm() {
  el.supplierForm.reset();
  el.supplierId.value = "";
}

function renderAppointmentSelectors() {
  const selectedClient = el.appointmentClient.value;
  const clients = state.clients.filter((client) => !client.archived);
  el.appointmentClient.innerHTML = clients.length
    ? clients.map((client) => `<option value="${client.id}">${escapeHtml(client.name)} - ${escapeHtml(client.phone)}</option>`).join("")
    : `<option value="">Registra un cliente primero</option>`;
  if (clients.some((client) => client.id === selectedClient)) el.appointmentClient.value = selectedClient;

  const selectedOrder = el.appointmentOrder.value;
  const orders = state.orders.filter((order) => !order.archived);
  el.appointmentOrder.innerHTML = `<option value="">Sin orden relacionada</option>${orders.map((order) => {
    const client = getClient(order.clientId);
    return `<option value="${order.id}">${escapeHtml(order.folio)} - ${escapeHtml(client?.name || "Sin cliente")} - ${escapeHtml(order.device)}</option>`;
  }).join("")}`;
  if (orders.some((order) => order.id === selectedOrder)) el.appointmentOrder.value = selectedOrder;
}

function renderAppointments() {
  const appointments = [...state.appointments]
    .filter((appointment) => {
      if (appointment.archived) return false;
      const client = getClient(appointment.clientId);
      const order = state.orders.find((item) => item.id === appointment.orderId);
      return [client?.name, client?.phone, order?.folio, appointment.type, appointment.notes].some(matches);
    })
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  el.appointmentCount.textContent = state.appointments.length;
  el.appointmentList.innerHTML = appointments.length
    ? appointments.map(renderAppointmentCard).join("")
    : emptyHtml("Sin citas", "Agenda recepciones, entregas y seguimientos.");
}

function renderAppointmentCard(appointment) {
  const client = getClient(appointment.clientId);
  const order = state.orders.find((item) => item.id === appointment.orderId);
  const date = appointment.date ? dateFormat.format(new Date(`${appointment.date}T00:00:00`)) : "Sin fecha";
  return `<article class="record-card">
    <div class="record-head">
      <div class="record-title">
        <strong>${escapeHtml(appointment.type)} | ${escapeHtml(date)} ${escapeHtml(appointment.time || "")}</strong>
        <span>${escapeHtml(client?.name || "Sin cliente")} ${order ? "| " + escapeHtml(order.folio) : ""}</span>
      </div>
      <span class="status">${escapeHtml(isPastAppointment(appointment) ? "Vencida" : "Programada")}</span>
    </div>
    <div class="record-meta">${escapeHtml(appointment.notes || "Sin notas")}</div>
    <div class="record-actions">
      <button class="btn ghost" onclick="editAppointment('${appointment.id}')">Editar</button>
      <button class="btn ghost" onclick="sendAppointmentWhatsapp('${appointment.id}')">WhatsApp</button>
      <button class="btn danger" onclick="archiveAppointment('${appointment.id}')">Archivar</button>
    </div>
  </article>`;
}

function saveAppointment(event) {
  event.preventDefault();
  if (!el.appointmentClient.value) {
    alert("Selecciona un cliente para agendar.");
    return;
  }
  const existing = state.appointments.find((item) => item.id === el.appointmentId.value);
  const payload = {
    id: el.appointmentId.value || id("apt"),
    clientId: el.appointmentClient.value,
    orderId: el.appointmentOrder.value,
    date: el.appointmentDate.value,
    time: el.appointmentTime.value,
    type: el.appointmentType.value,
    notes: el.appointmentNotes.value.trim(),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.appointments = upsert(state.appointments, payload);
  persist();
  resetAppointmentForm();
  render();
}

function editAppointment(appointmentId) {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return;
  el.appointmentId.value = appointment.id;
  el.appointmentClient.value = appointment.clientId;
  el.appointmentOrder.value = appointment.orderId || "";
  el.appointmentDate.value = appointment.date || "";
  el.appointmentTime.value = appointment.time || "";
  el.appointmentType.value = appointment.type || "Seguimiento";
  el.appointmentNotes.value = appointment.notes || "";
  showView("appointments");
}

function resetAppointmentForm() {
  el.appointmentForm.reset();
  el.appointmentId.value = "";
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  el.appointmentDate.value = tomorrow.toISOString().slice(0, 10);
  el.appointmentTime.value = "10:00";
  if (state.clients[0]) el.appointmentClient.value = state.clients[0].id;
  el.appointmentOrder.value = "";
}

function archiveAppointment(appointmentId) {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  if (!appointment || !confirm("Archivar esta cita?")) return;
  state.appointments = state.appointments.map((item) => item.id === appointmentId ? { ...item, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item);
  logAction("Cita archivada", `${appointment.type} ${appointment.date}`, appointmentId);
  persist();
  render();
}

function sendAppointmentWhatsapp(appointmentId) {
  const appointment = state.appointments.find((item) => item.id === appointmentId);
  const client = getClient(appointment?.clientId);
  if (!appointment || !client?.phone) return;
  const order = state.orders.find((item) => item.id === appointment.orderId);
  const date = appointment.date ? dateFormat.format(new Date(`${appointment.date}T00:00:00`)) : "fecha por confirmar";
  const text = [
    `Hola ${client.name}, te recordamos tu cita en ${state.settings.businessName}.`,
    `Tipo: ${appointment.type}`,
    `Fecha: ${date}`,
    `Hora: ${appointment.time || "por confirmar"}`,
    order ? `Orden: ${order.folio}` : "",
    appointment.notes ? `Notas: ${appointment.notes}` : ""
  ].filter(Boolean).join("\n");
  window.open(`https://wa.me/${normalizePhone(client.phone)}?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
}

function isPastAppointment(appointment) {
  if (!appointment.date) return false;
  return new Date(`${appointment.date}T${appointment.time || "23:59"}`) < new Date();
}

function renderPurchaseSelectors() {
  const selectedSupplier = el.purchaseSupplier.value;
  const suppliers = state.suppliers.filter((supplier) => !supplier.archived);
  el.purchaseSupplier.innerHTML = suppliers.length
    ? suppliers.map((supplier) => `<option value="${supplier.id}">${escapeHtml(supplier.name)} - ${escapeHtml(supplier.category || "General")}</option>`).join("")
    : `<option value="">Registra un proveedor primero</option>`;
  if (suppliers.some((supplier) => supplier.id === selectedSupplier)) el.purchaseSupplier.value = selectedSupplier;

  const selectedOrder = el.purchaseOrderLink.value;
  const orders = state.orders.filter((order) => !order.archived);
  el.purchaseOrderLink.innerHTML = `<option value="">Sin orden relacionada</option>${orders.map((order) =>
    `<option value="${order.id}">${escapeHtml(order.folio)} - ${escapeHtml(order.device)}</option>`
  ).join("")}`;
  if (orders.some((order) => order.id === selectedOrder)) el.purchaseOrderLink.value = selectedOrder;
}

function normalizePurchaseItems(purchase) {
  const items = Array.isArray(purchase?.items) ? purchase.items : [];
  const normalized = items
    .map((item) => ({
      id: item.id || id("pitem"),
      part: String(item.part || "").trim(),
      qty: Math.max(1, Number(item.qty || 1)),
      cost: Number(item.cost || 0)
    }))
    .filter((item) => item.part);
  if (normalized.length) return normalized;
  if (purchase?.part) {
    return [{
      id: id("pitem"),
      part: String(purchase.part || "").trim(),
      qty: Math.max(1, Number(purchase.qty || 1)),
      cost: Number(purchase.cost || 0)
    }];
  }
  return [];
}

function getPurchaseSummary(purchase) {
  const items = normalizePurchaseItems(purchase);
  if (!items.length) return "Sin productos";
  if (items.length === 1) return items[0].part;
  return `${items[0].part} + ${items.length - 1} producto(s)`;
}

function getPurchaseTotal(purchase) {
  return normalizePurchaseItems(purchase).reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.cost || 0), 0);
}

function renderPurchaseDraftItems() {
  el.purchaseItemsList.innerHTML = purchaseDraftItems.length
    ? purchaseDraftItems.map((item, index) => `<article class="line-item">
        <div>
          <strong>${escapeHtml(item.part)}</strong>
          <span>${item.qty} pza. | ${money.format(Number(item.cost || 0))} c/u | ${money.format(Number(item.qty || 0) * Number(item.cost || 0))}</span>
        </div>
        <button class="btn danger" type="button" onclick="removePurchaseItem(${index})">Quitar</button>
      </article>`).join("")
    : emptyHtml("Sin productos agregados", "Agrega una o varias piezas para solicitar al proveedor.");
}

function addPurchaseItemFromForm() {
  const part = el.purchasePart.value.trim();
  if (!part) {
    alert("Escribe la pieza o producto a solicitar.");
    return;
  }
  purchaseDraftItems = [...purchaseDraftItems, {
    id: id("pitem"),
    part,
    qty: Math.max(1, Number(el.purchaseQty.value || 1)),
    cost: Number(el.purchaseCost.value || 0)
  }];
  el.purchasePart.value = "";
  el.purchaseQty.value = 1;
  el.purchaseCost.value = 0;
  renderPurchaseDraftItems();
}

function removePurchaseItem(index) {
  purchaseDraftItems = purchaseDraftItems.filter((_, itemIndex) => itemIndex !== index);
  renderPurchaseDraftItems();
}

function renderPurchases() {
  const purchases = [...state.purchases]
    .filter((purchase) => {
      if (purchase.archived) return false;
      const supplier = state.suppliers.find((item) => item.id === purchase.supplierId);
      const order = state.orders.find((item) => item.id === purchase.orderId);
      const itemText = normalizePurchaseItems(purchase).map((item) => item.part).join(" ");
      return [purchase.folio, purchase.part, itemText, purchase.status, supplier?.name, order?.folio].some(matches);
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  el.purchaseCount.textContent = state.purchases.length;
  el.purchaseList.innerHTML = purchases.length
    ? purchases.map(renderPurchaseCard).join("")
    : emptyHtml("Sin compras", "Registra cotizaciones y pedidos de refacciones.");
}

function renderPurchaseCard(purchase) {
  const supplier = state.suppliers.find((item) => item.id === purchase.supplierId);
  const order = state.orders.find((item) => item.id === purchase.orderId);
  const items = normalizePurchaseItems(purchase);
  const total = getPurchaseTotal(purchase);
  const receiptSummary = getPurchaseReceiptSummary(purchase);
  return `<article class="record-card">
    <div class="record-head">
      <div class="record-title">
        <strong>${escapeHtml(purchase.folio)} | ${escapeHtml(getPurchaseSummary(purchase))}</strong>
        <span>${escapeHtml(supplier?.name || "Sin proveedor")} ${order ? "| " + escapeHtml(order.folio) : ""}</span>
      </div>
      <span class="status ${statusClass(purchase.status)}">${escapeHtml(purchase.status)}</span>
    </div>
    <div class="purchase-lines">
      ${items.map((item) => `<div class="record-meta">${escapeHtml(item.part)} | ${item.qty} pza. | ${money.format(Number(item.cost || 0))} c/u | ${money.format(Number(item.qty || 0) * Number(item.cost || 0))}</div>`).join("")}
    </div>
    <div class="record-meta">Total estimado: ${money.format(total)}</div>
    ${receiptSummary ? `<div class="record-meta"><strong>Recepcion:</strong> ${escapeHtml(receiptSummary)}</div>` : ""}
    <div class="record-meta">${escapeHtml(purchase.notes || "Sin notas")}</div>
    <div class="record-actions">
      <button class="btn ghost" onclick="editPurchase('${purchase.id}')">Editar</button>
      <button class="btn ghost" onclick="sendPurchaseWhatsapp('${purchase.id}')">WhatsApp proveedor</button>
      ${purchase.status !== "Recibido" ? `<button class="btn ghost" onclick="markPurchaseReceived('${purchase.id}')">Marcar recibido</button>` : ""}
      <button class="btn danger" onclick="archivePurchase('${purchase.id}')">Archivar</button>
    </div>
  </article>`;
}

async function savePurchase(event) {
  event.preventDefault();
  if (!el.purchaseSupplier.value) {
    alert("Selecciona un proveedor para la compra.");
    return;
  }
  const existing = state.purchases.find((item) => item.id === el.purchaseId.value);
  const typedPart = el.purchasePart.value.trim();
  const items = typedPart
    ? [...purchaseDraftItems, {
        id: id("pitem"),
        part: typedPart,
        qty: Math.max(1, Number(el.purchaseQty.value || 1)),
        cost: Number(el.purchaseCost.value || 0)
      }]
    : [...purchaseDraftItems];
  if (!items.length) {
    alert("Agrega al menos un producto a la compra.");
    return;
  }
  const payload = {
    id: el.purchaseId.value || id("pur"),
    folio: existing?.folio || nextPurchaseFolio(),
    supplierId: el.purchaseSupplier.value,
    orderId: el.purchaseOrderLink.value,
    part: items[0].part,
    qty: items[0].qty,
    cost: items[0].cost,
    items,
    status: el.purchaseStatus.value,
    notes: el.purchaseNotes.value.trim(),
    receivedAt: existing?.receivedAt || "",
    receivedItems: existing?.receivedItems || [],
    receivedQuantities: existing?.receivedQuantities || {},
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.purchases = upsert(state.purchases, payload);
  if (payload.status === "Recibido") {
    applyPurchaseReceipt(payload, existing);
  }
  reconcileReceivedPurchasesToOrders({ renderAfter: false, persistAfter: false });
  await persistNow();
  resetPurchaseForm();
  render();
}

function editPurchase(purchaseId) {
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) return;
  el.purchaseId.value = purchase.id;
  el.purchaseSupplier.value = purchase.supplierId;
  el.purchaseOrderLink.value = purchase.orderId || "";
  purchaseDraftItems = normalizePurchaseItems(purchase);
  el.purchasePart.value = "";
  el.purchaseQty.value = 1;
  el.purchaseCost.value = 0;
  el.purchaseStatus.value = purchase.status || "Cotizando";
  el.purchaseNotes.value = purchase.notes || "";
  renderPurchaseDraftItems();
  showView("purchases");
}

function resetPurchaseForm() {
  el.purchaseForm.reset();
  el.purchaseId.value = "";
  el.purchaseQty.value = 1;
  el.purchaseCost.value = 0;
  purchaseDraftItems = [];
  renderPurchaseDraftItems();
  if (state.suppliers[0]) el.purchaseSupplier.value = state.suppliers[0].id;
  el.purchaseOrderLink.value = "";
}

function archivePurchase(purchaseId) {
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase || !confirm("Archivar esta orden de compra?")) return;
  state.purchases = state.purchases.map((item) => item.id === purchaseId ? { ...item, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item);
  logAction("Compra archivada", purchase.folio, purchaseId);
  persist();
  render();
}

function sendPurchaseWhatsapp(purchaseId) {
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  const supplier = state.suppliers.find((item) => item.id === purchase?.supplierId);
  if (!purchase || !supplier?.phone) return;
  const order = state.orders.find((item) => item.id === purchase.orderId);
  const items = normalizePurchaseItems(purchase);
  const text = [
    `Hola ${supplier.contact || "encargado de tienda"}, buen dia.`,
    `Te escribo de ${state.settings.businessName}.`,
    "Solicito cotizacion y disponibilidad de:",
    ...items.map((item, index) => `${index + 1}. ${item.part} - ${item.qty} pza.`),
    order ? `Relacionado con orden: ${order.folio}` : "",
    purchase.notes ? `Notas: ${purchase.notes}` : ""
  ].filter(Boolean).join("\n");
  window.open(supplierWhatsappUrl(supplier, text), "_blank", "noreferrer");
}

async function markPurchaseReceived(purchaseId) {
  const purchase = state.purchases.find((item) => item.id === purchaseId);
  if (!purchase) return;
  if (purchase.status === "Recibido") {
    repairReceivedPurchaseInventory(purchase);
    reconcileReceivedPurchasesToOrders({ renderAfter: false, persistAfter: false });
    await persistNow();
    render();
    alert("Esta compra ya fue marcada como recibida.");
    return;
  }
  state.purchases = state.purchases.map((item) =>
    item.id === purchaseId ? { ...item, status: "Recibido", updatedAt: new Date().toISOString() } : item
  );
  const updatedPurchase = state.purchases.find((item) => item.id === purchaseId);
  applyPurchaseReceipt(updatedPurchase, purchase);
  reconcileReceivedPurchasesToOrders({ renderAfter: false, persistAfter: false });
  logAction("Compra recibida", purchase.folio, purchase.id);
  await persistNow();
  render();
}

function repairReceivedPurchaseInventory(purchase) {
  let repaired = 0;
  const receipt = getPurchaseReceiptMap(purchase);
  normalizePurchaseItems(purchase).forEach((purchaseItem) => {
    const key = getPurchaseItemReceiptKey(purchaseItem);
    const qty = Math.max(1, Number(receipt[key] || purchaseItem.qty || 1));
    const existingItem = findInventoryItemFromPartSearch(purchaseItem.part);
    const detailNeedle = normalizeSearchText(purchaseItem.part).slice(0, 18);
    const alreadyMoved = state.inventoryMovements.some((movement) =>
      movement.refId === purchase.id &&
      movement.type === "Entrada" &&
      normalizeSearchText(movement.detail).includes(detailNeedle)
    );
    if (!existingItem) {
      const created = createInventoryItemFromPurchase(purchase, { ...purchaseItem, qty }, qty);
      addInventoryMovement(created.id, qty, "Entrada", `Compra recibida ${purchase.folio}: ${purchaseItem.part}`, purchase.id);
      repaired += qty;
      return;
    }
    if (!alreadyMoved) {
      state.inventory = state.inventory.map((item) =>
        item.id === existingItem.id
          ? {
              ...item,
              stock: Number(item.stock || 0) + qty,
              cost: Number(purchaseItem.cost || item.cost || 0),
              subdealerPrice: calculateSubdealerPrice(purchaseItem.cost || item.cost),
              updatedAt: new Date().toISOString()
            }
          : item
      );
      addInventoryMovement(existingItem.id, qty, "Entrada", `Compra recibida ${purchase.folio}: ${purchaseItem.part}`, purchase.id);
      repaired += qty;
    }
  });
  if (repaired) logAction("Inventario reparado", `${repaired} pza. aplicada(s) desde ${purchase.folio}`, purchase.id);
  return repaired;
}

function applyPurchaseReceipt(purchase, previousPurchase = null) {
  if (!purchase || purchase.status !== "Recibido") return 0;
  const previousReceipt = previousPurchase?.status === "Recibido" ? getPurchaseReceiptMap(previousPurchase) : {};
  const nextReceipt = { ...previousReceipt };
  let applied = 0;
  normalizePurchaseItems(purchase).forEach((purchaseItem) => {
    const key = getPurchaseItemReceiptKey(purchaseItem);
    const expectedQty = Math.max(1, Number(purchaseItem.qty || 1));
    const alreadyReceivedQty = Number(previousReceipt[key] || 0);
    const pendingQty = Math.max(0, expectedQty - alreadyReceivedQty);
    if (!pendingQty) return;
    receivePurchaseItem(purchase, { ...purchaseItem, qty: pendingQty });
    nextReceipt[key] = alreadyReceivedQty + pendingQty;
    applied += pendingQty;
  });
  if (applied) {
    state.purchases = state.purchases.map((item) =>
      item.id === purchase.id
        ? {
            ...item,
            receivedAt: item.receivedAt || new Date().toISOString(),
            receivedItems: Object.keys(nextReceipt),
            receivedQuantities: nextReceipt,
            updatedAt: new Date().toISOString()
          }
        : item
    );
    logAction("Inventario recibido", `${applied} pza. ingresada(s) desde ${purchase.folio}`, purchase.id);
  }
  return applied;
}

function getPurchaseItemReceiptKey(purchaseItem) {
  return purchaseItem.id || normalizeSearchText(`${purchaseItem.part}-${purchaseItem.cost}`);
}

function getPurchaseReceiptMap(purchase) {
  if (!purchase) return {};
  if (purchase.receivedQuantities && typeof purchase.receivedQuantities === "object") {
    return { ...purchase.receivedQuantities };
  }
  const legacyReceived = new Set(purchase.receivedItems || []);
  return normalizePurchaseItems(purchase).reduce((map, item) => {
    const key = getPurchaseItemReceiptKey(item);
    if (legacyReceived.has(key) || legacyReceived.has(item.id)) {
      map[key] = Math.max(1, Number(item.qty || 1));
    }
    return map;
  }, {});
}

function getPurchaseReceiptSummary(purchase) {
  if (purchase.status !== "Recibido") return "";
  const receipt = getPurchaseReceiptMap(purchase);
  const totalReceived = Object.values(receipt).reduce((sum, qty) => sum + Number(qty || 0), 0);
  if (!totalReceived) return "Pendiente de ingresar a inventario";
  const linkedOrder = purchase.orderId ? " Si esta ligada a una orden, se descuenta automaticamente como refaccion surtida." : "";
  return `${totalReceived} pza. ingresada(s) a inventario.${linkedOrder}`;
}

function isPurchaseAppliedToOrder(purchase) {
  const order = state.orders.find((item) => item.id === purchase.orderId);
  if (!order) return false;
  const suppliedParts = order.suppliedParts || [];
  return normalizePurchaseItems(purchase).every((purchaseItem) =>
    suppliedParts.some((part) => part.purchaseId === purchase.id && part.purchaseItemId === purchaseItem.id)
  );
}

function reconcileReceivedPurchasesToOrders(options = {}) {
  let applied = 0;
  state.purchases
    .filter((purchase) => !purchase.archived && purchase.status === "Recibido" && purchase.orderId && !isPurchaseAppliedToOrder(purchase))
    .forEach((purchase) => {
      applied += applyReceivedPurchaseToOrderSilently(purchase);
    });
  if (!applied) return 0;
  logAction("Conciliacion automatica", `${applied} refaccion(es) aplicadas a ordenes`, "");
  if (options.persistAfter) persist();
  if (options.renderAfter) render();
  return applied;
}

function applyReceivedPurchaseToOrderSilently(purchase) {
  if (!purchase?.orderId) return 0;
  let applied = 0;
  normalizePurchaseItems(purchase).forEach((purchaseItem) => {
    const inventoryItem = findInventoryItemFromPartSearch(purchaseItem.part) || createInventoryItemFromPurchase(purchase, purchaseItem, 0);
    if (supplyPurchaseItemToOrder(purchase, purchaseItem, inventoryItem)) applied += 1;
  });
  return applied;
}

function receivePurchaseItem(purchase, purchaseItem) {
  const qty = Number(purchaseItem.qty || 1);
  const inventoryItem = findInventoryItemFromPartSearch(purchaseItem.part);
  let receivedItem = inventoryItem;
  if (inventoryItem) {
    state.inventory = state.inventory.map((item) =>
      item.id === inventoryItem.id
        ? {
            ...item,
            stock: Number(item.stock || 0) + qty,
            cost: Number(purchaseItem.cost || item.cost || 0),
            subdealerPrice: calculateSubdealerPrice(purchaseItem.cost || item.cost),
            updatedAt: new Date().toISOString()
          }
        : item
    );
    receivedItem = state.inventory.find((item) => item.id === inventoryItem.id);
    addInventoryMovement(inventoryItem.id, qty, "Entrada", `Compra recibida ${purchase.folio}: ${purchaseItem.part}`, purchase.id);
  } else {
    receivedItem = createInventoryItemFromPurchase(purchase, purchaseItem, qty);
    addInventoryMovement(receivedItem.id, qty, "Entrada", `Articulo creado desde ${purchase.folio}`, purchase.id);
  }
  if (purchase.orderId && receivedItem) {
    supplyPurchaseItemToOrder(purchase, purchaseItem, receivedItem);
  }
}

function createInventoryItemFromPurchase(_purchase, purchaseItem, stock) {
  const parsed = parseInventoryName({ name: purchaseItem.part });
  const newItem = {
    id: id("inv"),
    brand: parsed.brand,
    model: parsed.model,
    name: purchaseItem.part,
    category: "Refaccion recibida",
    stock: Number(stock || 0),
    min: 1,
    cost: Number(purchaseItem.cost || 0),
    subdealerPrice: calculateSubdealerPrice(purchaseItem.cost),
    price: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.inventory = [newItem, ...state.inventory];
  return newItem;
}

function supplyPurchaseItemToOrder(purchase, purchaseItem, inventoryItem) {
  const order = state.orders.find((item) => item.id === purchase.orderId && !item.archived);
  if (!order) return false;
  const qty = Math.max(1, Number(purchaseItem.qty || 1));
  const consumedCost = Number(purchaseItem.cost || inventoryItem.cost || 0);
  const suppliedParts = [...(order.suppliedParts || [])];
  const alreadySupplied = suppliedParts.some((item) =>
    item.purchaseId === purchase.id && item.purchaseItemId === purchaseItem.id
  );
  if (alreadySupplied) return false;
  state.inventory = state.inventory.map((item) =>
    item.id === inventoryItem.id ? { ...item, stock: Math.max(0, Number(item.stock || 0) - qty), updatedAt: new Date().toISOString() } : item
  );
  addInventoryMovement(inventoryItem.id, -qty, "Salida", `Surtida a orden ${order.folio} desde ${purchase.folio}`, order.id);
  suppliedParts.push({
    id: id("sup"),
    inventoryId: inventoryItem.id,
    purchaseId: purchase.id,
    purchaseItemId: purchaseItem.id,
    part: purchaseItem.part,
    qty,
    cost: consumedCost,
    totalCost: consumedCost * qty,
    createdAt: new Date().toISOString()
  });
  const parts = [...new Set([...(order.parts || []), inventoryItem.id])];
  const stockDeductedParts = [...new Set([...(order.stockDeductedParts || []), inventoryItem.id])];
  state.orders = state.orders.map((item) =>
    item.id === order.id
      ? { ...item, parts, suppliedParts, stockDeductedParts, updatedAt: new Date().toISOString() }
      : item
  );
  logAction("Refaccion surtida", `${purchaseItem.part} -> ${order.folio}`, order.id);
  return true;
}

async function saveOrder(event) {
  event.preventDefault();
  if (!el.orderClient.value) {
    alert("Registra o selecciona un cliente antes de guardar la orden.");
    return;
  }
  const existing = state.orders.find((order) => order.id === el.orderId.value);
  const selectedParts = getSelectedOrderPartIds();
  const deposit = Number(el.orderDeposit.value || 0);
  const total = Number(el.orderTotal.value || 0);
  if (deposit > total && total > 0) {
    alert("El anticipo no puede ser mayor que el total de la orden.");
    return;
  }
  const selectedPartsCost = selectedParts.reduce((sum, partId) => {
    const item = state.inventory.find((entry) => entry.id === partId);
    return sum + Number(item?.cost || 0);
  }, 0);
  if (total > 0 && selectedPartsCost > total && !confirm("Las refacciones seleccionadas superan el total de la orden. Esto dejaria margen negativo. Deseas continuar?")) {
    return;
  }
  const payload = {
    id: el.orderId.value || id("ord"),
    folio: existing?.folio || nextFolio(),
    clientId: el.orderClient.value,
    device: el.orderDevice.value.trim(),
    technician: el.orderTechnician.value.trim(),
    serial: el.orderSerial.value.trim(),
    status: el.orderStatus.value,
    deposit,
    total,
    issue: el.orderIssue.value.trim(),
    notes: el.orderNotes.value.trim(),
    accessories: el.orderAccessories.value.trim(),
    physicalState: el.orderPhysicalState.value.trim(),
    passcode: el.orderPasscode.value.trim(),
    patternSize: Number(el.patternSize.value || 3),
    patternValue: el.patternValue.value,
    evidence: el.orderEvidence.value.trim(),
    evidencePhotos: getEvidencePhotos(),
    warrantyDays: Math.max(90, Number(el.orderWarrantyDays.value || 90)),
    warrantyTerms: el.orderWarrantyTerms.value.trim() || defaultWarrantyTerms,
    approved: el.orderApproved.checked,
    signatureData: el.signatureData.value,
    trackingCode: existing?.trackingCode || makeTrackingCode(),
    statusHistory: buildStatusHistory(existing, el.orderStatus.value),
    parts: selectedParts,
    suppliedParts: existing?.suppliedParts || [],
    stockDeductedParts: existing?.stockDeductedParts || [],
    quotePartName: el.quotePartName.value.trim(),
    quoteSupplierId: el.quoteSupplier.value,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.orders = upsert(state.orders, payload);
  applyOrderInventoryMovements(payload, existing);
  reconcileReceivedPurchasesToOrders({ renderAfter: false, persistAfter: false });
  logAction(existing ? "Orden actualizada" : "Orden creada", payload.folio, payload.id);
  await persistNow();
  autoQuoteMissingParts(payload).catch((error) => alert(`No se pudo cotizar automaticamente: ${error.message}`));
  resetOrderForm();
  hideOrderForm();
  render();
}

function editOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  el.orderId.value = order.id;
  el.orderClient.value = order.clientId;
  el.orderDevice.value = order.device;
  el.orderTechnician.value = order.technician || "";
  el.orderSerial.value = order.serial || "";
  el.orderStatus.value = order.status;
  el.orderDeposit.value = order.deposit || 0;
  el.orderTotal.value = order.total || 0;
  el.orderIssue.value = order.issue;
  el.orderNotes.value = order.notes || "";
  el.orderAccessories.value = order.accessories || "";
  el.orderPhysicalState.value = order.physicalState || "";
  el.orderPasscode.value = order.passcode || "";
  setPattern(parsePatternValue(order.patternValue), Number(order.patternSize || 3));
  el.orderEvidence.value = order.evidence || "";
  setEvidencePhotos(order.evidencePhotos || []);
  el.orderWarrantyDays.value = Math.max(90, Number(order.warrantyDays || 90));
  el.orderWarrantyTerms.value = order.warrantyTerms || defaultWarrantyTerms;
  el.orderApproved.checked = Boolean(order.approved);
  setSignature(order.signatureData || "");
  el.quotePartName.value = order.quotePartName || "";
  el.quoteSupplier.value = order.quoteSupplierId || "";
  setSelectedOrderParts(order.parts || []);
  updateOrderPartContext();
  showView("orders");
}

function showNewOrderForm() {
  resetOrderForm();
  hideStatusEditor();
  el.orderForm.classList.remove("is-hidden");
  showView("orders");
  el.orderDevice.focus();
}

function hideOrderForm() {
  el.orderForm.classList.add("is-hidden");
}

function editOrderStatus(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  const client = getClient(order?.clientId);
  if (!order) return;
  hideOrderForm();
  el.statusOrderId.value = order.id;
  el.statusOrderSummary.textContent = `${order.folio} | ${client?.name || "Sin cliente"} | ${order.device}`;
  el.statusOnlySelect.value = order.status;
  setStatusEvidencePhotos([]);
  el.orderStatusForm.classList.remove("is-hidden");
  showView("orders");
}

async function saveOrderStatus(event) {
  event.preventDefault();
  const orderId = el.statusOrderId.value;
  const order = state.orders.find((item) => item.id === orderId);
  if (!order) return;
  const nextStatus = el.statusOnlySelect.value;
  const statusPhotos = getStatusEvidencePhotos();
  const statusEvidencePhotos = statusPhotos.length
    ? [...(order.statusEvidencePhotos || []), {
        id: id("sev"),
        status: nextStatus,
        at: new Date().toISOString(),
        user: apiConfig.user?.name || "Local",
        photos: statusPhotos
      }]
    : (order.statusEvidencePhotos || []);
  const updatedOrder = {
    ...order,
    status: nextStatus,
    deposit: nextStatus === "Entregado" ? Number(order.total || 0) : order.deposit,
    paid: nextStatus === "Entregado" ? true : order.paid,
    updatedAt: new Date().toISOString(),
    statusHistory: buildStatusHistory(order, nextStatus),
    statusEvidencePhotos
  };
  state.orders = state.orders.map((item) =>
    item.id === orderId
      ? updatedOrder
      : item
  );
  if (nextStatus === "Entregado") {
    const existingPayment = state.payments.some((payment) => payment.orderId === orderId && payment.reference === "Liquidacion automatica por entrega");
    if (!existingPayment && Number(order.total || 0) > getOrderPaid(order)) {
      state.payments = [{
        id: id("pay"),
        orderId,
        amount: Number(order.total || 0) - getOrderPaid(order),
        method: "Liquidacion",
        reference: "Liquidacion automatica por entrega",
        createdAt: new Date().toISOString()
      }, ...state.payments];
    }
    applyPaymentsToOrder(orderId);
  }
  logAction("Estatus actualizado", `${order.folio}: ${order.status} -> ${nextStatus}`, orderId);
  await persistNow();
  await notifyClientStatusChange(updatedOrder);
  hideStatusEditor();
  render();
}

async function notifyClientStatusChange(order) {
  const client = getClient(order.clientId);
  if (!client?.phone) {
    alert("Estatus actualizado. El cliente no tiene telefono para WhatsApp.");
    return;
  }
  const opened = await sendWhatsappMessage(client.phone, buildOrderStatusMessage(order), orderWhatsappUrl(order), "el aviso de estatus");
  alert(opened ? "Estatus actualizado. WhatsApp se abrio con el aviso listo para enviar." : "Estatus actualizado. No se pudo abrir WhatsApp.");
}

function hideStatusEditor() {
  el.orderStatusForm.classList.add("is-hidden");
  el.statusOrderId.value = "";
  el.statusOrderSummary.textContent = "Orden";
  setStatusEvidencePhotos([]);
}

function archiveOrder(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order || !confirm("Archivar esta orden de reparacion?")) return;
  state.orders = state.orders.map((item) =>
    item.id === orderId ? { ...item, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : item
  );
  logAction("Orden archivada", order.folio, orderId);
  persist();
  render();
}

function resetOrderForm() {
  el.orderForm.reset();
  el.orderId.value = "";
  el.orderTechnician.value = "";
  el.orderDeposit.value = 0;
  el.orderTotal.value = 0;
  el.orderWarrantyDays.value = 90;
  el.orderWarrantyTerms.value = defaultWarrantyTerms;
  el.orderApproved.checked = false;
  clearSignaturePad();
  setPattern([], 3);
  setEvidencePhotos([]);
  el.orderPartSearch.value = "";
  setSelectedOrderParts([]);
  el.quotePartName.value = "";
  el.quotePartName.dataset.autoSuggestion = "";
  if (el.purchasePart) el.purchasePart.dataset.autoSuggestion = "";
  el.quoteSupplier.value = "";
  if (state.clients[0]) el.orderClient.value = state.clients[0].id;
  updateOrderPartContext();
}

function applyOrderInventoryMovements(order, previousOrder) {
  const previousDeducted = new Set(previousOrder?.stockDeductedParts || []);
  const nextDeducted = new Set(order.stockDeductedParts || previousOrder?.stockDeductedParts || []);
  const suppliedParts = [...(order.suppliedParts || previousOrder?.suppliedParts || [])];
  (order.parts || []).forEach((partId) => {
    if (previousDeducted.has(partId) || nextDeducted.has(partId)) return;
    const item = state.inventory.find((entry) => entry.id === partId && !entry.archived);
    if (!item) return;
    state.inventory = state.inventory.map((entry) =>
      entry.id === partId ? { ...entry, stock: Math.max(0, Number(entry.stock || 0) - 1), updatedAt: new Date().toISOString() } : entry
    );
    addInventoryMovement(partId, -1, "Salida", `Usada en orden ${order.folio}`, order.id);
    suppliedParts.push({
      id: id("sup"),
      inventoryId: partId,
      purchaseId: "",
      purchaseItemId: "",
      part: displayInventoryName(item),
      qty: 1,
      cost: Number(item.cost || 0),
      totalCost: Number(item.cost || 0),
      createdAt: new Date().toISOString()
    });
    nextDeducted.add(partId);
  });
  state.orders = state.orders.map((item) =>
    item.id === order.id ? { ...item, suppliedParts, stockDeductedParts: [...nextDeducted] } : item
  );
}

async function saveInventoryItem(event) {
  event.preventDefault();
  const existing = state.inventory.find((item) => item.id === el.itemId.value);
  const brand = el.itemBrand.value.trim();
  const model = el.itemModel.value.trim();
  const cost = Number(el.itemCost.value || 0);
  const payload = {
    id: el.itemId.value || id("inv"),
    brand,
    model,
    name: [brand, model].filter(Boolean).join(" "),
    category: el.itemCategory.value.trim(),
    stock: Math.max(0, Number(el.itemStock.value || 0)),
    min: Math.max(1, Number(el.itemMin.value || 1)),
    cost,
    subdealerPrice: calculateSubdealerPrice(cost),
    price: Number(el.itemPrice.value || 0),
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.inventory = upsert(state.inventory, payload);
  if (existing && Number(existing.stock || 0) !== Number(payload.stock || 0)) {
    addInventoryMovement(payload.id, Number(payload.stock || 0) - Number(existing.stock || 0), "Ajuste", "Ajuste manual de stock", payload.id);
  } else if (!existing) {
    addInventoryMovement(payload.id, Number(payload.stock || 0), "Entrada", "Alta inicial de articulo", payload.id);
  }
  logAction(existing ? "Inventario actualizado" : "Inventario creado", displayInventoryName(payload), payload.id);
  await persistNow();
  resetInventoryForm();
  render();
}

function editInventoryItem(itemId) {
  const item = state.inventory.find((entry) => entry.id === itemId);
  if (!item) return;
  const parsed = parseInventoryName(item);
  el.itemId.value = item.id;
  el.itemBrand.value = item.brand || parsed.brand;
  renderDeviceModels();
  el.itemModel.value = item.model || parsed.model;
  el.itemCategory.value = item.category;
  el.itemStock.value = item.stock;
  el.itemMin.value = item.min;
  el.itemCost.value = item.cost;
  el.itemSubdealerPrice.value = getSubdealerPrice(item).toFixed(2);
  el.itemPrice.value = item.price;
  showView("inventory");
}

function archiveInventoryItem(itemId) {
  const item = state.inventory.find((entry) => entry.id === itemId);
  if (!item || !confirm("Archivar articulo del inventario?")) return;
  state.inventory = state.inventory.map((entry) => entry.id === itemId ? { ...entry, archived: true, archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : entry);
  logAction("Inventario archivado", displayInventoryName(item), itemId);
  persist();
  render();
}

function resetInventoryForm() {
  el.inventoryForm.reset();
  el.itemId.value = "";
  renderDeviceModels();
  el.itemStock.value = 1;
  el.itemMin.value = 1;
  el.itemCost.value = 0;
  el.itemSubdealerPrice.value = 0;
  el.itemPrice.value = 0;
}

function calculateSubdealerPrice(cost) {
  return Math.round(Number(cost || 0) * 1.3 * 100) / 100;
}

function getSubdealerPrice(item) {
  return Number(item.subdealerPrice ?? calculateSubdealerPrice(item.cost));
}

function getOrderParts(order) {
  return (order.parts || [])
    .map((partId) => state.inventory.find((item) => item.id === partId))
    .filter(Boolean);
}

function getOrderSuppliedParts(order) {
  return (order.suppliedParts || []).filter((part) => part?.part || part?.inventoryId);
}

function getOrderPartsCost(order) {
  const suppliedParts = getOrderSuppliedParts(order);
  if (suppliedParts.length) {
    return suppliedParts.reduce((sum, part) => sum + Number(part.totalCost ?? Number(part.qty || 1) * Number(part.cost || 0)), 0);
  }
  return getOrderParts(order).reduce((sum, item) => sum + Number(item.cost || 0), 0);
}

function getOrderPartsSummary(order, includeCost = false) {
  const suppliedParts = getOrderSuppliedParts(order);
  if (suppliedParts.length) {
    return suppliedParts.map((part) => {
      const qty = Number(part.qty || 1);
      const base = `${part.part || "Refaccion"} (${qty} pza.)`;
      return includeCost ? `${base} - ${money.format(Number(part.totalCost ?? qty * Number(part.cost || 0)))}` : base;
    }).join(", ");
  }
  return getOrderParts(order).map(displayInventoryName).join(", ");
}

function getOrderMargin(order) {
  const partsCost = getOrderPartsCost(order);
  return Number(order.total || 0) - partsCost;
}

function getWarrantySummary(order) {
  const days = Number(order.warrantyDays || 0);
  if (!days && !order.warrantyTerms) return "";
  const daysText = days ? `${days} dias` : "Sin dias definidos";
  return order.warrantyTerms ? `${daysText}. ${order.warrantyTerms}` : daysText;
}

function updateSubdealerPrice() {
  el.itemSubdealerPrice.value = calculateSubdealerPrice(el.itemCost.value).toFixed(2);
}

function hydrateSettingsForm() {
  el.businessName.value = state.settings.businessName;
  el.businessPhone.value = state.settings.businessPhone;
  el.businessAddress.value = state.settings.businessAddress;
  el.whatsappTemplate.value = state.settings.whatsappTemplate;
  el.themeBrand.value = state.settings.theme.brand;
  el.themeBrandStrong.value = state.settings.theme.brandStrong;
  el.themeSidebar.value = state.settings.theme.sidebar;
  el.themePage.value = state.settings.theme.page;
  el.themePanel.value = state.settings.theme.panel;
  el.themeAccent.value = state.settings.theme.accent;
}

async function saveSettings(event) {
  event.preventDefault();
  state.settings = {
    ...state.settings,
    businessName: el.businessName.value.trim(),
    businessPhone: el.businessPhone.value.trim(),
    businessAddress: el.businessAddress.value.trim(),
    whatsappTemplate: el.whatsappTemplate.value.trim(),
    theme: getThemeFromForm()
  };
  applyTheme();
  await pushLocalData(false, { silent: true, notifyErrors: true, includeSettings: true });
  await refreshBackendData({ silent: true, force: true });
  render();
  alert("Configuracion guardada.");
}

function getThemeFromForm() {
  return {
    brand: el.themeBrand.value,
    brandStrong: el.themeBrandStrong.value,
    sidebar: el.themeSidebar.value,
    page: el.themePage.value,
    panel: el.themePanel.value,
    accent: el.themeAccent.value
  };
}

function applyTheme() {
  const theme = state.settings.theme || defaultState.settings.theme;
  const root = document.documentElement;
  root.style.setProperty("--brand", theme.brand);
  root.style.setProperty("--brand-strong", theme.brandStrong);
  root.style.setProperty("--sidebar", "#FFFFFF");
  root.style.setProperty("--page", theme.page);
  root.style.setProperty("--panel", theme.panel);
  root.style.setProperty("--accent", theme.accent);
}

function applyPreset(name) {
  const palettes = {
    teal: {
      brand: "#0B3B63",
      brandStrong: "#082C4A",
      sidebar: "#FFFFFF",
      page: "#F5F7FA",
      panel: "#ffffff",
      accent: "#20C7D8"
    },
    blue: {
      brand: "#2563eb",
      brandStrong: "#1e40af",
      sidebar: "#111827",
      page: "#edf4ff",
      panel: "#ffffff",
      accent: "#0f766e"
    },
    graphite: {
      brand: "#475569",
      brandStrong: "#334155",
      sidebar: "#0f172a",
      page: "#f1f5f9",
      panel: "#ffffff",
      accent: "#b45309"
    }
  };
  state.settings.theme = palettes[name] || palettes.teal;
  hydrateSettingsForm();
  applyTheme();
}

function getClient(clientId) {
  return state.clients.find((client) => client.id === clientId);
}

function upsert(collection, payload) {
  const index = collection.findIndex((item) => item.id === payload.id);
  if (index === -1) return [...collection, payload];
  return collection.map((item) => (item.id === payload.id ? payload : item));
}

function applyBackendRecord(stateKey, previousId, saved) {
  const backendData = saved?.data || saved;
  if (!backendData?.id || !Array.isArray(state[stateKey])) return false;
  let changed = false;
  const nextId = backendData.id;
  const existingIndex = state[stateKey].findIndex((item) => item.id === previousId || item.id === nextId);
  if (existingIndex === -1) {
    state[stateKey] = [backendData, ...state[stateKey]];
    changed = true;
  } else {
    const previous = state[stateKey][existingIndex];
    const merged = { ...previous, ...backendData };
    if (JSON.stringify(previous) !== JSON.stringify(merged)) {
      state[stateKey] = state[stateKey].map((item, index) => (index === existingIndex ? merged : item));
      changed = true;
    }
  }
  if (previousId && previousId !== nextId) {
    remapBackendRecordReferences(stateKey, previousId, nextId);
    changed = true;
  }
  return changed;
}

function remapBackendRecordReferences(stateKey, previousId, nextId) {
  if (stateKey === "clients") {
    state.orders = state.orders.map((order) => order.clientId === previousId ? { ...order, clientId: nextId } : order);
    state.appointments = state.appointments.map((appointment) => appointment.clientId === previousId ? { ...appointment, clientId: nextId } : appointment);
  }
  if (stateKey === "orders") {
    state.payments = state.payments.map((payment) => payment.orderId === previousId ? { ...payment, orderId: nextId } : payment);
    state.purchases = state.purchases.map((purchase) => purchase.orderId === previousId ? { ...purchase, orderId: nextId } : purchase);
    state.appointments = state.appointments.map((appointment) => appointment.orderId === previousId ? { ...appointment, orderId: nextId } : appointment);
    state.warrantyClaims = state.warrantyClaims.map((claim) => claim.orderId === previousId ? { ...claim, orderId: nextId } : claim);
  }
  if (stateKey === "inventory") {
    state.orders = state.orders.map((order) => ({
      ...order,
      parts: (order.parts || []).map((partId) => partId === previousId ? nextId : partId),
      stockDeductedParts: (order.stockDeductedParts || []).map((partId) => partId === previousId ? nextId : partId),
      suppliedParts: (order.suppliedParts || []).map((part) => part.inventoryId === previousId ? { ...part, inventoryId: nextId } : part)
    }));
    state.inventoryMovements = state.inventoryMovements.map((movement) => movement.itemId === previousId ? { ...movement, itemId: nextId } : movement);
  }
  if (stateKey === "suppliers") {
    state.purchases = state.purchases.map((purchase) => purchase.supplierId === previousId ? { ...purchase, supplierId: nextId } : purchase);
    state.orders = state.orders.map((order) => order.quoteSupplierId === previousId ? { ...order, quoteSupplierId: nextId } : order);
  }
  if (stateKey === "purchases") {
    state.orders = state.orders.map((order) => ({
      ...order,
      suppliedParts: (order.suppliedParts || []).map((part) => part.purchaseId === previousId ? { ...part, purchaseId: nextId } : part)
    }));
    state.inventoryMovements = state.inventoryMovements.map((movement) => movement.refId === previousId ? { ...movement, refId: nextId } : movement);
  }
}

function nextFolio() {
  const year = new Date().getFullYear();
  const count = state.orders.filter((order) => order.folio?.includes(`${year}`)).length + 1;
  return `PCF-${year}-${String(count).padStart(4, "0")}`;
}

function nextPurchaseFolio() {
  const year = new Date().getFullYear();
  const count = state.purchases.filter((purchase) => purchase.folio?.includes(`${year}`)).length + 1;
  return `OC-${year}-${String(count).padStart(4, "0")}`;
}

function makeTrackingCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function buildStatusHistory(existingOrder, nextStatus) {
  const history = existingOrder?.statusHistory ? [...existingOrder.statusHistory] : [];
  if (!history.length) {
    history.push({ status: existingOrder?.status || nextStatus || "Recibido", at: existingOrder?.createdAt || new Date().toISOString(), user: apiConfig.user?.name || "Local" });
  }
  if (history[history.length - 1]?.status !== nextStatus) {
    history.push({ status: nextStatus, at: new Date().toISOString(), user: apiConfig.user?.name || "Local" });
  }
  return history;
}

function statusClass(status) {
  return status === "Esperando pieza" ? "Esperando" : status;
}

function clientWhatsappUrl(client) {
  const text = `Hola ${client.name}, te contactamos de PCFIX para dar seguimiento a tu servicio.`;
  return `https://wa.me/${normalizePhone(client.phone)}?text=${encodeURIComponent(text)}`;
}

function supplierWhatsappUrl(supplier, text) {
  return `https://wa.me/${normalizePhone(supplier.phone)}?text=${encodeURIComponent(text)}`;
}

async function sendWhatsappMessage(phone, text, fallbackUrl, context = "mensaje") {
  const to = normalizePhone(phone);
  if (!to) {
    alert("No hay telefono valido para enviar WhatsApp.");
    return false;
  }
  window.open(fallbackUrl || `https://wa.me/${to}?text=${encodeURIComponent(text)}`, "_blank", "noreferrer");
  return true;
}

function buildOrderStatusMessage(order) {
  const client = getClient(order.clientId);
  const trackingUrl = buildTrackingUrl(order);
  const baseMessage = state.settings.whatsappTemplate
    .replaceAll("{cliente}", client?.name || "Cliente")
    .replaceAll("{equipo}", order.device)
    .replaceAll("{folio}", order.folio)
    .replaceAll("{estado}", order.status)
    .replaceAll("{total}", money.format(Number(order.total || 0)))
    + `\nSeguimiento: ${trackingUrl}`;
  if (order.status === "Entregado") {
    return `${baseMessage}\n\nGracias por confiar en ${state.settings.businessName}. Si quedaste satisfecho con el servicio, nos ayudas mucho dejando una recomendacion en nuestra pagina de Facebook:\n${facebookReviewUrl}`;
  }
  return baseMessage;
}

function orderWhatsappUrl(order) {
  const client = getClient(order.clientId);
  if (!client) return "#";
  const text = buildOrderStatusMessage(order);
  return `https://wa.me/${normalizePhone(client.phone)}?text=${encodeURIComponent(text)}`;
}

async function quoteMissingPart() {
  const supplier = state.suppliers.find((item) => item.id === el.quoteSupplier.value);
  const partName = el.quotePartName.value.trim();
  if (!supplier) {
    alert("Selecciona o registra un proveedor para cotizar.");
    return;
  }
  if (!partName) {
    alert("Escribe la pieza que necesitas cotizar.");
    return;
  }
  const client = getClient(el.orderClient.value);
  const folio = el.orderId.value
    ? state.orders.find((order) => order.id === el.orderId.value)?.folio || "Orden sin guardar"
    : "Orden sin guardar";
  const message = buildSupplierQuoteMessage(supplier, {
    folio,
    clientName: client?.name,
    device: el.orderDevice.value.trim(),
    partNames: [partName]
  });
  const opened = await sendWhatsappMessage(supplier.phone, message, supplierWhatsappUrl(supplier, message), "la cotizacion al proveedor");
  if (opened) alert("WhatsApp se abrio con la solicitud al proveedor lista para enviar.");
}

async function autoQuoteMissingParts(order) {
  const missingParts = getMissingPartsForQuote(order);
  if (!missingParts.length) return;

  const supplier = state.suppliers.find((item) => item.id === order.quoteSupplierId);
  if (!supplier) {
    alert(`La orden ${order.folio} necesita cotizar: ${missingParts.join(", ")}. Registra o selecciona un proveedor.`);
    return;
  }

  const client = getClient(order.clientId);
  const message = buildSupplierQuoteMessage(supplier, {
    folio: order.folio,
    clientName: client?.name,
    device: order.device,
    partNames: missingParts
  });
  const opened = await sendWhatsappMessage(supplier.phone, message, supplierWhatsappUrl(supplier, message), "la cotizacion al proveedor");
  if (opened) alert(`WhatsApp se abrio con la cotizacion al proveedor para ${order.folio}.`);
}

function getMissingPartsForQuote(order) {
  const missing = [];
  if (order.quotePartName && !hasInventoryStockForPart(order.quotePartName)) {
    missing.push(order.quotePartName);
  }
  (order.parts || []).forEach((partId) => {
    const item = state.inventory.find((entry) => entry.id === partId);
    if (item && Number(item.stock || 0) <= 0) missing.push(displayInventoryName(item));
  });
  return [...new Set(missing)];
}

function hasInventoryStockForPart(partName) {
  const target = normalizeSearchText(partName);
  if (!target) return false;
  return state.inventory.some((item) => {
    const searchable = normalizeSearchText([displayInventoryName(item), item.category, item.brand, item.model].filter(Boolean).join(" "));
    return Number(item.stock || 0) > 0 && (searchable.includes(target) || target.includes(searchable));
  });
}

function buildSupplierQuoteMessage(supplier, quote) {
  const managerName = supplier.contact || "encargado de tienda";
  const pieceText = quote.partNames.join(", ");
  return [
    `Hola ${managerName}, buen dia.`,
    `Te escribo de ${state.settings.businessName}.`,
    `Me puedes cotizar la siguiente pieza: ${pieceText}.`,
    "Tambien me puedes confirmar disponibilidad, por favor?"
  ].join("\n");
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function searchClientPortal(event) {
  event?.preventDefault();
  const folio = el.portalFolio.value.trim().toLowerCase();
  const phone = normalizePhone(el.portalPhone.value);
  if (!folio && !phone) {
    el.portalStatusPill.textContent = "Dato requerido";
    el.clientPortalResult.innerHTML = emptyHtml("Ingresa el folio", "Usa el numero de orden que recibiste en tu comprobante.");
    return;
  }
  if (publicPortalContext?.apiBaseUrl && folio) {
    await searchPublicPortalOrder(folio);
    return;
  }
  const orders = state.orders.filter((item) => {
    if (item.archived) return false;
    if (publicPortalContext?.code && item.trackingCode !== publicPortalContext.code) return false;
    const client = getClient(item.clientId);
    const folioMatches = folio && item.folio.toLowerCase() === folio;
    const phoneMatches = phone && normalizePhone(client?.phone) === phone;
    return folioMatches || phoneMatches;
  });
  if (!orders.length) {
    if (publicPortalContext?.apiBaseUrl && folio) {
      await searchPublicPortalOrder(folio);
      return;
    }
    el.portalStatusPill.textContent = "No encontrado";
    el.clientPortalResult.innerHTML = emptyHtml("No encontramos la orden", "Revisa el folio de orden.");
    return;
  }
  renderClientPortalOrders(orders);
}

async function searchPublicPortalOrder(folio) {
  el.portalStatusPill.textContent = "Consultando";
  el.clientPortalResult.innerHTML = emptyHtml("Consultando seguimiento", "Estamos buscando el estado de tu reparacion.");
  try {
    const params = new URLSearchParams();
    if (publicPortalContext?.code) params.set("code", publicPortalContext.code);
    const queryText = params.toString() ? `?${params.toString()}` : "";
    const response = await fetch(`${publicPortalContext.apiBaseUrl}/api/public/orders/${encodeURIComponent(folio)}${queryText}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "No se pudo consultar la orden.");
    renderClientPortalOrders([{
      ...payload.order,
      publicClient: payload.client,
      payments: []
    }]);
  } catch (error) {
    el.portalStatusPill.textContent = "No encontrado";
    el.clientPortalResult.innerHTML = emptyHtml("No encontramos la orden", error.message);
  }
}

function renderClientPortalOrders(orders) {
  el.portalStatusPill.textContent = orders.length === 1 ? orders[0].status : `${orders.length} ordenes`;
  el.clientPortalResult.innerHTML = orders.map(renderClientPortalOrderCard).join("");
}

function renderClientPortalOrderCard(order) {
  const client = order.publicClient || getClient(order.clientId);
  const balance = getOrderBalance(order);
  const paid = getOrderPaid(order);
  const tracking = getTrackingState(order.status);
  const isPublic = document.body.classList.contains("public-portal-mode");
  return `<article class="portal-card">
    <div class="portal-hero">
      <div>
        <span class="record-meta">Folio</span>
        <strong>${escapeHtml(order.folio)}</strong>
      </div>
      <span class="status ${statusClass(order.status)}">${escapeHtml(order.status)}</span>
    </div>
    <div class="tracking-summary ${tracking.key}">
      <div>
        <span>Avance de reparacion</span>
        <strong>${tracking.percent}%</strong>
      </div>
      ${renderPortalStatusAnimation(tracking)}
      <p>${escapeHtml(tracking.message)}</p>
    </div>
    ${renderPortalTimeline(order.status)}
    ${renderPortalStatusEvidence(order)}
    <div class="portal-details">
      <div><span>Cliente</span><strong>${escapeHtml(client?.name || "Cliente")}</strong></div>
      <div><span>Equipo</span><strong>${escapeHtml(order.device)}</strong></div>
      <div><span>Falla reportada</span><strong>${escapeHtml(order.issue)}</strong></div>
      <div><span>Diagnostico / avance</span><strong>${escapeHtml(order.notes || "Pendiente de actualizacion")}</strong></div>
      <div><span>Recepcion</span><strong>${escapeHtml(order.physicalState || "Estado fisico no registrado")}</strong></div>
      <div><span>Garantia</span><strong>${escapeHtml(getWarrantySummary(order) || "Pendiente por definir")}</strong></div>
      <div><span>Pagado</span><strong>${money.format(paid)}</strong></div>
      <div><span>Saldo</span><strong>${balance <= 0 ? "Pagado" : money.format(balance)}</strong></div>
      <div><span>Total</span><strong>${money.format(Number(order.total || 0))}</strong></div>
      <div><span>Ultima actualizacion</span><strong>${dateFormat.format(new Date(order.updatedAt || order.createdAt))}</strong></div>
    </div>
    ${isPublic ? "" : `<div class="record-actions">
      <a class="btn ghost" href="${orderWhatsappUrl(order)}" target="_blank" rel="noreferrer">Contactar por WhatsApp</a>
    </div>`}
  </article>`;
}

function renderPortalStatusAnimation(tracking) {
  const key = tracking.key || "recibido";
  const visual = {
    recibido: `
      <span class="device-mini"></span>
      <span class="status-wave"></span>
      <span class="status-dot one"></span>
      <span class="status-dot two"></span>`,
    diagnostico: `
      <span class="device-mini"></span>
      <span class="scan-line"></span>
      <span class="lens"></span>`,
    "en-reparacion": `
      <span class="device-mini open"></span>
      <span class="tool-line a"></span>
      <span class="tool-line b"></span>
      <span class="spark one"></span>
      <span class="spark two"></span>`,
    "esperando-pieza": `
      <span class="box"></span>
      <span class="device-mini"></span>
      <span class="clock-hand"></span>`,
    listo: `
      <span class="counter"></span>
      <span class="ready-phone"></span>
      <span class="pickup-ring"></span>
      <span class="ready-check"></span>`,
    entregado: `
      <span class="device-mini delivered"></span>
      <span class="hand-off"></span>
      <span class="ready-check"></span>`,
    cancelado: `
      <span class="device-mini muted"></span>
      <span class="cancel-line"></span>`
  }[key] || `
      <span class="device-mini"></span>
      <span class="status-wave"></span>`;

  return `<div class="tracking-visual status-animation ${key}" aria-hidden="true">${visual}</div>`;
}

function renderPortalStatusEvidence(order) {
  const entries = (order.statusEvidencePhotos || [])
    .filter((entry) => (entry.photos || []).some((photo) => photo?.src))
    .slice()
    .reverse();
  if (!entries.length) return "";
  return `<section class="portal-evidence">
    <div class="portal-section-head">
      <strong>Evidencia fotografica</strong>
      <span>${entries.reduce((sum, entry) => sum + (entry.photos || []).length, 0)} foto(s)</span>
    </div>
    ${entries.map((entry) => `<article class="portal-evidence-entry">
      <div class="portal-evidence-meta">
        <strong>${escapeHtml(entry.status || "Actualizacion")}</strong>
        <span>${entry.at ? dateFormat.format(new Date(entry.at)) : "Fecha no registrada"}</span>
      </div>
      <div class="portal-photo-grid">
        ${(entry.photos || []).filter((photo) => photo?.src).map((photo, index) => `<a href="${escapeAttr(photo.src)}" target="_blank" rel="noreferrer" class="portal-photo">
          <img src="${escapeAttr(photo.src)}" alt="Evidencia ${escapeAttr(entry.status || "")} ${index + 1}">
        </a>`).join("")}
      </div>
    </article>`).join("")}
  </section>`;
}

function renderPortalTimeline(status) {
  const tracking = getTrackingState(status);
  const steps = tracking.steps;
  return `<div class="tracking-timeline ${tracking.key}" style="--progress:${tracking.percent}%">
    <div class="tracking-line" aria-hidden="true"></div>
    ${steps.map((step, index) => {
      const state = index < tracking.index ? "done" : index === tracking.index ? "current" : "pending";
      return `<div class="tracking-step ${state}">
        <span class="tracking-dot">${state === "done" ? "&check;" : index + 1}</span>
        <strong>${escapeHtml(step.label)}</strong>
        <small>${escapeHtml(step.detail)}</small>
      </div>`;
    }).join("")}
  </div>`;
}

function getTrackingState(status) {
  const normalized = status === "Esperando pieza" ? "En reparacion" : status;
  const steps = [
    { label: "Recibido", detail: "Equipo registrado" },
    { label: "Diagnostico", detail: "Revision tecnica" },
    { label: "En reparacion", detail: "Trabajo en proceso" },
    { label: "Listo", detail: "Preparado para entrega" },
    { label: "Entregado", detail: "Servicio finalizado" }
  ];
  const rawIndex = steps.findIndex((step) => step.label === normalized);
  const index = status === "Cancelado" ? 0 : Math.max(0, rawIndex);
  const percent = status === "Cancelado" ? 0 : Math.round((index / (steps.length - 1)) * 100);
  const messages = {
    Recibido: "Tu equipo ya fue recibido y esta en fila para revision.",
    Diagnostico: "Estamos revisando el equipo para confirmar falla, piezas y costo.",
    "En reparacion": "La reparacion esta en proceso con el tecnico.",
    "Esperando pieza": "La reparacion esta pausada mientras llega la pieza necesaria.",
    Listo: "Tu equipo esta listo para entrega.",
    Entregado: "El servicio fue entregado y cerrado.",
    Cancelado: "La orden fue cancelada. Contacta al taller para mas detalles."
  };
  return {
    steps,
    index,
    percent,
    key: trackingKey(status),
    message: messages[status] || "Seguimiento actualizado por PCFIX."
  };
}

function trackingKey(status) {
  return String(status || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
}

function resolvePublicApiBaseUrl() {
  if (location.hostname.includes("pcfix-sistema.onrender.com")) return "https://pcfix-backend.onrender.com";
  if (apiConfig.baseUrl && !apiConfig.baseUrl.includes("localhost") && !apiConfig.baseUrl.includes("127.0.0.1")) {
    return apiConfig.baseUrl.replace(/\/$/, "");
  }
  if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return "http://localhost:8080";
  return "";
}

function buildTrackingUrl(order) {
  const params = new URLSearchParams({ folio: order.folio });
  if (order.trackingCode) params.set("code", order.trackingCode);
  const apiBaseUrl = resolvePublicApiBaseUrl();
  if (apiBaseUrl) params.set("api", apiBaseUrl);
  return `${location.origin}${location.pathname}#seguimiento?${params.toString()}`;
}

async function sendTrackingWhatsapp(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  const client = getClient(order?.clientId);
  if (!order || !client) return;
  const url = buildTrackingUrl(order);
  const text = [
    `Hola ${client.name}, te compartimos el seguimiento de tu reparacion en PCFIX.`,
    `Folio: ${order.folio}`,
    `Codigo: ${order.trackingCode || "No definido"}`,
    `Telefono registrado: ${client.phone}`,
    `Enlace: ${url}`
  ].join("\n");
  const fallback = `https://wa.me/${normalizePhone(client.phone)}?text=${encodeURIComponent(text)}`;
  const opened = await sendWhatsappMessage(client.phone, text, fallback, "el seguimiento");
  if (opened) alert("WhatsApp se abrio con el seguimiento listo para enviar.");
}

async function sendQuoteWhatsapp(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  const client = getClient(order?.clientId);
  if (!order || !client) return;
  const balance = Math.max(0, Number(order.total || 0) - Number(order.deposit || 0));
  const paid = getOrderPaid(order);
  const warranty = getWarrantySummary(order);
  const parts = getOrderPartsSummary(order) || "Pendiente por confirmar";
  const text = [
    `Hola ${client.name}, te compartimos la cotizacion de tu reparacion en ${state.settings.businessName}.`,
    `Folio: ${order.folio}`,
    `Equipo: ${order.device}`,
    `Falla: ${order.issue}`,
    `Diagnostico: ${order.notes || "Pendiente de confirmar"}`,
    `Refacciones: ${parts}`,
    `Total: ${money.format(Number(order.total || 0))}`,
    `Pagado: ${money.format(paid)}`,
    `Saldo: ${balance <= 0 ? "Pagado" : money.format(balance)}`,
    `Garantia: ${warranty || "Por definir"}`,
    "Por favor responde ACEPTADO para autorizar el trabajo."
  ].join("\n");
  const fallback = `https://wa.me/${normalizePhone(client.phone)}?text=${encodeURIComponent(text)}`;
  const opened = await sendWhatsappMessage(client.phone, text, fallback, "la cotizacion");
  if (opened) alert("WhatsApp se abrio con la cotizacion lista para enviar.");
}

async function sendReviewWhatsapp(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  const client = getClient(order?.clientId);
  if (!order || !client) return;
  const text = [
    `Hola ${client.name}, gracias por confiar en ${state.settings.businessName}.`,
    `Tu servicio ${order.folio} quedo finalizado.`,
    "Si quedaste satisfecho, nos ayudas mucho dejando una recomendacion en nuestra pagina de Facebook.",
    facebookReviewUrl,
    "Tu opinion ayuda a que mas clientes reparen sus equipos con confianza."
  ].join("\n");
  const fallback = `https://wa.me/${normalizePhone(client.phone)}?text=${encodeURIComponent(text)}`;
  const opened = await sendWhatsappMessage(client.phone, text, fallback, "la solicitud de resena");
  if (opened) alert("WhatsApp se abrio con la solicitud de resena lista para enviar.");
}

function openOrderPdf(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  const client = getClient(order?.clientId);
  if (!order || !client) return;
  const parts = getOrderPartsSummary(order, true);
  const warranty = getWarrantySummary(order);
  const photos = (order.evidencePhotos || []).filter((photo) => photo?.src);
  const paid = getOrderPaid(order);
  const balance = getOrderBalance(order);
  const trackingUrl = buildTrackingUrl(order);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(trackingUrl)}`;
  el.printArea.innerHTML = `<section class="print-sheet">
    <div class="print-brandbar"></div>
    <div class="print-header">
      <div class="print-brand">
        <img src="assets/logo-pcfix.png" alt="PCFix Comitan">
        <div>
          <h2>${escapeHtml(state.settings.businessName)}</h2>
          <p>${escapeHtml(state.settings.businessAddress || "Comitan de Dominguez, Chiapas")}</p>
          <p>WhatsApp: ${escapeHtml(state.settings.businessPhone || "")}</p>
        </div>
      </div>
      <div class="print-order-box">
        <span>Orden de servicio</span>
        <strong>${escapeHtml(order.folio)}</strong>
        <p>${dateFormat.format(new Date(order.createdAt))}</p>
        <p>Codigo: ${escapeHtml(order.trackingCode || "N/A")}</p>
      </div>
    </div>
    <div class="print-summary">
      <div><span>Estado</span><strong>${escapeHtml(order.status)}</strong></div>
      <div><span>Total</span><strong>${money.format(Number(order.total || 0))}</strong></div>
      <div><span>Pagado</span><strong>${money.format(paid)}</strong></div>
      <div><span>Saldo</span><strong>${balance <= 0 ? "Pagado" : money.format(balance)}</strong></div>
    </div>
    <div class="print-grid">
      <div class="print-card">
        <span>Cliente</span>
        <strong>${escapeHtml(client.name)}</strong>
        <p>${escapeHtml(client.phone)}</p>
        <p>${escapeHtml(client.email || "Sin correo registrado")}</p>
      </div>
      <div class="print-card">
        <span>Equipo</span>
        <strong>${escapeHtml(order.device)}</strong>
        <p>Serie/IMEI: ${escapeHtml(order.serial || "N/A")}</p>
        <p>Recepcion: ${escapeHtml(order.physicalState || "No registrada")}</p>
      </div>
      <div class="print-card print-qr-card">
        <span>Seguimiento</span>
        <img class="print-qr" src="${qrUrl}" alt="QR de seguimiento">
        <p>Escanea para consultar avance</p>
      </div>
    </div>
    <div class="print-section">
      <h3>Falla reportada</h3>
      <p>${escapeHtml(order.issue)}</p>
    </div>
    <div class="print-section">
      <h3>Diagnostico / trabajo realizado</h3>
      <p>${escapeHtml(order.notes || "Pendiente")}</p>
    </div>
    <div class="print-section">
      <h3>Recepcion y evidencia</h3>
      <p><strong>Accesorios:</strong> ${escapeHtml(order.accessories || "No registrado")}</p>
      <p><strong>Clave / patron:</strong> ${escapeHtml(order.passcode || order.patternValue || "No registrado")}</p>
      <p><strong>Evidencia:</strong> ${escapeHtml(order.evidence || "No registrada")}</p>
      <p><strong>Aprobacion:</strong> ${order.approved ? "Cliente aprueba diagnostico y condiciones" : "Pendiente de aprobacion"}</p>
      ${order.signatureData ? `<div class="print-signature"><strong>Firma del cliente</strong><img src="${escapeAttr(order.signatureData)}" alt="Firma del cliente"></div>` : ""}
      ${photos.length ? `<div class="print-photos">${photos.map((photo, index) => `<figure><img src="${escapeAttr(photo.src)}" alt="Evidencia ${index + 1}"><figcaption>${escapeHtml(photo.name || `Foto ${index + 1}`)}</figcaption></figure>`).join("")}</div>` : ""}
    </div>
    <div class="print-section">
      <h3>Refacciones</h3>
      <p>${escapeHtml(parts || "Sin refacciones registradas")}</p>
      <p><strong>Costo aplicado a la orden:</strong> ${money.format(getOrderPartsCost(order))}</p>
    </div>
    <div class="print-section">
      <h3>Garantia</h3>
      <p>${escapeHtml(warranty || "Sin garantia registrada")}</p>
    </div>
    <div class="print-footer-note">Documento generado por PCFix Comitan. Conserva esta orden para seguimiento, garantia y entrega del equipo.</div>
  </section>`;
  el.pdfDialog.showModal();
}

function exportInventoryCsv() {
  const rows = [["Marca", "Modelo", "Articulo", "Categoria", "Stock", "Minimo", "Costo", "Precio subdistribuidor", "Precio"]];
  state.inventory.forEach((item) => rows.push([
    item.brand || parseInventoryName(item).brand,
    item.model || parseInventoryName(item).model,
    displayInventoryName(item),
    item.category,
    item.stock,
    item.min,
    item.cost,
    getSubdealerPrice(item),
    item.price
  ]));
  download("inventario-pcfix.csv", rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function exportReportsCsv() {
  const rows = [["Tipo", "Fecha", "Folio", "Cliente/Proveedor", "Concepto", "Estado/Metodo", "Monto"]];
  state.orders.filter((order) => !order.archived).forEach((order) => {
    const client = getClient(order.clientId);
    rows.push(["Orden", order.createdAt, order.folio, client?.name || "", order.device, order.status, order.total || 0]);
  });
  state.payments.forEach((payment) => {
    const order = state.orders.find((item) => item.id === payment.orderId);
    const client = getClient(order?.clientId);
    rows.push(["Pago", payment.createdAt, order?.folio || "", client?.name || "", payment.reference || "", payment.method, payment.amount || 0]);
  });
  state.purchases.filter((purchase) => !purchase.archived).forEach((purchase) => {
    const supplier = state.suppliers.find((item) => item.id === purchase.supplierId);
    rows.push(["Compra", purchase.createdAt, purchase.folio, supplier?.name || "", normalizePurchaseItems(purchase).map((item) => `${item.part} (${item.qty})`).join(" | "), purchase.status, getPurchaseTotal(purchase)]);
  });
  state.warrantyClaims.filter((claim) => !claim.archived).forEach((claim) => {
    const order = state.orders.find((item) => item.id === claim.orderId);
    rows.push(["Garantia", claim.createdAt, order?.folio || "", "", claim.reason, claim.status, claim.cost || 0]);
  });
  download(`reportes-pcfix-${new Date().toISOString().slice(0, 10)}.csv`, rows.map((row) => row.map(csvCell).join(",")).join("\n"), "text/csv");
}

function exportBackup() {
  download(`respaldo-pcfix-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(state, null, 2), "application/json");
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function hydrateApiForm() {
  el.apiBaseUrl.value = apiConfig.baseUrl || productionApiBaseUrl;
  el.apiEmail.value = apiConfig.email || defaultApiEmail;
  el.apiPassword.value = "";
  el.loginApiBaseUrl.value = apiConfig.baseUrl || productionApiBaseUrl;
  el.loginEmail.value = apiConfig.email || defaultApiEmail;
  el.loginPassword.value = "";
  updateApiStatus();
}

function updateApiStatus() {
  if (!apiConfig.token) {
    el.apiStatus.textContent = "Requiere login";
    return;
  }
  if (!navigator.onLine) {
    el.apiStatus.textContent = "Sin conexion al servidor";
    return;
  }
  if (isSyncingNow) {
    el.apiStatus.textContent = "Sincronizando...";
    return;
  }
  if (syncQueue.length) {
    el.apiStatus.textContent = `Pendiente: ${syncQueue.length} cambio(s)`;
    return;
  }
  el.apiStatus.textContent = "Servidor: guardado";
}

function enforceAccessMode() {
  const isPublicPortal = document.body.classList.contains("public-portal-mode");
  if (isPublicPortal) {
    hideLoginScreen();
    return;
  }
  if (!apiConfig.token) {
    showLoginScreen();
    updateApiStatus();
    return;
  }
  hideLoginScreen();
  cloudStartupSync();
}

function showLoginScreen() {
  document.body.classList.add("auth-locked");
  el.loginScreen.classList.remove("is-hidden");
}

function hideLoginScreen() {
  document.body.classList.remove("auth-locked");
  el.loginScreen.classList.add("is-hidden");
}

async function loginFromScreen(event) {
  event.preventDefault();
  try {
    apiConfig.baseUrl = el.loginApiBaseUrl.value.trim().replace(/\/$/, "");
    apiConfig.email = el.loginEmail.value.trim();
    apiConfig.serverMode = true;
    await authenticateBackend(apiConfig.baseUrl, apiConfig.email, el.loginPassword.value);
    saveApiConfig();
    hydrateApiForm();
    hideLoginScreen();
    await pullBackendData({ silent: true });
    updateApiStatus();
    render();
  } catch (error) {
    alert(`No se pudo iniciar sesion: ${error.message}`);
  }
}

async function loginBackend() {
  try {
    apiConfig.baseUrl = el.apiBaseUrl.value.trim().replace(/\/$/, "");
    apiConfig.email = el.apiEmail.value.trim();
    apiConfig.serverMode = true;
    await authenticateBackend(apiConfig.baseUrl, apiConfig.email, el.apiPassword.value);
    saveApiConfig();
    hydrateApiForm();
    updateApiStatus();
    loadBackendUsers();
    if (isLocalStateEmpty()) {
      const recovered = await pullBackendData({ silent: true });
      alert(recovered ? "Backend conectado y datos recuperados." : "Backend conectado. No se encontraron datos para recuperar.");
    } else {
      alert("Backend conectado.");
    }
  } catch (error) {
    alert(`Error de conexion: ${error.message}`);
  }
}

async function authenticateBackend(baseUrl, email, password) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "No se pudo conectar.");
  apiConfig.baseUrl = baseUrl;
  apiConfig.email = email;
  apiConfig.token = payload.token;
  apiConfig.user = payload.user;
  return payload;
}

function disconnectBackend() {
  apiConfig.token = "";
  apiConfig.user = null;
  apiConfig.serverMode = true;
  saveApiConfig();
  hydrateApiForm();
  updateApiStatus();
  enforceAccessMode();
}

async function apiRequest(path, options = {}) {
  if (!apiConfig.token) throw new Error("Primero conecta al backend.");
  const response = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiConfig.token}`,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof payload.error === "string"
      ? payload.error
      : payload.error?.message || payload.message || payload.error?.error_user_msg || "Error de backend.";
    throw new Error(detail);
  }
  return payload;
}

const syncCollections = [
  ["settings", "settings", true],
  ["clients", "client"],
  ["orders", "order"],
  ["inventory", "inventory"],
  ["suppliers", "supplier"],
  ["appointments", "appointment"],
  ["purchases", "purchase"],
  ["payments", "payment"],
  ["inventoryMovements", "inventoryMovement"],
  ["warrantyClaims", "warrantyClaim"],
  ["auditLog", "auditEntry"]
];

async function pushLocalData(confirmFirst = true, options = {}) {
  const pendingRecords = getPendingSyncRecords();
  if (!pendingRecords.length && !options.includeSettings) return true;
  if (confirmFirst && !confirm("Enviar cambios actuales al servidor? Los registros con el mismo ID se actualizaran.")) return;
  try {
    let changedByBackend = false;
    if (options.includeSettings) {
      const savedSettings = await apiRequest("/api/records/settings", {
        method: "POST",
        body: JSON.stringify({ id: "settings", data: { id: "settings", ...state.settings }, detail: "Sincronizacion en linea" })
      });
      if (savedSettings?.data) {
        const { id: _id, ...settings } = savedSettings.data;
        state.settings = {
          ...state.settings,
          ...settings,
          theme: { ...state.settings.theme, ...(settings.theme || {}) }
        };
        changedByBackend = true;
      }
    }
    for (const { stateKey, apiType, record } of pendingRecords) {
      const saved = await apiRequest(`/api/records/${apiType}`, {
        method: "POST",
        body: JSON.stringify({ id: record.id, data: record, detail: "Sincronizacion en linea" })
      });
      if (applyBackendRecord(stateKey, record.id, saved)) changedByBackend = true;
    }
    if (changedByBackend) persistLocalOnly();
    clearPendingSync();
    if (!options.silent) alert("Cambios enviados al servidor.");
    await pullBackendData({ silent: true });
    lastBackendRefreshAt = Date.now();
    return true;
  } catch (error) {
    if (!options.silent || options.notifyErrors) alert(`No se pudo guardar en servidor: ${error.message}`);
    updateApiStatus();
    return false;
  }
}

function getPendingSyncRecords() {
  if (!syncQueue.length) return [];
  const oldestPending = Math.min(...syncQueue.map((item) => new Date(item.at).getTime()).filter(Number.isFinite));
  const since = Number.isFinite(oldestPending) ? oldestPending - 120000 : Date.now() - 120000;
  const result = [];
  for (const [stateKey, apiType, isSingleton] of syncCollections) {
    if (isSingleton) continue;
    for (const record of state[stateKey] || []) {
      if (wasRecordChangedSince(record, since)) result.push({ stateKey, apiType, record });
    }
  }
  return result;
}

function wasRecordChangedSince(record, since) {
  const dates = [record?.updatedAt, record?.createdAt, record?.archivedAt, record?.receivedAt].filter(Boolean);
  return dates.some((value) => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= since;
  });
}

function scheduleServerSync(immediate = false) {
  if (!apiConfig.token || isPullingFromBackend) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(flushSyncQueue, immediate ? 10 : 1200);
}

async function flushSyncQueue() {
  if (!apiConfig.token || isPullingFromBackend || isSyncingNow || !syncQueue.length) return;
  if (!navigator.onLine) {
    updateApiStatus();
    return;
  }
  isSyncingNow = true;
  updateApiStatus();
  const ok = await pushLocalData(false, { silent: true, notifyErrors: true });
  isSyncingNow = false;
  updateApiStatus();
  if (!ok && syncQueue.length) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(flushSyncQueue, 30000);
  }
}

async function loadBackendUsers() {
  if (!apiConfig.token) return;
  try {
    const users = await apiRequest("/api/users");
    el.userCount.textContent = users.length;
    el.userList.innerHTML = users.length
      ? users.map((user) => `<article class="record-card compact-card">
          <div class="record-head">
            <div class="record-title">
              <strong>${escapeHtml(user.name)}</strong>
              <span>${escapeHtml(user.email)} | ${escapeHtml(user.role)}</span>
            </div>
            <span class="status ${user.active ? "" : "Cancelado"}">${user.active ? "Activo" : "Inactivo"}</span>
          </div>
          <div class="record-actions">
            ${user.active ? `<button class="btn danger" onclick="deactivateBackendUser('${user.id}')">Desactivar</button>` : ""}
          </div>
        </article>`).join("")
      : emptyHtml("Sin usuarios", "Crea usuarios para operar el sistema.");
  } catch (error) {
    el.userList.innerHTML = emptyHtml("No se pudo cargar usuarios", error.message);
  }
}

async function createBackendUser() {
  try {
    const payload = {
      name: el.newUserName.value.trim(),
      email: el.newUserEmail.value.trim(),
      password: el.newUserPassword.value,
      role: el.newUserRole.value
    };
    if (!payload.name || !payload.email || !payload.password) {
      alert("Completa nombre, email y password.");
      return;
    }
    await apiRequest("/api/users", { method: "POST", body: JSON.stringify(payload) });
    el.newUserName.value = "";
    el.newUserEmail.value = "";
    el.newUserPassword.value = "";
    await loadBackendUsers();
    alert("Usuario creado.");
  } catch (error) {
    alert(`No se pudo crear usuario: ${error.message}`);
  }
}

async function deactivateBackendUser(userId) {
  if (!confirm("Desactivar este usuario?")) return;
  try {
    await apiRequest(`/api/users/${userId}/deactivate`, { method: "POST", body: "{}" });
    await loadBackendUsers();
  } catch (error) {
    alert(`No se pudo desactivar: ${error.message}`);
  }
}

async function pullBackendData(options = {}) {
  if (!options.silent && !confirm("Actualizar datos desde el servidor?")) return;
  try {
    const nextState = structuredClone(defaultState);
    const settingsRows = await apiRequest("/api/records/settings");
    if (settingsRows[0]?.data) {
      const { id: _id, ...settings } = settingsRows[0].data;
      nextState.settings = {
        ...nextState.settings,
        ...settings,
        theme: { ...nextState.settings.theme, ...(settings.theme || {}) }
      };
    }
    for (const [stateKey, apiType, isSingleton] of syncCollections) {
      if (isSingleton) continue;
      const rows = await apiRequest(`/api/records/${apiType}`);
      nextState[stateKey] = rows.map((row) => row.data || row);
    }
    isPullingFromBackend = true;
    state = nextState;
    reconcileReceivedPurchasesToOrders({ renderAfter: false, persistAfter: false });
    persistLocalOnly();
    isPullingFromBackend = false;
    applyTheme();
    hydrateSettingsForm();
    render();
    if (!options.silent) alert("Datos actualizados desde el servidor.");
    return true;
  } catch (error) {
    if (!options.silent) alert(`No se pudo descargar: ${error.message}`);
    return false;
  }
}

async function refreshBackendData(options = {}) {
  if (!apiConfig.token || !navigator.onLine || document.body.classList.contains("public-portal-mode")) return false;
  if (isSyncingNow || isRefreshingFromBackend || isPullingFromBackend) return false;
  const minInterval = Number(options.minInterval ?? 0);
  if (!options.force && minInterval && Date.now() - lastBackendRefreshAt < minInterval) return false;
  isRefreshingFromBackend = true;
  try {
    const ok = await pullBackendData({ silent: true });
    if (ok) lastBackendRefreshAt = Date.now();
    return ok;
  } finally {
    isRefreshingFromBackend = false;
  }
}

async function autoRecoverFromBackendIfEmpty() {
  if (!isLocalStateEmpty() || !apiConfig.token || !apiConfig.baseUrl || !navigator.onLine) return;
  el.apiStatus.textContent = "Recuperando backend...";
  await refreshBackendData({ silent: true, force: true });
  updateApiStatus();
}

async function cloudStartupSync() {
  if (document.body.classList.contains("public-portal-mode") || !navigator.onLine || !apiConfig.token) return;
  try {
    apiConfig.baseUrl = (apiConfig.baseUrl || productionApiBaseUrl).replace(/\/$/, "");
    apiConfig.email = apiConfig.email || defaultApiEmail;
    apiConfig.serverMode = true;
    el.apiStatus.textContent = "Conectando nube...";
    saveApiConfig();
    hydrateApiForm();
    el.apiStatus.textContent = "Descargando nube...";
    await refreshBackendData({ silent: true, force: true });
    updateApiStatus();
  } catch (error) {
    el.apiStatus.textContent = "Nube no conectada";
  }
}

function emptyHtml(title = "Sin registros", detail = "Agrega informacion para comenzar.") {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}


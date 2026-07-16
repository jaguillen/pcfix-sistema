const PCFIX_FRONTEND_VERSION = "pcfix-identidad-visual-20260716-03";
window.PCFIX_FRONTEND_VERSION = PCFIX_FRONTEND_VERSION;
const API_DEFAULT = "https://pcfix-backend.onrender.com";
const EMAIL_DEFAULT = "admin@pcfix.local";
const SESSION_KEY = "pcfix-online-session-v2";
const facebookReviewUrl = "https://www.facebook.com/pcfixcomitan";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dateFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });
const dateTimeFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" });
const orderStatuses = ["Recibido", "Diagnostico", "Esperando pieza", "En reparacion", "Listo", "Entregado", "Cancelado"];
const repairProgressStatuses = ["Recibido", "Diagnostico", "Esperando pieza", "En reparacion", "Listo", "Entregado"];
const purchaseStatuses = ["Cotizando", "Pedido", "Recibido", "Cancelado"];
const categories = [
  "Pantallas y display",
  "Baterias",
  "Puertos de carga y conectores",
  "Cables flex y antenas",
  "Camaras, microfonos y altavoces",
  "Tarjetas madre y placas",
  "RAM y almacenamiento",
  "Cargadores, fuentes y adaptadores",
  "Teclados, touchpads y botones",
  "Carcasas y tapas",
  "Herramientas y consumibles",
  "Software y servicios"
];
const modelCatalog = [
  "Apple iPhone 11", "Apple iPhone 12", "Apple iPhone 13", "Apple iPhone 14", "Apple iPhone 15", "Apple iPhone 16",
  "Samsung Galaxy A15", "Samsung Galaxy A25", "Samsung Galaxy A35", "Samsung Galaxy A55", "Samsung Galaxy S23", "Samsung Galaxy S24", "Samsung Galaxy S25",
  "Motorola Moto G54", "Motorola Moto G84", "Motorola Edge 40", "Motorola Edge 50",
  "Xiaomi Redmi Note 12", "Xiaomi Redmi Note 13", "Xiaomi Redmi Note 14", "POCO X6", "POCO X7",
  "OPPO A38", "OPPO A58", "OPPO Reno 11", "OPPO Reno 12",
  "Huawei Nova 11", "Huawei Nova 12", "Honor X8b", "Honor X9b",
  "HP Pavilion", "HP Envy", "Dell Inspiron", "Dell Latitude", "Lenovo IdeaPad", "Lenovo ThinkPad", "ASUS VivoBook", "Acer Aspire"
];
const commonFailures = [
  { label: "No carga", text: "Equipo no carga o requiere revisar centro de carga, cable flex, bateria y consumo." },
  { label: "Pantalla rota", text: "Pantalla/display roto o sin imagen; validar touch, brillo, marco y sellado." },
  { label: "Bateria", text: "Bateria se descarga rapido, esta inflada o no retiene carga." },
  { label: "Humedad", text: "Posible dano por humedad; requiere limpieza, diagnostico de placa y prueba de componentes." },
  { label: "Audio", text: "Falla de bocina, auricular o microfono; validar modulo de audio y flex." },
  { label: "Camara", text: "Camara no enfoca, no abre o presenta manchas; revisar modulo y flex." },
  { label: "Software", text: "Sistema lento, bloqueado o con errores; requiere respaldo, reinstalacion o actualizacion." },
  { label: "Laptop lenta", text: "Equipo lento; revisar disco, RAM, temperatura, sistema y estado fisico." },
  { label: "Teclado", text: "Teclas no responden o touchpad falla; revisar flex, teclado y humedad." },
  { label: "No enciende", text: "Equipo no enciende; revisar bateria, fuente, placa, boton de encendido y consumo." }
];

const defaultState = {
  settings: {
    businessName: "PCFIX COMITAN",
    businessPhone: "9631234567",
    businessAddress: "Comitan de Dominguez, Chiapas",
    whatsappTemplate: "Hola {cliente}, tu equipo {equipo} con folio {folio} esta en estado: {estado}.",
    theme: {}
  },
  clients: [],
  orders: [],
  inventory: [],
  suppliers: [],
  technicians: [],
  purchases: [],
  payments: [],
  inventoryMovements: [],
  appointments: [],
  warrantyClaims: [],
  auditLog: []
};

const clone = (value) => JSON.parse(JSON.stringify(value));

let state = clone(defaultState);
let session = loadSession();
let activeView = "dashboard";
let busy = false;
let currentEvidencePhotos = [];
let currentSelectedParts = [];
let currentAdminReport = null;
let currentPortalOrder = null;
let currentPortalClient = null;
let lastDatabaseLoadAt = 0;
let pendingSuggestedPurchase = null;
let lastMissingPartPromptKey = "";

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  boot().catch((error) => {
    console.error(error);
    showLoginAlert(`Error inicializando sistema: ${error.message}`, "error");
  });
});
window.addEventListener("unhandledrejection", (event) => {
  event.preventDefault();
  showAlert(event.reason?.message || "No se pudo completar la operacion.", "error");
});

async function boot() {
  hydrateLogin();
  wireLoginEvents();
  fillStaticOptions();
  wireEvents();
  startLiveRefresh();
  clearBrowserResidue().catch(() => {});
  showLoginAlert(`Frontend ${PCFIX_FRONTEND_VERSION}`, "ok");
  if (isPublicPortalRequest()) {
    enablePublicPortalMode();
    return;
  }
  if (session.token) {
    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    const loaded = await loadStateFromDb();
    if (!loaded) {
      logout();
      showLoginAlert("Sesion expirada. Ingresa de nuevo.", "error");
    }
  }
}

function isPublicPortalRequest() {
  const params = new URLSearchParams(window.location.search);
  return params.has("portal") || params.has("seguimiento") || params.has("folio") || params.has("orden") || params.has("whatsapp") || window.location.hash.toLowerCase().includes("portal");
}

function enablePublicPortalMode() {
  const params = new URLSearchParams(window.location.search);
  const lookup = params.get("folio") || params.get("orden") || params.get("whatsapp") || params.get("q") || "";
  document.body.classList.add("public-portal-mode");
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  activeView = "portal";
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  $("portalView").classList.add("active");
  $("viewTitle").textContent = "Seguimiento PCFix";
  $("viewSubtitle").textContent = "Consulta el avance de tu reparacion.";
  $("portalFolio").value = lookup;
  $("portalResult").innerHTML = portalWelcome();
  if (lookup) $("portalForm").requestSubmit();
}

async function clearBrowserResidue() {
  [
    "pcfix-system-v1",
    "pcfix-pending-sync-v1",
    "pcfix-local-snapshots-v1",
    "pcfix-api-config-v1",
    "pcfix-api-session-v1",
    "pcfix-online-config-v2"
  ].forEach((key) => localStorage.removeItem(key));
  if ("caches" in window) {
    const keys = await caches.keys().catch(() => []);
    await Promise.all(keys.map((key) => caches.delete(key))).catch(() => {});
  }
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
    await Promise.all(registrations.map((registration) => registration.unregister())).catch(() => {});
  }
}

function loadSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    return {
      baseUrl: API_DEFAULT,
      email: EMAIL_DEFAULT,
      token: saved.token || "",
      user: saved.user || null
    };
  } catch {
    return { baseUrl: API_DEFAULT, email: EMAIL_DEFAULT, token: "", user: null };
  }
}

function saveSession() {
  if (session.token) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: session.token, user: session.user }));
  else sessionStorage.removeItem(SESSION_KEY);
}

function hydrateLogin() {
  $("loginServer").value = session.baseUrl || API_DEFAULT;
  $("loginEmail").value = session.email || EMAIL_DEFAULT;
}

function fillStaticOptions() {
  $("orderStatus").innerHTML = orderStatuses.map((s) => `<option>${s}</option>`).join("");
  $("purchaseStatus").innerHTML = purchaseStatuses.map((s) => `<option>${s}</option>`).join("");
  $("categorySuggestions").innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");
  $("modelSuggestions").innerHTML = modelCatalog.map((m) => `<option value="${escapeHtml(m)}"></option>`).join("");
}

function wireLoginEvents() {
  $("loginForm").addEventListener("submit", login);
}

function wireEvents() {
  $("logoutBtn").addEventListener("click", logout);
  $("newOrderBtn").addEventListener("click", () => showOrderForm());
  $("cancelOrderBtn").addEventListener("click", hideOrderForm);
  $("searchInput").addEventListener("input", render);
  document.querySelectorAll("#nav button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  $("clientForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveClient(event)); });
  $("supplierForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveSupplier(event)); });
  $("inventoryForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveInventory(event)); });
  $("orderForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveOrder(event)); });
  $("purchaseForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => savePurchase(event)); });
  $("paymentForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => savePayment(event)); });
  $("settingsForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveSettings(event)); });
  $("portalForm").addEventListener("submit", searchPortal);
  $("itemCost").addEventListener("input", () => $("itemSubdealer").value = calculateSubdealer($("itemCost").value).toFixed(2));
  $("orderDevice").addEventListener("input", updateOrderSuggestions);
  $("orderDevice").addEventListener("change", maybeOfferPurchaseForMissingPart);
  $("orderIssue").addEventListener("input", updateOrderSuggestions);
  $("orderEvidence").addEventListener("change", handleEvidenceFiles);
  $("patternSize").addEventListener("change", renderPatternGrid);
  $("addPurchaseItemBtn").addEventListener("click", () => addPurchaseItemRow());
  $("purchaseItems").addEventListener("input", updatePurchaseItemsTotal);
  $("paymentOrder").addEventListener("change", updatePaymentBalanceHint);
  $("addOrderPartBtn").addEventListener("click", addSelectedOrderPart);
  $("orderPartQty").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSelectedOrderPart();
    }
  });
  $("printOrderBtn").addEventListener("click", () => {
    const order = $("orderId").value ? state.orders.find((item) => item.id === $("orderId").value) : null;
    printOrderDocument(order || draftOrderFromForm());
  });
  $("appointmentForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveAppointment(event)); });
  $("warrantyForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveWarranty(event)); });
  $("technicianForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveTechnician(event)); });
  $("suggestedPurchaseForm").addEventListener("submit", (event) => { event.preventDefault(); runAction(() => saveSuggestedPurchase(event)); });
  $("closePurchaseSuggestionBtn").addEventListener("click", closePurchaseSuggestion);
  $("cancelPurchaseSuggestionBtn").addEventListener("click", closePurchaseSuggestion);
  $("loadAdminReportBtn").addEventListener("click", loadAdminReports);
  $("themeBlue").addEventListener("input", applyThemeFromInputs);
  $("themeCyan").addEventListener("input", applyThemeFromInputs);
  $("motionEnabled").addEventListener("change", applyThemeFromInputs);
  document.querySelectorAll("[data-reset]").forEach((button) => button.addEventListener("click", () => resetForm(button.dataset.reset)));
  renderCommonFailures();
  renderPatternGrid();
  renderPurchaseItems([]);
  renderSelectedParts();
}

async function runAction(action) {
  if (busy) return;
  try {
    setBusy(true);
    return await action();
  } catch (error) {
    if (error.code === "stale_record") await loadStateFromDb();
    showAlert(error.message || "No se pudo completar la operacion.", "error");
  } finally {
    setBusy(false);
  }
}

function startLiveRefresh() {
  const refreshWhenSafe = () => {
    if (!session.token || busy || document.hidden) return;
    if (document.querySelector("form:focus-within") || !$("orderForm").classList.contains("hidden")) return;
    if (Date.now() - lastDatabaseLoadAt < 30000) return;
    loadStateFromDb();
  };
  window.addEventListener("focus", refreshWhenSafe);
  document.addEventListener("visibilitychange", refreshWhenSafe);
  window.setInterval(refreshWhenSafe, 45000);
}

async function login(event) {
  event.preventDefault();
  showLoginAlert("Conectando con backend...", "ok");
  try {
    setBusy(true);
    const baseUrl = $("loginServer").value.trim().replace(/\/$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ email: $("loginEmail").value.trim(), password: $("loginPassword").value })
    });
    clearTimeout(timeout);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Login rechazado");
    session = { baseUrl, email: $("loginEmail").value.trim(), token: payload.token, user: payload.user };
    saveSession();
    showLoginAlert("", "ok", true);
    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    await loadStateFromDb();
  } catch (error) {
    const message = error.name === "AbortError" ? "El backend no respondio a tiempo." : error.message;
    showLoginAlert(`No se pudo entrar: ${message}`, "error");
  } finally {
    setBusy(false);
  }
}

function logout() {
  session.token = "";
  session.user = null;
  saveSession();
  state = clone(defaultState);
  $("app").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
}

async function api(path, options = {}) {
  if (!session.token) throw new Error("Sesion requerida");
  const response = await fetch(`${session.baseUrl}${path}`, {
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Pragma: "no-cache",
      Authorization: `Bearer ${session.token}`,
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.message || "Error de backend");
    error.code = payload.code || "api_error";
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function loadStateFromDb(manual = false) {
  try {
    setBusy(true);
    const payload = await api(`/api/state?t=${Date.now()}`);
    const data = payload.data || {};
    state = {
      ...clone(defaultState),
      ...data,
      settings: { ...clone(defaultState.settings), ...(data.settings || {}) }
    };
    lastDatabaseLoadAt = Date.now();
    render();
    $("connectionLabel").textContent = `BD actualizada ${new Date().toLocaleTimeString("es-MX")}`;
    if (manual) showAlert("Datos cargados desde BD.", "ok");
    return true;
  } catch (error) {
    state = clone(defaultState);
    render();
    showAlert(`No se pudo leer BD: ${error.message}`, "error");
    if (error.status === 401) logout();
    return false;
  } finally {
    setBusy(false);
  }
}

async function saveRecord(type, data) {
  const collectionMap = {
    client: state.clients, supplier: state.suppliers, inventory: state.inventory, order: state.orders,
    purchase: state.purchases, payment: state.payments, appointment: state.appointments,
    warrantyClaim: state.warrantyClaims, settings: [state.settings]
  };
  const existing = (collectionMap[type] || []).find((row) => row?.id === data.id);
  const payload = await api(`/api/records/${type}`, {
    method: "POST",
    body: JSON.stringify({ id: data.id, data, expectedUpdatedAt: existing?.updatedAt || "", detail: "Guardado directo BD" })
  });
  await loadStateFromDb();
  return payload.data || payload;
}

async function archiveRecord(type, id) {
  await api(`/api/records/${type}/${encodeURIComponent(id)}/archive`, { method: "POST", body: "{}" });
  await loadStateFromDb();
}

function showView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  $(`${view}View`).classList.add("active");
  document.querySelectorAll("#nav button").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  const names = {
    dashboard: ["Panel", "Resumen operativo desde BD."],
    clients: ["Clientes", "Registro y contacto."],
    orders: ["Ordenes", "Servicio, estatus, pagos y seguimiento."],
    inventory: ["Inventario", "Refacciones y stock."],
    suppliers: ["Proveedores", "Directorio de compras."],
    purchases: ["Compras", "Cotizaciones, pedidos y recepcion."],
    payments: ["Caja", "Pagos y saldos."],
    appointments: ["Agenda", "Citas, entregas y seguimiento."],
    warranties: ["Garantias", "Reclamos, resolucion y costo."],
    portal: ["Portal cliente", "Consulta por folio."],
    settings: ["Configuracion", "Empresa, identidad y salud BD."]
  };
  $("viewTitle").textContent = names[view][0];
  $("viewSubtitle").textContent = names[view][1];
  loadStateFromDb();
}

function render() {
  applyTheme(state.settings.theme || {});
  renderSelectors();
  renderDashboard();
  renderClients();
  renderSuppliers();
  renderInventory();
  renderOrders();
  renderPurchases();
  renderPayments();
  renderAppointments();
  renderWarranties();
  renderTechnicians();
  renderAdminHealth();
  hydrateSettings();
}

function renderDashboard() {
  const orders = active(state.orders);
  const inventory = active(state.inventory);
  const purchases = active(state.purchases);
  const activeOrders = orders.filter((o) => !["Entregado", "Cancelado"].includes(o.status));
  const billableOrders = orders.filter((o) => o.status !== "Cancelado");
  const deliveredOrders = orders.filter((o) => o.status === "Entregado");
  const lowStock = inventory.filter((i) => Number(i.stock || 0) <= Number(i.min || i.minStock || 1));
  const overdueOrders = activeOrders.filter(isOrderOverdue);
  const revenue = billableOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
  const warrantyCost = active(state.warrantyClaims).reduce((sum, claim) => sum + Number(claim.cost || 0), 0);
  const cost = billableOrders.reduce((sum, order) => sum + getOrderInternalCost(order), 0) + warrantyCost;
  const receivables = billableOrders.reduce((sum, o) => sum + getBalance(o), 0);
  const margin = revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0;
  const cycleDays = averageCycleDays(deliveredOrders);
  $("metricClients").textContent = active(state.clients).length;
  $("metricOrders").textContent = activeOrders.length;
  $("metricPurchases").textContent = purchases.length;
  $("metricLowStock").textContent = lowStock.length;
  $("metricRevenue").textContent = money.format(revenue);
  $("metricMargin").textContent = `${margin}%`;
  $("metricOverdue").textContent = overdueOrders.length;
  $("metricCycle").textContent = `${cycleDays.toFixed(1)} dias`;
  $("recentOrders").innerHTML = orders.slice(0, 8).map(orderCard).join("") || empty("Sin ordenes en BD");
  renderDecisionInsights({ activeOrders, lowStock, purchases, revenue, cost, overdueOrders });
  renderStatusChart(orders);
  renderStockRisk(lowStock);
  renderExecutiveCharts({ orders, purchases, revenue, cost, receivables });
}

function renderDecisionInsights({ activeOrders, lowStock, purchases, revenue, cost, overdueOrders }) {
  const pendingPurchases = purchases.filter((p) => !["Recibido", "Cancelado"].includes(p.status || ""));
  const readyOrders = activeOrders.filter((o) => o.status === "Listo");
  const waitingParts = activeOrders.filter((o) => normalize(o.status).includes("pieza"));
  const pendingApproval = activeOrders.filter((order) => (order.approvalStatus || "Pendiente") === "Pendiente");
  const margin = revenue ? Math.round(((revenue - cost) / revenue) * 100) : 0;
  $("decisionScore").textContent = `${margin}%`;
  const insights = [
    {
      level: overdueOrders.length ? "danger" : "ok",
      title: `${overdueOrders.length} ordenes fuera de promesa`,
      text: overdueOrders.length ? "Reasigna prioridad o comunica una nueva fecha al cliente." : "Las fechas prometidas estan bajo control."
    },
    {
      level: pendingApproval.length ? "warn" : "ok",
      title: `${pendingApproval.length} presupuestos sin autorizar`,
      text: pendingApproval.length ? "Obtener autorizacion evita trabajo detenido y cobros disputados." : "No hay autorizaciones pendientes."
    },
    {
      level: readyOrders.length ? "ok" : "neutral",
      title: `${readyOrders.length} equipos listos para entrega`,
      text: readyOrders.length ? "Prioridad alta: liberar caja y espacio de trabajo." : "Sin equipos listos pendientes."
    },
    {
      level: waitingParts.length ? "warn" : "ok",
      title: `${waitingParts.length} ordenes esperando pieza`,
      text: waitingParts.length ? "Revisar compras abiertas y proveedores con mejor tiempo de respuesta." : "No hay reparaciones detenidas por pieza."
    },
    {
      level: lowStock.length ? "warn" : "ok",
      title: `${lowStock.length} articulos en stock bajo`,
      text: lowStock.length ? "Conviene reponer refacciones criticas antes de prometer tiempos cortos." : "Inventario sin riesgo inmediato."
    },
    {
      level: pendingPurchases.length ? "neutral" : "ok",
      title: `${pendingPurchases.length} compras pendientes`,
      text: pendingPurchases.length ? "Da seguimiento a cotizaciones/pedidos para evitar atrasos." : "Compras cerradas o recibidas."
    }
  ];
  $("decisionInsights").innerHTML = insights.map((item) => `
    <article class="insight ${item.level}">
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.text)}</span>
    </article>
  `).join("");
}

function renderStatusChart(orders) {
  const counts = orderStatuses.map((status) => ({
    status,
    total: orders.filter((o) => o.status === status).length
  })).filter((row) => row.total > 0);
  const max = Math.max(1, ...counts.map((row) => row.total));
  $("statusChart").innerHTML = counts.map((row) => `
    <div class="bar-row">
      <span>${escapeHtml(row.status)}</span>
      <div><i style="width:${Math.max(8, row.total / max * 100)}%"></i></div>
      <b>${row.total}</b>
    </div>
  `).join("") || empty("Sin ordenes para graficar");
}

function renderStockRisk(items) {
  $("stockRiskList").innerHTML = items.slice(0, 8).map((item) => `
    <article>
      <strong>${escapeHtml(displayItem(item))}</strong>
      <span>Stock ${Number(item.stock || 0)} / Min ${Number(item.min || item.minStock || 1)}</span>
    </article>
  `).join("") || empty("Sin stock bajo");
}

function renderExecutiveCharts({ orders, purchases, revenue, cost, receivables }) {
  const monthly = groupByMonth(orders);
  const serviceMix = groupServices(orders);
  const profit = Math.max(0, revenue - cost);
  $("executiveSummary").textContent = `${orders.length} ordenes | ${purchases.length} compras`;
  $("monthlyRevenueChart").innerHTML = miniBars(monthly, "amount", (item) => item.label, (item) => money.format(item.amount));
  $("serviceMixChart").innerHTML = miniBars(serviceMix, "total", (item) => item.label, (item) => `${item.total}`);
  $("profitChart").innerHTML = miniBars([
    { label: "Ingreso", amount: revenue },
    { label: "Costo", amount: cost },
    { label: "Margen", amount: profit }
  ], "amount", (item) => item.label, (item) => money.format(item.amount));
  $("receivableChart").innerHTML = miniBars([
    { label: "Cobrado", amount: Math.max(0, revenue - receivables) },
    { label: "Pendiente", amount: receivables }
  ], "amount", (item) => item.label, (item) => money.format(item.amount));
}

function miniBars(rows, field, labelFn, valueFn) {
  const cleanRows = rows.filter((row) => Number(row[field] || 0) > 0).slice(-6);
  const max = Math.max(1, ...cleanRows.map((row) => Number(row[field] || 0)));
  return cleanRows.map((row) => `
    <div class="mini-bar-row">
      <span>${escapeHtml(labelFn(row))}</span>
      <i><b style="width:${Math.max(6, Number(row[field] || 0) / max * 100)}%"></b></i>
      <strong>${escapeHtml(valueFn(row))}</strong>
    </div>
  `).join("") || empty("Sin datos suficientes");
}

function groupByMonth(orders) {
  const map = new Map();
  orders.filter((o) => o.status !== "Cancelado").forEach((order) => {
    const key = String(order.createdAt || order.created_at || now()).slice(0, 7);
    const row = map.get(key) || { label: key, amount: 0, total: 0 };
    row.amount += Number(order.total || 0);
    row.total += 1;
    map.set(key, row);
  });
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function groupServices(orders) {
  const buckets = { Celular: 0, Laptop: 0, Tablet: 0, Otros: 0 };
  orders.forEach((order) => {
    const text = normalize(order.device);
    if (["iphone", "samsung", "xiaomi", "motorola", "oppo", "honor", "huawei", "redmi", "poco"].some((key) => text.includes(key))) buckets.Celular += 1;
    else if (["hp", "dell", "lenovo", "asus", "acer", "laptop", "thinkpad", "pavilion"].some((key) => text.includes(key))) buckets.Laptop += 1;
    else if (["tablet", "ipad"].some((key) => text.includes(key))) buckets.Tablet += 1;
    else buckets.Otros += 1;
  });
  return Object.entries(buckets).map(([label, total]) => ({ label, total })).filter((row) => row.total);
}

function renderClients() {
  const rows = sortByName(active(state.clients).filter((c) => matches([c.name, c.phone, c.email, c.address])));
  $("clientCount").textContent = rows.length;
  $("clientList").innerHTML = rows.map((c) => card(`
    <strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.phone || "")}</span>
    <small>${escapeHtml(c.email || "")} ${escapeHtml(c.address || "")}</small>
    <div class="record-actions">
      <button onclick="editClient('${c.id}')" class="btn ghost">Editar</button>
      <button onclick="removeRecord('client','${c.id}')" class="btn danger">Archivar</button>
    </div>`)).join("") || empty("Sin clientes en BD");
}

function renderSuppliers() {
  const rows = active(state.suppliers).filter((s) => matches([s.name, s.contact, s.phone, s.category]));
  $("supplierCount").textContent = rows.length;
  $("supplierList").innerHTML = rows.map((s) => card(`
    <strong>${escapeHtml(s.name)}</strong><span>${escapeHtml(s.phone || "")}</span>
    <small>${escapeHtml(s.contact || "")} ${escapeHtml(s.category || "")}</small>
    <div class="record-actions">
      <button onclick="editSupplier('${s.id}')" class="btn ghost">Editar</button>
      <a class="btn ghost" target="_blank" rel="noreferrer" href="${waUrl(s.phone, "Hola, solicito cotizacion y disponibilidad de refacciones.")}">WhatsApp</a>
      <button onclick="removeRecord('supplier','${s.id}')" class="btn danger">Archivar</button>
    </div>`)).join("") || empty("Sin proveedores en BD");
}

function renderInventory() {
  const rows = active(state.inventory).filter((i) => matches([i.sku, i.location, i.brand, i.model, i.name, i.category]));
  $("inventoryCount").textContent = rows.length;
  $("inventoryList").innerHTML = rows.map((i) => card(`
    <strong>${escapeHtml(displayItem(i))}</strong><span>${escapeHtml(i.category || "")}</span>
    <small>${i.sku ? `SKU ${escapeHtml(i.sku)} | ` : ""}${i.location ? `Ubicacion ${escapeHtml(i.location)} | ` : ""}Stock ${Number(i.stock || 0)} | Min ${Number(i.min || i.minStock || 1)} | Costo ${money.format(Number(i.cost || 0))} | Sub ${money.format(getSubdealer(i))}</small>
    <div class="record-actions">
      <button onclick="editInventory('${i.id}')" class="btn ghost">Editar</button>
      <button onclick="removeRecord('inventory','${i.id}')" class="btn danger">Archivar</button>
    </div>`)).join("") || empty("Sin inventario en BD");
}

function renderOrders() {
  const rows = active(state.orders).filter((o) => matches([o.folio, o.device, o.status, getClient(o.clientId)?.name]));
  const activeRows = rows.filter((o) => !["Entregado", "Cancelado"].includes(o.status));
  const finishedRows = rows.filter((o) => ["Entregado", "Cancelado"].includes(o.status));
  $("activeOrderCount").textContent = activeRows.length;
  $("finishedOrderCount").textContent = finishedRows.length;
  $("activeOrderList").innerHTML = activeRows.map(orderCard).join("") || empty("Sin ordenes activas en BD");
  $("finishedOrderList").innerHTML = finishedRows.map(orderCard).join("") || empty("Sin ordenes finalizadas en BD");
}

function orderCard(o) {
  const client = getClient(o.clientId);
  const evidenceCount = (o.statusEvidencePhotos || []).length;
  const parts = o.suppliedParts || [];
  const delivered = o.status === "Entregado";
  const overdue = isOrderOverdue(o);
  const promisedLabel = o.promisedAt ? formatDateTime(o.promisedAt) : "Sin fecha prometida";
  const internalCost = getOrderInternalCost(o);
  return card(`
    <div class="order-card-head">
      <div>
        <strong>${escapeHtml(o.folio || o.id)} | ${escapeHtml(o.device || "")}</strong>
        <span>${escapeHtml(client?.name || "Sin cliente")} | ${escapeHtml(o.priority || "Normal")} | ${escapeHtml(o.approvalStatus || "Pendiente")}</span>
      </div>
      <b class="status-badge ${statusClass(o.status)}">${escapeHtml(o.status || "Sin estatus")}</b>
    </div>
    <div class="sla-line ${overdue ? "overdue" : ""}"><strong>${overdue ? "Promesa vencida" : "Entrega"}</strong><span>${escapeHtml(promisedLabel)}</span></div>
    <small>Total ${money.format(Number(o.total || 0))} | Costo refacciones ${money.format(internalCost)} | Saldo ${money.format(getBalance(o))} | Garantia ${Number(o.warrantyDays || 90)} dias | Evidencia ${evidenceCount} | Refacciones ${parts.length}</small>
    ${parts.length ? `<div class="mini-chip-row">${parts.slice(0, 4).map((part) => `<span>${escapeHtml(part.qty || 1)}x ${escapeHtml(part.part || "")}</span>`).join("")}</div>` : ""}
    <div class="status-inline">
      <span>Cambiar estatus</span>
      <select onchange="changeOrderStatus('${o.id}', this.value)">
        ${orderStatuses.map((status) => `<option ${status === o.status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}
      </select>
    </div>
    <div class="order-action-grid">
      <button onclick="editOrder('${o.id}')" class="btn ghost">Modificar</button>
      <button onclick="sendStatusWhatsApp('${o.id}')" class="btn ghost">Avisar estatus</button>
      <button onclick="sendTrackingWhatsApp('${o.id}')" class="btn ghost">Enviar seguimiento</button>
      <button onclick="printOrderById('${o.id}')" class="btn ghost">Comprobante PDF</button>
      ${delivered ? `<button onclick="sendDeliveryWhatsApp('${o.id}')" class="btn ghost">Recomendacion</button>` : `<button onclick="changeOrderStatus('${o.id}', 'Entregado')" class="btn primary">Entregar</button>`}
      <button onclick="removeRecord('order','${o.id}')" class="btn danger">Eliminar</button>
    </div>`);
}

function renderPurchases() {
  const rows = active(state.purchases).filter((p) => matches([p.folio, p.part, p.status, getSupplier(p.supplierId)?.name]));
  $("purchaseCount").textContent = rows.length;
  $("purchaseList").innerHTML = rows.map((p) => {
    const supplier = getSupplier(p.supplierId);
    const order = state.orders.find((o) => o.id === p.orderId);
    const items = p.items?.length ? p.items : [{ part: p.part, qty: p.qty || 1, cost: p.cost || 0 }];
    const total = items.reduce((sum, item) => sum + Number(item.qty || 1) * Number(item.cost || 0), 0);
    return card(`
      <strong>${escapeHtml(p.folio || p.id)} | ${items.length} producto(s)</strong>
      <span>${escapeHtml(supplier?.name || "Sin proveedor")} ${order ? "| " + escapeHtml(order.folio) : ""}</span>
      <small>${escapeHtml(p.status || "")} | ${money.format(total)} | ${items.map((item) => `${item.qty || 1}x ${item.part || ""}`).join(", ")}</small>
      <div class="record-actions">
        <button onclick="editPurchase('${p.id}')" class="btn ghost">Editar</button>
        ${!["Recibido", "Cancelado"].includes(p.status) ? `<button onclick="receivePurchase('${p.id}')" class="btn ghost">Recibir en inventario</button>` : ""}
        <a class="btn ghost" target="_blank" rel="noreferrer" href="${supplier ? waUrl(supplier.phone, purchaseMessage(p)) : "#"}">WhatsApp</a>
        <button onclick="removeRecord('purchase','${p.id}')" class="btn danger">Archivar</button>
      </div>`);
  }).join("") || empty("Sin compras en BD");
}

function renderPayments() {
  const rows = active(state.payments).filter((p) => matches([p.reference, p.method, state.orders.find((o) => o.id === p.orderId)?.folio]));
  $("paymentCount").textContent = rows.length;
  $("paymentList").innerHTML = rows.map((p) => card(`
    <strong>${money.format(Number(p.amount || 0))}</strong><span>${escapeHtml(p.method || "")}</span>
    <small>${escapeHtml(state.orders.find((o) => o.id === p.orderId)?.folio || "")} ${escapeHtml(p.reference || "")}</small>
  `)).join("") || empty("Sin pagos en BD");
}

function renderAppointments() {
  const rows = active(state.appointments).filter((a) => matches([a.type, a.date, a.time, a.notes, getClient(a.clientId)?.name]));
  $("appointmentCount").textContent = rows.length;
  $("appointmentList").innerHTML = rows
    .sort((a, b) => `${a.date || ""} ${a.time || ""}`.localeCompare(`${b.date || ""} ${b.time || ""}`))
    .map((a) => {
      const client = getClient(a.clientId);
      const order = state.orders.find((o) => o.id === a.orderId);
      return card(`
        <strong>${escapeHtml(a.type || "Actividad")} | ${escapeHtml(a.date || "")} ${escapeHtml(a.time || "")}</strong>
        <span>${escapeHtml(client?.name || "Sin cliente")} ${order ? "| " + escapeHtml(order.folio || "") : ""}</span>
        <small>${escapeHtml(a.notes || "")}</small>
        <div class="record-actions">
          <button onclick="editAppointment('${a.id}')" class="btn ghost">Editar</button>
          <button onclick="removeRecord('appointment','${a.id}')" class="btn danger">Archivar</button>
        </div>`);
    }).join("") || empty("Sin actividades en agenda");
}

function renderWarranties() {
  const rows = active(state.warrantyClaims).filter((w) => matches([w.reason, w.resolution, w.status, state.orders.find((o) => o.id === w.orderId)?.folio]));
  $("warrantyCount").textContent = rows.length;
  $("warrantyList").innerHTML = rows.map((w) => {
    const order = state.orders.find((o) => o.id === w.orderId);
    return card(`
      <strong>${escapeHtml(order?.folio || "Orden sin folio")} | ${escapeHtml(w.status || "")}</strong>
      <span>${escapeHtml(order?.device || "")} | Costo ${money.format(Number(w.cost || 0))}</span>
      <small>${escapeHtml(w.reason || "")}</small>
      ${w.resolution ? `<small>Resolucion: ${escapeHtml(w.resolution)}</small>` : ""}
      <div class="record-actions">
        <button onclick="editWarranty('${w.id}')" class="btn ghost">Editar</button>
        <button onclick="removeRecord('warrantyClaim','${w.id}')" class="btn danger">Archivar</button>
      </div>`);
  }).join("") || empty("Sin garantias abiertas");
}

function renderTechnicians() {
  const technicians = sortByName(state.technicians || []);
  const isAdmin = session.user?.role === "admin";
  $("technicianCount").textContent = technicians.length;
  $("technicianForm").classList.toggle("hidden", !isAdmin);
  $("technicianList").innerHTML = technicians.map((technician) => card(`
    <strong>${escapeHtml(technician.name)}</strong>
    <span>${escapeHtml(technician.email || "")}</span>
    ${isAdmin ? `<div class="record-actions"><button class="btn danger" type="button" onclick="deactivateTechnician('${technician.id}')">Desactivar</button></div>` : ""}
  `)).join("") || empty("Aun no hay tecnicos registrados");
}

async function saveTechnician(event) {
  event.preventDefault();
  await api("/api/users", {
    method: "POST",
    body: JSON.stringify({
      name: $("technicianName").value.trim(),
      email: $("technicianEmail").value.trim(),
      password: $("technicianPassword").value,
      role: "technician"
    })
  });
  $("technicianForm").reset();
  await loadStateFromDb();
  showAlert("Tecnico registrado y disponible para asignar ordenes.", "ok");
}

async function deactivateTechnician(userId) {
  return runAction(async () => {
    if (!confirm("Desactivar este tecnico? Las ordenes historicas conservaran su nombre.")) return;
    await api(`/api/users/${encodeURIComponent(userId)}/deactivate`, { method: "POST", body: "{}" });
    await loadStateFromDb();
    showAlert("Tecnico desactivado.", "ok");
  });
}

function renderSelectors() {
  const clients = sortByName(active(state.clients));
  const technicians = sortByName(state.technicians || []);
  const suppliers = sortByName(active(state.suppliers));
  const orders = active(state.orders).sort((a, b) => String(a.folio || "").localeCompare(String(b.folio || ""), "es", { numeric: true }));
  setSelectOptions("orderClient", clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} - ${escapeHtml(c.phone || "")}</option>`).join(""));
  setSelectOptions("orderTechnician", `<option value="">Selecciona un tecnico</option>${technicians.map((technician) => `<option value="${technician.id}">${escapeHtml(technician.name)}</option>`).join("")}`);
  renderOrderPartOptions();
  setSelectOptions("purchaseSupplier", suppliers.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join(""));
  setSelectOptions("suggestedPurchaseSupplier", suppliers.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join(""));
  setSelectOptions("purchaseOrder", `<option value="">Sin orden</option>${orders.map((o) => `<option value="${o.id}">${escapeHtml(o.folio || o.id)} - ${escapeHtml(o.device || "")}</option>`).join("")}`);
  const pendingPaymentOrders = orders.filter((order) => order.status !== "Cancelado" && getBalance(order) > 0.001);
  setSelectOptions("paymentOrder", pendingPaymentOrders.length
    ? pendingPaymentOrders.map((o) => `<option value="${o.id}">${escapeHtml(o.folio || o.id)} - Saldo ${money.format(getBalance(o))}</option>`).join("")
    : `<option value="">Sin ordenes pendientes de liquidar</option>`);
  $("paymentOrder").disabled = !pendingPaymentOrders.length;
  $("paymentForm").querySelector('button[type="submit"]').disabled = !pendingPaymentOrders.length;
  updatePaymentBalanceHint();
  setSelectOptions("appointmentClient", clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)} - ${escapeHtml(c.phone || "")}</option>`).join(""));
  setSelectOptions("appointmentOrder", `<option value="">Sin orden</option>${orders.map((o) => `<option value="${o.id}">${escapeHtml(o.folio || o.id)} - ${escapeHtml(o.device || "")}</option>`).join("")}`);
  setSelectOptions("warrantyOrder", orders.map((o) => `<option value="${o.id}">${escapeHtml(o.folio || o.id)} - ${escapeHtml(o.device || "")}</option>`).join(""));
}

function setSelectOptions(idValue, html) {
  const select = $(idValue);
  if (!select) return;
  const current = select.value;
  select.innerHTML = html;
  if (current && Array.from(select.options).some((option) => option.value === current)) select.value = current;
}

function updatePaymentBalanceHint() {
  const order = state.orders.find((item) => item.id === $("paymentOrder")?.value);
  const balance = order ? getBalance(order) : 0;
  if ($("paymentBalanceHint")) $("paymentBalanceHint").innerHTML = order
    ? `<span>Saldo pendiente</span><strong>${money.format(balance)}</strong>`
    : `<span>No hay saldos pendientes.</span>`;
  if (order && !$("paymentAmount").value) $("paymentAmount").value = balance.toFixed(2);
}

async function saveClient(event) {
  event.preventDefault();
  const existing = state.clients.find((c) => c.id === $("clientId").value);
  await saveRecord("client", {
    id: $("clientId").value || id("cli"),
    name: $("clientName").value.trim(),
    phone: $("clientPhone").value.trim(),
    email: $("clientEmail").value.trim(),
    address: $("clientAddress").value.trim(),
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  });
  resetForm("client");
  showAlert("Cliente guardado en BD.", "ok");
}

async function saveSupplier(event) {
  event.preventDefault();
  const existing = state.suppliers.find((s) => s.id === $("supplierId").value);
  await saveRecord("supplier", {
    id: $("supplierId").value || id("sup"),
    name: $("supplierName").value.trim(),
    contact: $("supplierContact").value.trim(),
    phone: $("supplierPhone").value.trim(),
    email: $("supplierEmail").value.trim(),
    category: $("supplierCategory").value.trim(),
    notes: $("supplierNotes").value.trim(),
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  });
  resetForm("supplier");
  showAlert("Proveedor guardado en BD.", "ok");
}

async function saveInventory(event) {
  event.preventDefault();
  const existing = state.inventory.find((i) => i.id === $("itemId").value);
  const cost = Number($("itemCost").value || 0);
  await saveRecord("inventory", {
    id: $("itemId").value || id("inv"),
    sku: $("itemSku").value.trim(),
    location: $("itemLocation").value.trim(),
    brand: $("itemBrand").value.trim(),
    model: $("itemModel").value.trim(),
    name: [$("itemBrand").value.trim(), $("itemModel").value.trim()].filter(Boolean).join(" "),
    category: $("itemCategory").value.trim(),
    stock: Number($("itemStock").value || 0),
    min: Math.max(1, Number($("itemMin").value || 1)),
    cost,
    subdealerPrice: calculateSubdealer(cost),
    price: Number($("itemPrice").value || 0),
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  });
  resetForm("inventory");
  showAlert("Articulo guardado en BD.", "ok");
}

async function saveOrder(event) {
  event.preventDefault();
  const existing = state.orders.find((o) => o.id === $("orderId").value);
  const technician = (state.technicians || []).find((item) => item.id === $("orderTechnician").value);
  if (!technician) throw new Error("Selecciona un tecnico registrado en Configuracion.");
  if ($("orderApprovalStatus").value === "Aprobado" && !$("orderCustomerAuthorization").checked) {
    throw new Error("Registra la autorizacion del cliente antes de marcar el presupuesto como aprobado.");
  }
  for (const selected of currentSelectedParts) {
    const item = state.inventory.find((entry) => entry.id === selected.inventoryId);
    const previouslyUsed = (existing?.suppliedParts || [])
      .filter((part) => part.inventoryId === selected.inventoryId)
      .reduce((sum, part) => sum + Number(part.qty || 0), 0);
    const available = Number(item?.stock || 0) + previouslyUsed;
    if (!item || Number(selected.qty || 1) > available) {
      throw new Error(`Stock insuficiente para ${selected.part || "la refaccion seleccionada"}.`);
    }
  }
  const selectedParts = currentSelectedParts.map((part) => part.inventoryId);
  const suppliedParts = currentSelectedParts.map((part) => ({
    ...part,
    id: part.id || id("sup"),
    qty: Math.max(1, Number(part.qty || 1)),
    cost: Number(part.cost || 0),
    totalCost: Math.max(1, Number(part.qty || 1)) * Number(part.cost || 0),
    createdAt: part.createdAt || now()
  }));
  const status = $("orderStatus").value;
  const total = Number($("orderTotal").value || 0);
  const deposit = status === "Entregado" ? total : Number($("orderDeposit").value || 0);
  const orderId = $("orderId").value || id("ord");
  const savedOrder = await saveRecord("order", {
    id: orderId,
    folio: existing?.folio || nextOrderFolio(),
    clientId: $("orderClient").value,
    device: $("orderDevice").value.trim(),
    technicianId: technician.id,
    technician: technician.name,
    serial: $("orderSerial").value.trim(),
    status,
    priority: $("orderPriority").value,
    promisedAt: localInputToIso($("orderPromisedAt").value),
    approvalStatus: $("orderApprovalStatus").value,
    total,
    deposit,
    paid: deposit >= total,
    issue: $("orderIssue").value.trim(),
    notes: $("orderConditions").value.trim(),
    physicalState: $("orderConditions").value.trim(),
    accessories: $("orderAccessories").value.trim(),
    unlockPattern: $("orderPattern").value.trim(),
    patternSize: Number($("patternSize").value || 3),
    quotePartName: $("orderQuotePart").value.trim(),
    replacedPartsDisposition: $("orderReplacedPartsDisposition").value,
    customerAuthorization: $("orderCustomerAuthorization").checked,
    warrantyDays: 90,
    warrantyTerms: defaultWarrantyTerms(),
    trackingCode: existing?.trackingCode || randomCode(),
    statusHistory: updateHistory(existing, status),
    completedAt: status === "Entregado" ? (existing?.completedAt || now()) : "",
    statusEvidencePhotos: currentEvidencePhotos,
    parts: selectedParts,
    suppliedParts,
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  });
  $("orderId").value = savedOrder.id || orderId;
  if (pendingSuggestedPurchase) {
    await createSuggestedPurchaseRecord({ ...pendingSuggestedPurchase, orderId: savedOrder.id || orderId });
    pendingSuggestedPurchase = null;
  }
  hideOrderForm();
  showAlert("Orden guardada en BD.", "ok");
}

async function savePurchase(event) {
  event.preventDefault();
  const existing = state.purchases.find((p) => p.id === $("purchaseId").value);
  const items = getPurchaseItemsFromForm();
  if (!items.length) throw new Error("Agrega al menos un producto a la compra.");
  const primary = items[0] || { part: $("purchasePart").value.trim(), qty: Math.max(1, Number($("purchaseQty").value || 1)), cost: Number($("purchaseCost").value || 0) };
  const purchase = {
    id: $("purchaseId").value || id("pur"),
    folio: existing?.folio || nextPurchaseFolio(),
    supplierId: $("purchaseSupplier").value,
    orderId: $("purchaseOrder").value,
    part: primary.part,
    qty: primary.qty,
    cost: primary.cost,
    items,
    status: $("purchaseStatus").value,
    notes: $("purchaseNotes").value.trim(),
    receivedAt: $("purchaseStatus").value === "Recibido" ? (existing?.receivedAt || now()) : "",
    receivedQuantities: $("purchaseStatus").value === "Recibido" ? Object.fromEntries(items.map((item) => [item.id, item.qty])) : {},
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  };
  await saveRecord("purchase", purchase);
  resetForm("purchase");
  showAlert("Compra guardada en BD.", "ok");
}

async function saveSuggestedPurchase(event) {
  event.preventDefault();
  const request = {
    supplierId: $("suggestedPurchaseSupplier").value,
    part: $("suggestedPurchasePart").value.trim(),
    qty: Math.max(1, Number($("suggestedPurchaseQty").value || 1)),
    notes: $("suggestedPurchaseNotes").value.trim()
  };
  if (!request.supplierId || !request.part) throw new Error("Selecciona proveedor y pieza para cotizar.");
  const orderId = $("orderId").value;
  closePurchaseSuggestion();
  if (!orderId || !state.orders.some((order) => order.id === orderId)) {
    pendingSuggestedPurchase = request;
    showAlert("Solicitud preparada. Se creara y abrira WhatsApp al guardar la orden.", "ok");
    return;
  }
  await createSuggestedPurchaseRecord({ ...request, orderId });
}

async function createSuggestedPurchaseRecord(request) {
  const purchase = {
    id: id("pur"),
    folio: nextPurchaseFolio(),
    supplierId: request.supplierId,
    orderId: request.orderId || "",
    part: request.part,
    qty: request.qty,
    cost: 0,
    items: [{ id: id("pitem"), part: request.part, qty: request.qty, cost: 0 }],
    status: "Cotizando",
    notes: request.notes || "Solicitud generada desde una orden sin existencia compatible.",
    receivedAt: "",
    receivedQuantities: {},
    createdAt: now(),
    updatedAt: now()
  };
  await saveRecord("purchase", purchase);
  const supplier = getSupplier(request.supplierId);
  const order = state.orders.find((item) => item.id === request.orderId);
  if (supplier?.phone) {
    const message = `Hola ${supplier.contact || supplier.name || ""}, te saluda ${state.settings.businessName || "PCFix Comitan"}. Solicitamos cotizacion y disponibilidad de ${request.qty} ${request.part} para ${order?.device || $("orderDevice").value.trim()}.`;
    window.open(waUrl(supplier.phone, message), "_blank", "noreferrer");
  }
  showAlert("Solicitud de cotizacion creada en Compras.", "ok");
}

async function receivePurchase(purchaseId) {
  return runAction(() => receivePurchaseDirect(purchaseId));
}

async function receivePurchaseDirect(purchaseId) {
  const purchase = state.purchases.find((p) => p.id === purchaseId);
  if (!purchase) return;
  const updated = { ...purchase, status: "Recibido", receivedAt: purchase.receivedAt || now(), updatedAt: now() };
  await saveRecord("purchase", updated);
  showAlert("Compra recibida; el backend actualizo inventario en BD.", "ok");
}

async function saveAppointment(event) {
  event.preventDefault();
  const existing = state.appointments.find((a) => a.id === $("appointmentId").value);
  await saveRecord("appointment", {
    id: $("appointmentId").value || id("app"),
    clientId: $("appointmentClient").value,
    orderId: $("appointmentOrder").value,
    date: $("appointmentDate").value,
    time: $("appointmentTime").value,
    type: $("appointmentType").value,
    notes: $("appointmentNotes").value.trim(),
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  });
  resetForm("appointment");
  showAlert("Cita guardada en BD.", "ok");
}

async function saveWarranty(event) {
  event.preventDefault();
  const existing = state.warrantyClaims.find((w) => w.id === $("warrantyId").value);
  await saveRecord("warrantyClaim", {
    id: $("warrantyId").value || id("war"),
    orderId: $("warrantyOrder").value,
    reason: $("warrantyReason").value.trim(),
    resolution: $("warrantyResolution").value.trim(),
    status: $("warrantyStatus").value,
    cost: Number($("warrantyCost").value || 0),
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  });
  resetForm("warranty");
  showAlert("Garantia guardada en BD.", "ok");
}

async function savePayment(event) {
  event.preventDefault();
  const amount = Number($("paymentAmount").value || 0);
  const orderId = $("paymentOrder").value;
  if (!orderId) throw new Error("No hay una orden pendiente seleccionada.");
  await api(`/api/orders/${encodeURIComponent(orderId)}/payments`, {
    method: "POST",
    body: JSON.stringify({
    amount,
    method: $("paymentMethod").value,
      reference: $("paymentReference").value.trim()
    })
  });
  await loadStateFromDb();
  resetForm("payment");
  showAlert("Pago guardado en BD.", "ok");
}

async function saveSettings(event) {
  event.preventDefault();
  await saveRecord("settings", {
    id: "settings",
    businessName: $("businessName").value.trim(),
    businessPhone: $("businessPhone").value.trim(),
    businessAddress: $("businessAddress").value.trim(),
    whatsappTemplate: $("whatsappTemplate").value.trim(),
    theme: {
      ...(state.settings.theme || {}),
      blue: $("themeBlue").value || "#0B3B63",
      cyan: $("themeCyan").value || "#20C7D8",
      motionEnabled: $("motionEnabled").checked
    }
  });
  showAlert("Configuracion guardada en BD.", "ok");
}

async function quickStatus(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return;
  const next = prompt(`Nuevo estatus:\n${orderStatuses.join(" | ")}`, order.status || "Recibido");
  if (!next) return;
  await changeOrderStatus(orderId, next);
}

async function changeOrderStatus(orderId, next) {
  return runAction(() => changeOrderStatusDirect(orderId, next));
}

async function changeOrderStatusDirect(orderId, next) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order || !next || next === order.status) return;
  const updated = {
    ...order,
    status: next,
    deposit: next === "Entregado" ? Number(order.total || 0) : order.deposit,
    paid: next === "Entregado" ? true : order.paid,
    completedAt: next === "Entregado" ? (order.completedAt || now()) : "",
    statusHistory: updateHistory(order, next),
    updatedAt: now()
  };
  await saveRecord("order", updated);
  if (next === "Entregado") {
    handleDeliveredOrder(updated);
    return;
  }
  sendStatusWhatsApp(updated.id);
}

function handleDeliveredOrder(order) {
  showAlert("Orden entregada, saldo marcado como pagado. Se abrira el comprobante y WhatsApp.", "ok");
  printOrderDocument(order, { context: "delivery" });
  sendDeliveryWhatsApp(order.id);
}

function sendStatusWhatsApp(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  const client = getClient(order?.clientId);
  if (!order || !client?.phone) {
    showAlert("Esta orden no tiene cliente con telefono WhatsApp.", "error");
    return;
  }
  window.open(waUrl(client.phone, orderMessage(order)), "_blank", "noreferrer");
}

function sendTrackingWhatsApp(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  const client = getClient(order?.clientId);
  if (!order || !client?.phone) {
    showAlert("Esta orden no tiene cliente con telefono WhatsApp.", "error");
    return;
  }
  window.open(waUrl(client.phone, trackingMessage(order)), "_blank", "noreferrer");
}

function sendDeliveryWhatsApp(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  const client = getClient(order?.clientId);
  if (!order || !client?.phone) {
    showAlert("Esta orden no tiene cliente con telefono WhatsApp.", "error");
    return;
  }
  window.open(waUrl(client.phone, deliveryMessage(order)), "_blank", "noreferrer");
}

async function removeRecord(type, idValue) {
  return runAction(() => removeRecordDirect(type, idValue));
}

async function removeRecordDirect(type, idValue) {
  if (!confirm("Archivar/eliminar este registro de la vista?")) return;
  await archiveRecord(type, idValue);
  showAlert("Registro actualizado en BD.", "ok");
}

function editClient(idValue) {
  const c = state.clients.find((x) => x.id === idValue);
  if (!c) return;
  $("clientId").value = c.id;
  $("clientName").value = c.name || "";
  $("clientPhone").value = c.phone || "";
  $("clientEmail").value = c.email || "";
  $("clientAddress").value = c.address || "";
  showView("clients");
}

function editSupplier(idValue) {
  const s = state.suppliers.find((x) => x.id === idValue);
  if (!s) return;
  $("supplierId").value = s.id;
  $("supplierName").value = s.name || "";
  $("supplierContact").value = s.contact || "";
  $("supplierPhone").value = s.phone || "";
  $("supplierEmail").value = s.email || "";
  $("supplierCategory").value = s.category || "";
  $("supplierNotes").value = s.notes || "";
  showView("suppliers");
}

function editInventory(idValue) {
  const i = state.inventory.find((x) => x.id === idValue);
  if (!i) return;
  $("itemId").value = i.id;
  $("itemSku").value = i.sku || "";
  $("itemLocation").value = i.location || "";
  $("itemBrand").value = i.brand || "";
  $("itemModel").value = i.model || i.name || "";
  $("itemCategory").value = i.category || "";
  $("itemStock").value = Number(i.stock || 0);
  $("itemMin").value = Number(i.min || i.minStock || 1);
  $("itemCost").value = Number(i.cost || 0);
  $("itemSubdealer").value = getSubdealer(i).toFixed(2);
  $("itemPrice").value = Number(i.price || 0);
  showView("inventory");
}

function editOrder(idValue) {
  const o = state.orders.find((x) => x.id === idValue);
  if (!o) return;
  showOrderForm(o);
}

function editPurchase(idValue) {
  const p = state.purchases.find((x) => x.id === idValue);
  if (!p) return;
  $("purchaseId").value = p.id;
  $("purchaseSupplier").value = p.supplierId || "";
  $("purchaseOrder").value = p.orderId || "";
  $("purchasePart").value = p.part || p.items?.[0]?.part || "";
  $("purchaseQty").value = Number(p.qty || p.items?.[0]?.qty || 1);
  $("purchaseCost").value = Number(p.cost || p.items?.[0]?.cost || 0);
  renderPurchaseItems(p.items || [{ id: id("pitem"), part: p.part, qty: p.qty || 1, cost: p.cost || 0 }]);
  $("purchaseStatus").value = p.status || "Cotizando";
  $("purchaseNotes").value = p.notes || "";
  showView("purchases");
}

function editAppointment(idValue) {
  const a = state.appointments.find((x) => x.id === idValue);
  if (!a) return;
  $("appointmentId").value = a.id;
  $("appointmentClient").value = a.clientId || "";
  $("appointmentOrder").value = a.orderId || "";
  $("appointmentDate").value = a.date || "";
  $("appointmentTime").value = a.time || "";
  $("appointmentType").value = a.type || "Seguimiento";
  $("appointmentNotes").value = a.notes || "";
  showView("appointments");
}

function editWarranty(idValue) {
  const w = state.warrantyClaims.find((x) => x.id === idValue);
  if (!w) return;
  $("warrantyId").value = w.id;
  $("warrantyOrder").value = w.orderId || "";
  $("warrantyReason").value = w.reason || "";
  $("warrantyResolution").value = w.resolution || "";
  $("warrantyStatus").value = w.status || "Abierta";
  $("warrantyCost").value = Number(w.cost || 0);
  showView("warranties");
}

function applyTheme(theme = {}) {
  if (theme.blue) document.documentElement.style.setProperty("--pcfix-blue", theme.blue);
  if (theme.cyan) document.documentElement.style.setProperty("--pcfix-cyan", theme.cyan);
  document.body.classList.toggle("motion-disabled", theme.motionEnabled === false);
}

function applyThemeFromInputs() {
  applyTheme({ blue: $("themeBlue").value, cyan: $("themeCyan").value, motionEnabled: $("motionEnabled").checked });
}

function showOrderForm(order = null) {
  currentEvidencePhotos = order?.statusEvidencePhotos || [];
  currentSelectedParts = normalizeOrderParts(order);
  $("orderForm").classList.remove("hidden");
  $("orderFormTitle").textContent = order ? "Modificar orden" : "Nueva orden";
  $("orderId").value = order?.id || "";
  $("orderClient").value = order?.clientId || active(state.clients)[0]?.id || "";
  $("orderDevice").value = order?.device || "";
  const assignedTechnician = (state.technicians || []).find((technician) => technician.id === order?.technicianId || normalize(technician.name) === normalize(order?.technician));
  $("orderTechnician").value = assignedTechnician?.id || "";
  $("orderSerial").value = order?.serial || "";
  $("orderStatus").value = order?.status || "Recibido";
  $("orderPriority").value = order?.priority || "Normal";
  $("orderPromisedAt").value = isoToLocalInput(order?.promisedAt || "");
  $("orderApprovalStatus").value = order?.approvalStatus || "Pendiente";
  $("orderTotal").value = Number(order?.total || 0);
  $("orderDeposit").value = Number(order?.deposit || 0);
  $("orderWarrantyDays").value = 90;
  $("orderIssue").value = order?.issue || "";
  $("orderConditions").value = order?.physicalState || order?.notes || "";
  $("orderAccessories").value = order?.accessories || "";
  $("orderPattern").value = order?.unlockPattern || "";
  $("patternSize").value = String(order?.patternSize || 3);
  $("orderQuotePart").value = order?.quotePartName || suggestPartFromDiagnosis(order?.issue || "", order?.device || "");
  $("orderReplacedPartsDisposition").value = order?.replacedPartsDisposition || "Entregar al cliente";
  $("orderCustomerAuthorization").checked = Boolean(order?.customerAuthorization);
  renderPatternGrid();
  renderEvidencePreview();
  renderOrderPartOptions();
  renderSelectedParts();
  showView("orders");
}

function hideOrderForm() {
  $("orderForm").classList.add("hidden");
  pendingSuggestedPurchase = null;
  lastMissingPartPromptKey = "";
  resetForm("order");
}

function resetForm(kind) {
  const map = {
    client: "clientForm",
    supplier: "supplierForm",
    inventory: "inventoryForm",
    order: "orderForm",
    purchase: "purchaseForm",
    payment: "paymentForm",
    appointment: "appointmentForm",
    warranty: "warrantyForm"
  };
  const form = $(map[kind]);
  if (form) form.reset();
  ["clientId", "supplierId", "itemId", "orderId", "purchaseId", "appointmentId", "warrantyId"].forEach((idName) => { if ($(idName)) $(idName).value = ""; });
  $("itemStock").value = 1;
  $("itemMin").value = 1;
  $("itemSubdealer").value = "0.00";
  if (kind === "order") {
    currentEvidencePhotos = [];
    currentSelectedParts = [];
    renderEvidencePreview();
    renderSelectedParts();
    $("orderQuotePart").value = "";
    $("orderPattern").value = "";
    renderPatternGrid();
  }
  if (kind === "purchase") renderPurchaseItems([]);
}

function renderCommonFailures() {
  const box = $("commonFailureChips");
  if (!box) return;
  box.innerHTML = commonFailures.map((failure) => `
    <button class="failure-chip" type="button" onclick="addCommonFailure('${escapeAttr(failure.label)}')">${escapeHtml(failure.label)}</button>
  `).join("");
}

function addCommonFailure(label) {
  const failure = commonFailures.find((item) => item.label === label);
  if (!failure) return;
  const input = $("orderIssue");
  const current = input.value.trim();
  input.value = current ? `${current}\n${failure.text}` : failure.text;
  updateOrderSuggestions();
}

function updateOrderSuggestions() {
  const suggested = suggestPartFromDiagnosis($("orderIssue").value, $("orderDevice").value);
  if (!$("orderQuotePart").value.trim()) $("orderQuotePart").value = suggested;
  renderOrderPartOptions();
}

function renderOrderPartOptions() {
  const select = $("orderPartSelect");
  if (!select) return;
  const selectedIds = new Set(currentSelectedParts.map((part) => part.inventoryId));
  const compatible = compatibleInventoryForDevice($("orderDevice")?.value || "");
  const rows = compatible.filter((item) => !selectedIds.has(item.id));
  select.innerHTML = rows.map((item) => `
    <option value="${item.id}">
      ${escapeHtml(displayItem(item))} | Stock ${Number(item.stock || 0)} | ${money.format(Number(item.cost || 0))}
    </option>
  `).join("");
  if (!rows.length) {
    select.innerHTML = `<option value="">${compatible.length ? "Refacciones compatibles ya agregadas" : "Sin refacciones compatibles con stock"}</option>`;
  }
  $("addOrderPartBtn").disabled = !rows.length;
  const hint = $("partAvailabilityHint");
  if (hint) hint.innerHTML = rows.length
    ? `<span>${rows.length} opcion(es) compatibles disponibles.</span>`
    : compatible.length
      ? `<span>Todas las refacciones compatibles ya estan agregadas.</span>`
      : `<span>No hay una pieza compatible disponible.</span><button class="btn ghost" type="button" onclick="openPurchaseSuggestion()">Solicitar cotizacion</button>`;
}

function compatibleInventoryForDevice(device = "") {
  const inventory = active(state.inventory).filter((item) => Number(item.stock || 0) > 0);
  const deviceKey = normalize(device);
  if (!deviceKey) return [];
  const ignored = new Set(["celular", "telefono", "smartphone", "equipo", "modelo", "pantalla", "display"]);
  const tokens = deviceKey.split(/\s+/).filter((token) => token.length >= 2 && !ignored.has(token));
  const scored = inventory.map((item) => {
    const itemKey = normalize(`${item.brand || ""} ${item.model || ""} ${item.name || ""}`);
    const itemModel = normalize(item.model || item.name || "");
    const score = tokens.reduce((sum, token) => sum + (itemKey.includes(token) ? 1 : 0), 0);
    const exactModel = itemModel.length >= 3 && (deviceKey.includes(itemModel) || itemModel.includes(deviceKey));
    const distinctiveMatch = tokens.some((token) => /\d/.test(token) && itemKey.includes(token));
    return { item, score: score + (exactModel ? 10 : 0) + (distinctiveMatch ? 5 : 0), exactModel, distinctiveMatch };
  });
  return scored
    .filter((row) => row.exactModel || row.distinctiveMatch || row.score >= Math.min(2, Math.max(1, tokens.length)))
    .sort((a, b) => b.score - a.score || displayItem(a.item).localeCompare(displayItem(b.item), "es"))
    .map((row) => row.item);
}

function maybeOfferPurchaseForMissingPart() {
  const device = $("orderDevice").value.trim();
  if (!device || compatibleInventoryForDevice(device).length) return;
  const promptKey = normalize(`${device}|${$("orderIssue").value}`);
  if (promptKey === lastMissingPartPromptKey) return;
  lastMissingPartPromptKey = promptKey;
  openPurchaseSuggestion();
}

function openPurchaseSuggestion() {
  const dialog = $("purchaseSuggestionDialog");
  if (!dialog) return;
  if (!active(state.suppliers).length) {
    showAlert("Primero registra al menos un proveedor para solicitar la cotizacion.", "error");
    return;
  }
  const device = $("orderDevice").value.trim();
  const suggested = $("orderQuotePart").value.trim() || suggestPartFromDiagnosis($("orderIssue").value, device);
  $("suggestedPurchasePart").value = suggested || `Refaccion para ${device}`;
  $("suggestedPurchaseQty").value = 1;
  $("suggestedPurchaseNotes").value = `Cotizar compatibilidad y disponibilidad para ${device}.`;
  $("suggestedPurchaseContext").textContent = `${device || "Equipo sin modelo"} | ${$("orderIssue").value.trim() || "Diagnostico pendiente"}`;
  renderSelectors();
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closePurchaseSuggestion() {
  const dialog = $("purchaseSuggestionDialog");
  if (dialog?.open && typeof dialog.close === "function") dialog.close();
  else dialog?.removeAttribute("open");
}

function addSelectedOrderPart() {
  const partId = $("orderPartSelect").value;
  if (!partId) {
    openPurchaseSuggestion();
    return;
  }
  const item = state.inventory.find((entry) => entry.id === partId);
  if (!item || currentSelectedParts.some((part) => part.inventoryId === partId)) return;
  const qty = Math.max(1, Number($("orderPartQty").value || 1));
  if (qty > Number(item.stock || 0)) {
    showAlert(`Solo hay ${Number(item.stock || 0)} unidad(es) disponibles de ${displayItem(item)}.`, "error");
    return;
  }
  currentSelectedParts.push({
    id: id("sup"),
    inventoryId: partId,
    part: displayItem(item),
    qty,
    cost: Number(item.cost || 0),
    totalCost: qty * Number(item.cost || 0),
    createdAt: now()
  });
  $("orderPartQty").value = 1;
  renderOrderPartOptions();
  renderSelectedParts();
}

function renderSelectedParts() {
  const box = $("selectedPartsBox");
  if (!box) return;
  box.innerHTML = currentSelectedParts.length ? currentSelectedParts.map((part) => `
    <span class="part-chip premium-chip">
      <strong>${escapeHtml(part.qty || 1)}x</strong> ${escapeHtml(part.part || "")}
      <small>${money.format(Number(part.totalCost ?? Number(part.qty || 1) * Number(part.cost || 0)))}</small>
      <button type="button" onclick="removeSelectedOrderPart('${part.inventoryId}')" aria-label="Quitar refaccion">x</button>
    </span>
  `).join("") : `<span class="part-empty">Selecciona una o varias refacciones para esta reparacion.</span>`;
}

function removeSelectedOrderPart(inventoryId) {
  currentSelectedParts = currentSelectedParts.filter((part) => part.inventoryId !== inventoryId);
  renderOrderPartOptions();
  renderSelectedParts();
}

function normalizeOrderParts(order) {
  if (!order) return [];
  if (Array.isArray(order.suppliedParts) && order.suppliedParts.length) {
    return order.suppliedParts.map((part) => ({
      id: part.id || id("sup"),
      inventoryId: part.inventoryId || part.inventory_id || "",
      part: part.part || part.partName || part.part_name || "",
      qty: Math.max(1, Number(part.qty || 1)),
      cost: Number(part.cost || 0),
      totalCost: Number(part.totalCost ?? part.total_cost ?? Number(part.qty || 1) * Number(part.cost || 0)),
      createdAt: part.createdAt || part.created_at || now()
    }));
  }
  return (order.parts || []).map((partId) => {
    const item = state.inventory.find((entry) => entry.id === partId);
    return {
      id: id("sup"),
      inventoryId: partId,
      part: displayItem(item),
      qty: 1,
      cost: Number(item?.cost || 0),
      totalCost: Number(item?.cost || 0),
      createdAt: now()
    };
  });
}

function suggestPartFromDiagnosis(issue = "", device = "") {
  const text = normalize(`${issue} ${device}`);
  if (!text.trim()) return "";
  const rules = [
    ["pantalla display touch cristal no da imagen rota estrellada", "Pantalla / display compatible"],
    ["bateria pila se descarga inflada no carga", "Bateria compatible"],
    ["centro de carga puerto conector no carga humedad", "Puerto de carga / flex compatible"],
    ["camara foto enfoque lente", "Camara compatible"],
    ["microfono audio bocina altavoz auricular", "Modulo de audio compatible"],
    ["teclado touchpad bisagra laptop", "Teclado / touchpad / bisagra compatible"],
    ["ssd disco almacenamiento lento windows", "SSD / almacenamiento compatible"],
    ["ram memoria reinicia lento", "Memoria RAM compatible"]
  ];
  return rules.find(([keys]) => keys.split(" ").some((key) => text.includes(key)))?.[1] || "Refaccion a confirmar segun diagnostico";
}

async function handleEvidenceFiles(event) {
  const files = Array.from(event.target.files || []).slice(0, 8);
  if (files.some((file) => !file.type.startsWith("image/"))) throw new Error("Solo puedes adjuntar imagenes como evidencia.");
  if (files.some((file) => file.size > 15 * 1024 * 1024)) throw new Error("Cada fotografia debe pesar menos de 15 MB.");
  const photos = await Promise.all(files.map(fileToPhoto));
  currentEvidencePhotos = [...currentEvidencePhotos, ...photos].slice(0, 10);
  renderEvidencePreview();
  event.target.value = "";
}

async function fileToPhoto(file) {
  const source = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error(`No se pudo procesar ${file.name}.`));
    element.src = source;
  });
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    id: id("pho"),
    name: file.name,
    type: "image/jpeg",
    dataUrl: canvas.toDataURL("image/jpeg", 0.82),
    width: canvas.width,
    height: canvas.height,
    at: now()
  };
}

function renderEvidencePreview() {
  $("evidencePreview").innerHTML = currentEvidencePhotos.map((photo) => `
    <figure>
      <img src="${photo.dataUrl}" alt="${escapeHtml(photo.name || "Evidencia")}">
      <button class="btn danger" type="button" onclick="removeEvidencePhoto('${photo.id}')">Quitar</button>
    </figure>
  `).join("");
}

function removeEvidencePhoto(photoId) {
  currentEvidencePhotos = currentEvidencePhotos.filter((photo) => photo.id !== photoId);
  renderEvidencePreview();
}

function renderPatternGrid() {
  const size = Number($("patternSize")?.value || 3);
  const selected = new Set(String($("orderPattern")?.value || "").split("-").map((x) => x.trim()).filter(Boolean));
  $("patternGrid").style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  $("patternGrid").innerHTML = Array.from({ length: size * size }, (_, index) => {
    const value = String(index + 1);
    return `<button type="button" class="${selected.has(value) ? "selected" : ""}" onclick="togglePatternPoint('${value}')">${value}</button>`;
  }).join("");
}

function togglePatternPoint(value) {
  const input = $("orderPattern");
  const parts = input.value.split("-").map((x) => x.trim()).filter(Boolean);
  input.value = parts.includes(value) ? parts.filter((part) => part !== value).join("-") : [...parts, value].join("-");
  renderPatternGrid();
}

function renderPurchaseItems(items = []) {
  const rows = items.length ? items : [{ id: id("pitem"), part: "", qty: 1, cost: 0 }];
  $("purchaseItems").innerHTML = rows.map((item) => purchaseItemRow(item)).join("");
  updatePurchaseItemsTotal();
}

function purchaseItemRow(item) {
  const qty = Math.max(1, Number(item.qty || 1));
  const cost = Number(item.cost || 0);
  return `
    <div class="purchase-item" data-purchase-item="${item.id || id("pitem")}">
      <input data-field="part" aria-label="Producto" placeholder="Ej. Pantalla OLED Oppo A38" value="${escapeHtml(item.part || "")}">
      <input data-field="qty" aria-label="Cantidad" type="number" min="1" value="${qty}">
      <input data-field="cost" aria-label="Costo unitario" type="number" min="0" step="0.01" value="${cost}">
      <output data-field="subtotal">${money.format(qty * cost)}</output>
      <button class="icon-button danger" type="button" onclick="removePurchaseItemRow(this)" aria-label="Quitar producto" title="Quitar producto">&times;</button>
    </div>`;
}

function addPurchaseItemRow(item = null) {
  $("purchaseItems").insertAdjacentHTML("beforeend", purchaseItemRow(item || { id: id("pitem"), part: "", qty: 1, cost: 0 }));
  updatePurchaseItemsTotal();
  $("purchaseItems").lastElementChild?.querySelector('[data-field="part"]')?.focus();
}

function removePurchaseItemRow(button) {
  const rows = Array.from(document.querySelectorAll("[data-purchase-item]"));
  if (rows.length <= 1) return;
  button.closest("[data-purchase-item]")?.remove();
  updatePurchaseItemsTotal();
}

function updatePurchaseItemsTotal() {
  const rows = Array.from(document.querySelectorAll("[data-purchase-item]"));
  const total = rows.reduce((sum, row) => {
    const qty = Math.max(1, Number(row.querySelector('[data-field="qty"]')?.value || 1));
    const cost = Math.max(0, Number(row.querySelector('[data-field="cost"]')?.value || 0));
    const subtotal = qty * cost;
    const output = row.querySelector('[data-field="subtotal"]');
    if (output) output.textContent = money.format(subtotal);
    return sum + subtotal;
  }, 0);
  if ($("purchaseItemsTotal")) $("purchaseItemsTotal").textContent = money.format(total);
}

function getPurchaseItemsFromForm() {
  const rows = Array.from(document.querySelectorAll("[data-purchase-item]"));
  const items = rows.map((row) => ({
    id: row.dataset.purchaseItem || id("pitem"),
    part: row.querySelector('[data-field="part"]').value.trim(),
    qty: Math.max(1, Number(row.querySelector('[data-field="qty"]').value || 1)),
    cost: Number(row.querySelector('[data-field="cost"]').value || 0)
  })).filter((item) => item.part);
  if (!items.length && $("purchasePart").value.trim()) {
    items.push({ id: id("pitem"), part: $("purchasePart").value.trim(), qty: Math.max(1, Number($("purchaseQty").value || 1)), cost: Number($("purchaseCost").value || 0) });
  }
  if (items[0]) {
    $("purchasePart").value = items[0].part;
    $("purchaseQty").value = items[0].qty;
    $("purchaseCost").value = items[0].cost;
  }
  updatePurchaseItemsTotal();
  return items;
}

function hydrateSettings() {
  $("businessName").value = state.settings.businessName || "";
  $("businessPhone").value = state.settings.businessPhone || "";
  $("businessAddress").value = state.settings.businessAddress || "";
  $("whatsappTemplate").value = state.settings.whatsappTemplate || "";
  $("themeBlue").value = state.settings.theme?.blue || "#0B3B63";
  $("themeCyan").value = state.settings.theme?.cyan || "#20C7D8";
  $("motionEnabled").checked = state.settings.theme?.motionEnabled !== false;
  applyTheme(state.settings.theme || {});
}

async function searchPortal(event) {
  event.preventDefault();
  const lookup = $("portalFolio").value.trim();
  if (!lookup) return;
  $("portalResult").innerHTML = empty("Consultando BD...");
  currentPortalOrder = null;
  currentPortalClient = null;
  try {
    const response = await fetch(`${session.baseUrl || API_DEFAULT}/api/public/orders/${encodeURIComponent(lookup)}?t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.order) {
      $("portalResult").innerHTML = empty("Orden no encontrada en BD");
      return;
    }
    const order = payload.order;
    const client = payload.client || {};
    currentPortalOrder = order;
    currentPortalClient = client;
    const delivered = order.status === "Entregado";
    $("portalResult").innerHTML = renderPortalOrder(order, client);
  } catch (error) {
    $("portalResult").innerHTML = empty(`No se pudo consultar BD: ${error.message}`);
  }
}

function portalWelcome() {
  return `
    <div class="portal-premium portal-empty">
      <div class="status-visual received"><div class="pcfix-status-emblem"><span></span><img src="assets/logo-pcfix.png" alt=""></div></div>
      <h2>Consulta tu reparacion</h2>
      <p>Ingresa tu folio de orden o tu numero de WhatsApp para ver el seguimiento.</p>
    </div>`;
}

function renderPortalOrder(order, client = {}) {
  const delivered = order.status === "Entregado";
  const progress = getStatusProgress(order.status);
  const parts = order.suppliedParts || [];
  const history = order.statusHistory || [];
  const canceled = order.status === "Cancelado";
  const statusIndex = repairProgressStatuses.indexOf(order.status);
  return `
      <div class="portal-premium portal-order-card">
        <div class="portal-hero-premium">
          <div class="status-visual ${statusClass(order.status)}">
            <div class="pcfix-status-emblem"><span></span><img src="assets/logo-pcfix.png" alt="Animacion de estado PCFix"></div>
          </div>
          <div>
            <span class="portal-eyebrow">Seguimiento de reparacion</span>
            <h2>${escapeHtml(order.folio)} | ${escapeHtml(order.device)}</h2>
            <p>${escapeHtml(client.name || "Cliente")} | ${escapeHtml(order.status || "")}</p>
          </div>
          <div class="progress-orbit ${canceled ? "is-canceled" : ""}" style="--progress:${progress}" role="progressbar" aria-label="Avance de reparacion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><strong>${progress}%</strong><span>${canceled ? "Interrumpido" : "Avance"}</span></div>
        </div>
        ${canceled ? `<div class="portal-canceled-notice"><strong>Servicio cancelado</strong><span>El progreso se detuvo. Contacta a PCFix para cualquier aclaracion.</span></div>` : `<div class="portal-progress" aria-hidden="true"><i style="width:${progress}%"></i></div>`}
        <div class="timeline repair-timeline">${repairProgressStatuses.map((s, index) => `<span class="${index <= statusIndex ? "done" : ""} ${index === statusIndex ? "current" : ""}"><i></i>${escapeHtml(s)}</span>`).join("")}</div>
        <div class="portal-detail">
          <strong>Garantia</strong><span>${Number(order.warrantyDays || 90)} dias</span>
          <strong>Ultima actualizacion</strong><span>${escapeHtml(formatDate(order.updatedAt || order.updated_at || ""))}</span>
          <strong>Entrega estimada</strong><span>${escapeHtml(order.promisedAt ? formatDateTime(order.promisedAt) : "Por confirmar")}</span>
          <strong>Presupuesto</strong><span>${escapeHtml(order.approvalStatus || "Pendiente")}</span>
          <strong>Tecnico</strong><span>${escapeHtml(order.technician || "Equipo PCFix")}</span>
          <strong>Serie / IMEI</strong><span>${escapeHtml(order.serial || "No registrado")}</span>
          <strong>Total</strong><span>${money.format(Number(order.total || 0))}</span>
          <strong>Saldo</strong><span>${money.format(Math.max(0, Number(order.total || 0) - Number(order.deposit || 0)))}</span>
        </div>
        <div class="portal-info-grid">
          <article><strong>Falla / diagnostico</strong><span>${escapeHtml(order.issue || "En revision")}</span></article>
          <article><strong>Condiciones del equipo</strong><span>${escapeHtml(order.physicalState || order.notes || "Sin condiciones registradas")}</span></article>
          <article><strong>Accesorios recibidos</strong><span>${escapeHtml(order.accessories || "Sin accesorios registrados")}</span></article>
          <article><strong>Refacciones utilizadas</strong><span>${parts.length ? parts.map((part) => `${escapeHtml(part.qty || 1)}x ${escapeHtml(part.part || "")}`).join(", ") : "Sin refacciones registradas"}</span></article>
        </div>
        ${history.length ? `<div class="portal-history"><strong>Historial</strong>${history.map((item) => `<span>${escapeHtml(item.status || "")} | ${escapeHtml(formatDate(item.at || ""))}</span>`).join("")}</div>` : ""}
        ${(order.statusEvidencePhotos || []).length ? `<div class="photo-strip readonly">${(order.statusEvidencePhotos || []).slice(0, 6).map((photo) => `<figure><img src="${photo.dataUrl}" alt="${escapeHtml(photo.name || "Evidencia")}"></figure>`).join("")}</div>` : ""}
        ${delivered ? `<div class="record-actions"><button class="btn primary" type="button" onclick="printPortalOrder()">Descargar PDF</button></div>` : ""}
      </div>`;
}

function printPortalOrder() {
  if (!currentPortalOrder) {
    showAlert("Primero consulta una orden entregada.", "error");
    return;
  }
  printOrderDocument(currentPortalOrder, { context: "delivery", customerCopy: true, client: currentPortalClient || {} });
}

function getStatusProgress(status = "") {
  const index = repairProgressStatuses.indexOf(status);
  if (index < 0) return 0;
  return Math.round(((index + 1) / repairProgressStatuses.length) * 100);
}

async function loadAdminReports() {
  try {
    $("adminHealthPanel").innerHTML = empty("Consultando backend...");
    const [stability, analytics, integrity] = await Promise.all([
      api(`/api/admin/stability?t=${Date.now()}`),
      api(`/api/admin/analytics?t=${Date.now()}`),
      api(`/api/admin/integrity?t=${Date.now()}`)
    ]);
    currentAdminReport = { stability, analytics, integrity };
    renderAdminHealth();
    showAlert("Diagnostico de BD actualizado.", "ok");
  } catch (error) {
    $("adminHealthPanel").innerHTML = empty(`No se pudo consultar diagnostico: ${error.message}`);
  }
}

function renderAdminHealth() {
  const panel = $("adminHealthPanel");
  if (!panel) return;
  if (!currentAdminReport) {
    panel.innerHTML = `
      <article><strong>Frontend</strong><span>${escapeHtml(PCFIX_FRONTEND_VERSION)}</span></article>
      <article><strong>Modo</strong><span>Online directo a BD, sin datos offline de negocio</span></article>
      <article><strong>Sesion</strong><span>Se cierra al cerrar navegador por sessionStorage</span></article>
    `;
    return;
  }
  const { stability, analytics, integrity } = currentAdminReport;
  const kpis = analytics.kpis || {};
  panel.innerHTML = `
    <article><strong>Integridad BD</strong><span>${integrity.ok ? "Sin alertas" : "Revisar incidencias"} | Duplicados: ${countDuplicateAlerts(stability.duplicates)}</span></article>
    <article><strong>SLA operativo</strong><span>${kpis.overdue_orders || 0} vencidas | ciclo ${Number(kpis.average_cycle_days || 0).toFixed(1)} dias</span></article>
    <article><strong>Costos internos</strong><span>Refacciones y garantias ${money.format(Number(kpis.partsCost || 0) + Number(kpis.warrantyCost || 0))}</span></article>
    <article><strong>Compras / inventario</strong><span>${kpis.pendingPurchases || 0} pendientes | ${money.format(Number(kpis.pendingPurchaseValue || 0))}</span></article>
    <article><strong>Cuentas por cobrar</strong><span>${money.format(Number(kpis.receivables || 0))}</span></article>
    <article><strong>Garantias</strong><span>${kpis.warrantyClaims || 0} abiertas | costo ${money.format(Number(kpis.warrantyCost || 0))}</span></article>
    ${(integrity.checks || []).map((check) => `<article><strong>${escapeHtml(check.label)}</strong><span>${Number(check.total || 0)} caso(s)</span></article>`).join("")}
  `;
}

function countDuplicateAlerts(duplicates = {}) {
  return Object.values(duplicates).reduce((sum, rows) => sum + (Array.isArray(rows) ? rows.length : 0), 0);
}

function draftOrderFromForm() {
  const existing = state.orders.find((o) => o.id === $("orderId").value);
  const technician = (state.technicians || []).find((item) => item.id === $("orderTechnician").value);
  const total = Number($("orderTotal").value || existing?.total || 0);
  return {
    ...(existing || {}),
    id: $("orderId").value || "borrador",
    folio: existing?.folio || "BORRADOR",
    clientId: $("orderClient").value,
    device: $("orderDevice").value.trim(),
    technicianId: technician?.id || "",
    technician: technician?.name || "",
    serial: $("orderSerial").value.trim(),
    status: $("orderStatus").value,
    priority: $("orderPriority").value,
    promisedAt: localInputToIso($("orderPromisedAt").value),
    approvalStatus: $("orderApprovalStatus").value,
    total,
    deposit: $("orderStatus").value === "Entregado" ? total : Number($("orderDeposit").value || 0),
    issue: $("orderIssue").value.trim(),
    notes: $("orderConditions").value.trim(),
    physicalState: $("orderConditions").value.trim(),
    accessories: $("orderAccessories").value.trim(),
    warrantyDays: 90,
    warrantyTerms: defaultWarrantyTerms(),
    replacedPartsDisposition: $("orderReplacedPartsDisposition").value,
    customerAuthorization: $("orderCustomerAuthorization").checked,
    suppliedParts: currentSelectedParts,
    statusEvidencePhotos: currentEvidencePhotos,
    updatedAt: now()
  };
}

function printOrderById(orderId) {
  const order = state.orders.find((item) => item.id === orderId);
  if (order) printOrderDocument(order);
}

function printOrderDocument(order, options = {}) {
  const client = options.client || getClient(order.clientId) || {};
  const parts = order.suppliedParts || [];
  const isDelivery = options.context === "delivery" || order.status === "Entregado";
  const customerCopy = Boolean(options.customerCopy);
  const documentTitle = "Orden de servicio";
  const conditions = order.physicalState || order.notes || "";
  const accessories = order.accessories || "Sin accesorios registrados";
  const partsRows = parts.length
    ? parts.map((part) => customerCopy
      ? `<tr><td>${escapeHtml(part.part || "")}</td><td>${escapeHtml(part.qty || 1)}</td></tr>`
      : `<tr><td>${escapeHtml(part.part || "")}</td><td>${escapeHtml(part.qty || 1)}</td><td>${money.format(Number(part.totalCost ?? part.cost ?? 0))}</td></tr>`
    ).join("")
    : `<tr><td colspan="${customerCopy ? 2 : 3}">Sin refacciones registradas</td></tr>`;
  const partsHeader = customerCopy
    ? "<tr><th>Pieza</th><th>Cant.</th></tr>"
    : "<tr><th>Pieza</th><th>Cant.</th><th>Costo</th></tr>";
  const technicianName = order.technician || "Tecnico PCFix";
  const clientName = client.name || "Cliente";
  const popup = window.open("", "_blank", "width=920,height=900");
  if (!popup) {
    showAlert("El navegador bloqueo la ventana de PDF. Permite ventanas emergentes para imprimir.", "error");
    return;
  }
  popup.document.write(`
    <!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(documentTitle)} ${escapeHtml(order.folio || "PCFix")}</title>
    <style>
      body{font-family:Poppins,Arial,sans-serif;margin:0;color:#1F2937;background:#F5F7FA}
      main{max-width:900px;margin:0 auto;padding:30px}
      .sheet{overflow:hidden;border:1px solid #DDE6EF;border-radius:14px;background:#fff;box-shadow:0 24px 70px rgba(11,59,99,.10)}
      .top{display:grid;grid-template-columns:112px 1fr auto;gap:18px;align-items:center;padding:26px 30px;background:#0B3B63;color:#fff}
      .top img{width:96px;height:96px;object-fit:contain;border-radius:10px;background:#fff;padding:6px}
      h1{margin:0;font-size:32px;letter-spacing:0}.top p{margin:6px 0 0;color:#D8F8FC;font-weight:700}
      .folio{text-align:right}.folio strong{display:block;font-size:20px}.folio span{display:inline-block;margin-top:8px;border-radius:999px;padding:7px 11px;background:#20C7D8;color:#0B3B63;font-weight:900;font-size:12px}
      .content{padding:28px 30px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.grid.three{grid-template-columns:1fr 1fr 1fr}
      .box{border:1px solid #DDE6EF;border-radius:10px;padding:15px;background:#fff}.box.soft{background:#F8FAFC}
      h2{margin:0 0 10px;color:#0B3B63;font-size:15px;text-transform:uppercase;letter-spacing:.04em}
      p{margin:5px 0;line-height:1.45}.muted{color:#667085}.total{font-size:26px;font-weight:900;color:#0B3B63}
      table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border-bottom:1px solid #DDE6EF;padding:10px;text-align:left}th{color:#667085;font-size:12px;text-transform:uppercase}
      .brand-line{height:5px;background:linear-gradient(90deg,#0B3B63 0 82%,#20C7D8 82% 100%)}
      .signature{height:80px;border-bottom:1px solid #9AA8B8;margin-top:40px}.signature-label{text-align:center;color:#667085;font-size:12px}
      footer{margin-top:20px;border-top:1px solid #DDE6EF;padding-top:14px;color:#667085;font-size:12px}
      button{margin:0 0 16px;border:1px solid #0B3B63;border-radius:8px;background:#0B3B63;color:#fff;padding:11px 15px;font-weight:900}
      @media print{body{background:#fff}button{display:none}main{padding:0}.sheet{box-shadow:none;border-radius:0}}
    </style></head><body><main>
      <button onclick="window.print()">Imprimir / Guardar PDF</button>
      <section class="sheet">
      <div class="top"><img src="assets/logo-pcfix.png"><div><h1>PCFix Comitan</h1><p>${escapeHtml(documentTitle)}</p></div><div class="folio"><strong>${escapeHtml(order.folio || "")}</strong><span>${escapeHtml(order.status || "")}</span></div></div>
      <div class="brand-line"></div>
      <div class="content">
      <section class="grid">
        <div class="box"><h2>Orden</h2><p><b>Equipo:</b> ${escapeHtml(order.device || "")}</p><p><b>Serie/IMEI:</b> ${escapeHtml(order.serial || "")}</p><p><b>Tecnico:</b> ${escapeHtml(order.technician || "")}</p><p><b>Entrega prometida:</b> ${escapeHtml(order.promisedAt ? formatDateTime(order.promisedAt) : "Por confirmar")}</p></div>
        <div class="box"><h2>Cliente</h2><p><b>Nombre:</b> ${escapeHtml(client.name || "")}</p><p><b>Telefono:</b> ${escapeHtml(client.phone || "")}</p><p><b>Correo:</b> ${escapeHtml(client.email || "")}</p></div>
      </section>
      <section class="box soft"><h2>Falla / diagnostico</h2><p>${escapeHtml(order.issue || "")}</p></section>
      <section class="grid">
        <div class="box"><h2>Condiciones del equipo</h2><p>${escapeHtml(conditions || "Sin condiciones registradas")}</p></div>
        <div class="box"><h2>Accesorios recibidos</h2><p>${escapeHtml(accessories)}</p></div>
      </section>
      <section class="box"><h2>Refacciones utilizadas</h2><table><thead>${partsHeader}</thead><tbody>${partsRows}</tbody></table></section>
      <section class="box soft"><h2>Autorizacion y refacciones sustituidas</h2><p>Presupuesto: ${escapeHtml(order.approvalStatus || "Pendiente")} | Autorizacion registrada: ${order.customerAuthorization ? "Si" : "No"}</p><p>Destino de refacciones sustituidas: ${escapeHtml(order.replacedPartsDisposition || "Entregar al cliente")}</p></section>
      <section class="grid"><div class="box"><h2>Garantia</h2><p>${Number(order.warrantyDays || 90)} dias</p><p class="muted">${escapeHtml(order.warrantyTerms || defaultWarrantyTerms())}</p></div><div class="box"><h2>Importe</h2><p class="total">${money.format(Number(order.total || 0))}</p><p>Anticipo/pagado: ${money.format(getPaid(order))}</p><p>Saldo: ${money.format(getBalance(order))}</p></div></section>
      ${isDelivery ? `<section class="grid"><div><div class="signature"></div><p class="signature-label">${escapeHtml(technicianName)}</p></div><div><div class="signature"></div><p class="signature-label">${escapeHtml(clientName)}</p></div></section>` : ""}
      <footer>PCFix Comitan | La solucion a tus problemas | Documento generado desde informacion registrada en la base de datos.</footer>
      </div></section>
    </main></body></html>
  `);
  popup.document.close();
}

function statusClass(status = "") {
  const value = normalize(status);
  if (value.includes("cancelado")) return "canceled";
  if (value.includes("listo")) return "ready";
  if (value.includes("reparacion")) return "repair";
  if (value.includes("pieza")) return "waiting";
  if (value.includes("entregado")) return "delivered";
  if (value.includes("diagnostico")) return "diagnostic";
  return "received";
}

function active(rows) {
  return (rows || []).filter((row) => !row.archived);
}

function sortByName(rows) {
  return [...(rows || [])].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es-MX", { sensitivity: "base", numeric: true }));
}

function matches(values) {
  const q = normalize($("searchInput").value);
  return !q || values.some((value) => normalize(value).includes(q));
}

function getClient(idValue) {
  return state.clients.find((c) => c.id === idValue);
}

function getSupplier(idValue) {
  return state.suppliers.find((s) => s.id === idValue);
}

function getPaid(order) {
  const payments = state.payments.filter((p) => p.orderId === order.id).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  return Math.max(Number(order.deposit || 0), payments);
}

function getBalance(order) {
  return Math.max(0, Number(order.total || 0) - getPaid(order));
}

function getOrderPartsCost(order) {
  return (order.suppliedParts || []).reduce((sum, part) => {
    const qty = Math.max(1, Number(part.qty || 1));
    const cost = Number(part.totalCost ?? part.total_cost ?? qty * Number(part.cost || 0));
    return sum + cost;
  }, 0);
}

function getOrderInternalCost(order) {
  return getOrderPartsCost(order);
}

function isOrderOverdue(order) {
  if (!order?.promisedAt || ["Entregado", "Cancelado"].includes(order.status)) return false;
  const promised = new Date(order.promisedAt).getTime();
  return Number.isFinite(promised) && promised < Date.now();
}

function averageCycleDays(orders) {
  const durations = orders.map((order) => {
    const start = new Date(order.createdAt || order.created_at || "").getTime();
    const end = new Date(order.completedAt || order.updatedAt || order.updated_at || "").getTime();
    return Number.isFinite(start) && Number.isFinite(end) && end >= start ? (end - start) / 86400000 : null;
  }).filter((value) => value !== null);
  return durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
}

function nextOrderFolio() {
  const year = new Date().getFullYear();
  const next = state.orders.filter((o) => String(o.folio || "").includes(String(year))).length + 1;
  return `PCF-${year}-${String(next).padStart(4, "0")}`;
}

function nextPurchaseFolio() {
  const year = new Date().getFullYear();
  const next = state.purchases.filter((p) => String(p.folio || "").includes(String(year))).length + 1;
  return `OC-${year}-${String(next).padStart(4, "0")}`;
}

function updateHistory(existing, status) {
  const history = [...(existing?.statusHistory || [])];
  if (!history.length) history.push({ status: existing?.status || "Recibido", at: existing?.createdAt || now(), user: session.user?.name || "Sistema" });
  if (history.at(-1)?.status !== status) history.push({ status, at: now(), user: session.user?.name || "Sistema" });
  return history;
}

function card(html) {
  return `<article class="record-card">${html}</article>`;
}

function empty(text) {
  return `<div class="empty-state"><strong>${escapeHtml(text)}</strong></div>`;
}

function showAlert(message, type = "ok") {
  const box = $("alertBox");
  if (!box || $("app")?.classList.contains("hidden")) {
    showLoginAlert(message, type);
    return;
  }
  box.textContent = message;
  box.className = `alert ${type}`;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 5500);
}

function showLoginAlert(message, type = "ok", hide = false) {
  const box = $("loginAlert");
  if (!box) return;
  if (hide || !message) {
    box.classList.add("hidden");
    box.textContent = "";
    return;
  }
  box.textContent = message;
  box.className = `alert ${type}`;
  box.classList.remove("hidden");
}

function setBusy(value) {
  busy = value;
  document.body.classList.toggle("is-busy", busy);
}

function id(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function localInputToIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function isoToLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function displayItem(item) {
  if (!item) return "";
  return item.name || [item.brand, item.model].filter(Boolean).join(" ") || item.model || "Articulo";
}

function calculateSubdealer(cost) {
  return Math.round(Number(cost || 0) * 1.3 * 100) / 100;
}

function getSubdealer(item) {
  return Number(item.subdealerPrice ?? item.subdealer_price ?? calculateSubdealer(item.cost));
}

function normalize(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function waUrl(phone, text) {
  const digits = String(phone || "").replace(/\D/g, "");
  const to = digits.length === 10 ? `52${digits}` : digits;
  return `https://wa.me/${to}?text=${encodeURIComponent(text || "")}`;
}

function orderMessage(order) {
  const client = getClient(order.clientId);
  return `Hola ${client?.name || ""}, te saluda PCFix Comitan. Tu equipo ${order.device || ""} con folio ${order.folio || ""} esta en estado: ${order.status || ""}.`;
}

function trackingMessage(order) {
  const portalUrl = `${window.location.origin}${window.location.pathname}?portal=1&folio=${encodeURIComponent(order.folio || "")}`;
  return `Hola, puedes consultar el seguimiento visual de tu reparacion con el folio ${order.folio || ""} en el portal de PCFix: ${portalUrl}. Estado actual: ${order.status || ""}.`;
}

function deliveryMessage(order) {
  const client = getClient(order.clientId);
  return `Hola ${client?.name || ""}, tu equipo ${order.device || ""} con folio ${order.folio || ""} fue entregado. El comprobante de servicio esta listo para compartirse contigo. Gracias por confiar en PCFix Comitan; nos ayudas mucho dejandonos una recomendacion en Facebook: ${facebookReviewUrl}`;
}

function purchaseMessage(purchase) {
  const items = purchase.items?.length ? purchase.items : [{ part: purchase.part, qty: purchase.qty || 1 }];
  return `Hola, solicito cotizacion y disponibilidad de: ${items.map((item) => `${item.qty || 1} ${item.part || ""}`).join(", ")}.`;
}

function defaultWarrantyTerms() {
  const claimAddress = state.settings.businessAddress || "el establecimiento de PCFix Comitan";
  return `Garantia de 90 dias naturales contados desde la entrega. Cubre, sin costo, deficiencias imputables a la reparacion realizada y a las refacciones instaladas por PCFix, respecto de la falla descrita en esta orden. Para hacerla valida, presenta el equipo y el folio o comprobante en ${claimAddress}. No cubre fallas distintas ni danos causados por golpes, liquidos, mal uso, variaciones electricas, desgaste normal, software, virus, perdida de datos o intervencion de terceros, siempre que la causa sea ajena al servicio garantizado. En refacciones aportadas por el cliente se garantiza unicamente la instalacion. El tiempo que el equipo permanezca en reparacion por garantia no se computa dentro del plazo; las piezas sustituidas al amparo de la garantia inician su propio plazo legal. PCFix responde por danos o perdidas imputables a su actuacion mientras el equipo este bajo su resguardo. Estas condiciones no limitan los derechos de la persona consumidora conforme a la Ley Federal de Proteccion al Consumidor.`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateFmt.format(date);
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateTimeFmt.format(date);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

Object.assign(window, {
  PCFIX_FRONTEND_VERSION,
  editClient,
  editSupplier,
  editInventory,
  editOrder,
  editPurchase,
  editAppointment,
  editWarranty,
  removeRecord,
  quickStatus,
  changeOrderStatus,
  sendStatusWhatsApp,
  sendTrackingWhatsApp,
  sendDeliveryWhatsApp,
  receivePurchase,
  removeEvidencePhoto,
  removeSelectedOrderPart,
  addCommonFailure,
  printPortalOrder,
  togglePatternPoint,
  removePurchaseItemRow,
  printOrderById
});

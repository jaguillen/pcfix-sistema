const API_DEFAULT = "https://pcfix-backend.onrender.com";
const EMAIL_DEFAULT = "admin@pcfix.local";
const SESSION_KEY = "pcfix-online-session-v2";
const CONFIG_KEY = "pcfix-online-config-v2";

const money = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const dateFmt = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" });
const orderStatuses = ["Recibido", "Diagnostico", "Esperando pieza", "En reparacion", "Listo", "Entregado", "Cancelado"];
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
  purchases: [],
  payments: [],
  inventoryMovements: [],
  appointments: [],
  warrantyClaims: [],
  auditLog: []
};

let state = structuredClone(defaultState);
let session = loadSession();
let activeView = "dashboard";
let busy = false;

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
  await clearBrowserResidue();
  fillStaticOptions();
  wireEvents();
  hydrateLogin();
  if (session.token) {
    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    await loadStateFromDb();
  }
});

async function clearBrowserResidue() {
  ["pcfix-system-v1", "pcfix-pending-sync-v1", "pcfix-local-snapshots-v1"].forEach((key) => localStorage.removeItem(key));
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
    const config = JSON.parse(localStorage.getItem(CONFIG_KEY) || "{}");
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
    return {
      baseUrl: config.baseUrl || API_DEFAULT,
      email: config.email || EMAIL_DEFAULT,
      token: saved.token || "",
      user: saved.user || null
    };
  } catch {
    return { baseUrl: API_DEFAULT, email: EMAIL_DEFAULT, token: "", user: null };
  }
}

function saveSession() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify({ baseUrl: session.baseUrl, email: session.email }));
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

function wireEvents() {
  $("loginForm").addEventListener("submit", login);
  $("logoutBtn").addEventListener("click", logout);
  $("refreshBtn").addEventListener("click", () => loadStateFromDb(true));
  $("newOrderBtn").addEventListener("click", () => showOrderForm());
  $("cancelOrderBtn").addEventListener("click", hideOrderForm);
  $("searchInput").addEventListener("input", render);
  document.querySelectorAll("#nav button").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });

  $("clientForm").addEventListener("submit", saveClient);
  $("supplierForm").addEventListener("submit", saveSupplier);
  $("inventoryForm").addEventListener("submit", saveInventory);
  $("orderForm").addEventListener("submit", saveOrder);
  $("purchaseForm").addEventListener("submit", savePurchase);
  $("paymentForm").addEventListener("submit", savePayment);
  $("settingsForm").addEventListener("submit", saveSettings);
  $("portalForm").addEventListener("submit", searchPortal);
  $("itemCost").addEventListener("input", () => $("itemSubdealer").value = calculateSubdealer($("itemCost").value).toFixed(2));
  document.querySelectorAll("[data-reset]").forEach((button) => button.addEventListener("click", () => resetForm(button.dataset.reset)));
}

async function login(event) {
  event.preventDefault();
  try {
    setBusy(true);
    const baseUrl = $("loginServer").value.trim().replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      body: JSON.stringify({ email: $("loginEmail").value.trim(), password: $("loginPassword").value })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Login rechazado");
    session = { baseUrl, email: $("loginEmail").value.trim(), token: payload.token, user: payload.user };
    saveSession();
    $("loginScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    await loadStateFromDb();
  } catch (error) {
    showAlert(error.message, "error");
  } finally {
    setBusy(false);
  }
}

function logout() {
  session.token = "";
  session.user = null;
  saveSession();
  state = structuredClone(defaultState);
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
  if (!response.ok) throw new Error(payload.error || payload.message || "Error de backend");
  return payload;
}

async function loadStateFromDb(manual = false) {
  try {
    setBusy(true);
    const payload = await api(`/api/state?t=${Date.now()}`);
    const data = payload.data || {};
    state = {
      ...structuredClone(defaultState),
      ...data,
      settings: { ...structuredClone(defaultState.settings), ...(data.settings || {}) }
    };
    render();
    $("connectionLabel").textContent = `BD actualizada ${new Date().toLocaleTimeString("es-MX")}`;
    if (manual) showAlert("Datos cargados desde BD.", "ok");
    return true;
  } catch (error) {
    state = structuredClone(defaultState);
    render();
    showAlert(`No se pudo leer BD: ${error.message}`, "error");
    return false;
  } finally {
    setBusy(false);
  }
}

async function saveRecord(type, data) {
  const payload = await api(`/api/records/${type}`, {
    method: "POST",
    body: JSON.stringify({ id: data.id, data, detail: "Guardado directo BD" })
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
    portal: ["Portal cliente", "Consulta por folio."],
    settings: ["Configuracion", "Datos de empresa."]
  };
  $("viewTitle").textContent = names[view][0];
  $("viewSubtitle").textContent = names[view][1];
  loadStateFromDb();
}

function render() {
  renderSelectors();
  renderDashboard();
  renderClients();
  renderSuppliers();
  renderInventory();
  renderOrders();
  renderPurchases();
  renderPayments();
  hydrateSettings();
}

function renderDashboard() {
  $("metricClients").textContent = active(state.clients).length;
  $("metricOrders").textContent = active(state.orders).filter((o) => !["Entregado", "Cancelado"].includes(o.status)).length;
  $("metricPurchases").textContent = active(state.purchases).length;
  $("metricLowStock").textContent = active(state.inventory).filter((i) => Number(i.stock || 0) <= Number(i.min || i.minStock || 1)).length;
  $("metricRevenue").textContent = money.format(active(state.orders).reduce((sum, o) => sum + Number(o.total || 0), 0));
  $("recentOrders").innerHTML = active(state.orders).slice(0, 8).map(orderCard).join("") || empty("Sin ordenes en BD");
}

function renderClients() {
  const rows = active(state.clients).filter((c) => matches([c.name, c.phone, c.email, c.address]));
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
  const rows = active(state.inventory).filter((i) => matches([i.brand, i.model, i.name, i.category]));
  $("inventoryCount").textContent = rows.length;
  $("inventoryList").innerHTML = rows.map((i) => card(`
    <strong>${escapeHtml(displayItem(i))}</strong><span>${escapeHtml(i.category || "")}</span>
    <small>Stock ${Number(i.stock || 0)} | Min ${Number(i.min || i.minStock || 1)} | Costo ${money.format(Number(i.cost || 0))} | Sub ${money.format(getSubdealer(i))}</small>
    <div class="record-actions">
      <button onclick="editInventory('${i.id}')" class="btn ghost">Editar</button>
      <button onclick="removeRecord('inventory','${i.id}')" class="btn danger">Archivar</button>
    </div>`)).join("") || empty("Sin inventario en BD");
}

function renderOrders() {
  const rows = active(state.orders).filter((o) => matches([o.folio, o.device, o.status, getClient(o.clientId)?.name]));
  const activeRows = rows.filter((o) => o.status !== "Entregado");
  const finishedRows = rows.filter((o) => o.status === "Entregado");
  $("activeOrderCount").textContent = activeRows.length;
  $("finishedOrderCount").textContent = finishedRows.length;
  $("activeOrderList").innerHTML = activeRows.map(orderCard).join("") || empty("Sin ordenes activas en BD");
  $("finishedOrderList").innerHTML = finishedRows.map(orderCard).join("") || empty("Sin ordenes finalizadas en BD");
}

function orderCard(o) {
  const client = getClient(o.clientId);
  return card(`
    <strong>${escapeHtml(o.folio || o.id)} | ${escapeHtml(o.device || "")}</strong>
    <span>${escapeHtml(client?.name || "Sin cliente")} | ${escapeHtml(o.status || "")}</span>
    <small>Total ${money.format(Number(o.total || 0))} | Anticipo ${money.format(Number(o.deposit || 0))} | Saldo ${money.format(getBalance(o))}</small>
    <div class="record-actions">
      <button onclick="editOrder('${o.id}')" class="btn ghost">Modificar</button>
      <button onclick="quickStatus('${o.id}')" class="btn ghost">Estatus</button>
      <a class="btn ghost" target="_blank" rel="noreferrer" href="${client ? waUrl(client.phone, orderMessage(o)) : "#"}">WhatsApp</a>
      <button onclick="removeRecord('order','${o.id}')" class="btn danger">Eliminar</button>
    </div>`);
}

function renderPurchases() {
  const rows = active(state.purchases).filter((p) => matches([p.folio, p.part, p.status, getSupplier(p.supplierId)?.name]));
  $("purchaseCount").textContent = rows.length;
  $("purchaseList").innerHTML = rows.map((p) => {
    const supplier = getSupplier(p.supplierId);
    const order = state.orders.find((o) => o.id === p.orderId);
    return card(`
      <strong>${escapeHtml(p.folio || p.id)} | ${escapeHtml(p.part || "")}</strong>
      <span>${escapeHtml(supplier?.name || "Sin proveedor")} ${order ? "| " + escapeHtml(order.folio) : ""}</span>
      <small>${escapeHtml(p.status || "")} | ${Number(p.qty || 1)} pza. | ${money.format(Number(p.cost || 0))}</small>
      <div class="record-actions">
        <button onclick="editPurchase('${p.id}')" class="btn ghost">Editar</button>
        <button onclick="receivePurchase('${p.id}')" class="btn ghost">Recibido + inventario</button>
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

function renderSelectors() {
  $("orderClient").innerHTML = active(state.clients).map((c) => `<option value="${c.id}">${escapeHtml(c.name)} - ${escapeHtml(c.phone || "")}</option>`).join("");
  $("orderParts").innerHTML = active(state.inventory).map((i) => `<option value="${i.id}">${escapeHtml(displayItem(i))} (${Number(i.stock || 0)})</option>`).join("");
  $("purchaseSupplier").innerHTML = active(state.suppliers).map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  $("purchaseOrder").innerHTML = `<option value="">Sin orden</option>${active(state.orders).map((o) => `<option value="${o.id}">${escapeHtml(o.folio || o.id)} - ${escapeHtml(o.device || "")}</option>`).join("")}`;
  $("paymentOrder").innerHTML = active(state.orders).map((o) => `<option value="${o.id}">${escapeHtml(o.folio || o.id)} - ${escapeHtml(o.device || "")}</option>`).join("");
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
  const selectedParts = Array.from($("orderParts").selectedOptions).map((option) => option.value);
  const suppliedParts = selectedParts.map((partId) => {
    const item = state.inventory.find((i) => i.id === partId);
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
  await saveRecord("order", {
    id: $("orderId").value || id("ord"),
    folio: existing?.folio || nextOrderFolio(),
    clientId: $("orderClient").value,
    device: $("orderDevice").value.trim(),
    technician: $("orderTechnician").value.trim(),
    serial: $("orderSerial").value.trim(),
    status: $("orderStatus").value,
    total: Number($("orderTotal").value || 0),
    deposit: Number($("orderDeposit").value || 0),
    paid: Number($("orderDeposit").value || 0) >= Number($("orderTotal").value || 0),
    issue: $("orderIssue").value.trim(),
    notes: $("orderNotes").value.trim(),
    warrantyDays: Math.max(90, Number($("orderWarrantyDays").value || 90)),
    warrantyTerms: defaultWarrantyTerms(),
    trackingCode: existing?.trackingCode || randomCode(),
    statusHistory: updateHistory(existing, $("orderStatus").value),
    parts: selectedParts,
    suppliedParts: existing?.suppliedParts?.length ? existing.suppliedParts : suppliedParts,
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  });
  hideOrderForm();
  showAlert("Orden guardada en BD.", "ok");
}

async function savePurchase(event) {
  event.preventDefault();
  const existing = state.purchases.find((p) => p.id === $("purchaseId").value);
  const purchase = {
    id: $("purchaseId").value || id("pur"),
    folio: existing?.folio || nextPurchaseFolio(),
    supplierId: $("purchaseSupplier").value,
    orderId: $("purchaseOrder").value,
    part: $("purchasePart").value.trim(),
    qty: Math.max(1, Number($("purchaseQty").value || 1)),
    cost: Number($("purchaseCost").value || 0),
    items: [{ id: existing?.items?.[0]?.id || id("pitem"), part: $("purchasePart").value.trim(), qty: Math.max(1, Number($("purchaseQty").value || 1)), cost: Number($("purchaseCost").value || 0) }],
    status: $("purchaseStatus").value,
    notes: $("purchaseNotes").value.trim(),
    receivedAt: $("purchaseStatus").value === "Recibido" ? (existing?.receivedAt || now()) : "",
    receivedQuantities: $("purchaseStatus").value === "Recibido" ? { [existing?.items?.[0]?.id || "item"]: Math.max(1, Number($("purchaseQty").value || 1)) } : {},
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  };
  await saveRecord("purchase", purchase);
  if (purchase.status === "Recibido") await applyPurchaseToInventory(purchase);
  resetForm("purchase");
  showAlert("Compra guardada en BD.", "ok");
}

async function receivePurchase(purchaseId) {
  const purchase = state.purchases.find((p) => p.id === purchaseId);
  if (!purchase) return;
  const updated = { ...purchase, status: "Recibido", receivedAt: purchase.receivedAt || now(), updatedAt: now() };
  await saveRecord("purchase", updated);
  await applyPurchaseToInventory(updated);
  showAlert("Compra recibida e inventario actualizado.", "ok");
}

async function applyPurchaseToInventory(purchase) {
  const qty = Math.max(1, Number(purchase.qty || 1));
  const part = purchase.part || purchase.items?.[0]?.part || "Refaccion";
  const existing = active(state.inventory).find((i) => normalize(displayItem(i)) === normalize(part));
  const item = existing ? {
    ...existing,
    stock: Number(existing.stock || 0) + qty,
    cost: Number(purchase.cost || existing.cost || 0),
    subdealerPrice: calculateSubdealer(purchase.cost || existing.cost),
    updatedAt: now()
  } : {
    id: id("inv"),
    brand: "",
    model: part,
    name: part,
    category: "Refaccion recibida",
    stock: qty,
    min: 1,
    cost: Number(purchase.cost || 0),
    subdealerPrice: calculateSubdealer(purchase.cost),
    price: 0,
    createdAt: now(),
    updatedAt: now()
  };
  await saveRecord("inventory", item);
  await saveRecord("inventoryMovement", {
    id: id("mov"),
    itemId: item.id,
    itemName: displayItem(item),
    qty,
    type: "Entrada",
    detail: `Compra recibida ${purchase.folio}: ${part}`,
    refId: purchase.id,
    createdAt: now()
  });
  if (purchase.orderId) {
    const order = state.orders.find((o) => o.id === purchase.orderId);
    if (order) {
      const supplied = [...(order.suppliedParts || []), {
        id: id("sup"),
        inventoryId: item.id,
        purchaseId: purchase.id,
        part,
        qty,
        cost: Number(purchase.cost || 0),
        totalCost: Number(purchase.cost || 0) * qty,
        createdAt: now()
      }];
      await saveRecord("order", { ...order, parts: [...new Set([...(order.parts || []), item.id])], suppliedParts: supplied, updatedAt: now() });
    }
  }
}

async function savePayment(event) {
  event.preventDefault();
  const amount = Number($("paymentAmount").value || 0);
  const order = state.orders.find((o) => o.id === $("paymentOrder").value);
  await saveRecord("payment", {
    id: id("pay"),
    orderId: $("paymentOrder").value,
    amount,
    method: $("paymentMethod").value,
    reference: $("paymentReference").value.trim(),
    createdAt: now(),
    updatedAt: now()
  });
  if (order) {
    const paid = getPaid(order) + amount;
    await saveRecord("order", { ...order, deposit: paid, paid: paid >= Number(order.total || 0), updatedAt: now() });
  }
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
    theme: state.settings.theme || {}
  });
  showAlert("Configuracion guardada en BD.", "ok");
}

async function quickStatus(orderId) {
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) return;
  const next = prompt("Nuevo estatus", order.status || "Recibido");
  if (!next) return;
  const updated = {
    ...order,
    status: next,
    deposit: next === "Entregado" ? Number(order.total || 0) : order.deposit,
    paid: next === "Entregado" ? true : order.paid,
    statusHistory: updateHistory(order, next),
    updatedAt: now()
  };
  await saveRecord("order", updated);
  const client = getClient(order.clientId);
  if (client?.phone) window.open(waUrl(client.phone, orderMessage(updated)), "_blank", "noreferrer");
}

async function removeRecord(type, idValue) {
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
  $("purchaseStatus").value = p.status || "Cotizando";
  $("purchaseNotes").value = p.notes || "";
  showView("purchases");
}

function showOrderForm(order = null) {
  $("orderForm").classList.remove("hidden");
  $("orderFormTitle").textContent = order ? "Modificar orden" : "Nueva orden";
  $("orderId").value = order?.id || "";
  $("orderClient").value = order?.clientId || active(state.clients)[0]?.id || "";
  $("orderDevice").value = order?.device || "";
  $("orderTechnician").value = order?.technician || "";
  $("orderSerial").value = order?.serial || "";
  $("orderStatus").value = order?.status || "Recibido";
  $("orderTotal").value = Number(order?.total || 0);
  $("orderDeposit").value = Number(order?.deposit || 0);
  $("orderWarrantyDays").value = Math.max(90, Number(order?.warrantyDays || 90));
  $("orderIssue").value = order?.issue || "";
  $("orderNotes").value = order?.notes || "";
  Array.from($("orderParts").options).forEach((option) => option.selected = (order?.parts || []).includes(option.value));
  showView("orders");
}

function hideOrderForm() {
  $("orderForm").classList.add("hidden");
  resetForm("order");
}

function resetForm(kind) {
  const map = {
    client: "clientForm",
    supplier: "supplierForm",
    inventory: "inventoryForm",
    order: "orderForm",
    purchase: "purchaseForm",
    payment: "paymentForm"
  };
  const form = $(map[kind]);
  if (form) form.reset();
  ["clientId", "supplierId", "itemId", "orderId", "purchaseId"].forEach((idName) => { if ($(idName)) $(idName).value = ""; });
  $("itemStock").value = 1;
  $("itemMin").value = 1;
  $("itemSubdealer").value = "0.00";
}

function hydrateSettings() {
  $("businessName").value = state.settings.businessName || "";
  $("businessPhone").value = state.settings.businessPhone || "";
  $("businessAddress").value = state.settings.businessAddress || "";
  $("whatsappTemplate").value = state.settings.whatsappTemplate || "";
}

async function searchPortal(event) {
  event.preventDefault();
  const folio = $("portalFolio").value.trim().toLowerCase();
  const order = active(state.orders).find((o) => String(o.folio || "").toLowerCase() === folio);
  if (!order) {
    $("portalResult").innerHTML = empty("Orden no encontrada en BD");
    return;
  }
  const client = getClient(order.clientId);
  $("portalResult").innerHTML = `
    <div class="timeline-card">
      <h2>${escapeHtml(order.folio)} | ${escapeHtml(order.device)}</h2>
      <p>${escapeHtml(client?.name || "Cliente")} | ${escapeHtml(order.status || "")}</p>
      <div class="timeline">${orderStatuses.map((s) => `<span class="${orderStatuses.indexOf(s) <= orderStatuses.indexOf(order.status) ? "done" : ""}">${escapeHtml(s)}</span>`).join("")}</div>
    </div>`;
}

function active(rows) {
  return (rows || []).filter((row) => !row.archived);
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
  box.textContent = message;
  box.className = `alert ${type}`;
  box.classList.remove("hidden");
  setTimeout(() => box.classList.add("hidden"), 5500);
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
  return `Hola ${client?.name || ""}, tu equipo ${order.device || ""} con folio ${order.folio || ""} esta en estado: ${order.status || ""}.`;
}

function purchaseMessage(purchase) {
  return `Hola, solicito cotizacion y disponibilidad de ${purchase.part || ""}, ${purchase.qty || 1} pieza(s).`;
}

function defaultWarrantyTerms() {
  return "Garantia de 90 dias sobre la reparacion realizada y refacciones instaladas por PCFix. No cubre golpes, humedad, mal uso, software, virus, manipulacion de terceros ni fallas distintas a la diagnosticada.";
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

Object.assign(window, {
  editClient,
  editSupplier,
  editInventory,
  editOrder,
  editPurchase,
  removeRecord,
  quickStatus,
  receivePurchase
});

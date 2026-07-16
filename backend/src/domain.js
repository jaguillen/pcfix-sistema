export const REPAIR_PROGRESS_STATUSES = ["Recibido", "Diagnostico", "Esperando pieza", "En reparacion", "Listo", "Entregado"];
export const REQUIRED_QUALITY_KEYS = ["power", "charge", "display", "touch", "audio", "cameras", "biometrics", "connectivity"];

export function repairProgress(status) {
  const index = REPAIR_PROGRESS_STATUSES.indexOf(status);
  return index < 0 ? 0 : Math.round(((index + 1) / REPAIR_PROGRESS_STATUSES.length) * 100);
}

export function pendingQualityChecks(checklist = {}) {
  return REQUIRED_QUALITY_KEYS.filter((key) => !checklist[key] || checklist[key] === "No probado");
}

export function financialSummary(orders = [], warrantyCost = 0) {
  const active = orders.filter((order) => !order.archived && order.status !== "Cancelado");
  const delivered = active.filter((order) => order.status === "Entregado");
  const revenue = delivered.reduce((sum, order) => sum + number(order.total), 0);
  const partsCost = delivered.reduce((sum, order) => sum + number(order.partsCost), 0);
  const collected = active.reduce((sum, order) => sum + Math.min(number(order.total), number(order.deposit)), 0);
  const receivables = active.reduce((sum, order) => sum + Math.max(0, number(order.total) - number(order.deposit)), 0);
  const grossMargin = revenue - partsCost - number(warrantyCost);
  return {
    revenue,
    collected,
    receivables,
    partsCost,
    grossMargin,
    marginRate: revenue > 0 ? Math.round((grossMargin / revenue) * 100) : 0
  };
}

function number(value) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? result : 0;
}

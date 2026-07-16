import test from "node:test";
import assert from "node:assert/strict";
import { financialSummary, pendingQualityChecks, repairProgress } from "../src/domain.js";

test("seguimiento entregado llega exactamente a 100 por ciento", () => {
  assert.equal(repairProgress("Recibido"), 17);
  assert.equal(repairProgress("Listo"), 83);
  assert.equal(repairProgress("Entregado"), 100);
  assert.equal(repairProgress("Cancelado"), 0);
});

test("control final identifica pruebas pendientes", () => {
  const complete = {
    power: "Correcto", charge: "Correcto", display: "Correcto", touch: "Correcto",
    audio: "Correcto", cameras: "No aplica", biometrics: "Falla", connectivity: "Correcto"
  };
  assert.deepEqual(pendingQualityChecks(complete), []);
  assert.deepEqual(pendingQualityChecks({ ...complete, touch: "No probado" }), ["touch"]);
});

test("finanzas separan venta realizada cobro y cartera", () => {
  const summary = financialSummary([
    { status: "Entregado", total: 1000, deposit: 1000, partsCost: 300 },
    { status: "En reparacion", total: 800, deposit: 200, partsCost: 100 },
    { status: "Cancelado", total: 900, deposit: 0, partsCost: 50 }
  ], 50);
  assert.deepEqual(summary, {
    revenue: 1000,
    collected: 1200,
    receivables: 600,
    partsCost: 300,
    grossMargin: 650,
    marginRate: 65
  });
});

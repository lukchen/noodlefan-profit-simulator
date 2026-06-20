// NoodleFan 粉面王 — Profit Simulator logic
// All calculations run client-side. Inputs persist to localStorage so the
// scenario survives a page reload.

const FIELD_IDS = [
  "ordersPerDay", "daysPerWeek", "aov",
  "pctPickup", "commPickup",
  "pctDoorDash", "commDoorDash",
  "pctUberEats", "commUberEats",
  "pctGrubhub", "commGrubhub",
  "rent", "utilities",
  "foodCostPct",
  "packagingPerOrder",
  "numStaff", "hourlyWage", "hoursPerWeek",
  "marketingMonthly",
  "equipmentCost", "permitsCost", "initialInventoryCost", "smallwaresCost", "amortMonths"
];

const DEFAULTS = {};
const STORAGE_KEY = "noodlefan-profit-sim-v1";
const WEEKS_PER_MONTH = 52 / 12; // 4.333...

let breakdownChart = null;
let sensitivityChart = null;

function $(id) { return document.getElementById(id); }

function captureDefaults() {
  FIELD_IDS.forEach((id) => { DEFAULTS[id] = $(id).value; });
  DEFAULTS.includeStartup = $("includeStartup").checked;
}

function readInputs() {
  const v = {};
  FIELD_IDS.forEach((id) => { v[id] = parseFloat($(id).value) || 0; });
  v.includeStartup = $("includeStartup").checked;
  return v;
}

function saveToStorage(v) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)); } catch (e) { /* ignore */ }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

function applyValues(v) {
  FIELD_IDS.forEach((id) => {
    if (v[id] !== undefined) $(id).value = v[id];
  });
  if (v.includeStartup !== undefined) $("includeStartup").checked = v.includeStartup;
}

function fmtUSD(n) {
  const sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtPct(n) {
  return n.toFixed(1) + "%";
}

// Core P&L calculation given an override for orders/day (used for sensitivity curve).
function computePL(v, ordersPerDayOverride) {
  const ordersPerDay = ordersPerDayOverride !== undefined ? ordersPerDayOverride : v.ordersPerDay;
  const ordersPerMonth = ordersPerDay * v.daysPerWeek * WEEKS_PER_MONTH;
  const revenue = ordersPerMonth * v.aov;

  const pickupShare = v.pctPickup / 100;
  const ddShare = v.pctDoorDash / 100;
  const ueShare = v.pctUberEats / 100;
  const ghShare = v.pctGrubhub / 100;

  const platformFees =
    ordersPerMonth * v.aov * pickupShare * (v.commPickup / 100) +
    ordersPerMonth * v.aov * ddShare * (v.commDoorDash / 100) +
    ordersPerMonth * v.aov * ueShare * (v.commUberEats / 100) +
    ordersPerMonth * v.aov * ghShare * (v.commGrubhub / 100);

  const cogs = revenue * (v.foodCostPct / 100);
  const packaging = ordersPerMonth * v.packagingPerOrder;
  const labor = v.numStaff * v.hourlyWage * v.hoursPerWeek * WEEKS_PER_MONTH;
  const rentUtilities = v.rent + v.utilities;
  const marketing = v.marketingMonthly;

  const startupTotal = v.equipmentCost + v.permitsCost + v.initialInventoryCost + v.smallwaresCost;
  const startupMonthly = v.amortMonths > 0 ? startupTotal / v.amortMonths : 0;
  const startupInPL = v.includeStartup ? startupMonthly : 0;

  const totalCosts = cogs + platformFees + packaging + labor + rentUtilities + marketing + startupInPL;
  const netProfit = revenue - totalCosts;
  const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  return {
    ordersPerMonth, revenue, cogs, platformFees, packaging, labor,
    rentUtilities, marketing, startupMonthly, startupInPL, netProfit, margin,
    startupTotal,
  };
}

// Break-even orders/day: fixed costs / contribution margin per order.
function computeBreakEven(v) {
  const pickupShare = v.pctPickup / 100;
  const ddShare = v.pctDoorDash / 100;
  const ueShare = v.pctUberEats / 100;
  const ghShare = v.pctGrubhub / 100;

  const blendedFeePct =
    pickupShare * (v.commPickup / 100) +
    ddShare * (v.commDoorDash / 100) +
    ueShare * (v.commUberEats / 100) +
    ghShare * (v.commGrubhub / 100);

  const contributionPerOrder = v.aov * (1 - v.foodCostPct / 100 - blendedFeePct) - v.packagingPerOrder;

  const labor = v.numStaff * v.hourlyWage * v.hoursPerWeek * WEEKS_PER_MONTH;
  const startupTotal = v.equipmentCost + v.permitsCost + v.initialInventoryCost + v.smallwaresCost;
  const startupMonthly = v.amortMonths > 0 ? startupTotal / v.amortMonths : 0;
  const startupInPL = v.includeStartup ? startupMonthly : 0;
  const fixedCosts = v.rent + v.utilities + labor + v.marketingMonthly + startupInPL;

  if (contributionPerOrder <= 0) return Infinity;

  const breakEvenOrdersMonth = fixedCosts / contributionPerOrder;
  const breakEvenOrdersDay = breakEvenOrdersMonth / (v.daysPerWeek * WEEKS_PER_MONTH);
  return breakEvenOrdersDay;
}

function updateMixWarning(v) {
  const total = v.pctPickup + v.pctDoorDash + v.pctUberEats + v.pctGrubhub;
  $("mixTotal").textContent = total.toFixed(0);
  $("mixWarning").textContent = Math.abs(total - 100) > 0.5 ? window.NoodleI18N.t("mix.warning") : "";
}

function renderResults(pl, breakEvenDay) {
  $("out-revenue").textContent = fmtUSD(pl.revenue);
  $("out-cogs").textContent = "-" + fmtUSD(pl.cogs);
  $("out-platform").textContent = "-" + fmtUSD(pl.platformFees);
  $("out-packaging").textContent = "-" + fmtUSD(pl.packaging);
  $("out-labor").textContent = "-" + fmtUSD(pl.labor);
  $("out-rent").textContent = "-" + fmtUSD(pl.rentUtilities);
  $("out-marketing").textContent = "-" + fmtUSD(pl.marketing);
  $("out-startup").textContent = "-" + fmtUSD(pl.startupInPL);

  const netEl = $("out-netprofit");
  netEl.textContent = fmtUSD(pl.netProfit);
  netEl.classList.remove("positive", "negative");
  netEl.classList.add(pl.netProfit >= 0 ? "positive" : "negative");

  $("out-margin").textContent = fmtPct(pl.margin);
  $("out-orders").textContent = Math.round(pl.ordersPerMonth).toLocaleString();
  $("out-breakeven").textContent = isFinite(breakEvenDay) ? breakEvenDay.toFixed(1) : window.NoodleI18N.t("breakeven.never");
}

function renderBreakdownChart(pl) {
  const ctx = $("breakdownChart");
  const t = window.NoodleI18N.t;
  const data = {
    labels: [t("chart.cogs"), t("chart.platform"), t("chart.packaging"), t("chart.labor"), t("chart.rent"), t("chart.marketing"), t("chart.startup")],
    datasets: [{
      data: [pl.cogs, pl.platformFees, pl.packaging, pl.labor, pl.rentUtilities, pl.marketing, pl.startupInPL],
      backgroundColor: ["#e8a33d", "#c0392b", "#8d6e63", "#6d8b74", "#5b7c99", "#9b59b6", "#bdb2a7"],
    }],
  };
  if (breakdownChart) {
    breakdownChart.data = data;
    breakdownChart.update();
  } else {
    breakdownChart = new Chart(ctx, {
      type: "doughnut",
      data,
      options: { plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } } },
    });
  }
}

function renderSensitivityChart(v) {
  const ctx = $("sensitivityChart");
  const t = window.NoodleI18N.t;
  const baseOrders = v.ordersPerDay || 1;
  const points = [];
  const labels = [];
  for (let m = 0.4; m <= 1.6; m += 0.2) {
    const orders = Math.round(baseOrders * m);
    const pl = computePL(v, orders);
    labels.push(orders + t("chart.perDaySuffix"));
    points.push(Math.round(pl.netProfit));
  }
  const data = {
    labels,
    datasets: [{
      label: t("chart.sensitivityLabel"),
      data: points,
      borderColor: "#c0392b",
      backgroundColor: "rgba(192,57,43,0.12)",
      fill: true,
      tension: 0.25,
      pointRadius: 4,
    }],
  };
  if (sensitivityChart) {
    sensitivityChart.data = data;
    sensitivityChart.update();
  } else {
    sensitivityChart = new Chart(ctx, {
      type: "line",
      data,
      options: {
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (val) => "$" + val.toLocaleString() } } },
      },
    });
  }
}

function recalc() {
  const v = readInputs();
  updateMixWarning(v);
  const pl = computePL(v);
  const breakEvenDay = computeBreakEven(v);
  renderResults(pl, breakEvenDay);
  renderBreakdownChart(pl);
  renderSensitivityChart(v);
  saveToStorage(v);
}

function init() {
  window.NoodleI18N.applyToDOM();

  captureDefaults();
  const saved = loadFromStorage();
  if (saved) applyValues(saved);

  FIELD_IDS.forEach((id) => $(id).addEventListener("input", recalc));
  $("includeStartup").addEventListener("change", recalc);

  $("resetBtn").addEventListener("click", () => {
    applyValues(DEFAULTS);
    $("includeStartup").checked = true;
    recalc();
  });

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.NoodleI18N.setLanguage(btn.getAttribute("data-lang"));
      window.NoodleI18N.applyToDOM();
      recalc();
    });
  });

  recalc();
}

document.addEventListener("DOMContentLoaded", init);

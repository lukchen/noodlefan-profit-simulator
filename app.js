// NoodleFan 粉面王 — Profit Simulator logic

const FIELD_IDS = [
  "daysPerWeek",
  "dish1Price", "dish1Cost", "dish1Qty",
  "dish2Price", "dish2Cost", "dish2Qty",
  "dish3Price", "dish3Cost", "dish3Qty",
  "dish4Price", "dish4Cost", "dish4Qty",
  "dish5Price", "dish5Cost", "dish5Qty",
  "pctPickup", "commPickup",
  "pctDoorDash", "commDoorDash",
  "pctUberEats", "commUberEats",
  "pctGrubhub", "commGrubhub",
  "packagingPerOrder",
  "numStaff", "hourlyWage", "hoursPerWeek",
  "marketingMonthly",
  "rent", "utilities",
  "equipmentCost", "permitsCost", "otherPermitsCost", "initialInventoryCost", "smallwaresCost", "amortMonths",
  "taxRate", "sepIRAPct", "sec179",
];

const DEFAULTS = {};
const STORAGE_KEY = "noodlefan-profit-sim-v2";
const WEEKS_PER_MONTH = 52 / 12;

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

function getDishes(v) {
  return [
    { qty: v.dish1Qty, price: v.dish1Price, cost: v.dish1Cost },
    { qty: v.dish2Qty, price: v.dish2Price, cost: v.dish2Cost },
    { qty: v.dish3Qty, price: v.dish3Price, cost: v.dish3Cost },
    { qty: v.dish4Qty, price: v.dish4Price, cost: v.dish4Cost },
    { qty: v.dish5Qty, price: v.dish5Price, cost: v.dish5Cost },
  ];
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

// scaleOverride multiplies all dish quantities (used for sensitivity curve).
function computePL(v, scaleOverride) {
  const scale = scaleOverride !== undefined ? scaleOverride : 1.0;
  const dishes = getDishes(v);

  const ordersPerDay = dishes.reduce((s, d) => s + d.qty, 0) * scale;
  const ordersPerMonth = ordersPerDay * v.daysPerWeek * WEEKS_PER_MONTH;
  const dailyRevenue = dishes.reduce((s, d) => s + d.qty * d.price, 0);
  const dailyCogs    = dishes.reduce((s, d) => s + d.qty * d.cost,  0);
  const revenue = dailyRevenue * scale * v.daysPerWeek * WEEKS_PER_MONTH;
  const cogs    = dailyCogs    * scale * v.daysPerWeek * WEEKS_PER_MONTH;

  const pickupShare = v.pctPickup   / 100;
  const ddShare     = v.pctDoorDash / 100;
  const ueShare     = v.pctUberEats / 100;
  const ghShare     = v.pctGrubhub  / 100;

  const platformFees =
    revenue * pickupShare * (v.commPickup   / 100) +
    revenue * ddShare     * (v.commDoorDash / 100) +
    revenue * ueShare     * (v.commUberEats / 100) +
    revenue * ghShare     * (v.commGrubhub  / 100);

  const packaging    = ordersPerMonth * v.packagingPerOrder;
  const labor        = v.numStaff * v.hourlyWage * v.hoursPerWeek * WEEKS_PER_MONTH;
  const rentUtilities = v.rent + v.utilities;
  const marketing    = v.marketingMonthly;

  const startupTotal   = v.equipmentCost + v.permitsCost + v.otherPermitsCost + v.initialInventoryCost + v.smallwaresCost;
  const startupMonthly = v.amortMonths > 0 ? startupTotal / v.amortMonths : 0;
  const startupInPL    = v.includeStartup ? startupMonthly : 0;

  const totalCosts = cogs + platformFees + packaging + labor + rentUtilities + marketing + startupInPL;
  const netProfit  = revenue - totalCosts;
  const margin     = revenue > 0 ? (netProfit / revenue) * 100 : 0;

  const sepDeduction    = netProfit > 0 ? netProfit * (v.sepIRAPct / 100) : 0;
  const sec179Monthly   = (v.sec179 || 0) / 12;
  const totalDeductions = sepDeduction + sec179Monthly;
  const taxableIncome   = Math.max(0, netProfit - totalDeductions);
  const incomeTax       = taxableIncome * (v.taxRate / 100);
  const netProfitAfterTax = netProfit - incomeTax;

  return {
    ordersPerDay, ordersPerMonth, revenue, cogs, platformFees, packaging, labor,
    rentUtilities, marketing, startupMonthly, startupInPL, netProfit, margin,
    startupTotal, sepDeduction, sec179Monthly, taxableIncome, incomeTax, netProfitAfterTax,
  };
}

// Break-even: find the scale factor k at which profit = 0, return break-even orders/day.
function computeBreakEven(v) {
  const dishes       = getDishes(v);
  const ordersPerDay = dishes.reduce((s, d) => s + d.qty, 0);
  const dailyRevenue = dishes.reduce((s, d) => s + d.qty * d.price, 0);
  const dailyCogs    = dishes.reduce((s, d) => s + d.qty * d.cost,  0);

  const blendedFeePct =
    (v.pctPickup   / 100) * (v.commPickup   / 100) +
    (v.pctDoorDash / 100) * (v.commDoorDash / 100) +
    (v.pctUberEats / 100) * (v.commUberEats / 100) +
    (v.pctGrubhub  / 100) * (v.commGrubhub  / 100);

  const contributionPerScale =
    (dailyRevenue * (1 - blendedFeePct) - dailyCogs - v.packagingPerOrder * ordersPerDay)
    * v.daysPerWeek * WEEKS_PER_MONTH;

  const labor        = v.numStaff * v.hourlyWage * v.hoursPerWeek * WEEKS_PER_MONTH;
  const startupTotal = v.equipmentCost + v.permitsCost + v.otherPermitsCost + v.initialInventoryCost + v.smallwaresCost;
  const startupInPL  = v.includeStartup && v.amortMonths > 0 ? startupTotal / v.amortMonths : 0;
  const fixedCosts   = v.rent + v.utilities + labor + v.marketingMonthly + startupInPL;

  if (contributionPerScale <= 0) return Infinity;
  return ordersPerDay * (fixedCosts / contributionPerScale);
}

function updateMixWarning(v) {
  const total = v.pctPickup + v.pctDoorDash + v.pctUberEats + v.pctGrubhub;
  $("mixTotal").textContent = total.toFixed(0);
  $("mixWarning").textContent = Math.abs(total - 100) > 0.5 ? window.NoodleI18N.t("mix.warning") : "";
}

function renderMenuTotals(v) {
  const dishes       = getDishes(v);
  const totalQty     = dishes.reduce((s, d) => s + d.qty,           0);
  const totalRevenue = dishes.reduce((s, d) => s + d.qty * d.price, 0);
  const totalCogs    = dishes.reduce((s, d) => s + d.qty * d.cost,  0);
  const aov          = totalQty    > 0 ? totalRevenue / totalQty     : 0;
  const cogsPct      = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;

  $("menu-total-qty").textContent  = totalQty;
  $("menu-aov").textContent        = "$" + aov.toFixed(2);
  $("menu-cogs-pct").textContent   = cogsPct.toFixed(1) + "%";
}

function renderResults(pl, breakEvenDay) {
  $("out-revenue").textContent    = fmtUSD(pl.revenue);
  $("out-cogs").textContent       = "-" + fmtUSD(pl.cogs);
  $("out-platform").textContent   = "-" + fmtUSD(pl.platformFees);
  $("out-packaging").textContent  = "-" + fmtUSD(pl.packaging);
  $("out-labor").textContent      = "-" + fmtUSD(pl.labor);
  $("out-rent").textContent       = "-" + fmtUSD(pl.rentUtilities);
  $("out-marketing").textContent  = "-" + fmtUSD(pl.marketing);
  $("out-startup").textContent    = "-" + fmtUSD(pl.startupInPL);

  const netEl = $("out-netprofit");
  netEl.textContent = fmtUSD(pl.netProfit);
  netEl.classList.remove("positive", "negative");
  netEl.classList.add(pl.netProfit >= 0 ? "positive" : "negative");

  $("out-margin").textContent      = fmtPct(pl.margin);
  $("out-sep").textContent         = "-" + fmtUSD(pl.sepDeduction);
  $("out-sec179").textContent      = "-" + fmtUSD(pl.sec179Monthly);
  $("out-taxable").textContent     = fmtUSD(pl.taxableIncome);
  // Annotate tax row label with rate and calculation
  const taxLabelEl = $("out-tax").previousElementSibling;
  if (taxLabelEl) {
    const taxRate = parseFloat($("taxRate").value) || 0;
    const base = window.NoodleI18N.t("pl.tax");
    taxLabelEl.textContent = `${base}  (${fmtUSD(pl.taxableIncome)} × ${taxRate}%)`;
  }
  $("out-tax").textContent         = "-" + fmtUSD(pl.incomeTax);
  const afterTaxEl = $("out-netprofit-aftertax");
  afterTaxEl.textContent = fmtUSD(pl.netProfitAfterTax);
  afterTaxEl.classList.remove("positive", "negative");
  afterTaxEl.classList.add(pl.netProfitAfterTax >= 0 ? "positive" : "negative");
  $("out-orders").textContent    = Math.round(pl.ordersPerMonth).toLocaleString();
  $("out-breakeven").textContent = isFinite(breakEvenDay)
    ? breakEvenDay.toFixed(1)
    : window.NoodleI18N.t("breakeven.never");
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
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } },
      },
    });
  }
}

function renderSensitivityChart(v) {
  const ctx = $("sensitivityChart");
  const t = window.NoodleI18N.t;
  const dishes     = getDishes(v);
  const baseOrders = dishes.reduce((s, d) => s + d.qty, 0) || 1;
  const points = [];
  const labels = [];
  for (let m = 0.4; m <= 1.6; m += 0.2) {
    const pl = computePL(v, m);
    labels.push(Math.round(baseOrders * m) + t("chart.perDaySuffix"));
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
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false } },
        scales: { y: { ticks: { callback: (val) => "$" + val.toLocaleString() } } },
      },
    });
  }
}

function renderPlatformPrices(v) {
  const t = window.NoodleI18N.t;
  const dishes = getDishes(v);
  const dishKeys = ["sm.dish1","sm.dish2","sm.dish3","sm.dish4","sm.dish5"];

  // Update dish column headers (short: last Chinese segment)
  dishKeys.forEach((key, i) => {
    const el = $("pg-dish" + (i+1) + "-name");
    if (el) {
      const full = t(key);
      // Use Chinese portion if bilingual (after last space), else full
      const parts = full.split(" ");
      el.textContent = parts[parts.length - 1] || full;
    }
  });

  const channels = [
    { key: "pg.direct",        fee: v.commPickup   / 100, isCCfee: true  },
    { key: "channel.doordash", fee: v.commDoorDash / 100, isCCfee: false },
    { key: "channel.ubereats", fee: v.commUberEats / 100, isCCfee: false },
    { key: "channel.grubhub",  fee: v.commGrubhub  / 100, isCCfee: false },
  ];

  const tbody = $("priceGuideBody");
  tbody.innerHTML = "";

  channels.forEach(ch => {
    const tr = document.createElement("tr");
    const fmtFee = ch.isCCfee
      ? (ch.fee * 100).toFixed(1) + "% CC"
      : (ch.fee * 100).toFixed(0) + "%";
    // For direct (CC fee only), listed price = base price; you net = base*(1-ccfee)
    // For platforms, listed price = base/(1-fee) so you net = base
    const cells = [
      `<td class="pg-channel">${t(ch.key).split("(")[0].trim()}</td>`,
      `<td class="pg-fee">${fmtFee}</td>`,
    ];
    dishes.forEach(d => {
      if (d.price <= 0) {
        cells.push(`<td>—</td>`);
      } else if (ch.isCCfee) {
        cells.push(`<td>$${d.price.toFixed(2)}</td>`);
      } else {
        const listed = d.price / (1 - ch.fee);
        cells.push(`<td>$${listed.toFixed(2)}</td>`);
      }
    });
    tr.innerHTML = cells.join("");
    tbody.appendChild(tr);
  });
}

function recalc() {
  const v = readInputs();
  updateMixWarning(v);
  renderMenuTotals(v);
  const pl = computePL(v);
  const breakEvenDay = computeBreakEven(v);
  renderResults(pl, breakEvenDay);
  renderBreakdownChart(pl);
  renderSensitivityChart(v);
  renderPlatformPrices(v);
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

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      const isMobile = window.innerWidth <= 800;
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      if (tab === "results") {
        if (isMobile) {
          document.querySelector(".results").classList.add("mobile-results-active");
        }
      } else {
        document.querySelector(".results").classList.remove("mobile-results-active");
        const panel = $("tab-" + tab);
        if (panel) panel.classList.add("active");
      }
    });
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

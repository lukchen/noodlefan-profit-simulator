// NoodleFan 粉面王 — Profit Simulator logic

const FIELD_IDS = [
  "daysPerWeek",
  "pctPickup", "commPickup",
  "pctDoorDash", "commDoorDash",
  "pctUberEats", "commUberEats",
  "pctGrubhub", "commGrubhub",
  "packagingPerOrder",
  "numStaff", "hourlyWage", "hoursPerWeek",
  "marketingMonthly",
  "orderProcessingFee",
  "rent", "utilities",
  "permitsCost", "otherPermitsCost", "initialInventoryCost", "smallwaresCost", "firstMonthRentCredit", "amortMonths",
  "taxRate", "sepIRAPct", "sec179",
];

const DEFAULTS = {};
const STORAGE_KEY = "noodlefan-profit-sim-v11";
const WEEKS_PER_MONTH = 52 / 12;

// Menu has three dynamic categories: 主菜品 (mains), 饮料 (drinks), 配菜加料 (add-ons).
// Each item has a name, selling price, food cost, and daily order/unit count.
// Source of truth: Drive 菜品定价 sheet. 成本 incl. broth bone (2026-07-14).
// 2026-07-20: 炒粉调料实测 → 猪肉炒粉 2.42→1.76、牛肉炒粉 3.14→2.51 (梅花肉$2.63/牛肩胛$6.05).
// 2026-07-19: 牛腩份量 拉面/台牛 200→140g、牛肉泡粉 150→140g；面 拉面/台牛 150→160g。
const DEFAULT_MAINS = [
  { name: "江西精品猪肉炒粉", price: 14, cost: 1.76, qty: 10 },
  { name: "江西精品牛肉炒粉", price: 16, cost: 2.51, qty: 5  },
  { name: "江西三鲜泡粉",     price: 10, cost: 1.36, qty: 10 },
  { name: "江西牛肉泡粉",     price: 16, cost: 3.92, qty: 15 },
  { name: "天津黄汤牛肉拉面", price: 16, cost: 4.60, qty: 15 },
  { name: "台式牛肉面",       price: 16, cost: 3.54, qty: 5  },
  { name: "台式卤肉饭",       price: 14, cost: 2.29, qty: 8  },
];
const DEFAULT_DRINKS = [
  { name: "罐装可乐",       price: 2, cost: 0.68, qty: 5 },
  { name: "罐装Diet可乐",   price: 2, cost: 0.68, qty: 5 },
  { name: "罐装雪碧",       price: 2, cost: 0.68, qty: 3 },
  { name: "罐装芬达",       price: 2, cost: 0.87, qty: 3 },
];
// 配菜加料 (add-ons) — attach to a main order; NOT a separate order.
// price = direct/base; qty = attach units/day (attach-rate × applicable main orders).
// 2026-07-20 from 菜品定价 add-on section. 份量=各菜每份用量 (小油菜特例100g).
const DEFAULT_ADDONS = [
  { name: "加煎蛋",   price: 1.5, cost: 0.09, qty: 5 },
  { name: "加茶叶蛋", price: 1.5, cost: 0.10, qty: 5 },
  { name: "加小油菜", price: 2,   cost: 0.19, qty: 4 },
  { name: "加粉",     price: 2.5, cost: 0.50, qty: 3 },
  { name: "加面",     price: 3,   cost: 0.92, qty: 2 },
  { name: "加饭",     price: 2,   cost: 0.10, qty: 1 },
  { name: "加三鲜",   price: 2.5, cost: 0.14, qty: 1 },
  { name: "加猪肉丝", price: 3.5, cost: 0.58, qty: 1 },
  { name: "加牛肉丝", price: 5,   cost: 1.33, qty: 1 },
  { name: "加牛腩",   price: 6,   cost: 1.87, qty: 4 },
  { name: "加卤肉",   price: 5,   cost: 1.80, qty: 1 },
];

// Kitchen equipment is a dynamic list: each item has a name, unit price, and quantity.
const DEFAULT_EQUIPMENT = [
  { name: "独眼灶", price: 500, qty: 3 },
  { name: "六眼灶", price: 1300, qty: 1 },
  { name: "汤锅",   price: 200, qty: 3 },
  { name: "炒锅",   price: 100, qty: 1 },
  { name: "浇头煮锅", price: 60,  qty: 4 },
  { name: "冷鲜冰箱", price: 2000, qty: 1 },
  { name: "冷藏冰箱", price: 1900, qty: 1 },
];

// Food-cost split by 采购清单 category (monthly procurement $, priced items only).
// STATIC — synced manually from the 采购清单 主表 SUMIF-by-类别 (2026-07-19).
// NOTE: different basis than the order-based COGS above.
const FOOD_COST_BY_CATEGORY = [
  { key: "cat.meat",   value: 4894 },
  { key: "cat.staple", value: 1543 },
  { key: "cat.sauce",  value: 843 },
  { key: "cat.spice",  value: 244 },
  { key: "cat.drink",  value: 330 },
  { key: "cat.veg",    value: 321 },
  { key: "cat.dry",    value: 243 },
];

let breakdownChart = null;
let sensitivityChart = null;
let foodCostChart = null;

function $(id) { return document.getElementById(id); }

function escHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function captureDefaults() {
  FIELD_IDS.forEach((id) => { DEFAULTS[id] = $(id).value; });
  DEFAULTS.includeStartup = $("includeStartup").checked;
}

function readInputs() {
  const v = {};
  FIELD_IDS.forEach((id) => { v[id] = parseFloat($(id).value) || 0; });
  v.includeStartup = $("includeStartup").checked;
  v.mains  = readMenu("menuBody");
  v.drinks = readMenu("drinkBody");
  v.addons = readMenu("addonBody");
  // All items contribute revenue & food cost. Drinks + add-ons are attach-only
  // (they ride on a main order — they do NOT count as separate orders).
  v.menu   = v.mains.concat(v.drinks, v.addons);
  v.attach = v.drinks.concat(v.addons);
  v.equipment = readEquipment();
  v.equipmentCost = equipmentTotal(v.equipment);
  return v;
}

// Revenue / COGS / platform prices operate on ALL items (mains + drinks + add-ons).
function getDishes(v) {
  return v.menu;
}
// Order COUNT (packaging, order metric, break-even) = main dishes only.
function mainQty(v) {
  return v.mains.reduce((s, d) => s + d.qty, 0);
}

// ── Menu lists (mains + drinks + add-ons share the same row shape) ──
function readMenu(bodyId) {
  const list = [];
  const body = $(bodyId);
  if (!body) return list;
  body.querySelectorAll(".menu-row").forEach((row) => {
    list.push({
      name:  row.querySelector(".dish-name").value,
      price: parseFloat(row.querySelector(".dish-price").value) || 0,
      cost:  parseFloat(row.querySelector(".dish-cost").value)  || 0,
      qty:   parseFloat(row.querySelector(".dish-qty").value)   || 0,
    });
  });
  return list;
}

function makeMenuRow(dish) {
  const row = document.createElement("tr");
  row.className = "menu-row";
  row.innerHTML =
    `<td><input class="dish-name" type="text" value="" /></td>` +
    `<td><input class="dish-price" type="number" min="0" step="0.5" value="0" /></td>` +
    `<td><input class="dish-cost" type="number" min="0" step="0.5" value="0" /></td>` +
    `<td><input class="dish-qty" type="number" min="0" step="1" value="0" /></td>` +
    `<td class="menu-remove-cell"><button type="button" class="dish-remove" aria-label="remove">×</button></td>`;
  row.querySelector(".dish-name").value  = dish.name;
  row.querySelector(".dish-price").value = dish.price;
  row.querySelector(".dish-cost").value  = dish.cost;
  row.querySelector(".dish-qty").value   = dish.qty;
  row.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", recalc));
  row.querySelector(".dish-remove").addEventListener("click", () => { row.remove(); recalc(); });
  return row;
}

function renderMenu(bodyId, list) {
  const body = $(bodyId);
  body.innerHTML = "";
  list.forEach((dish) => body.appendChild(makeMenuRow(dish)));
}

// ── Equipment list ──
function readEquipment() {
  const list = [];
  document.querySelectorAll("#equipmentList .equipment-row").forEach((row) => {
    list.push({
      name:  row.querySelector(".eq-name").value,
      price: parseFloat(row.querySelector(".eq-price").value) || 0,
      qty:   parseFloat(row.querySelector(".eq-qty").value)   || 0,
    });
  });
  return list;
}

function equipmentTotal(list) {
  return list.reduce((s, item) => s + item.price * item.qty, 0);
}

function makeEquipmentRow(item) {
  const row = document.createElement("div");
  row.className = "equipment-row";
  row.innerHTML =
    `<input class="eq-name" type="text" value="" />` +
    `<input class="eq-price" type="number" min="0" step="10" value="0" />` +
    `<span class="eq-x">×</span>` +
    `<input class="eq-qty" type="number" min="0" step="1" value="0" />` +
    `<button type="button" class="eq-remove" aria-label="remove">×</button>`;
  row.querySelector(".eq-name").value  = item.name;
  row.querySelector(".eq-price").value = item.price;
  row.querySelector(".eq-qty").value   = item.qty;
  row.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", recalc));
  row.querySelector(".eq-remove").addEventListener("click", () => { row.remove(); recalc(); });
  return row;
}

function renderEquipment(list) {
  const container = $("equipmentList");
  container.innerHTML = "";
  list.forEach((item) => container.appendChild(makeEquipmentRow(item)));
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

// scaleOverride multiplies all quantities (used for sensitivity curve).
function computePL(v, scaleOverride) {
  const scale = scaleOverride !== undefined ? scaleOverride : 1.0;
  const dishes = getDishes(v);

  // "Orders" = main-dish orders only. Drinks + add-ons attach to those orders.
  const ordersPerDay   = mainQty(v) * scale;
  const ordersPerMonth = ordersPerDay * v.daysPerWeek * WEEKS_PER_MONTH;
  const mainOrdersPerMonth = ordersPerMonth; // packaging basis (main orders)

  // Revenue & COGS include mains + drinks + add-ons.
  const dailyRevenue = dishes.reduce((s, d) => s + d.qty * d.price, 0);
  const dailyCogs    = dishes.reduce((s, d) => s + d.qty * d.cost,  0);
  const revenue = dailyRevenue * scale * v.daysPerWeek * WEEKS_PER_MONTH;
  const cogs    = dailyCogs    * scale * v.daysPerWeek * WEEKS_PER_MONTH;

  const pickupShare = v.pctPickup   / 100;
  const ddShare     = v.pctDoorDash / 100;
  const ueShare     = v.pctUberEats / 100;
  const ghShare     = v.pctGrubhub  / 100;

  // Platforms commission the whole ticket (incl. attached drinks/add-ons).
  const platformFees =
    revenue * pickupShare * (v.commPickup   / 100) +
    revenue * ddShare     * (v.commDoorDash / 100) +
    revenue * ueShare     * (v.commUberEats / 100) +
    revenue * ghShare     * (v.commGrubhub  / 100);

  const packaging    = mainOrdersPerMonth * v.packagingPerOrder;
  const labor        = v.numStaff * v.hourlyWage * v.hoursPerWeek * WEEKS_PER_MONTH;
  const rentUtilities = v.rent + v.utilities;
  const marketing    = v.marketingMonthly;
  const orderFee     = v.orderProcessingFee;

  const startupTotal   = v.equipmentCost + v.permitsCost + v.otherPermitsCost + v.initialInventoryCost + v.smallwaresCost - v.firstMonthRentCredit;
  const startupMonthly = v.amortMonths > 0 ? startupTotal / v.amortMonths : 0;
  const startupInPL    = v.includeStartup ? startupMonthly : 0;

  const totalCosts = cogs + platformFees + packaging + labor + rentUtilities + marketing + orderFee + startupInPL;
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
    rentUtilities, marketing, orderFee, startupMonthly, startupInPL, netProfit, margin,
    startupTotal, sepDeduction, sec179Monthly, taxableIncome, incomeTax, netProfitAfterTax,
  };
}

// Break-even: scale factor k where profit = 0 → break-even MAIN orders/day.
function computeBreakEven(v) {
  const dishes           = getDishes(v);
  const mainOrdersPerDay = mainQty(v);
  const dailyRevenue     = dishes.reduce((s, d) => s + d.qty * d.price, 0);
  const dailyCogs        = dishes.reduce((s, d) => s + d.qty * d.cost,  0);

  const blendedFeePct =
    (v.pctPickup   / 100) * (v.commPickup   / 100) +
    (v.pctDoorDash / 100) * (v.commDoorDash / 100) +
    (v.pctUberEats / 100) * (v.commUberEats / 100) +
    (v.pctGrubhub  / 100) * (v.commGrubhub  / 100);

  const contributionPerScale =
    (dailyRevenue * (1 - blendedFeePct) - dailyCogs - v.packagingPerOrder * mainOrdersPerDay)
    * v.daysPerWeek * WEEKS_PER_MONTH;

  const labor        = v.numStaff * v.hourlyWage * v.hoursPerWeek * WEEKS_PER_MONTH;
  const startupTotal = v.equipmentCost + v.permitsCost + v.otherPermitsCost + v.initialInventoryCost + v.smallwaresCost - v.firstMonthRentCredit;
  const startupInPL  = v.includeStartup && v.amortMonths > 0 ? startupTotal / v.amortMonths : 0;
  const fixedCosts   = v.rent + v.utilities + labor + v.marketingMonthly + v.orderProcessingFee + startupInPL;

  if (contributionPerScale <= 0) return Infinity;
  return mainOrdersPerDay * (fixedCosts / contributionPerScale);
}

function updateMixWarning(v) {
  const total = v.pctPickup + v.pctDoorDash + v.pctUberEats + v.pctGrubhub;
  $("mixTotal").textContent = total.toFixed(0);
  $("mixWarning").textContent = Math.abs(total - 100) > 0.5 ? window.NoodleI18N.t("mix.warning") : "";
}

// Blended stats per category so categories don't skew each other's AOV / food-cost %.
function renderCategoryTotals(dishes, qtyId, aovId, cogsId) {
  const totalQty     = dishes.reduce((s, d) => s + d.qty,           0);
  const totalRevenue = dishes.reduce((s, d) => s + d.qty * d.price, 0);
  const totalCogs    = dishes.reduce((s, d) => s + d.qty * d.cost,  0);
  const aov          = totalQty    > 0 ? totalRevenue / totalQty     : 0;
  const cogsPct      = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;

  if ($(qtyId))  $(qtyId).textContent  = totalQty;
  if ($(aovId))  $(aovId).textContent  = "$" + aov.toFixed(2);
  if ($(cogsId)) $(cogsId).textContent = cogsPct.toFixed(1) + "%";
}

function renderMenuTotals(v) {
  renderCategoryTotals(v.mains,  "menu-total-qty",  "menu-aov",  "menu-cogs-pct");
  renderCategoryTotals(v.drinks, "drink-total-qty", "drink-aov", "drink-cogs-pct");
  renderCategoryTotals(v.addons, "addon-total-qty", "addon-aov", "addon-cogs-pct");
}

function renderResults(pl, breakEvenDay) {
  $("out-revenue").textContent    = fmtUSD(pl.revenue);
  $("out-cogs").textContent       = "-" + fmtUSD(pl.cogs);
  $("out-platform").textContent   = "-" + fmtUSD(pl.platformFees);
  $("out-packaging").textContent  = "-" + fmtUSD(pl.packaging);
  $("out-labor").textContent      = "-" + fmtUSD(pl.labor);
  $("out-rent").textContent       = "-" + fmtUSD(pl.rentUtilities);
  $("out-marketing").textContent  = "-" + fmtUSD(pl.marketing);
  $("out-orderfee").textContent   = "-" + fmtUSD(pl.orderFee);
  $("out-startup").textContent    = "-" + fmtUSD(pl.startupInPL);

  const netEl = $("out-netprofit");
  netEl.textContent = fmtUSD(pl.netProfit);
  netEl.classList.remove("positive", "negative");
  netEl.classList.add(pl.netProfit >= 0 ? "positive" : "negative");

  $("out-margin").textContent      = fmtPct(pl.margin);
  $("out-sep").textContent         = "-" + fmtUSD(pl.sepDeduction);
  $("out-sec179").textContent      = "-" + fmtUSD(pl.sec179Monthly);
  $("out-taxable").textContent     = fmtUSD(pl.taxableIncome);
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
    labels: [t("chart.cogs"), t("chart.platform"), t("chart.packaging"), t("chart.labor"), t("chart.rent"), t("chart.marketing"), t("chart.orderfee"), t("chart.startup")],
    datasets: [{
      data: [pl.cogs, pl.platformFees, pl.packaging, pl.labor, pl.rentUtilities, pl.marketing, pl.orderFee, pl.startupInPL],
      backgroundColor: ["#e8a33d", "#c0392b", "#8d6e63", "#6d8b74", "#5b7c99", "#9b59b6", "#16a085", "#bdb2a7"],
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

function renderFoodCostChart() {
  const ctx = $("foodCostChart");
  if (!ctx) return;
  const t = window.NoodleI18N.t;
  const data = {
    labels: FOOD_COST_BY_CATEGORY.map((c) => t(c.key)),
    datasets: [{
      data: FOOD_COST_BY_CATEGORY.map((c) => c.value),
      backgroundColor: ["#c0392b", "#e8a33d", "#9b59b6", "#5b7c99", "#16a085", "#6d8b74", "#bdb2a7"],
    }],
  };
  if (foodCostChart) {
    foodCostChart.data = data;
    foodCostChart.update();
  } else {
    foodCostChart = new Chart(ctx, {
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
  const baseOrders = mainQty(v) || 1;
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

// Platform Price Guide — dishes/add-ons are ROWS, platforms are FIXED columns.
// 堂食/direct column shows the base price; each platform column shows base ÷ (1 − fee).
function renderPlatformPrices(v) {
  const t = window.NoodleI18N.t;
  const dishes = getDishes(v);

  const channels = [
    { key: "pg.direct",        fee: v.commPickup   / 100, isCCfee: true  },
    { key: "channel.grubhub",  fee: v.commGrubhub  / 100, isCCfee: false },
    { key: "channel.ubereats", fee: v.commUberEats / 100, isCCfee: false },
    { key: "channel.doordash", fee: v.commDoorDash / 100, isCCfee: false },
  ];

  const headCells = [`<th class="pg-dish-head">${escHtml(t("sm.col.dish"))}</th>`];
  channels.forEach((ch) => {
    const feeLabel = ch.isCCfee
      ? (ch.fee * 100).toFixed(1) + "% CC"
      : (ch.fee * 100).toFixed(0) + "%";
    headCells.push(
      `<th class="pg-plat-head">${escHtml(t(ch.key).split("(")[0].trim())}` +
      `<span class="pg-fee-sub">${feeLabel}</span></th>`
    );
  });
  $("priceGuideHead").innerHTML = `<tr>${headCells.join("")}</tr>`;

  const tbody = $("priceGuideBody");
  tbody.innerHTML = "";
  dishes.forEach((d) => {
    const cells = [`<td class="pg-dish-name">${escHtml(d.name) || "—"}</td>`];
    channels.forEach((ch) => {
      if (d.price <= 0) {
        cells.push(`<td>—</td>`);
      } else if (ch.isCCfee) {
        cells.push(`<td>$${d.price.toFixed(2)}</td>`);
      } else {
        cells.push(`<td>$${(d.price / (1 - ch.fee)).toFixed(2)}</td>`);
      }
    });
    const tr = document.createElement("tr");
    tr.innerHTML = cells.join("");
    tbody.appendChild(tr);
  });
}

function recalc() {
  const v = readInputs();
  $("equipmentTotal").textContent = fmtUSD(v.equipmentCost);
  updateMixWarning(v);
  renderMenuTotals(v);
  const pl = computePL(v);
  const breakEvenDay = computeBreakEven(v);
  renderResults(pl, breakEvenDay);
  renderBreakdownChart(pl);
  renderFoodCostChart();
  renderSensitivityChart(v);
  renderPlatformPrices(v);
  saveToStorage(v);
}

function init() {
  window.NoodleI18N.applyToDOM();

  captureDefaults();
  const saved = loadFromStorage();
  renderMenu("menuBody",  saved && Array.isArray(saved.mains)  ? saved.mains  : DEFAULT_MAINS);
  renderMenu("drinkBody", saved && Array.isArray(saved.drinks) ? saved.drinks : DEFAULT_DRINKS);
  renderMenu("addonBody", saved && Array.isArray(saved.addons) ? saved.addons : DEFAULT_ADDONS);
  renderEquipment(saved && Array.isArray(saved.equipment) ? saved.equipment : DEFAULT_EQUIPMENT);
  if (saved) applyValues(saved);

  FIELD_IDS.forEach((id) => $(id).addEventListener("input", recalc));
  $("includeStartup").addEventListener("change", recalc);

  $("addDishBtn").addEventListener("click", () => {
    $("menuBody").appendChild(makeMenuRow({ name: "", price: 0, cost: 0, qty: 0 }));
    recalc();
  });

  $("addDrinkBtn").addEventListener("click", () => {
    $("drinkBody").appendChild(makeMenuRow({ name: "", price: 0, cost: 0, qty: 0 }));
    recalc();
  });

  const addAddonBtn = $("addAddonBtn");
  if (addAddonBtn) addAddonBtn.addEventListener("click", () => {
    $("addonBody").appendChild(makeMenuRow({ name: "", price: 0, cost: 0, qty: 0 }));
    recalc();
  });

  $("addEquipmentBtn").addEventListener("click", () => {
    $("equipmentList").appendChild(makeEquipmentRow({ name: "", price: 0, qty: 1 }));
    recalc();
  });

  $("resetBtn").addEventListener("click", () => {
    applyValues(DEFAULTS);
    renderMenu("menuBody",  DEFAULT_MAINS);
    renderMenu("drinkBody", DEFAULT_DRINKS);
    renderMenu("addonBody", DEFAULT_ADDONS);
    renderEquipment(DEFAULT_EQUIPMENT);
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

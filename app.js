// NoodleFan 粉面王 — Profit Simulator logic

const FIELD_IDS = [
  "daysPerWeek",
  "pctPickup", "commPickup",
  "pctFantuan", "commFantuan",
  "pctUberEats", "commUberEats",
  "pctDoorDash", "commDoorDash",
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
const STORAGE_KEY = "noodlefan-profit-sim-v26";
const WEEKS_PER_MONTH = 52 / 12;

// 阶梯式平台定价 (2026-07-20 Eli): 每道菜直接带可编辑价格 —
//   price = 直营(pickup/自取)，pG = 饭团，pU = Uber，pD = DoorDash，pGH = Grubhub(默认=pD)。
// 平台单不把手续费全额转嫁给客人；各平台价在菜单表里直接编辑。
// P&L 按渠道占比加权：平台单收各自平台价、再扣该渠道手续费 → 真实反映部分转嫁后的净收入。
// Source of truth: Drive 菜品定价 sheet (菜名/直营/饭团/uber/doordash/grubhub/成本/每日订单)。
// 注: 炒粉只用猪肉(2026-07-22 Eli 定,取消牛肉选项/牛肉丝);全部炒粉单量归到这一行。
// 注: 牛腩/五花/梅花 2026-07-27 改用 US Foods 便宜价($5.31/$3.46/$2.02),相关菜品 cost 已下调。
const DEFAULT_MAINS = [
  { name: "招牌江西炒粉 Jiangxi Signature Fried Rice Noodle", price: 14.99, pG: 15.99, pU: 16.99, pD: 17.99, pGH: 17.99, cost: 1.69, qty: 12 },
  { name: "江西三鲜泡粉 Jiangxi Garden Mushroom Rice Noodle Soup",     price: 9.99,  pG: 10.99, pU: 11.99, pD: 12.99, pGH: 12.99, cost: 1.40, qty: 8 },
  { name: "江西牛肉泡粉 Jiangxi Spicy Beef Rice Noodle Soup",     price: 16.99, pG: 17.99, pU: 18.99, pD: 19.99, pGH: 19.99, cost: 3.73, qty: 10 },
  { name: "天津黄汤牛肉拉面 Golden Soup Beef Noodle", price: 16.99, pG: 17.99, pU: 18.99, pD: 19.99, pGH: 19.99, cost: 4.37, qty: 12 },
  { name: "台式牛肉面 Taiwanese Beef Noodle",       price: 16.99, pG: 17.99, pU: 18.99, pD: 19.99, pGH: 19.99, cost: 3.31, qty: 5  },
  { name: "台北夜市卤肉饭 Taiwanese Braised Pork Rice Bowl",       price: 14.99, pG: 15.99, pU: 16.99, pD: 17.99, pGH: 17.99, cost: 1.91, qty: 8  },
];
// 小菜和饮料 — attach-only。平价（各平台同价）。
const DEFAULT_DRINKS = [
  { name: "葱油煎蛋 Scallion Oil Fried Egg",     price: 2.5, pG: 2.5, pU: 2.5, pD: 2.5, pGH: 2.5, cost: 0.09, qty: 5 },
  { name: "茶叶蛋 Tea Egg",       price: 2,   pG: 2,   pU: 2,   pD: 2,   pGH: 2,   cost: 0.10, qty: 5 },
  { name: "可乐 Coke",     price: 2.5, pG: 2.5, pU: 2.5, pD: 2.5, pGH: 2.5, cost: 0.68, qty: 5 },
  { name: "Diet可乐 Diet Coke", price: 2.5, pG: 2.5, pU: 2.5, pD: 2.5, pGH: 2.5, cost: 0.68, qty: 5 },
  { name: "雪碧 Sprite",     price: 2.5, pG: 2.5, pU: 2.5, pD: 2.5, pGH: 2.5, cost: 0.68, qty: 3 },
  { name: "芬达 Fanta",     price: 2.5, pG: 2.5, pU: 2.5, pD: 2.5, pGH: 2.5, cost: 0.87, qty: 3 },
];
// 加料 — attach-only。中价加料平台 +$0.5，贵价加料平价。(加小油菜 2026-07-20 删；加牛肉丝 2026-07-22 删,炒粉不再有牛肉)
const DEFAULT_ADDONS = [
  { name: "加粉 Extra Rice Noodles",     price: 2,   pG: 2.5, pU: 2.5, pD: 2.5, pGH: 2.5, cost: 0.50, qty: 3 },
  { name: "加面 Extra Noodles",     price: 3,   pG: 3.5, pU: 3.5, pD: 3.5, pGH: 3.5, cost: 0.92, qty: 2 },
  { name: "加饭 Extra Rice",     price: 2,   pG: 2.5, pU: 2.5, pD: 2.5, pGH: 2.5, cost: 0.10, qty: 1 },
  { name: "加三鲜 Extra Garden Mushroom",   price: 2,   pG: 2.5, pU: 2.5, pD: 2.5, pGH: 2.5, cost: 0.14, qty: 1 },
  { name: "加猪肉丝 Extra Shredded Pork", price: 3,   pG: 3.5, pU: 3.5, pD: 3.5, pGH: 3.5, cost: 0.45, qty: 1 },
  { name: "加牛腩 Extra Beef Brisket",   price: 4.9, pG: 4.9, pU: 4.9, pD: 4.9, pGH: 4.9, cost: 1.64, qty: 4 },
  { name: "加卤肉 Extra Braised Pork",   price: 4.9, pG: 4.9, pU: 4.9, pD: 4.9, pGH: 4.9, cost: 1.42, qty: 1 },
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
// STATIC — synced manually from the 采购清单 主表 SUMIF-by-类别.
const FOOD_COST_BY_CATEGORY = [
  { key: "cat.meat",   value: 4312 },
  { key: "cat.staple", value: 1609 },
  { key: "cat.sauce",  value: 843 },
  { key: "cat.spice",  value: 254 },
  { key: "cat.drink",  value: 330 },
  { key: "cat.veg",    value: 448 },
  { key: "cat.dry",    value: 259 },
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
  // All items contribute revenue & food cost. Sides/drinks + add-ons are attach-only
  // (they ride on a main order — they do NOT count as separate orders).
  v.menu   = v.mains.concat(v.drinks, v.addons);
  v.attach = v.drinks.concat(v.addons);
  v.equipment = readEquipment();
  v.equipmentCost = equipmentTotal(v.equipment);
  return v;
}

// Revenue / COGS operate on ALL items (mains + sides/drinks + add-ons).
function getDishes(v) {
  return v.menu;
}
// Order COUNT (packaging, order metric, break-even) = main dishes only.
function mainQty(v) {
  return v.mains.reduce((s, d) => s + d.qty, 0);
}

// Daily revenue / platform fees / cogs, channel-weighted with each dish's per-platform prices.
// 平台单按各自平台价收钱，手续费按各渠道费率算在该平台价上。
function dailyTotals(v) {
  const dishes = getDishes(v);
  // 渠道: 自取 Pickup(直营价) / 饭团 Fantuan(pG) / Uber(pU) / DoorDash(pD) / Grubhub(pGH, 默认=pD 可单独改)。
  const sP = v.pctPickup / 100, sF = v.pctFantuan / 100, sU = v.pctUberEats / 100, sD = v.pctDoorDash / 100, sGH = v.pctGrubhub / 100;
  const fP = v.commPickup / 100, fF = v.commFantuan / 100, fU = v.commUberEats / 100, fD = v.commDoorDash / 100, fGH = v.commGrubhub / 100;
  let revenue = 0, fees = 0, cogs = 0;
  dishes.forEach((d) => {
    const pP = d.price, pG = d.pG, pU = d.pU, pD = d.pD, pGH = d.pGH;
    const eff    = sP * pP        + sF * pG        + sU * pU        + sD * pD        + sGH * pGH;
    const effFee = sP * pP * fP   + sF * pG * fF   + sU * pU * fU   + sD * pD * fD   + sGH * pGH * fGH;
    revenue += d.qty * eff;
    fees    += d.qty * effFee;
    cogs    += d.qty * d.cost;
  });
  return { revenue, fees, cogs };
}

// ── Menu lists (mains + drinks + add-ons share the same row shape) ──
function readMenu(bodyId) {
  const list = [];
  const body = $(bodyId);
  if (!body) return list;
  body.querySelectorAll(".menu-row").forEach((row) => {
    const num = (sel) => parseFloat(row.querySelector(sel).value) || 0;
    list.push({
      name:  row.querySelector(".dish-name").value,
      price: num(".dish-price"),
      pG:    num(".dish-pg"),
      pU:    num(".dish-pu"),
      pD:    num(".dish-pd"),
      pGH:   num(".dish-pgh"),
      cost:  num(".dish-cost"),
      qty:   num(".dish-qty"),
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
    `<td><input class="dish-pg" type="number" min="0" step="0.5" value="0" /></td>` +
    `<td><input class="dish-pu" type="number" min="0" step="0.5" value="0" /></td>` +
    `<td><input class="dish-pd" type="number" min="0" step="0.5" value="0" /></td>` +
    `<td><input class="dish-pgh" type="number" min="0" step="0.5" value="0" /></td>` +
    `<td><input class="dish-cost" type="number" min="0" step="0.5" value="0" /></td>` +
    `<td><input class="dish-qty" type="number" min="0" step="1" value="0" /></td>` +
    `<td class="menu-remove-cell"><button type="button" class="dish-remove" aria-label="remove">×</button></td>`;
  row.querySelector(".dish-name").value  = dish.name;
  row.querySelector(".dish-price").value = dish.price;
  row.querySelector(".dish-pg").value    = dish.pG !== undefined ? dish.pG : dish.price;
  row.querySelector(".dish-pu").value    = dish.pU !== undefined ? dish.pU : dish.price;
  row.querySelector(".dish-pd").value    = dish.pD !== undefined ? dish.pD : dish.price;
  row.querySelector(".dish-pgh").value   = dish.pGH !== undefined ? dish.pGH : (dish.pD !== undefined ? dish.pD : dish.price);
  row.querySelector(".dish-cost").value  = dish.cost;
  row.querySelector(".dish-qty").value   = dish.qty;
  row.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", recalc));
  row.querySelector(".dish-remove").addEventListener("click", () => { row.remove(); recalc(); });
  return row;
}

function renderMenu(bodyId, list) {
  const body = $(bodyId);
  if (!body) return;
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

  // "Orders" = main-dish orders only. Sides/drinks + add-ons attach to those orders.
  const ordersPerDay   = mainQty(v) * scale;
  const ordersPerMonth = ordersPerDay * v.daysPerWeek * WEEKS_PER_MONTH;
  const mainOrdersPerMonth = ordersPerMonth; // packaging basis (main orders)

  // Channel-weighted daily revenue / platform fees / cogs (per-platform pricing).
  const dt = dailyTotals(v);
  const revenue      = dt.revenue * scale * v.daysPerWeek * WEEKS_PER_MONTH;
  const cogs         = dt.cogs    * scale * v.daysPerWeek * WEEKS_PER_MONTH;
  const platformFees = dt.fees    * scale * v.daysPerWeek * WEEKS_PER_MONTH;

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
  const mainOrdersPerDay = mainQty(v);
  const dt = dailyTotals(v);

  const contributionPerScale =
    (dt.revenue - dt.fees - dt.cogs - v.packagingPerOrder * mainOrdersPerDay)
    * v.daysPerWeek * WEEKS_PER_MONTH;

  const labor        = v.numStaff * v.hourlyWage * v.hoursPerWeek * WEEKS_PER_MONTH;
  const startupTotal = v.equipmentCost + v.permitsCost + v.otherPermitsCost + v.initialInventoryCost + v.smallwaresCost - v.firstMonthRentCredit;
  const startupInPL  = v.includeStartup && v.amortMonths > 0 ? startupTotal / v.amortMonths : 0;
  const fixedCosts   = v.rent + v.utilities + labor + v.marketingMonthly + v.orderProcessingFee + startupInPL;

  if (contributionPerScale <= 0) return Infinity;
  return mainOrdersPerDay * (fixedCosts / contributionPerScale);
}

function updateMixWarning(v) {
  const total = v.pctPickup + v.pctFantuan + v.pctUberEats + v.pctDoorDash + v.pctGrubhub;
  $("mixTotal").textContent = total.toFixed(0);
  $("mixWarning").textContent = Math.abs(total - 100) > 0.5 ? window.NoodleI18N.t("mix.warning") : "";
}

// Blended stats per category (direct/pickup price basis).
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
    $("menuBody").appendChild(makeMenuRow({ name: "", price: 0, pG: 0, pU: 0, pD: 0, pGH: 0, cost: 0, qty: 0 }));
    recalc();
  });

  $("addDrinkBtn").addEventListener("click", () => {
    $("drinkBody").appendChild(makeMenuRow({ name: "", price: 0, pG: 0, pU: 0, pD: 0, pGH: 0, cost: 0, qty: 0 }));
    recalc();
  });

  const addAddonBtn = $("addAddonBtn");
  if (addAddonBtn) addAddonBtn.addEventListener("click", () => {
    $("addonBody").appendChild(makeMenuRow({ name: "", price: 0, pG: 0, pU: 0, pD: 0, pGH: 0, cost: 0, qty: 0 }));
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

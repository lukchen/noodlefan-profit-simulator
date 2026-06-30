// NoodleFan 粉面王 — i18n (English / Chinese) for the Profit Simulator.
// Exposes: window.NoodleI18N.t(key), .setLanguage(lang), .getLanguage(), .applyToDOM()

(function () {
  const LANG_KEY = "noodlefan-lang";

  const STRINGS = {
    en: {
      docTitle: "NoodleFan 粉面王 — Profit Simulator",
      subtitle: "Delivery & Pickup Profit Simulator — CloudKitchens Boston",

      "s1.title": "1. Operating Schedule",
      "s1.daysPerWeek": "Days open per week",

      "sm.title": "2. Menu & Daily Sales Mix",
      "sm.hint": "Set the selling price, ingredient cost, and expected daily orders for each dish.",
      "sm.col.dish": "Dish",
      "sm.col.price": "Price ($)",
      "sm.col.cost": "Cost ($)",
      "sm.col.qty": "Orders/Day",
      "sm.dish1": "Tianjin Yellow Broth Beef Noodle 天津黄汤牛肉拉面",
      "sm.dish2": "Taiwanese Beef Noodle 台式牛肉面",
      "sm.dish3": "Jiangxi Fried Rice Noodle 江西炒粉",
      "sm.dish4": "Jiangxi Three Delicacies Noodle 江西三鲜泡粉",
      "sm.dish5": "Jiangxi Beef Rice Noodle 江西牛肉泡粉",
      "sm.blended": "Blended",
      "sm.aovLabel": "AOV:",
      "sm.cogsLabel": "Food cost:",
      "sm.perDay": "/day",

      "s2.title": "3. Order Channel Mix",
      "s2.hint": "Percent of orders through each channel — should total 100%.",
      "channel.pickup": "Direct Pickup (call-in / walk-up, no app)",
      "channel.doordash": "DoorDash",
      "channel.ubereats": "Uber Eats",
      "channel.grubhub": "Fantuan 饭团外卖",
      "dual.pct": "% of orders",
      "dual.fee": "% fee",
      "dual.ccfee": "% CC fee",
      "mix.total": "Channel mix total:",
      "mix.warning": "(should total 100%)",

      "s3.title": "4. Kitchen Rent & Utilities (CloudKitchens)",
      "s3.rent": "Monthly rent ($)",
      "s3.utilities": "Utilities / CAM fees ($/mo)",
      "s3.hint": "CloudKitchens doesn't publish list pricing — these are placeholder estimates for a small Boston ghost-kitchen unit. Replace with your actual quote.",

      "s4.title": "4. Food Cost (COGS)",
      "s4.foodCostPct": "Food cost (% of revenue)",
      "s4.hint": "Typical noodle/rice-noodle restaurants run 28–35% COGS.",

      "s5.title": "5. Packaging",
      "s5.packaging": "Packaging cost per order ($)",

      "s6.title": "6. Labor",
      "s6.numStaff": "Number of staff",
      "s6.hourlyWage": "Avg hourly wage ($)",
      "s6.hoursPerWeek": "Hours/week per staff",
      "s6.hint": "Treated as a fixed monthly cost (scheduled regardless of order volume).",

      "s7.title": "7. Marketing & Promo",
      "s7.marketing": "Monthly marketing spend ($)",

      "s8.title": "8. One-Time Startup Costs",
      "s8.equipment": "Kitchen Equipment",
      "s8.equipTotal": "Subtotal:",
      "s8.addItem": "+ Add item",
      "s8.permits": "CloudKitchens Activation Fee ($)",
      "s8.otherPermits": "Other permits & licenses ($)",
      "s8.inventory": "Initial inventory ($)",
      "s8.smallwares": "Smallwares / misc ($)",
      "s8.amortMonths": "Spread over (months)",
      "s8.includeStartup": "Include amortized startup cost in monthly P&L",

      "s9.title": "Income Tax",
      "s9.taxRate": "Est. tax rate (%)",
      "s9.hint": "Federal (~22–24%) + MA state (5%) = ~27–29%. Applied to taxable income after deductions.",
      "s9.deduct.title": "Tax Deductions",
      "s9.sep": "SEP-IRA contribution (% of profit)",
      "s9.sec179": "Section 179 equipment deduction ($/yr)",
      "s9.deduct.hint": "SEP-IRA: up to 25% of net profit, goes to retirement. Section 179: deduct full equipment cost in year 1 instead of depreciating.",

      "pl.sep": "SEP-IRA deduction",
      "pl.sec179": "Section 179 (monthly equiv.)",
      "pl.taxable": "Taxable income",
      "pl.tax": "Est. income tax",
      "pl.netprofit.aftertax": "Net profit after tax",

      "tab.menu": "Menu",
      "tab.channels": "Channels",
      "tab.costs": "Costs",
      "tab.startup": "Startup",
      "tab.results": "Results",

      "pg.title": "Platform Price Guide",
      "pg.hint": "Recommended consumer-facing prices on each platform so the restaurant nets the same base price after commission. Formula: base ÷ (1 − fee%).",
      "pg.col.channel": "Channel",
      "pg.col.fee": "Fee",
      "pg.col.price": "Listed Price",
      "pg.col.youget": "You Net",
      "pg.direct": "Direct (own site / phone)",
      "pg.note": "Set these prices in each platform's menu editor.",

      resetBtn: "Reset to defaults",

      "results.title": "Monthly P&L Summary",
      "pl.revenue": "Revenue",
      "pl.cogs": "Food cost",
      "pl.platform": "Delivery platform fees",
      "pl.packaging": "Packaging",
      "pl.labor": "Labor",
      "pl.rent": "Rent & utilities",
      "pl.marketing": "Marketing",
      "pl.startup": "Startup cost (amortized)",
      "pl.netprofit": "Net profit / month",
      "pl.margin": "Net margin",
      "pl.orders": "Orders / month",
      "pl.breakeven": "Break-even orders/day",
      "breakeven.never": "never (negative margin per order)",

      "chart.breakdownTitle": "Cost Breakdown",
      "chart.sensitivityTitle": "Profit vs. Order Volume",
      "chart.cogs": "Food cost",
      "chart.platform": "Platform fees",
      "chart.packaging": "Packaging",
      "chart.labor": "Labor",
      "chart.rent": "Rent & utilities",
      "chart.marketing": "Marketing",
      "chart.startup": "Startup (amortized)",
      "chart.sensitivityLabel": "Net profit / month ($)",
      "chart.perDaySuffix": "/day",

      footer: "NoodleFan Profit Simulator — built for evaluating a CloudKitchens Boston (delivery + pickup only) launch. All figures are editable estimates; verify rent and fees with your actual contracts.",
    },

    zh: {
      docTitle: "粉面王 NoodleFan — 利润模拟器",
      subtitle: "外卖与自取利润模拟器 — 波士顿 CloudKitchens",

      "s1.title": "1. 营业设置",
      "s1.daysPerWeek": "每周营业天数",

      "sm.title": "2. 菜单 & 每日销售组合",
      "sm.hint": "设置每道菜的售价、食材成本及预计每日销售数量。",
      "sm.col.dish": "菜品",
      "sm.col.price": "售价 ($)",
      "sm.col.cost": "成本 ($)",
      "sm.col.qty": "每日订单",
      "sm.dish1": "天津黄汤牛肉拉面",
      "sm.dish2": "台式牛肉面",
      "sm.dish3": "江西炒粉",
      "sm.dish4": "江西三鲜泡粉",
      "sm.dish5": "江西牛肉泡粉",
      "sm.blended": "综合",
      "sm.aovLabel": "客单价：",
      "sm.cogsLabel": "食材成本：",
      "sm.perDay": "单/天",

      "s2.title": "3. 订单渠道占比",
      "s2.hint": "各渠道订单占比 — 总和应为 100%。",
      "channel.pickup": "直接自取（电话/到店，无平台）",
      "channel.doordash": "DoorDash",
      "channel.ubereats": "Uber Eats",
      "channel.grubhub": "Fantuan 饭团外卖",
      "dual.pct": "% 订单占比",
      "dual.fee": "% 手续费",
      "dual.ccfee": "% 刷卡手续费",
      "mix.total": "渠道占比总计：",
      "mix.warning": "（总和应为 100%）",

      "s3.title": "4. 厨房租金与水电（CloudKitchens）",
      "s3.rent": "月租金 ($)",
      "s3.utilities": "水电/物业费 ($/月)",
      "s3.hint": "CloudKitchens 未公开标准定价 — 以上为波士顿小型共享厨房单元的估算值，请替换为实际报价。",

      "s4.title": "4. 食材成本（COGS）",
      "s4.foodCostPct": "食材成本占营收比例 (%)",
      "s4.hint": "典型米粉/面馆食材成本占比通常为 28%–35%。",

      "s5.title": "5. 包装",
      "s5.packaging": "每单包装成本 ($)",

      "s6.title": "6. 人工",
      "s6.numStaff": "员工人数",
      "s6.hourlyWage": "平均时薪 ($)",
      "s6.hoursPerWeek": "每位员工每周工时",
      "s6.hint": "按固定月度成本计算（排班与订单量无关）。",

      "s7.title": "7. 营销推广",
      "s7.marketing": "每月营销支出 ($)",

      "s8.title": "8. 一次性启动成本",
      "s8.equipment": "厨房设备",
      "s8.equipTotal": "小计：",
      "s8.addItem": "+ 添加项目",
      "s8.permits": "CloudKitchens Activation Fee ($)",
      "s8.otherPermits": "其他许可证与执照 ($)",
      "s8.inventory": "初始库存 ($)",
      "s8.smallwares": "小型用具/杂项 ($)",
      "s8.amortMonths": "分摊月数",
      "s8.includeStartup": "在月度利润表中计入分摊的启动成本",

      "s9.title": "所得税",
      "s9.taxRate": "预估税率 (%)",
      "s9.hint": "联邦税约 22–24% + MA 州税 5% = 合计约 27–29%。按扣除减税项后的应税收入计算。",
      "s9.deduct.title": "减税项",
      "s9.sep": "SEP-IRA 退休金缴存（占利润 %）",
      "s9.sec179": "Section 179 设备抵扣（$/年）",
      "s9.deduct.hint": "SEP-IRA：最高可抵扣净利润 25%，存入退休账户。Section 179：设备费用当年全额抵扣，无需逐年折旧。",

      "pl.sep": "SEP-IRA 退休金抵扣",
      "pl.sec179": "Section 179（月均）",
      "pl.taxable": "应税收入",
      "pl.tax": "预估所得税",
      "pl.netprofit.aftertax": "税后净利润",

      "tab.menu": "菜单",
      "tab.channels": "渠道",
      "tab.costs": "成本",
      "tab.startup": "启动",
      "tab.results": "结果",

      "pg.title": "各平台定价参考",
      "pg.hint": "各渠道建议售价，确保扣除平台抽成后到手价与直营售价相同。计算公式：直营价 ÷ (1 − 抽成%)",
      "pg.col.channel": "渠道",
      "pg.col.fee": "抽成",
      "pg.col.price": "消费者看到的价格",
      "pg.col.youget": "商家到手",
      "pg.direct": "直营（本店官网 / 电话）",
      "pg.note": "请按此定价在各平台后台设置菜单价格。",

      resetBtn: "恢复默认值",

      "results.title": "月度利润表概览",
      "pl.revenue": "营收",
      "pl.cogs": "食材成本",
      "pl.platform": "外卖平台费用",
      "pl.packaging": "包装",
      "pl.labor": "人工",
      "pl.rent": "租金与水电",
      "pl.marketing": "营销",
      "pl.startup": "启动成本（分摊）",
      "pl.netprofit": "月净利润",
      "pl.margin": "净利率",
      "pl.orders": "月订单量",
      "pl.breakeven": "保本日订单量",
      "breakeven.never": "无法保本（单均利润为负）",

      "chart.breakdownTitle": "成本构成",
      "chart.sensitivityTitle": "利润与订单量关系",
      "chart.cogs": "食材成本",
      "chart.platform": "平台费用",
      "chart.packaging": "包装",
      "chart.labor": "人工",
      "chart.rent": "租金与水电",
      "chart.marketing": "营销",
      "chart.startup": "启动成本（分摊）",
      "chart.sensitivityLabel": "月净利润 ($)",
      "chart.perDaySuffix": "单/天",

      footer: "NoodleFan 利润模拟器 — 用于评估在波士顿 CloudKitchens（仅外卖与自取）开店方案。所有数值均为可编辑的估算值，请以实际合同为准。",
    },
  };

  function getLanguage() {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) { /* ignore */ }
    return "en";
  }

  function setLanguage(lang) {
    if (lang !== "en" && lang !== "zh") lang = "en";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    CURRENT = lang;
  }

  let CURRENT = getLanguage();

  function t(key) {
    return (STRINGS[CURRENT] && STRINGS[CURRENT][key]) || (STRINGS.en[key]) || key;
  }

  function applyToDOM() {
    document.documentElement.lang = CURRENT === "zh" ? "zh-CN" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      el.textContent = t(key);
    });
    document.querySelectorAll(".lang-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === CURRENT);
    });
  }

  window.NoodleI18N = {
    t,
    setLanguage,
    getLanguage: () => CURRENT,
    applyToDOM,
  };
})();

export type ChartSeries = {
  name: string;
  color: string;
  unit: string;
  values: number[];
};

export type WorkspaceChart = {
  title: string;
  subtitle: string;
  labels: string[];
  series: ChartSeries[];
};

export type WorkspaceMetric = {
  label: string;
  value: string;
  comparison: string;
  unit?: string;
};

export type WorkspaceRecord = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  owner: string;
  value: string;
  date: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  notes: string;
  fields: Record<string, string>;
};

export type WorkspaceAction = {
  label: string;
  result: string;
};

export type WorkspaceConfig = {
  productId: string;
  dashboardTitle: string;
  recordName: string;
  recordNamePlural: string;
  primaryModule: string;
  modules: string[];
  statuses: string[];
  defaultStatus: string;
  metrics: WorkspaceMetric[];
  chart: WorkspaceChart;
  records: WorkspaceRecord[];
  tableColumns: Array<{ label: string; key: "title" | "subtitle" | "status" | "owner" | "value" | "date" | string }>;
  notifications: string[];
  aiPrompts: WorkspaceAction[];
  createTemplate: Partial<WorkspaceRecord>;
  emptyMessage: string;
};

const colors = {
  violet: "#6D28FF",
  cyan: "#00E5FF",
  pink: "#FF4FD8",
  green: "#4ADE80",
  amber: "#F59E0B",
  blue: "#60A5FA",
};

function record(
  id: string,
  title: string,
  subtitle: string,
  status: string,
  owner: string,
  value: string,
  date: string,
  priority: WorkspaceRecord["priority"],
  fields: Record<string, string>,
  notes: string,
): WorkspaceRecord {
  return { id, title, subtitle, status, owner, value, date, priority, fields, notes };
}

export const workspaceConfigs: WorkspaceConfig[] = [
  {
    productId: "restaurant-os",
    dashboardTitle: "Restaurant command center",
    recordName: "order",
    recordNamePlural: "live orders",
    primaryModule: "Live Orders",
    modules: ["Live Orders", "Tables", "Kitchen Queue", "Reservations", "Menu", "Inventory Alerts", "Receipts", "AI Menu"],
    statuses: ["New", "Preparing", "Ready", "Served", "Paid", "Cancelled"],
    defaultStatus: "New",
    metrics: [
      { label: "Daily sales", value: "€12,840", comparison: "+8.4% vs last Friday" },
      { label: "Table occupancy", value: "82%", comparison: "18 active tables" },
      { label: "Kitchen timing", value: "11.6 min", comparison: "-2.1 min from average" },
      { label: "Stock alerts", value: "5", comparison: "2 critical ingredients" },
    ],
    chart: {
      title: "Hourly restaurant performance",
      subtitle: "Sales, occupancy, and kitchen timing by service hour",
      labels: ["10", "11", "12", "13", "14", "18", "19", "20", "21", "22"],
      series: [
        { name: "Sales €k", color: colors.amber, unit: "€k", values: [1.2, 2.1, 4.8, 5.4, 3.2, 4.4, 6.8, 7.2, 5.9, 3.1] },
        { name: "Occupancy %", color: colors.cyan, unit: "%", values: [24, 36, 76, 84, 62, 58, 92, 96, 81, 42] },
        { name: "Kitchen min", color: colors.pink, unit: "min", values: [8, 9, 13, 15, 12, 10, 14, 16, 13, 9] },
      ],
    },
    records: [
      record("ORD-1048", "Table 12 tasting menu", "4 guests · Truffle pasta, seabass", "Preparing", "Maya", "€286", "19:20", "High", { Table: "12", Channel: "Dine-in", "Receipt": "Printable" }, "Kitchen should fire mains after starters are served."),
      record("ORD-1049", "Delivery order #8842", "2 guests · vegan ramen, salad", "Ready", "AI Routing", "€48", "19:32", "Medium", { Table: "Delivery", Channel: "Courier", "Receipt": "Printable" }, "Courier ETA is 7 minutes."),
      record("ORD-1050", "Table 7 birthday dinner", "6 guests · set menu", "Served", "Jonas", "€412", "20:00", "High", { Table: "7", Channel: "Reservation", "Receipt": "Printable" }, "Add birthday dessert before receipt."),
      record("ORD-1051", "Walk-in bar order", "2 guests · cocktails", "Paid", "Nora", "€54", "20:08", "Low", { Table: "Bar 3", Channel: "Walk-in", "Receipt": "Printed" }, "Paid by card."),
      record("ORD-1052", "Table 3 allergy note", "3 guests · no nuts", "New", "Maya", "€132", "20:14", "Critical", { Table: "3", Channel: "Dine-in", "Receipt": "Pending" }, "Allergy note confirmed with kitchen."),
    ],
    tableColumns: [
      { label: "Order", key: "title" },
      { label: "Items", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Total", key: "value" },
      { label: "Time", key: "date" },
    ],
    notifications: ["Table 3 has a critical allergy note", "Kitchen queue average is 11.6 minutes", "Low stock: burrata, seabass, mint"],
    aiPrompts: [
      { label: "Suggest menu actions", result: "Push seabass only until 21:00, then switch the server recommendation to truffle pasta because inventory risk is rising." },
      { label: "Predict dinner rush", result: "Peak pressure is expected at 20:00 with 96% table occupancy and a 16 minute kitchen timing risk." },
      { label: "Draft stock alert", result: "Message drafted: Low stock on burrata and seabass. Recommend supplier reorder before tomorrow lunch service." },
    ],
    createTemplate: { status: "New", owner: "Maya", value: "€0", priority: "Medium", fields: { Table: "Unassigned", Channel: "Dine-in", Receipt: "Pending" } },
    emptyMessage: "No orders match this view. Clear filters or create a new order.",
  },
  {
    productId: "clinic-os",
    dashboardTitle: "Clinic operations",
    recordName: "appointment",
    recordNamePlural: "appointments",
    primaryModule: "Appointments",
    modules: ["Appointments", "Patient Records", "Doctor Schedule", "Visit Notes", "Billing", "Waitlist", "Privacy Log"],
    statuses: ["Scheduled", "Checked in", "In consult", "Completed", "Billed", "Waitlist"],
    defaultStatus: "Scheduled",
    metrics: [
      { label: "Appointments", value: "74", comparison: "12 remaining today" },
      { label: "Avg wait time", value: "8.5 min", comparison: "-3.2 min vs last week" },
      { label: "No-show rate", value: "3.8%", comparison: "2 predicted risks" },
      { label: "Billing ready", value: "€18,420", comparison: "16 visits completed" },
    ],
    chart: {
      title: "Clinic flow by hour",
      subtitle: "Appointments, wait time, and completed billing",
      labels: ["08", "09", "10", "11", "12", "14", "15", "16", "17"],
      series: [
        { name: "Appointments", color: colors.cyan, unit: "visits", values: [6, 9, 11, 10, 7, 8, 12, 9, 2] },
        { name: "Wait min", color: colors.amber, unit: "min", values: [5, 7, 12, 10, 8, 6, 11, 9, 4] },
        { name: "Billing €k", color: colors.green, unit: "€k", values: [1.2, 2.4, 3.1, 2.9, 1.8, 2.1, 3.4, 2.6, 0.8] },
      ],
    },
    records: [
      record("APT-2201", "A. Keller follow-up", "Cardiology · Dr. Weiss", "Checked in", "Front desk", "€180", "09:30", "Medium", { Room: "2", Privacy: "Restricted", Insurance: "Public" }, "Patient consent verified. Hide clinical notes from shared display."),
      record("APT-2202", "M. Braun first visit", "General · Dr. Omar", "Scheduled", "Nadia", "€95", "10:15", "High", { Room: "4", Privacy: "Standard", Insurance: "Private" }, "AI predicts no-show risk because reminder was not opened."),
      record("APT-2203", "L. Fischer lab review", "Internal · Dr. Weiss", "Completed", "Billing", "€220", "11:40", "Low", { Room: "1", Privacy: "Restricted", Insurance: "Private" }, "Visit note ready for billing summary."),
      record("APT-2204", "S. Vogt urgent slot", "General · Dr. Omar", "Waitlist", "Nadia", "€130", "14:00", "Critical", { Room: "Waitlist", Privacy: "Standard", Insurance: "Public" }, "Offer first cancellation after 13:30."),
      record("APT-2205", "P. Klein therapy", "Physio · Dr. Mira", "In consult", "Room 5", "€110", "15:10", "Medium", { Room: "5", Privacy: "Standard", Insurance: "Self-pay" }, "Session started six minutes late."),
    ],
    tableColumns: [
      { label: "Patient", key: "title" },
      { label: "Care context", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Billing", key: "value" },
      { label: "Time", key: "date" },
    ],
    notifications: ["No-show risk detected for M. Braun", "Waitlist patient can fill 14:00 cancellation", "Privacy log reviewed for 3 restricted records"],
    aiPrompts: [
      { label: "Summarize patient flow", result: "Clinic flow is stable. Biggest risk is a 14:00 waitlist slot and one no-show risk with unopened reminders." },
      { label: "Draft reminder", result: "Reminder drafted with appointment time, doctor name, privacy note, and rescheduling link." },
      { label: "Explain billing queue", result: "16 completed visits are billing-ready. Two private claims have missing visit notes." },
    ],
    createTemplate: { status: "Scheduled", owner: "Front desk", value: "€0", priority: "Medium", fields: { Room: "Unassigned", Privacy: "Standard", Insurance: "Unknown" } },
    emptyMessage: "No appointments match the current privacy-safe filters.",
  },
  {
    productId: "retail-os",
    dashboardTitle: "Supermarket management",
    recordName: "product",
    recordNamePlural: "products",
    primaryModule: "Products",
    modules: ["Products", "Barcode", "POS", "Stock", "Warehouse", "Suppliers", "Promotions", "Customers", "Returns", "Cash Register", "Inventory AI"],
    statuses: ["Active", "Low stock", "Returned", "Supplier hold", "Discontinued"],
    defaultStatus: "Active",
    metrics: [
      { label: "Register sales", value: "€68.2K", comparison: "+11.8% weekly" },
      { label: "Margin", value: "42%", comparison: "+3.1 pts" },
      { label: "Stock turnover", value: "5.8x", comparison: "healthy" },
      { label: "Returns", value: "3.4%", comparison: "-0.9 pts" },
    ],
    chart: {
      title: "Supermarket category mix",
      subtitle: "Checkout sales, margin, and return rate by department",
      labels: ["Produce", "Dairy", "Bakery", "Meat", "Household", "Frozen"],
      series: [
        { name: "Sales €k", color: colors.green, unit: "€k", values: [18, 12, 9, 16, 6, 8] },
        { name: "Margin %", color: colors.cyan, unit: "%", values: [44, 38, 52, 31, 47, 42] },
        { name: "Returns %", color: colors.pink, unit: "%", values: [4.2, 2.4, 1.8, 5.6, 2.9, 3.1] },
      ],
    },
    records: [
      record("SKU-8841", "Organic bananas 1kg", "Produce aisle · barcode 4011", "Low stock", "Inventory", "€8,420", "Today", "High", { Category: "Produce", Supplier: "Freshline", Margin: "26%", Barcode: "4011" }, "Only 18 crates remain across floor and warehouse."),
      record("SKU-8842", "Whole milk 1L", "Dairy · barcode 4102", "Active", "Retail Ops", "€6,180", "Today", "Medium", { Category: "Dairy", Supplier: "Alpen Dairy", Margin: "18%", Barcode: "4102" }, "Cold-chain stock is stable."),
      record("SKU-8843", "Coffee capsules 20 pack", "Household · barcode 8843", "Returned", "Support", "€3,290", "Yesterday", "Medium", { Category: "Household", Supplier: "Auralis", Margin: "31%", Barcode: "8843" }, "Return reason cluster: wrong promotion shelf label."),
      record("SKU-8844", "Sourdough loaf", "Bakery · barcode 2204", "Active", "Store Lead", "€2,860", "Today", "Low", { Category: "Bakery", Supplier: "In-house", Margin: "42%", Barcode: "2204" }, "Demand peaks after 17:00."),
      record("SKU-8845", "Chicken breast 500g", "Meat · barcode 5512", "Supplier hold", "Purchasing", "€4,940", "Tomorrow", "Critical", { Category: "Meat", Supplier: "Florin Foods", Margin: "22%", Barcode: "5512" }, "Supplier lead time slipped by 3 days."),
    ],
    tableColumns: [
      { label: "Product", key: "title" },
      { label: "Barcode / aisle", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Sales", key: "value" },
      { label: "Updated", key: "date" },
    ],
    notifications: ["Produce has low-stock risk before evening rush", "Meat supplier hold impacts tomorrow shelf availability", "Household returns point to shelf-label mismatch"],
    aiPrompts: [
      { label: "Recommend reorder", result: "Reorder bananas, chicken breast, and coffee capsules before the evening cycle. Prioritize warehouse transfer before supplier purchase." },
      { label: "Explain returns", result: "Household returns are tied to a shelf-label mismatch. Update promotion signage and block the register discount rule until verified." },
      { label: "Forecast margin", result: "Margin stays stable if dairy discounts remain below the weekend threshold and produce shrink is controlled." },
    ],
    createTemplate: { status: "Active", owner: "Retail Ops", value: "€0", priority: "Medium", fields: { Category: "Unassigned", Supplier: "Unknown", Margin: "0%", Barcode: "0000" } },
    emptyMessage: "No supermarket products match this category, supplier, barcode, or status filter.",
  },
  {
    productId: "gym-os",
    dashboardTitle: "Gym member operations",
    recordName: "member",
    recordNamePlural: "members",
    primaryModule: "Members",
    modules: ["Members", "Subscriptions", "Attendance", "Trainers", "Classes", "Payments", "Churn Risk"],
    statuses: ["Active", "At risk", "Paused", "Overdue", "Trial", "Cancelled"],
    defaultStatus: "Active",
    metrics: [
      { label: "Active members", value: "1,284", comparison: "+38 this month" },
      { label: "Attendance", value: "429", comparison: "+16% today" },
      { label: "Churn risk", value: "42", comparison: "12 high priority" },
      { label: "Paid plans", value: "96%", comparison: "+2.8 pts" },
    ],
    chart: {
      title: "Membership and attendance",
      subtitle: "Member growth, check-ins, churn risk, and subscription health",
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        { name: "Check-ins", color: colors.violet, unit: "visits", values: [318, 362, 394, 421, 386, 512, 448] },
        { name: "New members", color: colors.green, unit: "members", values: [8, 11, 9, 13, 7, 18, 14] },
        { name: "Churn risk", color: colors.pink, unit: "risk", values: [38, 41, 42, 44, 40, 39, 42] },
      ],
    },
    records: [
      record("MBR-301", "Lea Hoffmann", "Premium · trainer plan", "Active", "Coach Amira", "€89/mo", "Today", "Low", { Goal: "Strength", LastVisit: "Today", Payment: "Paid" }, "AI recommends adding a progression check next week."),
      record("MBR-302", "David Novak", "Standard · low attendance", "At risk", "Coach Tom", "€59/mo", "6 days ago", "High", { Goal: "Weight loss", LastVisit: "6 days", Payment: "Paid" }, "Churn risk driven by missed classes and no app opens."),
      record("MBR-303", "Sofia Kim", "Trial · yoga classes", "Trial", "Sales", "€0", "Tomorrow", "Medium", { Goal: "Mobility", LastVisit: "Yesterday", Payment: "Trial" }, "Offer annual plan after Saturday session."),
      record("MBR-304", "Max Berger", "Premium · overdue card", "Overdue", "Billing", "€89/mo", "Today", "Critical", { Goal: "Hypertrophy", LastVisit: "Today", Payment: "Failed" }, "Payment retry scheduled for 18:00."),
      record("MBR-305", "Nina Patel", "Paused membership", "Paused", "Member Care", "€0", "Next week", "Medium", { Goal: "Recovery", LastVisit: "14 days", Payment: "Paused" }, "Follow-up when pause ends."),
    ],
    tableColumns: [
      { label: "Member", key: "title" },
      { label: "Plan", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Plan value", key: "value" },
      { label: "Last touch", key: "date" },
    ],
    notifications: ["12 members moved into high churn risk", "Class fill rate for HIIT reached 94%", "Two payment retries need review"],
    aiPrompts: [
      { label: "Explain churn risk", result: "Risk is concentrated in members with no check-in for 6+ days and no booked class. Send trainer-led check-ins to 12 accounts." },
      { label: "Draft coach message", result: "Message drafted: We missed you this week. Want me to reserve a spot in Thursday strength class?" },
      { label: "Optimize classes", result: "Move one trainer from Tuesday spin to Thursday HIIT. Demand is 28% higher there." },
    ],
    createTemplate: { status: "Trial", owner: "Sales", value: "€0", priority: "Medium", fields: { Goal: "General fitness", LastVisit: "New", Payment: "Trial" } },
    emptyMessage: "No members match the current risk, plan, or attendance filters.",
  },
  {
    productId: "crm",
    dashboardTitle: "Business CRM",
    recordName: "deal",
    recordNamePlural: "deals",
    primaryModule: "Pipeline",
    modules: ["Leads", "Companies", "Pipeline", "Meetings", "Tasks", "Invoices", "Documents", "Automation", "AI Sales Assistant"],
    statuses: ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"],
    defaultStatus: "Lead",
    metrics: [
      { label: "Pipeline", value: "€1.8M", comparison: "+21% quarter" },
      { label: "Deal velocity", value: "24 days", comparison: "-6 days" },
      { label: "Win forecast", value: "€620K", comparison: "92% confidence" },
      { label: "Follow-ups", value: "124", comparison: "AI queued" },
    ],
    chart: {
      title: "Pipeline conversion",
      subtitle: "Stage volume, conversion rate, and revenue forecast",
      labels: ["Lead", "Qual", "Proposal", "Negotiate", "Won"],
      series: [
        { name: "Deal count", color: colors.cyan, unit: "deals", values: [84, 48, 31, 18, 11] },
        { name: "Conversion %", color: colors.green, unit: "%", values: [100, 57, 37, 21, 13] },
        { name: "Forecast €k", color: colors.violet, unit: "€k", values: [920, 720, 510, 340, 220] },
      ],
    },
    records: [
      record("DEAL-901", "Northline Logistics", "Enterprise automation rollout", "Negotiation", "Mira", "€180K", "Jul 15", "High", { Stage: "Negotiation", Company: "Northline", NextStep: "Security review" }, "Deal risk is procurement timing."),
      record("DEAL-902", "Arc Dental Group", "Clinic OS multi-site", "Proposal", "Noah", "€92K", "Jul 18", "High", { Stage: "Proposal", Company: "Arc Dental", NextStep: "ROI call" }, "Need case-specific implementation map."),
      record("DEAL-903", "Studio54 Fitness", "Gym OS pilot", "Qualified", "Mira", "€38K", "Jul 11", "Medium", { Stage: "Qualified", Company: "Studio54", NextStep: "Demo workspace" }, "Interest strongest around churn-risk AI."),
      record("DEAL-904", "Luma Retail", "Retail OS and POS", "Lead", "Sales AI", "€124K", "Jul 22", "Medium", { Stage: "Lead", Company: "Luma", NextStep: "Discovery" }, "Imported from inbound form."),
      record("DEAL-905", "Bistro Nova", "Restaurant OS", "Won", "Noah", "€46K", "Jul 08", "Low", { Stage: "Won", Company: "Bistro Nova", NextStep: "Kickoff" }, "Kickoff booked."),
    ],
    tableColumns: [
      { label: "Deal", key: "title" },
      { label: "Scope", key: "subtitle" },
      { label: "Stage", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Value", key: "value" },
      { label: "Next touch", key: "date" },
    ],
    notifications: ["Security review is blocking Northline", "Arc Dental proposal opened 4 times", "124 follow-ups generated for review"],
    aiPrompts: [
      { label: "Summarize pipeline", result: "Pipeline is healthy but weighted revenue depends on two enterprise deals. Northline needs security follow-up today." },
      { label: "Draft follow-up", result: "Drafted a concise ROI follow-up for Arc Dental with implementation milestones and next-step CTA." },
      { label: "Explain deal risk", result: "Primary risk is procurement delay. Send security answers and request buying timeline confirmation." },
    ],
    createTemplate: { status: "Lead", owner: "Sales AI", value: "€0", priority: "Medium", fields: { Stage: "Lead", Company: "New company", NextStep: "Discovery" } },
    emptyMessage: "No deals match the current pipeline stage or owner filters.",
  },
  {
    productId: "pos",
    dashboardTitle: "POS checkout",
    recordName: "transaction",
    recordNamePlural: "transactions",
    primaryModule: "Checkout",
    modules: ["Checkout", "Product Selection", "Cart", "Discounts", "Payment Modal", "Receipt", "Transaction History"],
    statuses: ["Open cart", "Paid", "Refunded", "Discounted", "Failed"],
    defaultStatus: "Open cart",
    metrics: [
      { label: "Net sales", value: "€9,240", comparison: "+11% today" },
      { label: "Transactions", value: "418", comparison: "+36 vs yesterday" },
      { label: "Avg basket", value: "€32.80", comparison: "+€4.20" },
      { label: "Refund rate", value: "1.6%", comparison: "-0.8 pts" },
    ],
    chart: {
      title: "POS transaction flow",
      subtitle: "Payments, basket value, discounts, and refunds",
      labels: ["09", "10", "11", "12", "13", "14", "15", "16", "17"],
      series: [
        { name: "Payments", color: colors.green, unit: "tx", values: [22, 34, 52, 61, 48, 44, 57, 63, 37] },
        { name: "Avg basket €", color: colors.cyan, unit: "€", values: [24, 28, 31, 35, 33, 30, 34, 38, 29] },
        { name: "Discount %", color: colors.amber, unit: "%", values: [4, 5, 9, 8, 6, 7, 10, 11, 5] },
      ],
    },
    records: [
      record("TX-7001", "Cart #7001", "3 items · card payment", "Paid", "Register 1", "€82.40", "10:42", "Low", { Items: "3", Discount: "0%", Payment: "Card" }, "Receipt generated and emailed."),
      record("TX-7002", "Cart #7002", "2 items · member discount", "Discounted", "Register 2", "€45.20", "10:51", "Medium", { Items: "2", Discount: "10%", Payment: "Cash" }, "Discount approved by manager."),
      record("TX-7003", "Cart #7003", "Refund request", "Refunded", "Register 1", "€18.90", "11:02", "Medium", { Items: "1", Discount: "0%", Payment: "Card" }, "Refund reason: wrong size."),
      record("TX-7004", "Cart #7004", "Payment retry", "Failed", "Register 3", "€124.00", "11:08", "High", { Items: "5", Discount: "5%", Payment: "Card" }, "Payment gateway retry requested."),
      record("TX-7005", "Cart #7005", "Open checkout", "Open cart", "Register 2", "€67.30", "11:15", "Low", { Items: "4", Discount: "0%", Payment: "Pending" }, "Awaiting customer payment."),
    ],
    tableColumns: [
      { label: "Transaction", key: "title" },
      { label: "Cart", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Register", key: "owner" },
      { label: "Total", key: "value" },
      { label: "Time", key: "date" },
    ],
    notifications: ["Payment retry needed at Register 3", "Discount approval rate is within policy", "Receipt export is ready for 418 transactions"],
    aiPrompts: [
      { label: "Review transactions", result: "POS flow is healthy. One failed payment is above threshold and should be retried or moved to cash." },
      { label: "Suggest discount", result: "Apply a 5% loyalty discount only if basket value exceeds €60. Margin remains protected." },
      { label: "Generate receipt note", result: "Receipt note drafted with items, payment method, refund policy, and store contact details." },
    ],
    createTemplate: { status: "Open cart", owner: "Register 1", value: "€0", priority: "Low", fields: { Items: "1", Discount: "0%", Payment: "Pending" } },
    emptyMessage: "No transactions match this payment, register, or status filter.",
  },
  {
    productId: "finance",
    dashboardTitle: "Finance control",
    recordName: "invoice",
    recordNamePlural: "invoices",
    primaryModule: "Invoices",
    modules: ["Invoices", "Expenses", "Cash Flow", "Receivables", "Financial Summary", "Payment Status"],
    statuses: ["Draft", "Sent", "Viewed", "Paid", "Overdue", "Disputed"],
    defaultStatus: "Draft",
    metrics: [
      { label: "Cash flow", value: "€142K", comparison: "+€18K forecast" },
      { label: "Receivables", value: "€84K", comparison: "€19K overdue" },
      { label: "Expenses", value: "€38K", comparison: "-7% vs budget" },
      { label: "Runway", value: "14.2 mo", comparison: "+1.1 mo" },
    ],
    chart: {
      title: "Finance forecast",
      subtitle: "Cash, receivables, expenses, and forecast by month",
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      series: [
        { name: "Cash €k", color: colors.green, unit: "€k", values: [88, 94, 104, 118, 136, 142] },
        { name: "Receivables €k", color: colors.cyan, unit: "€k", values: [42, 61, 54, 78, 69, 84] },
        { name: "Expenses €k", color: colors.pink, unit: "€k", values: [31, 36, 34, 41, 39, 38] },
      ],
    },
    records: [
      record("INV-4101", "Northline Q3 platform", "Enterprise milestone invoice", "Viewed", "Finance", "€42,000", "Due Jul 22", "High", { Client: "Northline", Terms: "Net 14", Type: "Invoice" }, "Client viewed invoice twice. Follow-up in 48h."),
      record("INV-4102", "Bistro Nova kickoff", "Restaurant OS launch", "Paid", "Finance", "€12,500", "Paid Jul 08", "Low", { Client: "Bistro Nova", Terms: "Paid", Type: "Invoice" }, "Receipt archived."),
      record("INV-4103", "Cloud tools July", "Infrastructure expense", "Sent", "Operations", "€2,840", "Jul 30", "Medium", { Client: "Internal", Terms: "Monthly", Type: "Expense" }, "Within budget."),
      record("INV-4104", "Arc Dental prototype", "Clinic OS discovery", "Overdue", "Finance", "€7,800", "Due Jul 06", "Critical", { Client: "Arc Dental", Terms: "Net 7", Type: "Invoice" }, "Send payment reminder today."),
      record("INV-4105", "Legal review", "Security review expense", "Draft", "Founder", "€1,200", "Draft", "Low", { Client: "Internal", Terms: "Draft", Type: "Expense" }, "Awaiting attachment."),
    ],
    tableColumns: [
      { label: "Invoice", key: "title" },
      { label: "Context", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Amount", key: "value" },
      { label: "Due", key: "date" },
    ],
    notifications: ["Arc Dental invoice is overdue", "Cash forecast improved by €18K", "Expense budget is 7% below plan"],
    aiPrompts: [
      { label: "Generate invoice", result: "Invoice draft created with milestone scope, payment terms, and tax note. Review before sending." },
      { label: "Explain cash flow", result: "Cash improved because receivables moved forward and cloud expenses stayed under budget." },
      { label: "Draft payment reminder", result: "Reminder drafted for Arc Dental with invoice number, payment link, and polite next-step language." },
    ],
    createTemplate: { status: "Draft", owner: "Finance", value: "€0", priority: "Medium", fields: { Client: "New client", Terms: "Net 14", Type: "Invoice" } },
    emptyMessage: "No finance records match this payment or receivable filter.",
  },
  {
    productId: "inventory",
    dashboardTitle: "Inventory operations",
    recordName: "item",
    recordNamePlural: "items",
    primaryModule: "Items",
    modules: ["Items", "Warehouses", "Stock Movements", "Purchase Orders", "Suppliers", "Reorder Alerts"],
    statuses: ["In stock", "Low stock", "Reorder", "In transit", "Delayed", "Blocked"],
    defaultStatus: "In stock",
    metrics: [
      { label: "Stock accuracy", value: "98%", comparison: "+3 pts" },
      { label: "Low-stock risk", value: "21", comparison: "-12 this week" },
      { label: "Supplier lead", value: "4.8 days", comparison: "+0.6 days" },
      { label: "Open POs", value: "46", comparison: "€82K committed" },
    ],
    chart: {
      title: "Inventory health",
      subtitle: "Stock levels, reorder risk, and supplier lead time",
      labels: ["A", "B", "C", "D", "E", "F", "G"],
      series: [
        { name: "Stock level %", color: colors.amber, unit: "%", values: [82, 76, 42, 64, 28, 91, 55] },
        { name: "Reorder risk", color: colors.pink, unit: "risk", values: [8, 12, 31, 18, 44, 5, 22] },
        { name: "Lead days", color: colors.cyan, unit: "days", values: [3, 4, 6, 4, 8, 2, 5] },
      ],
    },
    records: [
      record("ITM-1101", "Burrata 2kg", "Cold warehouse · supplier Florin", "Low stock", "Purchasing", "18 units", "Today", "Critical", { Warehouse: "Cold A", Supplier: "Florin", Reorder: "48 units" }, "Stock covers one dinner service."),
      record("ITM-1102", "Receipt paper rolls", "Front desk supplies", "In stock", "Operations", "240 units", "Next count", "Low", { Warehouse: "Main", Supplier: "OfficePro", Reorder: "No" }, "Healthy level."),
      record("ITM-1103", "Smart lamp module", "Retail warehouse", "In transit", "Logistics", "120 units", "Jul 12", "Medium", { Warehouse: "Berlin", Supplier: "Luma", Reorder: "Pending" }, "Shipment on track."),
      record("ITM-1104", "Serum bottles", "Beauty category", "Delayed", "Purchasing", "60 units", "Jul 16", "High", { Warehouse: "Munich", Supplier: "Florin", Reorder: "120 units" }, "Supplier delay impacts weekend campaign."),
      record("ITM-1105", "Protein bars", "Gym cafe", "Reorder", "Cafe Lead", "34 units", "Today", "High", { Warehouse: "Gym", Supplier: "NutriLab", Reorder: "200 units" }, "Expected sell-out Friday."),
    ],
    tableColumns: [
      { label: "Item", key: "title" },
      { label: "Location", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Quantity", key: "value" },
      { label: "Next step", key: "date" },
    ],
    notifications: ["Burrata stock is critical", "Serum supplier delay affects campaign", "Protein bars need reorder today"],
    aiPrompts: [
      { label: "Create reorder plan", result: "Reorder burrata, serum bottles, and protein bars first. Combined supplier exposure is highest for Florin." },
      { label: "Explain supplier risk", result: "Florin is responsible for two high-risk items and lead time increased by 0.6 days." },
      { label: "Draft purchase order", result: "PO draft created for 48 burrata units and 120 serum bottles with priority delivery notes." },
    ],
    createTemplate: { status: "In stock", owner: "Operations", value: "0 units", priority: "Medium", fields: { Warehouse: "Main", Supplier: "Unknown", Reorder: "No" } },
    emptyMessage: "No inventory items match this warehouse, supplier, or reorder filter.",
  },
  {
    productId: "analytics",
    dashboardTitle: "Executive analytics",
    recordName: "insight",
    recordNamePlural: "insights",
    primaryModule: "Dashboards",
    modules: ["Dashboards", "Date Filters", "Segments", "KPI Comparisons", "Drill-down Tables", "Alerts"],
    statuses: ["Healthy", "Watch", "Critical", "Explained", "Exported"],
    defaultStatus: "Watch",
    metrics: [
      { label: "Dashboards", value: "18", comparison: "6 executive views" },
      { label: "KPI delta", value: "+12.4%", comparison: "revenue vs prior period" },
      { label: "Critical alerts", value: "3", comparison: "requires owner" },
      { label: "Exports", value: "42", comparison: "this month" },
    ],
    chart: {
      title: "Segment KPI comparison",
      subtitle: "Revenue, conversion, retention, and support load",
      labels: ["SMB", "Mid-market", "Enterprise", "Retail", "Clinic", "Hospitality"],
      series: [
        { name: "Revenue €k", color: colors.cyan, unit: "€k", values: [84, 132, 220, 68, 92, 74] },
        { name: "Conversion %", color: colors.green, unit: "%", values: [7.2, 9.4, 12.1, 8.8, 10.2, 7.9] },
        { name: "Support load", color: colors.pink, unit: "tickets", values: [44, 38, 61, 28, 34, 31] },
      ],
    },
    records: [
      record("INS-501", "Enterprise revenue acceleration", "Segment: Enterprise", "Explained", "Analytics", "€220K", "Last 30d", "High", { Segment: "Enterprise", KPI: "Revenue", Confidence: "94%" }, "Driven by higher proposal conversion."),
      record("INS-502", "Retail return pressure", "Segment: Retail", "Watch", "Ops", "3.4%", "This week", "Medium", { Segment: "Retail", KPI: "Returns", Confidence: "88%" }, "Returns elevated in electronics."),
      record("INS-503", "Support SLA dip", "Segment: SMB", "Critical", "Support", "91%", "Today", "Critical", { Segment: "SMB", KPI: "SLA", Confidence: "91%" }, "Two agents overloaded."),
      record("INS-504", "Clinic no-show improvement", "Segment: Clinic", "Healthy", "Success", "3.8%", "This week", "Low", { Segment: "Clinic", KPI: "No-show", Confidence: "93%" }, "Reminder open rates improved."),
      record("INS-505", "Hospitality dinner peak", "Segment: Hospitality", "Exported", "Analytics", "96%", "Friday", "Medium", { Segment: "Hospitality", KPI: "Occupancy", Confidence: "90%" }, "Board report exported."),
    ],
    tableColumns: [
      { label: "Insight", key: "title" },
      { label: "Segment", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Metric", key: "value" },
      { label: "Period", key: "date" },
    ],
    notifications: ["Support SLA dip needs owner", "Enterprise revenue segment is outperforming", "Retail returns require drill-down"],
    aiPrompts: [
      { label: "Generate report", result: "Report generated with revenue movement, segment comparisons, three risks, and recommended owners." },
      { label: "Predict trend", result: "Enterprise revenue likely remains above plan next period; support load is the main downside risk." },
      { label: "Explain KPI movement", result: "Conversion improved where follow-up time decreased. Retail returns offset some margin expansion." },
    ],
    createTemplate: { status: "Watch", owner: "Analytics", value: "0", priority: "Medium", fields: { Segment: "All", KPI: "Revenue", Confidence: "80%" } },
    emptyMessage: "No analytics insights match this date range, segment, or KPI filter.",
  },
  {
    productId: "hr",
    dashboardTitle: "People operations",
    recordName: "employee",
    recordNamePlural: "employees",
    primaryModule: "Employees",
    modules: ["Employees", "Attendance", "Leave Requests", "Payroll Summary", "Recruitment Pipeline", "Policies"],
    statuses: ["Active", "On leave", "Pending approval", "Payroll review", "Candidate", "Offboarding"],
    defaultStatus: "Active",
    metrics: [
      { label: "Headcount", value: "86", comparison: "+4 open roles" },
      { label: "Attendance", value: "94%", comparison: "+2 pts" },
      { label: "Leave requests", value: "12", comparison: "5 pending" },
      { label: "Payroll", value: "€286K", comparison: "ready for review" },
    ],
    chart: {
      title: "People operations flow",
      subtitle: "Headcount, attendance, payroll, and hiring funnel",
      labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      series: [
        { name: "Headcount", color: colors.pink, unit: "people", values: [72, 75, 78, 81, 84, 86] },
        { name: "Attendance %", color: colors.green, unit: "%", values: [91, 92, 90, 93, 94, 94] },
        { name: "Candidates", color: colors.cyan, unit: "people", values: [18, 24, 31, 28, 34, 37] },
      ],
    },
    records: [
      record("EMP-301", "Amira Schulz", "Trainer · full-time", "Active", "People Ops", "€4,200", "Today", "Low", { Team: "Fitness", Attendance: "98%", Payroll: "Ready" }, "Strong attendance and no pending actions."),
      record("EMP-302", "Jonas Weber", "Operations · leave request", "Pending approval", "Manager", "€3,600", "Jul 12", "Medium", { Team: "Operations", Attendance: "92%", Payroll: "Ready" }, "Leave request overlaps with inventory count."),
      record("EMP-303", "Nadia Omar", "Clinic front desk", "Payroll review", "Finance", "€3,100", "Jul 10", "High", { Team: "Clinic", Attendance: "89%", Payroll: "Review" }, "Overtime requires approval."),
      record("EMP-304", "Lea Mertens", "Product manager candidate", "Candidate", "Recruiting", "€0", "Jul 15", "Medium", { Team: "Product", Attendance: "N/A", Payroll: "N/A" }, "Final interview scheduled."),
      record("EMP-305", "Miro Klein", "Support · vacation", "On leave", "People Ops", "€3,300", "Jul 20", "Low", { Team: "Support", Attendance: "95%", Payroll: "Ready" }, "Coverage assigned."),
    ],
    tableColumns: [
      { label: "Person", key: "title" },
      { label: "Context", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Payroll", key: "value" },
      { label: "Date", key: "date" },
    ],
    notifications: ["Nadia overtime requires payroll approval", "Jonas leave conflicts with inventory count", "Recruitment pipeline has 37 active candidates"],
    aiPrompts: [
      { label: "Summarize payroll", result: "Payroll is ready except one overtime review. No policy exceptions detected beyond Nadia." },
      { label: "Review leave coverage", result: "Leave coverage is safe for support, but operations needs one backup for inventory count." },
      { label: "Draft candidate note", result: "Candidate update drafted with interview time, role expectations, and next-step timeline." },
    ],
    createTemplate: { status: "Active", owner: "People Ops", value: "€0", priority: "Medium", fields: { Team: "Unassigned", Attendance: "N/A", Payroll: "Pending" } },
    emptyMessage: "No people records match this status, team, or payroll filter.",
  },
  {
    productId: "automation",
    dashboardTitle: "Automation builder",
    recordName: "workflow",
    recordNamePlural: "workflows",
    primaryModule: "Workflow Builder",
    modules: ["Workflow Builder", "Triggers", "Actions", "Run History", "Failure Logs", "Approvals", "Connectors"],
    statuses: ["Enabled", "Disabled", "Running", "Failed", "Needs approval", "Draft"],
    defaultStatus: "Draft",
    metrics: [
      { label: "Runs today", value: "8,924", comparison: "+31%" },
      { label: "Manual hours modeled", value: "186", comparison: "+24 today" },
      { label: "Failures", value: "11", comparison: "-34%" },
      { label: "SLA hit", value: "98.7%", comparison: "+2.1 pts" },
    ],
    chart: {
      title: "Automation execution",
      subtitle: "Workflow runs, failures, and modeled manual effort",
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        { name: "Runs", color: colors.violet, unit: "runs", values: [7020, 7440, 8120, 8924, 8610, 5220, 4880] },
        { name: "Failures", color: colors.pink, unit: "fails", values: [18, 16, 14, 11, 13, 8, 7] },
        { name: "Modeled hours", color: colors.green, unit: "hours", values: [142, 158, 171, 186, 179, 93, 88] },
      ],
    },
    records: [
      record("WF-101", "Invoice reminder sequence", "Trigger: invoice overdue", "Enabled", "Finance", "42 runs", "Hourly", "High", { Trigger: "Overdue invoice", Action: "Email + task", LastRun: "11:00" }, "Runs with finance approval for high-value invoices."),
      record("WF-102", "Low stock reorder draft", "Trigger: stock below threshold", "Needs approval", "Inventory", "18 runs", "Daily", "Critical", { Trigger: "Stock risk", Action: "Draft PO", LastRun: "09:00" }, "Approval required for Florin supplier order."),
      record("WF-103", "Support SLA escalation", "Trigger: SLA < 94%", "Running", "Support", "212 runs", "Live", "Medium", { Trigger: "SLA breach", Action: "Escalate", LastRun: "Now" }, "No failures in last 24h."),
      record("WF-104", "New lead enrichment", "Trigger: inbound form", "Failed", "CRM", "3 failures", "Paused", "High", { Trigger: "Lead created", Action: "Enrich CRM", LastRun: "10:12" }, "API rate limit caused failure."),
      record("WF-105", "Weekly executive report", "Trigger: Monday 08:00", "Draft", "Analytics", "0 runs", "Draft", "Low", { Trigger: "Schedule", Action: "Generate report", LastRun: "Never" }, "Ready for review."),
    ],
    tableColumns: [
      { label: "Workflow", key: "title" },
      { label: "Definition", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Runs", key: "value" },
      { label: "Schedule", key: "date" },
    ],
    notifications: ["Lead enrichment failed due to rate limit", "Low stock reorder needs approval", "Support SLA workflow running normally"],
    aiPrompts: [
      { label: "Explain failures", result: "Failures are isolated to lead enrichment. Retry after API window resets or reduce enrichment batch size." },
      { label: "Generate workflow", result: "Workflow draft created: trigger on high churn risk, send trainer task, wait 24h, then notify manager." },
      { label: "Optimize automations", result: "Move invoice reminders from hourly to twice daily for lower noise without losing SLA coverage." },
    ],
    createTemplate: { status: "Draft", owner: "Operations", value: "0 runs", priority: "Medium", fields: { Trigger: "Manual", Action: "Draft action", LastRun: "Never" } },
    emptyMessage: "No workflows match this trigger, owner, or execution status.",
  },
  {
    productId: "customer-support",
    dashboardTitle: "Support inbox",
    recordName: "ticket",
    recordNamePlural: "tickets",
    primaryModule: "Inbox",
    modules: ["Inbox", "Tickets", "SLA", "Assigned Agents", "Ticket Detail", "Priority Queue", "Knowledge Base"],
    statuses: ["Open", "Waiting", "Escalated", "Resolved", "SLA risk", "Closed"],
    defaultStatus: "Open",
    metrics: [
      { label: "Open tickets", value: "342", comparison: "-18% this week" },
      { label: "SLA health", value: "96%", comparison: "+4 pts" },
      { label: "Sentiment", value: "4.2/5", comparison: "+0.3" },
      { label: "Resolution", value: "3.4h", comparison: "-38 min" },
    ],
    chart: {
      title: "Support operations",
      subtitle: "Ticket volume, SLA, sentiment, and resolution time",
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      series: [
        { name: "Tickets", color: colors.green, unit: "tickets", values: [82, 74, 66, 58, 52, 31, 28] },
        { name: "SLA %", color: colors.cyan, unit: "%", values: [92, 93, 94, 96, 96, 97, 96] },
        { name: "Resolution h", color: colors.amber, unit: "hours", values: [4.6, 4.2, 3.9, 3.4, 3.2, 2.8, 2.9] },
      ],
    },
    records: [
      record("TIC-801", "Payment failed twice", "Customer: Max Berger", "SLA risk", "Ava", "2h left", "Today", "Critical", { Priority: "Urgent", Channel: "Email", Sentiment: "Frustrated" }, "Payment issue affects subscription renewal."),
      record("TIC-802", "Feature request: exports", "Customer: Luma Retail", "Open", "Leo", "Normal", "Today", "Medium", { Priority: "Medium", Channel: "Chat", Sentiment: "Positive" }, "Link documentation and ask for export format."),
      record("TIC-803", "Clinic reminder not sent", "Customer: Arc Dental", "Escalated", "Mira", "1h left", "Today", "High", { Priority: "High", Channel: "Phone", Sentiment: "Concerned" }, "Engineering check requested."),
      record("TIC-804", "Invoice address change", "Customer: Bistro Nova", "Waiting", "Ava", "Waiting", "Yesterday", "Low", { Priority: "Low", Channel: "Email", Sentiment: "Neutral" }, "Waiting on customer tax ID."),
      record("TIC-805", "Account login issue", "Customer: Northline", "Resolved", "Leo", "Closed", "Yesterday", "Low", { Priority: "Low", Channel: "Chat", Sentiment: "Positive" }, "Resolved with password reset."),
    ],
    tableColumns: [
      { label: "Ticket", key: "title" },
      { label: "Customer", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Agent", key: "owner" },
      { label: "SLA", key: "value" },
      { label: "Updated", key: "date" },
    ],
    notifications: ["Payment failed ticket is at SLA risk", "Arc Dental reminder issue escalated", "Sentiment improved by 0.3 points"],
    aiPrompts: [
      { label: "Summarize ticket", result: "Ticket risk is payment-related and time-sensitive. Recommend payment retry steps and agent follow-up within one hour." },
      { label: "Draft reply", result: "Reply drafted with apology, next step, expected resolution time, and direct support contact." },
      { label: "Predict escalation", result: "Tickets with failed payments and frustrated sentiment are 2.1x more likely to escalate today." },
    ],
    createTemplate: { status: "Open", owner: "Ava", value: "Normal", priority: "Medium", fields: { Priority: "Medium", Channel: "Email", Sentiment: "Neutral" } },
    emptyMessage: "No support tickets match this agent, priority, or SLA filter.",
  },
  {
    productId: "marketing",
    dashboardTitle: "Marketing performance",
    recordName: "campaign",
    recordNamePlural: "campaigns",
    primaryModule: "Campaigns",
    modules: ["Campaigns", "Audiences", "Content", "Attribution", "Experiments", "Campaign Detail", "ROAS Analytics"],
    statuses: ["Draft", "Running", "Paused", "Experiment", "Won", "Archived"],
    defaultStatus: "Draft",
    metrics: [
      { label: "Attributed revenue", value: "€420K", comparison: "+26%" },
      { label: "ROAS", value: "4.8x", comparison: "+0.6x" },
      { label: "Conversions", value: "1,842", comparison: "+19%" },
      { label: "Spend", value: "€87K", comparison: "on plan" },
    ],
    chart: {
      title: "Campaign economics",
      subtitle: "Spend, conversions, ROAS, and attributed revenue",
      labels: ["Search", "LinkedIn", "Email", "Retarget", "Partner", "Content"],
      series: [
        { name: "Spend €k", color: colors.pink, unit: "€k", values: [22, 31, 8, 14, 7, 5] },
        { name: "Conversions", color: colors.cyan, unit: "conv", values: [420, 310, 560, 240, 126, 186] },
        { name: "ROAS", color: colors.green, unit: "x", values: [4.2, 3.8, 6.4, 4.9, 5.1, 3.7] },
      ],
    },
    records: [
      record("CMP-601", "Clinic OS launch", "Audience: private practices", "Running", "Growth", "€92K", "Jul 20", "High", { Audience: "Healthcare", Spend: "€18K", ROAS: "5.1x" }, "Strong conversion from doctor schedule content."),
      record("CMP-602", "Restaurant dinner rush", "Audience: hospitality owners", "Experiment", "Growth", "€48K", "Jul 17", "Medium", { Audience: "Hospitality", Spend: "€9K", ROAS: "4.6x" }, "Variant B wins on CTA clarity."),
      record("CMP-603", "Automation webinar", "Audience: operations leaders", "Draft", "Content", "€0", "Jul 25", "Low", { Audience: "Operations", Spend: "€0", ROAS: "N/A" }, "Needs speaker bio."),
      record("CMP-604", "Retail margin report", "Audience: commerce operators", "Paused", "Growth", "€24K", "Jul 10", "Medium", { Audience: "Retail", Spend: "€6K", ROAS: "3.8x" }, "Paused due to high CPC."),
      record("CMP-605", "CRM pipeline playbook", "Audience: sales teams", "Won", "Growth", "€118K", "Jul 08", "Low", { Audience: "Revenue", Spend: "€14K", ROAS: "8.4x" }, "Repurpose for nurture."),
    ],
    tableColumns: [
      { label: "Campaign", key: "title" },
      { label: "Audience", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Revenue", key: "value" },
      { label: "Date", key: "date" },
    ],
    notifications: ["CRM playbook campaign reached 8.4x ROAS", "Retail margin report paused due to CPC", "Clinic OS launch is above conversion target"],
    aiPrompts: [
      { label: "Explain ROAS", result: "Email and CRM content have the strongest ROAS because they target high-intent audiences with lower spend." },
      { label: "Draft campaign", result: "Campaign brief drafted with audience, offer, CTA, three email angles, and landing page sections." },
      { label: "Suggest experiment", result: "Test a proof-led headline against the current feature-led headline for hospitality owners." },
    ],
    createTemplate: { status: "Draft", owner: "Growth", value: "€0", priority: "Medium", fields: { Audience: "New audience", Spend: "€0", ROAS: "N/A" } },
    emptyMessage: "No campaigns match this audience, status, or attribution filter.",
  },
  {
    productId: "scheduling",
    dashboardTitle: "Scheduling control",
    recordName: "booking",
    recordNamePlural: "bookings",
    primaryModule: "Calendar",
    modules: ["Calendar", "Bookings", "Resources", "Availability", "Appointment Creation", "Conflict Prevention", "Reminders"],
    statuses: ["Confirmed", "Pending", "Conflict", "Rescheduled", "Completed", "Cancelled"],
    defaultStatus: "Pending",
    metrics: [
      { label: "Bookings", value: "684", comparison: "+18%" },
      { label: "Capacity", value: "92%", comparison: "+7 pts" },
      { label: "Conflicts", value: "3", comparison: "-6 this week" },
      { label: "No-shows", value: "3.1%", comparison: "-2 pts" },
    ],
    chart: {
      title: "Calendar utilization",
      subtitle: "Bookings, capacity, conflicts, and reminders",
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      series: [
        { name: "Bookings", color: colors.cyan, unit: "bookings", values: [112, 98, 126, 118, 142, 88] },
        { name: "Capacity %", color: colors.green, unit: "%", values: [86, 82, 94, 91, 96, 78] },
        { name: "Conflicts", color: colors.pink, unit: "conflicts", values: [1, 0, 2, 0, 3, 0] },
      ],
    },
    records: [
      record("BKG-501", "Discovery call · Northline", "Product: Automation", "Confirmed", "Sales", "30 min", "Tue 10:00", "Medium", { Resource: "Mira", Method: "Video", Reminder: "Sent" }, "Calendar invite sent."),
      record("BKG-502", "Clinic onboarding", "Product: Clinic OS", "Conflict", "Implementation", "60 min", "Wed 14:00", "Critical", { Resource: "Noah", Method: "Video", Reminder: "Pending" }, "Conflict with doctor schedule workshop."),
      record("BKG-503", "Gym churn review", "Product: Gym OS", "Pending", "Sales", "30 min", "Thu 11:30", "High", { Resource: "Mira", Method: "Phone", Reminder: "Queued" }, "Awaiting prospect confirmation."),
      record("BKG-504", "Retail inventory mapping", "Product: Retail OS", "Confirmed", "Implementation", "45 min", "Fri 09:00", "Medium", { Resource: "Noah", Method: "Video", Reminder: "Sent" }, "Bring supplier CSV."),
      record("BKG-505", "Finance demo follow-up", "Product: Finance", "Completed", "Sales", "30 min", "Mon 15:00", "Low", { Resource: "Mira", Method: "Video", Reminder: "Sent" }, "Follow-up email generated."),
    ],
    tableColumns: [
      { label: "Booking", key: "title" },
      { label: "Context", key: "subtitle" },
      { label: "Status", key: "status" },
      { label: "Owner", key: "owner" },
      { label: "Duration", key: "value" },
      { label: "Slot", key: "date" },
    ],
    notifications: ["Clinic onboarding has a resource conflict", "Friday capacity will reach 96%", "Three reminders are queued"],
    aiPrompts: [
      { label: "Prevent conflict", result: "Move Clinic onboarding to Wednesday 15:30 or assign Mira. Both options keep capacity below 92%." },
      { label: "Draft reminder", result: "Reminder drafted with selected product, meeting topic, timezone, and rescheduling link." },
      { label: "Optimize availability", result: "Open two Thursday afternoon slots. Demand is high and no resource conflict is predicted." },
    ],
    createTemplate: { status: "Pending", owner: "Sales", value: "30 min", priority: "Medium", fields: { Resource: "Mira", Method: "Video", Reminder: "Queued" } },
    emptyMessage: "No bookings match this resource, availability, or conflict filter.",
  },
];

export const workspaceConfigById = Object.fromEntries(
  workspaceConfigs.map((config) => [config.productId, config]),
) as Record<string, WorkspaceConfig>;

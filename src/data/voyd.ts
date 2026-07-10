import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  CalendarClock,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Dumbbell,
  FileText,
  Headphones,
  HeartPulse,
  Hotel,
  LineChart,
  MessageSquare,
  Package,
  ReceiptText,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Utensils,
  Users,
  Workflow,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
};

export type ProductRecord = {
  name: string;
  context: string;
  status: string;
  owner: string;
  value: string;
};

export type WorkspaceMetric = {
  label: string;
  value: string;
  trend: string;
};

export type PlatformProduct = {
  id: string;
  name: string;
  shortName: string;
  category: string;
  description: string;
  metric: string;
  impact: string;
  features: string[];
  businessBenefits: string[];
  aiCapabilities: string[];
  modules: string[];
  workspaceMetrics: WorkspaceMetric[];
  records: ProductRecord[];
  chart: number[];
  activity: string[];
  accent: "violet" | "cyan" | "pink" | "green" | "amber";
  icon: LucideIcon;
};

export type ProductPhase = {
  tier: "production" | "roadmap";
  label: string;
  summary: string;
  cta: string;
  workspaceMode: string;
  workspaceNote: string;
};

export type Solution = {
  title: string;
  description: string;
  outcomes: string[];
  icon: LucideIcon;
};

export type Industry = {
  name: string;
  description: string;
  systems: string[];
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { label: "Platform", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Solutions", href: "/solutions" },
  { label: "Industries", href: "/industries" },
  { label: "Documentation", href: "/documentation" },
  { label: "Pricing", href: "/pricing" },
  { label: "Company", href: "/company" },
];

const sharedModules = [
  "Command Center",
  "Analytics",
  "Customers",
  "Workflows",
  "Activity",
  "Users",
  "Roles",
  "Settings",
  "AI Assistant",
];

const recordSet = (prefix: string): ProductRecord[] => [
  {
    name: `${prefix}-1048`,
    context: "Enterprise account",
    status: "In review",
    owner: "Operations",
    value: "$12,480",
  },
  {
    name: `${prefix}-1049`,
    context: "Priority workflow",
    status: "Automated",
    owner: "AI Agent",
    value: "$8,240",
  },
  {
    name: `${prefix}-1050`,
    context: "Customer request",
    status: "Waiting",
    owner: "Success",
    value: "$3,920",
  },
  {
    name: `${prefix}-1051`,
    context: "Monthly cycle",
    status: "Approved",
    owner: "Finance",
    value: "$18,300",
  },
  {
    name: `${prefix}-1052`,
    context: "New opportunity",
    status: "Draft",
    owner: "Sales",
    value: "$6,780",
  },
];

export const products: PlatformProduct[] = [
  {
    id: "restaurant-os",
    name: "Restaurant OS",
    shortName: "Restaurant",
    category: "Hospitality",
    description: "A command center for orders, reservations, kitchen flow, guests, invoices, and AI menu intelligence.",
    metric: "Operations command center",
    impact: "Orders, tables, kitchen flow, reservations, and receipts in one workspace.",
    features: ["Orders", "Reservations", "Kitchen queue", "Invoices", "Inventory"],
    businessBenefits: ["Increase table turns", "Reduce waste", "Forecast demand"],
    aiCapabilities: ["Menu suggestions", "Demand prediction", "Guest summaries"],
    modules: ["Dashboard", "Orders", "Reservations", "Kitchen", "Inventory", "Invoices", ...sharedModules],
    workspaceMetrics: [
      { label: "Today revenue", value: "$24.8K", trend: "+12.4%" },
      { label: "Orders", value: "186", trend: "+8.1%" },
      { label: "Reservations", value: "42", trend: "94% confirmed" },
      { label: "Avg. ticket", value: "$32.40", trend: "+5.6%" },
    ],
    records: recordSet("ORD"),
    chart: [36, 48, 42, 64, 58, 76, 88],
    activity: ["AI flagged a dinner rush at 19:30", "Kitchen queue synced with reservations", "Three invoices exported"],
    accent: "amber",
    icon: Utensils,
  },
  {
    id: "clinic-os",
    name: "Clinic OS",
    shortName: "Clinic",
    category: "Healthcare operations",
    description: "Scheduling, patient flow, care tasks, billing, reminders, and secure operational intelligence.",
    metric: "Patient flow workspace",
    impact: "Schedules, care tasks, reminders, and billing stay connected.",
    features: ["Appointments", "Patients", "Care tasks", "Billing", "Reminders"],
    businessBenefits: ["Protect capacity", "Improve follow-up", "Accelerate admin"],
    aiCapabilities: ["Visit summaries", "No-show prediction", "Reminder drafting"],
    modules: ["Appointments", "Patients", "Care Plans", "Billing", "Reminders", ...sharedModules],
    workspaceMetrics: [
      { label: "Appointments", value: "74", trend: "+9 scheduled" },
      { label: "Utilization", value: "91%", trend: "+6.2%" },
      { label: "Open tasks", value: "23", trend: "-11%" },
      { label: "Claims ready", value: "$36K", trend: "+14%" },
    ],
    records: recordSet("APT"),
    chart: [44, 52, 61, 57, 73, 69, 84],
    activity: ["AI drafted 12 appointment reminders", "Care task backlog reduced", "Revenue report generated"],
    accent: "cyan",
    icon: HeartPulse,
  },
  {
    id: "retail-os",
    name: "Retail OS",
    shortName: "Retail",
    category: "Commerce",
    description: "Supermarket operations for barcode products, POS lanes, stock, suppliers, promotions, customers, and returns.",
    metric: "Supermarket control system",
    impact: "Products, cash registers, warehouse stock, suppliers, and promotions stay connected.",
    features: ["Barcode", "POS lanes", "Stock", "Warehouse", "Suppliers"],
    businessBenefits: ["Avoid stockouts", "Control registers", "Coordinate suppliers"],
    aiCapabilities: ["Inventory AI", "Promotion planning", "Return pattern analysis"],
    modules: ["Products", "Barcode", "POS", "Stock", "Warehouse", "Suppliers", "Promotions", "Customers", "Returns", "Cash Register", "Inventory AI"],
    workspaceMetrics: [
      { label: "Store sales", value: "$68K", trend: "+17.1%" },
      { label: "Sell-through", value: "82%", trend: "+5.4%" },
      { label: "At-risk SKUs", value: "16", trend: "-9" },
      { label: "Return rate", value: "3.8%", trend: "-1.2%" },
    ],
    records: recordSet("RTL"),
    chart: [29, 46, 53, 61, 67, 78, 72],
    activity: ["AI identified 4 replenishment risks", "Weekend promotion exported", "Returns summary posted"],
    accent: "green",
    icon: Store,
  },
  {
    id: "gym-os",
    name: "Gym OS",
    shortName: "Gym",
    category: "Fitness",
    description: "Memberships, attendance, classes, coach workflows, payments, body progress, and AI recommendations.",
    metric: "Member operations system",
    impact: "Attendance, subscriptions, coaching, payments, and progress stay visible.",
    features: ["Attendance", "Members", "Subscriptions", "Classes", "Body progress"],
    businessBenefits: ["Reduce churn", "Fill classes", "Automate follow-up"],
    aiCapabilities: ["Coach recommendations", "Churn prediction", "Progress summaries"],
    modules: ["Attendance", "Members", "Subscriptions", "Coach", "Classes", "Payments", "Body Progress", ...sharedModules],
    workspaceMetrics: [
      { label: "Check-ins", value: "429", trend: "+16%" },
      { label: "Active members", value: "1,284", trend: "+38" },
      { label: "Paid plans", value: "96%", trend: "+2.8%" },
      { label: "Class fill", value: "87%", trend: "+9%" },
    ],
    records: recordSet("MBR"),
    chart: [38, 41, 66, 62, 74, 83, 79],
    activity: ["AI generated coach plans for 18 members", "Late payments queued", "Two classes reached waitlist"],
    accent: "violet",
    icon: Dumbbell,
  },
  {
    id: "crm",
    name: "Business CRM",
    shortName: "CRM",
    category: "Revenue",
    description: "Leads, companies, pipeline, meetings, tasks, invoices, documents, automation, and AI sales assistance.",
    metric: "Context-rich pipeline",
    impact: "Leads, company context, commercial documents, and next actions stay in one revenue workspace.",
    features: ["Leads", "Companies", "Meetings", "Invoices", "Documents"],
    businessBenefits: ["Shorten cycles", "Improve handoffs", "Forecast revenue"],
    aiCapabilities: ["AI Sales Assistant", "Email drafts", "Deal risk analysis"],
    modules: ["Leads", "Companies", "Pipeline", "Meetings", "Tasks", "Invoices", "Documents", "Automation", "AI Sales Assistant"],
    workspaceMetrics: [
      { label: "Pipeline", value: "$1.8M", trend: "+21%" },
      { label: "Qualified deals", value: "48", trend: "+7" },
      { label: "Follow-ups", value: "124", trend: "AI queued" },
      { label: "Forecast", value: "92%", trend: "+4%" },
    ],
    records: recordSet("CRM"),
    chart: [42, 48, 59, 63, 72, 71, 86],
    activity: ["AI summarized 9 enterprise accounts", "Forecast updated", "Follow-up emails drafted"],
    accent: "cyan",
    icon: Users,
  },
  {
    id: "pos",
    name: "POS",
    shortName: "POS",
    category: "Transactions",
    description: "A modern transaction layer for payments, refunds, catalog sync, discounts, and real-time revenue.",
    metric: "Configurable checkout flow",
    impact: "A prototype transaction layer connected to the rest of the business.",
    features: ["Payments", "Refunds", "Discounts", "Catalog", "Receipts"],
    businessBenefits: ["Speed up checkout flow", "Control exceptions", "Track live revenue"],
    aiCapabilities: ["Fraud signals", "Receipt summaries", "Price suggestions"],
    modules: ["Registers", "Payments", "Refunds", "Catalog", "Receipts", ...sharedModules],
    workspaceMetrics: [
      { label: "Net sales", value: "$92K", trend: "+11%" },
      { label: "Transactions", value: "2,418", trend: "+18%" },
      { label: "Refunds", value: "1.6%", trend: "-0.8%" },
      { label: "Sync state", value: "Healthy", trend: "catalog connected" },
    ],
    records: recordSet("PAY"),
    chart: [46, 50, 58, 77, 72, 89, 81],
    activity: ["Register health check passed", "AI flagged unusual refunds", "Catalog synced"],
    accent: "green",
    icon: CreditCard,
  },
  {
    id: "finance",
    name: "Finance",
    shortName: "Finance",
    category: "Back office",
    description: "Invoices, expenses, cash flow, approvals, forecasts, and AI finance operations in one place.",
    metric: "Finance control layer",
    impact: "Approvals, invoices, expenses, and forecasts move from one source of truth.",
    features: ["Invoices", "Expenses", "Approvals", "Cash flow", "Forecasts"],
    businessBenefits: ["Close with structure", "Control spend", "Improve planning"],
    aiCapabilities: ["Invoice generation", "Variance analysis", "Cash trend prediction"],
    modules: ["Cash Flow", "Invoices", "Expenses", "Approvals", "Forecasts", ...sharedModules],
    workspaceMetrics: [
      { label: "Cash runway", value: "14.2 mo", trend: "+1.1" },
      { label: "Invoices due", value: "$124K", trend: "-18%" },
      { label: "Approvals", value: "32", trend: "8 urgent" },
      { label: "Variance", value: "4.2%", trend: "-1.4%" },
    ],
    records: recordSet("FIN"),
    chart: [55, 48, 64, 60, 75, 70, 82],
    activity: ["AI generated invoice drafts", "Budget variance explained", "Expense policy exceptions routed"],
    accent: "violet",
    icon: CircleDollarSign,
  },
  {
    id: "inventory",
    name: "Inventory",
    shortName: "Inventory",
    category: "Operations",
    description: "Stock, suppliers, purchase orders, transfer rules, low-stock alerts, and demand prediction.",
    metric: "Stock control system",
    impact: "Items, warehouses, suppliers, purchase orders, and reorder rules stay coordinated.",
    features: ["Stock levels", "Suppliers", "Purchase orders", "Transfers", "Alerts"],
    businessBenefits: ["Prevent shortages", "Reduce carrying cost", "Coordinate suppliers"],
    aiCapabilities: ["Demand forecasts", "Reorder automation", "Supplier risk"],
    modules: ["Stock", "Suppliers", "Purchase Orders", "Transfers", "Alerts", ...sharedModules],
    workspaceMetrics: [
      { label: "Stock accuracy", value: "98%", trend: "+3%" },
      { label: "Low stock", value: "21", trend: "-12" },
      { label: "POs open", value: "46", trend: "+6" },
      { label: "Demand fit", value: "91%", trend: "+7%" },
    ],
    records: recordSet("INV"),
    chart: [31, 44, 52, 68, 63, 80, 76],
    activity: ["AI created reorder plan", "Supplier delay predicted", "Transfer rules updated"],
    accent: "amber",
    icon: Package,
  },
  {
    id: "analytics",
    name: "Analytics",
    shortName: "Analytics",
    category: "Intelligence",
    description: "A business intelligence layer with live metrics, executive dashboards, cohorts, and AI explanations.",
    metric: "Live operating model",
    impact: "Leadership sees what changed, why it changed, and what to do next.",
    features: ["Dashboards", "Cohorts", "Reports", "Alerts", "Data sync"],
    businessBenefits: ["Align leadership", "Spot risk early", "Measure outcomes"],
    aiCapabilities: ["Insight narratives", "Trend prediction", "Report generation"],
    modules: ["Executive View", "Reports", "Cohorts", "Alerts", "Data Sources", ...sharedModules],
    workspaceMetrics: [
      { label: "Data sources", value: "38", trend: "synced" },
      { label: "Reports", value: "114", trend: "+22" },
      { label: "Alerts", value: "7", trend: "3 critical" },
      { label: "Confidence", value: "94%", trend: "+5%" },
    ],
    records: recordSet("BI"),
    chart: [48, 59, 55, 72, 76, 85, 91],
    activity: ["AI explained conversion variance", "Executive report exported", "Revenue alert opened"],
    accent: "cyan",
    icon: BarChart3,
  },
  {
    id: "hr",
    name: "HR",
    shortName: "HR",
    category: "People",
    description: "Hiring, onboarding, time off, policy workflows, performance signals, and employee support.",
    metric: "People operations hub",
    impact: "Hiring, onboarding, leave, payroll, and policy support stay auditable.",
    features: ["Hiring", "Onboarding", "Time off", "Policies", "Performance"],
    businessBenefits: ["Improve onboarding", "Reduce admin", "Track team health"],
    aiCapabilities: ["Policy assistant", "Onboarding plans", "Performance summaries"],
    modules: ["Hiring", "Employees", "Onboarding", "Time Off", "Policies", ...sharedModules],
    workspaceMetrics: [
      { label: "Open roles", value: "12", trend: "+3" },
      { label: "Onboarding", value: "28", trend: "92% on track" },
      { label: "Requests", value: "64", trend: "-18%" },
      { label: "Policy answers", value: "418", trend: "AI handled" },
    ],
    records: recordSet("HR"),
    chart: [28, 36, 52, 61, 69, 74, 82],
    activity: ["AI answered policy questions", "New onboarding checklist shipped", "Hiring pipeline updated"],
    accent: "pink",
    icon: Building2,
  },
  {
    id: "automation",
    name: "Automation",
    shortName: "Automation",
    category: "Workflow",
    description: "Trigger-based workflows across tools, approvals, messages, records, and AI-generated actions.",
    metric: "Workflow execution layer",
    impact: "Manual handoffs become reliable, monitored systems.",
    features: ["Triggers", "Approvals", "Agents", "Connectors", "Audit logs"],
    businessBenefits: ["Reduce manual work", "Control execution", "Scale operations"],
    aiCapabilities: ["Workflow generation", "Exception handling", "Natural language rules"],
    modules: ["Builder", "Triggers", "Approvals", "Agents", "Connectors", "Audit", ...sharedModules],
    workspaceMetrics: [
      { label: "Runs today", value: "8,924", trend: "+31%" },
      { label: "Manual hours modeled", value: "186", trend: "+24" },
      { label: "Exceptions", value: "11", trend: "-34%" },
      { label: "SLA hit", value: "98.7%", trend: "+2.1%" },
    ],
    records: recordSet("AUT"),
    chart: [61, 58, 69, 74, 81, 86, 92],
    activity: ["AI proposed workflow from support backlog", "Connector health verified", "Approval SLA improved"],
    accent: "violet",
    icon: Workflow,
  },
  {
    id: "customer-support",
    name: "Customer Support",
    shortName: "Support",
    category: "Service",
    description: "Tickets, SLAs, knowledge base, sentiment, customer history, and AI-assisted support operations.",
    metric: "SLA-aware support",
    impact: "Tickets, agents, customer history, and AI replies stay coordinated.",
    features: ["Tickets", "SLAs", "Knowledge base", "Sentiment", "Escalations"],
    businessBenefits: ["Reduce backlog", "Protect SLAs", "Improve customer experience"],
    aiCapabilities: ["Ticket summaries", "Reply drafting", "Escalation prediction"],
    modules: ["Inbox", "Tickets", "SLA Monitor", "Knowledge Base", "Escalations", ...sharedModules],
    workspaceMetrics: [
      { label: "Tickets open", value: "342", trend: "-18%" },
      { label: "SLA health", value: "96%", trend: "+4%" },
      { label: "CSAT", value: "4.8", trend: "+0.3" },
      { label: "AI resolved", value: "41%", trend: "+12%" },
    ],
    records: recordSet("SUP"),
    chart: [52, 54, 62, 69, 78, 73, 88],
    activity: ["AI summarized 26 customer threads", "Escalation routed to manager", "Knowledge article suggested"],
    accent: "green",
    icon: Headphones,
  },
  {
    id: "marketing",
    name: "Marketing",
    shortName: "Marketing",
    category: "Growth",
    description: "Campaigns, content, segments, attribution, landing pages, and AI creative operations.",
    metric: "Campaign operating layer",
    impact: "Campaigns, audiences, content, experiments, and attribution stay connected.",
    features: ["Campaigns", "Segments", "Content", "Attribution", "Experiments"],
    businessBenefits: ["Improve conversion", "Ship campaigns consistently", "See revenue impact"],
    aiCapabilities: ["Campaign briefs", "Copy generation", "Audience insights"],
    modules: ["Campaigns", "Segments", "Content", "Attribution", "Experiments", ...sharedModules],
    workspaceMetrics: [
      { label: "Pipeline sourced", value: "$420K", trend: "+26%" },
      { label: "Conversion", value: "8.7%", trend: "+1.4%" },
      { label: "Segments", value: "34", trend: "+6" },
      { label: "Assets ready", value: "128", trend: "+42" },
    ],
    records: recordSet("MKT"),
    chart: [33, 45, 49, 67, 72, 78, 86],
    activity: ["AI drafted campaign variant", "Attribution report generated", "Segment anomaly detected"],
    accent: "pink",
    icon: MessageSquare,
  },
  {
    id: "scheduling",
    name: "Scheduling",
    shortName: "Scheduling",
    category: "Coordination",
    description: "Calendar capacity, bookings, staff allocation, reminders, resource planning, and AI optimization.",
    metric: "Capacity planning workspace",
    impact: "Bookings, resources, reminders, and conflicts stay visible.",
    features: ["Calendar", "Bookings", "Staff", "Resources", "Reminders"],
    businessBenefits: ["Optimize capacity", "Reduce no-shows", "Coordinate teams"],
    aiCapabilities: ["Schedule optimization", "Reminder writing", "Capacity prediction"],
    modules: ["Calendar", "Bookings", "Staff", "Resources", "Reminders", ...sharedModules],
    workspaceMetrics: [
      { label: "Bookings", value: "684", trend: "+18%" },
      { label: "Capacity", value: "92%", trend: "+7%" },
      { label: "No-shows", value: "3.1%", trend: "-2%" },
      { label: "Reminders", value: "1,240", trend: "AI sent" },
    ],
    records: recordSet("SCH"),
    chart: [41, 43, 57, 64, 71, 85, 80],
    activity: ["AI filled 14 schedule gaps", "Reminder campaign sent", "Resource conflict resolved"],
    accent: "cyan",
    icon: CalendarClock,
  },
];

export const productionProductIds = ["restaurant-os", "retail-os", "crm"] as const;

export const productPhaseLabels: Record<string, string> = {
  "clinic-os": "Private Beta",
  "gym-os": "Early Access",
  pos: "Roadmap",
  finance: "Enterprise Preview",
  inventory: "Enterprise Preview",
  analytics: "Private Beta",
  hr: "Launching Soon",
  automation: "Under Active Development",
  "customer-support": "Early Access",
  marketing: "Enterprise Preview",
  scheduling: "Available Soon",
};

export function getProductPhase(productOrId: PlatformProduct | string): ProductPhase {
  const productId = typeof productOrId === "string" ? productOrId : productOrId.id;
  const isProduction = productionProductIds.includes(productId as (typeof productionProductIds)[number]);

  if (isProduction) {
    return {
      tier: "production",
      label: "Production Experience",
      summary: "A mature VOYD flagship workspace built to be explored as a complete business operating system.",
      cta: "Launch Production Workspace",
      workspaceMode: "Production Experience",
      workspaceNote: "Flagship workspace with connected operational workflows.",
    };
  }

  const label = productPhaseLabels[productId] ?? "Ecosystem Roadmap";
  return {
    tier: "roadmap",
    label,
    summary: "This product is currently being expanded as part of the VOYD ecosystem roadmap.",
    cta: "Open Enterprise Preview",
    workspaceMode: label,
    workspaceNote: "Preview workspace for early-access conversations.",
  };
}

export const productionProducts = products.filter((product) => getProductPhase(product).tier === "production");
export const roadmapProducts = products.filter((product) => getProductPhase(product).tier === "roadmap");

export const platformLayers = [
  {
    title: "Operating data",
    description: "Customer, revenue, workflow, inventory, and activity data modeled around the business.",
    icon: ClipboardList,
  },
  {
    title: "AI execution",
    description: "Agents summarize, forecast, draft, route, and automate work with human approval paths.",
    icon: Bot,
  },
  {
    title: "Workflow control",
    description: "Role-based actions, approvals, notifications, exports, and audit trails in one system.",
    icon: Settings2,
  },
  {
    title: "Business intelligence",
    description: "Dashboards and AI explanations that show what changed, why it matters, and what to do.",
    icon: LineChart,
  },
];

export const solutions: Solution[] = [
  {
    title: "Replace scattered tools",
    description: "Unify spreadsheets, inboxes, CRMs, booking tools, and finance workflows into one operating layer.",
    outcomes: ["Single source of truth", "Less duplicate work", "Cleaner ownership"],
    icon: RefreshCcw,
  },
  {
    title: "Automate operational work",
    description: "Turn repeatable actions into monitored workflows with approvals, roles, and exception handling.",
    outcomes: ["Fewer manual handoffs", "Visible workflow status", "AI-generated actions"],
    icon: Workflow,
  },
  {
    title: "Create executive intelligence",
    description: "Give leadership live dashboards, reliable reporting, and AI narratives for business changes.",
    outcomes: ["Forecast risk early", "Explain metric movement", "Export board-ready reports"],
    icon: BarChart3,
  },
  {
    title: "Upgrade customer operations",
    description: "Connect customer context, support, billing, scheduling, and communication in one workspace.",
    outcomes: ["Faster response", "Better retention", "Consistent service quality"],
    icon: Sparkles,
  },
];

export const industries: Industry[] = [
  {
    name: "Hospitality",
    description: "Restaurants, hotels, venues, and service teams operating with reservations, guests, staff, and revenue in sync.",
    systems: ["Restaurant OS", "Hotel OS", "Scheduling", "Finance"],
    icon: Hotel,
  },
  {
    name: "Healthcare",
    description: "Clinics and private practices managing appointments, patient operations, reminders, and billing workflows.",
    systems: ["Clinic OS", "Scheduling", "Customer Support", "Analytics"],
    icon: HeartPulse,
  },
  {
    name: "Retail and commerce",
    description: "Stores and e-commerce operators connecting POS, inventory, marketing, customer support, and analytics.",
    systems: ["Retail OS", "POS", "Inventory", "Marketing"],
    icon: ShoppingBag,
  },
  {
    name: "Fitness and wellness",
    description: "Gyms, studios, coaches, and memberships managed through attendance, payments, classes, and AI coaching.",
    systems: ["Gym OS", "Scheduling", "Finance", "Automation"],
    icon: Dumbbell,
  },
  {
    name: "Professional services",
    description: "Consultancies, law firms, agencies, and local operators standardizing clients, work, invoices, and delivery.",
    systems: ["CRM", "Finance", "Automation", "Analytics"],
    icon: FileText,
  },
  {
    name: "Operations teams",
    description: "Internal business teams replacing fragile spreadsheet processes with controlled AI operating systems.",
    systems: ["Automation", "HR", "Inventory", "Customer Support"],
    icon: Activity,
  },
];

export const pricingPlans = [
  {
    name: "Launch",
    price: "Custom",
    description: "For teams validating the first operating system around one workflow or department.",
    features: ["One product workspace", "Core data model", "AI assistant", "Launch analytics", "30-day iteration window"],
  },
  {
    name: "Operating System",
    price: "Custom",
    description: "For companies replacing multiple tools with a connected business platform.",
    features: ["Multi-product platform", "Automation workflows", "Role controls", "Integrations plan", "Executive dashboards"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Sales-led",
    description: "For organizations requiring governance, security review, procurement support, and custom rollout.",
    features: ["Advanced permissions", "Audit-ready workflows", "Custom AI actions", "Deployment support", "Roadmap partnership"],
  },
];

export const documentationTopics = [
  "Platform overview",
  "Workspace architecture",
  "AI assistant actions",
  "Data model",
  "Workflow automation",
  "Roles and permissions",
  "Exports and reporting",
  "Deployment checklist",
];

export const companyPrinciples = [
  "Software should clarify operations, not add another layer of work.",
  "AI belongs inside controlled workflows with context, permissions, and human review.",
  "Every interface should make the business easier to understand and easier to run.",
  "The best platforms feel calm because the complexity is handled by the system.",
];

export const governanceItems = [
  { label: "Role controls", icon: ShieldCheck },
  { label: "Audit trails", icon: ReceiptText },
  { label: "AI approvals", icon: Bot },
  { label: "Export-ready data", icon: FileText },
];

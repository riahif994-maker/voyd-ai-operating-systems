import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Bot,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  Download,
  Filter,
  Layers,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { getProductPhase, type PlatformProduct, type ProductPhase } from "../../data/voyd";
import {
  workspaceConfigById,
  type WorkspaceConfig,
  type WorkspaceRecord,
} from "../../data/workspaces";
import { BusinessChart } from "./BusinessChart";

type ProductWorkspaceProps = {
  product: PlatformProduct;
  onClose: () => void;
};

type RecordFormState = {
  title: string;
  subtitle: string;
  status: string;
  owner: string;
  value: string;
  date: string;
  priority: WorkspaceRecord["priority"];
  notes: string;
  fields: Record<string, string>;
};

type AiMessage = {
  role: "user" | "assistant";
  text: string;
};

type Toast = {
  id: number;
  type: "success" | "error" | "info";
  message: string;
};

const pageSize = 4;
const priorities: WorkspaceRecord["priority"][] = ["Low", "Medium", "High", "Critical"];
const shortcuts = ["Ctrl K", "N create", "E export", "Esc close"];

function storageKey(productId: string) {
  return `voyd-workspace:${productId}`;
}

function cloneRecords(records: WorkspaceRecord[]) {
  return records.map((record) => ({ ...record, fields: { ...record.fields } }));
}

function getField(record: WorkspaceRecord, key: string) {
  if (key in record) {
    return String(record[key as keyof WorkspaceRecord] ?? "");
  }
  return record.fields[key] ?? "";
}

function createInitialForm(config: WorkspaceConfig): RecordFormState {
  return {
    title: "",
    subtitle: "",
    status: config.defaultStatus,
    owner: config.createTemplate.owner ?? "Operations",
    value: config.createTemplate.value ?? "0",
    date: "Today",
    priority: config.createTemplate.priority ?? "Medium",
    notes: "",
    fields: { ...(config.createTemplate.fields ?? {}) },
  };
}

function formFromRecord(record: WorkspaceRecord): RecordFormState {
  return {
    title: record.title,
    subtitle: record.subtitle,
    status: record.status,
    owner: record.owner,
    value: record.value,
    date: record.date,
    priority: record.priority,
    notes: record.notes,
    fields: { ...record.fields },
  };
}

function csvEscape(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildCsv(config: WorkspaceConfig, records: WorkspaceRecord[]) {
  const fieldKeys = Array.from(new Set(records.flatMap((record) => Object.keys(record.fields))));
  const headers = ["id", "title", "subtitle", "status", "owner", "value", "date", "priority", ...fieldKeys, "notes"];
  const rows = records.map((record) =>
    headers
      .map((header) => {
        if (header in record && header !== "fields") {
          return csvEscape(String(record[header as keyof WorkspaceRecord] ?? ""));
        }
        return csvEscape(record.fields[header] ?? "");
      })
      .join(","),
  );
  return [`# VOYD ${config.recordNamePlural} export`, headers.join(","), ...rows].join("\n");
}

function nextId(config: WorkspaceConfig, records: WorkspaceRecord[]) {
  const prefix = config.records[0]?.id.split("-")[0] ?? config.recordName.slice(0, 3).toUpperCase();
  const numeric = records
    .map((record) => Number(record.id.split("-")[1]))
    .filter((value) => Number.isFinite(value));
  return `${prefix}-${Math.max(...numeric, 1000) + 1}`;
}

function buildAiResponse(config: WorkspaceConfig, records: WorkspaceRecord[], prompt: string) {
  const statusCounts = config.statuses
    .map((status) => `${status}: ${records.filter((record) => record.status === status).length}`)
    .filter((line) => !line.endsWith(": 0"))
    .join(", ");
  const critical = records.filter((record) => record.priority === "Critical" || record.priority === "High");
  const chartLead = config.chart.series[0];
  const chartPeakIndex = chartLead.values.indexOf(Math.max(...chartLead.values));
  const peakLabel = config.chart.labels[chartPeakIndex] ?? "the latest period";

  const lower = prompt.toLowerCase();
  if (lower.includes("email") || lower.includes("draft") || lower.includes("reply")) {
    return `Interactive AI simulation: drafted a ${config.recordName}-specific update for ${config.recordNamePlural}. It references ${critical[0]?.title ?? "the highest priority record"}, current status mix (${statusCounts || "no open statuses"}), and asks the owner to confirm the next action.`;
  }
  if (lower.includes("risk") || lower.includes("predict") || lower.includes("trend")) {
    return `Interactive AI simulation: the strongest signal is ${chartLead.name} peaking at ${peakLabel}. ${critical.length} high-priority ${config.recordNamePlural} need review. The next best action is "${config.aiPrompts[0]?.label ?? "review priority records"}".`;
  }
  if (lower.includes("report") || lower.includes("summary") || lower.includes("summarize")) {
    return `Interactive AI simulation: ${config.dashboardTitle} summary generated. ${records.length} ${config.recordNamePlural} are visible, ${statusCounts || "all statuses are clear"}, and ${config.metrics[0].label.toLowerCase()} is ${config.metrics[0].value}.`;
  }
  return `Interactive AI simulation: I reviewed ${records.length} ${config.recordNamePlural}, the ${config.chart.title.toLowerCase()} chart, and the current filters. Recommended action: ${config.aiPrompts[0]?.result ?? "review the highest-priority records first"}`;
}

function ProductSpecificPanel({
  config,
  records,
  activeModule,
  phase,
  onOpenReceipt,
  onToast,
}: {
  config: WorkspaceConfig;
  records: WorkspaceRecord[];
  activeModule: string;
  phase: ProductPhase;
  onOpenReceipt: (record: WorkspaceRecord) => void;
  onToast: (message: string, type?: Toast["type"]) => void;
}) {
  const [cart, setCart] = useState([
    { name: "Core license", qty: 1, price: 420 },
    { name: "Implementation", qty: 1, price: 980 },
    { name: "AI workflow pack", qty: 1, price: 240 },
  ]);
  const [discount, setDiscount] = useState(5);
  const [paymentOpen, setPaymentOpen] = useState(false);

  const total = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discountedTotal = Math.round(total * (1 - discount / 100));

  if (phase.tier === "production" && config.productId === "retail-os") {
    const lanes = [
      ["Lane 01", "Open", "€4,820", "Card focus"],
      ["Lane 02", "Supervisor", "€3,140", "Return check"],
      ["Self-checkout", "6 active", "€2,980", "1 age check"],
    ];
    const stock = [
      ["4011", "Organic bananas", "18 crates", "Transfer from warehouse"],
      ["5512", "Chicken breast", "Supplier hold", "Call Florin Foods"],
      ["2204", "Sourdough loaf", "Evening spike", "Bake 42 more"],
    ];

    return (
      <div className="workspace-panel product-specific-panel flagship-panel">
        <div className="panel-heading">
          <div>
            <small>Production workflow</small>
            <h3>Supermarket operations: {activeModule}</h3>
          </div>
          <button type="button" onClick={() => onToast("Inventory AI generated a reorder and transfer plan.", "success")}>
            Run Inventory AI
          </button>
        </div>
        <div className="flagship-grid">
          <div className="operating-card">
            <small>Barcode scanner</small>
            <strong>Next scan: 4011</strong>
            <span>Produce item mapped to aisle A1, supplier Freshline, and register promotion rules.</span>
          </div>
          <div className="operating-card">
            <small>Cash register lanes</small>
            {lanes.map(([lane, state, value, note]) => (
              <p key={lane}><span>{lane}</span><b>{state}</b><em>{value} · {note}</em></p>
            ))}
          </div>
          <div className="operating-card">
            <small>Warehouse and suppliers</small>
            {stock.map(([code, item, level, action]) => (
              <p key={code}><span>{code} · {item}</span><b>{level}</b><em>{action}</em></p>
            ))}
          </div>
          <div className="operating-card">
            <small>Promotions and returns</small>
            <strong>Household shelf-label mismatch</strong>
            <span>Return pattern is connected to register discount rules, shelf signage, and customer receipts.</span>
          </div>
        </div>
      </div>
    );
  }

  if (phase.tier === "production" && config.productId === "crm") {
    const pipeline = [
      ["Lead", "84", "AI qualification"],
      ["Proposal", "31", "Docs pending"],
      ["Negotiation", "18", "Security review"],
      ["Won", "11", "Kickoff ready"],
    ];
    const actions = [
      ["Meeting", "Arc Dental ROI call", "Today 14:30"],
      ["Task", "Send Northline security answers", "High priority"],
      ["Invoice", "Bistro Nova deposit", "Draft ready"],
      ["Document", "Retail OS proposal", "Needs approval"],
    ];

    return (
      <div className="workspace-panel product-specific-panel flagship-panel">
        <div className="panel-heading">
          <div>
            <small>Production workflow</small>
            <h3>Business CRM: {activeModule}</h3>
          </div>
          <button type="button" onClick={() => onToast("AI Sales Assistant prepared a follow-up sequence.", "success")}>
            Run Sales AI
          </button>
        </div>
        <div className="flagship-grid">
          <div className="operating-card">
            <small>Pipeline board</small>
            {pipeline.map(([stage, count, note]) => (
              <p key={stage}><span>{stage}</span><b>{count}</b><em>{note}</em></p>
            ))}
          </div>
          <div className="operating-card">
            <small>Commercial actions</small>
            {actions.map(([type, name, note]) => (
              <p key={name}><span>{type} · {name}</span><b>{note}</b></p>
            ))}
          </div>
          <div className="operating-card">
            <small>Automation</small>
            <strong>Proposal follow-up sequence</strong>
            <span>Creates task, drafts email, attaches document, and updates company activity.</span>
          </div>
          <div className="operating-card">
            <small>AI Sales Assistant</small>
            <strong>Northline risk summary</strong>
            <span>Procurement timing is the blocker. Recommended next action: send security answers and ask for buying timeline.</span>
          </div>
        </div>
      </div>
    );
  }

  if (config.productId === "pos") {
    return (
      <div className="workspace-panel product-specific-panel">
        <div className="panel-heading">
          <div>
            <small>Checkout simulation</small>
            <h3>Product selection and cart</h3>
          </div>
          <button type="button" onClick={() => setPaymentOpen(true)}>
            Open payment
          </button>
        </div>
        <div className="cart-list">
          {cart.map((item) => (
            <p key={item.name}>
              <span>{item.name}</span>
              <button
                type="button"
                onClick={() =>
                  setCart((items) =>
                    items.map((cartItem) =>
                      cartItem.name === item.name ? { ...cartItem, qty: Math.max(1, cartItem.qty - 1) } : cartItem,
                    ),
                  )
                }
              >
                -
              </button>
              <strong>{item.qty}</strong>
              <button
                type="button"
                onClick={() =>
                  setCart((items) =>
                    items.map((cartItem) =>
                      cartItem.name === item.name ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem,
                    ),
                  )
                }
              >
                +
              </button>
              <b>€{item.qty * item.price}</b>
            </p>
          ))}
        </div>
        <label className="discount-control">
          Discount %
          <input
            type="number"
            min="0"
            max="40"
            value={discount}
            onChange={(event) => setDiscount(Number(event.target.value))}
          />
        </label>
        <div className="cart-total">
          <span>Total after discount</span>
          <strong>€{discountedTotal}</strong>
        </div>
        <AnimatePresence>
          {paymentOpen ? (
            <motion.div className="inline-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <strong>Payment ready</strong>
              <p>Card payment simulation approved for €{discountedTotal}. Receipt can be exported from transaction detail.</p>
              <button
                type="button"
                onClick={() => {
                  setPaymentOpen(false);
                  onToast("Payment simulation completed. Receipt generated.", "success");
                }}
              >
                Confirm payment
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  if (phase.tier === "production" && config.productId === "restaurant-os") {
    const tableMap = [
      ["T12", "Mains firing", "4 guests"],
      ["T7", "Dessert next", "Birthday"],
      ["T3", "Allergy lock", "Critical"],
    ];
    const stations = [
      ["Grill", "6 tickets", "12 min"],
      ["Pantry", "4 tickets", "8 min"],
      ["Expo", "3 ready", "2 runners"],
    ];

    return (
      <div className="workspace-panel product-specific-panel flagship-panel">
        <div className="panel-heading">
          <div>
            <small>Production workflow</small>
            <h3>Restaurant service: {activeModule}</h3>
          </div>
          <button type="button" onClick={() => onToast("AI Restaurant Manager prioritized kitchen, allergy, and stock actions.", "success")}>
            Run Restaurant AI
          </button>
        </div>
        <div className="flagship-grid">
          <div className="operating-card">
            <small>Table map</small>
            {tableMap.map(([table, state, note]) => (
              <p key={table}><span>{table}</span><b>{state}</b><em>{note}</em></p>
            ))}
          </div>
          <div className="operating-card">
            <small>Kitchen stations</small>
            {stations.map(([station, load, timing]) => (
              <p key={station}><span>{station}</span><b>{load}</b><em>{timing}</em></p>
            ))}
          </div>
          <div className="operating-card">
            <small>Reservations and staff</small>
            <strong>19:30 wave arriving</strong>
            <span>2 hosts, 4 servers, and 3 kitchen stations aligned to current order pressure.</span>
          </div>
          <div className="operating-card">
            <small>Finance and inventory</small>
            <strong>Seabass stock risk</strong>
            <span>AI recommends switching server upsell after 21:00 and creating a supplier reorder.</span>
          </div>
        </div>
        <div className="connected-records">
          {records.slice(0, 3).map((record) => (
            <p className="service-row" key={record.id}>
              <span>{record.fields.Table ?? "Table"} · {record.title}</span>
              <strong>{record.status}</strong>
              <button type="button" onClick={() => onOpenReceipt(record)}>
                Receipt
              </button>
            </p>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-panel product-specific-panel">
      <div className="panel-heading">
        <div>
          <small>{config.primaryModule}</small>
          <h3>Operational focus</h3>
        </div>
      </div>
      {records.slice(0, 3).map((record) => (
        <p className="service-row" key={record.id}>
          <span>{record.title}</span>
          <strong>{record.status}</strong>
          <button type="button" onClick={() => onToast(`${record.title} queued for review.`, "info")}>
            Review
          </button>
        </p>
      ))}
    </div>
  );
}

export function ProductWorkspace({ product, onClose }: ProductWorkspaceProps) {
  const config = workspaceConfigById[product.id];
  const phase = getProductPhase(product);
  const isProduction = phase.tier === "production";
  const [activeModule, setActiveModule] = useState(config.primaryModule);
  const [records, setRecords] = useState<WorkspaceRecord[]>(() => cloneRecords(config.records));
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [drawerRecordId, setDrawerRecordId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [receiptRecord, setReceiptRecord] = useState<WorkspaceRecord | null>(null);
  const [form, setForm] = useState<RecordFormState>(() => createInitialForm(config));
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([
    {
      role: "assistant",
      text: isProduction
        ? `Interactive AI simulation ready. I can summarize ${config.recordNamePlural}, predict trends, draft updates, and explain risks using this production experience workspace.`
        : `${product.name} is currently in ${phase.label}. This interactive AI simulation uses seeded preview data while the product is expanded inside the VOYD ecosystem.`,
    },
  ]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const Icon = product.icon;

  const addToast = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  };

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey(product.id));
    setRecords(saved ? JSON.parse(saved) : cloneRecords(config.records));
    setActiveModule(config.primaryModule);
    setSearch("");
    setStatusFilter("All");
    setPriorityFilter("All");
    setPage(1);
    setDrawerRecordId(null);
    setDialogMode(null);
    setAiMessages([
      {
        role: "assistant",
        text: `Interactive AI simulation ready. I can summarize ${config.recordNamePlural}, predict trends, draft updates, and explain risks using this seeded workspace data.`,
      },
    ]);
  }, [config, product.id]);

  useEffect(() => {
    window.localStorage.setItem(storageKey(product.id), JSON.stringify(records));
  }, [product.id, records]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") {
        if (commandOpen) setCommandOpen(false);
        else if (dialogMode) setDialogMode(null);
        else if (receiptRecord) setReceiptRecord(null);
        else if (drawerRecordId) setDrawerRecordId(null);
        else onClose();
      }
      if (event.key.toLowerCase() === "n" && !dialogMode) {
        setForm(createInitialForm(config));
        setDialogMode("create");
      }
      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        exportCsv();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter((record) => {
      const haystack = [
        record.id,
        record.title,
        record.subtitle,
        record.status,
        record.owner,
        record.value,
        record.date,
        record.priority,
        record.notes,
        ...Object.values(record.fields),
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!query || haystack.includes(query)) &&
        (statusFilter === "All" || record.status === statusFilter) &&
        (priorityFilter === "All" || record.priority === priorityFilter)
      );
    });
  }, [priorityFilter, records, search, statusFilter]);

  const maxPage = Math.max(1, Math.ceil(filtered.length / pageSize));
  const visibleRecords = filtered.slice((page - 1) * pageSize, page * pageSize);
  const drawerRecord = records.find((record) => record.id === drawerRecordId) ?? null;

  useEffect(() => {
    setPage(1);
  }, [priorityFilter, search, statusFilter]);

  const exportCsv = () => {
    downloadTextFile(
      `voyd-${product.id}-${Date.now()}.csv`,
      buildCsv(config, filtered),
      "text/csv;charset=utf-8",
    );
    addToast(`Exported ${filtered.length} ${config.recordNamePlural} as CSV.`);
  };

  const resetData = () => {
    setRecords(cloneRecords(config.records));
    window.localStorage.removeItem(storageKey(product.id));
    addToast(`${product.name} demo data reset.`, "info");
  };

  const openCreate = () => {
    setForm(createInitialForm(config));
    setDialogMode("create");
  };

  const openEdit = (record: WorkspaceRecord) => {
    setForm(formFromRecord(record));
    setDialogMode("edit");
  };

  const saveRecord = (event: FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      addToast(`Add a ${config.recordName} name before saving.`, "error");
      return;
    }

    if (dialogMode === "edit" && drawerRecord) {
      setRecords((current) =>
        current.map((record) =>
          record.id === drawerRecord.id
            ? {
                ...record,
                ...form,
                fields: { ...form.fields },
              }
            : record,
        ),
      );
      addToast(`${config.recordName} updated.`);
    } else {
      const created: WorkspaceRecord = {
        id: nextId(config, records),
        ...form,
        fields: { ...form.fields },
      };
      setRecords((current) => [created, ...current]);
      setDrawerRecordId(created.id);
      addToast(`${config.recordName} created.`);
    }

    setDialogMode(null);
  };

  const deleteRecord = (record: WorkspaceRecord) => {
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setDrawerRecordId(null);
    setConfirmDelete(false);
    addToast(`${record.title} deleted.`, "info");
  };

  const updateStatus = (record: WorkspaceRecord, status: string) => {
    setRecords((current) => current.map((item) => (item.id === record.id ? { ...item, status } : item)));
    addToast(`${record.title} moved to ${status}.`);
  };

  const runAi = (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setAiMessages((current) => [...current, { role: "user", text: trimmed }]);
    setAiInput("");
    setAiLoading(true);
    window.setTimeout(() => {
      setAiMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: buildAiResponse(config, filtered.length ? filtered : records, trimmed),
        },
      ]);
      setAiLoading(false);
    }, 620);
  };

  const runCommand = (command: string) => {
    setCommandOpen(false);
    if (command === "create") openCreate();
    if (command === "export") exportCsv();
    if (command === "reset") resetData();
    if (command === "report") runAi(`Generate a report for ${config.recordNamePlural}`);
  };

  const downloadIcsReceipt = (record: WorkspaceRecord) => {
    const content = [
      "VOYD RECEIPT",
      `Product,${product.name}`,
      `Record,${record.id}`,
      `Title,${record.title}`,
      `Status,${record.status}`,
      `Value,${record.value}`,
      `Generated,${new Date().toISOString()}`,
    ].join("\n");
    downloadTextFile(`voyd-${record.id}-receipt.txt`, content, "text/plain;charset=utf-8");
    addToast("Receipt downloaded.");
  };

  return (
    <motion.div className={`workspace-overlay workspace-${phase.tier} accent-${product.accent}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <aside className="workspace-sidebar">
        <div className="workspace-brand">
          <span>
            <Icon size={18} />
          </span>
          <div>
            <strong>{product.name}</strong>
            <small>{phase.label}</small>
          </div>
        </div>
        <nav aria-label={`${product.name} workspace modules`}>
          {config.modules.map((module) => (
            <button key={module} className={activeModule === module ? "is-active" : ""} type="button" onClick={() => setActiveModule(module)}>
              <Layers size={15} />
              {module}
            </button>
          ))}
        </nav>
        <div className="workspace-sidebar-footer">
          <span>Mode</span>
          <strong>{phase.workspaceMode}</strong>
          <small>{phase.workspaceNote}</small>
        </div>
      </aside>

      <section className="workspace-shell" aria-label={`${product.name} product experience`}>
        <header className="workspace-header">
          <div className="workspace-title">
            <button type="button" onClick={onClose} aria-label="Close product experience">
              <X size={17} />
            </button>
            <div>
              <small>{product.category}</small>
              <h2>{activeModule}</h2>
            </div>
          </div>
          <div className="workspace-actions">
            <label className="workspace-search">
              <Search size={16} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${config.recordNamePlural}...`} />
            </label>
            <button type="button" onClick={() => setCommandOpen(true)}>
              <Command size={16} />
              <span>Command</span>
            </button>
            <button type="button" aria-label="Notifications" className="notification-action" onClick={() => setNotificationsOpen((value) => !value)}>
              <Bell size={16} />
              <i />
            </button>
            <button type="button" aria-label="Workspace settings" onClick={() => setSettingsOpen((value) => !value)}>
              <Settings size={16} />
            </button>
          </div>
        </header>

        <main className="workspace-main">
          <div className={`workspace-status ${isProduction ? "production-status" : "roadmap-status"}`}>
            <div>
              <Bot size={17} />
              <span>
                {isProduction
                  ? `Interactive AI simulation is using ${filtered.length} visible ${config.recordNamePlural} and the current ${config.dashboardTitle.toLowerCase()} context.`
                  : `${product.name} is currently in ${phase.label}. Explore the preview workspace or request early access for a tailored build plan.`}
              </span>
            </div>
            <button type="button" onClick={openCreate}>
              <Plus size={16} />
              {isProduction ? `New ${config.recordName}` : `Preview ${config.recordName}`}
            </button>
            {!isProduction ? <a href="/contact-sales">Request access</a> : null}
          </div>

          {!isProduction ? (
            <div className="workspace-preview-banner">
              <strong>Expanding platform preview</strong>
              <span>{phase.summary} The interface remains interactive so teams can evaluate workflows before requesting early access.</span>
            </div>
          ) : null}

          <section className="workspace-metrics" aria-label="Workspace analytics">
            {config.metrics.map((metric) => (
              <article key={metric.label}>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
                <span>{metric.comparison}</span>
              </article>
            ))}
          </section>

          <section className="workspace-layout">
            <div className="workspace-primary">
              <div className="workspace-panel analytics-panel">
                <div className="panel-heading">
                  <div>
                    <small>Business chart</small>
                    <h3>{config.chart.title}</h3>
                  </div>
                  <div className="panel-actions">
                    <button type="button" onClick={() => setStatusFilter("All")}>
                      <Filter size={15} />
                      Clear
                    </button>
                    <button type="button" onClick={exportCsv}>
                      <Download size={15} />
                      Export
                    </button>
                  </div>
                </div>
                <div className="filter-row">
                  <label>
                    Status
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                      <option>All</option>
                      {config.statuses.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Priority
                    <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
                      <option>All</option>
                      {priorities.map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <BusinessChart chart={config.chart} loadingKey={`${product.id}-${activeModule}-${statusFilter}-${priorityFilter}`} />
              </div>

              <div className="workspace-panel table-panel">
                <div className="panel-heading">
                  <div>
                    <small>{config.recordNamePlural}</small>
                    <h3>{activeModule} records</h3>
                  </div>
                  <button type="button" onClick={openCreate}>
                    <Plus size={15} />
                    Create
                  </button>
                </div>
                {visibleRecords.length ? (
                  <>
                    <div className="workspace-table-wrap">
                      <table className="workspace-table">
                        <thead>
                          <tr>
                            {config.tableColumns.map((column) => (
                              <th key={column.label}>{column.label}</th>
                            ))}
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRecords.map((record) => (
                            <tr key={record.id}>
                              {config.tableColumns.map((column) => (
                                <td key={`${record.id}-${column.label}`}>
                                  {column.key === "status" ? <span>{record.status}</span> : getField(record, column.key)}
                                </td>
                              ))}
                              <td>
                                <button type="button" aria-label={`Open ${record.title}`} onClick={() => setDrawerRecordId(record.id)}>
                                  <MoreHorizontal size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="pagination">
                      <span>
                        Page {page} of {maxPage} · {filtered.length} {config.recordNamePlural}
                      </span>
                      <div>
                        <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page">
                          <ChevronLeft size={15} />
                        </button>
                        <button type="button" onClick={() => setPage((value) => Math.min(maxPage, value + 1))} aria-label="Next page">
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <span />
                    <strong>No matching {config.recordNamePlural}</strong>
                    <small>{config.emptyMessage}</small>
                    <button type="button" onClick={() => { setSearch(""); setStatusFilter("All"); setPriorityFilter("All"); }}>
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>

            <aside className="workspace-secondary">
              <div className="workspace-panel ai-panel">
                <div className="panel-heading">
                  <div>
                    <small>Interactive AI simulation</small>
                    <h3>Assistant</h3>
                  </div>
                  <Bot size={17} />
                </div>
                <div className="ai-messages" aria-live="polite">
                  {aiMessages.map((message, index) => (
                    <p className={message.role} key={`${message.role}-${index}`}>{message.text}</p>
                  ))}
                  {aiLoading ? <p className="assistant">Thinking through seeded workspace context...</p> : null}
                </div>
                <div className="assistant-actions">
                  {config.aiPrompts.slice(0, 2).map((prompt) => (
                    <button key={prompt.label} type="button" onClick={() => runAi(prompt.label)}>
                      <MessageSquareText size={15} />
                      {prompt.label}
                    </button>
                  ))}
                </div>
                <form className="ai-input" onSubmit={(event) => { event.preventDefault(); runAi(aiInput); }}>
                  <input value={aiInput} onChange={(event) => setAiInput(event.target.value)} placeholder={`Ask about ${config.recordNamePlural}...`} />
                  <button type="submit">Ask</button>
                </form>
              </div>

              {!isProduction ? (
                <div className="workspace-panel roadmap-access-panel">
                  <div className="panel-heading">
                    <div>
                      <small>{phase.label}</small>
                      <h3>Request early access</h3>
                    </div>
                  </div>
                  <p>{product.name} is currently being expanded as part of the VOYD ecosystem roadmap.</p>
                  <a href="/contact-sales">Book discovery call</a>
                </div>
              ) : null}

              <ProductSpecificPanel config={config} records={records} activeModule={activeModule} phase={phase} onOpenReceipt={setReceiptRecord} onToast={addToast} />

              <div className="workspace-panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <small>Notifications</small>
                    <h3>Latest signals</h3>
                  </div>
                </div>
                {config.notifications.map((item) => (
                  <p key={item}>{item}</p>
                ))}
              </div>
            </aside>
          </section>

          <div className="shortcut-row">
            {shortcuts.map((shortcut) => (
              <span key={shortcut}>{shortcut}</span>
            ))}
          </div>
        </main>
      </section>

      <div className="toast-stack">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div className={`toast toast-${toast.type}`} key={toast.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {notificationsOpen ? (
          <motion.div key="notifications" className="workspace-popover notifications-popover" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <strong>Notifications</strong>
            {config.notifications.map((notification) => (
              <p key={notification}>{notification}</p>
            ))}
          </motion.div>
        ) : null}

        {settingsOpen ? (
          <motion.div key="settings" className="workspace-popover settings-popover" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <strong>Workspace settings</strong>
            <button type="button" onClick={resetData}>
              <RefreshCcw size={15} />
              Reset demo data
            </button>
            <button type="button" onClick={() => addToast("Role settings are included in production deployments.", "info")}>
              <ShieldCheck size={15} />
              Review roles
            </button>
          </motion.div>
        ) : null}

        {commandOpen ? (
          <motion.div key="command" className="workspace-command" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="workspace-command-panel" initial={{ y: 12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 12, scale: 0.98 }}>
              <label>
                <Command size={18} />
                <input autoFocus placeholder="Run a workspace command..." />
              </label>
              {[
                ["report", "Generate contextual report"],
                ["create", `Create ${config.recordName}`],
                ["export", "Export visible CSV"],
                ["reset", "Reset seeded data"],
              ].map(([command, label]) => (
                <button key={command} type="button" onClick={() => runCommand(command)}>
                  {label}
                </button>
              ))}
            </motion.div>
          </motion.div>
        ) : null}

        {dialogMode ? (
          <motion.div key={`record-dialog-${dialogMode}`} className="workspace-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.form className="workspace-dialog" onSubmit={saveRecord} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <div className="panel-heading">
                <div>
                  <small>{dialogMode === "edit" ? "Edit flow" : "Create flow"}</small>
                  <h3>{dialogMode === "edit" ? `Edit ${config.recordName}` : `Create ${config.recordName}`}</h3>
                </div>
                <button type="button" onClick={() => setDialogMode(null)}>
                  <X size={17} />
                </button>
              </div>
              <div className="form-grid">
                <label>
                  Name
                  <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                </label>
                <label>
                  Context
                  <input value={form.subtitle} onChange={(event) => setForm({ ...form, subtitle: event.target.value })} />
                </label>
                <label>
                  Status
                  <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    {config.statuses.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Owner
                  <input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} />
                </label>
                <label>
                  Value
                  <input value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} />
                </label>
                <label>
                  Date
                  <input value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
                </label>
                <label>
                  Priority
                  <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as WorkspaceRecord["priority"] })}>
                    {priorities.map((priority) => (
                      <option key={priority}>{priority}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="custom-field-grid">
                {Object.keys(form.fields).map((fieldKey) => (
                  <label key={fieldKey}>
                    {fieldKey}
                    <input
                      value={form.fields[fieldKey]}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          fields: { ...current.fields, [fieldKey]: event.target.value },
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                Notes
                <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </label>
              <div>
                <button type="button" onClick={() => setDialogMode(null)}>
                  Cancel
                </button>
                <button type="submit">
                  <Check size={15} />
                  Save {config.recordName}
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}

        {drawerRecord ? (
          <motion.aside key={`drawer-${drawerRecord.id}`} className="workspace-drawer" initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.32 }}>
            <button type="button" onClick={() => { setDrawerRecordId(null); setConfirmDelete(false); }}>
              <X size={17} />
            </button>
            <small>{config.recordName} detail</small>
            <h3>{drawerRecord.title}</h3>
            <p>{drawerRecord.subtitle}</p>
            <dl>
              <div><dt>Status</dt><dd>{drawerRecord.status}</dd></div>
              <div><dt>Owner</dt><dd>{drawerRecord.owner}</dd></div>
              <div><dt>Value</dt><dd>{drawerRecord.value}</dd></div>
              <div><dt>Priority</dt><dd>{drawerRecord.priority}</dd></div>
              {Object.entries(drawerRecord.fields).map(([key, value]) => (
                <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <label className="drawer-status">
              Update status
              <select value={drawerRecord.status} onChange={(event) => updateStatus(drawerRecord, event.target.value)}>
                {config.statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <div className="drawer-actions">
              <button type="button" onClick={() => openEdit(drawerRecord)}>Edit</button>
              <button type="button" onClick={() => setReceiptRecord(drawerRecord)}>Receipt</button>
              <button type="button" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} />
                Delete
              </button>
            </div>
            {confirmDelete ? (
              <div className="delete-confirm">
                <strong>Delete {drawerRecord.title}?</strong>
                <p>This removes it from the local prototype data only.</p>
                <button type="button" onClick={() => deleteRecord(drawerRecord)}>Confirm delete</button>
                <button type="button" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </div>
            ) : null}
          </motion.aside>
        ) : null}

        {receiptRecord ? (
          <motion.div key={`receipt-${receiptRecord.id}`} className="workspace-dialog-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="workspace-dialog receipt-dialog" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <div className="panel-heading">
                <div>
                  <small>Printable view</small>
                  <h3>{receiptRecord.id} receipt</h3>
                </div>
                <button type="button" onClick={() => setReceiptRecord(null)}>
                  <X size={17} />
                </button>
              </div>
              <div className="receipt-view">
                <strong>VOYD - {product.name}</strong>
                <p>{receiptRecord.title}</p>
                <p>{receiptRecord.subtitle}</p>
                <p>Status: {receiptRecord.status}</p>
                <p>Total / value: {receiptRecord.value}</p>
                <p>Generated: {new Date().toLocaleString()}</p>
              </div>
              <div>
                <button type="button" onClick={() => window.print()}>Print</button>
                <button type="button" onClick={() => downloadIcsReceipt(receiptRecord)}>Download receipt</button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

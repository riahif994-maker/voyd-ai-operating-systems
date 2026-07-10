import { motion } from "framer-motion";
import { Bot, CheckCircle2, Database, LockKeyhole, Workflow } from "lucide-react";

const rows = [
  ["Revenue forecast", "Generated", "98%"],
  ["Customer risk", "Review", "12 accounts"],
  ["Inventory sync", "Automated", "Live"],
  ["Invoice batch", "Ready", "$86K"],
];

export function PlatformConsole() {
  return (
    <motion.div
      className="platform-console"
      initial={{ opacity: 0, y: 22, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.75, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="console-topbar">
        <div>
          <span />
          <span />
          <span />
        </div>
        <strong>VOYD Command Center</strong>
        <small>Live</small>
      </div>
      <div className="console-grid">
        <aside>
          {[Database, Workflow, Bot, LockKeyhole].map((Icon, index) => (
            <motion.span
              key={index}
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: index * 0.28 }}
            >
              <Icon size={17} />
            </motion.span>
          ))}
        </aside>
        <section>
          <div className="console-command">
            <Bot size={18} />
            <p>Ask VOYD: "Summarize what changed this week and create actions."</p>
          </div>
          <div className="console-metrics">
            <article>
              <small>Automated workflows</small>
              <strong>8,924</strong>
              <span>+31%</span>
            </article>
            <article>
              <small>Operating accuracy</small>
              <strong>94%</strong>
              <span>+6.8%</span>
            </article>
          </div>
          <div className="console-table">
            {rows.map((row) => (
              <p key={row[0]}>
                <span>{row[0]}</span>
                <b>{row[1]}</b>
                <small>{row[2]}</small>
                <CheckCircle2 size={14} />
              </p>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}

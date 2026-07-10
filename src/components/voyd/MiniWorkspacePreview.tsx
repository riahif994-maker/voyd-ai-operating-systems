import { motion } from "framer-motion";
import type { PlatformProduct } from "../../data/voyd";
import { workspaceConfigById } from "../../data/workspaces";

type MiniWorkspacePreviewProps = {
  product: PlatformProduct;
};

export function MiniWorkspacePreview({ product }: MiniWorkspacePreviewProps) {
  const Icon = product.icon;
  const workspace = workspaceConfigById[product.id];
  const max = Math.max(...workspace.chart.series[0].values, 1);

  return (
    <div className={`mini-workspace accent-${product.accent}`}>
      <div className="mini-topbar">
        <div>
          <span />
          <strong>{product.shortName}</strong>
        </div>
        <small>Live Workspace</small>
      </div>
      <div className="mini-body">
        <aside>
          <Icon size={18} />
          {workspace.modules.slice(0, 5).map((module) => (
            <i key={module}>{module}</i>
          ))}
        </aside>
        <section>
          <div className="mini-metrics">
            {workspace.metrics.slice(0, 3).map((metric) => (
              <div key={metric.label}>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
              </div>
            ))}
          </div>
          <div className="mini-chart">
            {workspace.chart.series[0].values.map((value, index) => (
              <motion.span
                key={`${product.id}-${value}-${index}`}
                style={{ height: `${Math.max(12, (value / max) * 100)}%` }}
                initial={{ scaleY: 0.4 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.03 }}
              />
            ))}
          </div>
          <div className="mini-table">
            {workspace.records.slice(0, 3).map((record) => (
              <p key={record.id}>
                <span>{record.id}</span>
                <b>{record.status}</b>
              </p>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

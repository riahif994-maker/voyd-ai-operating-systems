import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import type { WorkspaceChart } from "../../data/workspaces";

type BusinessChartProps = {
  chart: WorkspaceChart;
  loadingKey: string;
};

type TooltipState = {
  label: string;
  series: string;
  value: number;
  unit: string;
  x: number;
  y: number;
};

export function BusinessChart({ chart, loadingKey }: BusinessChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = window.setTimeout(() => setLoading(false), 420);
    return () => window.clearTimeout(timer);
  }, [loadingKey]);

  const max = useMemo(() => {
    const values = chart.series.flatMap((series) => series.values);
    return Math.max(...values, 1);
  }, [chart.series]);

  const width = 760;
  const height = 280;
  const padding = { top: 18, right: 22, bottom: 42, left: 46 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const bucketWidth = innerWidth / Math.max(chart.labels.length, 1);
  const barWidth = Math.max(6, Math.min(18, (bucketWidth - 12) / Math.max(chart.series.length, 1)));

  if (loading) {
    return (
      <div className="business-chart-shell">
        <div className="chart-loading" aria-label="Loading chart">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  if (!chart.series.length || !chart.labels.length) {
    return (
      <div className="business-chart-shell">
        <div className="chart-empty">
          <strong>No chart data</strong>
          <span>This workspace has no matching data for the current filters.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="business-chart-shell">
      <div className="chart-title-row">
        <div>
          <h4>{chart.title}</h4>
          <p>{chart.subtitle}</p>
        </div>
        <div className="chart-legend" aria-label="Chart legend">
          {chart.series.map((series) => (
            <span key={series.name}>
              <i style={{ background: series.color }} />
              {series.name}
            </span>
          ))}
        </div>
      </div>

      <div className="chart-svg-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={chart.title}>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = padding.top + innerHeight - innerHeight * tick;
            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="chart-grid-line" />
                <text x={12} y={y + 4} className="chart-axis-text">
                  {Math.round(max * tick)}
                </text>
              </g>
            );
          })}

          {chart.labels.map((label, index) => {
            const x = padding.left + bucketWidth * index + bucketWidth / 2;
            return (
              <text key={label} x={x} y={height - 12} textAnchor="middle" className="chart-axis-text">
                {label}
              </text>
            );
          })}

          {chart.series.map((series, seriesIndex) =>
            series.values.map((value, index) => {
              const x =
                padding.left +
                bucketWidth * index +
                bucketWidth / 2 -
                (barWidth * chart.series.length) / 2 +
                seriesIndex * barWidth;
              const barHeight = (value / max) * innerHeight;
              const y = padding.top + innerHeight - barHeight;

              return (
                <motion.rect
                  key={`${series.name}-${chart.labels[index]}-${value}`}
                  x={x}
                  y={y}
                  width={barWidth - 2}
                  height={barHeight}
                  rx={4}
                  fill={series.color}
                  initial={{ scaleY: 0.25, opacity: 0.45 }}
                  animate={{ scaleY: 1, opacity: 0.92 }}
                  style={{ transformOrigin: `${x}px ${padding.top + innerHeight}px` }}
                  transition={{ duration: 0.38, delay: index * 0.025 + seriesIndex * 0.04 }}
                  onMouseEnter={() =>
                    setTooltip({
                      label: chart.labels[index],
                      series: series.name,
                      value,
                      unit: series.unit,
                      x: Math.min(82, Math.max(8, (x / width) * 100)),
                      y: Math.min(78, Math.max(8, (y / height) * 100)),
                    })
                  }
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            }),
          )}
        </svg>

        <AnimatePresence>
          {tooltip ? (
            <motion.div
              className="chart-tooltip"
              style={{ left: `${tooltip.x}%`, top: `${tooltip.y}%` }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
            >
              <small>{tooltip.label}</small>
              <strong>{tooltip.series}</strong>
              <span>
                {tooltip.value} {tooltip.unit}
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { BookOpen, Code2, FileCheck2, TerminalSquare } from "lucide-react";
import { documentationTopics } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";

const docIcons = [Code2, TerminalSquare, FileCheck2, BookOpen];

export default function DocumentationPage() {
  return (
    <PageTransition>
      <main className="page docs-page">
        <section className="page-hero">
          <p className="eyebrow">Documentation</p>
          <h1>Understand how VOYD models, automates, and governs business operations.</h1>
          <p>
            Public documentation for the platform architecture, product workspaces, AI actions, roles, exports, and
            implementation flow.
          </p>
        </section>

        <section className="docs-layout">
          <Reveal>
            <aside className="docs-sidebar">
              <strong>Guides</strong>
              {documentationTopics.map((topic) => (
                <a key={topic} href={`#${topic.toLowerCase().replace(/\s+/g, "-")}`}>
                  {topic}
                </a>
              ))}
            </aside>
          </Reveal>

          <Reveal delay={0.08}>
            <article className="docs-content">
              <div className="docs-callout">
                <BookOpen size={20} />
                <div>
                  <h2>Platform overview</h2>
                  <p>
                    VOYD is structured as a workspace platform: business records, AI actions, automations, analytics,
                    permissions, exports, and audit trails.
                  </p>
                </div>
              </div>

              <div className="docs-grid">
                {[
                  ["Data model", "Map entities, ownership, status, values, history, and relationships."],
                  ["AI actions", "Generate reports, predict trends, summarize customers, and create workflow drafts."],
                  ["Workflow control", "Run triggers, approvals, routing, notifications, and exception handling."],
                  ["Governance", "Use role controls, audit logs, settings, exports, and human review checkpoints."],
                ].map(([title, text], index) => {
                  const Icon = docIcons[index];
                  return (
                    <section key={title} id={title.toLowerCase().replace(/\s+/g, "-")}>
                      <Icon size={18} />
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </section>
                  );
                })}
              </div>

              <div className="code-panel">
                <div>
                  <span />
                  <span />
                  <span />
                </div>
                <pre>
{`workspace.generateReport({
  product: "Restaurant OS",
  timeframe: "last_7_days",
  include: ["revenue", "orders", "customers", "inventory"],
  ai: {
    summarize: true,
    predict_trends: true,
    create_actions: true
  }
})`}
                </pre>
              </div>

              <div className="deployment-checklist">
                {[
                  "Define business entities",
                  "Map roles and approvals",
                  "Connect source data",
                  "Configure AI actions",
                  "Launch workspace",
                  "Measure adoption",
                ].map((item) => (
                  <p key={item}>
                    <FileCheck2 size={16} />
                    {item}
                  </p>
                ))}
              </div>

              <Button to="/contact-sales">Plan implementation</Button>
            </article>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}

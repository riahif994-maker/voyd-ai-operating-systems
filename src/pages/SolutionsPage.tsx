import { ArrowRight, Bot, Database, GitBranch, ShieldCheck } from "lucide-react";
import { solutions } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";
import { SectionHeader } from "../components/voyd/SectionHeader";

export default function SolutionsPage() {
  return (
    <PageTransition>
      <main className="page">
        <section className="page-hero">
          <p className="eyebrow">Solutions</p>
          <h1>Replace operational sprawl with one AI execution layer.</h1>
          <p>
            VOYD connects the workflows companies actually run: customer work, money movement, scheduling, reporting,
            approvals, and automation.
          </p>
        </section>

        <section className="solution-map">
          {[Database, GitBranch, Bot, ShieldCheck].map((Icon, index) => (
            <Reveal key={index} delay={index * 0.08}>
              <div className="solution-node">
                <Icon size={22} />
                <span>{["Data", "Workflow", "AI", "Control"][index]}</span>
              </div>
            </Reveal>
          ))}
        </section>

        <section className="section">
          <SectionHeader
            eyebrow="Business outcomes"
            title="Designed around the problems leaders feel every week."
            text="VOYD turns manual work and fragmented tools into software that measures, decides, and executes."
          />
          <div className="solution-grid">
            {solutions.map((solution, index) => {
              const Icon = solution.icon;
              return (
                <Reveal key={solution.title} delay={index * 0.06}>
                  <article className="solution-card">
                    <Icon size={20} />
                    <h3>{solution.title}</h3>
                    <p>{solution.description}</p>
                    <ul>
                      {solution.outcomes.map((outcome) => (
                        <li key={outcome}>
                          <ArrowRight size={14} />
                          {outcome}
                        </li>
                      ))}
                    </ul>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="section split-section">
          <Reveal>
            <div>
              <p className="eyebrow">AI control</p>
              <h2>Automation without losing accountability.</h2>
              <p>
                AI actions can draft reports, generate invoices, summarize customers, write emails, and predict trends,
                while role controls and approval paths keep the business in charge.
              </p>
              <Button to="/contact-sales">Design your operating system</Button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="control-panel">
              {["Human approval required", "Export report generated", "AI action reviewed", "Workflow audit complete"].map(
                (item) => (
                  <p key={item}>
                    <span />
                    {item}
                    <strong>Passed</strong>
                  </p>
                ),
              )}
            </div>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}

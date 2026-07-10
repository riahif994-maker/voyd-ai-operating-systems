import { CheckCircle2 } from "lucide-react";
import { pricingPlans } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";
import { SectionHeader } from "../components/voyd/SectionHeader";

export default function PricingPage() {
  return (
    <PageTransition>
      <main className="page">
        <section className="page-hero">
          <p className="eyebrow">Pricing</p>
          <h1>Pricing aligned with scope, risk, and the business system being built.</h1>
          <p>
            VOYD is sold as implementation-led product architecture: a serious operating system for teams replacing
            disconnected software.
          </p>
        </section>

        <section className="section">
          <SectionHeader
            eyebrow="Plans"
            title="Start with one workflow or build the full operating layer."
            text="Every engagement includes product strategy, interface architecture, workflow modeling, AI design, and launch support."
          />
          <div className="pricing-grid">
            {pricingPlans.map((plan, index) => (
              <Reveal key={plan.name} delay={index * 0.08}>
                <article className={`pricing-card ${plan.highlighted ? "is-highlighted" : ""}`}>
                  <small>{plan.name}</small>
                  <h3>{plan.price}</h3>
                  <p>{plan.description}</p>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>
                        <CheckCircle2 size={15} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button to="/contact-sales" variant={plan.highlighted ? "primary" : "secondary"}>
                    Talk to Sales
                  </Button>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="section comparison-section">
          <Reveal>
            <div>
              <p className="eyebrow">Procurement clarity</p>
              <h2>VOYD is priced like software architecture, not a template.</h2>
              <p>
                Scope depends on product count, data complexity, integrations, workflow depth, AI actions, governance,
                and rollout requirements.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="comparison-table">
              {[
                ["Product workspace", "Included"],
                ["AI workflows", "Scoped"],
                ["Role permissions", "Included"],
                ["Integrations", "Scoped"],
                ["Launch support", "Included"],
              ].map(([label, value]) => (
                <p key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </p>
              ))}
            </div>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}

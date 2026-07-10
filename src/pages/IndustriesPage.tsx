import { industries } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";
import { SectionHeader } from "../components/voyd/SectionHeader";

export default function IndustriesPage() {
  return (
    <PageTransition>
      <main className="page">
        <section className="page-hero">
          <p className="eyebrow">Industries</p>
          <h1>Vertical operating systems for companies with real operational pressure.</h1>
          <p>
            VOYD adapts the same enterprise-grade platform architecture to the workflows, metrics, and controls of each
            industry.
          </p>
        </section>

        <section className="section">
          <SectionHeader
            eyebrow="Industry coverage"
            title="Built for business models with moving parts."
            text="Reservations, appointments, customers, staff, inventory, invoices, support, payments, and analytics stay connected."
          />
          <div className="industry-grid">
            {industries.map((industry, index) => {
              const Icon = industry.icon;
              return (
                <Reveal key={industry.name} delay={index * 0.06}>
                  <article className="industry-card">
                    <Icon size={22} />
                    <h3>{industry.name}</h3>
                    <p>{industry.description}</p>
                    <div>
                      {industry.systems.map((system) => (
                        <span key={system}>{system}</span>
                      ))}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="industry-cta">
          <Reveal>
            <h2>Do not see your industry?</h2>
            <p>
              If the business runs on repeatable workflows, records, approvals, customers, and metrics, VOYD can model
              it.
            </p>
            <Button to="/contact-sales">Talk to Sales</Button>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}

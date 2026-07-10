import { companyPrinciples, governanceItems } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { Reveal } from "../components/voyd/Reveal";
import { SectionHeader } from "../components/voyd/SectionHeader";

export default function CompanyPage() {
  return (
    <PageTransition>
      <main className="page">
        <section className="page-hero">
          <p className="eyebrow">Company</p>
          <h1>VOYD builds AI operating systems for businesses that have outgrown disconnected tools.</h1>
          <p>
            The company exists to make business operations clearer, faster, more automated, and more governable through
            software that feels calm under pressure.
          </p>
        </section>

        <section className="section split-section">
          <Reveal>
            <div>
              <p className="eyebrow">Mission</p>
              <h2>Turn operational complexity into intelligent software.</h2>
              <p>
                Most businesses run on a fragile combination of spreadsheets, SaaS tools, inboxes, manual approvals, and
                undocumented decisions. VOYD replaces that patchwork with operating systems built around the way the
                company actually works.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="company-console">
              {governanceItems.map((item) => {
                const Icon = item.icon;
                return (
                  <p key={item.label}>
                    <Icon size={17} />
                    {item.label}
                    <span>Active</span>
                  </p>
                );
              })}
            </div>
          </Reveal>
        </section>

        <section className="section">
          <SectionHeader
            eyebrow="Principles"
            title="Product philosophy with enterprise discipline."
            text="VOYD builds software that prioritizes clarity, control, and useful AI over visual spectacle."
          />
          <div className="principle-grid">
            {companyPrinciples.map((principle, index) => (
              <Reveal key={principle} delay={index * 0.06}>
                <article>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{principle}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="platform-cta">
          <Reveal>
            <div>
              <h2>Build the operating system your teams will actually use.</h2>
              <p>Structured data, controlled AI, and interfaces that make work feel obvious.</p>
            </div>
            <Button to="/contact-sales">Contact Sales</Button>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}

import { ArrowUpRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { platformLayers, products, type PlatformProduct } from "../data/voyd";
import { Button } from "../components/voyd/Button";
import { PageTransition } from "../components/voyd/PageTransition";
import { PlatformConsole } from "../components/voyd/PlatformConsole";
import { Reveal } from "../components/voyd/Reveal";
import { SectionHeader } from "../components/voyd/SectionHeader";
import { MiniWorkspacePreview } from "../components/voyd/MiniWorkspacePreview";

type PlatformPageProps = {
  onLaunchWorkspace: (product: PlatformProduct) => void;
};

export default function PlatformPage({ onLaunchWorkspace }: PlatformPageProps) {
  const featured = products.slice(0, 3);

  return (
    <PageTransition>
      <main className="page platform-page">
        <section className="hero">
          <div className="hero-copy">
            <Reveal>
              <p className="eyebrow">VOYD Platform</p>
              <h1>
                Enterprise AI Operating Systems
                <span>for Modern Businesses</span>
              </h1>
              <p className="hero-subtitle">
                Replace disconnected software, manual work, and spreadsheets with intelligent operating systems built
                around AI.
              </p>
              <div className="hero-actions">
                <Button to="/contact-sales">Book Discovery Call</Button>
                <Button variant="secondary" onClick={() => onLaunchWorkspace(products[0])}>
                  Launch Interactive Platform
                </Button>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="trust-row">
              {["AI workflows", "Role controls", "Live analytics", "Human approval"].map((item) => (
                <span key={item}>
                  <CheckCircle2 size={15} />
                  {item}
                </span>
              ))}
            </Reveal>
          </div>
          <PlatformConsole />
        </section>

        <section className="platform-strip" aria-label="Platform assurances">
          {["Designed for operators", "Built around business data", "AI where work happens", "Governed by roles"].map(
            (item) => (
              <Reveal key={item}>
                <div>
                  <ShieldCheck size={18} />
                  <span>{item}</span>
                </div>
              </Reveal>
            ),
          )}
        </section>

        <section className="section">
          <SectionHeader
            eyebrow="Operating layer"
            title="One system for data, workflows, intelligence, and control."
            text="VOYD turns operational complexity into structured software: records, approvals, AI actions, dashboards, exports, and ownership."
          />
          <div className="layer-grid">
            {platformLayers.map((layer, index) => {
              const Icon = layer.icon;
              return (
                <Reveal key={layer.title} delay={index * 0.06}>
                  <article className="layer-card">
                    <Icon size={20} />
                    <h3>{layer.title}</h3>
                    <p>{layer.description}</p>
                  </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="section featured-products">
          <SectionHeader
            eyebrow="Product systems"
            title="Commercial software surfaces for real business functions."
            text="Every VOYD product opens into a live workspace with analytics, records, roles, automations, and AI assistance."
            action={
              <Button to="/products" variant="quiet">
                View Products
              </Button>
            }
          />
          <div className="featured-product-grid">
            {featured.map((product, index) => (
              <Reveal key={product.id} delay={index * 0.08}>
                <button className={`featured-product accent-${product.accent}`} type="button" onClick={() => onLaunchWorkspace(product)}>
                  <MiniWorkspacePreview product={product} />
                  <div>
                    <small>{product.category}</small>
                    <h3>{product.name}</h3>
                    <p>{product.impact}</p>
                    <span>
                      Launch workspace
                      <ArrowUpRight size={15} />
                    </span>
                  </div>
                </button>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="platform-cta">
          <Reveal>
            <div>
              <Sparkles size={22} />
              <h2>VOYD is not another dashboard. It is the operating system behind the business.</h2>
              <p>
                Give teams one place to run decisions, records, workflows, customers, finance, inventory, and AI.
              </p>
            </div>
            <Button to="/contact-sales">Contact Sales</Button>
          </Reveal>
        </section>
      </main>
    </PageTransition>
  );
}

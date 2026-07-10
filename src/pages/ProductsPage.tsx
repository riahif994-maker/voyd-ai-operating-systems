import { productionProducts, roadmapProducts, type PlatformProduct } from "../data/voyd";
import { PageTransition } from "../components/voyd/PageTransition";
import { ProductCard } from "../components/voyd/ProductCard";
import { SectionHeader } from "../components/voyd/SectionHeader";

type ProductsPageProps = {
  onLaunchWorkspace: (product: PlatformProduct) => void;
};

export default function ProductsPage({ onLaunchWorkspace }: ProductsPageProps) {
  return (
    <PageTransition>
      <main className="page">
        <section className="page-hero">
          <p className="eyebrow">Products</p>
          <h1>AI operating systems for every critical business function.</h1>
          <p>
            Each product is a commercial SaaS workspace with records, analytics, automation, AI assistance, and
            enterprise controls.
          </p>
        </section>

        <section className="section product-strategy-section">
          <SectionHeader
            eyebrow="Production Experiences"
            title="Three mature operating systems, built for deep exploration."
            text="Restaurant OS, Retail OS, and Business CRM are the flagship VOYD product experiences. Each one is positioned as a complete production-grade workspace."
          />
          <div className="product-grid production-product-grid">
            {productionProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} onLaunch={onLaunchWorkspace} />
            ))}
          </div>
        </section>

        <section className="section product-strategy-section">
          <SectionHeader
            eyebrow="VOYD Ecosystem Roadmap"
            title="The wider platform is expanding around the flagship products."
            text="Roadmap products remain interactive and premium, but they are clearly marked as previews, beta workspaces, or early-access modules."
          />
          <div className="roadmap-note">
            <strong>Transparent product status</strong>
            <span>
              Opening a roadmap workspace explains that the product is being expanded and invites early-access conversations.
            </span>
          </div>
          <div className="product-grid roadmap-product-grid">
            {roadmapProducts.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} onLaunch={onLaunchWorkspace} />
            ))}
          </div>
        </section>
      </main>
    </PageTransition>
  );
}

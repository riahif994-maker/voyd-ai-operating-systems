import { Sparkles } from "lucide-react";
import { getProductPhase, type PlatformProduct } from "../../data/voyd";
import { Button } from "./Button";
import { MiniWorkspacePreview } from "./MiniWorkspacePreview";
import { Reveal } from "./Reveal";

type ProductCardProps = {
  product: PlatformProduct;
  index?: number;
  onLaunch: (product: PlatformProduct) => void;
};

export function ProductCard({ product, index = 0, onLaunch }: ProductCardProps) {
  const Icon = product.icon;
  const phase = getProductPhase(product);

  return (
    <Reveal delay={Math.min(index * 0.035, 0.18)}>
      <article className={`product-card product-card-${phase.tier} accent-${product.accent}`}>
        <MiniWorkspacePreview product={product} />
        <div className="product-card-body">
          <div className="product-card-heading">
            <span>
              <Icon size={18} />
            </span>
            <div>
              <p>{product.category}</p>
              <h3>{product.name}</h3>
            </div>
          </div>
          <div className="product-phase-row">
            <span>{phase.label}</span>
            <small>{phase.tier === "production" ? "Flagship" : "Ecosystem roadmap"}</small>
          </div>
          <p>{product.description}</p>
          <div className="product-impact">
            <strong>{product.metric}</strong>
            <span>{product.impact}</span>
          </div>
          <div className="product-columns">
            <div>
              <small>Features</small>
              {product.features.slice(0, 4).map((feature) => (
                <span key={feature}>{feature}</span>
              ))}
            </div>
            <div>
              <small>AI capabilities</small>
              {product.aiCapabilities.slice(0, 3).map((capability) => (
                <span key={capability}>
                  <Sparkles size={13} />
                  {capability}
                </span>
              ))}
            </div>
          </div>
          <div className="benefit-row">
            {product.businessBenefits.map((benefit) => (
              <span key={benefit}>{benefit}</span>
            ))}
          </div>
          <Button onClick={() => onLaunch(product)}>{phase.cta}</Button>
        </div>
      </article>
    </Reveal>
  );
}

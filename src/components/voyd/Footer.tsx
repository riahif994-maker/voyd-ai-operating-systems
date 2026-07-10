import { Link } from "react-router-dom";
import { navItems, products } from "../../data/voyd";
import { Button } from "./Button";

export function Footer() {
  return (
    <footer className="voyd-footer">
      <div className="footer-brand-block">
        <Link className="voyd-brand" to="/">
          <span>V</span>
          <div>
            <strong>VOYD</strong>
            <small>AI Operating Systems</small>
          </div>
        </Link>
        <p>Enterprise AI operating systems for modern business operations.</p>
      </div>
      <div className="footer-columns">
        <div>
          <strong>Platform</strong>
          {navItems.slice(0, 5).map((item) => (
            <Link key={item.href} to={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <div>
          <strong>Products</strong>
          {products.slice(0, 6).map((product) => (
            <Link key={product.id} to="/products">
              {product.name}
            </Link>
          ))}
        </div>
        <div>
          <strong>Sales</strong>
          <Link to="/pricing">Pricing</Link>
          <Link to="/company">Company</Link>
          <Link to="/contact-sales">Contact Sales</Link>
          <a href="mailto:voyd.contact1@gmail.com">voyd.contact1@gmail.com</a>
          <a href="https://wa.me/4917686606120">WhatsApp Business</a>
        </div>
      </div>
      <div className="footer-cta">
        <p>Build the operating system your business has been missing.</p>
        <Button to="/contact-sales" icon={false}>
          Book Discovery Call
        </Button>
      </div>
    </footer>
  );
}

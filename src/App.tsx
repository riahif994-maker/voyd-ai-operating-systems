import { AnimatePresence } from "framer-motion";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { products, type PlatformProduct } from "./data/voyd";
import { AnimatedCursor } from "./components/voyd/AnimatedCursor";
import { CommandPalette } from "./components/voyd/CommandPalette";
import { Footer } from "./components/voyd/Footer";
import { LoadingTransition } from "./components/voyd/LoadingTransition";
import { Navigation } from "./components/voyd/Navigation";
import { ProductWorkspace } from "./components/voyd/ProductWorkspace";
import { ScrollProgress } from "./components/voyd/ScrollProgress";
import { VoydBackground } from "./components/voyd/VoydBackground";

const PlatformPage = lazy(() => import("./pages/PlatformPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const SolutionsPage = lazy(() => import("./pages/SolutionsPage"));
const IndustriesPage = lazy(() => import("./pages/IndustriesPage"));
const DocumentationPage = lazy(() => import("./pages/DocumentationPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const CompanyPage = lazy(() => import("./pages/CompanyPage"));
const ContactSalesPage = lazy(() => import("./pages/ContactSalesPage"));
const VoydNotFoundPage = lazy(() => import("./pages/VoydNotFoundPage"));

function App() {
  const location = useLocation();
  const [commandOpen, setCommandOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<PlatformProduct | null>(null);

  const openCommand = useCallback(() => setCommandOpen(true), []);
  const closeCommand = useCallback(() => setCommandOpen(false), []);
  const launchProduct = useCallback((product: PlatformProduct) => setActiveProduct(product), []);
  const closeProduct = useCallback(() => setActiveProduct(null), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === "Escape" && commandOpen) {
        setCommandOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandOpen]);

  useEffect(() => {
    document.body.style.overflow = activeProduct ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeProduct]);

  return (
    <div className="voyd-app">
      <VoydBackground />
      <LoadingTransition />
      <ScrollProgress />
      <AnimatedCursor />
      <Navigation onOpenCommand={openCommand} />
      <CommandPalette open={commandOpen} onClose={closeCommand} onLaunchProduct={launchProduct} />

      <Suspense fallback={<div className="route-loading">Loading VOYD workspace...</div>}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PlatformPage onLaunchWorkspace={launchProduct} />} />
            <Route path="/products" element={<ProductsPage onLaunchWorkspace={launchProduct} />} />
            <Route path="/solutions" element={<SolutionsPage />} />
            <Route path="/industries" element={<IndustriesPage />} />
            <Route path="/documentation" element={<DocumentationPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/company" element={<CompanyPage />} />
            <Route path="/contact-sales" element={<ContactSalesPage />} />
            <Route path="/work" element={<Navigate to="/products" replace />} />
            <Route path="/services" element={<Navigate to="/solutions" replace />} />
            <Route path="/process" element={<Navigate to="/documentation" replace />} />
            <Route path="/about" element={<Navigate to="/company" replace />} />
            <Route path="/contact" element={<Navigate to="/contact-sales" replace />} />
            <Route path="*" element={<VoydNotFoundPage />} />
          </Routes>
        </AnimatePresence>
      </Suspense>

      <Footer />

      <AnimatePresence>
        {activeProduct ? <ProductWorkspace product={activeProduct} onClose={closeProduct} /> : null}
      </AnimatePresence>
    </div>
  );
}

export default App;

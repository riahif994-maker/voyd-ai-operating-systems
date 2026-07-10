import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Box, FileText, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { navItems, products, type PlatformProduct } from "../../data/voyd";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  onLaunchProduct: (product: PlatformProduct) => void;
};

export function CommandPalette({ open, onClose, onLaunchProduct }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) {
      setQuery("");
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const commands = useMemo(() => {
    const navigation = navItems.map((item) => ({
      id: item.href,
      label: item.label,
      meta: "Navigate",
      icon: FileText,
      action: () => navigate(item.href),
    }));

    const launches = products.slice(0, 8).map((product) => ({
      id: product.id,
      label: `Launch ${product.name}`,
      meta: "Product Experience",
      icon: product.icon,
      action: () => onLaunchProduct(product),
    }));

    return [...navigation, ...launches];
  }, [navigate, onLaunchProduct]);

  const filtered = commands.filter((command) => {
    const normalized = `${command.label} ${command.meta}`.toLowerCase();
    return normalized.includes(query.toLowerCase());
  });

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="command-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            className="command-palette"
            initial={{ y: 16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 12, scale: 0.98, opacity: 0 }}
          >
            <label className="command-search">
              <Search size={18} />
              <input
                autoFocus
                value={query}
                placeholder="Search VOYD or launch a product..."
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <div className="command-list">
              {filtered.length ? (
                filtered.map((command) => {
                  const Icon = command.icon;
                  return (
                    <button
                      key={command.id}
                      type="button"
                      onClick={() => {
                        command.action();
                        onClose();
                      }}
                    >
                      <span>
                        <Icon size={17} />
                      </span>
                      <div>
                        <strong>{command.label}</strong>
                        <small>{command.meta}</small>
                      </div>
                      <ArrowUpRight size={15} />
                    </button>
                  );
                })
              ) : (
                <div className="command-empty">
                  <Box size={18} />
                  <span>No command found</span>
                </div>
              )}
            </div>
          </motion.div>
          <button className="command-dismiss" type="button" aria-label="Close command palette" onClick={onClose} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

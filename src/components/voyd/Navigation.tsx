import { AnimatePresence, motion } from "framer-motion";
import { Command, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { navItems } from "../../data/voyd";
import { Button } from "./Button";
import { ThemeToggle } from "./ThemeToggle";

type NavigationProps = {
  onOpenCommand: () => void;
};

export function Navigation({ onOpenCommand }: NavigationProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="voyd-nav">
      <div className="voyd-nav-inner">
        <NavLink className="voyd-brand" to="/" onClick={() => setOpen(false)}>
          <span>V</span>
          <div>
            <strong>VOYD</strong>
            <small>AI Operating Systems</small>
          </div>
        </NavLink>

        <nav className="voyd-links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.href} to={item.href} className={({ isActive }) => (isActive ? "is-active" : "")}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="voyd-nav-actions">
          <button className="command-trigger" type="button" onClick={onOpenCommand}>
            <Command size={15} />
            <span>Search</span>
            <kbd>Ctrl K</kbd>
          </button>
          <ThemeToggle />
          <Button to="/contact-sales" className="nav-sales" icon={false}>
            Contact Sales
          </Button>
          <button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="mobile-nav"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="mobile-nav-panel"
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
            >
              <div className="mobile-nav-top">
                <span>VOYD</span>
                <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)}>
                  <X size={18} />
                </button>
              </div>
              {navItems.map((item) => (
                <NavLink key={item.href} to={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </NavLink>
              ))}
              <Button to="/contact-sales" icon={false} className="mobile-sales">
                Contact Sales
              </Button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

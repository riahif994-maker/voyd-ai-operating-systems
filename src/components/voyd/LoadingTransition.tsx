import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function LoadingTransition() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 720);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <motion.div
      className="voyd-loader"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      aria-hidden="true"
    >
      <div className="loader-shell">
        <span>VOYD</span>
        <i />
      </div>
    </motion.div>
  );
}

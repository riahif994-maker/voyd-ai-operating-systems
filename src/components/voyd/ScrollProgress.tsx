import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.35 });

  return <motion.div className="scroll-progress" style={{ scaleX }} aria-hidden="true" />;
}

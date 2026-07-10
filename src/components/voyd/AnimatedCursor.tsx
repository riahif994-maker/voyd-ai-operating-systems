import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export function AnimatedCursor() {
  const [active, setActive] = useState(false);
  const mouseX = useMotionValue(-80);
  const mouseY = useMotionValue(-80);
  const x = useSpring(mouseX, { stiffness: 480, damping: 42 });
  const y = useSpring(mouseY, { stiffness: 480, damping: 42 });

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      mouseX.set(event.clientX - 15);
      mouseY.set(event.clientY - 15);
    };

    const onOver = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      setActive(Boolean(target?.closest("a, button, input, [role='button']")));
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
    };
  }, [mouseX, mouseY]);

  return <motion.div className={`voyd-cursor ${active ? "is-active" : ""}`} style={{ x, y }} aria-hidden="true" />;
}

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "quiet";
  to?: string;
  href?: string;
  onClick?: () => void;
  icon?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({
  children,
  className = "",
  variant = "primary",
  to,
  href,
  onClick,
  icon = true,
  type = "button",
  disabled = false,
}: ButtonProps) {
  const classes = `voyd-button voyd-button-${variant} ${className}`.trim();
  const content = (
    <>
      <span>{children}</span>
      {icon ? <ArrowRight aria-hidden="true" size={16} /> : null}
    </>
  );

  if (to) {
    return (
      <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <Link className={classes} to={to}>
          {content}
        </Link>
      </motion.span>
    );
  }

  if (href) {
    return (
      <motion.span whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
        <a className={classes} href={href}>
          {content}
        </a>
      </motion.span>
    );
  }

  return (
    <motion.button
      className={classes}
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
    >
      {content}
    </motion.button>
  );
}

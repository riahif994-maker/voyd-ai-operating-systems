import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  text?: string;
  action?: ReactNode;
  align?: "left" | "center";
};

export function SectionHeader({ eyebrow, title, text, action, align = "left" }: SectionHeaderProps) {
  return (
    <Reveal className={`section-header section-header-${align}`}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2>{title}</h2>
        {text ? <p>{text}</p> : null}
      </div>
      {action ? <div className="section-header-action">{action}</div> : null}
    </Reveal>
  );
}

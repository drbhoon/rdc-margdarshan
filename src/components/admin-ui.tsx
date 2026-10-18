import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const COVERS = ["#1f3a8a", "#0f766e", "#7c3aed", "#b45309"];

export const coverFor = (title: string) =>
  COVERS[
    [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
      COVERS.length
  ];

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";

export function AdminHero({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="admin-hero">
      <div className="admin-hero-text">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="admin-hero-actions">{children}</div>}
      <Icon
        className="admin-hero-icon"
        size={170}
        strokeWidth={1.2}
        aria-hidden="true"
      />
    </section>
  );
}

export type Tone = "blue" | "teal" | "purple" | "amber";
const TONES: Tone[] = ["blue", "teal", "purple", "amber"];
export const toneAt = (index: number): Tone => TONES[index % TONES.length];

export function StatTile({
  icon: Icon,
  value,
  label,
  tone,
  href,
  onClick,
}: {
  icon: LucideIcon;
  value: ReactNode;
  label: string;
  tone: Tone;
  href?: string;
  onClick?: () => void;
}) {
  const body = (
    <>
      <Icon
        className="stat-bg"
        size={96}
        strokeWidth={1.4}
        aria-hidden="true"
      />
      <Icon className="stat-icon" size={22} aria-hidden="true" />
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  );
  if (href) {
    return (
      <Link className={`stat-tile tone-${tone}`} href={href}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`stat-tile tone-${tone}`}
        style={{ textAlign: "left", border: "none", width: "100%" }}
      >
        {body}
      </button>
    );
  }
  return <div className={`stat-tile tone-${tone}`}>{body}</div>;
}

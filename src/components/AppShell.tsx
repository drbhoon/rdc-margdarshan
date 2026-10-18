"use client";

import {
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  FolderArchive,
  LayoutDashboard,
  MoreHorizontal,
  UserCircle,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { initialsOf } from "@/components/admin-ui";

export type NavItem = { href: string; label: string };

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/onboarding": UserCircle,
  "/resources": BookOpen,
  "/admin/records": FolderArchive,
};

const TAB_LIMIT = 4;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname() || "/";
  const [openAt, setOpenAt] = useState<string | null>(null);
  const sheetOpen = openAt === pathname;

  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem("lms-sidebar") === "collapsed";
    } catch {
      /* storage blocked */
    }
    if (saved) {
      document.documentElement.dataset.sidebar = "collapsed";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    if (next) document.documentElement.dataset.sidebar = "collapsed";
    else delete document.documentElement.dataset.sidebar;
    try {
      localStorage.setItem("lms-sidebar", next ? "collapsed" : "expanded");
    } catch {
      /* ignore */
    }
  }

  const showNav = Boolean(user) && pathname !== "/login";

  if (!showNav || !user) {
    return (
      <div className="shell">
        <div className="app-main">{children}</div>
      </div>
    );
  }

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/onboarding", label: "My profile" },
    { href: "/resources", label: "Resource hub" },
  ];
  if (user.role === "ADMIN") {
    items.push({ href: "/admin/records", label: "Record library" });
  }

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard" || pathname.startsWith("/space/")
      : pathname === href || pathname.startsWith(`${href}/`);
  const iconFor = (href: string) => ICONS[href] ?? BookOpen;

  const overflow = items.length > TAB_LIMIT;
  const tabs = overflow ? items.slice(0, TAB_LIMIT - 1) : items;
  const more = overflow ? items.slice(TAB_LIMIT - 1) : [];

  const brand = (
    <Link className="brand" href="/dashboard">
      <Image
        src="/brand/rdc-logo.jpeg"
        alt="RDC logo"
        width={72}
        height={44}
      />
      <span>RDC Margdarshan</span>
    </Link>
  );

  const signOutButton = (
    <button
      type="button"
      className="signout"
      onClick={() => void logout()}
    >
      Sign out
    </button>
  );

  return (
    <div className="shell has-nav">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-top">
          {brand}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            {collapsed ? (
              <ChevronsRight size={18} aria-hidden="true" />
            ) : (
              <ChevronsLeft size={18} aria-hidden="true" />
            )}
          </button>
        </div>
        <nav className="side-nav">
          {items.map((item) => {
            const Icon = iconFor(item.href);
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "active" : undefined}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} aria-hidden="true" />
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="side-user">
          <div className="avatar" aria-hidden="true">
            {initialsOf(user.name)}
          </div>
          <div className="side-user-text">
            <strong>{user.name}</strong>
            <span>{user.email || user.role}</span>
          </div>
          {signOutButton}
        </div>
      </aside>

      <header className="mobile-bar">{brand}</header>

      <nav className="tabbar" aria-label="Main navigation">
        {tabs.map((item) => {
          const Icon = iconFor(item.href);
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`tab-more${
            sheetOpen || more.some((item) => isActive(item.href))
              ? " active"
              : ""
          }`}
          aria-expanded={sheetOpen}
          onClick={() => setOpenAt(pathname)}
        >
          <MoreHorizontal size={22} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setOpenAt(null)}>
          <div
            className="sheet"
            role="dialog"
            aria-label="More"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-head">
              <div className="avatar" aria-hidden="true">
                {initialsOf(user.name)}
              </div>
              <div className="side-user-text">
                <strong>{user.name}</strong>
                <span>{user.email || user.role}</span>
              </div>
              <button
                type="button"
                className="icon-button"
                aria-label="Close"
                onClick={() => setOpenAt(null)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            {more.length > 0 && (
              <nav className="sheet-links">
                {more.map((item) => {
                  const Icon = iconFor(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={isActive(item.href) ? "active" : undefined}
                    >
                      <Icon size={20} aria-hidden="true" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
            <div className="sheet-signout">{signOutButton}</div>
          </div>
        </div>
      )}

      <div className="app-main">{children}</div>
    </div>
  );
}

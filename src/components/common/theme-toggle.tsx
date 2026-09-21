"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("rpa-theme");
    const initial = stored === "dark";
    setDark(initial);
    document.documentElement.classList.toggle("dark", initial);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("rpa-theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  return <button onClick={toggle} className="grid h-8 w-8 place-items-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]" aria-label="테마 변경">{dark ? <SunIcon/> : <MoonIcon/>}</button>;
}

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;
const base = { width: 17, height: 17, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;

export const GridIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
export const ServerIcon = (p: IconProps) => <svg {...base} {...p}><rect x="3" y="4" width="18" height="6" rx="1.5"/><rect x="3" y="14" width="18" height="6" rx="1.5"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/></svg>;
export const NetworkIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8.2 7.2l2.7 7.7M15.8 7.2l-2.7 7.7M8.5 6h7"/></svg>;
export const BoxIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/><path d="M4.5 7.8L12 12l7.5-4.2M12 12v9"/></svg>;
export const ShieldIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l7 3v5c0 4.7-2.7 8.1-7 10-4.3-1.9-7-5.3-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>;
export const DocIcon = (p: IconProps) => <svg {...base} {...p}><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>;
export const SearchIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>;
export const SunIcon = (p: IconProps) => <svg {...base} {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>;
export const MoonIcon = (p: IconProps) => <svg {...base} {...p}><path d="M20 15.5A8 8 0 018.5 4 8.5 8.5 0 1020 15.5z"/></svg>;
export const ChevronIcon = (p: IconProps) => <svg {...base} {...p}><path d="M9 18l6-6-6-6"/></svg>;
export const AlertIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l10 18H2L12 3z"/><path d="M12 9v5M12 18h.01"/></svg>;
export const LayersIcon = (p: IconProps) => <svg {...base} {...p}><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5M3 16l9 5 9-5"/></svg>;
export const ArrowUpRightIcon = (p: IconProps) => <svg {...base} {...p}><path d="M7 17L17 7M9 7h8v8"/></svg>;
export const CloseIcon = (p: IconProps) => <svg {...base} {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
export const MaximizeIcon = (p: IconProps) => <svg {...base} {...p}><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>;

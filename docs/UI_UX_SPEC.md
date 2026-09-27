# UI / UX Freeze Spec

This spec exists to stop future coding agents from gradually turning the portal into a generic AI-generated SaaS dashboard.

## Visual character

- internal developer / infrastructure console
- compact typography and dense tables
- white/neutral surfaces, thin borders, restrained shadows
- accent color only for active navigation/actions; status colors only for status
- no gradients, glass cards, decorative illustrations, huge numbers or excessive whitespace

## Density

- body: ~13px
- table data: ~10–11px
- table headings/captions: ~9px
- page title: ~17px
- header: 52px
- sidebar: 216px
- common row height: ~34–38px
- common radius: 6–8px

## Detail interaction

VM, network, cluster, NAS and software details use a **right sliding Drawer** (460px), preserving the left navigation and current page context. Do not replace it with a center modal or full navigation page.

## Architecture scalability

- first load: grouped tiers only
- operator views: Overview and Dependency only
- group navigation: same-canvas Overview drill-down with clickable breadcrumbs
- assets: explicit leaf drill-down; default scope prevents an unreadable 30+ node wall
- issue-only: isolate risky flows
- search: hostname/IP first; port/request ID later
- deterministic ELK layered layout; manual 20px-grid editing is a final correction layer
- Dependency defaults to Both, depth 2, with Monitoring disabled

## Executive presentation

The architecture screen is the visual centerpiece. It should look credible at full-screen presentation size, but it must remain an operator tool rather than becoming decorative.

# EOSL Timeline

`EoslTimelineChart` is a compact horizontal release timeline used in three contexts:

- Dashboard: at most eight project-used releases, risk ordered and aggregated by release.
- Software Lifecycle: every project-used matched release plus the existing risk/review groups.
- Software drawer: all releases for one product; seven rows by default, centered around the selected release, with “Show all versions”.

Explicit Active, Security and Extended support phases use restrained theme-compatible colors. Missing phases are not synthesized. TODAY uses `getAppNow()` and is rendered as a vertical dashed reference. Each row shows derived state and installed asset count; native hover text contains phase boundaries and EOSL.

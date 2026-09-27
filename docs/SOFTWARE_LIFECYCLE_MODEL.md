# Software Lifecycle Model

## Canonical flow

```text
Company Catalog (SoftwareProduct → SoftwareRelease → optional phases)
        ↓ reference, never copy lifecycle dates
ProjectSoftwareScope ─────┐
                          ├→ Project Used Software
AssetSoftwareInstallation ┘
        ↓ alias + version rule
Lifecycle Match → derived EOSL status and blast radius
```

The Company Catalog is company-wide. Project pages show the union of explicit `ProjectSoftwareScope` rows and products discovered on project assets. Catalog lifecycle dates are not copied into a project record.

## Product and release

`SoftwareProduct` contains vendor/category metadata plus `catalogStatus`, `lastCatalogSeenAt` and optional `externalKey`. Source-reference fields are intentionally excluded; audit belongs to an import batch.

`SoftwareRelease` supports nullable release, active-support, security-support, extended-support and EOSL dates. `status` is a temporary compatibility field only. UI and services use `deriveLifecycleStatus(eoslDate, getAppNow())`.

Optional `SoftwareLifecyclePhase` rows describe only phases supplied by the source. Missing phases are never invented. A release with only release/EOSL dates uses a neutral “Known lifecycle range”; a release with only EOSL uses an EOSL marker.

## Matching

1. Match the detected product name using canonical exact name or explicit `SoftwareProductAlias` (`EXACT`, `CONTAINS`, `REGEX`).
2. Zero product matches → `UNMAPPED`; multiple product matches → `AMBIGUOUS`.
3. Evaluate the existing release rules (`exact`, `prefix`, `regex`, `range`).
4. Zero release matches → `UNMAPPED`; multiple release matches → `AMBIGUOUS`; one match → `MATCHED`.

No fuzzy guessing is allowed. Lifecycle and EOSL remain unknown for unresolved installations.

## OS lifecycle

The VM drawer first attempts to match `osName + osVersion` to the Global Catalog. `vm.eoslDate` remains as a legacy fallback and is visibly labelled as such.

## Time

`getAppNow()` returns real time by default. `DEMO_NOW` freezes server calculations and `NEXT_PUBLIC_DEMO_NOW` freezes client-rendered demo surfaces. Do not embed a demo date in components.

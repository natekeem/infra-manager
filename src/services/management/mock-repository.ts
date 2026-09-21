import type {
  BatchImportResult,
  ManagementRepository,
} from "./repository";
import type {
  InfraAsset,
  NetworkPolicy,
  SoftwareProduct,
  SoftwareRelease,
  SopDocument,
  VmAsset,
} from "@/domain/models";
import {
  nasAssets as initialNasAssets,
  policies as initialPolicies,
  softwareProducts as initialSoftwareProducts,
  softwareReleases as initialSoftwareReleases,
  sops as initialSops,
  vms as initialVms,
} from "@/services/api/infrastructure/mock-data";

class MockManagementRepository implements ManagementRepository {
  private assets: InfraAsset[] = [
    ...initialVms.map((v) => ({ ...v, assetType: "VM" as const })),
    ...initialNasAssets,
  ];
  private products: SoftwareProduct[] = [...initialSoftwareProducts];
  private releases: SoftwareRelease[] = [...initialSoftwareReleases];
  private policies: NetworkPolicy[] = [...initialPolicies];
  private sops: SopDocument[] = [...initialSops];

  // Assets
  async getAssets(): Promise<InfraAsset[]> {
    return [...this.assets];
  }

  async getAssetById(id: string): Promise<InfraAsset | null> {
    return this.assets.find((a) => a.id === id) ?? null;
  }

  async createAsset(asset: InfraAsset): Promise<InfraAsset> {
    const newAsset: InfraAsset = {
      ...asset,
      id: asset.id || `asset-${Date.now().toString(36)}`,
      lastVerifiedAt: new Date().toISOString(),
    };
    this.assets.unshift(newAsset);
    return newAsset;
  }

  async updateAsset(id: string, updates: Partial<InfraAsset>): Promise<InfraAsset> {
    const idx = this.assets.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Asset not found: ${id}`);
    const updated = { ...this.assets[idx], ...updates, lastVerifiedAt: new Date().toISOString() };
    this.assets[idx] = updated;
    return updated;
  }

  async deleteAsset(id: string): Promise<boolean> {
    const len = this.assets.length;
    this.assets = this.assets.filter((a) => a.id !== id);
    return this.assets.length < len;
  }

  // Software Catalog
  async getProducts(): Promise<SoftwareProduct[]> {
    return [...this.products];
  }

  async createProduct(product: SoftwareProduct): Promise<SoftwareProduct> {
    const newProduct: SoftwareProduct = {
      ...product,
      id: product.id || `sp-${Date.now().toString(36)}`,
    };
    this.products.unshift(newProduct);
    return newProduct;
  }

  async getReleases(): Promise<SoftwareRelease[]> {
    return [...this.releases];
  }

  async createRelease(release: SoftwareRelease): Promise<SoftwareRelease> {
    const newRelease: SoftwareRelease = {
      ...release,
      id: release.id || `sr-${Date.now().toString(36)}`,
    };
    this.releases.unshift(newRelease);
    return newRelease;
  }

  async updateRelease(id: string, updates: Partial<SoftwareRelease>): Promise<SoftwareRelease> {
    const idx = this.releases.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Release not found: ${id}`);
    const updated = { ...this.releases[idx], ...updates };
    this.releases[idx] = updated;
    return updated;
  }

  async deleteRelease(id: string): Promise<boolean> {
    const len = this.releases.length;
    this.releases = this.releases.filter((r) => r.id !== id);
    return this.releases.length < len;
  }

  // Network Policies
  async getPolicies(): Promise<NetworkPolicy[]> {
    return [...this.policies];
  }

  async createPolicy(policy: NetworkPolicy): Promise<NetworkPolicy> {
    const newPolicy: NetworkPolicy = {
      ...policy,
      id: policy.id || `np-${Date.now().toString(36)}`,
      direction: policy.direction ?? "ONE_WAY",
    };
    this.policies.unshift(newPolicy);
    return newPolicy;
  }

  async updatePolicy(id: string, updates: Partial<NetworkPolicy>): Promise<NetworkPolicy> {
    const idx = this.policies.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Policy not found: ${id}`);
    const updated = { ...this.policies[idx], ...updates };
    this.policies[idx] = updated;
    return updated;
  }

  async deletePolicy(id: string): Promise<boolean> {
    const len = this.policies.length;
    this.policies = this.policies.filter((p) => p.id !== id);
    return this.policies.length < len;
  }

  // SOPs
  async getSops(): Promise<SopDocument[]> {
    return [...this.sops];
  }

  async createSop(sop: SopDocument): Promise<SopDocument> {
    const newSop: SopDocument = {
      ...sop,
      id: sop.id || `sop-${Date.now().toString(36)}`,
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    this.sops.unshift(newSop);
    return newSop;
  }

  async updateSop(id: string, updates: Partial<SopDocument>): Promise<SopDocument> {
    const idx = this.sops.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`SOP not found: ${id}`);
    const updated = { ...this.sops[idx], ...updates, updatedAt: new Date().toISOString().slice(0, 10) };
    this.sops[idx] = updated;
    return updated;
  }

  async deleteSop(id: string): Promise<boolean> {
    const len = this.sops.length;
    this.sops = this.sops.filter((s) => s.id !== id);
    return this.sops.length < len;
  }

  // Batch Import
  async importBatch(payload: {
    assets?: InfraAsset[];
    policies?: NetworkPolicy[];
    releases?: SoftwareRelease[];
    sops?: SopDocument[];
  }): Promise<BatchImportResult> {
    let assetsCount = 0;
    let policiesCount = 0;
    let releasesCount = 0;
    let sopsCount = 0;
    const errors: string[] = [];

    if (payload.assets) {
      for (const a of payload.assets) {
        if (!a.hostname || !a.ipAddress) {
          errors.push(`Asset invalid (missing hostname/ip): ${JSON.stringify(a)}`);
          continue;
        }
        await this.createAsset(a);
        assetsCount++;
      }
    }

    if (payload.policies) {
      for (const p of payload.policies) {
        if (!p.sourceIp || !p.targetIp || !p.port) {
          errors.push(`Policy invalid (missing sourceIp/targetIp/port): ${JSON.stringify(p)}`);
          continue;
        }
        await this.createPolicy(p);
        policiesCount++;
      }
    }

    if (payload.releases) {
      for (const r of payload.releases) {
        if (!r.productName || !r.version) {
          errors.push(`Release invalid (missing productName/version): ${JSON.stringify(r)}`);
          continue;
        }
        await this.createRelease(r);
        releasesCount++;
      }
    }

    if (payload.sops) {
      for (const s of payload.sops) {
        if (!s.title) {
          errors.push(`SOP invalid (missing title): ${JSON.stringify(s)}`);
          continue;
        }
        await this.createSop(s);
        sopsCount++;
      }
    }

    return {
      importedCount: assetsCount + policiesCount + releasesCount + sopsCount,
      assetsCount,
      policiesCount,
      releasesCount,
      sopsCount,
      errors,
    };
  }
}

export const managementRepo = new MockManagementRepository();

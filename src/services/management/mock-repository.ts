import type {
  BatchImportResult,
  ManagementRepository,
} from "./repository";
import type {
  ArchitectureRelation,
  Asset,
  ClusterEntity,
  NetworkPolicy,
  ProjectGroup,
  SoftwareProduct,
  SoftwareRelease,
  SopDocument,
  TopologyGroup,
} from "@/domain/models";
import {
  clusters as initialClusters,
  policies as initialPolicies,
  projectGroups as initialProjectGroups,
  relations as initialRelations,
  softwareProducts as initialSoftwareProducts,
  softwareReleases as initialSoftwareReleases,
  sops as initialSops,
  topologyGroups as initialTopologyGroups,
  vms as initialVms,
} from "@/services/api/infrastructure/mock-data";

const STORAGE_PREFIX = "rpa-infra-management-v1:";

function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return defaultValue;
    const parsed = JSON.parse(raw);
    return parsed !== null && parsed !== undefined ? (parsed as T) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {}
}

class MockManagementRepository implements ManagementRepository {
  private projects: ProjectGroup[] = [...initialProjectGroups];
  private assets: Asset[] = [...initialVms];
  private topologyGroups: TopologyGroup[] = [...initialTopologyGroups];
  private clusters: ClusterEntity[] = [...initialClusters];
  private relations: ArchitectureRelation[] = [...initialRelations];
  private products: SoftwareProduct[] = [...initialSoftwareProducts];
  private releases: SoftwareRelease[] = [...initialSoftwareReleases];
  private policies: NetworkPolicy[] = [...initialPolicies];
  private sops: SopDocument[] = [...initialSops];
  private initialized = false;

  private ensureInitialized() {
    if (typeof window === "undefined" || this.initialized) return;
    this.initialized = true;
    this.projects = loadFromStorage("projects", this.projects);
    this.assets = loadFromStorage("assets", this.assets);
    this.topologyGroups = loadFromStorage("topologyGroups", this.topologyGroups);
    this.clusters = loadFromStorage("clusters", this.clusters);
    this.relations = loadFromStorage("relations", this.relations);
    this.products = loadFromStorage("products", this.products);
    this.releases = loadFromStorage("releases", this.releases);
    this.policies = loadFromStorage("policies", this.policies);
    this.sops = loadFromStorage("sops", this.sops);
  }

  // Project Groups
  async getProjects(): Promise<ProjectGroup[]> {
    this.ensureInitialized();
    return [...this.projects];
  }

  async createProject(project: ProjectGroup): Promise<ProjectGroup> {
    this.ensureInitialized();
    const newProj: ProjectGroup = {
      ...project,
      id: project.id || `proj-${Date.now().toString(36)}`,
    };
    this.projects.unshift(newProj);
    saveToStorage("projects", this.projects);
    return newProj;
  }

  async updateProject(id: string, updates: Partial<ProjectGroup>): Promise<ProjectGroup> {
    this.ensureInitialized();
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project not found: ${id}`);
    const updated = { ...this.projects[idx], ...updates };
    this.projects[idx] = updated;
    saveToStorage("projects", this.projects);
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    this.ensureInitialized();
    const len = this.projects.length;
    this.projects = this.projects.filter((p) => p.id !== id);
    saveToStorage("projects", this.projects);
    return this.projects.length < len;
  }

  // Assets
  async getAssets(): Promise<Asset[]> {
    this.ensureInitialized();
    return [...this.assets];
  }

  async getAssetById(id: string): Promise<Asset | null> {
    this.ensureInitialized();
    return this.assets.find((a) => a.id === id) ?? null;
  }

  async createAsset(asset: Asset): Promise<Asset> {
    this.ensureInitialized();
    const newAsset: Asset = {
      ...asset,
      id: asset.id || `asset-${Date.now().toString(36)}`,
      lastVerifiedAt: new Date().toISOString(),
    };
    this.assets.unshift(newAsset);
    saveToStorage("assets", this.assets);
    return newAsset;
  }

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
    this.ensureInitialized();
    const idx = this.assets.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Asset not found: ${id}`);
    const updated = { ...this.assets[idx], ...updates, lastVerifiedAt: new Date().toISOString() };
    this.assets[idx] = updated;
    saveToStorage("assets", this.assets);
    return updated;
  }

  async deleteAsset(id: string): Promise<boolean> {
    this.ensureInitialized();
    const len = this.assets.length;
    this.assets = this.assets.filter((a) => a.id !== id);
    saveToStorage("assets", this.assets);
    return this.assets.length < len;
  }

  // Topology Groups
  async getTopologyGroups(): Promise<TopologyGroup[]> {
    this.ensureInitialized();
    return [...this.topologyGroups];
  }

  async createTopologyGroup(group: TopologyGroup): Promise<TopologyGroup> {
    this.ensureInitialized();
    const newGroup: TopologyGroup = {
      ...group,
      id: group.id || `tg-${Date.now().toString(36)}`,
    };
    this.topologyGroups.unshift(newGroup);
    saveToStorage("topologyGroups", this.topologyGroups);
    return newGroup;
  }

  async updateTopologyGroup(id: string, updates: Partial<TopologyGroup>): Promise<TopologyGroup> {
    this.ensureInitialized();
    const idx = this.topologyGroups.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Topology group not found: ${id}`);
    const updated = { ...this.topologyGroups[idx], ...updates };
    this.topologyGroups[idx] = updated;
    saveToStorage("topologyGroups", this.topologyGroups);
    return updated;
  }

  async deleteTopologyGroup(id: string): Promise<boolean> {
    this.ensureInitialized();
    const len = this.topologyGroups.length;
    this.topologyGroups = this.topologyGroups.filter((g) => g.id !== id);
    saveToStorage("topologyGroups", this.topologyGroups);
    return this.topologyGroups.length < len;
  }

  // Clusters
  async getClusters(): Promise<ClusterEntity[]> {
    this.ensureInitialized();
    return [...this.clusters];
  }

  async createCluster(cluster: ClusterEntity): Promise<ClusterEntity> {
    this.ensureInitialized();
    const newCluster: ClusterEntity = {
      ...cluster,
      id: cluster.id || `cluster-${Date.now().toString(36)}`,
    };
    this.clusters.unshift(newCluster);
    saveToStorage("clusters", this.clusters);
    return newCluster;
  }

  async updateCluster(id: string, updates: Partial<ClusterEntity>): Promise<ClusterEntity> {
    this.ensureInitialized();
    const idx = this.clusters.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Cluster not found: ${id}`);
    const updated = { ...this.clusters[idx], ...updates };
    this.clusters[idx] = updated;
    saveToStorage("clusters", this.clusters);
    return updated;
  }

  async deleteCluster(id: string): Promise<boolean> {
    this.ensureInitialized();
    const len = this.clusters.length;
    this.clusters = this.clusters.filter((c) => c.id !== id);
    saveToStorage("clusters", this.clusters);
    return this.clusters.length < len;
  }

  // Architecture Relations
  async getRelations(): Promise<ArchitectureRelation[]> {
    this.ensureInitialized();
    return [...this.relations];
  }

  async createRelation(relation: ArchitectureRelation): Promise<ArchitectureRelation> {
    this.ensureInitialized();
    const newRel: ArchitectureRelation = {
      ...relation,
      id: relation.id || `rel-${Date.now().toString(36)}`,
    };
    this.relations.unshift(newRel);
    saveToStorage("relations", this.relations);
    return newRel;
  }

  async updateRelation(id: string, updates: Partial<ArchitectureRelation>): Promise<ArchitectureRelation> {
    this.ensureInitialized();
    const idx = this.relations.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Relation not found: ${id}`);
    const updated = { ...this.relations[idx], ...updates };
    this.relations[idx] = updated;
    saveToStorage("relations", this.relations);
    return updated;
  }

  async deleteRelation(id: string): Promise<boolean> {
    this.ensureInitialized();
    const len = this.relations.length;
    this.relations = this.relations.filter((r) => r.id !== id);
    saveToStorage("relations", this.relations);
    return this.relations.length < len;
  }

  // Software Catalog
  async getProducts(): Promise<SoftwareProduct[]> {
    this.ensureInitialized();
    return [...this.products];
  }

  async createProduct(product: SoftwareProduct): Promise<SoftwareProduct> {
    this.ensureInitialized();
    const newProduct: SoftwareProduct = {
      ...product,
      id: product.id || `sp-${Date.now().toString(36)}`,
    };
    this.products.unshift(newProduct);
    saveToStorage("products", this.products);
    return newProduct;
  }

  async getReleases(): Promise<SoftwareRelease[]> {
    this.ensureInitialized();
    return [...this.releases];
  }

  async createRelease(release: SoftwareRelease): Promise<SoftwareRelease> {
    this.ensureInitialized();
    const newRelease: SoftwareRelease = {
      ...release,
      id: release.id || `sr-${Date.now().toString(36)}`,
    };
    this.releases.unshift(newRelease);
    saveToStorage("releases", this.releases);
    return newRelease;
  }

  async updateRelease(id: string, updates: Partial<SoftwareRelease>): Promise<SoftwareRelease> {
    this.ensureInitialized();
    const idx = this.releases.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Release not found: ${id}`);
    const updated = { ...this.releases[idx], ...updates };
    this.releases[idx] = updated;
    saveToStorage("releases", this.releases);
    return updated;
  }

  async deleteRelease(id: string): Promise<boolean> {
    this.ensureInitialized();
    const len = this.releases.length;
    this.releases = this.releases.filter((r) => r.id !== id);
    saveToStorage("releases", this.releases);
    return this.releases.length < len;
  }

  // Network Policies
  async getPolicies(): Promise<NetworkPolicy[]> {
    this.ensureInitialized();
    return [...this.policies];
  }

  async createPolicy(policy: NetworkPolicy): Promise<NetworkPolicy> {
    this.ensureInitialized();
    const newPolicy: NetworkPolicy = {
      ...policy,
      id: policy.id || `pol-${Date.now().toString(36)}`,
      requestedAt: policy.requestedAt || new Date().toISOString(),
    };
    this.policies.unshift(newPolicy);
    saveToStorage("policies", this.policies);
    return newPolicy;
  }

  async updatePolicy(id: string, updates: Partial<NetworkPolicy>): Promise<NetworkPolicy> {
    this.ensureInitialized();
    const idx = this.policies.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Policy not found: ${id}`);
    const updated = { ...this.policies[idx], ...updates };
    this.policies[idx] = updated;
    saveToStorage("policies", this.policies);
    return updated;
  }

  async deletePolicy(id: string): Promise<boolean> {
    this.ensureInitialized();
    const len = this.policies.length;
    this.policies = this.policies.filter((p) => p.id !== id);
    saveToStorage("policies", this.policies);
    return this.policies.length < len;
  }

  // SOP Documents
  async getSops(): Promise<SopDocument[]> {
    this.ensureInitialized();
    return [...this.sops];
  }

  async createSop(sop: SopDocument): Promise<SopDocument> {
    this.ensureInitialized();
    const newSop: SopDocument = {
      ...sop,
      id: sop.id || `sop-${Date.now().toString(36)}`,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    this.sops.unshift(newSop);
    saveToStorage("sops", this.sops);
    return newSop;
  }

  async updateSop(id: string, updates: Partial<SopDocument>): Promise<SopDocument> {
    this.ensureInitialized();
    const idx = this.sops.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`SOP not found: ${id}`);
    const updated = {
      ...this.sops[idx],
      ...updates,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    this.sops[idx] = updated;
    saveToStorage("sops", this.sops);
    return updated;
  }

  async deleteSop(id: string): Promise<boolean> {
    this.ensureInitialized();
    const len = this.sops.length;
    this.sops = this.sops.filter((s) => s.id !== id);
    saveToStorage("sops", this.sops);
    return this.sops.length < len;
  }

  // Batch Import
  async importBatch(payload: {
    assets?: Asset[];
    policies?: NetworkPolicy[];
    releases?: SoftwareRelease[];
    sops?: SopDocument[];
  }): Promise<BatchImportResult> {
    const errors: string[] = [];
    let assetsCount = 0;
    let policiesCount = 0;
    let releasesCount = 0;
    let sopsCount = 0;

    if (payload.assets?.length) {
      for (const a of payload.assets) {
        if (!a.hostname || !a.ipAddress) {
          errors.push(`Asset missing hostname/ipAddress: ${JSON.stringify(a)}`);
          continue;
        }
        await this.createAsset(a);
        assetsCount++;
      }
    }

    if (payload.policies?.length) {
      for (const p of payload.policies) {
        if (!p.sourceVmId || !p.targetIp || !p.port) {
          errors.push(`Policy missing mandatory fields: ${JSON.stringify(p)}`);
          continue;
        }
        await this.createPolicy(p);
        policiesCount++;
      }
    }

    if (payload.releases?.length) {
      for (const r of payload.releases) {
        if (!r.productName || !r.version) {
          errors.push(`Release missing productName/version: ${JSON.stringify(r)}`);
          continue;
        }
        await this.createRelease(r);
        releasesCount++;
      }
    }

    if (payload.sops?.length) {
      for (const s of payload.sops) {
        if (!s.title || !s.category) {
          errors.push(`SOP missing title/category: ${JSON.stringify(s)}`);
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

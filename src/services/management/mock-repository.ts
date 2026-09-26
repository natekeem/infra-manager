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

  // Project Groups
  async getProjects(): Promise<ProjectGroup[]> {
    return [...this.projects];
  }

  async createProject(project: ProjectGroup): Promise<ProjectGroup> {
    const newProj: ProjectGroup = {
      ...project,
      id: project.id || `proj-${Date.now().toString(36)}`,
    };
    this.projects.unshift(newProj);
    return newProj;
  }

  async updateProject(id: string, updates: Partial<ProjectGroup>): Promise<ProjectGroup> {
    const idx = this.projects.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Project not found: ${id}`);
    const updated = { ...this.projects[idx], ...updates };
    this.projects[idx] = updated;
    return updated;
  }

  async deleteProject(id: string): Promise<boolean> {
    const len = this.projects.length;
    this.projects = this.projects.filter((p) => p.id !== id);
    return this.projects.length < len;
  }

  // Assets
  async getAssets(): Promise<Asset[]> {
    return [...this.assets];
  }

  async getAssetById(id: string): Promise<Asset | null> {
    return this.assets.find((a) => a.id === id) ?? null;
  }

  async createAsset(asset: Asset): Promise<Asset> {
    const newAsset: Asset = {
      ...asset,
      id: asset.id || `asset-${Date.now().toString(36)}`,
      lastVerifiedAt: new Date().toISOString(),
    };
    this.assets.unshift(newAsset);
    return newAsset;
  }

  async updateAsset(id: string, updates: Partial<Asset>): Promise<Asset> {
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

  // Topology Groups
  async getTopologyGroups(): Promise<TopologyGroup[]> {
    return [...this.topologyGroups];
  }

  async createTopologyGroup(group: TopologyGroup): Promise<TopologyGroup> {
    const newGroup: TopologyGroup = {
      ...group,
      id: group.id || `tg-${Date.now().toString(36)}`,
    };
    this.topologyGroups.unshift(newGroup);
    return newGroup;
  }

  async updateTopologyGroup(id: string, updates: Partial<TopologyGroup>): Promise<TopologyGroup> {
    const idx = this.topologyGroups.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Topology group not found: ${id}`);
    const updated = { ...this.topologyGroups[idx], ...updates };
    this.topologyGroups[idx] = updated;
    return updated;
  }

  async deleteTopologyGroup(id: string): Promise<boolean> {
    const len = this.topologyGroups.length;
    this.topologyGroups = this.topologyGroups.filter((g) => g.id !== id);
    return this.topologyGroups.length < len;
  }

  // Clusters
  async getClusters(): Promise<ClusterEntity[]> {
    return [...this.clusters];
  }

  async createCluster(cluster: ClusterEntity): Promise<ClusterEntity> {
    const newCluster: ClusterEntity = {
      ...cluster,
      id: cluster.id || `cluster-${Date.now().toString(36)}`,
    };
    this.clusters.unshift(newCluster);
    return newCluster;
  }

  async updateCluster(id: string, updates: Partial<ClusterEntity>): Promise<ClusterEntity> {
    const idx = this.clusters.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error(`Cluster not found: ${id}`);
    const updated = { ...this.clusters[idx], ...updates };
    this.clusters[idx] = updated;
    return updated;
  }

  async deleteCluster(id: string): Promise<boolean> {
    const len = this.clusters.length;
    this.clusters = this.clusters.filter((c) => c.id !== id);
    return this.clusters.length < len;
  }

  // Architecture Relations
  async getRelations(): Promise<ArchitectureRelation[]> {
    return [...this.relations];
  }

  async createRelation(relation: ArchitectureRelation): Promise<ArchitectureRelation> {
    const newRel: ArchitectureRelation = {
      ...relation,
      id: relation.id || `rel-${Date.now().toString(36)}`,
    };
    this.relations.unshift(newRel);
    return newRel;
  }

  async updateRelation(id: string, updates: Partial<ArchitectureRelation>): Promise<ArchitectureRelation> {
    const idx = this.relations.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(`Relation not found: ${id}`);
    const updated = { ...this.relations[idx], ...updates };
    this.relations[idx] = updated;
    return updated;
  }

  async deleteRelation(id: string): Promise<boolean> {
    const len = this.relations.length;
    this.relations = this.relations.filter((r) => r.id !== id);
    return this.relations.length < len;
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
      id: policy.id || `pol-${Date.now().toString(36)}`,
      requestedAt: policy.requestedAt || new Date().toISOString(),
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

  // SOP Documents
  async getSops(): Promise<SopDocument[]> {
    return [...this.sops];
  }

  async createSop(sop: SopDocument): Promise<SopDocument> {
    const newSop: SopDocument = {
      ...sop,
      id: sop.id || `sop-${Date.now().toString(36)}`,
      updatedAt: new Date().toISOString().split("T")[0],
    };
    this.sops.unshift(newSop);
    return newSop;
  }

  async updateSop(id: string, updates: Partial<SopDocument>): Promise<SopDocument> {
    const idx = this.sops.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`SOP not found: ${id}`);
    const updated = {
      ...this.sops[idx],
      ...updates,
      updatedAt: new Date().toISOString().split("T")[0],
    };
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

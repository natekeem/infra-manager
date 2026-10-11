import type {
  ArchitectureRelation,
  Asset,
  ClusterEntity,
  InfraAsset,
  NetworkPolicy,
  ProjectGroup,
  SoftwareProduct,
  SoftwareRelease,
  SopDocument,
  TopologyGroup,
} from "@/domain/models";

export interface BatchImportResult {
  importedCount: number;
  assetsCount: number;
  policiesCount: number;
  releasesCount: number;
  sopsCount: number;
  errors: string[];
}

export interface ManagementRepository {
  // Project Groups
  getProjects(): Promise<ProjectGroup[]>;
  createProject(project: ProjectGroup): Promise<ProjectGroup>;
  updateProject(id: string, updates: Partial<ProjectGroup>): Promise<ProjectGroup>;
  deleteProject(id: string): Promise<boolean>;

  // Assets
  getAssets(): Promise<Asset[]>;
  getAssetById(id: string): Promise<Asset | null>;
  createAsset(asset: Asset): Promise<Asset>;
  updateAsset(id: string, updates: Partial<Asset>): Promise<Asset>;
  deleteAsset(id: string): Promise<boolean>;

  // Topology Groups
  getTopologyGroups(): Promise<TopologyGroup[]>;
  createTopologyGroup(group: TopologyGroup): Promise<TopologyGroup>;
  updateTopologyGroup(id: string, updates: Partial<TopologyGroup>): Promise<TopologyGroup>;
  deleteTopologyGroup(id: string): Promise<boolean>;

  // Clusters
  getClusters(): Promise<ClusterEntity[]>;
  createCluster(cluster: ClusterEntity): Promise<ClusterEntity>;
  updateCluster(id: string, updates: Partial<ClusterEntity>): Promise<ClusterEntity>;
  deleteCluster(id: string): Promise<boolean>;

  // Architecture Relations
  getRelations(): Promise<ArchitectureRelation[]>;
  createRelation(relation: ArchitectureRelation): Promise<ArchitectureRelation>;
  updateRelation(id: string, updates: Partial<ArchitectureRelation>): Promise<ArchitectureRelation>;
  deleteRelation(id: string): Promise<boolean>;

  // Software Products & Catalog Releases
  getProducts(): Promise<SoftwareProduct[]>;
  createProduct(product: SoftwareProduct): Promise<SoftwareProduct>;
  getReleases(): Promise<SoftwareRelease[]>;
  createRelease(release: SoftwareRelease): Promise<SoftwareRelease>;
  updateRelease(id: string, updates: Partial<SoftwareRelease>): Promise<SoftwareRelease>;
  deleteRelease(id: string): Promise<boolean>;

  // Network Policies
  getPolicies(): Promise<NetworkPolicy[]>;
  createPolicy(policy: NetworkPolicy): Promise<NetworkPolicy>;
  updatePolicy(id: string, updates: Partial<NetworkPolicy>): Promise<NetworkPolicy>;
  deletePolicy(id: string): Promise<boolean>;

  // SOP Documents
  getSops(): Promise<SopDocument[]>;
  createSop(sop: SopDocument): Promise<SopDocument>;
  updateSop(id: string, updates: Partial<SopDocument>): Promise<SopDocument>;
  deleteSop(id: string): Promise<boolean>;

  // Batch Import
  importBatch(payload: {
    assets?: Asset[];
    policies?: NetworkPolicy[];
    releases?: SoftwareRelease[];
    sops?: SopDocument[];
  }): Promise<BatchImportResult>;
}

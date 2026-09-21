import type {
  ClusterEntity,
  InfraAsset,
  NasAsset,
  NetworkPolicy,
  SoftwareProduct,
  SoftwareRelease,
  SopDocument,
  VmAsset,
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
  // Assets
  getAssets(): Promise<InfraAsset[]>;
  getAssetById(id: string): Promise<InfraAsset | null>;
  createAsset(asset: InfraAsset): Promise<InfraAsset>;
  updateAsset(id: string, updates: Partial<InfraAsset>): Promise<InfraAsset>;
  deleteAsset(id: string): Promise<boolean>;

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
    assets?: InfraAsset[];
    policies?: NetworkPolicy[];
    releases?: SoftwareRelease[];
    sops?: SopDocument[];
  }): Promise<BatchImportResult>;
}

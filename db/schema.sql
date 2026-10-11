CREATE DATABASE IF NOT EXISTS rpa_ops CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE rpa_ops;

CREATE TABLE import_batch (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  source_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imported_by VARCHAR(100) NULL,
  notes TEXT NULL
);

CREATE TABLE vm_asset (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  asset_key VARCHAR(100) NOT NULL UNIQUE,
  project_group_id VARCHAR(100) NULL,
  hostname VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  environment VARCHAR(30) NOT NULL,
  role VARCHAR(100) NULL,
  service_name VARCHAR(150) NULL,
  zone_name VARCHAR(80) NULL,
  criticality ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL DEFAULT 'MEDIUM',
  os_name VARCHAR(150) NULL,
  os_version VARCHAR(100) NULL,
  cpu_cores INT NULL,
  memory_gb INT NULL,
  disk_gb INT NULL,
  owner VARCHAR(150) NULL,
  vm_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  eosl_date DATE NULL,
  grafana_path TEXT NULL,
  import_batch_id BIGINT NULL,
  last_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_vm_ip (ip_address),
  INDEX idx_vm_service (service_name),
  INDEX idx_vm_zone (zone_name),
  INDEX idx_vm_eosl (eosl_date),
  CONSTRAINT fk_vm_import FOREIGN KEY (import_batch_id) REFERENCES import_batch(id)
);

CREATE TABLE software_catalog (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  canonical_name VARCHAR(255) NOT NULL,
  vendor VARCHAR(150) NULL,
  category VARCHAR(100) NULL,
  product_family VARCHAR(150) NULL,
  description TEXT NULL,
  catalog_status ENUM('ACTIVE','STALE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
  last_catalog_seen_at DATETIME NULL,
  external_key VARCHAR(255) NULL,
  UNIQUE KEY uq_sw_catalog (canonical_name, vendor)
);

CREATE TABLE software_release (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  software_id BIGINT NOT NULL,
  version VARCHAR(100) NOT NULL,
  release_date DATE NULL,
  support_end_date DATE NULL,
  security_support_end_date DATE NULL,
  extended_support_end_date DATE NULL,
  eosl_date DATE NULL,
  version_match_rule ENUM('exact','prefix','regex','range') NOT NULL DEFAULT 'exact',
  match_pattern VARCHAR(255) NULL,
  successor_release_id BIGINT NULL,
  catalog_status ENUM('ACTIVE','STALE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
  last_catalog_seen_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sw_release (software_id, version),
  INDEX idx_sw_release_eosl (eosl_date),
  CONSTRAINT fk_sw_release_product FOREIGN KEY (software_id) REFERENCES software_catalog(id),
  CONSTRAINT fk_sw_release_successor FOREIGN KEY (successor_release_id) REFERENCES software_release(id)
);

CREATE TABLE software_lifecycle_phase (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  release_id BIGINT NOT NULL,
  phase_type ENUM('ACTIVE_SUPPORT','SECURITY_SUPPORT','EXTENDED_SUPPORT','MAINTENANCE','OTHER') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  label VARCHAR(150) NOT NULL,
  CONSTRAINT fk_phase_release FOREIGN KEY (release_id) REFERENCES software_release(id),
  INDEX idx_phase_release_dates (release_id,start_date,end_date)
);

CREATE TABLE software_product_alias (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  alias VARCHAR(255) NOT NULL,
  match_type ENUM('EXACT','CONTAINS','REGEX') NOT NULL,
  CONSTRAINT fk_alias_product FOREIGN KEY (product_id) REFERENCES software_catalog(id),
  UNIQUE KEY uq_product_alias (product_id,alias,match_type)
);

CREATE TABLE project_software_scope (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  project_group_id VARCHAR(100) NOT NULL,
  product_id BIGINT NOT NULL,
  preferred_release_id BIGINT NULL,
  scope_source ENUM('DISCOVERED','MANUAL') NOT NULL,
  usage_status ENUM('IN_USE','PLANNED','RETIRED') NOT NULL DEFAULT 'IN_USE',
  owner VARCHAR(150) NULL,
  criticality ENUM('CRITICAL','HIGH','MEDIUM','LOW') NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_scope_product FOREIGN KEY (product_id) REFERENCES software_catalog(id),
  CONSTRAINT fk_scope_release FOREIGN KEY (preferred_release_id) REFERENCES software_release(id),
  UNIQUE KEY uq_project_product_scope (project_group_id,product_id)
);

CREATE TABLE software_catalog_import_batch (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  file_name VARCHAR(255) NOT NULL,
  total_rows INT NOT NULL,
  new_count INT NOT NULL DEFAULT 0,
  changed_count INT NOT NULL DEFAULT 0,
  unchanged_count INT NOT NULL DEFAULT 0,
  missing_count INT NOT NULL DEFAULT 0
);

CREATE TABLE software_release_lifecycle_history (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  release_id BIGINT NOT NULL,
  field_name VARCHAR(80) NOT NULL,
  old_value VARCHAR(255) NULL,
  new_value VARCHAR(255) NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  import_batch_id BIGINT NOT NULL,
  CONSTRAINT fk_history_release FOREIGN KEY (release_id) REFERENCES software_release(id),
  CONSTRAINT fk_history_batch FOREIGN KEY (import_batch_id) REFERENCES software_catalog_import_batch(id),
  INDEX idx_history_release (release_id,changed_at)
);

CREATE TABLE vm_software (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vm_id BIGINT NOT NULL,
  software_id BIGINT NOT NULL,
  detected_product_name VARCHAR(255) NULL,
  version VARCHAR(100) NULL,
  matched_release_id BIGINT NULL,
  edition VARCHAR(100) NULL,
  installed_at DATE NULL,
  eosl_date DATE NULL,
  import_batch_id BIGINT NULL,
  last_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vm_software (vm_id, software_id, version),
  INDEX idx_sw_eosl (eosl_date),
  CONSTRAINT fk_vmsw_vm FOREIGN KEY (vm_id) REFERENCES vm_asset(id),
  CONSTRAINT fk_vmsw_sw FOREIGN KEY (software_id) REFERENCES software_catalog(id),
  CONSTRAINT fk_vmsw_release FOREIGN KEY (matched_release_id) REFERENCES software_release(id),
  CONSTRAINT fk_vmsw_import FOREIGN KEY (import_batch_id) REFERENCES import_batch(id)
);

CREATE TABLE network_policy (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  policy_key VARCHAR(120) NOT NULL UNIQUE,
  source_vm_id BIGINT NULL,
  source_name VARCHAR(255) NOT NULL,
  source_ip VARCHAR(45) NOT NULL,
  target_vm_id BIGINT NULL,
  target_name VARCHAR(255) NOT NULL,
  target_ip VARCHAR(45) NOT NULL,
  protocol ENUM('TCP','UDP') NOT NULL DEFAULT 'TCP',
  port INT NOT NULL,
  direction ENUM('ONE_WAY','BIDIRECTIONAL') NOT NULL DEFAULT 'ONE_WAY',
  approval_status ENUM('APPROVED','PENDING','REJECTED','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  requested_at DATETIME NULL,
  approved_at DATETIME NULL,
  valid_from DATETIME NULL,
  expires_at DATETIME NULL,
  request_id VARCHAR(150) NULL,
  purpose VARCHAR(500) NULL,
  owner VARCHAR(150) NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  import_batch_id BIGINT NULL,
  last_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_np_source (source_ip),
  INDEX idx_np_target (target_ip, port),
  INDEX idx_np_expiry (expires_at),
  INDEX idx_np_approval (approval_status),
  CONSTRAINT fk_np_source_vm FOREIGN KEY (source_vm_id) REFERENCES vm_asset(id),
  CONSTRAINT fk_np_target_vm FOREIGN KEY (target_vm_id) REFERENCES vm_asset(id),
  CONSTRAINT fk_np_import FOREIGN KEY (import_batch_id) REFERENCES import_batch(id)
);

CREATE TABLE service_dependency (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  dependency_key VARCHAR(120) NOT NULL UNIQUE,
  source_service VARCHAR(150) NOT NULL,
  target_service VARCHAR(150) NOT NULL,
  relationship_type VARCHAR(60) NOT NULL DEFAULT 'CALLS',
  protocol VARCHAR(20) NULL,
  port INT NULL,
  description VARCHAR(500) NULL,
  import_batch_id BIGINT NULL,
  last_verified_at DATETIME NULL,
  CONSTRAINT fk_sd_import FOREIGN KEY (import_batch_id) REFERENCES import_batch(id)
);

CREATE TABLE sop_document (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  sop_key VARCHAR(120) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NULL,
  document_url TEXT NULL,
  content_md MEDIUMTEXT NULL,
  owner VARCHAR(150) NULL,
  import_batch_id BIGINT NULL,
  last_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sop_import FOREIGN KEY (import_batch_id) REFERENCES import_batch(id)
);

CREATE TABLE vm_sop_map (
  vm_id BIGINT NOT NULL,
  sop_id BIGINT NOT NULL,
  relation_type VARCHAR(50) NOT NULL DEFAULT 'RELATED',
  PRIMARY KEY (vm_id, sop_id),
  CONSTRAINT fk_vsm_vm FOREIGN KEY (vm_id) REFERENCES vm_asset(id),
  CONSTRAINT fk_vsm_sop FOREIGN KEY (sop_id) REFERENCES sop_document(id)
);

-- Telegraf observations remain in InfluxDB.
-- MySQL is the declared/approved state; InfluxDB is the observed/actual state.
-- Do not duplicate raw time-series data into MySQL unless a later reporting need justifies a cache.

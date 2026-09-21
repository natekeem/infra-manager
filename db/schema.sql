CREATE DATABASE IF NOT EXISTS rpa_ops CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE rpa_ops;

CREATE TABLE import_batch (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  source_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_ref TEXT NULL,
  imported_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  imported_by VARCHAR(100) NULL,
  notes TEXT NULL
);

CREATE TABLE vm_asset (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  asset_key VARCHAR(100) NOT NULL UNIQUE,
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
  source_ref TEXT NULL,
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
  UNIQUE KEY uq_sw_catalog (canonical_name, vendor)
);

CREATE TABLE vm_software (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vm_id BIGINT NOT NULL,
  software_id BIGINT NOT NULL,
  version VARCHAR(100) NULL,
  edition VARCHAR(100) NULL,
  installed_at DATE NULL,
  eosl_date DATE NULL,
  source_ref TEXT NULL,
  import_batch_id BIGINT NULL,
  last_verified_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vm_software (vm_id, software_id, version),
  INDEX idx_sw_eosl (eosl_date),
  CONSTRAINT fk_vmsw_vm FOREIGN KEY (vm_id) REFERENCES vm_asset(id),
  CONSTRAINT fk_vmsw_sw FOREIGN KEY (software_id) REFERENCES software_catalog(id),
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
  approval_status ENUM('APPROVED','PENDING','REJECTED','UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
  requested_at DATETIME NULL,
  approved_at DATETIME NULL,
  valid_from DATETIME NULL,
  expires_at DATETIME NULL,
  request_id VARCHAR(150) NULL,
  purpose VARCHAR(500) NULL,
  owner VARCHAR(150) NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  source_ref TEXT NULL,
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
  source_ref TEXT NULL,
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
  source_ref TEXT NULL,
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

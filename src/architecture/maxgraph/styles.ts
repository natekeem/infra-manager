import type { CellStyle } from "@maxgraph/core";
import type { Asset, ArchitectureRelation, ClusterEntity } from "@/domain/models";

const HEALTH_COLORS = {
  healthy: "#12b76a",
  warning: "#f79009",
  critical: "#f04438",
  unknown: "#98a2b3",
} as const;

export function assetStyle(asset: Asset): CellStyle {
  const icon = asset.assetType === "NAS" ? "nas" : asset.assetType === "DBAAS" ? "database" : asset.assetType === "K8S_WORKLOAD" || asset.assetType === "CONTAINER" ? "kubernetes" : asset.role === "DB" ? "database" : "server";
  return {
    shape: "image",
    image: `/architecture/icons/${icon}.svg`,
    imageWidth: 44,
    imageHeight: 36,
    imageAlign: "center",
    verticalLabelPosition: "bottom",
    verticalAlign: "top",
    align: "center",
    spacingTop: 44,
    fontSize: 10,
    fontColor: "#344054",
    strokeColor: HEALTH_COLORS[asset.health],
    strokeWidth: 1.5,
    fillColor: "none",
    resizable: true,
    rounded: true,
  };
}

export function clusterStyle(cluster: ClusterEntity): CellStyle {
  const color = cluster.status === "HEALTHY" ? HEALTH_COLORS.healthy : cluster.status === "DEGRADED" ? HEALTH_COLORS.warning : HEALTH_COLORS.critical;
  return {
    shape: "image",
    image: "/architecture/icons/cluster.svg",
    imageWidth: 48,
    imageHeight: 38,
    verticalLabelPosition: "bottom",
    verticalAlign: "top",
    spacingTop: 46,
    fontSize: 10,
    fontStyle: 1,
    fontColor: "#344054",
    strokeColor: color,
    strokeWidth: 1.5,
    fillColor: "none",
    rounded: true,
  };
}

export const groupStyle: CellStyle = {
  shape: "swimlane",
  horizontal: true,
  startSize: 28,
  rounded: true,
  arcSize: 8,
  fillColor: "#f8fafc",
  swimlaneFillColor: "#ffffff",
  strokeColor: "#d0d5dd",
  fontColor: "#344054",
  fontSize: 10,
  fontStyle: 1,
  align: "left",
  spacingLeft: 8,
  whiteSpace: "wrap",
};

export function relationStyle(relation: ArchitectureRelation): CellStyle {
  const dashed = relation.relationType === "MONITORING" || relation.relationType === "MANAGEMENT";
  const stroke = relation.relationType === "EXTERNAL" ? "#667085" : relation.relationType === "STORAGE" ? "#0e9384" : "#98a2b3";
  return {
    edgeStyle: "orthogonalEdgeStyle",
    rounded: true,
    orthogonalLoop: true,
    jettySize: "auto",
    strokeColor: stroke,
    strokeWidth: 1.25,
    dashed,
    endArrow: relation.relationType === "STORAGE" ? "diamond" : "block",
    endSize: 7,
    fontSize: 9,
    fontColor: "#475467",
    labelBackgroundColor: "#ffffff",
    noLabel: true,
  };
}

export const externalStyle: CellStyle = {
  shape: "image",
  image: "/architecture/icons/network.svg",
  imageWidth: 46,
  imageHeight: 36,
  verticalLabelPosition: "bottom",
  verticalAlign: "top",
  spacingTop: 44,
  fontSize: 10,
  fontColor: "#344054",
  strokeColor: "#98a2b3",
  dashed: true,
  fillColor: "none",
};

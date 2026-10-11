"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { ProjectGroup } from "@/domain/models";

export const initialProjectGroups: ProjectGroup[] = [
  {
    id: "rpa",
    name: "RPA Platform",
    code: "RPA",
    description: "Enterprise Robotic Process Automation platform (A360, Portal, APM, Common)",
    owner: "Automation COE",
    status: "ACTIVE",
  },
  {
    id: "mes",
    name: "MES Production",
    code: "MES",
    description: "Manufacturing Execution System and shop-floor automation",
    owner: "Smart Factory Team",
    status: "ACTIVE",
  },
  {
    id: "ai",
    name: "AI Platform",
    code: "AI_PLATFORM",
    description: "Enterprise GPU cluster, LLM serving, and model registry",
    owner: "AI Core Team",
    status: "ACTIVE",
  },
  {
    id: "data",
    name: "Data Platform",
    code: "DATA_PLATFORM",
    description: "Lakehouse analytics, ingestion pipelines, and event streaming",
    owner: "Enterprise Data Team",
    status: "ACTIVE",
  },
];

interface ProjectGroupContextType {
  projectGroups: ProjectGroup[];
  activeProjectId: string;
  activeProject: ProjectGroup;
  setActiveProjectId: (id: string) => void;
  addProjectGroup: (project: ProjectGroup) => void;
  updateProjectGroup: (id: string, updates: Partial<ProjectGroup>) => void;
}

const ProjectGroupContext = createContext<ProjectGroupContextType | null>(null);

const STORAGE_KEY = "infra-portal:active-project-id";

export function ProjectGroupProvider({
  children,
  initialProjects = initialProjectGroups,
  defaultProjectId = "rpa",
}: {
  children: React.ReactNode;
  initialProjects?: ProjectGroup[];
  defaultProjectId?: string;
}) {
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[]>(initialProjects);
  const [activeProjectId, setActiveProjectIdState] = useState<string>(defaultProjectId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && projectGroups.some((p) => p.id === saved)) {
        setActiveProjectIdState(saved);
      }
    } catch {
      // Fallback
    }
  }, [projectGroups]);

  const setActiveProjectId = (id: string) => {
    setActiveProjectIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  };

  const addProjectGroup = (project: ProjectGroup) => {
    setProjectGroups((prev) => [project, ...prev]);
  };

  const updateProjectGroup = (id: string, updates: Partial<ProjectGroup>) => {
    setProjectGroups((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  };

  const activeProject =
    projectGroups.find((p) => p.id === activeProjectId) ?? projectGroups[0];

  return (
    <ProjectGroupContext.Provider
      value={{
        projectGroups,
        activeProjectId,
        activeProject,
        setActiveProjectId,
        addProjectGroup,
        updateProjectGroup,
      }}
    >
      {children}
    </ProjectGroupContext.Provider>
  );
}

export function useProjectGroup() {
  const context = useContext(ProjectGroupContext);
  if (!context) {
    // Graceful fallback if outside provider
    return {
      projectGroups: initialProjectGroups,
      activeProjectId: "rpa",
      activeProject: initialProjectGroups[0],
      setActiveProjectId: () => {},
      addProjectGroup: () => {},
      updateProjectGroup: () => {},
    };
  }
  return context;
}

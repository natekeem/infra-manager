import type { NativeLayoutName } from "@/architecture/maxgraph/types";
import type { ProjectGroup } from "@/domain/models";

export function MaxGraphToolbar({
  projects,
  projectId,
  environments,
  environment,
  relationMode,
  editMode,
  showLabels,
  showPolicy,
  showActual,
  layoutName,
  canUndo,
  canRedo,
  onProject,
  onEnvironment,
  onRelationMode,
  onEdit,
  onLabels,
  onPolicy,
  onActual,
  onLayoutName,
  onAutoLayout,
  onFit,
  onUndo,
  onRedo,
}: {
  projects: ProjectGroup[];
  projectId: string;
  environments: string[];
  environment: string;
  relationMode: string;
  editMode: boolean;
  showLabels: boolean;
  showPolicy: boolean;
  showActual: boolean;
  layoutName: NativeLayoutName;
  canUndo: boolean;
  canRedo: boolean;
  onProject: (value: string) => void;
  onEnvironment: (value: string) => void;
  onRelationMode: (value: string) => void;
  onEdit: () => void;
  onLabels: () => void;
  onPolicy: () => void;
  onActual: () => void;
  onLayoutName: (value: NativeLayoutName) => void;
  onAutoLayout: () => void;
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const selectClass = "h-8 rounded border border-[var(--border)] bg-[var(--surface)] px-2 text-[10px] text-[var(--foreground)]";
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-[10px]">
      <label className="flex items-center gap-1.5"><span className="text-[var(--muted)]">Project</span><select aria-label="Project" value={projectId} onChange={(event) => onProject(event.target.value)} className={selectClass}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
      <label className="flex items-center gap-1.5"><span className="text-[var(--muted)]">Environment</span><select aria-label="Environment" value={environment} onChange={(event) => onEnvironment(event.target.value)} className={selectClass}><option value="ALL">ALL</option>{environments.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className="flex items-center gap-1.5"><span className="text-[var(--muted)]">Relations</span><select aria-label="Relations" value={relationMode} onChange={(event) => onRelationMode(event.target.value)} className={selectClass}><option value="ALL">ALL</option><option value="CORE">Core only</option><option value="MONITORING">Monitoring only</option></select></label>
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <label className="flex items-center gap-1.5"><span className="text-[var(--muted)]">Layout</span><select aria-label="Native layout" value={layoutName} onChange={(event) => onLayoutName(event.target.value as NativeLayoutName)} className={selectClass}><option value="composite">Composite</option><option value="hierarchical">Hierarchical</option><option value="compact-tree">Compact Tree</option><option value="swimlane">Swimlane</option></select></label>
      <Button onClick={onAutoLayout}>Auto Layout</Button>
      <Button onClick={onFit}>Fit</Button>
      <Button active={editMode} onClick={onEdit}>Edit</Button>
      <Button disabled={!canUndo} onClick={onUndo}>Undo</Button>
      <Button disabled={!canRedo} onClick={onRedo}>Redo</Button>
      <span className="mx-1 h-5 w-px bg-[var(--border)]" />
      <Button active={showLabels} onClick={onLabels}>Labels</Button>
      <Button active={showPolicy} onClick={onPolicy}>Policy</Button>
      <Button active={showActual} onClick={onActual}>Actual</Button>
      {editMode && <span className="ml-auto rounded border border-amber-400/60 bg-amber-50 px-2 py-1 font-semibold text-amber-700">EDIT MODE</span>}
    </div>
  );
}

function Button({ children, active, disabled, onClick }: { children: React.ReactNode; active?: boolean; disabled?: boolean; onClick: () => void }) {
  return <button type="button" disabled={disabled} aria-pressed={active} onClick={onClick} className={`h-8 rounded border px-2 font-medium disabled:cursor-not-allowed disabled:opacity-35 ${active ? "border-[#5750f1] bg-[#5750f1]/10 text-[#5750f1]" : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]"}`}>{children}</button>;
}


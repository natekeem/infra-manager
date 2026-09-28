"use client"

import React, { useState, useEffect } from "react"
import { SlideDrawer } from "@/components/common/slide-drawer"
import type { ArchitectureRelation, RelationType } from "@/domain/models"

interface RelationEditorDrawerProps {
  relation: ArchitectureRelation | null
  open: boolean
  onClose: () => void
  onSave: (relation: ArchitectureRelation) => void
  onDelete?: (id: string) => void
  onCancel?: () => void
  sourceName?: string
  targetName?: string
}

const RELATION_TYPES: RelationType[] = [
  "SERVICE", "DATABASE", "STORAGE", "MONITORING", "MANAGEMENT", "CLUSTER", "EXTERNAL", "OTHER"
]
const COMMON_PROTOCOLS = ["TCP", "UDP", "HTTP", "HTTPS", "NFS", "SMB"]

export function RelationEditorDrawer({
  relation,
  open,
  onClose,
  onSave,
  onDelete,
  onCancel,
  sourceName = "알 수 없음",
  targetName = "알 수 없음"
}: RelationEditorDrawerProps) {
  const [formData, setFormData] = useState<Partial<ArchitectureRelation>>({})

  useEffect(() => {
    if (open) {
      if (relation) {
        setFormData({ ...relation })
      } else {
        setFormData({
          relationType: "SERVICE",
          protocol: "TCP",
        })
      }
    }
  }, [relation, open])

  const isNew = !relation || (relation.id && relation.id.startsWith("manual-"))
  const isCustomProtocol = formData.protocol !== undefined && formData.protocol !== "" && !COMMON_PROTOCOLS.includes(formData.protocol)

  const handleCancel = () => {
    if (onCancel) onCancel()
    else onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData as ArchitectureRelation)
  }

  return (
    <SlideDrawer 
      open={open} 
      onClose={handleCancel} 
      title={!isNew ? "연결 편집" : "새 연결 설정"}
      width={460}
    >
      <div className="flex flex-col h-full bg-[var(--surface)] text-[var(--foreground)]">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <div className="text-[11px] font-medium opacity-70">
            {sourceName} &rarr; {targetName}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isNew && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2.5">
              <p className="text-[10px] text-yellow-600 dark:text-yellow-400">
                이 연결은 아직 정의되지 않았습니다. 아래 항목을 설정하세요.
              </p>
            </div>
          )}

          <form id="relation-form" onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[10px] font-medium opacity-80 block">연결 유형 (Relation Type)</label>
              <select
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#5750f1]"
                value={formData.relationType || "SERVICE"}
                onChange={e => setFormData({ ...formData, relationType: e.target.value as RelationType })}
              >
                {RELATION_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium opacity-80 block">프로토콜 (Protocol)</label>
              <div className="flex gap-2">
                <select
                  className={`${isCustomProtocol ? 'w-1/3' : 'w-full'} bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#5750f1]`}
                  value={isCustomProtocol ? "CUSTOM" : (formData.protocol || "")}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "CUSTOM") {
                      setFormData({ ...formData, protocol: "CUSTOM_PROTOCOL" })
                    } else {
                      setFormData({ ...formData, protocol: val })
                    }
                  }}
                >
                  <option value="" disabled>프로토콜 선택</option>
                  {COMMON_PROTOCOLS.map(proto => (
                    <option key={proto} value={proto}>{proto}</option>
                  ))}
                  <option value="CUSTOM">직접 입력...</option>
                </select>
                {isCustomProtocol && (
                  <input
                    type="text"
                    className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#5750f1]"
                    placeholder="프로토콜 입력"
                    value={formData.protocol === "CUSTOM_PROTOCOL" ? "" : formData.protocol}
                    onChange={e => setFormData({ ...formData, protocol: e.target.value })}
                  />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium opacity-80 block">포트 (Port)</label>
              <input
                type="number"
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#5750f1]"
                placeholder="예: 8080"
                value={formData.port || ""}
                onChange={e => setFormData({ ...formData, port: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium opacity-80 block">이름 (Name, Optional)</label>
              <input
                type="text"
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#5750f1]"
                placeholder="연결 이름"
                value={formData.name || ""}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium opacity-80 block">설명 (Description)</label>
              <textarea
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#5750f1] resize-none"
                rows={2}
                placeholder="연결에 대한 설명 입력"
                value={formData.description || ""}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </form>
        </div>

        <div className="border-t border-[var(--border)] p-4 flex items-center justify-between bg-[var(--surface-2)]">
          <div>
            {!isNew && relation && onDelete && (
              <button
                type="button"
                onClick={() => relation.id && onDelete(relation.id)}
                className="text-[10px] font-medium text-red-500 hover:text-red-600 hover:bg-red-500/10 px-3 py-1.5 rounded transition-colors"
              >
                삭제
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="text-[10px] font-medium opacity-80 hover:opacity-100 hover:bg-[var(--surface)] border border-[var(--border)] px-4 py-1.5 rounded transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              form="relation-form"
              className="text-[10px] font-medium text-white bg-[#5750f1] hover:bg-[#463fc2] px-4 py-1.5 rounded transition-colors"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </SlideDrawer>
  )
}

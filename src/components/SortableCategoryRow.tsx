import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  GripVertical,
  Layers,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { Category } from '../types'

interface SortableCategoryRowProps {
  category: Category
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
  onToggleVisibility: (id: string, visible: boolean) => void
  onMove: (category: Category, direction: 'up' | 'down') => void
}

export function SortableCategoryRow({
  category,
  onEdit,
  onDelete,
  onToggleVisibility,
  onMove,
}: SortableCategoryRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        'group grid grid-cols-[auto_2fr_1fr_80px_80px_80px_100px] gap-2 px-5 py-3.5 transition-colors',
        isDragging ? 'bg-elevated opacity-80' : 'hover:bg-elevated/40',
      ].join(' ')}
    >
      {/* Icon + drag handle */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="qty-btn cursor-grab text-ink-muted active:cursor-grabbing"
          {...attributes}
          {...listeners}
          title="Ziehen zum Neusortieren"
          aria-label="Ziehen zum Neusortieren"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xl leading-none">
          {category.icon || (
            <Layers className="h-5 w-5 text-ink-muted" strokeWidth={1.5} />
          )}
        </span>
      </div>

      {/* Name */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-medium text-ink truncate">{category.name}</span>
        {!category.visible && (
          <span className="badge-neutral shrink-0">Versteckt</span>
        )}
      </div>

      {/* Description */}
      <div className="flex items-center text-sm text-ink-soft truncate">
        {category.description || '—'}
      </div>

      {/* Color */}
      <div className="flex items-center">
        {category.color ? (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-4 w-4 shrink-0 rounded-full border border-border"
              style={{ backgroundColor: category.color }}
            />
            <span className="text-2xs font-mono text-ink-muted">{category.color}</span>
          </span>
        ) : (
          <span className="text-2xs text-ink-muted">—</span>
        )}
      </div>

      {/* Sort order buttons */}
      <div className="flex items-center justify-center gap-0.5">
        <button
          onClick={() => onMove(category, 'up')}
          className="qty-btn"
          title="Nach oben verschieben"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onMove(category, 'down')}
          className="qty-btn"
          title="Nach unten verschieben"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Visibility */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => onToggleVisibility(category.id, category.visible)}
          className="qty-btn"
          title={category.visible ? 'Im Rechner ausblenden' : 'Im Rechner anzeigen'}
        >
          {category.visible ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-0.5">
        <button onClick={() => onEdit(category)} className="qty-btn" title="Bearbeiten">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(category)}
          className="qty-btn text-danger hover:bg-danger/10"
          title="Löschen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

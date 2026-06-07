import { useEffect, useState } from 'react'
import type { Category } from '../types'
import { Modal } from './Modal'
import { useApp } from '../hooks/useApp'

interface CategoryFormModalProps {
  open: boolean
  onClose: () => void
  category?: Category
}

interface FormState {
  name: string
  description: string
  icon: string
  color: string
  visible: boolean
}

const empty: FormState = {
  name: '',
  description: '',
  icon: '',
  color: '#3b82f6',
  visible: true,
}

export function CategoryFormModal({
  open,
  onClose,
  category,
}: CategoryFormModalProps) {
  const { addCategory, updateCategory } = useApp()
  const [form, setForm] = useState<FormState>(empty)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when category or open state changes
  useEffect(() => {
    if (!open) return
    if (category) {
      setForm({
        name: category.name,
        description: category.description ?? '',
        icon: category.icon ?? '',
        color: category.color ?? '#3b82f6',
        visible: category.visible,
      })
    } else {
      setForm(empty)
    }
    setErrors({})
  }, [category, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!form.name.trim()) newErrors.name = 'Name ist erforderlich'

    if (form.color && !/^#[0-9a-fA-F]{6}$/.test(form.color)) {
      newErrors.color = 'Ungültige Farbe (Format: #RRGGBB)'
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors)
      return
    }

    const payload: Partial<Category> & { name: string; visible: boolean; sortOrder: number } = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      icon: form.icon.trim() || undefined,
      color: form.color || undefined,
      visible: form.visible,
      sortOrder: category?.sortOrder ?? 0,
    }

    setIsSubmitting(true)
    try {
      if (category) {
        await updateCategory(category.id, payload)
      } else {
        await addCategory(payload as Omit<Category, 'id' | 'createdAt' | 'updatedAt'>)
      }
      onClose()
    } catch (error) {
      console.error('Failed to save category:', error)
      setErrors({ submit: 'Speichern fehlgeschlagen. Bitte versuche erneut.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
      description={
        category
          ? 'Aktualisiere Name, Farbe und weitere Details.'
          : 'Erstelle eine neue Kategorie für deine Dienstleistungen.'
      }
      size="md"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" type="button">
            Abbrechen
          </button>
          <button
            onClick={handleSubmit}
            className="btn-primary"
            type="submit"
            form="category-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Speichere...' : category ? 'Speichern' : 'Hinzufügen'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} className="grid gap-4">
        {errors.submit && (
          <div className="rounded-lg bg-danger/10 p-3 text-sm text-danger">
            {errors.submit}
          </div>
        )}

        <Field label="Name" error={errors.name} required>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="z.B. Print & Marketing"
            className="input w-full"
            autoFocus
          />
        </Field>

        <Field label="Beschreibung (optional)">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="z.B. Druck- und Marketingdienstleistungen"
            rows={2}
            className="input w-full resize-none"
          />
        </Field>

        <Field label="Icon (optional)" hint="Max. 2 Zeichen, z.B. ein Emoji">
          <input
            type="text"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value.slice(0, 2) })}
            placeholder="z.B. 🖨️"
            maxLength={2}
            className="input w-20 text-center text-lg"
          />
        </Field>

        <Field label="Farbe (optional)" error={errors.color}>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.color || '#3b82f6'}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-border"
            />
            <input
              type="text"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="#3b82f6"
              className="input w-32 font-mono"
            />
          </div>
        </Field>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface p-3.5 hover:border-border-strong">
          <input
            type="checkbox"
            checked={form.visible}
            onChange={(e) => setForm({ ...form, visible: e.target.checked })}
            className="h-4 w-4 accent-accent"
          />
          <div className="flex-1">
            <p className="text-sm font-medium text-ink">
              Im Rechner anzeigen
            </p>
            <p className="text-2xs text-ink-muted">
              Deaktivieren, um diese Kategorie im Rechner auszublenden.
            </p>
          </div>
        </label>
      </form>
    </Modal>
  )
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string
  hint?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-2xs font-semibold uppercase tracking-wider text-ink-muted">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {(hint || error) && (
        <p
          className={[
            'text-2xs',
            error ? 'text-danger font-medium' : 'text-ink-muted',
          ].join(' ')}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
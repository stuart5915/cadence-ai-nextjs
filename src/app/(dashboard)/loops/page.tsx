'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Plus,
    Play,
    Pause,
    Settings,
    ChevronRight,
    Loader2,
    RefreshCw,
    Trash2,
    Edit3,
    GraduationCap,
    Rocket,
    Hammer,
    DollarSign,
    Flame,
    MessageCircle,
    X,
    Check,
    Clock,
    Calendar
} from 'lucide-react'
import { Project } from '@/lib/supabase/types'

// Loop type definition
interface ContentLoop {
    id: string
    name: string
    emoji: string
    color: string
    description: string
    rotationDays: number
    isActive: boolean
    items: LoopItem[]
    lastPosted?: string
    nextPost?: string
}

interface LoopItem {
    id: string
    title: string
    content: string
    type: 'article' | 'post' | 'cta' | 'spotlight'
    lastUsed?: string
    usageCount: number
}

// Preset loop templates
const LOOP_TEMPLATES = [
    {
        name: 'Education',
        emoji: '🎓',
        color: '#3b82f6',
        description: 'Evergreen educational content about your product',
        rotationDays: 7
    },
    {
        name: 'App Spotlight',
        emoji: '🚀',
        color: '#22c55e',
        description: 'Cycle through featuring apps or products',
        rotationDays: 3
    },
    {
        name: 'Builder Stories',
        emoji: '🔨',
        color: '#f59e0b',
        description: 'How things were made, behind the scenes',
        rotationDays: 5
    },
    {
        name: 'Social Proof',
        emoji: '💬',
        color: '#ec4899',
        description: 'Testimonials, user wins, success stories',
        rotationDays: 4
    },
    {
        name: 'Growth CTAs',
        emoji: '📢',
        color: '#8b5cf6',
        description: 'Call-to-actions: join, try, earn',
        rotationDays: 1
    },
    {
        name: 'Hot Takes',
        emoji: '🔥',
        color: '#ef4444',
        description: 'Breaking news, launches, announcements',
        rotationDays: 0 // Manual only
    },
]

export default function LoopsPage() {
    const searchParams = useSearchParams()
    const supabase = createClient()

    const projectId = searchParams.get('project')

    const [loading, setLoading] = useState(true)
    const [projects, setProjects] = useState<Project[]>([])
    const [selectedProject, setSelectedProject] = useState<string | null>(projectId)
    const [loops, setLoops] = useState<ContentLoop[]>([])
    const [showNewLoopModal, setShowNewLoopModal] = useState(false)
    const [showAddContentModal, setShowAddContentModal] = useState<string | null>(null)
    const [expandedLoop, setExpandedLoop] = useState<string | null>(null)

    // New content form
    const [newContent, setNewContent] = useState({
        title: '',
        content: '',
        type: 'article' as const
    })

    // Load projects
    useEffect(() => {
        async function loadProjects() {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) throw error
                setProjects(data || [])

                // Auto-select first project if none selected
                if (!selectedProject && data && data.length > 0) {
                    setSelectedProject(data[0].id)
                }
            } catch (err) {
                console.error('Error loading projects:', err)
            } finally {
                setLoading(false)
            }
        }
        loadProjects()
    }, [supabase])

    // Load loops when project changes
    useEffect(() => {
        if (selectedProject) {
            loadLoops()
        }
    }, [selectedProject])

    const loadLoops = async () => {
        if (!selectedProject) return

        // For now, use localStorage until we add Supabase table
        const savedLoops = localStorage.getItem(`loops-${selectedProject}`)
        if (savedLoops) {
            setLoops(JSON.parse(savedLoops))
        } else {
            setLoops([])
        }
    }

    const saveLoops = (updatedLoops: ContentLoop[]) => {
        if (!selectedProject) return
        localStorage.setItem(`loops-${selectedProject}`, JSON.stringify(updatedLoops))
        setLoops(updatedLoops)
    }

    const createLoop = (template: typeof LOOP_TEMPLATES[0]) => {
        const newLoop: ContentLoop = {
            id: crypto.randomUUID(),
            name: template.name,
            emoji: template.emoji,
            color: template.color,
            description: template.description,
            rotationDays: template.rotationDays,
            isActive: true,
            items: []
        }

        saveLoops([...loops, newLoop])
        setShowNewLoopModal(false)
    }

    const toggleLoop = (loopId: string) => {
        const updatedLoops = loops.map(loop =>
            loop.id === loopId ? { ...loop, isActive: !loop.isActive } : loop
        )
        saveLoops(updatedLoops)
    }

    const deleteLoop = (loopId: string) => {
        if (!confirm('Delete this loop and all its content?')) return
        saveLoops(loops.filter(loop => loop.id !== loopId))
    }

    const addContentToLoop = (loopId: string) => {
        if (!newContent.title.trim()) return

        const newItem: LoopItem = {
            id: crypto.randomUUID(),
            title: newContent.title,
            content: newContent.content,
            type: newContent.type,
            usageCount: 0
        }

        const updatedLoops = loops.map(loop =>
            loop.id === loopId
                ? { ...loop, items: [...loop.items, newItem] }
                : loop
        )

        saveLoops(updatedLoops)
        setNewContent({ title: '', content: '', type: 'article' })
        setShowAddContentModal(null)
    }

    const removeContentFromLoop = (loopId: string, itemId: string) => {
        const updatedLoops = loops.map(loop =>
            loop.id === loopId
                ? { ...loop, items: loop.items.filter(item => item.id !== itemId) }
                : loop
        )
        saveLoops(updatedLoops)
    }

    const getNextPostDate = (loop: ContentLoop) => {
        if (loop.rotationDays === 0) return 'Manual'
        if (loop.items.length === 0) return 'No content'
        if (!loop.lastPosted) {
            const tomorrow = new Date()
            tomorrow.setDate(tomorrow.getDate() + 1)
            return tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        const next = new Date(loop.lastPosted)
        next.setDate(next.getDate() + loop.rotationDays)
        return next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    const getProgressPercent = (loop: ContentLoop) => {
        const targetItems = loop.rotationDays === 0 ? 5 : Math.max(5, loop.rotationDays * 2)
        return Math.min(100, (loop.items.length / targetItems) * 100)
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        )
    }

    const selectedProjectData = projects.find(p => p.id === selectedProject)

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--foreground)]">Content Loops</h1>
                    <p className="text-[var(--foreground-muted)]">
                        Evergreen content that rotates automatically
                    </p>
                </div>

                {/* Project Selector */}
                <div className="flex items-center gap-3">
                    <select
                        value={selectedProject || ''}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="px-4 py-2 bg-[var(--surface)] border border-[var(--surface-border)] rounded-lg text-[var(--foreground)]"
                    >
                        {projects.map(project => (
                            <option key={project.id} value={project.id}>
                                {project.name}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={() => setShowNewLoopModal(true)}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        New Loop
                    </button>
                </div>
            </div>

            {/* Loops Grid */}
            {loops.length === 0 ? (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="w-8 h-8 text-[var(--foreground-muted)]" />
                    </div>
                    <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">No Content Loops Yet</h2>
                    <p className="text-[var(--foreground-muted)] mb-6 max-w-md mx-auto">
                        Create loops of evergreen content that automatically rotate on a schedule.
                    </p>
                    <button
                        onClick={() => setShowNewLoopModal(true)}
                        className="btn btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Create Your First Loop
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {loops.map(loop => (
                        <div
                            key={loop.id}
                            className="card overflow-hidden"
                        >
                            {/* Loop Header */}
                            <div
                                className="p-5 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
                                onClick={() => setExpandedLoop(expandedLoop === loop.id ? null : loop.id)}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icon */}
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                        style={{ background: `${loop.color}20` }}
                                    >
                                        {loop.emoji}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-[var(--foreground)]">
                                                {loop.name} Loop
                                            </h3>
                                            {loop.isActive ? (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-500">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--surface)] text-[var(--foreground-muted)]">
                                                    Paused
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--foreground-muted)]">
                                            {loop.description}
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-6">
                                        {/* Progress Bar */}
                                        <div className="w-32">
                                            <div className="flex items-center justify-between text-xs mb-1">
                                                <span className="text-[var(--foreground-muted)]">Content</span>
                                                <span className="font-medium" style={{ color: loop.color }}>
                                                    {loop.items.length} items
                                                </span>
                                            </div>
                                            <div className="h-2 bg-[var(--surface)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${getProgressPercent(loop)}%`,
                                                        background: loop.color
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        {/* Next Post */}
                                        <div className="text-right">
                                            <div className="text-xs text-[var(--foreground-muted)]">Next</div>
                                            <div className="text-sm font-medium text-[var(--foreground)]">
                                                {getNextPostDate(loop)}
                                            </div>
                                        </div>

                                        {/* Rotation */}
                                        <div className="text-right">
                                            <div className="text-xs text-[var(--foreground-muted)]">Rotation</div>
                                            <div className="text-sm font-medium text-[var(--foreground)]">
                                                {loop.rotationDays === 0 ? 'Manual' : `${loop.rotationDays}d`}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleLoop(loop.id) }}
                                                className={`p-2 rounded-lg transition-colors ${loop.isActive
                                                        ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                                                        : 'bg-[var(--surface)] text-[var(--foreground-muted)] hover:bg-[var(--surface-hover)]'
                                                    }`}
                                                title={loop.isActive ? 'Pause loop' : 'Activate loop'}
                                            >
                                                {loop.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteLoop(loop.id) }}
                                                className="p-2 rounded-lg bg-[var(--surface)] text-[var(--foreground-muted)] hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                                title="Delete loop"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            <ChevronRight
                                                className={`w-5 h-5 text-[var(--foreground-muted)] transition-transform ${expandedLoop === loop.id ? 'rotate-90' : ''
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedLoop === loop.id && (
                                <div className="border-t border-[var(--surface-border)] p-5 bg-[var(--background)]">
                                    <div className="flex items-center justify-between mb-4">
                                        <h4 className="font-medium text-[var(--foreground)]">
                                            Content Items ({loop.items.length})
                                        </h4>
                                        <button
                                            onClick={() => setShowAddContentModal(loop.id)}
                                            className="btn btn-ghost text-sm"
                                            style={{ color: loop.color }}
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Content
                                        </button>
                                    </div>

                                    {loop.items.length === 0 ? (
                                        <div className="text-center py-8 text-[var(--foreground-muted)]">
                                            <p>No content in this loop yet.</p>
                                            <button
                                                onClick={() => setShowAddContentModal(loop.id)}
                                                className="text-[var(--primary)] hover:underline mt-2"
                                            >
                                                Add your first item
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {loop.items.map((item, idx) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-3 p-3 bg-[var(--surface)] rounded-lg group"
                                                >
                                                    <span className="text-sm font-medium text-[var(--foreground-muted)] w-6">
                                                        {idx + 1}.
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-[var(--foreground)] truncate">
                                                            {item.title}
                                                        </p>
                                                        {item.content && (
                                                            <p className="text-sm text-[var(--foreground-muted)] truncate">
                                                                {item.content}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="text-xs text-[var(--foreground-muted)]">
                                                        Used {item.usageCount}x
                                                    </span>
                                                    <button
                                                        onClick={() => removeContentFromLoop(loop.id, item.id)}
                                                        className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500 transition-all"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* New Loop Modal */}
            {showNewLoopModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] rounded-2xl max-w-lg w-full max-h-[80vh] overflow-auto">
                        <div className="p-6 border-b border-[var(--surface-border)]">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-[var(--foreground)]">Create Content Loop</h2>
                                <button
                                    onClick={() => setShowNewLoopModal(false)}
                                    className="p-2 hover:bg-[var(--surface-hover)] rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-sm text-[var(--foreground-muted)] mt-1">
                                Choose a template to get started
                            </p>
                        </div>

                        <div className="p-4 space-y-2">
                            {LOOP_TEMPLATES.map(template => (
                                <button
                                    key={template.name}
                                    onClick={() => createLoop(template)}
                                    className="w-full p-4 bg-[var(--background)] hover:bg-[var(--surface-hover)] rounded-xl text-left transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                            style={{ background: `${template.color}20` }}
                                        >
                                            {template.emoji}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)]">
                                                {template.name}
                                            </div>
                                            <div className="text-sm text-[var(--foreground-muted)]">
                                                {template.description}
                                            </div>
                                        </div>
                                        <div className="text-sm text-[var(--foreground-muted)]">
                                            {template.rotationDays === 0 ? 'Manual' : `Every ${template.rotationDays}d`}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Content Modal */}
            {showAddContentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[var(--surface)] rounded-2xl max-w-lg w-full">
                        <div className="p-6 border-b border-[var(--surface-border)]">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-[var(--foreground)]">Add Content</h2>
                                <button
                                    onClick={() => setShowAddContentModal(null)}
                                    className="p-2 hover:bg-[var(--surface-hover)] rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                    Title
                                </label>
                                <input
                                    type="text"
                                    value={newContent.title}
                                    onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                                    placeholder="e.g. What is $SUITE?"
                                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--surface-border)] rounded-lg text-[var(--foreground)]"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                                    Content (optional)
                                </label>
                                <textarea
                                    value={newContent.content}
                                    onChange={(e) => setNewContent({ ...newContent, content: e.target.value })}
                                    placeholder="The full post or article text..."
                                    rows={4}
                                    className="w-full px-4 py-2 bg-[var(--background)] border border-[var(--surface-border)] rounded-lg text-[var(--foreground)] resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setShowAddContentModal(null)}
                                    className="flex-1 btn btn-ghost"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => addContentToLoop(showAddContentModal)}
                                    disabled={!newContent.title.trim()}
                                    className="flex-1 btn btn-primary"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add to Loop
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

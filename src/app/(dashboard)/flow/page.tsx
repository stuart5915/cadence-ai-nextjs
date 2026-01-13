'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    FolderOpen,
    Target,
    Sparkles,
    Check,
    ChevronDown,
    ChevronUp,
    Loader2,
    Plus,
    Calendar,
    Wand2,
    ArrowRight,
    CheckCircle2,
    Settings
} from 'lucide-react'
import { Project } from '@/lib/supabase/types'
import { PlatformIcon, PLATFORM_NAMES } from '@/components/ui/PlatformIcon'

// Flow steps
type FlowStep = 'projects' | 'strategy' | 'generate'

// Theme definitions
const THEMES = [
    { id: 'motivation', emoji: '🎯', label: 'Motivation', color: '#f97316' },
    { id: 'tips', emoji: '📚', label: 'Tips', color: '#3b82f6' },
    { id: 'behind', emoji: '🎬', label: 'Behind Scenes', color: '#8b5cf6' },
    { id: 'thought', emoji: '💡', label: 'Thought Leadership', color: '#eab308' },
    { id: 'community', emoji: '👥', label: 'Community', color: '#22c55e' },
    { id: 'product', emoji: '🚀', label: 'Product', color: '#ec4899' },
    { id: 'lifestyle', emoji: '✨', label: 'Lifestyle', color: '#06b6d4' },
    { id: 'promo', emoji: '🔥', label: 'Promo', color: '#ef4444' },
]

const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function FlowPage() {
    const router = useRouter()
    const supabase = createClient()

    // Flow state
    const [currentStep, setCurrentStep] = useState<FlowStep>('projects')
    const [completedSteps, setCompletedSteps] = useState<FlowStep[]>([])

    // Data state
    const [loading, setLoading] = useState(true)
    const [projects, setProjects] = useState<Project[]>([])
    const [selectedProject, setSelectedProject] = useState<Project | null>(null)

    // Strategy state
    const [dayThemes, setDayThemes] = useState<Record<string, string>>({})
    const [viewMonth, setViewMonth] = useState(new Date())

    // Generation state
    const [generating, setGenerating] = useState(false)
    const [postsPerDay, setPostsPerDay] = useState(3)
    const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
    const [generatedContent, setGeneratedContent] = useState<any>(null)

    // Load projects on mount
    useEffect(() => {
        async function loadProjects() {
            try {
                const { data, error } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) throw error
                setProjects(data || [])
            } catch (err) {
                console.error('Error loading projects:', err)
            } finally {
                setLoading(false)
            }
        }
        loadProjects()
    }, [supabase])

    // Handle project selection
    const handleSelectProject = (project: Project) => {
        setSelectedProject(project)

        // Load saved strategy if exists
        if (project.posting_schedule?.day_themes) {
            setDayThemes(project.posting_schedule.day_themes)
        } else {
            // Apply default pattern for current month
            applyDefaultPattern()
        }

        // Move to strategy step
        setCompletedSteps(['projects'])
        setCurrentStep('strategy')
    }

    // Apply default weekly pattern
    const applyDefaultPattern = () => {
        const DEFAULT_PATTERN: Record<number, string> = {
            0: 'motivation', 1: 'tips', 2: 'behind', 3: 'thought',
            4: 'community', 5: 'lifestyle', 6: 'motivation',
        }

        const year = viewMonth.getFullYear()
        const month = viewMonth.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        const newThemes: Record<string, string> = {}

        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d)
            const dayOfWeek = (date.getDay() + 6) % 7
            const dateStr = date.toISOString().split('T')[0]
            newThemes[dateStr] = DEFAULT_PATTERN[dayOfWeek]
        }
        setDayThemes(newThemes)
    }

    // Confirm strategy and move to generate
    const handleConfirmStrategy = async () => {
        if (!selectedProject) return

        // Save strategy to project
        try {
            const updatedSchedule = {
                ...selectedProject.posting_schedule,
                day_themes: dayThemes
            }
            await supabase
                .from('projects')
                .update({ posting_schedule: updatedSchedule })
                .eq('id', selectedProject.id)
        } catch (err) {
            console.error('Failed to save strategy:', err)
        }

        // Move to generate step
        setCompletedSteps(['projects', 'strategy'])
        setCurrentStep('generate')
    }

    // Generate content
    const handleGenerate = async () => {
        if (!selectedProject) return

        setGenerating(true)

        try {
            const res = await fetch('/api/ai/generate-week', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: selectedProject.id,
                    postsPerDay,
                    platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
                }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setGeneratedContent(data)
            setCompletedSteps(['projects', 'strategy', 'generate'])
        } catch (err: any) {
            console.error('Generate error:', err)
        } finally {
            setGenerating(false)
        }
    }

    // Generate calendar grid
    const generateCalendarDays = () => {
        const year = viewMonth.getFullYear()
        const month = viewMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startOffset = (firstDay.getDay() + 6) % 7
        const daysInMonth = lastDay.getDate()

        const cells: { date: number; dateStr: string }[] = []

        for (let i = 0; i < startOffset; i++) {
            cells.push({ date: 0, dateStr: '' })
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
            cells.push({ date: d, dateStr })
        }

        return cells
    }

    // Go back to a previous step
    const goToStep = (step: FlowStep) => {
        if (step === 'projects') {
            setCurrentStep('projects')
            setSelectedProject(null)
            setCompletedSteps([])
        } else if (step === 'strategy' && completedSteps.includes('projects')) {
            setCurrentStep('strategy')
            setCompletedSteps(['projects'])
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        )
    }

    const calendarDays = generateCalendarDays()

    return (
        <div className="min-h-screen p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--foreground)]">Content Flow</h1>
                <p className="text-[var(--foreground-muted)]">
                    Select a project, review your strategy, and generate content
                </p>
            </div>

            {/* Flow Progress */}
            <div className="flex items-center gap-2 mb-8 p-4 bg-[var(--surface)] rounded-xl">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    currentStep === 'projects' 
                        ? 'bg-[var(--primary)] text-white' 
                        : completedSteps.includes('projects')
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-[var(--surface-hover)] text-[var(--foreground-muted)]'
                }`}>
                    {completedSteps.includes('projects') ? <Check className="w-4 h-4" /> : <FolderOpen className="w-4 h-4" />}
                    Project
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--foreground-muted)]" />
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    currentStep === 'strategy' 
                        ? 'bg-[var(--primary)] text-white' 
                        : completedSteps.includes('strategy')
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-[var(--surface-hover)] text-[var(--foreground-muted)]'
                }`}>
                    {completedSteps.includes('strategy') ? <Check className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                    Strategy
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--foreground-muted)]" />
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    currentStep === 'generate' 
                        ? 'bg-[var(--primary)] text-white' 
                        : completedSteps.includes('generate')
                            ? 'bg-green-500/20 text-green-500'
                            : 'bg-[var(--surface-hover)] text-[var(--foreground-muted)]'
                }`}>
                    {completedSteps.includes('generate') ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    Generate
                </div>
            </div>

            {/* STEP 1: Projects Panel */}
            <div className={`card mb-4 overflow-hidden transition-all duration-300 ${
                currentStep === 'projects' ? 'p-6' : 'p-4'
            }`}>
                {/* Panel Header - Always visible */}
                <div 
                    className={`flex items-center justify-between ${currentStep !== 'projects' ? 'cursor-pointer' : ''}`}
                    onClick={() => currentStep !== 'projects' && goToStep('projects')}
                >
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            completedSteps.includes('projects') 
                                ? 'bg-green-500/20' 
                                : 'bg-[var(--primary)]/20'
                        }`}>
                            {completedSteps.includes('projects') 
                                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                : <FolderOpen className="w-5 h-5 text-[var(--primary)]" />
                            }
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--foreground)]">
                                {selectedProject ? selectedProject.name : 'Select Project'}
                            </h2>
                            {selectedProject && currentStep !== 'projects' && (
                                <p className="text-sm text-[var(--foreground-muted)]">
                                    {selectedProject.description || 'Click to change'}
                                </p>
                            )}
                        </div>
                    </div>
                    {currentStep !== 'projects' && (
                        <ChevronDown className="w-5 h-5 text-[var(--foreground-muted)]" />
                    )}
                </div>

                {/* Panel Content - Only when active */}
                {currentStep === 'projects' && (
                    <div className="mt-6">
                        {projects.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-[var(--foreground-muted)] mb-4">No projects yet</p>
                                <button 
                                    onClick={() => router.push('/projects/new')}
                                    className="btn btn-primary"
                                >
                                    <Plus className="w-4 h-4" />
                                    Create Your First Project
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {projects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => handleSelectProject(project)}
                                        className="w-full p-4 bg-[var(--surface)] hover:bg-[var(--surface-hover)] rounded-xl text-left transition-all group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                                                {project.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="text-sm text-[var(--foreground-muted)] truncate">
                                                    {project.description || 'No description'}
                                                </p>
                                            </div>
                                            <ArrowRight className="w-5 h-5 text-[var(--foreground-muted)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* STEP 2: Strategy Panel */}
            {(currentStep === 'strategy' || completedSteps.includes('strategy')) && (
                <div className={`card mb-4 overflow-hidden transition-all duration-300 ${
                    currentStep === 'strategy' ? 'p-6' : 'p-4'
                }`}>
                    {/* Panel Header */}
                    <div 
                        className={`flex items-center justify-between ${currentStep !== 'strategy' ? 'cursor-pointer' : ''}`}
                        onClick={() => currentStep !== 'strategy' && completedSteps.includes('strategy') && goToStep('strategy')}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                completedSteps.includes('strategy') 
                                    ? 'bg-green-500/20' 
                                    : 'bg-[var(--primary)]/20'
                            }`}>
                                {completedSteps.includes('strategy') 
                                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    : <Target className="w-5 h-5 text-[var(--primary)]" />
                                }
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--foreground)]">
                                    Content Strategy
                                </h2>
                                {completedSteps.includes('strategy') && currentStep !== 'strategy' && (
                                    <p className="text-sm text-[var(--foreground-muted)]">
                                        {Object.keys(dayThemes).length} days planned
                                    </p>
                                )}
                            </div>
                        </div>
                        {currentStep !== 'strategy' && (
                            <ChevronDown className="w-5 h-5 text-[var(--foreground-muted)]" />
                        )}
                    </div>

                    {/* Panel Content */}
                    {currentStep === 'strategy' && (
                        <div className="mt-6">
                            {/* Theme Legend */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {THEMES.map(theme => (
                                    <div
                                        key={theme.id}
                                        className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium"
                                        style={{ background: `${theme.color}20`, color: theme.color }}
                                    >
                                        <span>{theme.emoji}</span>
                                        <span>{theme.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Mini Calendar */}
                            <div className="bg-[var(--surface)] rounded-xl p-4 mb-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-medium text-[var(--foreground)]">
                                        {viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                    </h3>
                                    <button
                                        onClick={applyDefaultPattern}
                                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-[var(--primary)] text-white rounded-lg hover:opacity-90 cursor-pointer"
                                    >
                                        <Wand2 className="w-3 h-3" />
                                        Auto-fill
                                    </button>
                                </div>

                                {/* Day Headers */}
                                <div className="grid grid-cols-7 gap-1 mb-1">
                                    {DAYS_SHORT.map(day => (
                                        <div key={day} className="text-center text-xs font-medium text-[var(--foreground-muted)] py-1">
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-1">
                                    {calendarDays.map((cell, idx) => {
                                        if (cell.date === 0) {
                                            return <div key={idx} className="h-10 bg-[var(--surface)]/30 rounded" />
                                        }

                                        const theme = THEMES.find(t => t.id === dayThemes[cell.dateStr])
                                        const today = new Date().toISOString().split('T')[0]
                                        const isToday = cell.dateStr === today

                                        return (
                                            <div
                                                key={idx}
                                                className={`h-10 p-1 rounded transition-all flex flex-col items-center justify-center ${
                                                    theme ? '' : isToday 
                                                        ? 'bg-[var(--primary)]/10 border border-[var(--primary)]/30' 
                                                        : 'bg-[var(--background)]'
                                                }`}
                                                style={theme ? {
                                                    background: `${theme.color}15`,
                                                    borderLeft: `2px solid ${theme.color}`
                                                } : {}}
                                            >
                                                <div className={`text-[10px] ${isToday ? 'text-[var(--primary)] font-bold' : 'text-[var(--foreground-muted)]'}`}>
                                                    {cell.date}
                                                </div>
                                                {theme && (
                                                    <span className="text-xs">{theme.emoji}</span>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Confirm Button */}
                            <button
                                onClick={handleConfirmStrategy}
                                className="w-full btn btn-primary"
                            >
                                <Check className="w-4 h-4" />
                                Confirm Strategy & Continue
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3: Generate Panel */}
            {(currentStep === 'generate' || completedSteps.includes('generate')) && (
                <div className={`card mb-4 overflow-hidden transition-all duration-300 ${
                    currentStep === 'generate' ? 'p-6' : 'p-4'
                }`}>
                    {/* Panel Header */}
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            completedSteps.includes('generate') 
                                ? 'bg-green-500/20' 
                                : 'bg-[var(--primary)]/20'
                        }`}>
                            {completedSteps.includes('generate') 
                                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                                : <Sparkles className="w-5 h-5 text-[var(--primary)]" />
                            }
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-[var(--foreground)]">
                                Generate Content
                            </h2>
                            {completedSteps.includes('generate') && (
                                <p className="text-sm text-green-500">
                                    Content generated successfully!
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Panel Content */}
                    {currentStep === 'generate' && !completedSteps.includes('generate') && (
                        <div className="mt-6">
                            {/* Settings */}
                            <div className="bg-[var(--surface)] rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Settings className="w-4 h-4 text-[var(--foreground-muted)]" />
                                    <span className="text-sm font-medium text-[var(--foreground)]">Generation Settings</span>
                                </div>

                                {/* Posts per day */}
                                <div className="mb-4">
                                    <label className="text-sm text-[var(--foreground-muted)] mb-2 block">
                                        Posts per day
                                    </label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 5].map(num => (
                                            <button
                                                key={num}
                                                onClick={() => setPostsPerDay(num)}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                                    postsPerDay === num
                                                        ? 'bg-[var(--primary)] text-white'
                                                        : 'bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                                                }`}
                                            >
                                                {num}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Platforms */}
                                {selectedProject?.platforms && selectedProject.platforms.length > 0 && (
                                    <div>
                                        <label className="text-sm text-[var(--foreground-muted)] mb-2 block">
                                            Platforms (leave empty for all)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProject.platforms.map((platform: string) => (
                                                <button
                                                    key={platform}
                                                    onClick={() => {
                                                        setSelectedPlatforms(prev =>
                                                            prev.includes(platform)
                                                                ? prev.filter(p => p !== platform)
                                                                : [...prev, platform]
                                                        )
                                                    }}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                                                        selectedPlatforms.includes(platform)
                                                            ? 'bg-[var(--primary)] text-white'
                                                            : 'bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]'
                                                    }`}
                                                >
                                                    <PlatformIcon platform={platform} size={16} colored={selectedPlatforms.includes(platform) ? false : true} />
                                                    {PLATFORM_NAMES[platform] || platform}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full btn btn-primary"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating Content...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Generate Week's Content
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Generated Content Preview */}
                    {generatedContent && (
                        <div className="mt-6">
                            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-2 text-green-500 mb-2">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span className="font-medium">Content Generated!</span>
                                </div>
                                <p className="text-sm text-[var(--foreground-muted)]">
                                    {generatedContent.days?.reduce((acc: number, day: any) => acc + day.posts.length, 0) || 0} posts created for the week
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => router.push('/weekly')}
                                    className="flex-1 btn btn-primary"
                                >
                                    View & Edit Content
                                </button>
                                <button
                                    onClick={() => router.push('/content')}
                                    className="flex-1 btn btn-secondary"
                                >
                                    Go to Queue
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

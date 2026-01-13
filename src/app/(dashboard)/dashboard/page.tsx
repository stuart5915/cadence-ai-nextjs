'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
    Plus,
    Calendar,
    TrendingUp,
    Clock,
    Sparkles,
    ArrowRight,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    FolderOpen,
    ChevronRight
} from 'lucide-react'
import { Project, Platform } from '@/lib/supabase/types'
import { PlatformIcon } from '@/components/ui/PlatformIcon'

interface ContentItem {
    id: string
    project_id: string
    scheduled_date: string
    platform: Platform
    status: string
}

interface ProjectWithContent extends Project {
    upcomingContent: ContentItem[]
    gapDays: string[]
    nextPostDate: string | null
    postsThisWeek: number
}

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [userName, setUserName] = useState<string | null>(null)
    const [projects, setProjects] = useState<ProjectWithContent[]>([])
    const [allContent, setAllContent] = useState<ContentItem[]>([])
    const [greeting, setGreeting] = useState('Good morning')

    // Generate next 7 days
    const getNext7Days = () => {
        const days: { date: string; dayName: string; isToday: boolean }[] = []
        const today = new Date()
        for (let i = 0; i < 7; i++) {
            const d = new Date(today)
            d.setDate(d.getDate() + i)
            const dateStr = d.toISOString().split('T')[0]
            days.push({
                date: dateStr,
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                isToday: i === 0
            })
        }
        return days
    }

    const next7Days = getNext7Days()

    useEffect(() => {
        const hour = new Date().getHours()
        if (hour < 12) setGreeting('Good morning')
        else if (hour < 18) setGreeting('Good afternoon')
        else setGreeting('Good evening')
    }, [])

    useEffect(() => {
        async function loadData() {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push('/login')
                    return
                }

                setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'there')

                // Fetch projects
                const { data: projectsData, error: projectsError } = await supabase
                    .from('projects')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (projectsError) {
                    console.error('Error fetching projects:', projectsError)
                    setLoading(false)
                    return
                }

                // Fetch content for next 7 days
                const startDate = next7Days[0].date
                const endDate = next7Days[6].date

                const { data: contentData } = await supabase
                    .from('content_items')
                    .select('id, project_id, scheduled_date, platform, status')
                    .gte('scheduled_date', startDate)
                    .lte('scheduled_date', endDate)
                    .in('status', ['draft', 'approved', 'scheduled'])
                    .order('scheduled_date')

                setAllContent(contentData || [])

                // Process projects with content data
                const projectsWithContent: ProjectWithContent[] = (projectsData || []).map(project => {
                    const projectContent = (contentData || []).filter(c => c.project_id === project.id)
                    const contentDates = new Set(projectContent.map(c => c.scheduled_date))

                    // Find gap days for this project
                    const gapDays = next7Days
                        .filter(d => !contentDates.has(d.date))
                        .map(d => d.date)

                    // Find next post date
                    const futureContent = projectContent
                        .filter(c => c.scheduled_date >= next7Days[0].date)
                        .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))

                    return {
                        ...project,
                        upcomingContent: projectContent,
                        gapDays,
                        nextPostDate: futureContent[0]?.scheduled_date || null,
                        postsThisWeek: projectContent.length
                    }
                })

                setProjects(projectsWithContent)
            } catch (err) {
                console.error('Error loading data:', err)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [supabase, router])

    // Calculate aggregate stats
    const totalScheduled = allContent.length
    const totalGapDays = next7Days.filter(d =>
        !allContent.some(c => c.scheduled_date === d.date)
    ).length
    const projectsWithGaps = projects.filter(p => p.gapDays.length > 0).length

    // Get content count for a specific date
    const getContentCountForDate = (date: string) => {
        return allContent.filter(c => c.scheduled_date === date).length
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
        )
    }

    return (
        <div className="min-h-screen p-8">
            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--foreground)]">
                    {greeting}, {userName} 👋
                </h1>
                <p className="text-[var(--foreground-muted)] mt-1">
                    {projects.length > 0
                        ? "Here's your content command center"
                        : "Let's get started with your first project"
                    }
                </p>
            </header>

            {/* Empty State - No Projects */}
            {projects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-20 h-20 rounded-2xl bg-[var(--surface)] flex items-center justify-center mb-6">
                        <FolderOpen className="w-10 h-10 text-[var(--foreground-muted)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">
                        No Projects Yet
                    </h2>
                    <p className="text-[var(--foreground-muted)] text-center max-w-md mb-8">
                        Create your first project to start generating AI-powered content for your brand.
                    </p>
                    <Link href="/projects/new" className="btn btn-primary">
                        <Plus className="w-4 h-4" />
                        Create Your First Project
                    </Link>
                </div>
            )}

            {/* Has Projects */}
            {projects.length > 0 && (
                <>
                    {/* Quick Flow CTA */}
                    <Link
                        href="/flow"
                        className="card p-6 mb-8 bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] text-white hover:opacity-95 transition-opacity group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <Sparkles className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Quick Flow</h3>
                                    <p className="text-white/80 text-sm">
                                        Generate a week of content in 3 simple steps
                                    </p>
                                </div>
                            </div>
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                        <StatCard
                            icon={<Calendar className="w-5 h-5" />}
                            label="Scheduled This Week"
                            value={totalScheduled}
                            color="primary"
                        />
                        <StatCard
                            icon={totalGapDays > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                            label="Gap Days"
                            value={totalGapDays}
                            color={totalGapDays > 0 ? 'warning' : 'success'}
                        />
                        <StatCard
                            icon={<TrendingUp className="w-5 h-5" />}
                            label="Active Projects"
                            value={projects.length}
                            color="secondary"
                        />
                    </div>

                    {/* 7-Day Overview */}
                    <div className="card p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                                <Clock className="w-5 h-5 text-[var(--primary)]" />
                                Next 7 Days
                            </h2>
                            <Link href="/calendar" className="text-sm text-[var(--primary)] hover:underline flex items-center gap-1">
                                View Calendar <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>

                        {/* Day Strip */}
                        <div className="grid grid-cols-7 gap-2 mb-4">
                            {next7Days.map((day) => {
                                const count = getContentCountForDate(day.date)
                                const hasContent = count > 0
                                const isGap = !hasContent

                                return (
                                    <div
                                        key={day.date}
                                        className={`relative p-3 rounded-xl text-center transition-all ${day.isToday
                                            ? 'bg-[var(--primary)] text-white'
                                            : isGap
                                                ? 'bg-[var(--warning)]/10 border-2 border-dashed border-[var(--warning)]/50'
                                                : 'bg-[var(--surface)]'
                                            }`}
                                    >
                                        <div className={`text-xs font-medium ${day.isToday ? 'text-white/80' : 'text-[var(--foreground-muted)]'}`}>
                                            {day.dayName}
                                        </div>
                                        <div className={`text-2xl font-bold mt-1 ${day.isToday ? 'text-white' : 'text-[var(--foreground)]'}`}>
                                            {count}
                                        </div>
                                        <div className={`text-xs ${day.isToday ? 'text-white/70' : 'text-[var(--foreground-muted)]'}`}>
                                            {count === 1 ? 'post' : 'posts'}
                                        </div>
                                        {isGap && !day.isToday && (
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--warning)] rounded-full flex items-center justify-center">
                                                <AlertTriangle className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Gap Alert */}
                        {totalGapDays > 0 && (
                            <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-[var(--warning)]" />
                                    <span className="text-sm text-[var(--foreground)]">
                                        {totalGapDays} day{totalGapDays !== 1 ? 's' : ''} with no content scheduled
                                    </span>
                                </div>
                                <Link
                                    href="/weekly"
                                    className="btn btn-primary text-sm py-1.5"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Fill Gaps
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Projects with Heatmaps */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-[var(--foreground)]">Project Breakdown</h2>
                            <Link
                                href="/projects/new"
                                className="btn btn-ghost text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                Add Project
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {projects.map((project) => {
                                const hasGaps = project.gapDays.length > 0

                                return (
                                    <div
                                        key={project.id}
                                        className="p-4 rounded-xl bg-[var(--background-elevated)] border border-[var(--surface-border)] hover:border-[var(--primary)]/30 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <Link href={`/projects/${project.id}`} className="flex items-center gap-3 group">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white font-bold">
                                                    {project.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                                                        {project.name}
                                                    </p>
                                                    <div className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
                                                        {project.nextPostDate ? (
                                                            <span>Next: {formatRelativeDate(project.nextPostDate)}</span>
                                                        ) : (
                                                            <span className="text-[var(--warning)]">No upcoming posts</span>
                                                        )}
                                                        <span>•</span>
                                                        <span>{project.postsThisWeek} this week</span>
                                                    </div>
                                                </div>
                                            </Link>

                                            {hasGaps && (
                                                <Link
                                                    href={`/weekly?project=${project.id}`}
                                                    className="btn btn-ghost text-sm text-[var(--primary)]"
                                                >
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    Generate
                                                </Link>
                                            )}
                                        </div>

                                        {/* 7-Day Heatmap */}
                                        <div className="flex gap-1.5">
                                            {next7Days.map((day) => {
                                                const dayContent = project.upcomingContent.filter(
                                                    c => c.scheduled_date === day.date
                                                )
                                                const hasContent = dayContent.length > 0

                                                return (
                                                    <div
                                                        key={day.date}
                                                        className="flex-1 group relative"
                                                    >
                                                        <div
                                                            className={`h-8 rounded-md flex items-center justify-center transition-all ${hasContent
                                                                ? 'bg-[var(--primary)]'
                                                                : 'bg-[var(--surface)] border-2 border-dashed border-[var(--surface-border)]'
                                                                } ${day.isToday ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background-elevated)]' : ''}`}
                                                        >
                                                            {hasContent && (
                                                                <span className="text-xs font-medium text-white">
                                                                    {dayContent.length}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-center text-[var(--foreground-muted)] mt-1">
                                                            {day.dayName}
                                                        </div>

                                                        {/* Tooltip on hover */}
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--foreground)] text-[var(--background)] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                                            {hasContent
                                                                ? `${dayContent.length} post${dayContent.length !== 1 ? 's' : ''}`
                                                                : 'No content'
                                                            }
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        {/* Platform badges */}
                                        {project.platforms && project.platforms.length > 0 && (
                                            <div className="flex gap-1.5 mt-3 pt-3 border-t border-[var(--surface-border)]">
                                                {project.platforms.map((platform) => (
                                                    <div
                                                        key={platform}
                                                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface)] text-xs text-[var(--foreground-muted)]"
                                                    >
                                                        <PlatformIcon platform={platform} size={12} />
                                                        <span className="capitalize">{platform}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        {projects.length > 5 && (
                            <Link
                                href="/projects"
                                className="block mt-4 text-center text-sm text-[var(--primary)] hover:underline"
                            >
                                View all {projects.length} projects →
                            </Link>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

// Helper function to format relative dates
function formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const targetDate = new Date(dateStr)
    targetDate.setHours(0, 0, 0, 0)

    const diffDays = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Stat Card Component
function StatCard({
    icon,
    label,
    value,
    color
}: {
    icon: React.ReactNode
    label: string
    value: string | number
    color: 'primary' | 'secondary' | 'success' | 'warning'
}) {
    const colorClasses = {
        primary: 'bg-[var(--primary)]/10 text-[var(--primary)]',
        secondary: 'bg-[var(--secondary)]/10 text-[var(--secondary)]',
        success: 'bg-[var(--success)]/10 text-[var(--success)]',
        warning: 'bg-[var(--warning)]/10 text-[var(--warning)]',
    }

    return (
        <div className="card p-5">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
                    <p className="text-sm text-[var(--foreground-muted)]">{label}</p>
                </div>
            </div>
        </div>
    )
}

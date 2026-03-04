import { supabaseAdmin } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { PostPublishButton } from './PostPublishButton'

export const dynamic = 'force-dynamic'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  scheduled: 'warning',
  published: 'success',
  failed: 'destructive',
  draft: 'secondary',
}

interface GBPPostRow {
  id: string
  type: string | null
  summary: string | null
  call_to_action_type: string | null
  scheduled_at: string | null
  published_at: string | null
  status: string
  gbp_profiles: {
    locations: {
      name: string
    } | null
  } | null
}

export default async function PostsPage() {
  const { data } = await supabaseAdmin
    .from('gbp_posts')
    .select('*, gbp_profiles(locations(name))')
    .order('scheduled_at', { ascending: false })
    .limit(100)

  const posts = (data ?? []) as GBPPostRow[]

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">GBP Posts</h1>
        <p className="text-gray-500 mt-1">{posts.length} posts across all locations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No posts yet. Posts are generated weekly via Inngest.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {posts.map((post) => {
                const locationName = post.gbp_profiles?.locations?.name ?? 'Unknown Location'
                const summary = post.summary
                  ? post.summary.length > 100
                    ? post.summary.slice(0, 100) + '...'
                    : post.summary
                  : '—'

                return (
                  <div key={post.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{locationName}</span>
                        <Badge variant="secondary" className="text-xs">
                          {post.type ?? 'STANDARD'}
                        </Badge>
                        <Badge variant={statusVariant[post.status] ?? 'secondary'} className="text-xs">
                          {post.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{summary}</p>
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        {post.scheduled_at && (
                          <span>Scheduled: {format(new Date(post.scheduled_at), 'MMM d, yyyy h:mm a')}</span>
                        )}
                        {post.published_at && (
                          <span>Published: {format(new Date(post.published_at), 'MMM d, yyyy h:mm a')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <PostPublishButton
                        postId={post.id}
                        disabled={post.status === 'published'}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

<template>
  <div class="forum-page">
    <NavHeader />
    <main class="forum-container">
      <ForumBreadcrumb category-name="Admin" />

      <h1>Forum Moderation</h1>

      <div v-if="!isMod" class="access-denied">
        Moderator access required.
      </div>

      <template v-else>
        <div class="mod-tabs">
          <button class="tab" :class="{ active: tab === 'topics' }" @click="tab = 'topics'">Topics</button>
          <button class="tab" :class="{ active: tab === 'posts' }" @click="tab = 'posts'">Posts</button>
        </div>

        <div v-if="loading" class="loading">Loading...</div>

        <!-- Topics tab -->
        <div v-else-if="tab === 'topics'" class="mod-list">
          <div v-for="t in topics" :key="t.id" class="mod-item">
            <div class="mod-item-info">
              <NuxtLink :to="`/forum/${t.forum_categories?.slug || 'general'}/${t.slug}`" class="mod-title">
                {{ t.title }}
              </NuxtLink>
              <div class="mod-meta">
                {{ t.community_profiles?.handle || 'anonymous' }}
                &middot; {{ timeAgo(t.created_at) }}
                &middot; {{ t.reply_count }} replies
                <span v-if="t.is_pinned" class="badge pin">Pinned</span>
                <span v-if="t.is_locked" class="badge lock">Locked</span>
                <span v-if="t.is_deleted" class="badge del">Deleted</span>
              </div>
            </div>
            <div class="mod-actions">
              <button @click="doModerate(t.is_pinned ? 'unpin' : 'pin', 'topic', t.id)" class="mod-btn">
                {{ t.is_pinned ? 'Unpin' : 'Pin' }}
              </button>
              <button @click="doModerate(t.is_locked ? 'unlock' : 'lock', 'topic', t.id)" class="mod-btn">
                {{ t.is_locked ? 'Unlock' : 'Lock' }}
              </button>
              <button @click="doModerate(t.is_deleted ? 'restore' : 'delete', 'topic', t.id)" class="mod-btn danger">
                {{ t.is_deleted ? 'Restore' : 'Delete' }}
              </button>
            </div>
          </div>
          <div v-if="!topics.length" class="empty">No topics found.</div>
        </div>

        <!-- Posts tab -->
        <div v-else-if="tab === 'posts'" class="mod-list">
          <div v-for="p in recentPosts" :key="p.id" class="mod-item">
            <div class="mod-item-info">
              <div class="mod-title post-preview">{{ truncate(p.body, 120) }}</div>
              <div class="mod-meta">
                {{ p.community_profiles?.handle || 'anonymous' }}
                &middot; {{ timeAgo(p.created_at) }}
                <span v-if="p.is_deleted" class="badge del">Deleted</span>
              </div>
            </div>
            <div class="mod-actions">
              <button @click="doModerate(p.is_deleted ? 'restore' : 'delete', 'post', p.id)" class="mod-btn danger">
                {{ p.is_deleted ? 'Restore' : 'Delete' }}
              </button>
            </div>
          </div>
          <div v-if="!recentPosts.length" class="empty">No posts found.</div>
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
const client = useSupabaseClient()
const user = useSupabaseUser()
const { moderate } = useForum()

const tab = ref<'topics' | 'posts'>('topics')
const topics = ref<any[]>([])
const recentPosts = ref<any[]>([])
const loading = ref(true)
const isMod = ref(false)

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '...' : s
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

async function loadData() {
  loading.value = true
  try {
    const { data: t } = await client
      .from('forum_topics')
      .select('*, community_profiles(handle), forum_categories(slug)')
      .order('created_at', { ascending: false })
      .limit(50)
    topics.value = t || []

    const { data: p } = await client
      .from('forum_posts')
      .select('*, community_profiles(handle)')
      .order('created_at', { ascending: false })
      .limit(50)
    recentPosts.value = p || []
  } catch {}
  loading.value = false
}

async function doModerate(action: string, targetType: string, targetId: string) {
  try {
    await moderate(action, targetType, targetId)
    await loadData()
  } catch (e: any) {
    alert(e.data?.error || e.message || 'Moderation failed')
  }
}

onMounted(async () => {
  if (user.value) {
    const { data } = await client
      .from('community_profiles')
      .select('role')
      .eq('user_id', user.value.id)
      .maybeSingle()
    isMod.value = data?.role === 'moderator' || data?.role === 'admin'
  }
  if (isMod.value) await loadData()
  else loading.value = false
})

useHead({ title: 'Forum Admin — CES Formalization' })
</script>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  font-family: var(--font-sans);
}
.forum-container {
  max-width: var(--container-width);
  margin: 0 auto;
  padding: 1.5rem var(--container-padding);
}
h1 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 1rem;
}
.access-denied {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  padding: 2rem 0;
}
.mod-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 1rem;
}
.tab {
  background: none;
  border: none;
  padding: 0.4rem 0.75rem;
  font-size: 0.82rem;
  font-family: var(--font-sans);
  color: var(--color-text-faint);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.tab:hover { color: var(--color-text-tertiary); }
.tab.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-text-primary);
}
.loading, .empty {
  color: var(--color-text-faint);
  font-size: 0.9rem;
  padding: 1rem 0;
}
.mod-list {
  display: flex;
  flex-direction: column;
}
.mod-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-border-faint);
}
.mod-item-info { flex: 1; min-width: 0; }
.mod-title {
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--color-text-primary);
  text-decoration: none;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mod-title:hover { color: var(--color-link); }
.post-preview {
  font-weight: 400;
  color: var(--color-text-secondary);
}
.mod-meta {
  font-size: 0.72rem;
  color: var(--color-text-faint);
  margin-top: 0.1rem;
}
.badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.05rem 0.3rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-left: 0.3rem;
}
.badge.pin { background: var(--color-marquee-bg); color: var(--color-marquee-fg); }
.badge.lock { background: var(--color-pending-bg); color: var(--color-pending-fg); }
.badge.del { background: var(--color-inconsistent-bg); color: var(--color-inconsistent-fg); }
.mod-actions {
  display: flex;
  gap: 0.3rem;
  flex-shrink: 0;
}
.mod-btn {
  padding: 0.25rem 0.5rem;
  background: none;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
  font-family: var(--font-sans);
}
.mod-btn:hover { background: var(--color-bg-hover); }
.mod-btn.danger:hover { color: var(--color-error); border-color: var(--color-error); }
</style>

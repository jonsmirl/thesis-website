<template>
  <div class="forum-page">
    <main class="forum-container">
      <ForumBreadcrumb
        :category-slug="topic?.forum_categories?.slug"
        :category-name="topic?.forum_categories?.name"
        :topic-title="topic?.title"
      />

      <div v-if="loading" class="loading">Loading topic...</div>

      <template v-else-if="topic">
        <!-- Topic header -->
        <div class="topic-detail">
          <div class="topic-head">
            <ForumVoteButton
              :score="topic.vote_score || 0"
              :my-vote="topicVote"
              :disabled="!user"
              @vote="onTopicVote"
            />
            <div class="topic-info">
              <h1>{{ topic.title }}</h1>
              <div class="topic-meta">
                <span class="author">{{ topicAuthor }}</span>
                <span class="sep">&middot;</span>
                <span class="time">{{ timeAgo(topic.created_at) }}</span>
                <span class="sep">&middot;</span>
                <span class="views">{{ topic.view_count }} views</span>
                <span v-if="topic.is_locked" class="locked-badge">Locked</span>
                <span v-if="topic.related_type" class="cross-link">
                  {{ topic.related_type }}:
                  <NuxtLink :to="`/${topic.related_type === 'wiki' ? 'wiki' : topic.related_type + 's'}/${topic.related_slug}`">
                    {{ topic.related_slug }}
                  </NuxtLink>
                </span>
              </div>
            </div>
          </div>

          <div class="topic-body" ref="topicBodyRef" v-html="topic.body_html || topic.body"></div>

          <div v-if="user && isTopicAuthor" class="topic-edit-row">
            <button class="action-link" @click="editingTopic = !editingTopic">
              {{ editingTopic ? 'Cancel' : 'Edit' }}
            </button>
          </div>

          <div v-if="editingTopic" class="edit-section">
            <ForumEditor v-model="editTopicBody" :rows="8" />
            <div class="edit-actions">
              <button class="btn-cancel" @click="editingTopic = false">Cancel</button>
              <button class="btn-save" :disabled="editTopicBody.trim().length < 10" @click="saveTopicEdit">Save</button>
            </div>
          </div>
        </div>

        <!-- Replies -->
        <div class="replies-section">
          <h2 class="replies-heading" v-if="posts.length">
            {{ posts.length }} {{ posts.length === 1 ? 'Reply' : 'Replies' }}
          </h2>

          <div class="posts-list">
            <ForumPost
              v-for="p in topLevelPosts"
              :key="p.id"
              :post="p"
              :my-vote="postVotes[p.id] || 0"
              :is-author="p.author_id === user?.id"
              :is-locked="topic.is_locked"
              :replies="getReplies(p.id)"
              :all-posts="posts"
              :my-votes="postVotes"
              :user-id="user?.id"
              @vote="onPostVote"
              @reply="onReply"
              @edit="onEditPost"
            />
          </div>
        </div>

        <!-- Reply form -->
        <div v-if="user && !topic.is_locked" class="new-reply">
          <h3>Post a Reply</h3>
          <ForumEditor v-model="newReply" :rows="6" />
          <div class="reply-actions">
            <button
              class="btn-submit"
              :disabled="submitting || newReply.trim().length < 2"
              @click="submitReply"
            >
              {{ submitting ? 'Posting...' : 'Reply' }}
            </button>
          </div>
          <p v-if="replyError" class="error">{{ replyError }}</p>
        </div>
        <div v-else-if="topic.is_locked" class="locked-notice">
          This topic is locked. No new replies.
        </div>
        <div v-else-if="!user" class="login-prompt">
          <NuxtLink to="/login">Sign in</NuxtLink> to reply.
        </div>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { autoDetectMath } from '~/utils/math-render'

const route = useRoute()
const { user } = useAuth()
const { fetchTopic, fetchPosts, fetchMyVotes, createPost, updateTopic, updatePost, vote: castVote } = useForum()

const topic = ref<any>(null)
const posts = ref<any[]>([])
const topicVote = ref(0)
const postVotes = ref<Record<string, number>>({})
const loading = ref(true)

const newReply = ref('')
const submitting = ref(false)
const replyError = ref('')
const editingTopic = ref(false)
const editTopicBody = ref('')
const topicBodyRef = ref<HTMLElement | null>(null)

const categorySlug = computed(() => route.params.category as string)
const topicSlug = computed(() => route.params.slug as string)
const topicAuthor = computed(() =>
  topic.value?.community_profiles?.display_name || topic.value?.community_profiles?.handle || 'anonymous'
)
const isTopicAuthor = computed(() => user.value?.id === topic.value?.author_id)
const topLevelPosts = computed(() => posts.value.filter(p => !p.parent_id))

function getReplies(parentId: string) {
  return posts.value.filter(p => p.parent_id === parentId)
}

async function loadData() {
  loading.value = true
  try {
    topic.value = await fetchTopic(categorySlug.value, topicSlug.value)
    posts.value = await fetchPosts(topic.value.id)

    if (user.value) {
      const topicVotes = await fetchMyVotes('topic', [topic.value.id])
      topicVote.value = topicVotes[topic.value.id] || 0

      if (posts.value.length) {
        postVotes.value = await fetchMyVotes('post', posts.value.map(p => p.id))
      }
    }
  } catch (e) {
    console.error('Failed to load topic:', e)
  } finally {
    loading.value = false
  }
}

async function onTopicVote(value: 1 | -1) {
  try {
    await castVote('topic', topic.value.id, topicVote.value === value ? 0 : value)
    topicVote.value = topicVote.value === value ? 0 : value
    // Refresh score
    topic.value = await fetchTopic(categorySlug.value, topicSlug.value)
  } catch {}
}

async function onPostVote(id: string, value: 1 | -1) {
  try {
    const current = postVotes.value[id] || 0
    await castVote('post', id, current === value ? 0 : value)
    postVotes.value[id] = current === value ? 0 : value
    posts.value = await fetchPosts(topic.value.id)
  } catch {}
}

async function onReply(parentId: string, body: string) {
  try {
    await createPost({ topic_id: topic.value.id, body, parent_id: parentId })
    posts.value = await fetchPosts(topic.value.id)
  } catch (e: any) {
    replyError.value = e.data?.error || e.message || 'Failed to reply'
  }
}

async function onEditPost(id: string, body: string) {
  try {
    await updatePost({ post_id: id, body })
    posts.value = await fetchPosts(topic.value.id)
  } catch {}
}

async function submitReply() {
  submitting.value = true
  replyError.value = ''
  try {
    await createPost({ topic_id: topic.value.id, body: newReply.value.trim() })
    newReply.value = ''
    posts.value = await fetchPosts(topic.value.id)
  } catch (e: any) {
    replyError.value = e.data?.error || e.message || 'Failed to post reply'
  } finally {
    submitting.value = false
  }
}

async function saveTopicEdit() {
  try {
    await updateTopic({ topic_id: topic.value.id, body: editTopicBody.value.trim() })
    topic.value = await fetchTopic(categorySlug.value, topicSlug.value)
    editingTopic.value = false
  } catch {}
}

onMounted(async () => {
  await loadData()
  // Apply KaTeX to topic body
  nextTick(() => {
    if (topicBodyRef.value) {
      topicBodyRef.value.innerHTML = autoDetectMath(topicBodyRef.value.innerHTML)
    }
  })
})

watch(editingTopic, (val) => {
  if (val) editTopicBody.value = topic.value?.body || ''
})

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

useHead({ title: computed(() => `${topic.value?.title || 'Topic'} — CES Formalization`) })
</script>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: var(--color-bg-page);
  font-family: var(--font-sans);
}
.forum-container {
  max-width: var(--container-reading);
  margin: 0 auto;
  padding: 1.5rem var(--container-padding);
}
.loading {
  color: var(--color-text-faint);
  font-size: 0.9rem;
  padding: 2rem 0;
}

/* ── Topic detail ── */
.topic-detail {
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 2px solid var(--color-border);
}
.topic-head {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}
.topic-info { flex: 1; min-width: 0; }
.topic-info h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 0.25rem;
  line-height: 1.35;
}
.topic-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
  font-size: 0.78rem;
  color: var(--color-text-faint);
}
.author { font-weight: 500; }
.sep { color: var(--color-text-placeholder); }
.locked-badge {
  background: var(--color-pending-bg);
  color: var(--color-pending-fg);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.cross-link {
  color: var(--color-text-faint);
  font-style: italic;
}
.cross-link a { color: var(--color-link); }
.topic-body {
  font-family: var(--font-serif);
  font-size: 0.95rem;
  line-height: 1.65;
  color: var(--color-text-secondary);
  word-wrap: break-word;
}
.topic-body :deep(p) { margin: 0 0 0.65rem; }
.topic-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.84em;
  background: var(--color-bg-code);
  padding: 0.1em 0.3em;
  border-radius: var(--radius-sm);
}
.topic-body :deep(pre) {
  background: var(--color-bg-code);
  padding: 0.75rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-size: 0.82rem;
}
.topic-body :deep(blockquote) {
  border-left: 3px solid var(--color-border-heavy);
  margin: 0 0 0.65rem;
  padding: 0.25rem 0.75rem;
  color: var(--color-text-muted);
}
.topic-edit-row {
  margin-top: 0.5rem;
}
.action-link {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--color-text-ghost);
  padding: 0;
  font-weight: 500;
  font-family: var(--font-sans);
}
.action-link:hover { color: var(--color-text-tertiary); }
.edit-section {
  margin-top: 0.75rem;
}
.edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.35rem;
}

/* ── Replies ── */
.replies-section {
  margin-bottom: 1.5rem;
}
.replies-heading {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin: 0 0 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border-light);
}
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

/* ── New reply ── */
.new-reply {
  margin-top: 1rem;
}
.new-reply h3 {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin: 0 0 0.5rem;
}
.reply-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.35rem;
}
.btn-submit {
  padding: 0.4rem 0.85rem;
  background: var(--color-btn-accent);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
  font-family: var(--font-sans);
}
.btn-submit:hover:not(:disabled) { background: var(--color-btn-accent-hover); }
.btn-submit:disabled { opacity: 0.5; cursor: default; }
.btn-cancel {
  padding: 0.3rem 0.6rem;
  background: none;
  border: 1px solid var(--color-border-input);
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
}
.btn-cancel:hover { background: var(--color-bg-hover); }
.btn-save {
  padding: 0.3rem 0.7rem;
  background: var(--color-btn-accent);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 500;
  font-family: var(--font-sans);
}
.btn-save:hover:not(:disabled) { background: var(--color-btn-accent-hover); }
.btn-save:disabled { opacity: 0.5; cursor: default; }
.error {
  color: var(--color-error);
  font-size: 0.82rem;
  margin: 0.35rem 0 0;
}
.locked-notice, .login-prompt {
  margin-top: 1rem;
  font-size: 0.88rem;
  color: var(--color-text-muted);
  padding: 0.75rem 1rem;
  background: var(--color-bg-surface-warm);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.login-prompt a { color: var(--color-link); font-weight: 500; }
</style>

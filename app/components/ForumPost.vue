<template>
  <div class="forum-post" :class="{ 'is-nested': depth > 0 }">
    <div class="post-row">
      <ForumVoteButton
        :score="post.vote_score || 0"
        :my-vote="myVote"
        :disabled="!canVote"
        @vote="v => $emit('vote', post.id, v)"
      />
      <div class="post-content">
        <div class="post-meta">
          <strong class="post-author">{{ authorName }}</strong>
          <span class="post-time">{{ timeAgo(post.created_at) }}</span>
          <span v-if="post.is_edited" class="post-edited">(edited)</span>
        </div>
        <div
          v-if="!editing"
          class="post-body"
          ref="bodyRef"
          v-html="post.body_html || post.body"
        ></div>
        <div v-else class="post-edit-form">
          <ForumEditor v-model="editBody" :rows="5" />
          <div class="edit-actions">
            <button class="btn-cancel" @click="editing = false">Cancel</button>
            <button class="btn-save" :disabled="editBody.trim().length < 2" @click="submitEdit">Save</button>
          </div>
        </div>
        <div class="post-actions">
          <button v-if="!isLocked && canVote" class="action" @click="toggleReply">
            {{ showReply ? 'Cancel' : 'Reply' }}
          </button>
          <button v-if="isAuthor" class="action" @click="startEdit">Edit</button>
        </div>
        <div v-if="showReply" class="reply-form">
          <ForumEditor v-model="replyBody" :rows="4" placeholder="Write a reply..." />
          <div class="reply-actions">
            <button class="btn-cancel" @click="showReply = false">Cancel</button>
            <button class="btn-submit" :disabled="replyBody.trim().length < 2" @click="submitReply">Reply</button>
          </div>
        </div>
      </div>
    </div>
    <div v-if="replies.length" class="nested-replies">
      <ForumPost
        v-for="r in replies"
        :key="r.id"
        :post="r"
        :my-vote="getMyVote(r.id)"
        :is-author="r.author_id === userId"
        :is-locked="isLocked"
        :replies="getReplies(r.id)"
        :all-posts="allPosts"
        :my-votes="myVotes"
        :user-id="userId"
        :depth="depth + 1"
        @vote="(id, v) => $emit('vote', id, v)"
        @reply="(id, b) => $emit('reply', id, b)"
        @edit="(id, b) => $emit('edit', id, b)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { autoDetectMath } from '~/utils/math-render'

const props = withDefaults(defineProps<{
  post: any
  myVote?: number
  isAuthor?: boolean
  isLocked?: boolean
  replies?: any[]
  allPosts?: any[]
  myVotes?: Record<string, number>
  userId?: string
  depth?: number
}>(), {
  replies: () => [],
  allPosts: () => [],
  myVotes: () => ({}),
  depth: 0,
})

const emit = defineEmits<{
  vote: [id: string, value: 1 | -1]
  reply: [parentId: string, body: string]
  edit: [id: string, body: string]
}>()

const user = useSupabaseUser()
const canVote = computed(() => !!user.value)

const showReply = ref(false)
const replyBody = ref('')
const editing = ref(false)
const editBody = ref('')
const bodyRef = ref<HTMLElement | null>(null)

const authorName = computed(() =>
  props.post.community_profiles?.display_name || props.post.community_profiles?.handle || 'anonymous'
)

function getMyVote(id: string) { return props.myVotes?.[id] || 0 }
function getReplies(parentId: string) {
  return (props.allPosts || []).filter(p => p.parent_id === parentId)
}

function toggleReply() { showReply.value = !showReply.value }

function startEdit() {
  editBody.value = props.post.body
  editing.value = true
}

function submitReply() {
  if (replyBody.value.trim().length < 2) return
  emit('reply', props.post.id, replyBody.value.trim())
  replyBody.value = ''
  showReply.value = false
}

function submitEdit() {
  if (editBody.value.trim().length < 2) return
  emit('edit', props.post.id, editBody.value.trim())
  editing.value = false
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

// Apply KaTeX rendering to body after mount
onMounted(() => {
  if (bodyRef.value) {
    bodyRef.value.innerHTML = autoDetectMath(bodyRef.value.innerHTML)
  }
})
</script>

<style scoped>
.forum-post {
  border-left: 2px solid var(--color-border);
}
.forum-post.is-nested {
  margin-left: 1.25rem;
}
.post-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0.5rem 0.5rem 0.6rem;
}
.post-content {
  flex: 1;
  min-width: 0;
}
.post-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.25rem;
}
.post-author {
  font-size: 0.8rem;
  color: var(--color-text-primary);
  font-family: var(--font-sans);
}
.post-time {
  font-size: 0.72rem;
  color: var(--color-text-placeholder);
}
.post-edited {
  font-size: 0.68rem;
  color: var(--color-text-placeholder);
  font-style: italic;
}
.post-body {
  font-family: var(--font-serif);
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  word-wrap: break-word;
}
.post-body :deep(p) { margin: 0 0 0.5rem; }
.post-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.84em;
  background: var(--color-bg-code);
  padding: 0.1em 0.3em;
  border-radius: var(--radius-sm);
}
.post-body :deep(pre) {
  background: var(--color-bg-code);
  padding: 0.6rem;
  border-radius: var(--radius-md);
  overflow-x: auto;
  font-size: 0.82rem;
}
.post-body :deep(blockquote) {
  border-left: 3px solid var(--color-border-heavy);
  margin: 0.25rem 0;
  padding: 0.2rem 0.6rem;
  color: var(--color-text-muted);
}
.post-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.action {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.72rem;
  color: var(--color-text-ghost);
  padding: 0;
  font-weight: 500;
  font-family: var(--font-sans);
}
.action:hover { color: var(--color-text-tertiary); }
.reply-form, .post-edit-form {
  margin-top: 0.5rem;
}
.reply-actions, .edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.35rem;
}
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
.btn-submit, .btn-save {
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
.btn-submit:hover:not(:disabled), .btn-save:hover:not(:disabled) {
  background: var(--color-btn-accent-hover);
}
.btn-submit:disabled, .btn-save:disabled {
  opacity: 0.5;
  cursor: default;
}
.nested-replies {
  margin-bottom: 0.25rem;
}
</style>

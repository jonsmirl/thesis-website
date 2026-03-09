<template>
  <section class="comment-section">
    <div class="section-header">
      <h3>Discussion <span class="count" v-if="topLevel.length">({{ topLevel.length }})</span></h3>
    </div>

    <div v-if="loading" class="loading">Loading discussion...</div>

    <div v-else-if="topLevel.length === 0" class="empty">
      No comments yet. {{ user ? 'Start the discussion.' : 'Sign in to comment.' }}
    </div>

    <div v-else class="comment-list">
      <CommentNode
        v-for="c in topLevel"
        :key="c.id"
        :comment="c"
        :replies="repliesFor(c.id)"
        :all-replies="comments"
        :my-votes="myVotes"
        :user="user"
        :depth="0"
        @vote="onVote"
        @reply="onReply"
        @edit="onEdit"
        @delete="onDelete"
        @flag="onFlag"
      />
    </div>

    <div v-if="user" class="new-comment">
      <textarea
        v-model="newBody"
        placeholder="Add to the discussion... (Markdown supported)"
        rows="3"
        class="comment-input"
      ></textarea>
      <div class="form-actions">
        <span class="char-count" :class="{ warn: newBody.length > 9500 }">{{ newBody.length }}/10000</span>
        <button class="submit-btn" :disabled="newBody.trim().length < 2" @click="submitComment">Post Comment</button>
      </div>
      <p v-if="submitError" class="error">{{ submitError }}</p>
    </div>
    <div v-else class="login-prompt">
      <NuxtLink to="/login">Sign in</NuxtLink> to join the discussion.
    </div>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  contentType: 'wiki' | 'theorem' | 'test' | 'paper'
  contentSlug: string
}>()

const user = useSupabaseUser()
const { comments, myVotes, loading, fetchComments, addComment, editComment, deleteComment, vote, flag } =
  useComments(props.contentType, props.contentSlug)

const newBody = ref('')
const submitError = ref('')

const topLevel = computed(() => comments.value.filter(c => !c.parent_id))

function repliesFor(parentId: string) {
  return comments.value.filter(c => c.parent_id === parentId)
}

async function submitComment() {
  submitError.value = ''
  try {
    await addComment(newBody.value.trim())
    newBody.value = ''
  } catch (e: any) {
    submitError.value = e.message || 'Failed to post comment'
  }
}

async function onVote(commentId: string, value: 1 | -1) {
  await vote(commentId, value)
}

async function onReply(parentId: string, body: string) {
  await addComment(body, parentId)
}

async function onEdit(commentId: string, body: string) {
  await editComment(commentId, body)
}

async function onDelete(commentId: string) {
  await deleteComment(commentId)
}

async function onFlag(commentId: string, reason: string) {
  await flag(commentId, reason)
}

onMounted(() => fetchComments())
</script>

<!-- Nested comment node (recursive) -->
<script lang="ts">
import { defineComponent, ref, h, computed } from 'vue'

const CommentNode = defineComponent({
  name: 'CommentNode',
  props: {
    comment: { type: Object, required: true },
    replies: { type: Array, default: () => [] },
    allReplies: { type: Array, default: () => [] },
    myVotes: { type: Object, default: () => ({}) },
    user: { type: Object, default: null },
    depth: { type: Number, default: 0 },
  },
  emits: ['vote', 'reply', 'edit', 'delete', 'flag'],
  setup(props, { emit }) {
    const showReply = ref(false)
    const replyBody = ref('')
    const showEdit = ref(false)
    const editBody = ref('')
    const showFlag = ref(false)
    const flagReason = ref('off-topic')

    const profile = computed(() => props.comment.community_profiles)
    const isOwn = computed(() => props.user?.id === props.comment.user_id)
    const myVote = computed(() => (props.myVotes as any)[props.comment.id] || 0)
    const timeAgo = computed(() => {
      const diff = Date.now() - new Date(props.comment.created_at).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return 'just now'
      if (mins < 60) return `${mins}m ago`
      const hrs = Math.floor(mins / 60)
      if (hrs < 24) return `${hrs}h ago`
      const days = Math.floor(hrs / 24)
      if (days < 30) return `${days}d ago`
      return new Date(props.comment.created_at).toLocaleDateString()
    })

    function nestedReplies(parentId: string) {
      return (props.allReplies as any[]).filter(c => c.parent_id === parentId)
    }

    function submitReply() {
      if (replyBody.value.trim().length < 2) return
      emit('reply', props.comment.id, replyBody.value.trim())
      replyBody.value = ''
      showReply.value = false
    }

    function submitEdit() {
      if (editBody.value.trim().length < 2) return
      emit('edit', props.comment.id, editBody.value.trim())
      showEdit.value = false
    }

    function submitFlag() {
      emit('flag', props.comment.id, flagReason.value)
      showFlag.value = false
    }

    return () => {
      const c = props.comment as any
      const indent = Math.min(props.depth, 4)

      const children: any[] = []

      // Vote column
      children.push(
        h('div', { class: 'vote-col' }, [
          h('button', {
            class: ['vote-btn', 'up', { active: myVote.value === 1 }],
            onClick: () => emit('vote', c.id, 1),
            disabled: !props.user,
            'aria-label': 'Upvote',
          }, '\u25B2'),
          h('span', { class: ['vote-score', { positive: c.score > 0, negative: c.score < 0 }] }, String(c.score)),
          h('button', {
            class: ['vote-btn', 'down', { active: myVote.value === -1 }],
            onClick: () => emit('vote', c.id, -1),
            disabled: !props.user,
            'aria-label': 'Downvote',
          }, '\u25BC'),
        ])
      )

      // Comment body
      const bodyChildren: any[] = [
        h('div', { class: 'comment-meta' }, [
          h('strong', { class: 'author' }, profile.value?.display_name || 'Anonymous'),
          profile.value?.institution ? h('span', { class: 'institution' }, profile.value.institution) : null,
          profile.value?.reputation ? h('span', {
            class: 'rep',
            title: 'Reputation',
          }, `${profile.value.reputation >= 0 ? '+' : ''}${profile.value.reputation}`) : null,
          h('span', { class: 'time' }, timeAgo.value),
          c.is_edited ? h('span', { class: 'edited' }, '(edited)') : null,
        ]),
        h('div', { class: 'comment-body', innerHTML: c.body }),
      ]

      // Action bar
      const actions: any[] = []
      if (props.user) {
        if (indent < 4) {
          actions.push(h('button', {
            class: 'action-btn',
            onClick: () => { showReply.value = !showReply.value },
          }, 'Reply'))
        }
        if (isOwn.value) {
          actions.push(h('button', {
            class: 'action-btn',
            onClick: () => { editBody.value = c.body; showEdit.value = !showEdit.value },
          }, 'Edit'))
          actions.push(h('button', {
            class: 'action-btn delete',
            onClick: () => { if (confirm('Delete this comment?')) emit('delete', c.id) },
          }, 'Delete'))
        } else {
          actions.push(h('button', {
            class: 'action-btn flag',
            onClick: () => { showFlag.value = !showFlag.value },
          }, 'Flag'))
        }
      }
      bodyChildren.push(h('div', { class: 'action-bar' }, actions))

      // Reply form
      if (showReply.value) {
        bodyChildren.push(h('div', { class: 'inline-form' }, [
          h('textarea', {
            value: replyBody.value,
            onInput: (e: any) => { replyBody.value = e.target.value },
            placeholder: 'Write a reply...',
            rows: 2,
            class: 'comment-input small',
          }),
          h('div', { class: 'form-actions' }, [
            h('button', { class: 'cancel-btn', onClick: () => { showReply.value = false } }, 'Cancel'),
            h('button', {
              class: 'submit-btn small',
              disabled: replyBody.value.trim().length < 2,
              onClick: submitReply,
            }, 'Reply'),
          ]),
        ]))
      }

      // Edit form
      if (showEdit.value) {
        bodyChildren.push(h('div', { class: 'inline-form' }, [
          h('textarea', {
            value: editBody.value,
            onInput: (e: any) => { editBody.value = e.target.value },
            rows: 3,
            class: 'comment-input small',
          }),
          h('div', { class: 'form-actions' }, [
            h('button', { class: 'cancel-btn', onClick: () => { showEdit.value = false } }, 'Cancel'),
            h('button', { class: 'submit-btn small', onClick: submitEdit }, 'Save'),
          ]),
        ]))
      }

      // Flag form
      if (showFlag.value) {
        bodyChildren.push(h('div', { class: 'inline-form flag-form' }, [
          h('select', {
            value: flagReason.value,
            onChange: (e: any) => { flagReason.value = e.target.value },
            class: 'flag-select',
          }, [
            h('option', { value: 'off-topic' }, 'Off-topic'),
            h('option', { value: 'spam' }, 'Spam'),
            h('option', { value: 'harassment' }, 'Harassment'),
            h('option', { value: 'misinformation' }, 'Misinformation'),
            h('option', { value: 'other' }, 'Other'),
          ]),
          h('button', { class: 'submit-btn small', onClick: submitFlag }, 'Submit Flag'),
          h('button', { class: 'cancel-btn', onClick: () => { showFlag.value = false } }, 'Cancel'),
        ]))
      }

      children.push(h('div', { class: 'comment-content' }, bodyChildren))

      // Render replies recursively
      const replyNodes = (props.replies as any[]).map(r =>
        h(CommentNode, {
          comment: r,
          replies: nestedReplies(r.id),
          allReplies: props.allReplies,
          myVotes: props.myVotes,
          user: props.user,
          depth: props.depth + 1,
          onVote: (id: string, v: number) => emit('vote', id, v),
          onReply: (id: string, b: string) => emit('reply', id, b),
          onEdit: (id: string, b: string) => emit('edit', id, b),
          onDelete: (id: string) => emit('delete', id),
          onFlag: (id: string, r: string) => emit('flag', id, r),
        })
      )

      return h('div', {
        class: 'comment-node',
        style: { marginLeft: indent > 0 ? '1.5rem' : '0' },
      }, [
        h('div', { class: 'comment-row' }, children),
        ...replyNodes,
      ])
    }
  },
})
</script>

<style scoped>
.comment-section {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 2px solid var(--color-border);
}
.section-header {
  margin-bottom: 1rem;
}
.section-header h3 {
  font-size: 1rem;
  color: var(--color-text-primary);
  margin: 0;
}
.count { color: var(--color-text-faint); font-weight: 400; }

.loading, .empty {
  color: var(--color-text-faint);
  font-size: 0.9rem;
  padding: 1rem 0;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.comment-node {
  border-left: 2px solid var(--color-border);
  margin-bottom: 0.25rem;
}

.comment-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0 0.5rem 0.5rem;
}

.vote-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  min-width: 28px;
  padding-top: 0.15rem;
}
.vote-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.6rem;
  color: var(--color-text-placeholder);
  padding: 0.1rem 0.25rem;
  line-height: 1;
}
.vote-btn:hover:not(:disabled) { color: var(--color-text-tertiary); }
.vote-btn.up.active { color: var(--color-success); }
.vote-btn.down.active { color: var(--color-error); }
.vote-btn:disabled { cursor: default; opacity: 0.5; }
.vote-score {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.2;
}
.vote-score.positive { color: var(--color-success); }
.vote-score.negative { color: var(--color-error); }

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-meta {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.2rem;
}
.author { font-size: 0.8rem; color: var(--color-text-primary); }
.institution { font-size: 0.72rem; color: var(--color-text-faint); }
.rep {
  font-size: 0.7rem;
  color: var(--color-success);
  background: var(--color-proved-bg);
  padding: 0 0.3rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
}
.time { font-size: 0.72rem; color: var(--color-text-placeholder); }
.edited { font-size: 0.7rem; color: var(--color-text-placeholder); font-style: italic; }

.comment-body {
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--color-text-secondary);
  word-wrap: break-word;
}

.action-bar {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}
.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.72rem;
  color: var(--color-text-ghost);
  padding: 0;
  font-weight: 500;
}
.action-btn:hover { color: var(--color-text-tertiary); }
.action-btn.delete:hover { color: var(--color-error); }
.action-btn.flag:hover { color: var(--color-warning); }

.inline-form {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: var(--color-bg-surface-warm);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.flag-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.flag-select {
  font-size: 0.8rem;
  padding: 0.2rem 0.4rem;
  border: 1px solid var(--color-border-input);
  border-radius: 4px;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}

.comment-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 0.88rem;
  resize: vertical;
  box-sizing: border-box;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}
.comment-input:focus {
  outline: none;
  border-color: var(--color-link);
  box-shadow: var(--shadow-focus);
}
.comment-input.small {
  font-size: 0.82rem;
  padding: 0.35rem 0.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.35rem;
}
.char-count { font-size: 0.72rem; color: var(--color-text-placeholder); margin-right: auto; }
.char-count.warn { color: var(--color-error); }

.submit-btn {
  padding: 0.35rem 0.85rem;
  background: var(--color-btn-accent);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
}
.submit-btn:hover:not(:disabled) { background: var(--color-btn-accent-hover); }
.submit-btn:disabled { opacity: 0.5; cursor: default; }
.submit-btn.small { padding: 0.25rem 0.6rem; font-size: 0.78rem; }

.cancel-btn {
  padding: 0.25rem 0.6rem;
  background: none;
  border: 1px solid var(--color-border-input);
  border-radius: 5px;
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}
.cancel-btn:hover { background: var(--color-bg-hover); }

.error { color: var(--color-error); font-size: 0.8rem; margin: 0.35rem 0 0; }

.login-prompt {
  margin-top: 1rem;
  font-size: 0.88rem;
  color: var(--color-text-muted);
  padding: 0.75rem 1rem;
  background: var(--color-bg-surface-warm);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.login-prompt a { color: var(--color-link); font-weight: 500; }

.new-comment {
  margin-top: 1rem;
}
</style>

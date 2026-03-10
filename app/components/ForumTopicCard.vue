<template>
  <div class="topic-card" :class="{ pinned: topic.is_pinned, locked: topic.is_locked }">
    <div class="topic-score">
      <span class="score-val" :class="{ pos: topic.vote_score > 0, neg: topic.vote_score < 0 }">
        {{ topic.vote_score }}
      </span>
      <span class="score-label">votes</span>
    </div>
    <div class="topic-replies" :class="{ 'has-replies': topic.reply_count > 0 }">
      <span class="replies-val">{{ topic.reply_count }}</span>
      <span class="replies-label">replies</span>
    </div>
    <div class="topic-main">
      <div class="topic-title-row">
        <span v-if="topic.is_pinned" class="pin-badge" title="Pinned">P</span>
        <span v-if="topic.is_locked" class="lock-badge" title="Locked">L</span>
        <NuxtLink :to="`/forum/${categorySlug}/${topic.slug}`" class="topic-link">
          {{ topic.title }}
        </NuxtLink>
      </div>
      <div class="topic-meta">
        <span class="author">{{ topic.community_profiles?.display_name || topic.community_profiles?.handle || 'anonymous' }}</span>
        <span class="sep">&middot;</span>
        <span class="time">{{ timeAgo(topic.created_at) }}</span>
        <template v-if="topic.view_count">
          <span class="sep">&middot;</span>
          <span class="views">{{ topic.view_count }} views</span>
        </template>
        <template v-if="topic.related_type">
          <span class="sep">&middot;</span>
          <span class="cross-link">{{ topic.related_type }}: {{ topic.related_slug }}</span>
        </template>
      </div>
    </div>
    <div class="topic-activity">
      <span class="activity-time">{{ timeAgo(topic.last_activity_at) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  topic: any
  categorySlug: string
}>()

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
</script>

<style scoped>
.topic-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--color-border-faint);
  transition: background 0.1s;
}
.topic-card:hover {
  background: var(--color-bg-hover);
}
.topic-card.pinned {
  background: var(--color-bg-surface-warm);
}
.topic-score, .topic-replies {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 3rem;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  font-variant-numeric: tabular-nums;
}
.score-val, .replies-val {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--color-text-muted);
  line-height: 1.2;
}
.score-val.pos { color: var(--color-success); }
.score-val.neg { color: var(--color-error); }
.score-label, .replies-label {
  font-size: 0.62rem;
  color: var(--color-text-placeholder);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.topic-replies.has-replies {
  background: var(--color-proved-bg);
}
.topic-replies.has-replies .replies-val {
  color: var(--color-proved-fg);
}
.topic-main {
  flex: 1;
  min-width: 0;
}
.topic-title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.topic-link {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-primary);
  text-decoration: none;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.topic-link:hover {
  color: var(--color-link);
}
.pin-badge, .lock-badge {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.pin-badge {
  background: var(--color-marquee-bg);
  color: var(--color-marquee-fg);
}
.lock-badge {
  background: var(--color-pending-bg);
  color: var(--color-pending-fg);
}
.topic-meta {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: var(--color-text-faint);
}
.author { font-weight: 500; }
.sep { color: var(--color-text-placeholder); }
.cross-link {
  color: var(--color-link);
  font-style: italic;
}
.topic-activity {
  min-width: 4.5rem;
  text-align: right;
}
.activity-time {
  font-size: 0.72rem;
  color: var(--color-text-placeholder);
}
</style>

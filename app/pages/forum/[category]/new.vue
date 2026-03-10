<template>
  <div class="forum-page">
    <NavHeader />
    <main class="forum-container">
      <ForumBreadcrumb :category-slug="categorySlug" :category-name="categoryName" topic-title="New Topic" />

      <h1>New Topic</h1>

      <div v-if="!user" class="login-prompt">
        <NuxtLink to="/login">Sign in</NuxtLink> to create a topic.
      </div>

      <form v-else class="topic-form" @submit.prevent="submit">
        <div class="field">
          <label for="title">Title</label>
          <input
            id="title"
            v-model="title"
            type="text"
            placeholder="Topic title (5+ characters)"
            maxlength="255"
            required
          />
        </div>

        <div class="field">
          <label>Body</label>
          <ForumEditor v-model="body" :rows="12" />
        </div>

        <details class="cross-link-section">
          <summary>Cross-link to content (optional)</summary>
          <div class="cross-link-fields">
            <select v-model="relatedType">
              <option value="">None</option>
              <option value="wiki">Wiki page</option>
              <option value="test">Empirical test</option>
              <option value="theorem">Theorem</option>
              <option value="paper">Paper</option>
            </select>
            <input
              v-if="relatedType"
              v-model="relatedSlug"
              type="text"
              placeholder="Content slug (e.g. ces-emergence)"
            />
          </div>
        </details>

        <div class="form-actions">
          <NuxtLink :to="`/forum/${categorySlug}`" class="btn-cancel">Cancel</NuxtLink>
          <button
            type="submit"
            class="btn-submit"
            :disabled="submitting || title.trim().length < 5 || body.trim().length < 10"
          >
            {{ submitting ? 'Posting...' : 'Create Topic' }}
          </button>
        </div>

        <p v-if="error" class="error">{{ error }}</p>
      </form>
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { fetchCategories, createTopic } = useForum()

const categorySlug = computed(() => route.params.category as string)
const categoryName = ref('')
const categoryId = ref('')

const title = ref('')
const body = ref('')
const relatedType = ref('')
const relatedSlug = ref('')
const submitting = ref(false)
const error = ref('')

onMounted(async () => {
  try {
    const cats = await fetchCategories()
    const cat = cats.find((c: any) => c.slug === categorySlug.value)
    if (cat) {
      categoryName.value = cat.name
      categoryId.value = cat.id
    }
  } catch {}

  // Pre-fill cross-link from query params
  if (route.query.related_type) relatedType.value = route.query.related_type as string
  if (route.query.related_slug) relatedSlug.value = route.query.related_slug as string
})

async function submit() {
  if (!categoryId.value) {
    error.value = 'Category not found'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const data: any = {
      category_id: categoryId.value,
      title: title.value.trim(),
      body: body.value.trim(),
    }
    if (relatedType.value && relatedSlug.value) {
      data.related_type = relatedType.value
      data.related_slug = relatedSlug.value
    }
    const result = await createTopic(data) as any
    await router.push(`/forum/${categorySlug.value}/${result.topic.slug}`)
  } catch (e: any) {
    error.value = e.data?.error || e.message || 'Failed to create topic'
  } finally {
    submitting.value = false
  }
}

useHead({ title: 'New Topic — CES Formalization' })
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
h1 {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 1.25rem;
}
.login-prompt {
  font-size: 0.9rem;
  color: var(--color-text-muted);
  padding: 1rem;
  background: var(--color-bg-surface-warm);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}
.login-prompt a { color: var(--color-link); font-weight: 500; }
.topic-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.field label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-tertiary);
  margin-bottom: 0.3rem;
}
.field input[type="text"] {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: 0.9rem;
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  box-sizing: border-box;
}
.field input:focus {
  outline: none;
  border-color: var(--color-link);
  box-shadow: var(--shadow-focus);
}
.cross-link-section {
  font-size: 0.82rem;
  color: var(--color-text-faint);
}
.cross-link-section summary {
  cursor: pointer;
  user-select: none;
}
.cross-link-section summary:hover { color: var(--color-text-tertiary); }
.cross-link-fields {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.cross-link-fields select, .cross-link-fields input {
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  font-size: 0.82rem;
  font-family: var(--font-sans);
  background: var(--color-bg-page);
  color: var(--color-text-primary);
}
.cross-link-fields input { flex: 1; }
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.5rem;
}
.btn-cancel {
  padding: 0.4rem 0.85rem;
  background: none;
  border: 1px solid var(--color-border-input);
  border-radius: 5px;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  text-decoration: none;
  font-family: var(--font-sans);
}
.btn-cancel:hover { background: var(--color-bg-hover); }
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
.error {
  color: var(--color-error);
  font-size: 0.82rem;
  margin: 0;
}
</style>

export function useForum() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  async function getAuthHeaders() {
    const config = useRuntimeConfig()
    const { data: { session } } = await client.auth.getSession()
    if (!session) throw new Error('Not authenticated')
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': config.public.supabase.key,
    }
  }

  function getBaseUrl() {
    const config = useRuntimeConfig()
    return `${config.public.supabase.url}/functions/v1`
  }

  // ── Categories ────────────────────────────────────────────

  async function fetchCategories() {
    const { data, error } = await client
      .from('forum_categories')
      .select('*')
      .order('sort_order', { ascending: true })
    if (error) throw error

    // Get topic counts per category
    const categories = await Promise.all((data || []).map(async (cat: any) => {
      const { count } = await client
        .from('forum_topics')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)
        .eq('is_deleted', false)

      // Get latest topic
      const { data: latest } = await client
        .from('forum_topics')
        .select('title, slug, last_activity_at')
        .eq('category_id', cat.id)
        .eq('is_deleted', false)
        .order('last_activity_at', { ascending: false })
        .limit(1)

      return {
        ...cat,
        topic_count: count || 0,
        latest_topic: latest?.[0] || null,
      }
    }))

    return categories
  }

  // ── Topics ────────────────────────────────────────────────

  async function fetchTopics(
    categorySlug: string,
    opts: { sort?: 'newest' | 'top' | 'active'; page?: number; limit?: number } = {},
  ) {
    const { sort = 'active', page = 1, limit = 25 } = opts

    // Resolve category
    const { data: cat } = await client
      .from('forum_categories')
      .select('id')
      .eq('slug', categorySlug)
      .single()
    if (!cat) throw new Error('Category not found')

    let query = client
      .from('forum_topics')
      .select('*, community_profiles(handle, display_name)', { count: 'exact' })
      .eq('category_id', cat.id)
      .eq('is_deleted', false)

    if (sort === 'newest') query = query.order('created_at', { ascending: false })
    else if (sort === 'top') query = query.order('vote_score', { ascending: false })
    else query = query.order('is_pinned', { ascending: false }).order('last_activity_at', { ascending: false })

    query = query.range((page - 1) * limit, page * limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    return { topics: data || [], total: count || 0, page, limit }
  }

  async function fetchTopic(categorySlug: string, topicSlug: string) {
    const { data: topic, error } = await client
      .from('forum_topics')
      .select('*, community_profiles(handle, display_name), forum_categories(name, slug)')
      .eq('slug', topicSlug)
      .eq('is_deleted', false)
      .single()
    if (error) throw error

    // Increment view count (fire-and-forget)
    client
      .from('forum_topics')
      .update({ view_count: (topic.view_count || 0) + 1 })
      .eq('id', topic.id)
      .then(() => {})

    return topic
  }

  async function fetchPosts(topicId: string) {
    const { data, error } = await client
      .from('forum_posts')
      .select('*, community_profiles(handle, display_name)')
      .eq('topic_id', topicId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  }

  async function fetchMyVotes(targetType: 'topic' | 'post', targetIds: string[]) {
    if (!user.value || !targetIds.length) return {}
    const { data } = await client
      .from('forum_votes')
      .select('target_id, value')
      .eq('user_id', user.value.id)
      .eq('target_type', targetType)
      .in('target_id', targetIds)
    const map: Record<string, number> = {}
    for (const v of data || []) map[v.target_id] = v.value
    return map
  }

  // ── Writes (via Edge Functions) ───────────────────────────

  async function createTopic(data: {
    category_id: string
    title: string
    body: string
    related_type?: string
    related_slug?: string
  }) {
    const headers = await getAuthHeaders()
    return await $fetch(`${getBaseUrl()}/create-topic`, {
      method: 'POST',
      headers,
      body: data,
    })
  }

  async function createPost(data: {
    topic_id: string
    body: string
    parent_id?: string
  }) {
    const headers = await getAuthHeaders()
    return await $fetch(`${getBaseUrl()}/create-post`, {
      method: 'POST',
      headers,
      body: data,
    })
  }

  async function updateTopic(data: { topic_id: string; title?: string; body: string }) {
    const headers = await getAuthHeaders()
    return await $fetch(`${getBaseUrl()}/update-topic`, {
      method: 'POST',
      headers,
      body: data,
    })
  }

  async function updatePost(data: { post_id: string; body: string }) {
    const headers = await getAuthHeaders()
    return await $fetch(`${getBaseUrl()}/update-post`, {
      method: 'POST',
      headers,
      body: data,
    })
  }

  async function vote(targetType: 'topic' | 'post', targetId: string, value: 1 | -1 | 0) {
    const headers = await getAuthHeaders()
    return await $fetch(`${getBaseUrl()}/vote`, {
      method: 'POST',
      headers,
      body: { target_type: targetType, target_id: targetId, value },
    })
  }

  async function moderate(action: string, targetType: string, targetId: string) {
    const headers = await getAuthHeaders()
    return await $fetch(`${getBaseUrl()}/moderate-content`, {
      method: 'POST',
      headers,
      body: { action, target_type: targetType, target_id: targetId },
    })
  }

  // ── Cross-linking helper ──────────────────────────────────

  async function fetchRelatedTopics(relatedType: string, relatedSlug: string) {
    const { data, error } = await client
      .from('forum_topics')
      .select('id, title, slug, reply_count, vote_score, forum_categories(slug)')
      .eq('related_type', relatedType)
      .eq('related_slug', relatedSlug)
      .eq('is_deleted', false)
      .order('vote_score', { ascending: false })
      .limit(5)
    if (error) throw error
    return data || []
  }

  return {
    fetchCategories,
    fetchTopics,
    fetchTopic,
    fetchPosts,
    fetchMyVotes,
    fetchRelatedTopics,
    createTopic,
    createPost,
    updateTopic,
    updatePost,
    vote,
    moderate,
  }
}

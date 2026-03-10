export function useComments(contentType: string, contentSlug: string) {
  const client = useSupabaseClient()
  const user = useSupabaseUser()

  const comments = ref<any[]>([])
  const myVotes = ref<Record<string, number>>({})
  const loading = ref(false)

  async function fetchComments() {
    loading.value = true
    const { data } = await client
      .from('comments')
      .select('*, community_profiles!comments_user_id_profile_fkey(handle, display_name, institution, reputation)')
      .eq('content_type', contentType)
      .eq('content_slug', contentSlug)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })
    comments.value = data || []

    // Fetch user's votes on these comments
    if (user.value && comments.value.length) {
      const { data: votes } = await client
        .from('comment_votes')
        .select('comment_id, vote_value')
        .in('comment_id', comments.value.map(c => c.id))
      myVotes.value = {}
      for (const v of votes || []) {
        myVotes.value[v.comment_id] = v.vote_value
      }
    }
    loading.value = false
  }

  async function addComment(body: string, parentId?: string) {
    if (!user.value) return

    const config = useRuntimeConfig()
    const { data: { session } } = await client.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    await $fetch(`${config.public.supabase.url}/functions/v1/create-comment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': config.public.supabase.key,
      },
      body: {
        content_type: contentType,
        content_slug: contentSlug,
        parent_id: parentId,
        body,
      },
    })
    await fetchComments()
  }

  async function editComment(id: string, body: string) {
    const config = useRuntimeConfig()
    const { data: { session } } = await client.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    await $fetch(`${config.public.supabase.url}/functions/v1/update-comment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': config.public.supabase.key,
      },
      body: { comment_id: id, body },
    })
    await fetchComments()
  }

  async function deleteComment(id: string) {
    const { error } = await client
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) throw error
    await fetchComments()
  }

  async function vote(commentId: string, value: 1 | -1) {
    if (!user.value) return
    const existing = myVotes.value[commentId]

    if (existing === value) {
      // Toggle off
      await client
        .from('comment_votes')
        .delete()
        .eq('user_id', user.value.id)
        .eq('comment_id', commentId)
      delete myVotes.value[commentId]
    } else {
      if (existing) {
        await client
          .from('comment_votes')
          .delete()
          .eq('user_id', user.value.id)
          .eq('comment_id', commentId)
      }
      await client
        .from('comment_votes')
        .insert({ user_id: user.value.id, comment_id: commentId, vote_value: value })
      myVotes.value[commentId] = value
    }
    await fetchComments()
  }

  async function flag(commentId: string, reason: string, details?: string) {
    if (!user.value) return
    const row: any = {
      user_id: user.value.id,
      comment_id: commentId,
      reason,
    }
    if (details) row.details = details
    await client.from('comment_flags').insert(row)
  }

  async function ensureProfile() {
    if (!user.value) return null
    const { data } = await client
      .from('community_profiles')
      .select('*')
      .eq('user_id', user.value.id)
      .single()
    return data
  }

  async function updateProfile(displayName: string, institution?: string) {
    if (!user.value) return
    await client
      .from('community_profiles')
      .upsert({
        user_id: user.value.id,
        display_name: displayName,
        institution: institution || null,
      })
  }

  return {
    comments,
    myVotes,
    loading,
    fetchComments,
    addComment,
    editComment,
    deleteComment,
    vote,
    flag,
    ensureProfile,
    updateProfile,
  }
}

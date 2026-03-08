<template>
  <div class="container">
    <header>
      <h1>CES Formalization Project</h1>
      <div class="user-bar">
        <span>{{ user?.email }}</span>
        <button @click="handleLogout">Sign out</button>
      </div>
    </header>

    <main>
      <section class="card">
        <h2>Lean 4 Proofs</h2>
        <p>117 files, ~1,826 declarations, 3 axioms, ~29,000 lines</p>
        <ul>
          <li>Paper 1: Emergent CES &amp; Quadruple Role (14 files)</li>
          <li>Paper 2: CES Potential (11 files)</li>
          <li>Paper 3: Dynamics on CES Landscape (11 files)</li>
          <li>Paper 4: Hierarchical Architecture (10 files)</li>
          <li>Extensions: Macro, Two-World, ML (30+ files)</li>
        </ul>
      </section>

      <section class="card">
        <h2>Empirical Tests</h2>
        <p>88 test scripts, 75 result files, 184 figures</p>
      </section>

      <section class="card">
        <h2>Papers</h2>
        <p>9 papers + Papers A &amp; B (information geometry bridge)</p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const client = useSupabaseClient()

async function handleLogout() {
  await client.auth.signOut()
  navigateTo('/login')
}
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #eee;
}
header h1 { margin: 0; font-size: 1.4rem; }
.user-bar { display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; color: #666; }
.user-bar button {
  padding: 0.3rem 0.6rem;
  background: none;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
}
.user-bar button:hover { background: #f5f5f5; }
.card {
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
}
.card h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
.card p { margin: 0 0 0.5rem; color: #555; font-size: 0.9rem; }
.card ul { margin: 0.5rem 0 0; padding-left: 1.25rem; font-size: 0.9rem; color: #444; }
.card li { margin-bottom: 0.25rem; }
</style>

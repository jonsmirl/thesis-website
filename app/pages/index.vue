<template>
  <div>
    <NavHeader />
    <main class="container">
      <NuxtLink to="/theorems" class="card">
        <h2>Lean 4 Proofs</h2>
        <p>117 files, ~1,826 declarations, 3 axioms, ~29,000 lines</p>
        <ul>
          <li>Paper 1: Emergent CES &amp; Quadruple Role (14 files)</li>
          <li>Paper 2: CES Potential (11 files)</li>
          <li>Paper 3: Dynamics on CES Landscape (11 files)</li>
          <li>Paper 4: Hierarchical Architecture (10 files)</li>
          <li>Extensions: Macro, Two-World, ML (30+ files)</li>
        </ul>
      </NuxtLink>

      <NuxtLink to="/tests" class="card">
        <h2>Empirical Tests</h2>
        <p>88 test scripts, 75 result files, 184 figures</p>
      </NuxtLink>

      <NuxtLink to="/papers" class="card">
        <h2>Papers</h2>
        <p>9 papers + Papers A &amp; B (information geometry bridge)</p>
      </NuxtLink>
    </main>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.card {
  display: block;
  background: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;
}
.card:hover { border-color: #0066cc; }
.card h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
.card p { margin: 0 0 0.5rem; color: #555; font-size: 0.9rem; }
.card ul { margin: 0.5rem 0 0; padding-left: 1.25rem; font-size: 0.9rem; color: #444; }
.card li { margin-bottom: 0.25rem; }
</style>

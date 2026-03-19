<template>
  <div>
    <main class="container--narrow">
      <NuxtLink to="/wiki" class="card">
        <h2>Economics Wiki</h2>
        <p>Interactive knowledge base: CES curvature theory explained for economists, with 3D demos</p>
        <ul>
          <li>123 cross-linked articles across 12 categories</li>
          <li>Interactive WebGL demos (isoquants, regime diagrams, crisis sequences)</li>
          <li>No login required</li>
        </ul>
      </NuxtLink>

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
.card {
  display: block;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  padding: 1.25rem 1.5rem;
  margin-bottom: 1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s;
}
.card:hover { border-color: var(--color-link); }
.card h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
.card p { margin: 0 0 0.5rem; color: var(--color-text-tertiary); font-size: 0.9rem; }
.card ul { margin: 0.5rem 0 0; padding-left: 1.25rem; font-size: 0.9rem; color: var(--color-text-secondary); }
.card li { margin-bottom: 0.25rem; }
</style>

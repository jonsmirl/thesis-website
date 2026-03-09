<template>
  <div class="container">
    <NavHeader />

    <div class="breadcrumb">
      <NuxtLink to="/theorems">Theorems</NuxtLink> &rsaquo; Download
    </div>

    <h2>Download &amp; Build the Lean Proofs</h2>
    <p class="intro">
      The CESProofs library contains 1,923 declarations across 97 Lean 4 files
      with 0 sorry, 0 axioms beyond 3 justified classical results,
      and 99 key theorems covering CES production economics.
    </p>

    <section>
      <h3>Prerequisites</h3>
      <ul>
        <li><a href="https://leanprover.github.io/lean4/doc/setup.html" target="_blank">Lean 4</a> (v4.28.0+) via <code>elan</code></li>
        <li>Git</li>
        <li>~4 GB disk space (Mathlib cache)</li>
      </ul>
    </section>

    <section>
      <h3>1. Clone the repository</h3>
      <pre><code>git clone https://github.com/jonsmirl/CESProofs.git
cd CESProofs</code></pre>
    </section>

    <section>
      <h3>2. Fetch Mathlib cache</h3>
      <p>This downloads prebuilt <code>.olean</code> files so you don't need to rebuild Mathlib from source.</p>
      <pre><code>lake exe cache get</code></pre>
    </section>

    <section>
      <h3>3. Build</h3>
      <pre><code>lake build</code></pre>
      <p>Full build: ~2,328 jobs. Takes 10-20 minutes on first build depending on hardware.</p>
    </section>

    <section>
      <h3>4. Verify axiom usage</h3>
      <p>Check that any theorem uses only the 3 justified axioms:</p>
      <pre><code># In Lean REPL or a scratch file:
#print axioms CESProofs.Foundations.emergent_CES</code></pre>
    </section>

    <section>
      <h3>Library structure</h3>
      <p>Files are organized into 8 topic folders matching the derivation sections:</p>
      <table class="folder-table">
        <thead><tr><th>Folder</th><th>Files</th><th>Topics</th></tr></thead>
        <tbody>
          <tr><td><code>Foundations/</code></td><td>13</td><td>CES definition, emergence, Hessian, information geometry, estimation</td></tr>
          <tr><td><code>CurvatureRoles/</code></td><td>7</td><td>Superadditivity, correlation robustness, strategic, game theory, networks</td></tr>
          <tr><td><code>Potential/</code></td><td>14</td><td>CES potential, Tsallis, effective curvature, bilateral trade, firm scope</td></tr>
          <tr><td><code>Dynamics/</code></td><td>22</td><td>Business cycles, conservation laws, regime shifts, indicators, variance collapse</td></tr>
          <tr><td><code>Hierarchy/</code></td><td>16</td><td>Damping cancellation, spectral hierarchy, activation, institutional reform</td></tr>
          <tr><td><code>EntryExit/</code></td><td>7</td><td>Market structure, curvature in J, welfare, network entry</td></tr>
          <tr><td><code>Macro/</code></td><td>6</td><td>Two-factor CES, directed technical change, green transition, tax structure</td></tr>
          <tr><td><code>Applications/</code></td><td>11</td><td>AI transition, economics, inequality, social welfare, settlement</td></tr>
        </tbody>
      </table>
    </section>

    <section>
      <h3>Axioms</h3>
      <p>Only 3 axioms are used, all classical results with citations in docstrings:</p>
      <ul>
        <li><code>kolmogorov_nagumo</code> &mdash; Kolmogorov-Nagumo mean theorem (1930)</li>
        <li><code>aczel</code> &mdash; Acz&eacute;l functional equation theorem (1948)</li>
        <li><code>transition_duration_scaling</code> &mdash; Neishtadt GSPT scaling result</li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Download the Proofs' })
</script>

<style scoped>
h2 { margin: 0 0 0.5rem; }
h3 { margin: 1.5rem 0 0.5rem; font-size: 1.1rem; }
.intro { color: var(--color-text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem; }
section { margin-bottom: 0.5rem; }
p { font-size: 0.9rem; color: var(--color-text-secondary); line-height: 1.5; margin: 0.4rem 0; }
ul { font-size: 0.9rem; color: var(--color-text-secondary); line-height: 1.6; padding-left: 1.5rem; }
a { color: var(--color-link-alt); }
pre { background: var(--color-bg-code); border: 1px solid var(--color-border-medium); border-radius: var(--radius-md); padding: 0.75rem 1rem; overflow-x: auto; margin: 0.5rem 0; }
code { font-size: 0.85rem; }
p code, li code { background: var(--color-bg-inset); padding: 0.1rem 0.3rem; border-radius: var(--radius-sm); }
.folder-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 0.5rem 0; }
.folder-table th, .folder-table td { text-align: left; padding: 0.4rem 0.75rem; border-bottom: 1px solid var(--color-border-light); }
.folder-table th { background: var(--color-bg-code); font-weight: 600; }
.folder-table code { font-size: 0.85rem; }
</style>

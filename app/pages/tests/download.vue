<template>
  <div class="container">
    <NavHeader />

    <div class="breadcrumb">
      <NuxtLink to="/tests">Tests</NuxtLink> &rsaquo; Download
    </div>

    <h2>Download &amp; Run the Empirical Tests</h2>
    <p class="intro">
      All 284 empirical tests are fully reproducible from public data sources.
      The test suite downloads data from FRED, BEA, World Bank, OECD, Census,
      and other public APIs, then runs statistical tests against CES theory predictions.
    </p>

    <section>
      <h3>Prerequisites</h3>
      <ul>
        <li>Python 3.11+ with <code>pip</code></li>
        <li>Git</li>
        <li>Free API keys: <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank">FRED</a> and <a href="https://apps.bea.gov/API/signup/" target="_blank">BEA</a></li>
      </ul>
    </section>

    <section>
      <h3>1. Clone the repository</h3>
      <pre><code>git clone https://github.com/jonsmirl/thesis-tests.git
cd thesis-tests</code></pre>
    </section>

    <section>
      <h3>2. Set up the virtual environment</h3>
      <pre><code>python -m venv .venv
source .venv/bin/activate    # Linux/macOS
# .venv\Scripts\activate     # Windows

pip install -r requirements.txt</code></pre>
    </section>

    <section>
      <h3>3. Configure API keys</h3>
      <pre><code>cp .env.example .env
# Edit .env and fill in your API keys:
#   FRED_API_KEY=your_fred_key_here
#   BEA_API_KEY=your_bea_key_here</code></pre>
    </section>

    <section>
      <h3>4. Download all data</h3>
      <p>This fetches data from all public APIs and builds compiled datasets. Takes 5-15 minutes on first run.</p>
      <pre><code>python download_data.py --source all</code></pre>
      <p>To verify data without re-downloading:</p>
      <pre><code>python download_data.py --verify-only</code></pre>
    </section>

    <section>
      <h3>5. Run all tests</h3>
      <pre><code>python run_all.py</code></pre>
      <p>Results are saved to <code>results/scorecard.json</code>.</p>
    </section>

    <section>
      <h3>Running individual tests</h3>
      <pre><code># Run a single test
python run_all.py --test test_aggregation_puzzle

# Run all tests in a folder
python run_all.py --folder foundations

# Print last scorecard
python run_all.py --scorecard-only</code></pre>
    </section>

    <section>
      <h3>Data sources</h3>
      <p>The download script fetches from these public APIs:</p>
      <ul class="data-sources">
        <li><strong>FRED</strong> &mdash; ~100 series (CPI, IP manufacturing, macro aggregates, PPI, employment)</li>
        <li><strong>BEA</strong> &mdash; Regional GDP/compensation/GOS/employment, NIPA tables, I-O tables, Fixed Assets</li>
        <li><strong>World Bank</strong> &mdash; WDI indicators (GDP, trade, Gini, financial depth) and WGI governance</li>
        <li><strong>OECD STAN</strong> &mdash; Structural analysis database (25 sectors, 38 countries)</li>
        <li><strong>Census BDS</strong> &mdash; Business Dynamics Statistics (firm entry/exit by sector)</li>
        <li><strong>NBER-CES</strong> &mdash; Manufacturing industry database</li>
      </ul>
      <p>A small number of hand-compiled datasets (literature values, academic paper tables) are committed in <code>data/compiled/</code>.</p>
    </section>

    <section>
      <h3>Test structure</h3>
      <p>Tests are organized into 8 folders mirroring the Lean formalization:</p>
      <table class="folder-table">
        <thead><tr><th>Folder</th><th>Paper</th><th>Tests</th></tr></thead>
        <tbody>
          <tr><td><code>foundations/</code></td><td>Paper 1</td><td>CES emergence, correlation, estimation</td></tr>
          <tr><td><code>curvature_roles/</code></td><td>Paper 1</td><td>Auctions, natural gradient, phase transitions</td></tr>
          <tr><td><code>potential/</code></td><td>Paper 2</td><td>Akerlof, Arrow, H-O, Tsallis, institutions</td></tr>
          <tr><td><code>dynamics/</code></td><td>Paper 3</td><td>Business cycles, crises, Onsager, Minsky</td></tr>
          <tr><td><code>hierarchy/</code></td><td>Paper 4</td><td>Damping, dispersion, Leontief, EMD</td></tr>
          <tr><td><code>entry_exit/</code></td><td>Paper 6</td><td>Firm dynamics, diversity, variety</td></tr>
          <tr><td><code>macro/</code></td><td>Macro</td><td>Two-factor CES, growth, tax, Ramsey</td></tr>
          <tr><td><code>applications/</code></td><td>Papers 6-7</td><td>AI transition, stablecoins, trade</td></tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Download the Tests' })
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
.data-sources li { margin-bottom: 0.3rem; }
.folder-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin: 0.5rem 0; }
.folder-table th, .folder-table td { text-align: left; padding: 0.4rem 0.75rem; border-bottom: 1px solid var(--color-border-light); }
.folder-table th { background: var(--color-bg-code); font-weight: 600; }
.folder-table code { font-size: 0.85rem; }
</style>

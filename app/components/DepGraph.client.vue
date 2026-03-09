<template>
  <div class="dep-tree">
    <div class="tree-toolbar">
      <div class="toolbar-left">
        <div class="depth-control">
          <span class="depth-label">Depth</span>
          <div class="depth-buttons">
            <button
              v-for="d in [1, 2, 3]"
              :key="d"
              :class="{ active: depth === d }"
              @click="setDepth(d)"
            >{{ d }}</button>
          </div>
        </div>
      </div>
      <div class="toolbar-right" v-if="treeNodes.length">
        <span class="stat">{{ nodeCount }} declarations</span>
        <span class="stat-sep">&middot;</span>
        <span class="stat">{{ edgeCount }} dependencies</span>
      </div>
    </div>

    <div class="tree-viewport">
      <div v-if="loading" class="tree-loading">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>

      <div v-else-if="treeNodes.length" class="tree-content">
        <div
          v-for="node in treeNodes"
          :key="node.key"
          class="tree-row"
        >
          <span class="tree-guide" v-html="node.prefix"></span>
          <NuxtLink
            :to="`/theorems/${node.name}`"
            class="tree-node"
            :class="{ 'is-root': node.isRoot }"
          >
            <span class="node-dot" :class="`dot--${node.status}`"></span>
            <span class="node-name">{{ node.name }}</span>
            <span class="node-kind">{{ node.kind }}</span>
          </NuxtLink>
        </div>
      </div>

      <div v-else class="tree-empty">
        No dependencies found
      </div>
    </div>

    <div class="tree-legend" v-if="treeNodes.length">
      <div class="legend-item" v-for="(cfg, key) in usedStatuses" :key="key">
        <span class="legend-dot" :class="`dot--${key}`"></span>
        <span class="legend-label">{{ cfg.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ rootName: string }>()
const client = useSupabaseClient()

const depth = ref(2)
const loading = ref(true)

interface GNode { name: string; status: string; kind: string }
interface GEdge { from: string; to: string }
interface TreeNode {
  key: string
  name: string
  status: string
  kind: string
  isRoot: boolean
  prefix: string
}

const rawNodes = ref<Map<string, GNode>>(new Map())
const rawEdges = ref<GEdge[]>([])

const nodeCount = computed(() => rawNodes.value.size)
const edgeCount = computed(() => rawEdges.value.length)

const statusLabels: Record<string, { label: string }> = {
  proved:  { label: 'Proved' },
  axiom:   { label: 'Axiom' },
  trivial: { label: 'Trivial' },
  sorry:   { label: 'Sorry' },
}

async function fetchTree() {
  loading.value = true
  const { data, error } = await client.rpc('get_dep_tree', {
    root_name: props.rootName,
    max_depth: depth.value,
  })
  if (error || !data) { loading.value = false; return }

  const nodeMap = new Map<string, GNode>()
  const newEdges: GEdge[] = []
  const edgeSet = new Set<string>()
  for (const row of data as any[]) {
    if (row.type === 'node') {
      nodeMap.set(row.from_name, {
        name: row.from_name,
        status: row.status,
        kind: row.kind,
      })
    } else {
      const key = `${row.from_name}\u2192${row.to_name}`
      if (!edgeSet.has(key)) {
        edgeSet.add(key)
        newEdges.push({ from: row.from_name, to: row.to_name })
      }
    }
  }
  rawNodes.value = nodeMap
  rawEdges.value = newEdges
  loading.value = false
}

function setDepth(d: number) {
  depth.value = d
  fetchTree()
}

// Build adjacency: parent → sorted children
const childrenOf = computed(() => {
  const map = new Map<string, string[]>()
  for (const e of rawEdges.value) {
    if (!map.has(e.from)) map.set(e.from, [])
    map.get(e.from)!.push(e.to)
  }
  for (const arr of map.values()) arr.sort()
  return map
})

// Build tree rows with box-drawing prefixes
const treeNodes = computed<TreeNode[]>(() => {
  if (!rawNodes.value.has(props.rootName)) return []
  const result: TreeNode[] = []
  const visited = new Set<string>()

  function walk(name: string, prefix: string, isLast: boolean, isRoot: boolean) {
    const node = rawNodes.value.get(name)
    if (!node) return

    const alreadySeen = visited.has(name)
    visited.add(name)

    const connector = isRoot ? '' : (isLast ? '└─→&nbsp;' : '├─→&nbsp;')
    result.push({
      key: `${result.length}-${name}`,
      name: node.name,
      status: node.status,
      kind: node.kind,
      isRoot,
      prefix: prefix + connector,
    })

    if (alreadySeen) return

    const children = childrenOf.value.get(name) || []
    const childPrefix = isRoot ? '' : prefix + (isLast ? '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' : '│&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;')
    children.forEach((child, i) => {
      walk(child, childPrefix, i === children.length - 1, false)
    })
  }

  walk(props.rootName, '', true, true)
  return result
})

const usedStatuses = computed(() => {
  const used = new Set<string>()
  for (const n of rawNodes.value.values()) used.add(n.status)
  const result: Record<string, { label: string }> = {}
  for (const s of used) {
    if (statusLabels[s]) result[s] = statusLabels[s]
  }
  return result
})

onMounted(() => { fetchTree() })
</script>

<style scoped>
.dep-tree {
  border: 1px solid var(--color-border-heavy);
  border-radius: var(--radius-lg);
  background: var(--color-bg-page);
  overflow: hidden;
}

/* Toolbar */
.tree-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.9rem;
  background: var(--color-bg-toolbar);
  border-bottom: 1px solid var(--color-border-heavy);
}
.toolbar-left { display: flex; align-items: center; gap: 0.75rem; }
.toolbar-right { display: flex; align-items: center; gap: 0.4rem; }

.depth-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.depth-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.depth-buttons {
  display: flex;
  border: 1px solid var(--color-border-heavy);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.depth-buttons button {
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 500;
  border: none;
  border-right: 1px solid var(--color-border-heavy);
  background: var(--color-bg-page);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.depth-buttons button:last-child { border-right: none; }
.depth-buttons button:hover { background: var(--color-bg-hover); }
.depth-buttons button.active {
  background: var(--color-link);
  color: white;
}

.stat {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}
.stat-sep { color: var(--color-border-heavy); font-size: 0.65rem; }

/* Viewport */
.tree-viewport {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 520px;
  min-height: 60px;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border-heavy) transparent;
}

/* Loading */
.tree-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 2.5rem;
}
.loading-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--color-text-faint);
  animation: pulse-dot 1.2s ease-in-out infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1.1); }
}

/* Empty */
.tree-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-faint);
  font-size: 0.82rem;
  font-style: italic;
}

/* Tree content */
.tree-content {
  padding: 0.75rem 1rem;
}

.tree-row {
  display: flex;
  align-items: center;
  line-height: 1.7;
}

.tree-guide {
  white-space: pre;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text-faint);
  user-select: none;
}

.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  text-decoration: none;
  color: var(--color-text-primary);
  border-radius: var(--radius-sm);
  padding: 0.05rem 0.4rem 0.05rem 0.25rem;
  transition: background 0.12s ease;
}
.tree-node:hover {
  background: var(--color-bg-hover);
}
.tree-node.is-root {
  font-weight: 600;
}

.node-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--color-border-input);
}
.dot--proved { background: var(--color-proved-dot, #2da44e); }
.dot--axiom { background: var(--color-axiom-dot, #8250df); }
.dot--trivial { background: var(--color-trivial-dot, #0a7b8a); }
.dot--sorry { background: var(--color-sorry-dot, #b08800); }

.node-name {
  font-family: var(--font-mono);
  font-size: 0.82rem;
}

.node-kind {
  font-size: 0.68rem;
  color: var(--color-text-faint);
  font-style: italic;
}

/* Legend */
.tree-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.45rem 0.9rem;
  border-top: 1px solid var(--color-border-heavy);
  background: var(--color-bg-surface);
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.legend-label {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>

<template>
  <div class="dep-graph">
    <div class="graph-toolbar">
      <div class="toolbar-left">
        <div class="depth-control">
          <span class="depth-label">Traversal depth</span>
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
      <div class="toolbar-right" v-if="nodes.length">
        <span class="stat">{{ nodes.length }} declarations</span>
        <span class="stat-sep">&middot;</span>
        <span class="stat">{{ edges.length }} dependencies</span>
      </div>
    </div>

    <div class="graph-viewport" ref="viewport">
      <div v-if="loading" class="graph-loading">
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
        <div class="loading-dot"></div>
      </div>

      <svg
        v-else-if="renderedNodes.length"
        :width="svgW"
        :height="svgH"
        :viewBox="`0 0 ${svgW} ${svgH}`"
        class="graph-svg"
      >
        <!-- Grid lines for depth layers -->
        <line
          v-for="d in depthLayers"
          :key="'grid-'+d"
          :x1="0"
          :y1="d * LAYER_GAP + PAD"
          :x2="svgW"
          :y2="d * LAYER_GAP + PAD"
          stroke="#e8ecf0"
          stroke-width="1"
          stroke-dasharray="4 6"
          opacity="0.6"
        />

        <!-- Edge curves -->
        <g class="edges-layer">
          <path
            v-for="(e, i) in edgePaths"
            :key="'edge-'+i"
            :d="e.curve"
            fill="none"
            :stroke="e.color"
            stroke-width="1.5"
            :opacity="hovered && hovered !== e.from && hovered !== e.to ? 0.15 : 0.5"
            class="edge-line"
          />
        </g>

        <!-- Arrowheads as separate layer (on top of lines, below nodes) -->
        <g class="arrows-layer">
          <polygon
            v-for="(e, i) in edgePaths"
            :key="'arrow-'+i"
            :points="e.arrowPoints"
            :fill="e.color"
            :opacity="hovered && hovered !== e.from && hovered !== e.to ? 0.15 : 0.65"
          />
        </g>

        <!-- Node groups -->
        <g
          v-for="n in renderedNodes"
          :key="n.name"
          :transform="`translate(${n.x}, ${n.y})`"
          class="node-group"
          :class="{ dimmed: hovered && hovered !== n.name }"
          @mouseenter="hovered = n.name"
          @mouseleave="hovered = null"
          @click="navigateTo(n.name)"
        >
          <!-- Shadow -->
          <rect
            :width="n.w"
            :height="NODE_H"
            :x="-n.w / 2"
            :y="-NODE_H / 2 + 2"
            :rx="NODE_H / 2"
            fill="black"
            opacity="0.04"
          />
          <!-- Background pill -->
          <rect
            :width="n.w"
            :height="NODE_H"
            :x="-n.w / 2"
            :y="-NODE_H / 2"
            :rx="NODE_H / 2"
            :fill="statusConfig[n.status]?.bg || '#f5f5f5'"
            :stroke="n.name === rootName ? statusConfig[n.status]?.accent || '#333' : statusConfig[n.status]?.border || '#ddd'"
            :stroke-width="n.name === rootName ? 2 : 1"
          />
          <!-- Status dot -->
          <circle
            :cx="-n.w / 2 + 12"
            cy="0"
            r="3"
            :fill="statusConfig[n.status]?.accent || '#999'"
          />
          <!-- Label -->
          <text
            :x="1"
            y="0.5"
            text-anchor="middle"
            dominant-baseline="central"
            class="node-text"
            :fill="statusConfig[n.status]?.text || '#333'"
          >{{ n.name }}</text>
          <!-- Root indicator -->
          <text
            v-if="n.name === rootName"
            :x="n.w / 2 - 10"
            y="0.5"
            text-anchor="middle"
            dominant-baseline="central"
            class="root-marker"
            :fill="statusConfig[n.status]?.accent || '#333'"
          >&#x25C6;</text>
        </g>
      </svg>

      <div v-else-if="!loading" class="graph-empty">
        No dependencies found
      </div>
    </div>

    <!-- Legend -->
    <div class="graph-legend" v-if="renderedNodes.length">
      <div class="legend-item" v-for="(cfg, key) in statusConfig" :key="key">
        <span class="legend-dot" :style="{ background: cfg.accent }"></span>
        <span class="legend-label">{{ cfg.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ rootName: string }>()
const router = useRouter()
const client = useSupabaseClient()

const depth = ref(2)
const loading = ref(true)
const hovered = ref<string | null>(null)

interface GNode { name: string; status: string; kind: string; depth: number }
interface GEdge { from: string; to: string }
interface LayoutNode extends GNode { x: number; y: number; w: number }

const nodes = ref<GNode[]>([])
const edges = ref<GEdge[]>([])

const statusConfig: Record<string, { bg: string; border: string; accent: string; text: string; label: string }> = {
  proved:  { bg: '#f0faf3', border: '#c1e6cd', accent: '#2da44e', text: '#1a5c30', label: 'Proved' },
  axiom:   { bg: '#f5f0fa', border: '#d4c1e8', accent: '#8250df', text: '#512a85', label: 'Axiom' },
  trivial: { bg: '#eef8fa', border: '#b8dce4', accent: '#0a7b8a', text: '#065660', label: 'Trivial' },
  sorry:   { bg: '#fdf8ed', border: '#e8d5a0', accent: '#b08800', text: '#6e5600', label: 'Sorry' },
}

async function fetchTree() {
  loading.value = true
  const { data, error } = await client.rpc('get_dep_tree', {
    root_name: props.rootName,
    max_depth: depth.value,
  })
  if (error || !data) { loading.value = false; return }

  const newNodes: GNode[] = []
  const newEdges: GEdge[] = []
  for (const row of data as any[]) {
    if (row.type === 'node') {
      newNodes.push({ name: row.from_name, status: row.status, kind: row.kind, depth: row.depth })
    } else {
      newEdges.push({ from: row.from_name, to: row.to_name })
    }
  }
  nodes.value = newNodes
  edges.value = newEdges
  loading.value = false
}

function setDepth(d: number) {
  depth.value = d
  fetchTree()
}

// Layout constants
const NODE_H = 30
const LAYER_GAP = 72
const NODE_GAP = 18
const PAD = 50
const CHAR_W = 6.8
const ARROW_H = 7
const ARROW_W = 7

function calcNodeW(name: string) {
  // Extra space for status dot + padding
  return Math.max(100, name.length * CHAR_W + 40)
}

const depthLayers = computed(() => {
  if (!nodes.value.length) return []
  const maxD = Math.max(...nodes.value.map(n => n.depth))
  return Array.from({ length: maxD + 1 }, (_, i) => i)
})

const rawLayout = computed<LayoutNode[]>(() => {
  if (!nodes.value.length) return []

  const layers = new Map<number, GNode[]>()
  for (const n of nodes.value) {
    if (!layers.has(n.depth)) layers.set(n.depth, [])
    layers.get(n.depth)!.push(n)
  }
  for (const arr of layers.values()) arr.sort((a, b) => a.name.localeCompare(b.name))

  const result: LayoutNode[] = []
  for (const [d, layer] of [...layers.entries()].sort(([a], [b]) => a - b)) {
    const widths = layer.map(n => calcNodeW(n.name))
    const totalW = widths.reduce((s, w) => s + w, 0) + (layer.length - 1) * NODE_GAP
    let cx = -totalW / 2
    for (let i = 0; i < layer.length; i++) {
      const w = widths[i]
      result.push({ ...layer[i], x: cx + w / 2, y: d * LAYER_GAP, w })
      cx += w + NODE_GAP
    }
  }
  return result
})

const renderedNodes = computed<LayoutNode[]>(() => {
  if (!rawLayout.value.length) return []
  const minLeft = Math.min(...rawLayout.value.map(n => n.x - n.w / 2))
  const ox = -minLeft + PAD
  return rawLayout.value.map(n => ({ ...n, x: n.x + ox, y: n.y + PAD }))
})

const svgW = computed(() => {
  if (!renderedNodes.value.length) return 400
  const maxRight = Math.max(...renderedNodes.value.map(n => n.x + n.w / 2))
  return Math.max(400, maxRight + PAD)
})

const svgH = computed(() => {
  if (!nodes.value.length) return 120
  const maxD = Math.max(...nodes.value.map(n => n.depth))
  return (maxD + 1) * LAYER_GAP + PAD * 2
})

const edgePaths = computed(() => {
  const map = new Map<string, LayoutNode>()
  for (const n of renderedNodes.value) map.set(n.name, n)

  return edges.value.flatMap(e => {
    const from = map.get(e.from)
    const to = map.get(e.to)
    if (!from || !to) return []

    const x1 = from.x
    const y1 = from.y + NODE_H / 2
    const x2 = to.x
    const y2 = to.y - NODE_H / 2

    // Bezier: line ends at arrow base
    const arrowBaseY = y2 - ARROW_H
    const cy1 = y1 + (arrowBaseY - y1) * 0.4
    const cy2 = y1 + (arrowBaseY - y1) * 0.6
    const curve = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${arrowBaseY}`

    // Arrow polygon: tip at box edge, base where line ends
    const arrowPoints = `${x2},${y2} ${x2 - ARROW_W / 2},${arrowBaseY} ${x2 + ARROW_W / 2},${arrowBaseY}`

    // Color from source node status
    const color = statusConfig[from.status]?.accent || '#999'

    return [{ curve, arrowPoints, color, from: e.from, to: e.to }]
  })
})

function navigateTo(name: string) {
  router.push(`/theorems/${name}`)
}

onMounted(() => { fetchTree() })
</script>

<style scoped>
.dep-graph {
  border: 1px solid #d8dee4;
  border-radius: 10px;
  background: #fdfdfe;
  overflow: hidden;
}

/* Toolbar */
.graph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.9rem;
  background: linear-gradient(180deg, #f6f8fa 0%, #eff2f5 100%);
  border-bottom: 1px solid #d8dee4;
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
  color: #57606a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.depth-buttons {
  display: flex;
  border: 1px solid #d0d7de;
  border-radius: 6px;
  overflow: hidden;
}
.depth-buttons button {
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
  font-weight: 500;
  border: none;
  border-right: 1px solid #d0d7de;
  background: white;
  color: #57606a;
  cursor: pointer;
  transition: all 0.15s ease;
}
.depth-buttons button:last-child { border-right: none; }
.depth-buttons button:hover { background: #f3f4f6; }
.depth-buttons button.active {
  background: #0969da;
  color: white;
}

.stat {
  font-size: 0.72rem;
  color: #656d76;
  font-variant-numeric: tabular-nums;
}
.stat-sep { color: #d0d7de; font-size: 0.65rem; }

/* Viewport */
.graph-viewport {
  overflow-x: auto;
  overflow-y: auto;
  max-height: 480px;
  min-height: 100px;
  scrollbar-width: thin;
  scrollbar-color: #c8ccd0 transparent;
}
.graph-viewport::-webkit-scrollbar { height: 6px; width: 6px; }
.graph-viewport::-webkit-scrollbar-thumb { background: #c8ccd0; border-radius: 3px; }
.graph-viewport::-webkit-scrollbar-track { background: transparent; }

.graph-svg { display: block; }

/* Loading */
.graph-loading {
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
  background: #8b949e;
  animation: pulse-dot 1.2s ease-in-out infinite;
}
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.85); }
  40% { opacity: 1; transform: scale(1.1); }
}

/* Empty state */
.graph-empty {
  padding: 2rem;
  text-align: center;
  color: #8b949e;
  font-size: 0.82rem;
  font-style: italic;
}

/* Edges */
.edge-line {
  transition: opacity 0.2s ease;
}

/* Nodes */
.node-group {
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.node-group:hover rect:first-of-type { opacity: 0.08; }
.node-group:hover rect:nth-of-type(2) { filter: brightness(0.96); }
.node-group.dimmed { opacity: 0.3; }

.node-text {
  font-family: 'JetBrains Mono', 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 10.5px;
  font-weight: 450;
  pointer-events: none;
  letter-spacing: -0.01em;
}
.root-marker {
  font-size: 7px;
  pointer-events: none;
}

/* Legend */
.graph-legend {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.45rem 0.9rem;
  border-top: 1px solid #d8dee4;
  background: #f6f8fa;
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
  color: #656d76;
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>

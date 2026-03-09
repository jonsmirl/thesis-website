<template>
  <div class="dep-graph-wrap">
    <div class="graph-controls">
      <label>Depth:
        <select v-model.number="depth" @change="fetchTree">
          <option :value="1">1</option>
          <option :value="2">2</option>
          <option :value="3">3</option>
        </select>
      </label>
      <span class="graph-stats" v-if="nodes.length">{{ nodes.length }} nodes, {{ edges.length }} edges</span>
    </div>
    <div class="graph-scroll">
      <svg :width="svgW" :height="svgH" :viewBox="`0 0 ${svgW} ${svgH}`" class="dep-svg">
        <defs>
          <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 3 L 0 6 z" fill="#999" />
          </marker>
        </defs>
        <!-- Edges -->
        <path
          v-for="(e, i) in edgePaths"
          :key="'e'+i"
          :d="e.d"
          fill="none"
          stroke="#bbb"
          stroke-width="1.5"
          marker-end="url(#arrow)"
        />
        <!-- Nodes -->
        <g
          v-for="n in renderedNodes"
          :key="n.name"
          :transform="`translate(${n.x}, ${n.y})`"
          class="graph-node"
          @click="navigateTo(n.name)"
        >
          <rect
            :width="n.w"
            :height="28"
            :x="-n.w/2"
            y="-14"
            rx="4"
            :fill="nodeColor(n.status)"
            :stroke="n.name === rootName ? '#333' : nodeStroke(n.status)"
            :stroke-width="n.name === rootName ? 2 : 1"
          />
          <text
            text-anchor="middle"
            dominant-baseline="central"
            :font-size="n.w > 140 ? 10 : 9"
            :fill="textColor(n.status)"
            class="node-label"
          >{{ truncName(n.name) }}</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ rootName: string }>()
const router = useRouter()
const client = useSupabaseClient()

const depth = ref(2)

interface GNode { name: string; status: string; kind: string; depth: number }
interface GEdge { from: string; to: string }
interface LayoutNode extends GNode { x: number; y: number; w: number }

const nodes = ref<GNode[]>([])
const edges = ref<GEdge[]>([])

async function fetchTree() {
  const { data, error } = await client.rpc('get_dep_tree', {
    root_name: props.rootName,
    max_depth: depth.value,
  })
  if (error || !data) return

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
}

const NODE_W = 130
const NODE_H = 28
const LAYER_GAP = 60
const NODE_GAP = 16
const PAD = 40

// Layered layout: group by depth, space evenly
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
    const layerW = layer.length * (NODE_W + NODE_GAP) - NODE_GAP
    const startX = -layerW / 2 + NODE_W / 2
    for (let i = 0; i < layer.length; i++) {
      const n = layer[i]
      result.push({
        ...n,
        x: startX + i * (NODE_W + NODE_GAP),
        y: d * LAYER_GAP,
        w: Math.max(80, Math.min(160, n.name.length * 8 + 20)),
      })
    }
  }
  return result
})

// Offset to make all coords positive + add padding
const renderedNodes = computed<LayoutNode[]>(() => {
  if (!rawLayout.value.length) return []
  const minX = Math.min(...rawLayout.value.map(n => n.x))
  const ox = -minX + PAD
  return rawLayout.value.map(n => ({ ...n, x: n.x + ox, y: n.y + PAD }))
})

const svgW = computed(() => {
  if (!renderedNodes.value.length) return 400
  const xs = renderedNodes.value.map(n => n.x)
  return Math.max(400, Math.max(...xs) + NODE_W / 2 + PAD)
})

const svgH = computed(() => {
  if (!nodes.value.length) return 200
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
    const x1 = from.x, y1 = from.y + NODE_H / 2
    const x2 = to.x, y2 = to.y - NODE_H / 2
    const cy = (y1 + y2) / 2
    return [{ d: `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}` }]
  })
})

function nodeColor(s: string) {
  return s === 'proved' ? '#e6f4ea' : s === 'axiom' ? '#e8d5f5' : s === 'trivial' ? '#d1ecf1' : s === 'sorry' ? '#fff3cd' : '#f0f0f0'
}
function nodeStroke(s: string) {
  return s === 'proved' ? '#a3d9a5' : s === 'axiom' ? '#c4a5de' : s === 'trivial' ? '#a2d5db' : s === 'sorry' ? '#e6cf8a' : '#ddd'
}
function textColor(s: string) {
  return s === 'proved' ? '#1a7f37' : s === 'axiom' ? '#6f42c1' : s === 'trivial' ? '#0c5460' : s === 'sorry' ? '#856404' : '#333'
}
function truncName(name: string) { return name.length > 18 ? name.slice(0, 16) + '..' : name }
function navigateTo(name: string) { router.push(`/theorems/${name}`) }

onMounted(() => { fetchTree() })
</script>

<style scoped>
.dep-graph-wrap { border: 1px solid #e1e4e8; border-radius: 8px; background: #fafbfc; overflow: hidden; }
.graph-controls {
  display: flex; align-items: center; gap: 1rem;
  padding: 0.5rem 1rem; background: #f0f4f8; border-bottom: 1px solid #e1e4e8; font-size: 0.8rem;
}
.graph-controls label { display: flex; align-items: center; gap: 0.3rem; font-weight: 500; color: #555; }
.graph-controls select { padding: 0.15rem 0.3rem; border: 1px solid #ccc; border-radius: 3px; font-size: 0.8rem; }
.graph-stats { color: #888; font-size: 0.75rem; }
.graph-scroll { overflow-x: auto; overflow-y: auto; max-height: 500px; padding: 0.5rem; }
.dep-svg { display: block; margin: 0 auto; }
.graph-node { cursor: pointer; }
.graph-node:hover rect { filter: brightness(0.92); }
.node-label { font-family: 'SF Mono', 'Fira Code', monospace; pointer-events: none; }
</style>

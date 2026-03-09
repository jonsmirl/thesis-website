<template>
  <div class="dep-graph-wrap">
    <div class="graph-controls">
      <label>Depth:
        <select :value="depth" @input="onDepthChange">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
        </select>
      </label>
      <span class="graph-stats" v-if="nodes.length">{{ nodes.length }} nodes, {{ edges.length }} edges</span>
    </div>
    <div class="graph-scroll">
      <svg :width="svgW" :height="svgH" :viewBox="`0 0 ${svgW} ${svgH}`" class="dep-svg">
        <!-- Edges -->
        <template v-for="(e, i) in edgePaths" :key="'e'+i">
          <path :d="e.line" fill="none" stroke="#bbb" stroke-width="1.5" />
          <polygon :points="e.arrow" fill="#999" />
        </template>
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
            font-size="10"
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

const NODE_H = 28
const LAYER_GAP = 60
const NODE_GAP = 20
const PAD = 40
const CHAR_W = 7.2 // approximate monospace char width at font-size 10

function calcNodeW(name: string) {
  return Math.max(90, name.length * CHAR_W + 24)
}

// Layered layout: group by depth, space evenly using actual node widths
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
    // Calculate total width based on actual node widths
    const widths = layer.map(n => calcNodeW(n.name))
    const totalW = widths.reduce((s, w) => s + w, 0) + (layer.length - 1) * NODE_GAP
    let cx = -totalW / 2
    for (let i = 0; i < layer.length; i++) {
      const n = layer[i]
      const w = widths[i]
      result.push({
        ...n,
        x: cx + w / 2,
        y: d * LAYER_GAP,
        w,
      })
      cx += w + NODE_GAP
    }
  }
  return result
})

// Offset to make all coords positive + add padding (account for node half-widths)
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
  if (!nodes.value.length) return 200
  const maxD = Math.max(...nodes.value.map(n => n.depth))
  return (maxD + 1) * LAYER_GAP + PAD * 2
})

const ARROW_H = 8
const ARROW_W = 6

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
    // Line stops at the top of the arrowhead
    const lineEndY = y2 - ARROW_H
    const line = `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${lineEndY}`
    // Triangle: tip at box edge, base at line end
    const arrow = `${x2},${y2} ${x2 - ARROW_W / 2},${y2 - ARROW_H} ${x2 + ARROW_W / 2},${y2 - ARROW_H}`
    return [{ line, arrow }]
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
function truncName(name: string) { return name }
function navigateTo(name: string) { router.push(`/theorems/${name}`) }

function onDepthChange(e: Event) {
  depth.value = Number((e.target as HTMLSelectElement).value)
  fetchTree()
}

onMounted(() => { fetchTree() })
</script>

<style scoped>
.dep-graph-wrap { border: 1px solid #e1e4e8; border-radius: 8px; background: #fafbfc; }
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

<template>
  <div class="demo-wrap">
    <div class="controls">
      <button class="cycle-btn" @click="toggleCycle">
        {{ cycling ? 'Pause' : 'Run Business Cycle' }}
      </button>
      <span class="cycle-info" v-if="cycling">
        Phase: {{ cyclePhase }}
      </span>
    </div>
    <canvas ref="canvasRef" class="diagram-canvas" @mousemove="onHover" @mouseleave="tooltip = null"></canvas>
    <div class="tooltip" v-if="tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      <strong>{{ tooltip.title }}</strong>
      <p>{{ tooltip.desc }}</p>
    </div>
    <div class="legend-row">
      <span class="legend-item" style="color:#3b82f6">Complements</span>
      <span class="legend-item" style="color:#f59e0b">Substitutes</span>
      <span class="legend-item" style="color:#dc2626">T* boundary (collapse)</span>
      <span class="legend-item" style="color:#059669">Cobb-Douglas line</span>
      <template v-if="showTradeSchools">
        <span class="legend-item" style="color:#2563eb">HO / Gravity</span>
        <span class="legend-item" style="color:#d97706">Krugman / Melitz</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps<{ config?: Record<string, any> | null }>()
const showTradeSchools = computed(() => props.config?.tradeSchools === true)

const canvasRef = ref<HTMLCanvasElement | null>(null)
const tooltip = ref<{ x: number; y: number; title: string; desc: string } | null>(null)
const cycling = ref(false)
const cycleTime = ref(0)
let cycleFrame = 0

const cyclePhase = computed(() => {
  const t = cycleTime.value % 360
  if (t < 90) return 'Expansion (rho decreasing)'
  if (t < 180) return 'Approaching T* boundary'
  if (t < 270) return 'Crisis (curvature collapse)'
  return 'Recovery'
})

// Sectors positioned in (rho, T) space
const sectors = [
  { label: 'Semiconductors', rho: -0.8, T: 0.3, color: '#3b82f6' },
  { label: 'Auto Mfg', rho: -0.4, T: 0.5, color: '#6366f1' },
  { label: 'Finance', rho: -0.2, T: 0.8, color: '#8b5cf6' },
  { label: 'Retail', rho: 0.3, T: 0.4, color: '#f59e0b' },
  { label: 'Software', rho: 0.5, T: 0.3, color: '#ec4899' },
]

const W = 620
const H = 400
const pad = 55

function rhoToX(rho: number) { return pad + ((rho + 2) / 4) * (W - 2 * pad) }
function TToY(T: number) { return H - pad - (T / 5) * (H - 2 * pad) }
function xToRho(x: number) { return ((x - pad) / (W - 2 * pad)) * 4 - 2 }
function yToT(y: number) { return ((H - pad - y) / (H - 2 * pad)) * 5 }

function Tstar(rho: number) {
  const K = (1 - rho) * 4 / 5
  return K > 0.01 ? 1 / K : 100
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  canvas.width = W
  canvas.height = H

  ctx.fillStyle = '#f8f9fb'
  ctx.fillRect(0, 0, W, H)

  // Background regions (pixel-by-pixel coloring)
  for (let x = pad; x < W - pad; x += 2) {
    const rho = xToRho(x)
    const tStar = Tstar(rho)
    for (let y = pad; y < H - pad; y += 2) {
      const T = yToT(y)
      if (T > tStar) {
        ctx.fillStyle = 'rgba(220,38,38,0.06)'
      } else if (rho < -0.05) {
        ctx.fillStyle = 'rgba(59,130,246,0.06)'
      } else if (rho > 0.05) {
        ctx.fillStyle = 'rgba(245,158,11,0.06)'
      } else {
        ctx.fillStyle = 'rgba(5,150,105,0.12)'
      }
      ctx.fillRect(x, y, 2, 2)
    }
  }

  // Critical boundary T*(rho) — thick dashed red
  ctx.beginPath()
  ctx.strokeStyle = '#dc2626'
  ctx.lineWidth = 2.5
  ctx.setLineDash([8, 5])
  let started = false
  for (let x = pad; x < W - pad; x++) {
    const rho = xToRho(x)
    if (rho >= 0.95) continue
    const tS = Tstar(rho)
    if (tS > 5) continue
    const y = TToY(tS)
    if (!started) { ctx.moveTo(x, y); started = true }
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.setLineDash([])

  // Cobb-Douglas line
  ctx.beginPath()
  ctx.strokeStyle = '#059669'
  ctx.lineWidth = 2
  const cdX = rhoToX(0)
  ctx.moveTo(cdX, pad)
  ctx.lineTo(cdX, H - pad)
  ctx.stroke()

  // Axes
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(pad, H - pad)
  ctx.lineTo(W - pad, H - pad)
  ctx.moveTo(pad, H - pad)
  ctx.lineTo(pad, pad)
  ctx.stroke()

  // Axis labels + ticks
  ctx.fillStyle = '#333'
  ctx.font = '12px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('\u03C1 (substitution parameter)', W / 2, H - 8)
  for (const r of [-2, -1, 0, 1, 2]) {
    const x = rhoToX(r)
    ctx.fillText(String(r), x, H - pad + 18)
    ctx.beginPath()
    ctx.strokeStyle = '#999'
    ctx.moveTo(x, H - pad)
    ctx.lineTo(x, H - pad + 5)
    ctx.stroke()
  }

  ctx.save()
  ctx.translate(16, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('T (information friction)', 0, 0)
  ctx.restore()

  for (const t of [0, 1, 2, 3, 4, 5]) {
    const y = TToY(t)
    ctx.textAlign = 'right'
    ctx.fillText(String(t), pad - 8, y + 4)
  }

  // Region labels
  ctx.font = 'bold 12px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#3b82f680'
  ctx.fillText('Complements', rhoToX(-1.2), TToY(0.3))
  ctx.fillStyle = '#f59e0b80'
  ctx.fillText('Substitutes', rhoToX(0.8), TToY(0.3))
  ctx.fillStyle = '#dc262680'
  ctx.fillText('Collapsed', rhoToX(-0.5), TToY(3.5))

  // Trade school SLICES — only shown when config.tradeSchools is true
  if (showTradeSchools.value) {
  const schools = [
    { name: 'Heckscher-Ohlin', rhoMin: -2, rhoMax: -0.5, tMin: 0, tMax: 0.8, color: '#2563eb', desc: 'Factor endowments' },
    { name: 'Gravity', rhoMin: -1.5, rhoMax: -0.1, tMin: 0.6, tMax: 2.0, color: '#3b82f6', desc: 'Trade ~ size/distance' },
    { name: 'Krugman', rhoMin: 0.1, rhoMax: 1.5, tMin: 0, tMax: 1.2, color: '#d97706', desc: 'Increasing returns' },
    { name: 'Melitz', rhoMin: 0.05, rhoMax: 1.2, tMin: 1.0, tMax: 2.8, color: '#b45309', desc: 'Firm heterogeneity' },
  ]

  for (const s of schools) {
    const x1 = rhoToX(s.rhoMin)
    const x2 = rhoToX(s.rhoMax)
    const y1 = TToY(s.tMax) // tMax = higher T = higher on canvas (lower y)
    const y2 = TToY(s.tMin)

    // Filled slice region
    ctx.fillStyle = s.color + '12'
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1)

    // Dashed border
    ctx.strokeStyle = s.color + '60'
    ctx.lineWidth = 1.5
    ctx.setLineDash([5, 3])
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)
    ctx.setLineDash([])

    // Label with background pill
    const labelX = (x1 + x2) / 2
    const labelY = y1 + 14
    ctx.font = 'bold 10px -apple-system, sans-serif'
    const textW = ctx.measureText(s.name).width
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(labelX - textW / 2 - 4, labelY - 9, textW + 8, 13)
    ctx.fillStyle = s.color
    ctx.textAlign = 'center'
    ctx.fillText(s.name, labelX, labelY)

    // Subtitle
    ctx.font = 'italic 8px -apple-system, sans-serif'
    ctx.fillStyle = s.color + 'aa'
    ctx.fillText(s.desc, labelX, labelY + 11)
  }
  } // end if showTradeSchools

  // Sector dots
  for (const s of sectors) {
    const x = rhoToX(s.rho)
    const y = TToY(s.T)
    ctx.beginPath()
    ctx.arc(x, y, 5, 0, Math.PI * 2)
    ctx.fillStyle = s.color
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.font = '9px -apple-system, sans-serif'
    ctx.fillStyle = '#333'
    ctx.textAlign = 'left'
    ctx.fillText(s.label, x + 8, y + 3)
  }

  // Business cycle trajectory (if cycling)
  if (cycling.value || cycleTime.value > 0) {
    const t = cycleTime.value % 360
    const tRad = (t / 360) * Math.PI * 2

    // Minsky cycle: rho drifts left (more complementary) during boom,
    // then snaps right during crisis
    const cycleRho = -0.3 - 0.8 * Math.sin(tRad) * Math.max(0, Math.cos(tRad * 0.5))
    const cycleT = 0.5 + 1.5 * Math.max(0, Math.sin(tRad - 0.5))

    const cx = rhoToX(cycleRho)
    const cy = TToY(cycleT)

    // Trail
    ctx.beginPath()
    ctx.strokeStyle = '#ff660080'
    ctx.lineWidth = 2
    for (let tt = Math.max(0, t - 120); tt <= t; tt += 2) {
      const tr = (tt / 360) * Math.PI * 2
      const pr = -0.3 - 0.8 * Math.sin(tr) * Math.max(0, Math.cos(tr * 0.5))
      const pT = 0.5 + 1.5 * Math.max(0, Math.sin(tr - 0.5))
      const px = rhoToX(pr)
      const py = TToY(pT)
      if (tt === Math.max(0, t - 120)) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Current position
    ctx.beginPath()
    ctx.arc(cx, cy, 7, 0, Math.PI * 2)
    ctx.fillStyle = '#ff6600'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()
  }
}

function toggleCycle() {
  cycling.value = !cycling.value
}

function cycleStep() {
  if (!cycling.value) return
  cycleTime.value += 1
  draw()
  cycleFrame = requestAnimationFrame(cycleStep)
}

watch(cycling, (val) => {
  if (val) cycleStep()
  else cancelAnimationFrame(cycleFrame)
})

function onHover(e: MouseEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  const scaleX = W / rect.width
  const x = (e.clientX - rect.left) * scaleX
  const y = (e.clientY - rect.top) * (H / rect.height)
  const rho = xToRho(x)
  const T = yToT(y)

  if (rho < -2 || rho > 2 || T < 0 || T > 5) { tooltip.value = null; return }

  const tS = Tstar(rho)
  let title: string, desc: string
  if (T > tS) {
    title = 'Collapsed regime'
    desc = `T > T* = ${tS.toFixed(2)}. Effective curvature = 0. No complementarity benefits.`
  } else if (rho < -0.05) {
    title = 'Complement regime'
    desc = `\u03C1 = ${rho.toFixed(2)}, \u03C3 = ${(1/(1-rho)).toFixed(2)}. Factor endowment models (HO, gravity).`
  } else if (rho > 0.05) {
    title = 'Substitute regime'
    desc = `\u03C1 = ${rho.toFixed(2)}, \u03C3 = ${(1/(1-rho)).toFixed(2)}. Monopolistic competition (Krugman, Melitz).`
  } else {
    title = 'Cobb-Douglas boundary'
    desc = '\u03C1 \u2248 0, \u03C3 \u2248 1. Zero-curvature benchmark. Standard neoclassical models.'
  }

  tooltip.value = { x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 10, title, desc }
}

onMounted(() => { draw(); window.addEventListener('resize', draw) })
onUnmounted(() => { window.removeEventListener('resize', draw); cancelAnimationFrame(cycleFrame) })
</script>

<style scoped>
.demo-wrap { padding: 1rem; position: relative; }
.controls {
  display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
}
.cycle-btn {
  padding: 0.35rem 0.75rem; background: #0066cc; color: white;
  border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;
}
.cycle-btn:hover { background: #0052a3; }
.cycle-info { font-size: 0.8rem; color: #666; font-style: italic; }

.diagram-canvas {
  width: 100%; max-width: 620px; cursor: crosshair;
  display: block; margin: 0 auto;
}
.tooltip {
  position: absolute; background: white; border: 1px solid #ddd;
  border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.8rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); pointer-events: none;
  max-width: 260px; z-index: 5;
}
.tooltip strong { font-size: 0.85rem; }
.tooltip p { margin: 0.2rem 0 0; color: #555; }
.legend-row {
  display: flex; justify-content: center; gap: 1rem;
  margin-top: 0.5rem; font-size: 0.75rem; font-weight: 500;
  flex-wrap: wrap;
}
</style>

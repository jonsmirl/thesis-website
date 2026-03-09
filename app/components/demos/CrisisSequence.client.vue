<template>
  <div class="demo-wrap">
    <div class="controls">
      <label>
        <span class="label-text">Information friction <strong>T = {{ T.toFixed(2) }}</strong></span>
        <input type="range" v-model.number="T" min="0" :max="maxT" step="0.005" />
      </label>
      <button class="animate-btn" @click="toggleAnimate">
        {{ animating ? 'Pause' : 'Animate Crisis' }}
      </button>
      <button class="reset-btn" @click="T = 0">Reset</button>
    </div>
    <canvas ref="canvasRef" class="render-canvas"></canvas>
    <div class="phase-indicator">
      <div class="phase" :class="{ active: phase >= 1 }">
        <span class="phase-dot" style="background:#3b82f6"></span>
        <span>Phase 1: Correlation breaks</span>
      </div>
      <div class="phase-arrow" :class="{ active: phase >= 1 }">&rarr;</div>
      <div class="phase" :class="{ active: phase >= 2 }">
        <span class="phase-dot" style="background:#8b5cf6"></span>
        <span>Phase 2: Superadditivity fails</span>
      </div>
      <div class="phase-arrow" :class="{ active: phase >= 2 }">&rarr;</div>
      <div class="phase" :class="{ active: phase >= 3 }">
        <span class="phase-dot" style="background:#ef4444"></span>
        <span>Phase 3: Coordination collapses</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

defineProps<{ config?: Record<string, any> | null }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const rho = -0.5
const J = 5
const K = (1 - rho) * (J - 1) / J
const maxT = 1 / (K / J) * 1.05

const T = ref(0)
const animating = ref(false)
let animFrame = 0

const Keff = computed(() => Math.max(0, K * (1 - T.value * K)))

const phase = computed(() => {
  const k = Keff.value
  if (k * k < 0.01) {
    if (k < 0.01) {
      if (k / J < 0.002) return 3
      return 2
    }
    return 1
  }
  return 0
})

function toggleAnimate() {
  animating.value = !animating.value
}

function animateStep() {
  if (!animating.value) return
  T.value = Math.min(T.value + 0.002, maxT)
  if (T.value >= maxT) { animating.value = false; return }
  animFrame = requestAnimationFrame(animateStep)
}

watch(animating, (val) => {
  if (val) {
    if (T.value >= maxT * 0.95) T.value = 0
    animateStep()
  } else {
    cancelAnimationFrame(animFrame)
  }
})

// --- Canvas 2D with arrow field visualization ---
function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const W = 700
  const H = 350
  canvas.width = W
  canvas.height = H

  ctx.fillStyle = '#f8f9fb'
  ctx.fillRect(0, 0, W, H)

  const pad = 40
  const k = Keff.value

  // Three layers of arrows representing the three roles
  const layers = [
    { y: H - pad - 30, label: 'K/J (coordination)', value: k / J, maxVal: K / J, color: '#ef4444', role: 'coord' },
    { y: H / 2, label: 'K (superadditivity)', value: k, maxVal: K, color: '#8b5cf6', role: 'super' },
    { y: pad + 40, label: 'K\u00b2 (correlation robustness)', value: k * k, maxVal: K * K, color: '#3b82f6', role: 'corr' },
  ]

  // Draw layer labels and arrow grids
  for (const layer of layers) {
    const health = layer.maxVal > 0 ? layer.value / layer.maxVal : 0

    // Layer label
    ctx.font = 'bold 11px -apple-system, sans-serif'
    ctx.fillStyle = health > 0.05 ? layer.color : '#ccc'
    ctx.textAlign = 'left'
    ctx.fillText(layer.label, pad, layer.y - 25)

    // Value readout
    ctx.font = '10px SF Mono, Fira Code, monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = health > 0.05 ? '#333' : '#ccc'
    ctx.fillText(health > 0.01 ? layer.value.toFixed(4) : 'COLLAPSED', W - pad, layer.y - 25)

    // Arrow grid: 15 arrows across
    const nArrows = 15
    const arrowArea = W - 2 * pad
    for (let i = 0; i < nArrows; i++) {
      const x = pad + (i + 0.5) * (arrowArea / nArrows)

      // Arrow direction: flows right, with magnitude = health
      const arrowLen = health * 25
      if (arrowLen < 1) {
        // Dead: draw X
        ctx.strokeStyle = '#e5e5e5'
        ctx.lineWidth = 1
        const sz = 4
        ctx.beginPath()
        ctx.moveTo(x - sz, layer.y - sz)
        ctx.lineTo(x + sz, layer.y + sz)
        ctx.moveTo(x + sz, layer.y - sz)
        ctx.lineTo(x - sz, layer.y + sz)
        ctx.stroke()
        continue
      }

      // Slight wave pattern for visual interest
      const angle = Math.sin(i * 0.7 + T.value * 2) * 0.3 * (1 - health)
      const dx = Math.cos(angle) * arrowLen
      const dy = Math.sin(angle) * arrowLen

      // Arrow opacity proportional to health
      ctx.globalAlpha = 0.3 + 0.7 * health
      ctx.strokeStyle = layer.color
      ctx.fillStyle = layer.color
      ctx.lineWidth = Math.max(1, 2 * health)

      // Shaft
      ctx.beginPath()
      ctx.moveTo(x - dx / 2, layer.y - dy / 2)
      ctx.lineTo(x + dx / 2, layer.y + dy / 2)
      ctx.stroke()

      // Arrowhead
      const headLen = Math.max(3, 6 * health)
      const headAngle = Math.atan2(dy, dx)
      ctx.beginPath()
      ctx.moveTo(x + dx / 2, layer.y + dy / 2)
      ctx.lineTo(
        x + dx / 2 - headLen * Math.cos(headAngle - 0.4),
        layer.y + dy / 2 - headLen * Math.sin(headAngle - 0.4)
      )
      ctx.lineTo(
        x + dx / 2 - headLen * Math.cos(headAngle + 0.4),
        layer.y + dy / 2 - headLen * Math.sin(headAngle + 0.4)
      )
      ctx.closePath()
      ctx.fill()

      ctx.globalAlpha = 1
    }

    // Horizontal separator
    if (layer.role !== 'coord') {
      ctx.strokeStyle = '#e8e8e8'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(pad, layer.y + 30)
      ctx.lineTo(W - pad, layer.y + 30)
      ctx.stroke()
      ctx.setLineDash([])
    }
  }

  // T indicator bar at bottom
  const barY = H - 12
  const barW = W - 2 * pad
  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(pad, barY, barW, 6)
  const tPct = T.value / maxT
  const barColor = tPct < 0.4 ? '#059669' : tPct < 0.7 ? '#d97706' : '#dc2626'
  ctx.fillStyle = barColor
  ctx.fillRect(pad, barY, barW * tPct, 6)

  ctx.font = '10px -apple-system, sans-serif'
  ctx.fillStyle = '#888'
  ctx.textAlign = 'left'
  ctx.fillText('T = 0', pad, barY - 3)
  ctx.textAlign = 'right'
  ctx.fillText(`T* = ${(1/K).toFixed(2)}`, W - pad, barY - 3)
}

watch(T, () => draw())
onMounted(() => draw())
onUnmounted(() => cancelAnimationFrame(animFrame))
</script>

<style scoped>
.demo-wrap { padding: 1rem; }
.controls {
  display: flex; align-items: center; gap: 0.75rem;
  margin-bottom: 0.75rem; flex-wrap: wrap;
}
.controls label {
  display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem;
}
.label-text { min-width: 220px; }
.controls input[type="range"] { width: 200px; }
.animate-btn, .reset-btn {
  padding: 0.3rem 0.65rem; border: none; border-radius: 4px;
  cursor: pointer; font-size: 0.8rem; font-weight: 500;
}
.animate-btn { background: #0066cc; color: white; }
.animate-btn:hover { background: #0052a3; }
.reset-btn { background: #e5e5e5; color: #333; }
.reset-btn:hover { background: #d5d5d5; }

.render-canvas { width: 100%; max-width: 700px; display: block; margin: 0 auto; }

.phase-indicator {
  display: flex; align-items: center; justify-content: center;
  gap: 0.5rem; margin-top: 0.75rem; flex-wrap: wrap;
  padding: 0.5rem; background: #f0f0f0; border-radius: 6px;
}
.phase {
  display: flex; align-items: center; gap: 0.3rem;
  font-size: 0.78rem; color: #bbb; transition: color 0.3s;
}
.phase.active { color: #111; font-weight: 600; }
.phase-dot { width: 8px; height: 8px; border-radius: 50%; opacity: 0.3; transition: opacity 0.3s; }
.phase.active .phase-dot { opacity: 1; }
.phase-arrow { color: #ccc; font-size: 0.9rem; transition: color 0.3s; }
.phase-arrow.active { color: #666; }
</style>

<template>
  <div class="demo-wrap">
    <div class="controls">
      <button class="minsky-btn" @click="toggleMinsky">
        {{ minskyRunning ? 'Pause' : 'Run Minsky Cycle' }}
      </button>
      <span class="minsky-info" v-if="minskyRunning || minskyTime > 0">
        {{ minskyPhase }}
      </span>
    </div>
    <canvas ref="canvasRef" class="curve-canvas" @mousemove="onHover" @mouseleave="hovered = null"></canvas>
    <div class="tooltip" v-if="hovered" :style="{ left: hovered.px + 12 + 'px', top: hovered.py - 10 + 'px' }">
      <strong>{{ hovered.label }}</strong>
      <p>&rho; = {{ hovered.rho.toFixed(2) }}, &sigma; = {{ hovered.sigma.toFixed(2) }}</p>
      <p>Efficiency: {{ hovered.eff.toFixed(3) }}</p>
      <p>Fragility tolerance T* = {{ hovered.tstar.toFixed(2) }}</p>
    </div>
    <div class="insight">
      <strong>The law:</strong> Efficiency and robustness are algebraically locked.
      Moving along the curve trades one for the other. No policy can move you off the curve.
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'

defineProps<{ config?: Record<string, any> | null }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const hovered = ref<{ px: number; py: number; label: string; rho: number; sigma: number; eff: number; tstar: number } | null>(null)
const minskyRunning = ref(false)
const minskyTime = ref(0)
let minskyFrame = 0

const minskyPhase = computed(() => {
  const t = minskyTime.value % 300
  if (t < 150) return 'Boom: drifting toward efficiency (more fragile)...'
  if (t < 200) return 'CRISIS: snapping back to safety!'
  return 'Recovery: settling at moderate position'
})

const sectors = [
  { label: 'Semiconductors', rho: -0.8, color: '#3b82f6' },
  { label: 'Auto Manufacturing', rho: -0.4, color: '#6366f1' },
  { label: 'Chemicals', rho: -0.15, color: '#06b6d4' },
  { label: 'Food Processing', rho: 0.05, color: '#ef4444' },
  { label: 'Financial Services', rho: 0.15, color: '#10b981' },
  { label: 'Retail Trade', rho: 0.3, color: '#f59e0b' },
  { label: 'Textiles', rho: 0.5, color: '#ec4899' },
  { label: 'Software', rho: 0.6, color: '#7c3aed' },
]

const W = 620
const H = 380
const pad = 55
const J = 5

function efficiency(rho: number) {
  const K = (1 - rho) * (J - 1) / J
  return 1 + K * 0.35
}

function Tstar(rho: number) {
  const K = (1 - rho) * (J - 1) / J
  return K > 0.01 ? 1 / K : 20
}

function effToY(eff: number) {
  const eMin = 0.85, eMax = 2.0
  return H - pad - ((eff - eMin) / (eMax - eMin)) * (H - 2 * pad)
}
function tstarToX(ts: number) {
  return pad + (ts / 5.5) * (W - 2 * pad)
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  canvas.width = W
  canvas.height = H

  ctx.fillStyle = '#f8f9fb'
  ctx.fillRect(0, 0, W, H)

  // Shade the "impossible" region above the curve
  ctx.beginPath()
  ctx.moveTo(pad, pad)
  for (let i = 0; i <= 300; i++) {
    const rho = -2 + (i / 300) * 3.5
    const ts = Tstar(rho)
    const eff = efficiency(rho)
    if (ts > 5.5 || ts < 0) continue
    ctx.lineTo(tstarToX(ts), effToY(eff))
  }
  ctx.lineTo(W - pad, pad)
  ctx.lineTo(pad, pad)
  ctx.closePath()
  ctx.fillStyle = 'rgba(220,38,38,0.04)'
  ctx.fill()

  // "Impossible" label
  ctx.font = 'italic 11px -apple-system, sans-serif'
  ctx.fillStyle = '#dc262640'
  ctx.textAlign = 'center'
  ctx.fillText('Impossible region', W / 2, pad + 30)
  ctx.fillText('(no technology achieves this)', W / 2, pad + 44)

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
  ctx.fillText('Fragility tolerance T* (higher = more robust)', W / 2, H - 8)
  for (let t = 0; t <= 5; t++) {
    const x = tstarToX(t)
    ctx.fillText(String(t), x, H - pad + 18)
  }

  ctx.save()
  ctx.translate(16, H / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('Efficiency (1 + superadditivity gap)', 0, 0)
  ctx.restore()

  for (let e = 1.0; e <= 2.0; e += 0.2) {
    const y = effToY(e)
    ctx.textAlign = 'right'
    ctx.fillText(e.toFixed(1), pad - 8, y + 4)
  }

  // The tradeoff curve (thick, prominent)
  ctx.beginPath()
  ctx.strokeStyle = '#0066cc'
  ctx.lineWidth = 3
  let curveStarted = false
  for (let i = 0; i <= 400; i++) {
    const rho = -2.5 + (i / 400) * 4.0
    const ts = Tstar(rho)
    const eff = efficiency(rho)
    if (ts > 5.5 || ts < 0) continue
    const x = tstarToX(ts)
    const y = effToY(eff)
    if (!curveStarted) { ctx.moveTo(x, y); curveStarted = true }
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Sector dots with labels
  for (const s of sectors) {
    const ts = Tstar(s.rho)
    const eff = efficiency(s.rho)
    const x = tstarToX(ts)
    const y = effToY(eff)

    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = s.color
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#333'
    ctx.font = '9px -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(s.label, x + 9, y + 3)
  }

  // Minsky cycle animation
  if (minskyTime.value > 0) {
    const t = minskyTime.value % 300

    // Boom: rho drifts left (more complementary = more efficient = more fragile)
    // Crisis: snaps back right
    let cycleRho: number
    if (t < 150) {
      cycleRho = -0.2 - (t / 150) * 0.8 // drift left
    } else if (t < 200) {
      const crisisT = (t - 150) / 50
      cycleRho = -1.0 + crisisT * 0.8 // snap right
    } else {
      cycleRho = -0.2
    }

    const ts = Tstar(cycleRho)
    const eff = efficiency(cycleRho)
    const cx = tstarToX(ts)
    const cy = effToY(eff)

    // Trail
    ctx.beginPath()
    ctx.strokeStyle = '#ff660060'
    ctx.lineWidth = 2
    for (let tt = Math.max(0, t - 60); tt <= t; tt += 1) {
      let pr: number
      if (tt < 150) pr = -0.2 - (tt / 150) * 0.8
      else if (tt < 200) pr = -1.0 + ((tt - 150) / 50) * 0.8
      else pr = -0.2
      const pts2 = Tstar(pr)
      const pe = efficiency(pr)
      const px = tstarToX(pts2)
      const py = effToY(pe)
      if (tt === Math.max(0, t - 60)) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // Current dot
    ctx.beginPath()
    ctx.arc(cx, cy, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#ff6600'
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.stroke()

    // Direction arrow
    if (t < 150) {
      ctx.font = '10px -apple-system, sans-serif'
      ctx.fillStyle = '#ff6600'
      ctx.textAlign = 'center'
      ctx.fillText('\u2190 drifting toward efficiency', cx, cy - 14)
    } else if (t < 200) {
      ctx.font = 'bold 11px -apple-system, sans-serif'
      ctx.fillStyle = '#dc2626'
      ctx.textAlign = 'center'
      ctx.fillText('CRISIS! \u2192', cx, cy - 14)
    }
  }
}

function toggleMinsky() {
  minskyRunning.value = !minskyRunning.value
}

function minskyStep() {
  if (!minskyRunning.value) return
  minskyTime.value += 1
  draw()
  minskyFrame = requestAnimationFrame(minskyStep)
}

watch(minskyRunning, (val) => {
  if (val) minskyStep()
  else cancelAnimationFrame(minskyFrame)
})

function onHover(e: MouseEvent) {
  const rect = canvasRef.value!.getBoundingClientRect()
  const mx = (e.clientX - rect.left) * (W / rect.width)
  const my = (e.clientY - rect.top) * (H / rect.height)

  let closest: typeof sectors[0] | null = null
  let minDist = 30
  for (const s of sectors) {
    const ts = Tstar(s.rho)
    const eff = efficiency(s.rho)
    const sx = tstarToX(ts)
    const sy = effToY(eff)
    const d = Math.sqrt((mx - sx) ** 2 + (my - sy) ** 2)
    if (d < minDist) { minDist = d; closest = s }
  }

  if (closest) {
    hovered.value = {
      px: e.clientX - rect.left,
      py: e.clientY - rect.top,
      label: closest.label,
      rho: closest.rho,
      sigma: 1 / (1 - closest.rho),
      eff: efficiency(closest.rho),
      tstar: Tstar(closest.rho),
    }
  } else {
    hovered.value = null
  }
}

onMounted(() => { draw(); window.addEventListener('resize', draw) })
onUnmounted(() => { window.removeEventListener('resize', draw); cancelAnimationFrame(minskyFrame) })
</script>

<style scoped>
.demo-wrap { padding: 1rem; position: relative; }
.controls {
  display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
}
.minsky-btn {
  padding: 0.35rem 0.75rem; background: #d97706; color: white;
  border: none; border-radius: 4px; cursor: pointer; font-size: 0.8rem;
}
.minsky-btn:hover { background: #b45309; }
.minsky-info { font-size: 0.8rem; color: #666; font-style: italic; }
.curve-canvas {
  width: 100%; max-width: 620px; cursor: crosshair;
  display: block; margin: 0 auto;
}
.tooltip {
  position: absolute; background: white; border: 1px solid #ddd;
  border-radius: 6px; padding: 0.5rem 0.75rem; font-size: 0.8rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1); pointer-events: none; z-index: 5;
}
.tooltip strong { font-size: 0.85rem; }
.tooltip p { margin: 0.15rem 0 0; color: #555; }
.insight {
  margin-top: 0.5rem; padding: 0.5rem 0.75rem;
  background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px;
  font-size: 0.8rem; color: #92400e; text-align: center;
}
</style>

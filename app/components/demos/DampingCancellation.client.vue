<template>
  <div class="demo-wrap">
    <div class="controls">
      <label>
        <span class="label-text">Regulation intensity <strong>&sigma; = {{ sigma.toFixed(2) }}</strong></span>
        <input type="range" v-model.number="sigma" min="0.2" max="3" step="0.05" />
      </label>
    </div>

    <canvas ref="canvasRef" class="render-canvas"></canvas>

    <div class="punchline" :class="{ emphasized: sigma > 1.5 }">
      <div class="punch-row">
        <span class="punch-label">Speed gain</span>
        <span class="punch-val green">+{{ speedGain.toFixed(1) }}%</span>
        <span class="punch-times">&times;</span>
        <span class="punch-label">Output loss</span>
        <span class="punch-val red">&minus;{{ outputLoss.toFixed(1) }}%</span>
        <span class="punch-eq">=</span>
        <span class="punch-label">Net welfare</span>
        <span class="punch-val zero">0</span>
      </div>
      <p class="punch-note">To improve level n, reform level n&minus;1 (upstream reform principle)</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'

defineProps<{ config?: Record<string, any> | null }>()

const sigma = ref(1.0)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const speedGain = computed(() => (sigma.value - 1) * 80)
const outputLoss = computed(() => (1 - 1 / sigma.value) * 80 * sigma.value / (sigma.value))

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const W = 700
  const H = 340
  canvas.width = W
  canvas.height = H

  ctx.fillStyle = '#f8f9fb'
  ctx.fillRect(0, 0, W, H)

  const s = sigma.value
  const nLevels = 4
  const levelLabels = ['Infrastructure', 'Industry', 'Firms', 'Markets']
  const levelColors = ['#3b82f6', '#8b5cf6', '#d97706', '#059669']
  const levelH = 60
  const startY = 30
  const leftCol = 50   // hierarchy
  const midCol = 280   // speed gauge
  const rightCol = 490  // output gauge

  // Column headers
  ctx.font = 'bold 11px -apple-system, sans-serif'
  ctx.fillStyle = '#555'
  ctx.textAlign = 'center'
  ctx.fillText('Hierarchy', leftCol + 60, 20)
  ctx.fillText('Convergence Speed', midCol + 70, 20)
  ctx.fillText('Equilibrium Output', rightCol + 70, 20)

  for (let i = 0; i < nLevels; i++) {
    const y = startY + i * levelH + 20

    // Level box
    ctx.fillStyle = levelColors[i] + '18'
    ctx.strokeStyle = levelColors[i]
    ctx.lineWidth = 2
    const boxW = 130, boxH = 36
    ctx.beginPath()
    ctx.roundRect(leftCol, y, boxW, boxH, 6)
    ctx.fill()
    ctx.stroke()

    ctx.font = '12px -apple-system, sans-serif'
    ctx.fillStyle = levelColors[i]
    ctx.textAlign = 'center'
    ctx.fillText(levelLabels[i], leftCol + boxW / 2, y + 22)

    // Connecting arrow (except last)
    if (i < nLevels - 1) {
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(leftCol + boxW / 2, y + boxH)
      ctx.lineTo(leftCol + boxW / 2, y + levelH + 20)
      ctx.stroke()
      // Arrowhead
      const ay = y + levelH + 20
      ctx.fillStyle = '#ccc'
      ctx.beginPath()
      ctx.moveTo(leftCol + boxW / 2, ay)
      ctx.lineTo(leftCol + boxW / 2 - 4, ay - 6)
      ctx.lineTo(leftCol + boxW / 2 + 4, ay - 6)
      ctx.closePath()
      ctx.fill()
    }

    // Speed gauge (increases with sigma)
    const gaugeW = 120
    const gaugeH = 14
    const speedPct = Math.min((s / 3) * 100, 100)
    const gx = midCol + 10
    const gy = y + 11

    ctx.fillStyle = '#e8e8e8'
    ctx.beginPath()
    ctx.roundRect(gx, gy, gaugeW, gaugeH, 4)
    ctx.fill()
    ctx.fillStyle = '#059669'
    ctx.beginPath()
    ctx.roundRect(gx, gy, gaugeW * speedPct / 100, gaugeH, 4)
    ctx.fill()

    ctx.font = '10px SF Mono, monospace'
    ctx.fillStyle = '#333'
    ctx.textAlign = 'left'
    ctx.fillText((s * 0.8).toFixed(2), gx + gaugeW + 8, gy + 11)

    // Output gauge (decreases with sigma)
    const outputPct = Math.min((1 / s) * 100, 100)
    const ox = rightCol + 10
    ctx.fillStyle = '#e8e8e8'
    ctx.beginPath()
    ctx.roundRect(ox, gy, gaugeW, gaugeH, 4)
    ctx.fill()
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.roundRect(ox, gy, gaugeW * outputPct / 100, gaugeH, 4)
    ctx.fill()

    ctx.fillStyle = '#333'
    ctx.textAlign = 'left'
    ctx.fillText((2 / (1 + 0.5 * s)).toFixed(2), ox + gaugeW + 8, gy + 11)
  }

  // Welfare line at bottom
  const welfareY = startY + nLevels * levelH + 10
  ctx.strokeStyle = '#059669'
  ctx.lineWidth = 3
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.moveTo(midCol, welfareY)
  ctx.lineTo(rightCol + 140, welfareY)
  ctx.stroke()

  ctx.font = 'bold 12px -apple-system, sans-serif'
  ctx.fillStyle = '#059669'
  ctx.textAlign = 'center'
  ctx.fillText('Net welfare = constant (flat line)', (midCol + rightCol + 140) / 2, welfareY + 18)
}

watch(sigma, () => draw())
onMounted(() => draw())
</script>

<style scoped>
.demo-wrap { padding: 1rem; }
.controls { margin-bottom: 0.75rem; }
.controls label {
  display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem;
}
.label-text { min-width: 260px; }
.controls input[type="range"] { flex: 1; max-width: 250px; }

.render-canvas { width: 100%; max-width: 700px; display: block; margin: 0 auto; }

.punchline {
  margin-top: 0.75rem; padding: 0.6rem 1rem;
  background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;
  text-align: center; transition: transform 0.3s;
}
.punchline.emphasized { transform: scale(1.02); }
.punch-row {
  display: flex; align-items: center; justify-content: center;
  gap: 0.5rem; flex-wrap: wrap;
}
.punch-label { font-size: 0.8rem; color: #555; }
.punch-val { font-size: 1rem; font-weight: 700; font-family: 'SF Mono', monospace; }
.punch-val.green { color: #059669; }
.punch-val.red { color: #dc2626; }
.punch-val.zero { color: #059669; font-size: 1.2rem; }
.punch-times, .punch-eq { font-size: 1rem; color: #888; font-weight: 300; }
.punch-note { font-size: 0.78rem; color: #666; margin: 0.4rem 0 0; }
</style>

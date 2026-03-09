<template>
  <div class="demo-wrap">
    <div class="controls">
      <label>
        <span class="label-text">Information friction <strong>T = {{ T.toFixed(2) }}</strong></span>
        <input type="range" v-model.number="T" :min="0" :max="Tstar * 1.3" :step="0.01" />
      </label>
      <label>
        <span class="label-text">Curvature <strong>rho = {{ rho.toFixed(2) }}</strong></span>
        <input type="range" v-model.number="rho" min="-1.5" max="0.8" step="0.05" />
      </label>
    </div>
    <div class="health-bar">
      <div class="health-label">Effective curvature K<sub>eff</sub></div>
      <div class="health-track">
        <div class="health-fill" :style="{ width: healthPct + '%', background: healthColor }"></div>
      </div>
      <div class="health-value" :style="{ color: healthColor }">
        {{ Keff > 0.001 ? Keff.toFixed(3) : 'COLLAPSED' }}
      </div>
    </div>
    <canvas ref="canvasRef" class="render-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

defineProps<{ config?: Record<string, any> | null }>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const rho = ref(-0.5)
const T = ref(0)
const J = 5

const K = computed(() => (1 - rho.value) * (J - 1) / J)
const Tstar = computed(() => K.value > 0 ? 1 / K.value : 10)
const Keff = computed(() => Math.max(0, K.value * (1 - T.value / Tstar.value)))
const healthPct = computed(() => K.value > 0 ? Math.max(0, (Keff.value / K.value) * 100) : 0)
const healthColor = computed(() => {
  const h = healthPct.value / 100
  if (h > 0.6) return '#059669'
  if (h > 0.3) return '#d97706'
  return '#dc2626'
})

let renderer: THREE.WebGLRenderer | null = null
let animId = 0

onMounted(() => {
  const canvas = canvasRef.value!
  const w = canvas.parentElement!.clientWidth
  const h = 420

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf8f9fb)
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100)
  camera.position.set(3.5, 3, 3.5)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.6

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9)
  dirLight.position.set(4, 6, 4)
  scene.add(dirLight)

  // Axes
  const axisMat = new THREE.LineBasicMaterial({ color: 0xaaaaaa })
  for (const pts of [
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(2.2, 0, 0)],
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.5, 0)],
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 2.2)],
  ]) {
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), axisMat))
  }

  let dynamicGroup = new THREE.Group()
  scene.add(dynamicGroup)

  function cesF(x1: number, x2: number, r: number): number {
    if (Math.abs(r) < 0.03) return Math.sqrt(x1 * x2)
    const val = 0.5 * (Math.pow(Math.max(x1, 0.001), r) + Math.pow(Math.max(x2, 0.001), r))
    return Math.pow(Math.max(val, 1e-10), 1 / r)
  }

  function cesGrad(x1: number, x2: number, r: number): [number, number] {
    if (Math.abs(r) < 0.03) {
      const F = Math.sqrt(x1 * x2)
      return [0.5 * F / Math.max(x1, 0.001), 0.5 * F / Math.max(x2, 0.001)]
    }
    const x1r = Math.pow(Math.max(x1, 0.001), r)
    const x2r = Math.pow(Math.max(x2, 0.001), r)
    const S = 0.5 * (x1r + x2r)
    const F = Math.pow(S, 1 / r)
    return [F / S * 0.5 * Math.pow(Math.max(x1, 0.001), r - 1),
            F / S * 0.5 * Math.pow(Math.max(x2, 0.001), r - 1)]
  }

  function buildScene() {
    scene.remove(dynamicGroup)
    dynamicGroup = new THREE.Group()
    scene.add(dynamicGroup)

    // Effective rho: rho_eff approaches 0 as T -> T*
    const kEff = Keff.value
    const rEff = kEff > 0.001 ? 1 - kEff * J / (J - 1) : 0

    const N = 50
    const geom = new THREE.BufferGeometry()
    const vertices: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x1 = 0.08 + (i / N) * 2.0
        const x2 = 0.08 + (j / N) * 2.0
        const F = cesF(x1, x2, rEff)
        const y = Math.min(F, 4)
        vertices.push(x1, y, x2)

        // Color: blue (healthy) -> amber (degraded) -> grey (collapsed)
        const health = K.value > 0 ? kEff / K.value : 0
        const h2 = Math.pow(health, 0.6)
        colors.push(
          0.55 * (1 - h2) + 0.12 * h2,
          0.55 * (1 - h2) + 0.30 * h2,
          0.55 * (1 - h2) + 0.65 * h2,
        )

        if (i < N && j < N) {
          const a = i * (N + 1) + j
          indices.push(a, a + 1, a + (N + 1), a + 1, a + (N + 1) + 1, a + (N + 1))
        }
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geom.setIndex(indices)
    geom.computeVertexNormals()

    dynamicGroup.add(new THREE.Mesh(geom, new THREE.MeshPhongMaterial({
      vertexColors: true, side: THREE.DoubleSide, shininess: 35, transparent: true, opacity: 0.9,
    })))

    // --- GRADIENT ARROWS that shrink as curvature degrades ---
    const arrowStep = 7
    for (let i = arrowStep; i <= N - arrowStep; i += arrowStep) {
      for (let j = arrowStep; j <= N - arrowStep; j += arrowStep) {
        const x1 = 0.08 + (i / N) * 2.0
        const x2 = 0.08 + (j / N) * 2.0
        const F = cesF(x1, x2, rEff)
        const [g1, g2] = cesGrad(x1, x2, rEff)

        const mag = Math.sqrt(g1 * g1 + g2 * g2)
        if (mag < 0.01) continue

        // Arrow length scales with K_eff — arrows die as curvature collapses
        const health = K.value > 0 ? kEff / K.value : 0
        const length = Math.min(mag * 0.12, 0.2) * Math.max(health, 0.05)
        if (length < 0.01) continue

        const dir = new THREE.Vector3(g1, mag * 0.25, g2).normalize()
        const origin = new THREE.Vector3(x1, Math.min(F, 4), x2)

        // Color: vivid when healthy, grey when collapsed
        const arrowColor = new THREE.Color().setHSL(
          0.58 * health + 0.0 * (1 - health), // blue -> red
          0.7 * health + 0.1 * (1 - health),
          0.45 + 0.1 * (1 - health)
        )

        const arrow = new THREE.ArrowHelper(dir, origin, length, arrowColor.getHex(), length * 0.35, length * 0.18)
        dynamicGroup.add(arrow)
      }
    }
  }

  buildScene()
  watch([rho, T], () => buildScene())

  function animate() {
    animId = requestAnimationFrame(animate)
    controls.update()
    renderer!.render(scene, camera)
  }
  animate()

  const onResize = () => {
    const newW = canvas.parentElement!.clientWidth
    camera.aspect = newW / h
    camera.updateProjectionMatrix()
    renderer!.setSize(newW, h)
  }
  window.addEventListener('resize', onResize)
  onUnmounted(() => {
    cancelAnimationFrame(animId)
    renderer?.dispose()
    window.removeEventListener('resize', onResize)
  })
})
</script>

<style scoped>
.demo-wrap { padding: 1rem; }
.controls { margin-bottom: 0.5rem; }
.controls label {
  display: flex; align-items: center; gap: 0.75rem;
  font-size: 0.85rem; margin-bottom: 0.3rem;
}
.label-text { min-width: 280px; }
.controls input[type="range"] { flex: 1; max-width: 250px; }
.health-bar {
  display: flex; align-items: center; gap: 0.6rem;
  margin-bottom: 0.5rem; padding: 0.4rem 0.6rem;
  background: #f0f0f0; border-radius: 6px;
}
.health-label { font-size: 0.8rem; font-weight: 600; color: #444; min-width: 140px; }
.health-track { flex: 1; height: 16px; background: #e5e5e5; border-radius: 8px; overflow: hidden; }
.health-fill { height: 100%; border-radius: 8px; transition: width 0.15s, background 0.3s; }
.health-value { font-size: 0.8rem; font-weight: 700; min-width: 80px; text-align: right; }
.render-canvas { width: 100%; border-radius: 4px; display: block; }
</style>

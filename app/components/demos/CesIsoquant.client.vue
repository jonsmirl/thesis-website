<template>
  <div class="demo-wrap">
    <div class="controls">
      <label>
        <span class="label-text">{{ rhoLabel }}</span>
        <input type="range" v-model.number="rho" min="-2" max="1.5" step="0.05" />
      </label>
      <div class="legend">
        <span class="leg-item"><span class="swatch" style="background:#1a3a6a"></span>High curvature</span>
        <span class="leg-item"><span class="swatch" style="background:#e8d44d"></span>Low curvature</span>
        <span class="leg-item"><span class="swatch arrow-leg">&#x2192;</span>Gradient (price direction)</span>
      </div>
      <div class="readout">
        K = {{ K.toFixed(3) }} &nbsp;|&nbsp;
        Eigenvalue &lambda;<sub>&perp;</sub> = {{ eigenvalue.toFixed(3) }} &nbsp;|&nbsp;
        Superadditivity gap &prop; {{ K.toFixed(3) }}
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
const J = 2

const K = computed(() => (1 - rho.value) * (J - 1) / J)
const eigenvalue = computed(() => -K.value / (J - 1))

const rhoLabel = computed(() => {
  const r = rho.value
  if (Math.abs(r) < 0.05) return 'rho ~ 0 (Cobb-Douglas boundary)'
  const sigma = r >= 1 ? '\u221e' : (1 / (1 - r)).toFixed(2)
  return `rho = ${r.toFixed(2)}, sigma = ${sigma}`
})

let renderer: THREE.WebGLRenderer | null = null
let animId = 0

onMounted(() => {
  const canvas = canvasRef.value!
  const w = canvas.parentElement!.clientWidth
  const h = 450

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf8f9fb)

  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100)
  camera.position.set(3.5, 3, 3.5)

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.autoRotate = true
  controls.autoRotateSpeed = 0.8

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.9)
  dirLight.position.set(4, 6, 4)
  scene.add(dirLight)
  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3)
  fillLight.position.set(-3, 2, -3)
  scene.add(fillLight)

  // Axis labels (thin lines)
  const axesGroup = new THREE.Group()
  const axisMat = new THREE.LineBasicMaterial({ color: 0x999999 })
  for (const pts of [
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(2.2, 0, 0)],
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.2, 0)],
    [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 2.2)],
  ]) {
    const g = new THREE.BufferGeometry().setFromPoints(pts)
    axesGroup.add(new THREE.Line(g, axisMat))
  }
  scene.add(axesGroup)

  // Floor grid for isoquant contours
  const floorGroup = new THREE.Group()
  scene.add(floorGroup)

  // Surface + arrows group (rebuilt on rho change)
  let surfaceGroup = new THREE.Group()
  scene.add(surfaceGroup)

  // CES function
  function cesF(x1: number, x2: number, r: number): number {
    if (Math.abs(r) < 0.03) return Math.sqrt(x1 * x2)
    const val = 0.5 * (Math.pow(Math.max(x1, 0.001), r) + Math.pow(Math.max(x2, 0.001), r))
    return Math.pow(Math.max(val, 1e-10), 1 / r)
  }

  // Gradient of CES: dF/dx_j
  function cesGrad(x1: number, x2: number, r: number): [number, number] {
    if (Math.abs(r) < 0.03) {
      // Cobb-Douglas gradient
      const F = Math.sqrt(x1 * x2)
      return [0.5 * F / x1, 0.5 * F / x2]
    }
    const x1r = Math.pow(Math.max(x1, 0.001), r)
    const x2r = Math.pow(Math.max(x2, 0.001), r)
    const S = 0.5 * (x1r + x2r)
    const F = Math.pow(S, 1 / r)
    const dFdx1 = F / S * 0.5 * Math.pow(Math.max(x1, 0.001), r - 1)
    const dFdx2 = F / S * 0.5 * Math.pow(Math.max(x2, 0.001), r - 1)
    return [dFdx1, dFdx2]
  }

  // Gaussian curvature proxy: second derivative measure
  function localCurvature(x1: number, x2: number, r: number): number {
    const eps = 0.02
    const f00 = cesF(x1, x2, r)
    const fpp = cesF(x1 + eps, x2 + eps, r)
    const fpm = cesF(x1 + eps, x2 - eps, r)
    const fmp = cesF(x1 - eps, x2 + eps, r)
    const fmm = cesF(x1 - eps, x2 - eps, r)
    const fxx = (cesF(x1 + eps, x2, r) - 2 * f00 + cesF(x1 - eps, x2, r)) / (eps * eps)
    const fyy = (cesF(x1, x2 + eps, r) - 2 * f00 + cesF(x1, x2 - eps, r)) / (eps * eps)
    const fxy = (fpp - fpm - fmp + fmm) / (4 * eps * eps)
    return Math.abs(fxx * fyy - fxy * fxy)
  }

  function buildScene() {
    // Clear old
    scene.remove(surfaceGroup)
    surfaceGroup = new THREE.Group()
    scene.add(surfaceGroup)

    // Clear floor contours
    while (floorGroup.children.length) floorGroup.remove(floorGroup.children[0])

    const r = rho.value
    const N = 55

    // --- SURFACE ---
    const geom = new THREE.BufferGeometry()
    const vertices: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    // Compute curvature range for color mapping
    let maxCurv = 0
    const curvGrid: number[][] = []
    for (let i = 0; i <= N; i++) {
      curvGrid[i] = []
      for (let j = 0; j <= N; j++) {
        const x1 = 0.08 + (i / N) * 2.0
        const x2 = 0.08 + (j / N) * 2.0
        const c = localCurvature(x1, x2, r)
        curvGrid[i][j] = c
        if (c > maxCurv) maxCurv = c
      }
    }
    if (maxCurv < 0.001) maxCurv = 1 // avoid div-by-zero for flat surface

    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x1 = 0.08 + (i / N) * 2.0
        const x2 = 0.08 + (j / N) * 2.0
        const F = cesF(x1, x2, r)
        const y = Math.min(F, 4)
        vertices.push(x1, y, x2)

        // Color by curvature: deep blue (high K) -> yellow (low K)
        const t = Math.min(curvGrid[i][j] / maxCurv, 1)
        const tS = Math.pow(t, 0.4) // gamma for visibility
        colors.push(
          0.91 * (1 - tS) + 0.10 * tS,  // R: yellow->dark
          0.83 * (1 - tS) + 0.23 * tS,  // G: yellow->dark
          0.30 * (1 - tS) + 0.42 * tS,  // B: low->blue
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

    const surfMat = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      shininess: 40,
      transparent: true,
      opacity: 0.92,
    })
    surfaceGroup.add(new THREE.Mesh(geom, surfMat))

    // --- GRADIENT ARROWS (price direction) ---
    const arrowStep = 6
    for (let i = arrowStep; i <= N - arrowStep; i += arrowStep) {
      for (let j = arrowStep; j <= N - arrowStep; j += arrowStep) {
        const x1 = 0.08 + (i / N) * 2.0
        const x2 = 0.08 + (j / N) * 2.0
        const F = cesF(x1, x2, r)
        const [g1, g2] = cesGrad(x1, x2, r)

        const mag = Math.sqrt(g1 * g1 + g2 * g2)
        if (mag < 0.01) continue

        const dir = new THREE.Vector3(g1, mag * 0.3, g2)
        dir.normalize()
        const origin = new THREE.Vector3(x1, Math.min(F, 4), x2)
        const length = Math.min(mag * 0.15, 0.25)

        // Color arrows by curvature: orange (high) -> grey (low)
        const ct = Math.min(curvGrid[i]?.[j] ?? 0 / maxCurv, 1)
        const arrowColor = new THREE.Color().setHSL(0.08 - ct * 0.08, 0.8, 0.5)

        const arrow = new THREE.ArrowHelper(dir, origin, length, arrowColor.getHex(), length * 0.35, length * 0.2)
        surfaceGroup.add(arrow)
      }
    }

    // --- ISOQUANT CONTOUR LINES on the floor (y=0 plane) ---
    const contourLevels = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]
    const contourMat = new THREE.LineBasicMaterial({ color: 0xbbbbbb, transparent: true, opacity: 0.5 })

    for (const level of contourLevels) {
      const contourPts: THREE.Vector3[] = []
      // March along x1, solve for x2: F(x1, x2) = level
      for (let i = 0; i <= 200; i++) {
        const x1 = 0.08 + (i / 200) * 2.0
        // Binary search for x2
        let lo = 0.01, hi = 3.0
        for (let k = 0; k < 30; k++) {
          const mid = (lo + hi) / 2
          if (cesF(x1, mid, r) < level) lo = mid
          else hi = mid
        }
        const x2 = (lo + hi) / 2
        if (x2 > 0.05 && x2 < 2.15) {
          contourPts.push(new THREE.Vector3(x1, 0.001, x2))
        }
      }
      if (contourPts.length > 5) {
        const cg = new THREE.BufferGeometry().setFromPoints(contourPts)
        floorGroup.add(new THREE.Line(cg, contourMat))
      }
    }

    // --- EIGENVALUE VISUALIZATION at symmetric point ---
    const symX = 1.0
    const symF = cesF(symX, symX, r)
    const symY = Math.min(symF, 4)
    const symPt = new THREE.Vector3(symX, symY, symX)

    // Dot at symmetric equilibrium
    const dotGeom = new THREE.SphereGeometry(0.04, 16, 16)
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xff3333 })
    const dot = new THREE.Mesh(dotGeom, dotMat)
    dot.position.copy(symPt)
    surfaceGroup.add(dot)

    // 1-direction (scale): along (1,1) on the surface
    const scaleDir = new THREE.Vector3(1, 0, 1).normalize()
    const scaleArrow = new THREE.ArrowHelper(scaleDir, symPt, 0.4, 0xffcc00, 0.12, 0.06)
    surfaceGroup.add(scaleArrow)

    // 1-perp direction (curvature): along (1,-1) on the surface
    const perpDir = new THREE.Vector3(1, 0, -1).normalize()
    const perpLen = Math.min(Math.abs(K.value) * 0.3 + 0.1, 0.5)
    const perpArrow = new THREE.ArrowHelper(perpDir, symPt, perpLen, 0x00ccff, perpLen * 0.3, perpLen * 0.15)
    surfaceGroup.add(perpArrow)
  }

  buildScene()
  watch(rho, () => buildScene())

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
  display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem;
}
.label-text { min-width: 260px; font-weight: 500; }
.controls input[type="range"] { flex: 1; max-width: 300px; }
.legend {
  display: flex; gap: 1rem; font-size: 0.72rem; color: #666;
  margin-top: 0.35rem; flex-wrap: wrap;
}
.leg-item { display: flex; align-items: center; gap: 0.25rem; }
.swatch { display: inline-block; width: 12px; height: 12px; border-radius: 2px; }
.arrow-leg { font-size: 1rem; color: #cc6600; font-weight: bold; }
.readout {
  font-size: 0.78rem; color: #444; margin-top: 0.35rem;
  font-family: 'SF Mono', 'Fira Code', monospace;
}
.render-canvas { width: 100%; border-radius: 4px; display: block; }
</style>

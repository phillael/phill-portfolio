# Claude Code Project Rules - Phill Portfolio

## Project Overview
A cyberpunk-themed developer portfolio for Phill Aelony built with Next.js 16, TypeScript, React, Tailwind CSS, and Framer Motion. Future phases will incorporate Three.js for 3D animations.

## Tech Stack
- **Framework**: Next.js 16 with App Router and Turbopack
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom cyberpunk color palette
- **Animation**: Framer Motion (currently), Three.js (Phase 6)
- **Components**: shadcn/ui patterns

## Design System
- **Theme**: Cyberpunk "Tokyo at midnight" aesthetic
- **Colors**: Neon cyan primary, magenta secondary, green accent on dark backgrounds
- **Typography**: Audiowide (headings), Nunito (body)
- **Effects**: Neon glow, scanlines, HUD-style card corners

## Accessibility Requirements
- WCAG 2.1 AA compliant
- All interactive elements must have keyboard support
- Minimum touch target: 44x44px
- Focus visible states on all focusable elements

---

# Three.js Integration Guide

## Installation
```bash
npm install three @types/three
```

## Core Concepts

### Basic Scene Setup
```javascript
import * as THREE from 'three';

// Initialize renderer with optimal settings
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true  // For transparent backgrounds
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);  // Match portfolio dark bg

// Setup perspective camera
const camera = new THREE.PerspectiveCamera(
  70,                                          // FOV
  window.innerWidth / window.innerHeight,      // Aspect ratio
  0.01,                                        // Near plane
  1000                                         // Far plane
);
camera.position.set(0, 0, 5);

// Animation loop
renderer.setAnimationLoop((time) => {
  // Update animations here
  renderer.render(scene, camera);
});
```

### Responsive Canvas Handling
```javascript
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
```

## Post-Processing for Cyberpunk Effects

### Bloom/Glow Effect Setup
```javascript
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Create composer
const composer = new EffectComposer(renderer);

// Add render pass (required first)
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom effect for neon glow
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,   // strength - higher = more glow
  0.4,   // radius - spread of glow
  0.85   // threshold - brightness needed to bloom
);
composer.addPass(bloomPass);

// Output pass (required last)
const outputPass = new OutputPass();
composer.addPass(outputPass);

// Render using composer
function animate() {
  composer.render();
}
```

### RGB Shift for Glitch Effects
```javascript
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';

const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.0015;  // Subtle shift
rgbShiftPass.uniforms['angle'].value = 0.0;
composer.addPass(rgbShiftPass);
```

## Materials for Cyberpunk Aesthetic

### Emissive Materials (Neon Glow)
```javascript
const neonMaterial = new THREE.MeshStandardMaterial({
  color: 0x00ffff,        // Cyan base
  emissive: 0x00ffff,     // Glow color
  emissiveIntensity: 0.5, // Glow strength
  metalness: 0.8,
  roughness: 0.2
});
```

### Custom Shader Material
```javascript
const uniforms = {
  time: { value: 0 },
  color: { value: new THREE.Color(0x00ffff) }
};

const shaderMaterial = new THREE.ShaderMaterial({
  uniforms: uniforms,
  vertexShader: vertexShaderCode,
  fragmentShader: fragmentShaderCode,
  transparent: true
});

// Update in animation loop
function animate(time) {
  uniforms.time.value = time * 0.001;
}
```

## Lighting for Cyberpunk Scenes

```javascript
// Ambient light (low intensity for dark atmosphere)
const ambientLight = new THREE.AmbientLight(0x111111, 0.5);
scene.add(ambientLight);

// Colored point lights for neon effect
const cyanLight = new THREE.PointLight(0x00ffff, 100, 50);
cyanLight.position.set(5, 5, 5);
scene.add(cyanLight);

const magentaLight = new THREE.PointLight(0xff00ff, 100, 50);
magentaLight.position.set(-5, 5, -5);
scene.add(magentaLight);
```

## Common Geometries

### Particles System
```javascript
const particlesGeometry = new THREE.BufferGeometry();
const count = 5000;
const positions = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 10;
}

particlesGeometry.setAttribute(
  'position',
  new THREE.BufferAttribute(positions, 3)
);

const particlesMaterial = new THREE.PointsMaterial({
  size: 0.02,
  color: 0x00ffff,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);
```

### Grid Floor
```javascript
const gridHelper = new THREE.GridHelper(200, 40, 0x00ffff, 0x00ffff);
gridHelper.material.opacity = 0.2;
gridHelper.material.transparent = true;
scene.add(gridHelper);
```

## React Integration Pattern

### Next.js Component Structure
```tsx
'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface ThreeSceneProps {
  className?: string
}

const ThreeScene = ({ className }: ThreeSceneProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Setup scene, camera, renderer
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Add objects...
    camera.position.z = 5

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      renderer.dispose()
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className={className} />
}

export default ThreeScene
```

## Performance Best Practices

1. **Use `requestAnimationFrame`** or `renderer.setAnimationLoop()` for smooth animation
2. **Dispose of geometries and materials** when components unmount
3. **Use instanced meshes** for repeated objects
4. **Limit draw calls** by merging geometries where possible
5. **Use lower polygon counts** for background elements
6. **Implement frustum culling** (enabled by default)
7. **Use texture atlases** to reduce material changes

## Cyberpunk Effect Ideas for Portfolio

1. **Hero Section**: Floating particles with bloom effect
2. **Background**: Animated grid with perspective (Tron-style)
3. **Section Transitions**: Glitch shader effect
4. **Skills Cards**: Holographic material effect
5. **Mouse Parallax**: 3D depth with camera movement

## Import Map for Module Resolution
```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@latest/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@latest/examples/jsm/"
  }
}
</script>
```

## Common Addons Paths
```javascript
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
```

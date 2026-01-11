---
name: Framer Motion Animations
description: Implement smooth, performant animations using Framer Motion for React. Use this skill when adding animations to components, creating hover/tap/drag interactions, implementing scroll-triggered reveals, building exit animations with AnimatePresence, or creating particle effects. Apply when working on any .tsx or .jsx component file that needs motion, gestures, or transitions. Essential for the cyberpunk portfolio's micro-interactions, skill chip explosions, and glitch effects.
---

## When to use this skill:

- When adding animations to React components (.tsx, .jsx files)
- When implementing hover effects with whileHover
- When adding tap/click animations with whileTap
- When creating scroll-triggered animations with whileInView
- When building exit animations with AnimatePresence
- When implementing drag interactions
- When creating staggered list animations
- When adding particle burst effects
- When implementing glitch text effects
- When creating mouse-following elements
- When building magnetic cursor effects
- When optimizing animations for performance

# Framer Motion Best Practices

## Core Animation Patterns

### Basic Gesture Animations
```tsx
<motion.button
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.2 }}
/>
```

### Scroll-Triggered Reveal (whileInView)
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, amount: 0.3 }}
  transition={{ duration: 0.5 }}
/>
```

### Viewport Options
- `once: true` - Only animate once when entering viewport
- `amount: 0.3` - Trigger when 30% of element is visible
- `margin: "0px -100px"` - Adjust detection area

## Variants for Complex Animations

### Parent-Child Variant Propagation
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

<motion.ul
  variants={containerVariants}
  initial="hidden"
  whileInView="visible"
>
  {items.map(item => (
    <motion.li key={item.id} variants={itemVariants} />
  ))}
</motion.ul>
```

### Stagger from Different Directions
```tsx
import { stagger } from "framer-motion"

const transition = {
  delayChildren: stagger(0.1, { from: "last" }) // or "center" or index
}
```

## Exit Animations with AnimatePresence

### Basic Exit Animation
```tsx
import { AnimatePresence, motion } from "framer-motion"

<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
    />
  )}
</AnimatePresence>
```

### List with Exit Animations (for particle effects)
```tsx
<AnimatePresence>
  {particles.map(particle => (
    <motion.div
      key={particle.id}
      initial={{ scale: 1, opacity: 1 }}
      animate={{
        x: particle.x,
        y: particle.y,
        scale: 0,
        opacity: 0
      }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  ))}
</AnimatePresence>
```

## Motion Values for Advanced Effects

### Mouse Position Tracking
```tsx
import { useMotionValue, useTransform } from "framer-motion"

const x = useMotionValue(0)
const y = useMotionValue(0)

// Transform mouse position to rotation
const rotateX = useTransform(y, [-300, 300], [15, -15])
const rotateY = useTransform(x, [-300, 300], [-15, 15])

const handleMouseMove = (e: MouseEvent) => {
  const rect = e.currentTarget.getBoundingClientRect()
  x.set(e.clientX - rect.left - rect.width / 2)
  y.set(e.clientY - rect.top - rect.height / 2)
}

<motion.div
  onMouseMove={handleMouseMove}
  style={{ rotateX, rotateY }}
/>
```

### Spring Physics for Smooth Following
```tsx
import { useMotionValue, useSpring } from "framer-motion"

const x = useMotionValue(0)
const springX = useSpring(x, { stiffness: 300, damping: 30 })
```

### Opacity Based on Position
```tsx
const x = useMotionValue(0)
const opacity = useTransform(x, [-200, 0, 200], [0, 1, 0])

<motion.div drag="x" style={{ x, opacity }} />
```

## Drag Gestures

### Basic Drag with Constraints
```tsx
const constraintsRef = useRef(null)

<motion.div ref={constraintsRef}>
  <motion.div
    drag
    dragConstraints={constraintsRef}
    dragElastic={0.2}
    whileDrag={{ scale: 1.1 }}
  />
</motion.div>
```

### Drag Events
```tsx
<motion.div
  drag
  onDragStart={(e, info) => console.log("Start:", info.point)}
  onDrag={(e, info) => console.log("Delta:", info.delta)}
  onDragEnd={(e, info) => console.log("Velocity:", info.velocity)}
/>
```

## Performance Best Practices

### 1. Animate Only Transform and Opacity
```tsx
// GOOD - GPU accelerated
whileHover={{ scale: 1.1, opacity: 0.8 }}

// AVOID - Triggers layout recalculation
whileHover={{ width: "120%", padding: "20px" }}
```

### 2. Use will-change Sparingly
Framer Motion handles this automatically. Don't add manual will-change.

### 3. Respect Reduced Motion Preferences
```tsx
import { useReducedMotion } from "framer-motion"

function Component() {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      animate={shouldReduceMotion
        ? { opacity: 1 }
        : { opacity: 1, y: 0 }
      }
    />
  )
}
```

### 4. Use layout Prop Carefully
```tsx
// Only use layout when you need automatic layout animations
<motion.div layout /> // Expensive - animates all layout changes

// Prefer explicit animations when possible
<motion.div animate={{ height: isOpen ? "auto" : 0 }} />
```

## Cyberpunk-Specific Patterns

### Neon Glow Hover Effect
```tsx
<motion.button
  whileHover={{
    scale: 1.05,
    filter: "drop-shadow(0 0 12px hsl(190 100% 75%))"
  }}
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.2 }}
/>
```

### Glitch Text Effect
```tsx
const glitchVariants = {
  idle: { x: 0, opacity: 1 },
  glitch: {
    x: [0, -2, 2, -1, 1, 0],
    opacity: [1, 0.8, 1, 0.9, 1],
    filter: [
      "hue-rotate(0deg)",
      "hue-rotate(90deg)",
      "hue-rotate(-90deg)",
      "hue-rotate(0deg)"
    ],
    transition: { duration: 0.3 }
  }
}

<motion.span
  variants={glitchVariants}
  initial="idle"
  whileHover="glitch"
/>
```

### Particle Burst on Click
```tsx
const [particles, setParticles] = useState<Particle[]>([])

const handleClick = (e: MouseEvent) => {
  const newParticles = Array.from({ length: 12 }, (_, i) => ({
    id: Date.now() + i,
    x: (Math.random() - 0.5) * 200,
    y: (Math.random() - 0.5) * 200,
  }))
  setParticles(newParticles)
  setTimeout(() => setParticles([]), 600)
}

<AnimatePresence>
  {particles.map(p => (
    <motion.div
      key={p.id}
      className="absolute w-2 h-2 rounded-full bg-primary"
      initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
      animate={{ scale: 0, opacity: 0, x: p.x, y: p.y }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    />
  ))}
</AnimatePresence>
```

### Magnetic Cursor Effect
```tsx
import { Cursor } from "motion-plus/react" // If using motion-plus

// Or custom implementation
const magnetStrength = 0.3

const handleMouseMove = (e: MouseEvent) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  x.set((e.clientX - centerX) * magnetStrength)
  y.set((e.clientY - centerY) * magnetStrength)
}

const handleMouseLeave = () => {
  x.set(0)
  y.set(0)
}
```

## Common Transition Presets

```tsx
// Snappy interaction
const snappy = { type: "spring", stiffness: 400, damping: 25 }

// Smooth ease
const smooth = { duration: 0.3, ease: "easeInOut" }

// Bouncy
const bouncy = { type: "spring", stiffness: 300, damping: 10 }

// Slow reveal
const reveal = { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
```

## Import Patterns

```tsx
// Core imports
import { motion, AnimatePresence } from "framer-motion"

// Hooks
import {
  useMotionValue,
  useTransform,
  useSpring,
  useReducedMotion,
  useInView,
  useAnimate
} from "framer-motion"

// Utilities
import { stagger } from "framer-motion"
```

## References

- [Motion for React Documentation](https://motion.dev/docs/react-animation)
- [Accessibility Guide](https://motion.dev/docs/react-accessibility)
- [Performance Guide](https://motion.dev/docs/performance)

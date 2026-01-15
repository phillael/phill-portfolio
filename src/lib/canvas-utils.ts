/**
 * Canvas rendering utilities for the 3D carousel.
 * Provides functions to render styled text, images, and effects to canvas.
 */

// Cyberpunk color palette
export const COLORS = {
  background: '#0a0a12',
  backgroundGradientStart: '#0a0a12',
  backgroundGradientEnd: '#1a1a2e',
  primary: '#00ffff', // Cyan
  secondary: '#ff00ff', // Magenta
  accent: '#00ff88', // Green
  text: '#e0e0e0',
  textMuted: '#888888',
  cardBorder: 'rgba(0, 255, 255, 0.3)',
}

// Font configuration
export const FONTS = {
  heading: 'Audiowide, sans-serif',
  body: 'Nunito, sans-serif',
}

interface TextStyle {
  font: string
  size: number
  color: string
  glow?: {
    color: string
    blur: number
  }
  lineHeight?: number
  maxWidth?: number
  align?: CanvasTextAlign
}

interface ImageOptions {
  x: number
  y: number
  width: number
  height: number
  glow?: {
    color: string
    blur: number
  }
  circular?: boolean
  borderColor?: string
  borderWidth?: number
}

/**
 * Draw text with optional neon glow effect
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: TextStyle
): void {
  ctx.font = `${style.size}px ${style.font}`
  ctx.textAlign = style.align || 'left'
  ctx.textBaseline = 'top'

  if (style.glow) {
    // Draw glow layers
    ctx.shadowColor = style.glow.color
    ctx.shadowBlur = style.glow.blur
    ctx.fillStyle = style.glow.color
    // Multiple passes for stronger glow
    ctx.fillText(text, x, y)
    ctx.fillText(text, x, y)
  }

  // Draw main text
  ctx.shadowBlur = 0
  ctx.fillStyle = style.color
  ctx.fillText(text, x, y)
}

/**
 * Draw wrapped text with word wrapping
 * Returns the total height used
 */
export function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: TextStyle
): number {
  const maxWidth = style.maxWidth || ctx.canvas.width - x * 2
  const lineHeight = style.lineHeight || style.size * 1.4

  ctx.font = `${style.size}px ${style.font}`
  ctx.textAlign = style.align || 'left'
  ctx.textBaseline = 'top'

  const words = text.split(' ')
  let line = ''
  let currentY = y
  const lines: string[] = []

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word
    const metrics = ctx.measureText(testLine)

    if (metrics.width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = testLine
    }
  }
  lines.push(line)

  // Draw all lines
  for (const l of lines) {
    if (style.glow) {
      ctx.shadowColor = style.glow.color
      ctx.shadowBlur = style.glow.blur
      ctx.fillStyle = style.glow.color
      ctx.fillText(l, x, currentY)
    }

    ctx.shadowBlur = 0
    ctx.fillStyle = style.color
    ctx.fillText(l, x, currentY)
    currentY += lineHeight
  }

  return currentY - y
}

/**
 * Draw text with inline highlighted words
 * Highlights are specified as {text: string, color: string}[]
 */
export interface TextSegment {
  text: string
  color?: string
  glow?: boolean
}

export function drawRichText(
  ctx: CanvasRenderingContext2D,
  segments: TextSegment[],
  x: number,
  y: number,
  style: TextStyle,
  maxWidth: number
): number {
  ctx.font = `${style.size}px ${style.font}`
  ctx.textBaseline = 'top'

  const lineHeight = style.lineHeight || style.size * 1.5
  let currentX = x
  let currentY = y

  // Build words with their colors
  const words: { word: string; color: string; glow: boolean }[] = []
  for (const segment of segments) {
    const segmentWords = segment.text.split(' ')
    for (let i = 0; i < segmentWords.length; i++) {
      const word = segmentWords[i]
      if (word) {
        words.push({
          word: i < segmentWords.length - 1 ? word + ' ' : word,
          color: segment.color || style.color,
          glow: segment.glow || false,
        })
      }
      // Add space between segments
      if (i === segmentWords.length - 1 && segment !== segments[segments.length - 1]) {
        words[words.length - 1].word += ' '
      }
    }
  }

  for (const { word, color, glow } of words) {
    const metrics = ctx.measureText(word)

    // Check if we need to wrap
    if (currentX + metrics.width > x + maxWidth && currentX > x) {
      currentX = x
      currentY += lineHeight
    }

    // Draw glow if needed
    if (glow && style.glow) {
      ctx.shadowColor = color
      ctx.shadowBlur = style.glow.blur
      ctx.fillStyle = color
      ctx.fillText(word, currentX, currentY)
      ctx.fillText(word, currentX, currentY)
    }

    ctx.shadowBlur = 0
    ctx.fillStyle = color
    ctx.fillText(word, currentX, currentY)

    currentX += metrics.width
  }

  return currentY - y + lineHeight
}

/**
 * Draw an image with optional effects
 */
export function drawImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLCanvasElement,
  options: ImageOptions
): void {
  ctx.save()

  if (options.circular) {
    // Create circular clipping path
    ctx.beginPath()
    ctx.arc(
      options.x + options.width / 2,
      options.y + options.height / 2,
      options.width / 2,
      0,
      Math.PI * 2
    )
    ctx.closePath()
    ctx.clip()
  }

  if (options.glow) {
    ctx.shadowColor = options.glow.color
    ctx.shadowBlur = options.glow.blur
  }

  ctx.drawImage(img, options.x, options.y, options.width, options.height)

  ctx.restore()

  // Draw border after restoring context
  if (options.borderColor && options.borderWidth) {
    ctx.strokeStyle = options.borderColor
    ctx.lineWidth = options.borderWidth

    if (options.circular) {
      ctx.beginPath()
      ctx.arc(
        options.x + options.width / 2,
        options.y + options.height / 2,
        options.width / 2,
        0,
        Math.PI * 2
      )
      ctx.stroke()
    } else {
      ctx.strokeRect(options.x, options.y, options.width, options.height)
    }
  }
}

/**
 * Draw a gradient background
 */
export function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  startColor: string = COLORS.backgroundGradientStart,
  endColor: string = COLORS.backgroundGradientEnd
): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, startColor)
  gradient.addColorStop(1, endColor)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

/**
 * Draw a card border with neon glow
 */
export function drawCardBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string = COLORS.primary,
  cornerRadius: number = 12
): void {
  ctx.save()

  // Glow effect
  ctx.shadowColor = color
  ctx.shadowBlur = 15
  ctx.strokeStyle = color
  ctx.lineWidth = 2

  // Rounded rectangle path
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, cornerRadius)
  ctx.stroke()

  // Second pass for stronger glow
  ctx.stroke()

  ctx.restore()
}

/**
 * Draw a large decorative quote mark
 */
export function drawQuoteMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string = COLORS.accent
): void {
  ctx.font = `${size}px ${FONTS.heading}`
  ctx.fillStyle = color
  ctx.globalAlpha = 0.3
  ctx.fillText('"', x, y)
  ctx.globalAlpha = 1
}

/**
 * Load an image and return a promise
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/**
 * Wait for fonts to be loaded
 */
export async function waitForFonts(): Promise<void> {
  await document.fonts.ready
}

/**
 * Carousel slide renderers.
 * Creates canvas textures for bio and testimonial slides.
 */

import {
  COLORS,
  FONTS,
  drawGradientBackground,
  drawCardBorder,
  drawText,
  drawWrappedText,
  drawRichText,
  drawImage,
  drawQuoteMark,
  loadImage,
  waitForFonts,
  type TextSegment,
} from './canvas-utils'
import type { Testimonial } from '@/types/testimonial'

// Canvas dimensions - using 16:9 aspect ratio for good visual balance
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 500
const PADDING = 40

/**
 * Bio content with highlighted words
 */
const BIO_PARAGRAPHS: TextSegment[][] = [
  [
    { text: 'I was born and raised in' },
    { text: 'Minneapolis, MN', color: COLORS.primary, glow: true },
    { text: '! I began playing music at a young age and eventually went to the' },
    { text: 'University of North Texas', color: COLORS.primary, glow: true },
    { text: 'to study jazz guitar.' },
  ],
  [
    { text: 'I spent many years playing in bands, touring, recording, teaching, and traveling the world. I crushed it. I played with an epic band called' },
    { text: 'The Funky Knuckles', color: COLORS.secondary, glow: true },
    { text: '. However all of this grew tiresome, so I used my insanely powerful mind and firey unparallelled discipline to teach myself computer programming.' },
  ],
  [
    { text: 'Oh yeah I also composed a ton of music for a video game called' },
    { text: 'Eco', color: COLORS.accent, glow: true },
    { text: 'which is available on Steam and I did an awesome job.' },
  ],
  [
    { text: 'I was so good at programming that my first job was at' },
    { text: 'Microsoft', color: COLORS.primary, glow: true },
    { text: '. That grew tiresome so I moved on to work at some more interesting startups, and now I am doing full stack development for a company called' },
    { text: 'TimelyCare', color: COLORS.secondary, glow: true },
    { text: 'and it is awesome and I do great work.' },
  ],
]

/**
 * Render the bio slide (About Me) to a canvas
 */
export async function renderBioSlide(): Promise<HTMLCanvasElement> {
  await waitForFonts()

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')!

  // Background
  drawGradientBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Card border
  drawCardBorder(ctx, 10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20, COLORS.primary)

  // Title
  drawText(ctx, 'About', PADDING, PADDING, {
    font: FONTS.heading,
    size: 36,
    color: COLORS.secondary,
    glow: { color: COLORS.secondary, blur: 20 },
  })

  // Try to load and draw space llama
  try {
    const llamaImg = await loadImage('/images/space_llama.png')
    const llamaSize = 140
    drawImage(ctx, llamaImg, {
      x: CANVAS_WIDTH - llamaSize - PADDING,
      y: PADDING,
      width: llamaSize,
      height: llamaSize,
      glow: { color: COLORS.secondary, blur: 25 },
    })
  } catch (e) {
    // Llama image not available, continue without it
    console.warn('Could not load space llama image:', e)
  }

  // Bio text - render each paragraph
  let currentY = PADDING + 60
  const textMaxWidth = CANVAS_WIDTH - PADDING * 2 - 160 // Leave space for llama

  for (let i = 0; i < BIO_PARAGRAPHS.length; i++) {
    const height = drawRichText(
      ctx,
      BIO_PARAGRAPHS[i],
      PADDING,
      currentY,
      {
        font: FONTS.body,
        size: 14,
        color: COLORS.text,
        glow: { color: COLORS.primary, blur: 8 },
        lineHeight: 20,
      },
      i === 0 ? textMaxWidth : CANVAS_WIDTH - PADDING * 2
    )
    currentY += height + 12
  }

  return canvas
}

/**
 * Render a testimonial slide to a canvas
 */
export async function renderTestimonialSlide(testimonial: Testimonial): Promise<HTMLCanvasElement> {
  await waitForFonts()

  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')!

  // Background
  drawGradientBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Card border
  drawCardBorder(ctx, 10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20, COLORS.primary)

  // Large quote mark
  drawQuoteMark(ctx, PADDING - 10, PADDING - 20, 80, COLORS.accent)

  // Testimonial body text
  const bodyY = PADDING + 30
  const bodyHeight = drawWrappedText(
    ctx,
    testimonial.body.length > 400 ? testimonial.body.slice(0, 400) + '...' : testimonial.body,
    PADDING,
    bodyY,
    {
      font: FONTS.body,
      size: 15,
      color: COLORS.text,
      lineHeight: 22,
      maxWidth: CANVAS_WIDTH - PADDING * 2,
      align: 'left',
    }
  )

  // Author section at bottom
  const authorY = Math.max(bodyY + bodyHeight + 30, CANVAS_HEIGHT - 120)

  // Divider line
  ctx.strokeStyle = `${COLORS.primary}40`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PADDING, authorY - 15)
  ctx.lineTo(CANVAS_WIDTH - PADDING, authorY - 15)
  ctx.stroke()

  // Avatar
  const avatarSize = 60
  const avatarX = PADDING
  const avatarY = authorY

  try {
    const avatarImg = await loadImage(testimonial.image)
    drawImage(ctx, avatarImg, {
      x: avatarX,
      y: avatarY,
      width: avatarSize,
      height: avatarSize,
      circular: true,
      borderColor: COLORS.primary,
      borderWidth: 2,
      glow: { color: COLORS.primary, blur: 10 },
    })
  } catch (e) {
    // Draw fallback initial
    ctx.fillStyle = COLORS.backgroundGradientEnd
    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = COLORS.primary
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = COLORS.text
    ctx.font = `24px ${FONTS.heading}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(testimonial.name.charAt(0), avatarX + avatarSize / 2, avatarY + avatarSize / 2)
  }

  // Name with neon effect
  const textX = avatarX + avatarSize + 15
  drawText(ctx, testimonial.name, textX, avatarY + 5, {
    font: FONTS.heading,
    size: 18,
    color: COLORS.primary,
    glow: { color: COLORS.primary, blur: 10 },
  })

  // Position
  drawText(ctx, testimonial.position, textX, avatarY + 28, {
    font: FONTS.body,
    size: 13,
    color: COLORS.textMuted,
  })

  // Date
  drawText(ctx, testimonial.date, textX, avatarY + 46, {
    font: FONTS.body,
    size: 11,
    color: COLORS.textMuted,
  })

  return canvas
}

/**
 * Generate all slide canvases
 */
export async function generateAllSlides(testimonials: Testimonial[]): Promise<HTMLCanvasElement[]> {
  const slides: HTMLCanvasElement[] = []

  // Bio slide first
  slides.push(await renderBioSlide())

  // Testimonial slides
  for (const testimonial of testimonials) {
    slides.push(await renderTestimonialSlide(testimonial))
  }

  return slides
}

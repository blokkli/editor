<template>
  <div
    class="bk bk-konami"
    :style="{
      '--bk-bg': background,
    }"
  >
    <div class="bk-dialog-background" />
    <div class="bk-konami-game bk-slide-up-inner">
      <div class="bk-konami-game-canvas">
        <canvas
          ref="canvasDisplay"
          :style="canvasStyle"
          :width="canvasWidth"
          :height="canvasHeight"
          class="bk-is-display"
        />
        <Pixelgrid
          :canvas-scale
          :canvas-height
          :canvas-width
          :style="canvasStyle"
        />
      </div>
    </div>
    <div v-if="DEBUG_ICONS" class="bk-konami-debug-canvas">
      <canvas
        ref="debugCanvas"
        :width="debugCanvasWidth"
        :height="debugCanvasHeight"
        :style="{
          width: debugCanvasWidth * 6 + 'px',
          height: debugCanvasHeight * 6 + 'px',
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import onBlokkliEvent from '#blokkli/helpers/composables/onBlokkliEvent'
import {
  computed,
  useTemplateRef,
  useBlokkli,
  ref,
  onMounted,
  onUnmounted,
} from '#imports'
import Pixelgrid from './PixelGrid.vue'
import { useTextRendering } from './textRendering'
import { useIconRendering } from './useIconRendering'
import logoUrl from './blokkli.png'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const DEBUG_ICONS = false
const DEBUG_GAME = false
const INIT_EATEN = 150

const largeIconSize = 32
const blackColor = 'black'
// Grid configuration (Nokia 5110 screen: 84 × 48 pixels)
const worldWidth = 7 * 3 // 84 pixels / 12 = 7 cells
const worldHeight = 4 * 3 - 1 // 48 pixels / 12 = 4 cells, minus 1 for score area
const scoreAreaHeight = 1 // 1 cell for score/stats
const cellSize = 12 // Pixels per game cell
// Border and padding around game world
const gameWorldBorder = 1
const gameWorldPadding = 1
let isLoaded = false

const { keyboard, ui } = useBlokkli()

const { drawTextPixels, getTextWidth, drawText } = useTextRendering()
const { initIcons, getIconCount, drawIcon } = useIconRendering(
  cellSize,
  largeIconSize,
)

const iconCount = getIconCount()

const canvasWidth = computed(() => {
  return worldWidth * cellSize + (gameWorldBorder + gameWorldPadding) * 2
})

const canvasHeight = computed(() => {
  // Score area + game world with border and padding
  return (
    scoreAreaHeight * cellSize +
    (gameWorldBorder + gameWorldPadding) * 2 +
    worldHeight * cellSize
  )
})

const canvasScale = computed(() => {
  // Calculate scale based on viewport size with 10% margin on each side (80% available)
  const availableWidth = ui.viewport.value.width * 0.8
  const availableHeight = ui.viewport.value.height * 0.8

  const maxScaleWidth = Math.floor(availableWidth / canvasWidth.value)
  const maxScaleHeight = Math.floor(availableHeight / canvasHeight.value)

  // Use the smaller scale to ensure it fits in both dimensions, minimum 1
  return Math.max(1, Math.min(maxScaleWidth, maxScaleHeight))
})

const canvasStyle = computed(() => {
  return {
    width: canvasWidth.value * canvasScale.value + 'px',
    height: canvasHeight.value * canvasScale.value + 'px',
  }
})

// Game state
type Position = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'

const snake = ref<Position[]>([
  { x: Math.floor(worldWidth / 2), y: Math.floor(worldHeight / 2) },
])
const direction = ref<Direction>('right')
const nextDirection = ref<Direction>('right')
const food = ref<Position>({ x: 10, y: 10 })
const gameOver = ref(false)
const gameStarted = ref(false)
const score = ref(0)
const blocksEaten = ref(0)
const removedTail = ref<Position | null>(null) // Tail segment that was removed but still animating
let lastCellUpdate = 0 // Timestamp of last cell-based update
let gameOverTime = 0 // Timestamp when game over occurred

const currentBlockIndex = ref(0)

// Scoring variables
let movesSinceFoodSpawn = 0 // Number of moves since food spawned
let optimalPathLength = 0 // Manhattan distance to food when it spawned

const canvasDisplay = useTemplateRef('canvasDisplay')
const debugCanvas = useTemplateRef('debugCanvas')

const debugCanvasWidth = computed(() => {
  if (!DEBUG_ICONS) return 0
  const iconsPerRow = 7
  return Math.min(iconCount, iconsPerRow) * (largeIconSize + 10)
})

const debugCanvasHeight = computed(() => {
  if (!DEBUG_ICONS) return 0
  const iconsPerRow = 7
  const smallRows = Math.ceil(iconCount / iconsPerRow)
  const largeRows = Math.ceil(iconCount / iconsPerRow)
  return smallRows * (cellSize + 10) + largeRows * (largeIconSize + 10) + 20
})

// Offscreen canvases for caching
let scoreCanvas: HTMLCanvasElement | null = null
let snakeCanvas: OffscreenCanvas | null = null
let logoCanvas: OffscreenCanvas | null = null
let lastScore = -1
let lastBlocksEaten = -1

const cellMoveDuration = 250 // milliseconds per cell movement

// Generate random food position
function generateFood() {
  let newFood: Position
  do {
    newFood = {
      x: Math.floor(Math.random() * worldWidth),
      y: Math.floor(Math.random() * worldHeight),
    }
  } while (
    snake.value.some(
      (segment) => segment.x === newFood.x && segment.y === newFood.y,
    )
  )

  food.value = newFood
  currentBlockIndex.value = (currentBlockIndex.value + 1) % iconCount

  // Reset scoring variables
  movesSinceFoodSpawn = 0

  // Calculate optimal path length (Manhattan distance)
  const head = snake.value[0]!
  optimalPathLength =
    Math.abs(head.x - newFood.x) + Math.abs(head.y - newFood.y)
}

// AI pathfinding: calculate the best direction to reach food
function getAIDirection(): Direction {
  const head = snake.value[0]!
  const target = food.value

  // Helper to check if a position is safe
  const isSafe = (pos: Position): boolean => {
    // Check walls
    if (pos.x < 0 || pos.x >= worldWidth || pos.y < 0 || pos.y >= worldHeight) {
      return false
    }
    // Check self collision (excluding tail which will move)
    for (let i = 0; i < snake.value.length - 1; i++) {
      const segment = snake.value[i]!
      if (segment.x === pos.x && segment.y === pos.y) {
        return false
      }
    }
    return true
  }

  // Possible moves
  const moves: { dir: Direction; pos: Position; priority: number }[] = []

  // Calculate Manhattan distance for each possible direction
  const directions: Direction[] = ['up', 'down', 'left', 'right']
  for (const dir of directions) {
    // Don't reverse direction
    if (
      (dir === 'up' && direction.value === 'down') ||
      (dir === 'down' && direction.value === 'up') ||
      (dir === 'left' && direction.value === 'right') ||
      (dir === 'right' && direction.value === 'left')
    ) {
      continue
    }

    const newPos: Position = { ...head }
    switch (dir) {
      case 'up':
        newPos.y -= 1
        break
      case 'down':
        newPos.y += 1
        break
      case 'left':
        newPos.x -= 1
        break
      case 'right':
        newPos.x += 1
        break
    }

    if (isSafe(newPos)) {
      const distance =
        Math.abs(newPos.x - target.x) + Math.abs(newPos.y - target.y)
      moves.push({ dir, pos: newPos, priority: -distance })
    }
  }

  // Sort by priority (lower distance = higher priority)
  moves.sort((a, b) => b.priority - a.priority)

  // Return the best move, or current direction if no safe moves
  return moves.length > 0 ? moves[0]!.dir : direction.value
}

// Reset game
function resetGame() {
  const startPos = {
    x: Math.floor(worldWidth / 2),
    y: Math.floor(worldHeight / 2),
  }
  snake.value = [startPos]
  direction.value = 'right'
  nextDirection.value = 'right'
  gameOver.value = false
  gameStarted.value = false
  score.value = 0
  blocksEaten.value = 0
  removedTail.value = null
  lastCellUpdate = 0
  gameOverTime = 0
  movesSinceFoodSpawn = 0
  optimalPathLength = 0

  // Debug mode: initialize with 10 blocks already eaten
  if (DEBUG_GAME) {
    for (let i = 0; i < 10; i++) {
      const head = snake.value[0]!
      snake.value.push({ x: head.x - i - 1, y: head.y })
    }
    blocksEaten.value = 10
    score.value = 10 * 100 // Perfect score for each block
    gameStarted.value = true
  }

  if (INIT_EATEN) {
    for (let i = 0; i < INIT_EATEN; i++) {
      const head = snake.value[0]!
      snake.value.push({ x: head.x - i - 1, y: head.y })
    }
  }

  generateFood()
}

// Update game state based on current time
function update(currentTime: number) {
  if (gameOver.value || !gameStarted.value) return

  // Initialize lastCellUpdate on first update
  if (lastCellUpdate === 0) {
    lastCellUpdate = currentTime
    return
  }

  const timeSinceLastUpdate = currentTime - lastCellUpdate

  // Only perform cell-based update when enough time has passed
  if (timeSinceLastUpdate >= cellMoveDuration) {
    // Use AI direction in debug mode
    if (DEBUG_GAME) {
      nextDirection.value = getAIDirection()
    }

    direction.value = nextDirection.value

    const head = snake.value[0]!
    const newHead: Position = { ...head }

    // Move head based on direction
    switch (direction.value) {
      case 'up':
        newHead.y -= 1
        break
      case 'down':
        newHead.y += 1
        break
      case 'left':
        newHead.x -= 1
        break
      case 'right':
        newHead.x += 1
        break
    }

    // Check wall collision
    if (
      newHead.x < 0 ||
      newHead.x >= worldWidth ||
      newHead.y < 0 ||
      newHead.y >= worldHeight
    ) {
      gameOver.value = true
      gameOverTime = lastCellUpdate + cellMoveDuration
      return
    }

    // Check self collision
    if (
      snake.value.some(
        (segment) => segment.x === newHead.x && segment.y === newHead.y,
      )
    ) {
      gameOver.value = true
      gameOverTime = lastCellUpdate + cellMoveDuration
      return
    }

    // No collision - safe to update lastCellUpdate and add new head
    lastCellUpdate = currentTime

    // Add new head
    snake.value.unshift(newHead)

    // Increment move counter
    movesSinceFoodSpawn++

    // Check if food eaten
    if (newHead.x === food.value.x && newHead.y === food.value.y) {
      // Calculate score based on path efficiency (linear scale)
      // 0 extra moves = 100 points, decreases by 10 points per extra move
      // Capped at 10 points minimum (9+ extra moves)
      const pathDifference = movesSinceFoodSpawn - optimalPathLength
      const cappedDifference = Math.min(pathDifference, 9)
      const points = 100 - cappedDifference * 10

      // Update score
      score.value += points
      blocksEaten.value += 1
      generateFood()
      removedTail.value = null // No tail removed when eating
    } else {
      // Remove tail if no food eaten, but store it for animation
      const tail = snake.value.pop()
      removedTail.value = tail ? { ...tail } : null
    }
  }
}

const background = computed<string>(() => {
  return 'rgba(133, 144, 24, 1)'
})

// Initialize offscreen canvases
function initOffscreenCanvases() {
  // Score area canvas (full width including border/padding, one cell height)
  scoreCanvas = document.createElement('canvas')
  scoreCanvas.width = canvasWidth.value
  scoreCanvas.height = cellSize

  // Snake canvas - same size as the main canvas (including score area)
  const gameAreaWidth =
    worldWidth * cellSize + (gameWorldBorder + gameWorldPadding) * 2
  const gameAreaHeight =
    scoreAreaHeight * cellSize +
    (gameWorldBorder + gameWorldPadding) * 2 +
    worldHeight * cellSize
  snakeCanvas = new OffscreenCanvas(gameAreaWidth, gameAreaHeight)
}

// Load and process logo
async function initLogo() {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => {
      logoCanvas = new OffscreenCanvas(img.width, img.height)
      const ctx = logoCanvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        resolve()
        return
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0)

      // Get image data and replace white with background color
      const imageData = ctx.getImageData(0, 0, img.width, img.height)
      const data = imageData.data

      // Parse background color (assuming it's rgb or rgba string)
      const bgColor = background.value
      // Extract RGB values from the background color string
      const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      const bgR = match ? Number.parseInt(match[1]!) : 0
      const bgG = match ? Number.parseInt(match[2]!) : 0
      const bgB = match ? Number.parseInt(match[3]!) : 0

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!
        const g = data[i + 1]!
        const b = data[i + 2]!
        const a = data[i + 3]!

        // If pixel is white (high brightness), replace with background color
        const brightness = (r + g + b) / 3
        if (a > 0 && brightness > 200) {
          data[i] = bgR
          data[i + 1] = bgG
          data[i + 2] = bgB
          data[i + 3] = 255
        }
      }

      ctx.putImageData(imageData, 0, 0)
      resolve()
    }
    img.src = logoUrl
  })
}

// Draw score area to offscreen canvas
function drawScoreArea() {
  if (!scoreCanvas) return
  const ctx = scoreCanvas.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.fillStyle = background.value
  ctx.fillRect(0, 0, scoreCanvas.width, scoreCanvas.height)

  // Draw score (left-aligned)
  const scoreText = 'Score: ' + score.value.toString()
  drawTextPixels(ctx, scoreText, 0, 2, blackColor, 'left')

  // Draw blocks eaten (right-aligned)
  const blocksText = blocksEaten.value.toString()
  const rightAlignX = worldWidth * cellSize + 4
  drawTextPixels(ctx, blocksText, rightAlignX, 2, blackColor, 'right')

  lastScore = score.value
  lastBlocksEaten = blocksEaten.value
}

// Draw start screen
function drawStartScreen(ctx: CanvasRenderingContext2D, currentTime: number) {
  ctx.imageSmoothingEnabled = false
  const offset = gameWorldBorder + gameWorldPadding
  const totalWidth = worldWidth * cellSize

  const largeIconSize = 32
  const gameAreaY = scoreAreaHeight * cellSize + offset

  // Grid: 6 columns
  const numColumns = 6
  const columnWidth = totalWidth / numColumns
  const rowHeight = largeIconSize + 24 // 8px spacing between rows
  const numRows = 8 // Grid rows

  // All icons move at the same speed
  const speed = 25 // pixels per second
  // Wrap height = total grid height so wrapping is seamless
  const wrapHeight = numRows * rowHeight

  // Draw checkerboard grid
  let positionIndex = 0
  for (let row = 0; row < numRows; row++) {
    for (let col = 0; col < numColumns; col++) {
      // Only draw on "black" squares (checkerboard pattern)
      if ((row + col) % 2 === 0) {
        // Cycle through available icons
        const iconIndex = positionIndex % iconCount

        // X base position (centered in column)
        const xBase =
          offset + col * columnWidth + (columnWidth - largeIconSize) / 2

        // Add sine wave horizontal motion (-32 to +32 pixels)
        const sineFrequency = 0.001 // Adjust speed of sine wave
        const sinePhase = positionIndex * 0.6 // Different phase per icon
        const xOffset = Math.cos(currentTime * sineFrequency + sinePhase) * 24
        const x = xBase + xOffset

        // Y base position
        const baseY = row * rowHeight

        // Animate downward with wrapping
        const yProgress = (currentTime / 1000) * speed
        const wrappedY = (baseY + yProgress) % wrapHeight

        // Position relative to game area, starting from above the screen
        const y = wrappedY + gameAreaY - largeIconSize * 2

        drawIcon(ctx, iconIndex, x, y, true)

        positionIndex++
      }
    }
  }

  // Draw logo at 0,0 (after icons so it appears on top)
  if (logoCanvas) {
    ctx.drawImage(logoCanvas, 0, 0)
  }

  // Draw instructions centered
  const line1 = 'Use arrow keys to move'
  const line1Width = getTextWidth(line1)
  const line1X = Math.floor((totalWidth - line1Width) / 2) + offset
  const line2 = 'Press ESC to exit'
  const line2Width = getTextWidth(line2)
  const line2X = Math.floor((totalWidth - line2Width) / 2) + offset

  ctx.beginPath()
  ctx.rect((canvasWidth.value - (line1Width + 10)) / 2, 88, line1Width + 10, 21)
  ctx.fill()
  ctx.lineWidth = 2
  ctx.stroke()

  drawText(ctx, line1, line1X, 90, blackColor)
  drawText(ctx, line2, line2X, 100, blackColor)

  const blinkOn = currentTime % 1000 < 500
  if (blinkOn) {
    const spaceText = 'Press SPACE to start'
    const spaceTextWidth = Math.round(getTextWidth(spaceText))
    const spaceTextX = Math.round((canvasWidth.value - spaceTextWidth) / 2)

    // Draw box around text
    ctx.fillStyle = background.value
    ctx.strokeStyle = blackColor
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.rect(spaceTextX - 3, 117, spaceTextWidth + 6, 13)
    ctx.fill()
    ctx.stroke()

    // Draw text
    drawTextPixels(
      ctx,
      spaceText,
      canvasWidth.value / 2,
      120,
      blackColor,
      'center',
    )
  }
}

// Draw game
function draw(currentTime: number) {
  const ctx = canvasDisplay.value?.getContext('2d')
  if (!ctx) return

  // Show start screen if game hasn't started
  if (!gameStarted.value) {
    // Clear canvas
    ctx.fillStyle = background.value
    ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value)
    drawStartScreen(ctx, currentTime)
    return
  }

  // Calculate interpolation progress from time (0 to 1)
  let movementProgress = 0
  if (lastCellUpdate > 0) {
    // Use gameOverTime if game is over, otherwise use current time
    const timeToUse =
      gameOver.value && gameOverTime > 0 ? gameOverTime : currentTime
    const timeSinceLastUpdate = timeToUse - lastCellUpdate
    movementProgress = Math.min(timeSinceLastUpdate / cellMoveDuration, 1)
  }

  // Update score area if changed
  if (score.value !== lastScore || blocksEaten.value !== lastBlocksEaten) {
    drawScoreArea()
  }

  const offset = gameWorldBorder + gameWorldPadding

  // Clear only the game area (not the score area)
  const gameAreaY = scoreAreaHeight * cellSize
  const gameAreaHeight = canvasHeight.value - gameAreaY
  ctx.fillStyle = background.value
  ctx.fillRect(0, gameAreaY, canvasWidth.value, gameAreaHeight)

  // Draw border around game world
  if (gameWorldBorder > 0) {
    ctx.fillStyle = blackColor
    const borderX = 0
    const borderY = scoreAreaHeight * cellSize
    const borderWidth =
      worldWidth * cellSize + (gameWorldBorder + gameWorldPadding) * 2
    const borderHeight =
      worldHeight * cellSize + (gameWorldBorder + gameWorldPadding) * 2

    // Top border
    ctx.fillRect(borderX, borderY, borderWidth, gameWorldBorder)
    // Bottom border
    ctx.fillRect(
      borderX,
      borderY + borderHeight - gameWorldBorder,
      borderWidth,
      gameWorldBorder,
    )
    // Left border
    ctx.fillRect(borderX, borderY, gameWorldBorder, borderHeight)
    // Right border
    ctx.fillRect(
      borderX + borderWidth - gameWorldBorder,
      borderY,
      gameWorldBorder,
      borderHeight,
    )
  }

  // Build array of render positions (including interpolation)
  const renderPositions: { x: number; y: number }[] = []

  // Add removed tail if it exists
  if (removedTail.value) {
    const currentTail = snake.value[snake.value.length - 1]
    if (currentTail) {
      const dx = currentTail.x - removedTail.value.x
      const dy = currentTail.y - removedTail.value.y
      const renderX = removedTail.value.x + dx * movementProgress
      const renderY = removedTail.value.y + dy * movementProgress
      renderPositions.push({ x: renderX, y: renderY })
    }
  }

  // Add all snake segments (in reverse order - tail to head)
  for (let i = snake.value.length - 1; i >= 0; i--) {
    const segment = snake.value[i]!
    let renderX = segment.x
    let renderY = segment.y

    // Interpolate head position
    if (i === 0) {
      const dx =
        direction.value === 'left' ? 1 : direction.value === 'right' ? -1 : 0
      const dy =
        direction.value === 'up' ? 1 : direction.value === 'down' ? -1 : 0
      renderX = segment.x + dx * (1 - movementProgress)
      renderY = segment.y + dy * (1 - movementProgress)
    }

    renderPositions.push({ x: renderX, y: renderY })
  }

  const SNAKE_DEBUG = false

  // Draw snake to offscreen canvas with 1-bit conversion
  if (snakeCanvas) {
    const snakeCtx = SNAKE_DEBUG
      ? ctx
      : snakeCanvas.getContext('2d', {
          willReadFrequently: true,
        })
    if (snakeCtx) {
      // Clear offscreen canvas
      snakeCtx.clearRect(0, 0, snakeCanvas.width, snakeCanvas.height)

      // Draw snake
      snakeCtx.strokeStyle = blackColor
      snakeCtx.lineCap = 'round'
      snakeCtx.lineJoin = 'round'

      snakeCtx.beginPath()

      if (renderPositions.length > 0) {
        const offset = gameWorldBorder + gameWorldPadding
        const firstPos = renderPositions[0]!
        // Round to whole pixels to avoid subpixel antialiasing during interpolation
        const startX = Math.round(firstPos.x * cellSize + cellSize / 2 + offset)
        const startY = Math.round(
          (firstPos.y + scoreAreaHeight) * cellSize + cellSize / 2 + offset,
        )

        snakeCtx.moveTo(startX, startY)

        for (let i = 1; i < renderPositions.length; i++) {
          const pos = renderPositions[i]!
          const x = Math.round(pos.x * cellSize + cellSize / 2 + offset)
          const y = Math.round(
            (pos.y + scoreAreaHeight) * cellSize + cellSize / 2 + offset,
          )
          snakeCtx.lineTo(x, y)
        }

        // Connecting line.

        // Body border.
        snakeCtx.lineCap = 'round'
        snakeCtx.lineJoin = 'round'
        snakeCtx.lineDashOffset = 0
        snakeCtx.lineWidth = 12
        snakeCtx.setLineDash([400000])
        snakeCtx.stroke()

        // Body inner.
        snakeCtx.strokeStyle = 'white'
        snakeCtx.lineDashOffset = 0
        snakeCtx.lineWidth = 10
        snakeCtx.stroke()

        // Inner.
        snakeCtx.lineWidth = 6
        snakeCtx.strokeStyle = 'black'
        snakeCtx.lineDashOffset = -0
        snakeCtx.setLineDash([4, 8])
        snakeCtx.stroke()

        // Inner.
        snakeCtx.lineWidth = 2
        snakeCtx.strokeStyle = 'black'
        snakeCtx.lineDashOffset = -0
        snakeCtx.setLineDash([])
        snakeCtx.stroke()

        // Draw snake head with animated mouth
        const headPos = renderPositions[renderPositions.length - 1]!
        const headX = Math.round(headPos.x * cellSize + cellSize / 2 + offset)
        const headY = Math.round(
          (headPos.y + scoreAreaHeight) * cellSize + cellSize / 2 + offset,
        )
        const headRadius = cellSize / 2

        snakeCtx.setLineDash([])
        snakeCtx.fillStyle = blackColor

        // Animate mouth opening/closing (0 to 1)
        const mouthCycle = (currentTime % 600) / 600
        const mouthOpen = Math.sin(mouthCycle * Math.PI * 2) * 0.5 + 0.5
        const maxMouthAngle = Math.PI / 3 // 60 degrees max
        const mouthAngle = mouthOpen * maxMouthAngle

        snakeCtx.fillStyle = 'white'
        snakeCtx.beginPath()
        snakeCtx.arc(headX, headY, cellSize / 2 - 2, 0, Math.PI * 2)
        snakeCtx.fill()

        // Calculate rotation based on direction
        let rotation = 0
        switch (direction.value) {
          case 'right':
            rotation = 0
            break
          case 'down':
            rotation = Math.PI / 2
            break
          case 'left':
            rotation = Math.PI
            break
          case 'up':
            rotation = -Math.PI / 2
            break
        }

        // Draw animated mouth opening
        const jawLength = headRadius + 2
        const mouthOffset = -1 // Positive = forward (outside), negative = backward (inside)

        // Calculate mouth center position
        const mouthCenterX = headX + Math.cos(rotation) * mouthOffset
        const mouthCenterY = headY + Math.sin(rotation) * mouthOffset

        // Calculate jaw endpoints
        const upperJawX =
          mouthCenterX + Math.cos(rotation - mouthAngle / 2) * jawLength
        const upperJawY =
          mouthCenterY + Math.sin(rotation - mouthAngle / 2) * jawLength
        const lowerJawX =
          mouthCenterX + Math.cos(rotation + mouthAngle / 2) * jawLength
        const lowerJawY =
          mouthCenterY + Math.sin(rotation + mouthAngle / 2) * jawLength

        // Fill inside of mouth with white
        snakeCtx.fillStyle = 'white'
        snakeCtx.beginPath()
        snakeCtx.moveTo(mouthCenterX, mouthCenterY)
        snakeCtx.lineTo(upperJawX, upperJawY)
        snakeCtx.lineTo(lowerJawX, lowerJawY)
        snakeCtx.closePath()
        snakeCtx.fill()

        // Draw jaw lines in black
        snakeCtx.strokeStyle = blackColor
        snakeCtx.lineWidth = 1
        snakeCtx.lineCap = 'round'

        // Upper jaw
        snakeCtx.beginPath()
        snakeCtx.moveTo(mouthCenterX, mouthCenterY)
        snakeCtx.lineTo(upperJawX, upperJawY)
        snakeCtx.stroke()

        // Lower jaw
        snakeCtx.beginPath()
        snakeCtx.moveTo(mouthCenterX, mouthCenterY)
        snakeCtx.lineTo(lowerJawX, lowerJawY)
        snakeCtx.stroke()
      }

      if (!SNAKE_DEBUG) {
        // Apply 1-bit conversion to remove antialiasing
        const imageData = snakeCtx.getImageData(
          0,
          0,
          snakeCanvas.width,
          snakeCanvas.height,
        )
        const data = imageData.data

        const THRESHOLD = 100

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]!
          const g = data[i + 1]!
          const b = data[i + 2]!
          const a = data[i + 3]!
          const brightness = (r + g + b) / 3

          if (a > THRESHOLD && brightness < THRESHOLD) {
            data[i] = 0
            data[i + 1] = 0
            data[i + 2] = 0
            data[i + 3] = 255
          } else {
            data[i] = 0
            data[i + 1] = 0
            data[i + 2] = 0
            data[i + 3] = 0
          }
        }

        snakeCtx.putImageData(imageData, 0, 0)

        // Draw to main canvas
        ctx.drawImage(
          snakeCanvas,
          0,
          0, // source x, y
          snakeCanvas.width,
          snakeCanvas.height, // source width, height
          0,
          0, // destination x, y
          snakeCanvas.width,
          snakeCanvas.height, // destination width, height
        )
      }
    }
  }

  // Draw food icon directly to main canvas
  const foodX = food.value.x * cellSize + offset
  const foodY = (food.value.y + scoreAreaHeight) * cellSize + offset
  drawIcon(ctx, currentBlockIndex.value, foodX, foodY)

  // Copy score canvas to main canvas at top
  if (scoreCanvas) {
    ctx.drawImage(scoreCanvas, 0, 0)
  }

  // Draw game over overlay
  if (gameOver.value) {
    const totalWidth = worldWidth * cellSize

    // Draw "GAME OVER" scaled 3x, centered
    const gameOverText = 'GAME OVER'
    const gameOverWidth = getTextWidth(gameOverText) * 3
    const gameOverX = Math.floor((totalWidth - gameOverWidth) / 2) + offset
    drawText(
      ctx,
      gameOverText,
      gameOverX,
      3 * cellSize,
      blackColor,
      background.value,
      1,
      2,
      3,
    )

    // Draw "Press SPACE to try again" below, centered
    const retryText = 'Press SPACE to try again'
    const retryWidth = getTextWidth(retryText)
    const retryX = Math.floor((totalWidth - retryWidth) / 2) + offset
    drawText(
      ctx,
      retryText,
      retryX,
      8 * cellSize,
      blackColor,
      background.value,
      1,
      2,
    )
  }
}

// Handle keyboard input
function handleKeyPress(e: KeyboardEvent) {
  e.stopPropagation()
  const key = e.key
  if ((key === 'r' || key === 'R') && (e.metaKey || e.ctrlKey)) {
    return
  }

  if (key === 'Escape') {
    e.preventDefault()
    emit('close')
    return
  }

  if (key === ' ' && gameOver.value) {
    e.preventDefault()
    resetGame()
    gameStarted.value = true
    return
  }

  // Start game on space or arrow key press
  if (
    !gameStarted.value &&
    (key === ' ' ||
      key === 'ArrowUp' ||
      key === 'ArrowDown' ||
      key === 'ArrowLeft' ||
      key === 'ArrowRight')
  ) {
    e.preventDefault()
    gameStarted.value = true
    return
  }

  if (key === 'ArrowUp' && direction.value !== 'down') {
    e.preventDefault()
    nextDirection.value = 'up'
  } else if (key === 'ArrowDown' && direction.value !== 'up') {
    e.preventDefault()
    nextDirection.value = 'down'
  } else if (key === 'ArrowLeft' && direction.value !== 'right') {
    e.preventDefault()
    nextDirection.value = 'left'
  } else if (key === 'ArrowRight' && direction.value !== 'left') {
    e.preventDefault()
    nextDirection.value = 'right'
  }
}

onMounted(async () => {
  keyboard.lockKeyboardEvents('konami')
  document.addEventListener('keydown', handleKeyPress, { capture: true })

  console.log(
    'Virtual screen resolution:',
    canvasWidth.value,
    'x',
    canvasHeight.value,
  )

  await initIcons()
  await initLogo()

  // Initialize offscreen canvases
  initOffscreenCanvases()

  resetGame()

  // Draw initial score area
  drawScoreArea()

  // Debug: render all icons
  if (DEBUG_ICONS && debugCanvas.value) {
    const ctx = debugCanvas.value.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, debugCanvas.value.width, debugCanvas.value.height)

      const iconsPerRow = 7

      // Draw small icons
      for (let i = 0; i < iconCount; i++) {
        const row = Math.floor(i / iconsPerRow)
        const col = i % iconsPerRow
        const x = col * (largeIconSize + 10) + 5
        const y = row * (cellSize + 10) + 5
        drawIcon(ctx, i, x, y, false)
      }

      // Draw large icons
      const smallRows = Math.ceil(iconCount / iconsPerRow)
      const largeIconsStartY = smallRows * (cellSize + 10) + 10
      for (let i = 0; i < iconCount; i++) {
        const row = Math.floor(i / iconsPerRow)
        const col = i % iconsPerRow
        const x = col * (largeIconSize + 10) + 5
        const y = largeIconsStartY + row * (largeIconSize + 10)
        drawIcon(ctx, i, x, y, true)
      }
    }
  }

  isLoaded = true
})

onUnmounted(() => {
  keyboard.unlockKeyboardEvents('konami')
  document.removeEventListener('keydown', handleKeyPress, { capture: true })
})

onBlokkliEvent('canvas:draw', (e) => {
  if (!isLoaded) return

  const time = e.time

  // Update game logic
  update(time)

  // Draw every frame
  draw(time)
})
</script>

export class QuarantineManager {
  // Параметры карантинных зон
  private blueRect = { x: 150, y: 150, width: 150, height: 100 } // Для здоровых
  private greenRect = { x: 500, y: 250, width: 150, height: 100 } // Для зараженных

  /**
   * Проверяет, находится ли точка внутри любой карантинной зоны
   * @param x Координата X точки
   * @param y Координата Y точки
   * @returns true, если точка внутри зоны
   */
  isPointInRectangles(x: number, y: number): boolean {
    return this.isPointInRect(x, y, this.blueRect) || this.isPointInRect(x, y, this.greenRect)
  }

  /**
   * Проверяет, находится ли точка близко к карантинным зонам
   * @param x Координата X точки
   * @param y Координата Y точки
   * @param distance Дистанция для проверки
   * @returns true, если точка рядом с зоной
   */
  isPointNearRectangles(x: number, y: number, distance: number): boolean {
    return (
      this.isPointNearRect(x, y, this.blueRect, distance) ||
      this.isPointNearRect(x, y, this.greenRect, distance)
    )
  }

  /**
   * Отрисовывает карантинные зоны на canvas
   * @param ctx Контекст canvas
   */
  drawRectangles(ctx: CanvasRenderingContext2D) {
    // Синий прямоугольник (для здоровых)
    ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'
    ctx.fillRect(this.blueRect.x, this.blueRect.y, this.blueRect.width, this.blueRect.height)
    ctx.strokeStyle = 'blue'
    ctx.lineWidth = 2
    ctx.strokeRect(this.blueRect.x, this.blueRect.y, this.blueRect.width, this.blueRect.height)

    // Красный прямоугольник (для зараженных)
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
    ctx.fillRect(this.greenRect.x, this.greenRect.y, this.greenRect.width, this.greenRect.height)
    ctx.strokeStyle = 'red'
    ctx.lineWidth = 2
    ctx.strokeRect(this.greenRect.x, this.greenRect.y, this.greenRect.width, this.greenRect.height)
  }

  /**
   * Возвращает параметры зоны для здоровых
   */
  getHealthyZone() {
    return this.blueRect
  }

  /**
   * Возвращает параметры зоны для зараженных
   */
  getInfectedZone() {
    return this.greenRect
  }

  // Приватные вспомогательные методы

  private isPointInRect(
    x: number,
    y: number,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height
  }

  private isPointNearRect(
    x: number,
    y: number,
    rect: { x: number; y: number; width: number; height: number },
    distance: number,
  ): boolean {
    return (
      x > rect.x - distance &&
      x < rect.x + rect.width + distance &&
      y > rect.y - distance &&
      y < rect.y + rect.height + distance
    )
  }
}

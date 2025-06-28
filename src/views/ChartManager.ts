export class ChartManager {
  private ctx: CanvasRenderingContext2D
  private canvas: HTMLCanvasElement
  private colors: {
    healthy: string
    infected: string
    immune: string
    dead: string
  }
  private fillColors: {
    healthy: string
    infected: string
    immune: string
    dead: string
  }
  private maxHistoryLength: number

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.colors = {
      healthy: 'rgba(52, 152, 219, 0.7)',
      infected: 'rgba(231, 76, 60, 0.7)',
      immune: 'rgba(46, 204, 113, 0.7)',
      dead: 'rgba(34, 34, 34, 0.7)',
    }
    this.fillColors = {
      healthy: 'rgba(52, 152, 219, 0.2)',
      infected: 'rgba(231, 76, 60, 0.2)',
      immune: 'rgba(46, 204, 113, 0.2)',
      dead: 'rgba(34, 34, 34, 0.2)',
    }
    this.maxHistoryLength = 100
  }

  init() {
    this.clearCanvas()
    this.drawBorder()
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  drawBorder() {
    this.ctx.strokeStyle = '#343'
    this.ctx.lineWidth = 3
    this.ctx.strokeRect(0, 0, this.canvas.width, this.canvas.height)
  }

  drawChart(
    history: Array<{
      healthy: number
      infected: number
      immune: number
      dead: number
      time: number
    }>,
    totalPeople: number,
    currentCounts: {
      healthy: number
      infected: number
      immune: number
      dead: number
    },
  ) {
    this.clearCanvas()
    this.drawBorder()

    if (history.length < 2) return

    const padding = 40
    const chartWidth = this.canvas.width - 2 * padding
    const chartHeight = this.canvas.height - 2 * padding

    this.drawAxes(padding, chartWidth, chartHeight)
    this.drawYAxisLabels(padding, chartHeight, totalPeople)
    this.drawAreas(history, padding, chartWidth, chartHeight, totalPeople)
    this.drawLegend(currentCounts)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private drawAxes(padding: number, chartWidth: number, chartHeight: number) {
    this.ctx.beginPath()
    this.ctx.moveTo(padding, padding)
    this.ctx.lineTo(padding, this.canvas.height - padding)
    this.ctx.lineTo(this.canvas.width - padding, this.canvas.height - padding)
    this.ctx.strokeStyle = '#000'
    this.ctx.lineWidth = 1
    this.ctx.stroke()

    // Подписи осей
    this.ctx.font = '12px Arial'
    this.ctx.fillStyle = '#000'
    this.ctx.save()
    this.ctx.translate(10, this.canvas.height / 2)
    this.ctx.rotate(-Math.PI / 2)
    this.ctx.fillText('Количество людей', 0, 0)
    this.ctx.restore()
  }

  private drawYAxisLabels(padding: number, chartHeight: number, totalPeople: number) {
    const yAxisSteps = 5
    this.ctx.font = '10px Arial'
    this.ctx.fillStyle = '#000'
    this.ctx.textAlign = 'right'
    this.ctx.textBaseline = 'middle'

    for (let i = 0; i <= yAxisSteps; i++) {
      const value = Math.round((i / yAxisSteps) * totalPeople)
      const y = this.canvas.height - padding - (i / yAxisSteps) * chartHeight

      this.ctx.fillText(value.toString(), padding - 5, y)

      // Горизонтальные линии сетки
      this.ctx.beginPath()
      this.ctx.moveTo(padding, y)
      this.ctx.lineTo(this.canvas.width - padding, y)
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
      this.ctx.lineWidth = 1
      this.ctx.stroke()
    }
    this.ctx.textAlign = 'left'
  }

  private drawAreas(
    history: Array<{
      healthy: number
      infected: number
      immune: number
      dead: number
      time: number
    }>,
    padding: number,
    chartWidth: number,
    chartHeight: number,
    totalPeople: number,
  ) {
    const minTime = history[0].time
    const maxTime = history[history.length - 1].time
    const timeRange = maxTime - minTime

    const drawArea = (
      property: 'healthy' | 'infected' | 'immune' | 'dead',
      color: string,
      fillColor: string,
    ) => {
      this.ctx.beginPath()

      // Рисуем линию графика
      for (let i = 0; i < history.length; i++) {
        const point = history[i]
        const x = padding + ((point.time - minTime) / timeRange) * chartWidth
        const y = this.canvas.height - padding - (point[property] / totalPeople) * chartHeight

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }

      // Замыкаем область для заливки
      const lastPoint = history[history.length - 1]
      const lastX = padding + ((lastPoint.time - minTime) / timeRange) * chartWidth
      this.ctx.lineTo(lastX, this.canvas.height - padding)
      this.ctx.lineTo(padding, this.canvas.height - padding)
      this.ctx.closePath()

      // Заливаем область
      this.ctx.fillStyle = fillColor
      this.ctx.fill()

      // Рисуем линию поверх заливки
      this.ctx.beginPath()
      for (let i = 0; i < history.length; i++) {
        const point = history[i]
        const x = padding + ((point.time - minTime) / timeRange) * chartWidth
        const y = this.canvas.height - padding - (point[property] / totalPeople) * chartHeight

        if (i === 0) {
          this.ctx.moveTo(x, y)
        } else {
          this.ctx.lineTo(x, y)
        }
      }
      this.ctx.strokeStyle = color
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }

    // Рисуем все графики (снизу вверх)
    drawArea('dead', this.colors.dead, this.fillColors.dead)
    drawArea('immune', this.colors.immune, this.fillColors.immune)
    drawArea('infected', this.colors.infected, this.fillColors.infected)
    drawArea('healthy', this.colors.healthy, this.fillColors.healthy)
  }

  private drawLegend(currentCounts: {
    healthy: number
    infected: number
    immune: number
    dead: number
  }) {
    const legendX = this.canvas.width - 150
    const legendY = 20
    const legendItemHeight = 20

    const drawLegendItem = (
      text: string,
      color: string,
      fillColor: string,
      y: number,
      count: number,
    ) => {
      this.ctx.fillStyle = fillColor
      this.ctx.font = '14px Arial'
      this.ctx.fillRect(legendX, y, 15, 15)
      this.ctx.strokeStyle = color
      this.ctx.strokeRect(legendX, y, 15, 15)
      this.ctx.fillStyle = '#000'
      this.ctx.fillText(`${text}: ${count}`, legendX + 20, y + 12)
    }

    // Рисуем все элементы легенды
    drawLegendItem(
      'Здоровые',
      this.colors.healthy,
      this.fillColors.healthy,
      legendY,
      currentCounts.healthy,
    )
    drawLegendItem(
      'Зараженные',
      this.colors.infected,
      this.fillColors.infected,
      legendY + legendItemHeight,
      currentCounts.infected,
    )
    drawLegendItem(
      'Иммунные',
      this.colors.immune,
      this.fillColors.immune,
      legendY + 2 * legendItemHeight,
      currentCounts.immune,
    )
    drawLegendItem(
      'Умершие',
      this.colors.dead,
      this.fillColors.dead,
      legendY + 3 * legendItemHeight,
      currentCounts.dead,
    )
  }
}

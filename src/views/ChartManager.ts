export class ChartManager {
  private ctx: CanvasRenderingContext2D // Контекст рисования canvas
  private canvas: HTMLCanvasElement // Ссылка на элемент canvas
  private colors: {
    // Цвета линий для каждого типа данных
    healthy: string
    infected: string
    immune: string
    dead: string
  }
  // Цвета заливки для областей под графиками
  private fillColors: {
    healthy: string
    infected: string
    immune: string
    dead: string
  }
  private maxHistoryLength: number // Максимальная длина истории данных для отображения

  constructor(canvas: HTMLCanvasElement) {
    //param canvas - HTMLCanvasElement, на котором будет рисоваться график
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.colors = {
      // Настройка цветов линий
      healthy: 'rgba(52, 152, 219, 0.7)',
      infected: 'rgba(231, 76, 60, 0.7)',
      immune: 'rgba(46, 204, 113, 0.7)',
      dead: 'rgba(34, 34, 34, 0.7)',
    }
    this.fillColors = {
      // Настройка цветов заливки (более прозрачные)
      healthy: 'rgba(52, 152, 219, 0.2)',
      infected: 'rgba(231, 76, 60, 0.2)',
      immune: 'rgba(46, 204, 113, 0.2)',
      dead: 'rgba(34, 34, 34, 0.2)',
    }
    this.maxHistoryLength = 100
  }

  init() {
    //Инициализация графика - очистка и рисование рамки
    this.clearCanvas()
    this.drawBorder()
  }

  clearCanvas() {
    //Очищяем
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  drawBorder() {
    //Рисует рамку вокруг области графика
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
    // Очищаем canvas и рисуем рамку
    this.clearCanvas()
    this.drawBorder()

    if (history.length < 2) return // Если данных меньше 2 точек, график не рисуем

    const padding = 40 // Отступы от краев canvas
    const chartWidth = this.canvas.width - 2 * padding // Ширина и высота области графика
    const chartHeight = this.canvas.height - 2 * padding
    // Рисуем компоненты графика
    this.drawAxes(padding, chartWidth, chartHeight) // Оси координат
    this.drawYAxisLabels(padding, chartHeight, totalPeople) // Подписи оси Y
    this.drawAreas(history, padding, chartWidth, chartHeight, totalPeople) // Графики
    this.drawLegend(currentCounts) // Легенда
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private drawAxes(padding: number, chartWidth: number, chartHeight: number) {
    this.ctx.beginPath() // Начинаем новый путь
    this.ctx.moveTo(padding, padding) // Перемещаемся к началу оси Y (левый верхний угол графика)
    this.ctx.lineTo(padding, this.canvas.height - padding) // Рисуем ось Y (вертикальная линия)
    this.ctx.lineTo(this.canvas.width - padding, this.canvas.height - padding) // Рисуем ось X (горизонтальная линия)
    // Настройки стиля линий
    this.ctx.strokeStyle = '#000' // Черный цвет
    this.ctx.lineWidth = 1 // Толщина линии
    this.ctx.stroke() // Отрисовываем линии

    // Подписи осей
    this.ctx.font = '12px Arial'
    this.ctx.fillStyle = '#000'
    this.ctx.save() // Сохраняем текущее состояние контекста
    this.ctx.translate(10, this.canvas.height / 2) // Смещаем начало координат
    this.ctx.rotate(-Math.PI / 2) // Поворачиваем на 90 градусов против часовой
    this.ctx.fillText('Количество людей', 0, 0)
    this.ctx.restore() // Восстанавливаем состояние контекста
  }

  private drawYAxisLabels(padding: number, chartHeight: number, totalPeople: number) {
    const yAxisSteps = 5 // Количество делений на оси Y
    this.ctx.font = '10px Arial'
    this.ctx.fillStyle = '#000'
    this.ctx.textAlign = 'right' // Выравнивание текста по правому краю
    this.ctx.textBaseline = 'middle' // Выравнивание по вертикали по центру
    // Рисуем деления и подписи
    for (let i = 0; i <= yAxisSteps; i++) {
      const value = Math.round((i / yAxisSteps) * totalPeople) // Вычисляем значение для подписи
      const y = this.canvas.height - padding - (i / yAxisSteps) * chartHeight // Вычисляем Y-координату для деления

      this.ctx.fillText(value.toString(), padding - 5, y) // Рисуем подпись

      // Горизонтальные линии сетки
      this.ctx.beginPath() // Начинаем новый путь (контур) для рисования линии
      this.ctx.moveTo(padding, y) // Устанавливаем начальную точку линии
      this.ctx.lineTo(this.canvas.width - padding, y) // Рисуем линию до конечной точки
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)' // Устанавливаем стиль линии
      this.ctx.lineWidth = 1 // Устанавливаем толщину линии в 1 пиксель
      this.ctx.stroke() // Выполняем отрисовку линии с текущими параметрами
    }
    this.ctx.textAlign = 'left' // Возвращаем выравнивание по умолчанию
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
    // Находим минимальное и максимальное время для масштабирования по оси X
    const minTime = history[0].time
    const maxTime = history[history.length - 1].time
    const timeRange = maxTime - minTime

    const drawArea = (
      property: 'healthy' | 'infected' | 'immune' | 'dead',
      color: string,
      fillColor: string,
    ) => {
      this.ctx.beginPath() // Начинаем новый путь для заливки

      // Рисуем линию графика
      for (let i = 0; i < history.length; i++) {
        const point = history[i]
        const x = padding + ((point.time - minTime) / timeRange) * chartWidth // Вычисляем X-координату (масштабируем время)
        const y = this.canvas.height - padding - (point[property] / totalPeople) * chartHeight // Вычисляем Y-координату (масштабируем значение)

        if (i === 0) {
          this.ctx.moveTo(x, y) // Первая точка
        } else {
          this.ctx.lineTo(x, y) // Следующие точки
        }
      }

      // Замыкаем область для заливки
      const lastPoint = history[history.length - 1] // Получаем последнюю точку из истории данных
      const lastX = padding + ((lastPoint.time - minTime) / timeRange) * chartWidth // Вычисляем X-координату последней точки
      this.ctx.lineTo(lastX, this.canvas.height - padding) // Рисуем линию от последней точки графика до нижнего правого угла области графика
      this.ctx.lineTo(padding, this.canvas.height - padding) // Рисуем линию до нижнего левого угла (замыкаем фигуру)
      this.ctx.closePath()

      // Заливаем область
      this.ctx.fillStyle = fillColor // Устанавливаем цвет заливки для области под графиком
      this.ctx.fill() // Выполняем заливку замкнутой области текущим fillStyle

      // Рисуем линию поверх заливки
      this.ctx.beginPath()
      for (let i = 0; i < history.length; i++) {
        // Перебираем все точки истории для построения линии
        const point = history[i]
        const x = padding + ((point.time - minTime) / timeRange) * chartWidth // Вычисляем X-координату текущей точки (аналогично lastX)
        const y = this.canvas.height - padding - (point[property] / totalPeople) * chartHeight // Вычисляем Y-координату

        if (i === 0) {
          // Для первой точки устанавливаем начало пути
          this.ctx.moveTo(x, y)
        } else {
          // Для остальных точек рисуем линию к следующей точке
          this.ctx.lineTo(x, y)
        }
      }
      this.ctx.strokeStyle = color // Устанавливаем цвет линии графика
      this.ctx.lineWidth = 2 // Устанавливаем толщину линии в 2 пикселя
      this.ctx.stroke() // Отрисовываем линию графика с заданными параметрами
    }

    // Рисуем все графики (снизу вверх)
    drawArea('dead', this.colors.dead, this.fillColors.dead)
    drawArea('immune', this.colors.immune, this.fillColors.immune)
    drawArea('infected', this.colors.infected, this.fillColors.infected)
    drawArea('healthy', this.colors.healthy, this.fillColors.healthy)
  }
  // Объявление метода для отрисовки легенды графика
  private drawLegend(currentCounts: {
    healthy: number
    infected: number
    immune: number
    dead: number
  }) {
    const legendX = this.canvas.width - 150 // X-координата начала легенды (150px от правого края canvas)
    const legendY = 20 // Y-координата первого элемента легенды (20px от верхнего края)
    const legendItemHeight = 20 // Высота одного элемента легенды (расстояние между строками)
    // Вспомогательная функция для отрисовки одного элемента легенды
    const drawLegendItem = (
      text: string,
      color: string,
      fillColor: string,
      y: number,
      count: number,
    ) => {
      this.ctx.fillStyle = fillColor // Установка цвета заливки для прямоугольника-индикатора
      this.ctx.font = '14px Arial'
      this.ctx.fillRect(legendX, y, 15, 15) // Отрисовка залитого прямоугольника-индикатора
      this.ctx.strokeStyle = color // Установка цвета рамки прямоугольника-индикатора
      this.ctx.strokeRect(legendX, y, 15, 15) // Отрисовка рамки прямоугольника-индикатора
      this.ctx.fillStyle = '#000' // Установка черного цвета для текста
      this.ctx.fillText(`${text}: ${count}`, legendX + 20, y + 12) // Отрисовка текста легенды (название и значение)
    }

    // Рисуем все элементы легенды
    drawLegendItem(
      'Здоровые',
      this.colors.healthy, // Цвет линии (из настроек класса)
      this.fillColors.healthy, // Цвет заливки (из настроек класса)
      legendY, // Позиция Y (первая строка)
      currentCounts.healthy, // Текущее количество здоровых
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

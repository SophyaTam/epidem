<template>
  <!-- Основной контейнер приложения -->
  <div class="simulation-container">
    <!-- Заголовок симуляции -->
    <h1>Модель эпидемии с карантинными зонами</h1>

    <!-- Контейнер для основного содержимого -->
    <div class="content-wrapper">
      <!-- Холст для отрисовки симуляции -->
      <canvas ref="simulationCanvas" width="800" height="500" class="simulation-field"></canvas>

      <!-- Контейнер для графика -->
      <div class="chart-container">
        <!-- Холст для отрисовки графика -->
        <canvas ref="chartCanvas" width="400" height="500" class="chart-field"></canvas>
      </div>
    </div>

    <!-- Панель управления симуляцией -->
    <div class="controls">
      <!-- Кнопки управления -->
      <button @click="startSimulation">Старт</button>
      <button @click="stopSimulation">Стоп</button>
      <button @click="resetSimulation">Сброс</button>
    </div>
  </div>
</template>

<script lang="ts">
// Базовый класс, представляющий человека в симуляции
class Person {
  // Координаты положения
  x: number
  y: number
  // Скорость по осям
  dx: number
  dy: number
  // Размер точки
  radius: number
  // Цвет в зависимости от состояния
  color: string
  // Текущее состояние: здоровый, зараженный, с иммунитетом, мертвый
  status: 'healthy' | 'infected' | 'immune' | 'dead'
  // Время заражения (если статус infected)
  infectionTime?: number
  // Флаг нахождения в карантинной зоне
  inQuarantine: boolean
  // Границы карантинной зоны
  quarantineZone?: { x: number; y: number; width: number; height: number }
  // Флаг выхода из карантина
  exitingQuarantine: boolean
  // Флаг движения в карантин
  movingToQuarantine: boolean
  // Целевая точка в карантине
  quarantineTarget?: { x: number; y: number }

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    // Случайная начальная скорость
    this.dx = (Math.random() - 0.5) * 3
    this.dy = (Math.random() - 0.5) * 3
    this.radius = 4.5
    this.status = 'healthy'
    this.color = this.getColor()
    this.inQuarantine = false
    this.exitingQuarantine = false
    this.movingToQuarantine = false
  }

  // Возвращает цвет в зависимости от состояния
  getColor() {
    switch (this.status) {
      case 'infected':
        return 'green' // Зараженные в карантине - красные, остальные - зеленые
      case 'immune':
        return 'orange' // С иммунитетом - оранжевые
      case 'dead':
        return 'black' // Мертвые - черные
      default:
        return 'blue' // Здоровые - синие
    }
  }

  // Обновление позиции человека
  update(canvasWidth: number, canvasHeight: number) {
    if (this.status === 'dead') return

    // Если движется в карантин
    if (this.movingToQuarantine && this.quarantineTarget && this.quarantineZone) {
      const target = this.quarantineTarget

      const dx = target.x - this.x
      const dy = target.y - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < 2) {
        this.movingToQuarantine = false
        this.inQuarantine = true
      } else {
        const speed = 2
        this.dx = (dx / distance) * speed
        this.dy = (dy / distance) * speed
        this.x += this.dx
        this.y += this.dy
      }
    }
    // Если в карантине и не выходит из него
    else if (this.inQuarantine && this.quarantineZone && !this.exitingQuarantine) {
      const zone = this.quarantineZone

      this.x += this.dx
      this.y += this.dy

      // Отскок от границ карантинной зоны
      if (this.x < zone.x + this.radius || this.x > zone.x + zone.width - this.radius) this.dx *= -1
      if (this.y < zone.y + this.radius || this.y > zone.y + zone.height - this.radius)
        this.dy *= -1

      // Корректируем позицию, если вышли за границы
      this.x = Math.max(zone.x + this.radius, Math.min(zone.x + zone.width - this.radius, this.x))
      this.y = Math.max(zone.y + this.radius, Math.min(zone.y + zone.height - this.radius, this.y))
    }
    // Если выходит из карантина
    else if (this.exitingQuarantine && this.quarantineZone) {
      const zone = this.quarantineZone

      this.x += this.dx * 1.5
      this.y += this.dy * 1.5

      // Если полностью вышел из карантинной зоны
      if (
        this.x < zone.x - this.radius ||
        this.x > zone.x + zone.width + this.radius ||
        this.y < zone.y - this.radius ||
        this.y > zone.y + zone.height + this.radius
      ) {
        this.inQuarantine = false
        this.exitingQuarantine = false
        this.quarantineZone = undefined
      }
    }
    // Обычное движение вне карантинной зоны
    else {
      this.x += this.dx
      this.y += this.dy

      // Отскок от границ холста с учетом радиуса
      if (this.x < this.radius) {
        this.x = this.radius
        this.dx *= -1
      } else if (this.x > canvasWidth - this.radius) {
        this.x = canvasWidth - this.radius
        this.dx *= -1
      }

      if (this.y < this.radius) {
        this.y = this.radius
        this.dy *= -1
      } else if (this.y > canvasHeight - this.radius) {
        this.y = canvasHeight - this.radius
        this.dy *= -1
      }
    }
  }

  // Проверка на смерть (в базовом классе всегда false)
  checkDeath(): boolean {
    return false
  }

  // Отрисовка человека на холсте
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.getColor()
    ctx.fill()
  }

  // Заражение человека
  infect() {
    if (this.status === 'healthy') {
      this.status = 'infected'
      this.infectionTime = Date.now()

      // 50% шанс попасть в карантин
      if (Math.random() < 0.4) {
        this.inQuarantine = true
      }

      return true
    }
    return false
  }

  // Начать движение в карантин
  startMovingToQuarantine(zone: { x: number; y: number; width: number; height: number }) {
    this.quarantineZone = zone
    this.movingToQuarantine = true
    // Случайная точка внутри карантинной зоны
    this.quarantineTarget = {
      x: zone.x + this.radius + Math.random() * (zone.width - this.radius * 2),
      y: zone.y + this.radius + Math.random() * (zone.height - this.radius * 2),
    }
  }

  // Проверка выздоровления
  checkRecovery(recoveryTime: number, currentTime: number) {
    if (
      this.status === 'infected' &&
      this.infectionTime &&
      currentTime - this.infectionTime > recoveryTime
    ) {
      this.status = 'immune'
      this.infectionTime = undefined

      // Если был в карантине - начинаем выход
      if (this.inQuarantine) {
        this.exitingQuarantine = true
        this.movingToQuarantine = false

        // Направляем персонажа к выходу из карантинной зоны
        if (this.quarantineZone) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const zone = this.quarantineZone
          // Выбираем случайное направление для выхода
          const exitSide = Math.floor(Math.random() * 4)

          switch (exitSide) {
            case 0: // Выход влево
              this.dx = -Math.abs(this.dx)
              break
            case 1: // Выход вправо
              this.dx = Math.abs(this.dx)
              break
            case 2: // Выход вверх
              this.dy = -Math.abs(this.dy)
              break
            case 3: // Выход вниз
              this.dy = Math.abs(this.dy)
              break
          }
        }
      }

      return true
    }
    return false
  }
}

// Класс зараженного человека (наследуется от Person)
class InfectedPerson extends Person {
  constructor(x: number, y: number) {
    super(x, y)
    this.status = 'infected'
    this.infectionTime = Date.now()

    // 50% шанс попасть в карантин
    if (Math.random() < 0.5) {
      this.inQuarantine = true
    }
  }

  // У зараженных есть 2% шанс умереть при каждом обновлении
  checkDeath(): boolean {
    if (this.status === 'infected' && Math.random() < 0.02) {
      this.status = 'dead'
      this.dx = 0 // Останавливаем движение
      this.dy = 0
      this.color = this.getColor()
      return true
    }
    return false
  }
}

// Класс человека с иммунитетом (наследуется от Person)
class ImmunePerson extends Person {
  constructor(x: number, y: number) {
    super(x, y)
    this.status = 'immune'
    this.color = this.getColor()
  }
}

export default {
  data() {
    return {
      persons: [] as Person[], // Массив всех персонажей
      animationId: 0, // ID анимации симуляции
      chartAnimationId: 0, // ID анимации графика
      isRunning: false, // Флаг работы симуляции
      infectionDistance: 25, // Дистанция заражения
      infectionChance: 0.3, // Вероятность заражения
      recoveryTime: 15000, // Время выздоровления в мс
      pauseTime: 0, // Добавляем переменную для хранения времени паузы
      timeOffset: 0, // Смещение времени при паузе
      isChartPaused: false,
      lastChartTime: 0,
      history: [] as Array<{
        // История изменений для графика
        healthy: number
        infected: number
        immune: number
        dead: number
        time: number
      }>,
      maxHistoryLength: 100, // Максимальная длина истории
      // Цвета для графика
      chartColors: {
        healthy: 'rgba(0, 0, 255, 0.7)',
        infected: 'rgba(0, 255, 0, 0.7)',
        immune: 'rgba(255, 165, 0, 0.7)',
        dead: 'rgba(0, 0, 0, 0.7)',
      },
      // Цвета заливки для графика
      fillColors: {
        healthy: 'rgba(0, 0, 255, 0.2)',
        infected: 'rgba(0, 255, 0, 0.2)',
        immune: 'rgba(255, 165, 0, 0.2)',
        dead: 'rgba(0, 0, 0, 0.2)',
      },
      blueRect: { x: 150, y: 150, width: 150, height: 100 }, // Карантин для здоровых
      greenRect: { x: 500, y: 250, width: 150, height: 100 }, // Карантин для зараженных
      sentHealthyToQuarantine: false, // Флаг отправки здоровых
    }
  },

  // Вычисляемые свойства для подсчета количества людей в каждом состоянии
  computed: {
    healthyCount() {
      return this.persons.filter((p) => p.status === 'healthy').length
    },
    infectedCount() {
      return this.persons.filter((p) => p.status === 'infected').length
    },
    immuneCount() {
      return this.persons.filter((p) => p.status === 'immune').length
    },
    deadCount() {
      return this.persons.filter((p) => p.status === 'dead').length
    },
  },

  // Хук, вызываемый после монтирования компонента
  mounted() {
    this.initSimulation() // Инициализация симуляции
    this.createPersons() // Создание персонажей
    this.initChart() // Инициализация графика
  },

  // Хук, вызываемый перед удалением компонента
  beforeUnmount() {
    this.stopSimulation() // Остановка симуляции
  },

  methods: {
    // Инициализация симуляции - настройка холста
    initSimulation() {
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, canvas.width, canvas.height)

      // Рисуем карантинные зоны (прямоугольники)
      this.drawRectangles(ctx, canvas)
    },

    // Отрисовка карантинных зон (прямоугольников)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    drawRectangles(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
      // Синий прямоугольник в левом верхнем углу
      ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'
      ctx.fillRect(150, 150, 150, 100)
      ctx.strokeStyle = 'blue'
      ctx.lineWidth = 2
      ctx.strokeRect(150, 150, 150, 100)

      this.greenRect = {
        x: 500,
        y: 250,
        width: 150,
        height: 100,
      }

      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'
      ctx.fillRect(500, 250, 150, 100)
      ctx.strokeStyle = 'green'
      ctx.lineWidth = 2
      ctx.strokeRect(500, 250, 150, 100)
    },

    // Проверка, находится ли точка внутри карантинных зон
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isPointInRectangles(x: number, y: number, canvas: HTMLCanvasElement): boolean {
      const rectangles = [
        { x: 150, y: 150, width: 150, height: 100 }, // Синий прямоугольник
        this.greenRect, // Зеленый прямоугольник
      ]

      // Проверяем каждый прямоугольник
      return rectangles.some(
        (rect) => x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height,
      )
    },

    // Проверка, находится ли точка слишком близко к карантинным зонам
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isPointNearRectangles(x: number, y: number, canvas: HTMLCanvasElement): boolean {
      const rectangles = [{ x: 20, y: 20, width: 150, height: 100 }, this.greenRect]

      // Проверяем зону вокруг каждого прямоугольника
      return rectangles.some(
        (rect) =>
          x > rect.x - this.infectionDistance &&
          x < rect.x + rect.width + this.infectionDistance &&
          y > rect.y - this.infectionDistance &&
          y < rect.y + rect.height + this.infectionDistance,
      )
    },

    // Создание персонажей
    createPersons() {
      this.persons = []
      const count = 200
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement

      for (let i = 0; i < count; i++) {
        let x, y
        let attempts = 0
        const maxAttempts = 100

        // Пытаемся найти позицию вне карантинных зон
        do {
          x = Math.random() * canvas.width
          y = Math.random() * canvas.height
          attempts++
        } while (
          (this.isPointInRectangles(x, y, canvas) || this.isPointNearRectangles(x, y, canvas)) &&
          attempts < maxAttempts
        )

        // Если не нашли подходящее место - пропускаем персонажа
        if (attempts >= maxAttempts) continue

        // Первые 5 - зараженные, следующие 5 - с иммунитетом, остальные - здоровые
        if (i < 5) {
          const person = new InfectedPerson(x, y)
          // Если зараженный должен быть в карантине, начинаем движение в карантин
          if (person.inQuarantine) {
            person.startMovingToQuarantine(this.greenRect)
          }
          this.persons.push(person)
        } else if (i < 10) {
          this.persons.push(new ImmunePerson(x, y))
        } else {
          this.persons.push(new Person(x, y))
        }
      }
    },

    // Отрисовка всех персонажей
    drawPersons() {
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!

      // Очищаем холст
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Рисуем границу
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, canvas.width, canvas.height)

      // Рисуем карантинные зоны
      this.drawRectangles(ctx, canvas)

      // Рисуем всех персонажей
      this.persons.forEach((person) => person.draw(ctx))
    },

    // Обновление позиций всех персонажей
    updatePositions() {
      const currentTime = Date.now() - (this.isRunning ? 0 : this.timeOffset)
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement

      // Проверяем порог заражения для здоровых
      const infectedPercentage = (this.infectedCount / this.persons.length) * 100

      this.persons.forEach((person) => {
        if (person.status === 'infected') {
          person.checkRecovery(this.recoveryTime, currentTime)
        }
        // Также проверяем смерть
        person.checkDeath()
      })
      // Если 20% заражены и здоровых еще не отправляли
      if (infectedPercentage >= 20 && !this.sentHealthyToQuarantine) {
        this.persons.forEach((person) => {
          // Здоровые с 50% шансом идут в синий карантин
          if (person.status === 'healthy' && !person.inQuarantine) {
            if (Math.random() < 0.5) {
              person.inQuarantine = true
              person.startMovingToQuarantine(this.blueRect)
            }
          }
        })
        this.sentHealthyToQuarantine = true
      }

      // Если болезнь побеждена
      if (this.infectedCount === 0) {
        this.sentHealthyToQuarantine = false
        // Выпускаем всех из карантинов
        this.persons.forEach((person) => {
          if (person.inQuarantine && !person.exitingQuarantine) {
            person.exitingQuarantine = true
            person.inQuarantine = false

            // Направляем к выходу
            const zone = person.quarantineZone
            if (zone) {
              const exitSide = Math.floor(Math.random() * 4)
              switch (exitSide) {
                case 0:
                  person.dx = -Math.abs(person.dx)
                  break
                case 1:
                  person.dx = Math.abs(person.dx)
                  break
                case 2:
                  person.dy = -Math.abs(person.dy)
                  break
                case 3:
                  person.dy = Math.abs(person.dy)
                  break
              }
            }
          }
        })
      }

      // Обновляем позиции
      this.persons.forEach((person) => {
        if (person.status !== 'dead') {
          const prevX = person.x
          const prevY = person.y

          person.update(canvas.width, canvas.height)

          // Зараженные идут в зеленый карантин
          if (
            person.status === 'infected' &&
            person.inQuarantine &&
            !person.quarantineZone &&
            !person.movingToQuarantine
          ) {
            person.startMovingToQuarantine(this.greenRect)
          }

          // Здоровые идут в синий карантин
          if (
            person.status === 'healthy' &&
            person.inQuarantine &&
            !person.quarantineZone &&
            !person.movingToQuarantine
          ) {
            person.startMovingToQuarantine(this.blueRect)
          }

          // Проверка столкновений с карантином
          if (
            !person.inQuarantine &&
            !person.movingToQuarantine &&
            !person.exitingQuarantine &&
            this.isPointInRectangles(person.x, person.y, canvas)
          ) {
            person.x = prevX
            person.y = prevY
            person.dx *= -1
            person.dy *= -1
          }
        }
      })

      this.checkInfections()
      this.updateHistory()
    },
    // Проверка заражений между персонажами
    // Проверка заражений между персонажами
    checkInfections() {
      for (let i = 0; i < this.persons.length; i++) {
        for (let j = i + 1; j < this.persons.length; j++) {
          const p1 = this.persons[i]
          const p2 = this.persons[j]

          // Вычисляем расстояние между персонажами
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // Если расстояние меньше дистанции заражения
          if (distance < this.infectionDistance) {
            // Проверяем все возможные комбинации заражения

            // Проверка, находится ли здоровый человек в синем прямоугольнике
            const isP2InBlueRect =
              p2.status === 'healthy' &&
              p2.x > this.blueRect.x &&
              p2.x < this.blueRect.x + this.blueRect.width &&
              p2.y > this.blueRect.y &&
              p2.y < this.blueRect.y + this.blueRect.height

            const isP1InBlueRect =
              p1.status === 'healthy' &&
              p1.x > this.blueRect.x &&
              p1.x < this.blueRect.x + this.blueRect.width &&
              p1.y > this.blueRect.y &&
              p1.y < this.blueRect.y + this.blueRect.height

            // Если p1 заражен, p2 здоров и НЕ в синем прямоугольнике
            if (
              p1.status === 'infected' &&
              p2.status === 'healthy' &&
              !isP2InBlueRect &&
              Math.random() < this.infectionChance
            ) {
              p2.infect()
              // Если новый зараженный должен быть в карантине
              if (p2.inQuarantine) {
                p2.startMovingToQuarantine(this.greenRect)
              }
            }
            // Если p2 заражен, p1 здоров и НЕ в синем прямоугольнике
            else if (
              p2.status === 'infected' &&
              p1.status === 'healthy' &&
              !isP1InBlueRect &&
              Math.random() < this.infectionChance
            ) {
              p1.infect()
              // Если новый зараженный должен быть в карантине
              if (p1.inQuarantine) {
                p1.startMovingToQuarantine(this.greenRect)
              }
            }
          }
        }
      }
    },

    // Обновление истории для графика
    updateHistory() {
      const currentTime = Date.now() - (this.isRunning ? 0 : this.timeOffset)

      if (this.history.length >= this.maxHistoryLength) {
        this.history.shift()
      }

      this.history.push({
        healthy: this.healthyCount,
        infected: this.infectedCount,
        immune: this.immuneCount,
        dead: this.deadCount,
        time: currentTime,
      })
    },

    // Инициализация графика
    initChart() {
      const chartCanvas = this.$refs.chartCanvas as HTMLCanvasElement
      const ctx = chartCanvas.getContext('2d')!

      // Очищаем и настраиваем холст
      ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, chartCanvas.width, chartCanvas.height)

      // Запускаем отрисовку графика
      this.drawChart()
    },

    // Отрисовка графика
    drawChart() {
      const chartCanvas = this.$refs.chartCanvas as HTMLCanvasElement
      const ctx = chartCanvas.getContext('2d')!

      // Очищаем холст
      ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)
      // Всегда сохраняем время последнего обновления
      this.lastChartTime = Date.now()

      // Очищаем только если симуляция активна
      if (this.isRunning) {
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)
      }
      // Рисуем границу
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, chartCanvas.width, chartCanvas.height)

      // Если данных недостаточно - выходим
      if (this.history.length < 2) {
        this.chartAnimationId = requestAnimationFrame(this.drawChart)
        return
      }

      // Если на паузе - просто запрашиваем следующий кадр без обновления
      if (this.isChartPaused) {
        this.chartAnimationId = requestAnimationFrame(this.drawChart)
        return
      }

      // Настройки отступов и размеров
      const padding = 40
      const chartWidth = chartCanvas.width - 2 * padding
      const chartHeight = chartCanvas.height - 2 * padding
      const totalPeople = this.persons.length

      // Рисуем оси графика
      ctx.beginPath()
      ctx.moveTo(padding, padding)
      ctx.lineTo(padding, chartCanvas.height - padding)
      ctx.lineTo(chartCanvas.width - padding, chartCanvas.height - padding)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.stroke()

      // Подписи осей
      ctx.font = '12px Arial'
      ctx.fillStyle = '#000'
      ctx.save()
      ctx.translate(10, chartCanvas.height / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText('Количество людей', 0, 0)
      ctx.restore()

      // Вычисляем временной диапазон
      const minTime = this.history[0].time
      const maxTime = this.history[this.history.length - 1].time
      const timeRange = maxTime - minTime

      // Разметка оси Y
      const yAxisSteps = 5
      ctx.font = '10px Arial'
      ctx.fillStyle = '#000'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

      // Рисуем деления и подписи на оси Y
      for (let i = 0; i <= yAxisSteps; i++) {
        const value = Math.round((i / yAxisSteps) * totalPeople)
        const y = chartCanvas.height - padding - (i / yAxisSteps) * chartHeight

        ctx.fillText(value.toString(), padding - 5, y)

        // Горизонтальные линии сетки
        ctx.beginPath()
        ctx.moveTo(padding, y)
        ctx.lineTo(chartCanvas.width - padding, y)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      ctx.textAlign = 'left'

      // Функция для рисования одной линии графика с заливкой
      const drawArea = (
        property: 'healthy' | 'infected' | 'immune' | 'dead',
        color: string,
        fillColor: string,
      ) => {
        ctx.beginPath()

        // Рисуем линию графика
        for (let i = 0; i < this.history.length; i++) {
          const point = this.history[i]
          const x = padding + ((point.time - minTime) / timeRange) * chartWidth
          const y = chartCanvas.height - padding - (point[property] / totalPeople) * chartHeight

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        // Замыкаем область для заливки
        const lastPoint = this.history[this.history.length - 1]
        const lastX = padding + ((lastPoint.time - minTime) / timeRange) * chartWidth
        ctx.lineTo(lastX, chartCanvas.height - padding)
        ctx.lineTo(padding, chartCanvas.height - padding)
        ctx.closePath()

        // Заливаем область
        ctx.fillStyle = fillColor
        ctx.fill()

        // Рисуем линию поверх заливки
        ctx.beginPath()
        for (let i = 0; i < this.history.length; i++) {
          const point = this.history[i]
          const x = padding + ((point.time - minTime) / timeRange) * chartWidth
          const y = chartCanvas.height - padding - (point[property] / totalPeople) * chartHeight

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Рисуем все графики (снизу вверх)
      drawArea('dead', this.chartColors.dead, this.fillColors.dead)
      drawArea('immune', this.chartColors.immune, this.fillColors.immune)
      drawArea('infected', this.chartColors.infected, this.fillColors.infected)
      drawArea('healthy', this.chartColors.healthy, this.fillColors.healthy)

      // Легенда графика
      const legendX = chartCanvas.width - 150
      const legendY = 20
      const legendItemHeight = 20

      // Функция для отрисовки элемента легенды
      const drawLegendItem = (
        text: string,
        color: string,
        fillColor: string,
        y: number,
        count: number,
      ) => {
        ctx.fillStyle = fillColor
        ctx.fillRect(legendX, y, 15, 15)
        ctx.strokeStyle = color
        ctx.strokeRect(legendX, y, 15, 15)
        ctx.fillStyle = '#000'
        ctx.fillText(`${text}: ${count}`, legendX + 20, y + 12)
      }

      // Рисуем все элементы легенды
      drawLegendItem(
        'Здоровые',
        this.chartColors.healthy,
        this.fillColors.healthy,
        legendY,
        this.healthyCount,
      )
      drawLegendItem(
        'Зараженные',
        this.chartColors.infected,
        this.fillColors.infected,
        legendY + legendItemHeight,
        this.infectedCount,
      )
      drawLegendItem(
        'Иммунные',
        this.chartColors.immune,
        this.fillColors.immune,
        legendY + 2 * legendItemHeight,
        this.immuneCount,
      )
      drawLegendItem(
        'Умершие',
        this.chartColors.dead,
        this.fillColors.dead,
        legendY + 3 * legendItemHeight,
        this.deadCount,
      )

      // Запускаем анимацию графика
      this.chartAnimationId = requestAnimationFrame(this.drawChart)
    },

    // Основной цикл анимации
    animate() {
      if (!this.isRunning) return

      this.updatePositions() // Обновляем позиции
      this.drawPersons() // Перерисовываем
      this.animationId = requestAnimationFrame(this.animate) // Запускаем следующий кадр
    },

    stopSimulation() {
      if (!this.isRunning) return

      this.isRunning = false
      this.pauseTime = Date.now()
      cancelAnimationFrame(this.animationId)
      // Не отменяем анимацию графика!
    },

    startSimulation() {
      if (this.isRunning) return

      if (this.pauseTime > 0) {
        this.timeOffset += Date.now() - this.pauseTime
        this.pauseTime = 0
      }

      this.isRunning = true
      this.animationId = requestAnimationFrame(this.animate)
    },

    // Сброс симуляции
    resetSimulation() {
      // Полностью останавливаем симуляцию
      this.stopSimulation()

      // Сбрасываем все временные параметры
      this.pauseTime = 0
      this.timeOffset = 0
      this.isChartPaused = false

      // Очищаем историю данных
      this.history = []

      // Пересоздаем персонажей (это обновит computed свойства)
      this.persons = [] // Сначала очищаем массив
      this.createPersons() // Затем создаем новых

      // Принудительно обновляем computed свойства
      this.$nextTick(() => {
        // Полностью очищаем и переинициализируем график
        const chartCanvas = this.$refs.chartCanvas as HTMLCanvasElement
        const ctx = chartCanvas.getContext('2d')!
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)

        // Перерисовываем начальное состояние
        this.initSimulation()
        this.initChart()
        this.drawPersons()

        // Принудительный пересчет
        this.$forceUpdate()
      })
    },
  },
}
</script>

<style scoped>
/* Основные стили компонента */
.simulation-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

/* Контейнер для основного содержимого */
.content-wrapper {
  display: flex;
  gap: 20px;
  align-items: center;
}

/* Стили для поля симуляции */
.simulation-field {
  border: 1px solid #817b7b;
  background-color: #f5f5f5;
}

/* Стили для контейнера графика */
.chart-container {
  border: 1px solid #817b7b;
  background-color: white;
}

/* Стиль для холста графика */
.chart-field {
  display: block;
}

/* Стили для панели управления */
.controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.controls button {
  padding: 8px 16px;
  font-size: 1em;
  cursor: pointer;
}

/* Общие стили для кнопок */
button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  color: white;
}

/* Индивидуальные стили кнопок */
button:nth-child(1) {
  background: #4caf50;
} /* Старт - зеленый */
button:nth-child(2) {
  background: #f44336;
} /* Стоп - красный */
button:nth-child(3) {
  background: #2196f3;
} /* Сброс - синий */
</style>

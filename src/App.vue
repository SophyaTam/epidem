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
      <button @click="startSimulation" title="Запустить симуляцию">Старт</button>
      <button @click="stopSimulation" title="Остановить симуляцию">Стоп</button>
    </div>
  </div>
</template>

<script lang="ts">
// Базовый класс, представляющий человека в симуляции
class Person {
  x: number // Координата X
  y: number // Координата Y
  dx: number // Скорость по оси X
  dy: number // Скорость по оси Y
  radius: number // Радиус точки (размер человека)
  color: string // Цвет в зависимости от состояния
  status: 'healthy' | 'infected' | 'immune' | 'dead' // Текущее состояние
  infectionTime?: number // Время заражения (если заражен)
  inQuarantine: boolean // Находится ли в карантине
  quarantineZone?: { x: number; y: number; width: number; height: number } // Зона карантина
  exitingQuarantine: boolean // Процесс выхода из карантина
  movingToQuarantine: boolean // Процесс перемещения в карантин
  quarantineTarget?: { x: number; y: number } // Целевая точка в карантине
  avoidancePoints: { x: number; y: number }[] // Точки обхода препятствий
  currentAvoidancePoint?: { x: number; y: number } // Текущая точка обхода
  otherQuarantineZones: { x: number; y: number; width: number; height: number }[] // Другие карантинные зоны
  lastBounceTime: number // Время последнего отскока от стенки

  constructor(x: number, y: number) {
    // Инициализация свойств
    this.x = x
    this.y = y
    // Случайные начальные скорости
    this.dx = (Math.random() - 0.5) * 2 + (Math.random() > 0.5 ? 0.3 : -0.3)
    this.dy = (Math.random() - 0.5) * 2 + (Math.random() > 0.5 ? 0.3 : -0.3)
    this.radius = 4.5
    this.status = 'healthy'
    this.color = this.getColor()
    this.inQuarantine = false
    this.exitingQuarantine = false
    this.movingToQuarantine = false
    this.avoidancePoints = []
    this.otherQuarantineZones = []
    this.lastBounceTime = 0
  }

  // Возвращает цвет в зависимости от состояния
  getColor() {
    switch (this.status) {
      case 'infected':
        return '#e74c3c'
      case 'immune':
        return '#2ecc71'
      case 'dead':
        return 'black'
      default:
        return '#2980b9'
    }
  }

  // Проверяет, находится ли точка внутри прямоугольника
  isPointInRect(
    x: number,
    y: number,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    return x > rect.x && x < rect.x + rect.width && y > rect.y && y < rect.y + rect.height
  }

  // Основной метод обновления состояния персонажа
  update(canvasWidth: number, canvasHeight: number) {
    // Мертвые персонажи не двигаются
    if (this.status === 'dead') return

    // Логика перенаправления зараженных из синего карантина в зеленый
    if (
      this.status === 'infected' &&
      this.movingToQuarantine &&
      this.quarantineZone &&
      this.quarantineZone.x === 150
    ) {
      this.movingToQuarantine = false
      this.avoidancePoints = []
      this.currentAvoidancePoint = undefined

      // Начинаем движение в зеленый карантин
      const greenRect = { x: 500, y: 250, width: 150, height: 100 }
      const blueRect = { x: 150, y: 150, width: 150, height: 100 }
      this.startMovingToQuarantine(greenRect, [blueRect])
    }

    // Логика обхода синего карантина зараженными
    if (this.status === 'infected' && this.movingToQuarantine && this.quarantineZone) {
      const blueRect = { x: 150, y: 150, width: 150, height: 100 }
      const margin = 5

      // Если приблизились к синему карантину - обходим его
      if (
        this.x >= blueRect.x - margin &&
        this.x <= blueRect.x + blueRect.width + margin &&
        this.y >= blueRect.y - margin &&
        this.y <= blueRect.y + blueRect.height + margin
      ) {
        // Сдвигаем вправо и немного вверх/вниз
        this.x += 4
        this.dy = (Math.random() - 0.5) * 0.3
        this.dx = 1.0
      }
    }

    // Логика обхода зеленого карантина здоровыми
    if (this.status === 'healthy' && this.movingToQuarantine && this.quarantineZone) {
      const greenRect = { x: 500, y: 250, width: 150, height: 100 }
      const margin = 5

      if (
        this.x >= greenRect.x - margin &&
        this.x <= greenRect.x + greenRect.width + margin &&
        this.y >= greenRect.y - margin &&
        this.y <= greenRect.y + greenRect.height + margin
      ) {
        // Сдвигаем влево и немного вверх/вниз
        this.x -= 5
        this.dy = (Math.random() - 0.5) * 0.3
        this.dx = 1.0
      }
    }

    // Проверка на залипание у границы карантинной зоны
    if (this.inQuarantine && this.quarantineZone) {
      const zone = this.quarantineZone
      const nearLeft = Math.abs(this.x - (zone.x + this.radius)) < 1
      const nearRight = Math.abs(this.x - (zone.x + zone.width - this.radius)) < 1
      const nearTop = Math.abs(this.y - (zone.y + this.radius)) < 1
      const nearBottom = Math.abs(this.y - (zone.y + zone.height - this.radius)) < 1

      // Если близко к границе - добавляем случайное ускорение
      if (nearLeft || nearRight || nearTop || nearBottom) {
        this.dx += (Math.random() - 0.5) * 1.5
        this.dy += (Math.random() - 0.5) * 1.5
      }
    }

    // Периодическое небольшое изменение направления
    if (Math.random() < 0.05) {
      this.dx += (Math.random() - 0.5) * 0.5
      this.dy += (Math.random() - 0.5) * 0.5
    }

    // Ограничиваем минимальную и максимальную скорость
    const minSpeed = 0.8
    const maxSpeed = 2.0
    const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy)

    if (speed > maxSpeed) {
      // Нормализуем скорость до максимальной
      this.dx = (this.dx / speed) * maxSpeed
      this.dy = (this.dy / speed) * maxSpeed
    } else if (speed < minSpeed) {
      // Задаем случайное направление с минимальной скоростью
      const angle = Math.random() * Math.PI * 2
      this.dx = minSpeed * Math.cos(angle)
      this.dy = minSpeed * Math.sin(angle)
    }

    // Логика движения в карантин
    if (this.movingToQuarantine && this.quarantineTarget && this.quarantineZone) {
      const target = this.currentAvoidancePoint || this.quarantineTarget
      const dx = target.x - this.x
      const dy = target.y - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      // Если достигли текущей точки маршрута
      if (distance < 2) {
        if (this.currentAvoidancePoint) {
          // Берем следующую точку обхода
          this.currentAvoidancePoint = this.avoidancePoints.shift()
          if (!this.currentAvoidancePoint) {
            this.currentAvoidancePoint = this.quarantineTarget
          }
        } else {
          // Достигли конечной точки - переходим в режим карантина
          this.movingToQuarantine = false
          this.inQuarantine = true
          this.avoidancePoints = []
          this.currentAvoidancePoint = undefined
        }
      } else {
        // Двигаемся к текущей точке
        const speed = 2
        this.dx = (dx / distance) * speed
        this.dy = (dy / distance) * speed

        // Проверяем, не попадаем ли в запретную зону
        let inForbiddenZone = false
        for (const zone of this.otherQuarantineZones) {
          if (this.isPointInRect(this.x + this.dx, this.y + this.dy, zone)) {
            inForbiddenZone = true
            break
          }
        }

        if (!inForbiddenZone) {
          // Двигаемся, если нет препятствий
          this.x += this.dx
          this.y += this.dy
        } else {
          // Рассчитываем путь обхода
          this.calculateAvoidancePath(this.quarantineZone)
        }
      }
    }
    // Логика поведения в карантине
    else if (this.inQuarantine && this.quarantineZone && !this.exitingQuarantine) {
      const zone = this.quarantineZone

      // Периодическое изменение направления
      if (Math.random() < 0.1) {
        this.dx += (Math.random() - 0.5) * 0.5
        this.dy += (Math.random() - 0.5) * 0.5
      }

      // Движение
      this.x += this.dx
      this.y += this.dy

      // Обработка столкновений со стенами карантина
      if (
        this.x <= zone.x + this.radius ||
        this.x >= zone.x + zone.width - this.radius ||
        this.y <= zone.y + this.radius ||
        this.y >= zone.y + zone.height - this.radius
      ) {
        // Сила отскока
        const bouncePower = 1.5 + Math.random() * 0.5
        const randomFactor = (Math.random() - 0.5) * 1.0

        // Отскок от вертикальных стен
        if (this.x <= zone.x + this.radius || this.x >= zone.x + zone.width - this.radius) {
          this.dx *= -bouncePower
          this.dy += randomFactor
        }
        // Отскок от горизонтальных стен
        else {
          this.dy *= -bouncePower
          this.dx += randomFactor
        }

        // Проверка минимальной скорости после отскока
        const minSpeedAfterBounce = 1.2
        const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy)
        if (currentSpeed < minSpeedAfterBounce) {
          const angle = Math.atan2(this.dy, this.dx)
          this.dx = minSpeedAfterBounce * Math.cos(angle)
          this.dy = minSpeedAfterBounce * Math.sin(angle)
        }
      }

      // Удерживаем персонажа в пределах карантина с небольшим отступом
      const margin = 1.0
      this.x = Math.max(
        zone.x + this.radius + margin,
        Math.min(zone.x + zone.width - this.radius - margin, this.x),
      )
      this.y = Math.max(
        zone.y + this.radius + margin,
        Math.min(zone.y + zone.height - this.radius - margin, this.y),
      )
    }
    // Логика выхода из карантина
    else if (this.exitingQuarantine && this.quarantineZone) {
      const zone = this.quarantineZone
      // Ускоренное движение при выходе
      this.x += this.dx * 1.5
      this.y += this.dy * 1.5

      // Если полностью вышел из зоны карантина
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
    // Обычное движение вне карантина
    else {
      const prevX = this.x
      const prevY = this.y
      this.x += this.dx
      this.y += this.dy

      // Если координаты не изменились - задаем новое направление
      if (this.x === prevX && this.y === prevY) {
        this.dx = (Math.random() - 0.5) * 2
        this.dy = (Math.random() - 0.5) * 2
      }

      // Обработка столкновений с границами холста
      if (this.x < this.radius) {
        this.x = this.radius
        this.dx = Math.abs(this.dx) * (0.9 + Math.random() * 0.2)
      } else if (this.x > canvasWidth - this.radius) {
        this.x = canvasWidth - this.radius
        this.dx = -Math.abs(this.dx) * (0.9 + Math.random() * 0.2)
      }

      if (this.y < this.radius) {
        this.y = this.radius
        this.dy = Math.abs(this.dy) * (0.9 + Math.random() * 0.2)
      } else if (this.y > canvasHeight - this.radius) {
        this.y = canvasHeight - this.radius
        this.dy = -Math.abs(this.dy) * (0.9 + Math.random() * 0.2)
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

      // Если персонаж уже двигался в карантин (синий)
      if (this.movingToQuarantine) {
        // Отменяем текущее движение
        this.movingToQuarantine = false
        this.avoidancePoints = []
        this.currentAvoidancePoint = undefined

        // Начинаем движение в зеленый карантин
        this.inQuarantine = true
        const greenRect = { x: 500, y: 250, width: 150, height: 100 }
        const blueRect = { x: 150, y: 150, width: 150, height: 100 }
        this.startMovingToQuarantine(greenRect, [blueRect])
      } else if (Math.random() < 0.4) {
        // 40% шанс попасть в карантин при заражении
        this.inQuarantine = true
      }

      return true
    }
    return false
  }

  // Начать движение в карантин
  startMovingToQuarantine(
    zone: { x: number; y: number; width: number; height: number },
    otherZones: { x: number; y: number; width: number; height: number }[],
  ) {
    this.quarantineZone = zone
    this.movingToQuarantine = true
    this.otherQuarantineZones = otherZones

    // Случайная точка внутри карантинной зоны
    this.quarantineTarget = {
      x: zone.x + this.radius + Math.random() * (zone.width - this.radius * 2),
      y: zone.y + this.radius + Math.random() * (zone.height - this.radius * 2),
    }

    // Рассчитываем путь обхода
    this.calculateAvoidancePath(zone)
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

  // Проверяет пересечение линии с прямоугольником
  lineIntersectsRect(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    // Проверяем пересечение со всеми сторонами прямоугольника
    return (
      this.lineIntersectsLine(x1, y1, x2, y2, rect.x, rect.y, rect.x + rect.width, rect.y) || // верхняя сторона
      this.lineIntersectsLine(
        x1,
        y1,
        x2,
        y2,
        rect.x + rect.width,
        rect.y,
        rect.x + rect.width,
        rect.y + rect.height,
      ) || // правая сторона
      this.lineIntersectsLine(
        x1,
        y1,
        x2,
        y2,
        rect.x,
        rect.y + rect.height,
        rect.x + rect.width,
        rect.y + rect.height,
      ) || // нижняя сторона
      this.lineIntersectsLine(x1, y1, x2, y2, rect.x, rect.y, rect.x, rect.y + rect.height)
    ) // левая сторона
  }

  // Проверяет пересечение двух линий
  lineIntersectsLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
  ): boolean {
    // Расчет знаменателя
    const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
    if (denom === 0) return false // линии параллельны

    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
  }

  // Рассчитывает путь обхода для персонажей
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  calculateAvoidancePath(zone: { x: number; y: number; width: number; height: number }) {
    this.avoidancePoints = []

    // Проверяем все другие карантинные зоны
    for (const otherZone of this.otherQuarantineZones) {
      // Если путь к цели пересекает другую зону
      if (
        this.lineIntersectsRect(
          this.x,
          this.y,
          this.quarantineTarget!.x,
          this.quarantineTarget!.y,
          otherZone,
        )
      ) {
        // Определяем с какой стороны обходить прямоугольник
        const dx = this.quarantineTarget!.x - this.x
        const dy = this.quarantineTarget!.y - this.y

        // Для верхней границы добавляем дополнительное смещение
        const topAvoidanceY = otherZone.y - 30 // Увеличиваем отступ сверху

        if (Math.abs(dx) > Math.abs(dy)) {
          // Горизонтальное движение - обходим сверху или снизу
          if (dy > 0) {
            // Движение вниз - обходим снизу
            this.avoidancePoints.push({
              x: this.x,
              y: otherZone.y + otherZone.height + 30,
            })
            this.avoidancePoints.push({
              x: this.quarantineTarget!.x,
              y: otherZone.y + otherZone.height + 30,
            })
          } else {
            // Движение вверх - обходим сверху с увеличенным отступом
            this.avoidancePoints.push({
              x: this.x,
              y: topAvoidanceY,
            })
            this.avoidancePoints.push({
              x: this.quarantineTarget!.x,
              y: topAvoidanceY,
            })
          }
        } else {
          // Вертикальное движение - обходим слева или справа
          if (dx > 0) {
            // Движение вправо - обходим справа
            this.avoidancePoints.push({
              x: otherZone.x + otherZone.width + 30,
              y: this.y,
            })
            this.avoidancePoints.push({
              x: otherZone.x + otherZone.width + 30,
              y: this.quarantineTarget!.y,
            })
          } else {
            // Движение влево - обходим слева
            this.avoidancePoints.push({
              x: otherZone.x - 30,
              y: this.y,
            })
            this.avoidancePoints.push({
              x: otherZone.x - 30,
              y: this.quarantineTarget!.y,
            })
          }
        }

        // Устанавливаем первую точку обхода
        this.currentAvoidancePoint = this.avoidancePoints.shift()
        break
      }
    }
  }
}

// Класс зараженного человека (наследуется от Person)
class InfectedPerson extends Person {
  constructor(x: number, y: number) {
    super(x, y)
    this.status = 'infected'
    this.infectionTime = Date.now()

    // 50% шанс попасть в карантин при создании
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
      pauseTime: 0, // Время паузы
      timeOffset: 0, // Смещение времени при паузе
      isChartPaused: false, // Флаг паузы графика
      lastChartTime: 0, // Время последнего обновления графика
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
        healthy: 'rgba(52, 152, 219, 0.7)',
        infected: 'rgba(231, 76, 60, 0.7)',
        immune: 'rgba(46, 204, 113, 0.7)',
        dead: 'rgba(34, 34, 34, 0.7)',
      },
      fillColors: {
        healthy: 'rgba(52, 152, 219, 0.2)',
        infected: 'rgba(231, 76, 60, 0.2)',
        immune: 'rgba(46, 204, 113, 0.2)',
        dead: 'rgba(34, 34, 34, 0.2)',
      },
      blueRect: { x: 150, y: 150, width: 150, height: 100 }, // Карантин для здоровых
      greenRect: { x: 500, y: 250, width: 150, height: 100 }, // Карантин для зараженных
      sentHealthyToQuarantine: false, // Флаг отправки здоровых в карантин
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
    this.drawPersons()
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
      // Синий прямоугольник в левом верхнем углу (для здоровых)
      ctx.fillStyle = 'rgba(0, 0, 255, 0.3)'
      ctx.fillRect(150, 150, 150, 100)
      ctx.strokeStyle = 'blue'
      ctx.lineWidth = 2
      ctx.strokeRect(150, 150, 150, 100)

      // Зеленый прямоугольник в правой части (для зараженных)
      this.greenRect = {
        x: 500,
        y: 250,
        width: 150,
        height: 100,
      }

      ctx.fillStyle = 'rgba(255, 0, 0, 0.3)' // Красный с прозрачностью 30%
      ctx.fillRect(500, 250, 150, 100)
      ctx.strokeStyle = 'red'
      ctx.lineWidth = 2
      ctx.strokeRect(500, 250, 150, 100)
    },

    // Проверка, находится ли точка внутри карантинных зон
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isPointInRectangles(x: number, y: number, canvas: HTMLCanvasElement): boolean {
      const blueRect = { x: 150, y: 150, width: 150, height: 100 }
      const greenRect = this.greenRect

      // Проверяем оба прямоугольника
      return (
        (x > blueRect.x &&
          x < blueRect.x + blueRect.width &&
          y > blueRect.y &&
          y < blueRect.y + blueRect.height) ||
        (x > greenRect.x &&
          x < greenRect.x + greenRect.width &&
          y > greenRect.y &&
          y < greenRect.y + greenRect.height)
      )
    },

    // Проверка, находится ли точка слишком близко к карантинным зонам
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isPointNearRectangles(x: number, y: number, canvas: HTMLCanvasElement): boolean {
      const rectangles = [{ x: 150, y: 150, width: 150, height: 100 }, this.greenRect]

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
      const count = 300
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
            person.startMovingToQuarantine(this.greenRect, [this.blueRect])
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
      if (!this.isRunning) return
      const currentTime = Date.now() - (this.isRunning ? 0 : this.timeOffset)
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement

      // Проверяем выздоровление только если симуляция не на паузе
      this.persons.forEach((person) => {
        if (person.status === 'infected') {
          person.checkRecovery(this.recoveryTime, currentTime)
        }
        person.checkDeath()
      })

      // Проверяем порог заражения для здоровых
      const infectedPercentage = (this.infectedCount / this.persons.length) * 100

      // Проверяем выздоровление и смерть для всех персонажей
      this.persons.forEach((person) => {
        if (person.status === 'infected') {
          person.checkRecovery(this.recoveryTime, currentTime)
        }
        // Также проверяем смерть
        person.checkDeath()
      })

      // Обновляем позиции персонажей
      this.persons.forEach((person) => {
        if (person.status !== 'dead') {
          // Проверка на залипание (если скорость близка к нулю)
          if (Math.abs(person.dx) < 0.1 && Math.abs(person.dy) < 0.1) {
            person.dx = (Math.random() - 0.5) * 2
            person.dy = (Math.random() - 0.5) * 2
          }

          person.update(canvas.width, canvas.height)
        }
      })

      // Если 20% заражены и здоровых еще не отправляли в карантин
      if (infectedPercentage >= 20 && !this.sentHealthyToQuarantine) {
        this.persons.forEach((person) => {
          // Здоровые с 50% шансом идут в синий карантин
          if (person.status === 'healthy' && !person.inQuarantine) {
            if (Math.random() < 0.5) {
              person.inQuarantine = true
              person.startMovingToQuarantine(this.blueRect, [this.greenRect])
            }
          }
        })
        this.sentHealthyToQuarantine = true
      }

      // Если болезнь побеждена (нет зараженных)
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
                case 0: // Выход влево
                  person.dx = -Math.abs(person.dx)
                  break
                case 1: // Выход вправо
                  person.dx = Math.abs(person.dx)
                  break
                case 2: // Выход вверх
                  person.dy = -Math.abs(person.dy)
                  break
                case 3: // Выход вниз
                  person.dy = Math.abs(person.dy)
                  break
              }
            }
          }
        })
      }

      // Проверяем столкновения персонажей с карантинными зонами
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
            person.startMovingToQuarantine(this.greenRect, [this.blueRect])
          }

          // Здоровые идут в синий карантин
          if (
            person.status === 'healthy' &&
            person.inQuarantine &&
            !person.quarantineZone &&
            !person.movingToQuarantine
          ) {
            person.startMovingToQuarantine(this.blueRect, [this.greenRect])
          }

          // Проверка столкновений с карантином
          if (
            !person.inQuarantine &&
            !person.movingToQuarantine &&
            !person.exitingQuarantine &&
            this.isPointInRectangles(person.x, person.y, canvas)
          ) {
            // Отскок от карантинной зоны
            person.x = prevX
            person.y = prevY
            person.dx *= -1
            person.dy *= -1
          }
        }
      })

      // Проверяем заражения
      this.checkInfections()
      // Обновляем историю для графика
      this.updateHistory()
    },

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
                p2.startMovingToQuarantine(this.greenRect, [this.blueRect])
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
                p1.startMovingToQuarantine(this.greenRect, [this.blueRect])
              }
            }
          }
        }
      }
    },

    // Обновление истории для графика
    updateHistory() {
      const currentTime = Date.now() - (this.isRunning ? 0 : this.timeOffset)

      // Ограничиваем длину истории
      if (this.history.length >= this.maxHistoryLength) {
        this.history.shift()
      }

      // Добавляем текущее состояние
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
      if (this.isChartPaused) return
      const chartCanvas = this.$refs.chartCanvas as HTMLCanvasElement
      const ctx = chartCanvas.getContext('2d')!

      // Очищаем и рисуем график
      ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)

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
        ctx.font = '14px Arial'
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

    // Остановка симуляции
    stopSimulation() {
      if (!this.isRunning) return

      this.isRunning = false
      this.pauseTime = Date.now() // Запоминаем время паузы

      // Останавливаем все анимационные циклы
      cancelAnimationFrame(this.animationId)
      cancelAnimationFrame(this.chartAnimationId)

      // Ничего больше не делаем - все процессы остановятся,
      // так как isRunning = false и анимационные циклы отменены
    },

    // Продолжение с момента остановки
    startSimulation() {
      if (this.isRunning) return

      // Корректируем временные метки с учетом времени паузы
      if (this.pauseTime > 0) {
        const pauseDuration = Date.now() - this.pauseTime
        this.timeOffset += pauseDuration

        // Корректируем время заражения для всех инфицированных
        this.persons.forEach((person) => {
          if (person.status === 'infected' && person.infectionTime) {
            person.infectionTime += pauseDuration
          }
        })
      }

      this.isRunning = true
      this.animationId = requestAnimationFrame(this.animate)
      this.chartAnimationId = requestAnimationFrame(this.drawChart)
    },
  },
}
</script>

<style scoped>
/* Основные стили компонента */
.simulation-container {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  border-radius: 12px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  padding: 20px 30px; /* Уменьшил верхний отступ */
  max-width: 1300px;
  margin: 10px auto; /* Уменьшил внешний отступ */
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 20px; /* Уменьшил отступ */
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.content-wrapper {
  display: flex;
  gap: 30px;
  align-items: flex-start;
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

.simulation-field {
  border: 2px solid #e0e0e0;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
}

.chart-container {
  border: 2px solid #e0e0e0;
  background-color: white;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.chart-field {
  display: block;
}

/* Стили для панели управления */
.controls {
  margin-top: 20px; /* Уменьшил отступ */
  margin-bottom: 10px; /* Добавил отступ снизу */
  display: flex;
  gap: 15px;
  justify-content: center;
}

.controls button {
  padding: 10px 25px;
  font-size: 1em;
  cursor: pointer;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center; /* Центрируем текст */
}

/* Убрал псевдоэлементы с иконками */
.controls button::before {
  content: none !important;
}

.controls button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.controls button:active {
  transform: translateY(0);
}

button:nth-child(1) {
  background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
  color: white;
}

button:nth-child(2) {
  background: linear-gradient(135deg, #f44336 0%, #c62828 100%);
  color: white;
}

.simulation-container {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

canvas:hover {
  cursor: pointer;
}

@media (max-width: 1200px) {
  .content-wrapper {
    flex-direction: column;
    align-items: center;
  }

  .simulation-field,
  .chart-container {
    width: 100%;
    height: auto;
  }

  canvas {
    max-width: 100%;
    height: auto !important;
  }
}

@media (max-width: 600px) {
  .controls {
    flex-direction: column;
    width: 100%;
  }

  button {
    width: 100%;
  }
}

.stats-panel {
  display: flex;
  justify-content: space-around;
  background: white;
  padding: 15px;
  border-radius: 10px;
  margin-bottom: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 20px;
  border-radius: 8px;
  min-width: 100px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.8;
}

.healthy {
  background-color: rgba(0, 0, 255, 0.1);
  border-left: 4px solid blue;
}
.infected {
  background-color: rgba(0, 255, 0, 0.1);
  border-left: 4px solid green;
}
.immune {
  background-color: rgba(255, 165, 0, 0.1);
  border-left: 4px solid orange;
}
.dead {
  background-color: rgba(0, 0, 0, 0.05);
  border-left: 4px solid black;
}
</style>

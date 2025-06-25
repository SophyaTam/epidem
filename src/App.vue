<template>
  <div class="simulation-container">
    <h1>Модель эпидемии с карантинными зонами</h1>
    <div class="content-wrapper">
      <canvas ref="simulationCanvas" width="800" height="500" class="simulation-field"></canvas>
      <div class="chart-container">
        <canvas ref="chartCanvas" width="400" height="500" class="chart-field"></canvas>
      </div>
    </div>
    <div class="controls">
      <button @click="startSimulation">Старт</button>
      <button @click="stopSimulation">Стоп</button>
      <button @click="resetSimulation">Сброс</button>
    </div>
  </div>
</template>

<script lang="ts">
// Базовый класс точки
class Person {
  x: number
  y: number
  dx: number
  dy: number
  radius: number
  color: string
  status: 'healthy' | 'infected' | 'immune' | 'dead'
  infectionTime?: number

  constructor(x: number, y: number) {
    this.x = x
    this.y = y
    this.dx = (Math.random() - 0.5) * 3
    this.dy = (Math.random() - 0.5) * 3
    this.radius = 4.5
    this.status = 'healthy'
    this.color = this.getColor()
  }

  getColor() {
    switch (this.status) {
      case 'infected':
        return 'green'
      case 'immune':
        return 'orange'
      case 'dead':
        return 'black'
      default:
        return 'blue'
    }
  }

  update(canvasWidth: number, canvasHeight: number) {
    if (this.status === 'dead') return // Мертвые не двигаются

    this.x += this.dx
    this.y += this.dy

    // Отскок от границ
    if (this.x < this.radius || this.x > canvasWidth - this.radius) this.dx *= -1
    if (this.y < this.radius || this.y > canvasHeight - this.radius) this.dy *= -1
  }

  checkDeath(): boolean {
    return false
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2)
    ctx.fillStyle = this.getColor()
    ctx.fill()
  }

  infect() {
    if (this.status === 'healthy') {
      this.status = 'infected'
      this.infectionTime = Date.now()
      return true
    }
    return false
  }

  checkRecovery(recoveryTime: number) {
    if (
      this.status === 'infected' &&
      this.infectionTime &&
      Date.now() - this.infectionTime > recoveryTime
    ) {
      this.status = 'immune'
      this.infectionTime = undefined
      return true
    }
    return false
  }
}

// Класс зараженной точки
class InfectedPerson extends Person {
  constructor(x: number, y: number) {
    super(x, y)
    this.status = 'infected'
    this.infectionTime = Date.now()
  }
  checkDeath(): boolean {
    if (this.status === 'infected' && Math.random() < 0.01) {
      this.status = 'dead'
      this.dx = 0 // Останавливаем движение
      this.dy = 0
      this.color = this.getColor() // Обновляем цвет
      return true
    }
    return false
  }
}

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
      persons: [] as Person[],
      animationId: 0,
      chartAnimationId: 0,
      isRunning: false,
      infectionDistance: 25,
      infectionChance: 0.3,
      recoveryTime: 8000,
      history: [] as Array<{
        healthy: number
        infected: number
        immune: number
        dead: number
        time: number
      }>,
      maxHistoryLength: 100,
      chartColors: {
        healthy: 'rgba(0, 0, 255, 0.7)',
        infected: 'rgba(0, 255, 0, 0.7)',
        immune: 'rgba(255, 165, 0, 0.7)',
        dead: 'rgba(0, 0, 0, 0.7)',
      },
      fillColors: {
        healthy: 'rgba(0, 0, 255, 0.2)',
        infected: 'rgba(0, 255, 0, 0.2)',
        immune: 'rgba(255, 165, 0, 0.2)',
        dead: 'rgba(0, 0, 0, 0.2)',
      },
    }
  },
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
  mounted() {
    this.initSimulation()
    this.createPersons()
    this.initChart()
  },
  beforeUnmount() {
    this.stopSimulation()
  },
  methods: {
    initSimulation() {
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, canvas.width, canvas.height)
    },
    createPersons() {
      this.persons = [] // Очищаем массив перед созданием новых персонажей
      const count = 200
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 800
        const y = Math.random() * 500

        if (i < 5) {
          this.persons.push(new InfectedPerson(x, y))
        } else if (i < 10) {
          this.persons.push(new ImmunePerson(x, y))
        } else {
          this.persons.push(new Person(x, y))
        }
      }
    },
    drawPersons() {
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, canvas.width, canvas.height)

      this.persons.forEach((person) => person.draw(ctx))
    },
    updatePositions() {
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement

      this.persons.forEach((person) => {
        if (person.status !== 'dead') {
          person.update(canvas.width, canvas.height)
          if (person.status === 'infected') {
            ;(person as InfectedPerson).checkDeath()
            person.checkRecovery(this.recoveryTime)
          }
        }
      })

      this.checkInfections()
      this.updateHistory()
    },
    checkInfections() {
      for (let i = 0; i < this.persons.length; i++) {
        for (let j = i + 1; j < this.persons.length; j++) {
          const p1 = this.persons[i]
          const p2 = this.persons[j]

          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < this.infectionDistance) {
            if (
              p1.status === 'infected' &&
              p2.status === 'healthy' &&
              Math.random() < this.infectionChance
            ) {
              p2.infect()
            } else if (
              p2.status === 'infected' &&
              p1.status === 'healthy' &&
              Math.random() < this.infectionChance
            ) {
              p1.infect()
            }
          }
        }
      }
    },
    updateHistory() {
      const currentTime = Date.now()

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
    initChart() {
      const chartCanvas = this.$refs.chartCanvas as HTMLCanvasElement
      const ctx = chartCanvas.getContext('2d')!
      ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, chartCanvas.width, chartCanvas.height)
      this.drawChart()
    },
    drawChart() {
      const chartCanvas = this.$refs.chartCanvas as HTMLCanvasElement
      const ctx = chartCanvas.getContext('2d')!

      ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height)
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, chartCanvas.width, chartCanvas.height)

      if (this.history.length < 2) {
        this.chartAnimationId = requestAnimationFrame(this.drawChart)
        return
      }

      const padding = 40
      const chartWidth = chartCanvas.width - 2 * padding
      const chartHeight = chartCanvas.height - 2 * padding
      const totalPeople = this.persons.length

      // Рисуем оси
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

      // Масштабирование по времени
      const minTime = this.history[0].time
      const maxTime = this.history[this.history.length - 1].time
      const timeRange = maxTime - minTime

      // Разметка оси Y
      const yAxisSteps = 5
      ctx.font = '10px Arial'
      ctx.fillStyle = '#000'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'

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

      // Функция для рисования графика с заливкой
      const drawArea = (
        property: 'healthy' | 'infected' | 'immune' | 'dead',
        color: string,
        fillColor: string,
      ) => {
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

        const lastPoint = this.history[this.history.length - 1]
        const lastX = padding + ((lastPoint.time - minTime) / timeRange) * chartWidth
        ctx.lineTo(lastX, chartCanvas.height - padding)
        ctx.lineTo(padding, chartCanvas.height - padding)
        ctx.closePath()

        ctx.fillStyle = fillColor
        ctx.fill()

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

      // Рисуем все области
      drawArea('dead', this.chartColors.dead, this.fillColors.dead)
      drawArea('immune', this.chartColors.immune, this.fillColors.immune)
      drawArea('infected', this.chartColors.infected, this.fillColors.infected)
      drawArea('healthy', this.chartColors.healthy, this.fillColors.healthy)

      // Легенда
      const legendX = chartCanvas.width - 150
      const legendY = 20
      const legendItemHeight = 20

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

      this.chartAnimationId = requestAnimationFrame(this.drawChart)
    },
    animate() {
      if (!this.isRunning) return

      this.updatePositions()
      this.drawPersons()
      this.animationId = requestAnimationFrame(this.animate)
    },
    startSimulation() {
      if (this.isRunning) return

      this.isRunning = true
      this.animationId = requestAnimationFrame(this.animate)
    },
    stopSimulation() {
      this.isRunning = false
      cancelAnimationFrame(this.animationId)
    },
    resetSimulation() {
      this.stopSimulation()
      this.history = []
      this.createPersons()
      this.initSimulation()
      this.initChart()
      this.createPersons()
      this.drawPersons()
    },
  },
}
</script>

<style scoped>
.simulation-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
}

.content-wrapper {
  display: flex;
  gap: 20px;
  align-items: center;
}

.simulation-field {
  border: 1px solid #817b7b;
  background-color: #f5f5f5;
}

.chart-container {
  border: 1px solid #817b7b;
  background-color: white;
}

.chart-field {
  display: block;
}

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

.stats {
  margin-top: 15px;
  font-size: 1.2em;
  font-weight: bold;
}

.stats span {
  padding: 2px 6px;
  border-radius: 4px;
}

/* Общие стили кнопок */
button {
  padding: 10px 20px; /* Внутренние отступы */
  border: none; /* Без границы */
  border-radius: 4px; /* Скругленные углы */
  cursor: pointer; /* Указатель при наведении */
  font-weight: bold; /* Жирный текст */
  color: white; /* Белый текст */
}

/* Стили для конкретных кнопок по порядку */
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

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
import { ChartManager } from '@/views/ChartManager'
import { Person, InfectedPerson, ImmunePerson } from '@/views/Person'
import { QuarantineManager } from '@/views/QuarantineManager'

export default {
  data() {
    return {
      persons: [] as Person[],
      animationId: 0,
      chartAnimationId: 0,
      isRunning: false,
      infectionDistance: 15,
      infectionChance: 0.15,
      recoveryTime: 14000,
      pauseTime: 0,
      timeOffset: 0,
      isChartPaused: false,
      lastChartTime: 0,
      history: [] as Array<{
        healthy: number
        infected: number
        immune: number
        dead: number
        time: number
      }>,
      maxHistoryLength: 100,
      chartManager: null as ChartManager | null,
      quarantineManager: new QuarantineManager(),
      sentHealthyToQuarantine: false,
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
    this.drawPersons()
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

      this.quarantineManager.drawRectangles(ctx)
    },

    createPersons() {
      this.persons = []
      const count = 200
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement

      for (let i = 0; i < count; i++) {
        let x, y
        let attempts = 0
        const maxAttempts = 100

        do {
          x = Math.random() * canvas.width
          y = Math.random() * canvas.height
          attempts++
        } while (
          (this.quarantineManager.isPointInRectangles(x, y) ||
            this.quarantineManager.isPointNearRectangles(x, y, this.infectionDistance)) &&
          attempts < maxAttempts
        )

        if (attempts >= maxAttempts) continue

        if (i < 5) {
          const person = new InfectedPerson(x, y)
          if (person.inQuarantine) {
            person.startMovingToQuarantine(this.quarantineManager.getInfectedZone(), [
              this.quarantineManager.getHealthyZone(),
            ])
          }
          this.persons.push(person)
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
      this.quarantineManager.drawRectangles(ctx)
      this.persons.forEach((person) => person.draw(ctx))
    },

    updatePositions() {
      if (!this.isRunning) return
      const currentTime = Date.now() - (this.isRunning ? 0 : this.timeOffset)
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement

      this.persons.forEach((person) => {
        if (person.status === 'infected') {
          person.checkRecovery(this.recoveryTime, currentTime)
        }
        person.checkDeath()
      })

      const infectedPercentage = (this.infectedCount / this.persons.length) * 100

      this.persons.forEach((person) => {
        if (person.status !== 'dead') {
          if (Math.abs(person.dx) < 0.1 && Math.abs(person.dy) < 0.1) {
            person.dx = (Math.random() - 0.5) * 2
            person.dy = (Math.random() - 0.5) * 2
          }
          person.update(canvas.width, canvas.height)
        }
      })

      if (infectedPercentage >= 20 && !this.sentHealthyToQuarantine) {
        this.persons.forEach((person) => {
          if (person.status === 'healthy' && !person.inQuarantine) {
            if (Math.random() < 0.5) {
              person.inQuarantine = true
              person.startMovingToQuarantine(this.quarantineManager.getHealthyZone(), [
                this.quarantineManager.getInfectedZone(),
              ])
            }
          }
        })
        this.sentHealthyToQuarantine = true
      }

      if (this.infectedCount === 0) {
        this.sentHealthyToQuarantine = false
        this.persons.forEach((person) => {
          if (person.inQuarantine && !person.exitingQuarantine) {
            person.exitingQuarantine = true
            person.inQuarantine = false
          }
        })
      }

      this.persons.forEach((person) => {
        if (person.status !== 'dead') {
          const prevX = person.x
          const prevY = person.y

          person.update(canvas.width, canvas.height)

          if (
            person.status === 'infected' &&
            person.inQuarantine &&
            !person.quarantineZone &&
            !person.movingToQuarantine
          ) {
            person.startMovingToQuarantine(this.quarantineManager.getInfectedZone(), [
              this.quarantineManager.getHealthyZone(),
            ])
          }

          if (
            person.status === 'healthy' &&
            person.inQuarantine &&
            !person.quarantineZone &&
            !person.movingToQuarantine
          ) {
            person.startMovingToQuarantine(this.quarantineManager.getHealthyZone(), [
              this.quarantineManager.getInfectedZone(),
            ])
          }

          if (
            !person.inQuarantine &&
            !person.movingToQuarantine &&
            !person.exitingQuarantine &&
            this.quarantineManager.isPointInRectangles(person.x, person.y)
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

    checkInfections() {
      for (let i = 0; i < this.persons.length; i++) {
        for (let j = i + 1; j < this.persons.length; j++) {
          const p1 = this.persons[i]
          const p2 = this.persons[j]
          const dx = p1.x - p2.x
          const dy = p1.y - p2.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < this.infectionDistance) {
            const isP2InHealthyZone =
              p2.status === 'healthy' &&
              this.quarantineManager.isPointInRectangles(p2.x, p2.y) &&
              p2.x > this.quarantineManager.getHealthyZone().x &&
              p2.x <
                this.quarantineManager.getHealthyZone().x +
                  this.quarantineManager.getHealthyZone().width &&
              p2.y > this.quarantineManager.getHealthyZone().y &&
              p2.y <
                this.quarantineManager.getHealthyZone().y +
                  this.quarantineManager.getHealthyZone().height

            const isP1InHealthyZone =
              p1.status === 'healthy' &&
              this.quarantineManager.isPointInRectangles(p1.x, p1.y) &&
              p1.x > this.quarantineManager.getHealthyZone().x &&
              p1.x <
                this.quarantineManager.getHealthyZone().x +
                  this.quarantineManager.getHealthyZone().width &&
              p1.y > this.quarantineManager.getHealthyZone().y &&
              p1.y <
                this.quarantineManager.getHealthyZone().y +
                  this.quarantineManager.getHealthyZone().height

            if (
              p1.status === 'infected' &&
              p2.status === 'healthy' &&
              !isP2InHealthyZone &&
              Math.random() < this.infectionChance
            ) {
              p2.infect()
              if (p2.inQuarantine) {
                p2.startMovingToQuarantine(this.quarantineManager.getInfectedZone(), [
                  this.quarantineManager.getHealthyZone(),
                ])
              }
            } else if (
              p2.status === 'infected' &&
              p1.status === 'healthy' &&
              !isP1InHealthyZone &&
              Math.random() < this.infectionChance
            ) {
              p1.infect()
              if (p1.inQuarantine) {
                p1.startMovingToQuarantine(this.quarantineManager.getInfectedZone(), [
                  this.quarantineManager.getHealthyZone(),
                ])
              }
            }
          }
        }
      }
    },

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

    initChart() {
      const chartCanvas = this.$refs.chartCanvas as HTMLCanvasElement
      this.chartManager = new ChartManager(chartCanvas)
      this.chartManager.init()
      this.drawChart()
    },

    drawChart() {
      if (!this.isRunning || !this.chartManager) return

      this.chartManager.drawChart(this.history, this.persons.length, {
        healthy: this.healthyCount,
        infected: this.infectedCount,
        immune: this.immuneCount,
        dead: this.deadCount,
      })
      this.chartAnimationId = requestAnimationFrame(this.drawChart)
    },

    animate() {
      if (!this.isRunning) return

      this.updatePositions()
      this.drawPersons()
      this.animationId = requestAnimationFrame(this.animate)
    },

    stopSimulation() {
      if (!this.isRunning) return

      this.isRunning = false
      this.pauseTime = Date.now()
      cancelAnimationFrame(this.animationId)
      cancelAnimationFrame(this.chartAnimationId)
    },

    startSimulation() {
      if (this.isRunning) return

      if (this.pauseTime > 0) {
        const pauseDuration = Date.now() - this.pauseTime
        this.timeOffset += pauseDuration

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

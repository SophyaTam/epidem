<!-- eslint-disable @typescript-eslint/no-unused-vars -->
<template>
  <div class="simulation-container">
    <h1>Модель эпидемии с карантинными зонами</h1>
    <canvas ref="simulationCanvas" width="800" height="500" class="simulation-field"></canvas>
    <div class="stats">
      Здоровые: {{ healthyCount }} | Зараженные: {{ infectedCount }} | С иммунитетом:
      {{ immuneCount }} | Умершие: {{ deadCount }}
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
    // Удалите вызов super.update() - он не нужен
    if (this.status === 'dead') return // Мертвые не двигаются

    this.x += this.dx
    this.y += this.dy

    // Отскок от границ
    if (this.x < this.radius || this.x > canvasWidth - this.radius) this.dx *= -1
    if (this.y < this.radius || this.y > canvasHeight - this.radius) this.dy *= -1
  }

  // Добавьте пустой метод checkDeath() в базовый класс
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
      infectionDistance: 25,
      infectionChance: 0.3,
      recoveryTime: 8000,
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
    this.startAnimation()
  },
  beforeUnmount() {
    cancelAnimationFrame(this.animationId)
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
      const count = 200
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 800
        const y = Math.random() * 500

        if (i < 5) {
          this.persons.push(new InfectedPerson(x, y))
        } else if (i < 10) {
          // Первые 5-9 - иммунные
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
    animate() {
      this.updatePositions()
      this.drawPersons()
      this.animationId = requestAnimationFrame(this.animate)
    },
    startAnimation() {
      this.animationId = requestAnimationFrame(this.animate)
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

.simulation-field {
  border: 1px solid #817b7b;
  background-color: #f5f5f5;
  margin-top: 20px;
}

.stats {
  margin-top: 15px;
  font-size: 1.2em;
  font-weight: bold;
}
</style>

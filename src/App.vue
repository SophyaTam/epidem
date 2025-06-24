<template>
  <div class="simulation-container">
    <h1>Модель эпидемии с карантинными зонами</h1>
    <canvas ref="simulationCanvas" width="800" height="500" class="simulation-field"></canvas>
  </div>
</template>

<script lang="ts">
export default {
  data() {
    return {
      persons: [] as Array<{ x: number; y: number; dx: number; dy: number }>,
      animationId: 0,
    }
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
      const ctx = canvas.getContext('2d')

      // Отрисовка поля
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, canvas.width, canvas.height)
    },
    createPersons() {
      const count = 250 // Количество точек
      for (let i = 0; i < count; i++) {
        this.persons.push({
          x: Math.random() * 800, // Случайная позиция по X
          y: Math.random() * 500, // Случайная позиция по Y
          dx: (Math.random() - 0.5) * 2, // Случайная скорость X (-1 до 1)
          dy: (Math.random() - 0.5) * 2, // Случайная скорость Y (-1 до 1)
        })
      }
    },
    drawPersons() {
      const canvas = this.$refs.simulationCanvas as HTMLCanvasElement
      const ctx = canvas.getContext('2d')

      // Очищаем canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Рисуем границу поля
      ctx.strokeStyle = '#343'
      ctx.lineWidth = 3
      ctx.strokeRect(0, 0, canvas.width, canvas.height)

      // Рисуем все точки
      ctx.fillStyle = 'blue' // Цвет точек
      this.persons.forEach((person) => {
        ctx.beginPath()
        ctx.arc(person.x, person.y, 3, 0, Math.PI * 2) // Точки радиусом 3px
        ctx.fill()
      })
    },
    updatePositions() {
      this.persons.forEach((person) => {
        // Обновляем позиции
        person.x += person.dx
        person.y += person.dy

        // Отскок от границ
        if (person.x < 0 || person.x > 800) person.dx *= -1
        if (person.y < 0 || person.y > 500) person.dy *= -1
      })
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
</style>

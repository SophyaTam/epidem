export class Person {
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
    this.inQuarantine = false // Находится ли в карантине
    this.exitingQuarantine = false // Процесс выхода из карантина
    this.movingToQuarantine = false // Процесс перемещения в карантин
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
      this.status === 'infected' && // 1. Текущий статус объекта - "зараженный"
      this.movingToQuarantine && // 2. Объект в процессе перемещения в карантин
      this.quarantineZone && // 3. Карантинная зона существует
      this.quarantineZone.x === 150 // 4. Текущая карантинная зона имеет x=150 (синяя зона)
    ) {
      this.movingToQuarantine = false // Сбрасываем флаг перемещения в карантин
      this.avoidancePoints = [] // Очищаем массив точек, которых нужно избегать
      this.currentAvoidancePoint = undefined // Сбрасываем текущую точку избегания

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
      const nearLeft = Math.abs(this.x - (zone.x + this.radius)) < 1 //Проверяем, находится ли объект близко к ЛЕВОЙ границе зоны t/f
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
      const target = this.currentAvoidancePoint || this.quarantineTarget // Если есть точка обхода - используем ее, иначе конечную цель карантина
      const dx = target.x - this.x // Вычисляем вектор направления к цели
      const dy = target.y - this.y
      const distance = Math.sqrt(dx * dx + dy * dy) // Вычисляем расстояние до цели (формула длины вектора)

      // Если достигли текущей точки маршрута
      if (distance < 2) {
        if (this.currentAvoidancePoint) {
          // Если это была промежуточная точка обхода
          // Берем следующую точку обхода
          this.currentAvoidancePoint = this.avoidancePoints.shift()
          if (!this.currentAvoidancePoint) {
            // Если точек обхода больше нет, направляем к основной цели
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
        // Если еще не достигли цели - продолжаем движение
        // Двигаемся к текущей точке
        const speed = 2
        this.dx = (dx / distance) * speed
        this.dy = (dy / distance) * speed

        // Проверяем, не попадаем ли в запретную зону
        let inForbiddenZone = false
        for (const zone of this.otherQuarantineZones) {
          // Проверяем, будет ли следующая позиция внутри запретной зоны
          if (this.isPointInRect(this.x + this.dx, this.y + this.dy, zone)) {
            inForbiddenZone = true
            break // Прерываем цикл при обнаружении препятствия
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
      const zone = this.quarantineZone // Сохраняем ссылку на зону карантина

      // Периодическое изменение направления (10% вероятность на каждом кадре)
      if (Math.random() < 0.1) {
        this.dx += (Math.random() - 0.5) * 0.5
        this.dy += (Math.random() - 0.5) * 0.5
      }

      // Проверяем минимальную скорость
      const speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy)
      const minQuarantineSpeed = 0.5
      if (speed < minQuarantineSpeed) {
        const angle = Math.random() * Math.PI * 2
        this.dx = minQuarantineSpeed * Math.cos(angle)
        this.dy = minQuarantineSpeed * Math.sin(angle)
      }

      // Движение
      this.x += this.dx
      this.y += this.dy

      // Проверка столкновения со стенами карантинной зоны:
      // Учитываем радиус объекта для корректного определения касания
      if (
        this.x <= zone.x + this.radius || // Левая стена
        this.x >= zone.x + zone.width - this.radius || // Правая стена
        this.y <= zone.y + this.radius || // Верхняя стена
        this.y >= zone.y + zone.height - this.radius // Нижняя стена
      ) {
        const bouncePower = 1.5 + Math.random() * 0.5 // Сила отскока
        const randomFactor = (Math.random() - 0.5) * 1.0 //Случайное отклонение (-0.5 до 0.5)

        // Отскок от вертикальных стен
        if (this.x <= zone.x + this.radius || this.x >= zone.x + zone.width - this.radius) {
          this.dx *= -bouncePower // Инвертируем горизонтальную скорость с усилением
          this.dy += randomFactor // Добавляем случайное отклонение по вертикали
        }
        // Отскок от горизонтальных стен
        else {
          this.dy *= -bouncePower // Инвертируем вертикальную скорость с усилением
          this.dx += randomFactor // Добавляем случайное отклонение по горизонтали
        }

        // Проверка минимальной скорости после отскока
        const minSpeedAfterBounce = 1.2
        const currentSpeed = Math.sqrt(this.dx * this.dx + this.dy * this.dy)
        if (currentSpeed < minSpeedAfterBounce) {
          const angle = Math.atan2(this.dy, this.dx) // Вычисляем текущий угол движения
          this.dx = minSpeedAfterBounce * Math.cos(angle) // Устанавливаем новую скорость с сохранением направления
          this.dy = minSpeedAfterBounce * Math.sin(angle)
        }
      }

      // Удерживаем персонажа в пределах карантина с небольшим отступом
      const margin = 1.0
      this.x = Math.max(
        zone.x + this.radius + margin,
        Math.min(zone.x + zone.width - this.radius - margin, this.x), // Минимальная X (левая граница + радиус + отступ)
      ) // Максимальная X (правая граница - радиус - отступ)
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
        this.x < zone.x - this.radius || // Проверка выхода за ЛЕВУЮ границу
        this.x > zone.x + zone.width + this.radius || // Проверка выхода за ПРАВУЮ границу
        this.y < zone.y - this.radius || // Проверка выхода за ВЕРХНЮЮ границу
        this.y > zone.y + zone.height + this.radius // Проверка выхода за НИЖНЮЮ границу
      ) {
        // Если объект полностью вышел - сбрасываем все карантинные флаги:
        this.inQuarantine = false // Больше не в карантине
        this.exitingQuarantine = false // Процесс выхода завершен
        this.quarantineZone = undefined // Сбрасываем ссылку на зону
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

      // Обработка столкновения с ЛЕВОЙ границей холста
      if (this.x < this.radius) {
        this.x = this.radius // Фиксируем позицию у границы
        this.dx = Math.abs(this.dx) * (0.9 + Math.random() * 0.2) // Отскок с сохранением 90-110% скорости и случайным коэффициентом
      } else if (this.x > canvasWidth - this.radius) {
        // Обработка столкновения с ПРАВОЙ границей холста
        this.x = canvasWidth - this.radius // Фиксируем позицию у границы
        this.dx = -Math.abs(this.dx) * (0.9 + Math.random() * 0.2) // Отскок с инверсией направления и 90-110% скорости
      }

      if (this.y < this.radius) {
        // Обработка столкновения с ВЕРХНЕЙ границей холста
        this.y = this.radius
        this.dy = Math.abs(this.dy) * (0.9 + Math.random() * 0.2) // Отскок с сохранением 90-110% скорости
      } else if (this.y > canvasHeight - this.radius) {
        //Обработка столкновения с НИЖНЕЙ границей холста
        this.y = canvasHeight - this.radius
        this.dy = -Math.abs(this.dy) * (0.9 + Math.random() * 0.2) // Отскок с инверсией направления и 90-110% скорости
      }
    }
  }

  // Проверка на смерть
  checkDeath(currentTime: number): boolean {
    if (this.status === 'infected' && this.infectionTime) {
      // Базовый шанс смерти + увеличивающийся со временем
      const timeInfected = (currentTime - this.infectionTime) / 1000 // в секундах
      const baseDeathChance = 0.0001 // 1% базовый шанс
      const timeDeathChance = Math.min(0.005, timeInfected * 0.00002) // +0.1% за каждую секунду, максимум 5%

      if (Math.random() < baseDeathChance + timeDeathChance) {
        this.status = 'dead'
        this.dx = 0
        this.dy = 0
        this.color = this.getColor()
        return true
      }
    }
    return false
  }
  // Отрисовка человека на холсте
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2) // Рисуем круг (персонажа) с параметрами
    ctx.fillStyle = this.getColor()
    ctx.fill()
  }

  // Заражение человека
  infect() {
    if (this.status === 'healthy') {
      this.status = 'infected'
      this.infectionTime = Date.now() // Записываем время заражения (текущее время в мс)

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
      } else if (Math.random() < 0.55) {
        // 40% шанс попасть в карантин при заражении
        this.inQuarantine = true
      }

      return true // Возвращаем true - заражение успешно
    }
    return false // Если персонаж уже был заражен - возвращаем false
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
      this.lineIntersectsLine(x1, y1, x2, y2, rect.x, rect.y, rect.x, rect.y + rect.height) // левая сторона
    )
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
    // Вычисление параметров ua и ub для параметрических уравнений линий
    // ua - положение точки пересечения относительно первого отрезка
    // ub - положение точки пересечения относительно второго отрезка
    const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom
    const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom

    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1 // Отрезки пересекаются, если оба параметра в диапазоне [0, 1]
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
              y: otherZone.y + otherZone.height + 30, // Отступ +30 снизу
            })
            this.avoidancePoints.push({
              x: this.quarantineTarget!.x,
              y: otherZone.y + otherZone.height + 30,
            })
          } else {
            // Движение вверх - обходим сверху с увеличенным отступом
            this.avoidancePoints.push({
              x: this.x,
              y: topAvoidanceY, // Увеличенный отступ -30 сверху
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
              x: otherZone.x + otherZone.width + 30, // Отступ +30 справа
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
export class InfectedPerson extends Person {
  constructor(x: number, y: number) {
    super(x, y)
    this.status = 'infected'
    this.infectionTime = Date.now()

    // 50% шанс попасть в карантин при создании
    if (Math.random() < 0.5) {
      this.inQuarantine = true
    }
  }
}

// Класс человека с иммунитетом (наследуется от Person)
export class ImmunePerson extends Person {
  constructor(x: number, y: number) {
    super(x, y)
    this.status = 'immune'
    this.color = this.getColor()
  }
}

// src/components/AnimatedMonster.js - VERSIÓN LIMPIA
import React, { useState, useEffect, useRef } from 'react'

// Importar imágenes
import idle1 from '../assets/monster/idle/1.png'
import idle2 from '../assets/monster/idle/2.png'
import idle3 from '../assets/monster/idle/3.png'
import idle4 from '../assets/monster/idle/4.png'
import idle5 from '../assets/monster/idle/5.png'

import read1 from '../assets/monster/read/1.png'
import read2 from '../assets/monster/read/2.png'
import read3 from '../assets/monster/read/3.png'
import read4 from '../assets/monster/read/4.png'

import cover8 from '../assets/monster/cover/8.png'

const AnimatedMonster = ({ 
  usernameLength = 0,
  isPasswordFocused = false
}) => {
  const [monsterImage, setMonsterImage] = useState(idle1)
  const [isMouseFollowing, setIsMouseFollowing] = useState(true)
  const mouseTimeoutRef = useRef(null)
  const lastMousePosition = useRef({ x: 0, y: 0 })

  // Configuración de imágenes
  const images = {
    idle: [idle1, idle2, idle3, idle4, idle5],
    read: [read1, read2, read3, read4],
    cover: cover8
  }

  // Efecto PRINCIPAL: Decidir qué imagen mostrar
  useEffect(() => {
    // 1. Si el password está enfocado, mostrar ojos tapados
    if (isPasswordFocused) {
      setMonsterImage(images.cover)
      setIsMouseFollowing(false)
      return
    }

    // 2. Si hay texto en el username, mostrar estado de lectura
    if (usernameLength > 0) {
      setIsMouseFollowing(false)
      
      if (usernameLength <= 5) {
        setMonsterImage(images.read[0])
      } else if (usernameLength <= 14) {
        setMonsterImage(images.read[1])
      } else if (usernameLength <= 20) {
        setMonsterImage(images.read[2])
      } else {
        setMonsterImage(images.read[3])
      }
      return
    }

    // 3. Si no hay nada especial, seguir el mouse
    setIsMouseFollowing(true)
    
  }, [usernameLength, isPasswordFocused, images])

  // Efecto para SEGUIR EL MOUSE (solo cuando isMouseFollowing es true)
  useEffect(() => {
    if (!isMouseFollowing) return

    const handleMouseMove = (e) => {
      // Control de frecuencia de actualización
      const now = Date.now()
      if (mouseTimeoutRef.current && now - mouseTimeoutRef.current < 100) {
        return
      }
      mouseTimeoutRef.current = now

      const { clientX: x, clientY: y } = e
      
      // Evitar actualizaciones por movimientos mínimos
      if (
        Math.abs(x - lastMousePosition.current.x) < 10 &&
        Math.abs(y - lastMousePosition.current.y) < 10
      ) {
        return
      }

      lastMousePosition.current = { x, y }

      const windowWidth = window.innerWidth
      const windowHeight = window.innerHeight

      // Determinar cuadrante y mostrar imagen correspondiente
      if (x < windowWidth / 2 && y < windowHeight / 2) {
        setMonsterImage(images.idle[1]) // arriba-izquierda
      } else if (x < windowWidth / 2 && y > windowHeight / 2) {
        setMonsterImage(images.idle[2]) // abajo-izquierda
      } else if (x > windowWidth / 2 && y < windowHeight / 2) {
        setMonsterImage(images.idle[4]) // arriba-derecha
      } else {
        setMonsterImage(images.idle[3]) // abajo-derecha
      }
    }

    // Función para resetear a posición central
    const resetToCenter = () => {
      setMonsterImage(images.idle[0])
    }

    window.addEventListener('mousemove', handleMouseMove)
    
    // Resetear después de 2 segundos sin movimiento
    const resetTimer = setTimeout(resetToCenter, 2000)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      clearTimeout(resetTimer)
      if (mouseTimeoutRef.current) {
        clearTimeout(mouseTimeoutRef.current)
      }
    }
  }, [isMouseFollowing, images.idle])

  return (
    <div className="monster-container">
      <img 
        src={monsterImage} 
        alt="Monster" 
        className="monster-image"
        style={{
          width: '300px',
          height: 'auto',
          transition: 'transform 0.3s ease'
        }}
      />
    </div>
  )
}

export default AnimatedMonster
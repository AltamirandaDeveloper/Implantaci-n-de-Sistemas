// src/views/pages/login/Login.js - AJUSTAR EL TÍTULO
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CForm,
  CFormInput,
  CSpinner,
  CAlert
} from '@coreui/react'
import axios from 'axios'
import AnimatedMonster from '../../../components/AnimatedMonster'
import './Login.css'

const API_URL = 'http://localhost:3001'

const Login = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [status, setStatus] = useState({
    loading: false,
    error: '',
    success: ''
  })
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)
  const [usernameLength, setUsernameLength] = useState(0)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    if (name === 'email') {
      setUsernameLength(value.length)
    }
  }

  const handlePasswordFocus = () => {
    setIsPasswordFocused(true)
  }

  const handlePasswordBlur = () => {
    setIsPasswordFocused(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.email.trim() || !formData.password.trim()) {
      setStatus({
        ...status,
        error: 'Por favor, completa todos los campos'
      })
      return
    }

    setStatus({
      loading: true,
      error: '',
      success: ''
    })

    try {
      const response = await axios.get(`${API_URL}/usuarios`, {
        params: {
          email: formData.email.trim()
        }
      })

      if (!response.data || response.data.length === 0) {
        throw new Error('Credenciales inválidas')
      }

      const user = response.data[0]

      if (user.password !== formData.password) {
        throw new Error('Credenciales inválidas')
      }

      const userData = {
        id: user.id,
        email: user.email,
        name: user.nombre || user.name || user.email.split('@')[0],
        role: user.role || 'user'
      }

      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('token', `auth-${user.id}-${Date.now()}`)

      setStatus({
        loading: false,
        error: '',
        success: '¡Inicio de sesión exitoso! Redirigiendo...'
      })

      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)

    } catch (error) {
      let errorMessage = 'Error al iniciar sesión'
      
      if (error.response) {
        errorMessage = error.response.status === 404 
          ? 'Servicio no disponible' 
          : `Error del servidor (${error.response.status})`
      } else if (error.request) {
        errorMessage = 'No se pudo conectar con el servidor'
      } else if (error.message) {
        errorMessage = error.message
      }

      setStatus({
        loading: false,
        error: errorMessage,
        success: ''
      })
      
      setFormData(prev => ({ ...prev, password: '' }))
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Monstruo animado - SE SUPERPONE AL FORMULARIO */}
        <AnimatedMonster 
          usernameLength={usernameLength}
          isPasswordFocused={isPasswordFocused}
        />

        {/* Formulario de login - CON MÁRGEN PARA EL MONSTRUO */}
        <CCard className="login-form">
          <CCardBody>
            {/* Título más pequeño ya que el monstruo es el foco */}
            <h2 className="text-center mb-4">
              Plataforma de Inglés
              Colegio San Juan Bautista
            </h2>

            {status.error && (
              <CAlert color="danger" className="mb-3">
                {status.error}
              </CAlert>
            )}

            {status.success && (
              <CAlert color="success" className="mb-3 d-flex align-items-center">
                <CSpinner size="sm" className="me-2" />
                {status.success}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <CFormInput
                  type="email"
                  name="email"
                  id="input-usuario"
                  placeholder="ejemplo@gmail.com"
                  autoComplete="username"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={status.loading}
                  className={status.error ? 'is-invalid' : ''}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <CFormInput
                  type="password"
                  name="password"
                  id="input-clave"
                  placeholder="********"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  required
                  disabled={status.loading}
                  className={status.error ? 'is-invalid' : ''}
                />
              </div>

              <div className="d-grid gap-2 mt-4">
                <CButton 
                  type="submit" 
                  color="primary"
                  disabled={status.loading}
                  style={{
                    backgroundColor: '#824283',
                    borderColor: '#824283',
                    fontFamily: "'Bowlby One SC', cursive"
                  }}
                >
                  {status.loading ? (
                    <div className="spinner-container">
                      <CSpinner size="sm" className="me-2" />
                      Procesando...
                    </div>
                  ) : 'ACCEDER'}
                </CButton>
              </div>
            </CForm>
          </CCardBody>
        </CCard>
      </div>
    </div>
  )
}

export default Login
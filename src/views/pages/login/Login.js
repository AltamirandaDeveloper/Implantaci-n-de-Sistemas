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
import { supabase } from '../../../lib/supabase' 
import AnimatedMonster from '../../../components/AnimatedMonster'
import './Login.css'

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

  const handlePasswordFocus = () => setIsPasswordFocused(true)
  const handlePasswordBlur = () => setIsPasswordFocused(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.email.trim() || !formData.password.trim()) {
      setStatus({ ...status, error: 'Por favor, completa todos los campos' })
      return
    }

    setStatus({ loading: true, error: '', success: '' })

    try {
      // ---------------------------------------------------------
      // 1. CONSULTA BASE: Tabla 'usuarios'
      // ---------------------------------------------------------
      const { data: users, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', formData.email.trim())
        .limit(1)

      if (error) throw error

      if (!users || users.length === 0) {
        throw new Error('Credenciales inválidas')
      }

      const user = users[0]

      // Validación de contraseña (texto plano según tu esquema actual)
      if (user.password !== formData.password) {
        throw new Error('Credenciales inválidas')
      }

      // ---------------------------------------------------------
      // 2. BUSCAR EL GRADO SEGÚN EL ROL
      // ---------------------------------------------------------
      let gradoEncontrado = null;
      const roleId = Number(user.id_role); // Aseguramos que sea número

      // --- CASO A: ESTUDIANTE (Rol 2) ---
      if (roleId === 2) {
        // Buscamos en tabla 'estudiantes' usando id_usuario
        const { data: datosEstudiante, error: errEst } = await supabase
          .from('estudiantes')
          .select('id_grado')
          .eq('id_usuario', user.id)
          .maybeSingle()
        
        if (!errEst && datosEstudiante) {
            gradoEncontrado = datosEstudiante.id_grado;
        }
      } 
      // --- CASO B: DOCENTE (Rol 3) ---
      else if (roleId === 3) {
        // PASO B.1: Buscar el ID de perfil en la tabla 'docente'
        const { data: perfilDocente, error: errPerfil } = await supabase
            .from('docente') // Según tu esquema es singular
            .select('id')
            .eq('id_usuario', user.id)
            .maybeSingle()

        if (!errPerfil && perfilDocente) {
            // PASO B.2: Buscar el grado en la tabla intermedia 'docente_grados'
            // Nota: Si un docente tiene varios grados, aquí tomamos el PRIMERO (.limit(1))
            // para asignarlo como su contexto actual.
            const { data: relacionGrado, error: errGrado } = await supabase
                .from('docente_grados')
                .select('id_grado')
                .eq('id_docente', perfilDocente.id)
                .limit(1) // Tomamos el primero
                .maybeSingle()

            if (!errGrado && relacionGrado) {
                gradoEncontrado = relacionGrado.id_grado;
            }
        }
      }

      // ---------------------------------------------------------
      // 3. CONSTRUIR OBJETO DE SESIÓN
      // ---------------------------------------------------------
      const roleMap = {
        1: 'admin',
        2: 'student',
        3: 'teacher',
      }

      const userData = {
        id_usuario: user.id, // ID en tabla usuarios (PK)
        id: user.id,         // Redundancia útil para el frontend
        nombre: user.nombre || '',
        apellido: user.apellido || '',
        email: user.email || '',
        telefono: user.telefono || '',
        id_role: user.id_role,
        role: roleMap[user.id_role] || 'student',
        // AQUÍ GUARDAMOS EL GRADO OBTENIDO
        id_grado: gradoEncontrado 
      }
      
      console.log("Datos de sesión guardados:", userData); // Para depuración

      // ---------------------------------------------------------
      // 4. GUARDAR Y REDIRIGIR
      // ---------------------------------------------------------
      const SESSION_DURATION = 1000 * 60 * 60 * 8 // 8 horas
      const authData = {
        token: `supabase-auth-${userData.id}-${Date.now()}`,
        expiresAt: Date.now() + SESSION_DURATION,
      }

      sessionStorage.setItem('auth', JSON.stringify(authData))
      sessionStorage.setItem('user', JSON.stringify(userData))
      sessionStorage.setItem('token', authData.token)
      localStorage.clear()

      setStatus({
        loading: false,
        error: '',
        success: '¡Inicio de sesión exitoso! Redirigiendo...'
      })

      setTimeout(() => {
        if (Number(userData.id_role) === 2) {
          navigate('/content', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      }, 1500)

    } catch (error) {
      console.error("Error en login:", error)
      setStatus({
        loading: false,
        error: error.message || 'Error al conectar con el servidor',
        success: ''
      })
      setFormData(prev => ({ ...prev, password: '' }))
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <AnimatedMonster 
          usernameLength={usernameLength}
          isPasswordFocused={isPasswordFocused}
        />

        <CCard className="login-form shadow-lg">
          <CCardBody className="p-4">
            <h2 className="text-center mb-4" style={{ fontFamily: "'Bowlby One SC', cursive", color: '#4a4a4a' }}>
              Plataforma de Inglés
              <small className="d-block text-muted mt-2" style={{ fontSize: '0.6em' }}>Colegio San Juan Bautista</small>
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
              <div className="mb-3">
                <label className="form-label" htmlFor="email">Email</label>
                <CFormInput
                  type="email"
                  name="email"
                  placeholder="ejemplo@gmail.com"
                  autoComplete="username"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={status.loading}
                />
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="password">Contraseña</label>
                <CFormInput
                  type="password"
                  name="password"
                  placeholder="********"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={handlePasswordFocus}
                  onBlur={handlePasswordBlur}
                  required
                  disabled={status.loading}
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
                    fontFamily: "'Bowlby One SC', cursive",
                    padding: '12px'
                  }}
                >
                  {status.loading ? <CSpinner size="sm" /> : 'ACCEDER'}
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
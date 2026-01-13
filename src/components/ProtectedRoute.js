import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'

const ProtectedRoute = ({ children, allowedRoles }) => {
  // Añadimos 'authenticated' al estado para distinguir entre "no logueado" y "sin permiso"
  const [state, setState] = useState({ loading: true, allowed: false, authenticated: false })

  useEffect(() => {
    const checkAuth = () => {
      try {
        const auth = JSON.parse(sessionStorage.getItem('auth'))
        const user = JSON.parse(sessionStorage.getItem('user'))

        // Si no hay sesión
        if (!auth || !user) {
          return setState({ loading: false, allowed: false, authenticated: false })
        }

        // Si expiró
        if (Date.now() > auth.expiresAt) {
          sessionStorage.clear()
          return setState({ loading: false, allowed: false, authenticated: false })
        }

        // Verificación de roles
        let allowed = true
        if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
          const userRole = Number(user.id_role ?? user.role ?? -1)
          const allowedNums = allowedRoles.map(r => Number(r))
          allowed = allowedNums.includes(userRole)
        }

        // Usuario autenticado, guardamos si es permitido o no
        setState({ loading: false, allowed, authenticated: true })
      } catch {
        setState({ loading: false, allowed: false, authenticated: false })
      }
    }

    checkAuth()
  }, [allowedRoles])

  if (state.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <CSpinner />
      </div>
    )
  }

  // 1. Si tiene permiso, renderiza el hijo
  if (state.allowed) {
    return children
  }

  // 2. Si está autenticado pero NO tiene permiso (ej: Estudiante entrando a Dashboard) -> 404
  if (state.authenticated && !state.allowed) {
    return <Navigate to="/404" replace />
  }

  // 3. Si no está autenticado -> Login
  return <Navigate to="/login" replace />
}

export default ProtectedRoute
import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [state, setState] = useState({ loading: true, allowed: false })

  useEffect(() => {
    const checkAuth = () => {
      try {
        // CAMBIO: localStorage -> sessionStorage
        const auth = JSON.parse(sessionStorage.getItem('auth'))
        const user = JSON.parse(sessionStorage.getItem('user'))

        if (!auth || !user) {
          return setState({ loading: false, allowed: false })
        }

        if (Date.now() > auth.expiresAt) {
          // CAMBIO: localStorage -> sessionStorage
          sessionStorage.removeItem('auth')
          sessionStorage.removeItem('user')
          sessionStorage.removeItem('token')
          return setState({ loading: false, allowed: false })
        }

        // Si se pasan roles permitidos, comprobar que el usuario tenga uno de ellos
        let allowed = true
        if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
          const userRole = Number(user.id_role ?? user.role ?? user.role_id ?? -1)
          const allowedNums = allowedRoles.map(r => Number(r))
          allowed = allowedNums.includes(userRole)
        }

        setState({ loading: false, allowed })
      } catch {
        setState({ loading: false, allowed: false })
      }
    }

    checkAuth()
  }, [allowedRoles]) // Añadimos allowedRoles como dependencia para mayor seguridad

  if (state.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <CSpinner />
      </div>
    )
  }

  // Si no está permitido, redirigimos al login (o al 404 como tenías)
  // Nota: Si no hay usuario en la pestaña actual, ahora irá directo a no permitido
  return state.allowed ? children : <Navigate to="/login" replace />
}

export default ProtectedRoute
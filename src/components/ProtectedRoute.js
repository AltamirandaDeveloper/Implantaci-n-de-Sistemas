import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const [state, setState] = useState({ loading: true, allowed: false })

  useEffect(() => {
    const checkAuth = () => {
      try {
        const auth = JSON.parse(localStorage.getItem('auth'))
        const user = JSON.parse(localStorage.getItem('user'))

        if (!auth || !user) {
          return setState({ loading: false, allowed: false })
        }

        if (Date.now() > auth.expiresAt) {
          localStorage.removeItem('auth')
          localStorage.removeItem('user')
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
  }, [])

  if (state.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <CSpinner />
      </div>
    )
  }

  return state.allowed ? children : <Navigate to="/404" replace />
}

export default ProtectedRoute

// src/components/ProtectedRoute.js
import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { CSpinner } from '@coreui/react'

const ProtectedRoute = ({ children }) => {
  const [authStatus, setAuthStatus] = useState({
    loading: true,
    isAuthenticated: false
  })

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token')
        const user = localStorage.getItem('user')
        
        // Verificar que ambos existan y user sea JSON válido
        const isValid = !!(token && user)
        setAuthStatus({
          loading: false,
          isAuthenticated: isValid
        })
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        setAuthStatus({
          loading: false,
          isAuthenticated: false
        })
      }
    }

    checkAuth()

    // Escuchar cambios en localStorage
    const handleStorageChange = () => {
      checkAuth()
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  if (authStatus.loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <CSpinner color="primary" />
          <p className="mt-2">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  if (!authStatus.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
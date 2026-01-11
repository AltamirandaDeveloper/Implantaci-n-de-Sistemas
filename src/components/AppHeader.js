import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom' // Importamos para redireccionar
import {
  CContainer,
  CHeader,
  CHeaderToggler,
  CHeaderNav,
  CNavItem,
  CNavLink,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMenu, cilAccountLogout } from '@coreui/icons'

import { AppBreadcrumb } from './index'

const AppHeader = () => {
  const headerRef = useRef()
  const dispatch = useDispatch()
  const navigate = useNavigate() // Hook para navegación
  const sidebarShow = useSelector((state) => state.sidebarShow)

  useEffect(() => {
    const handleScroll = () => {
      headerRef.current &&
        headerRef.current.classList.toggle('shadow-sm', document.documentElement.scrollTop > 0)
    }

    document.addEventListener('scroll', handleScroll)
    return () => document.removeEventListener('scroll', handleScroll)
  }, [])

  // FUNCIÓN DE LOGOUT COHERENTE CON TU LOGIN
  const handleLogout = (e) => {
    e.preventDefault()
    
    sessionStorage.clear()
    navigate('/login', { replace: true })
  }

  return (
    <CHeader position="sticky" className="mb-4 p-0" ref={headerRef}>
      <CContainer className="border-bottom px-4" fluid>
        {/* Botón de Menú (Izquierda) */}
        <CHeaderToggler
          onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
          style={{ marginInlineStart: '-14px' }}
        >
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        {/* Botón de Cerrar Sesión (Derecha) */}
        <CHeaderNav className="ms-auto">
          <CNavItem>
            <CNavLink 
              href="#" 
              onClick={handleLogout}
              className="d-flex align-items-center fw-semibold"
              style={{ color: '#e55353', cursor: 'pointer' }}
            >
              <CIcon icon={cilAccountLogout} size="lg" className="me-2" />
              <span className="d-none d-md-inline">Cerrar Sesión</span>
            </CNavLink>
          </CNavItem>
        </CHeaderNav>
      </CContainer>
      
      {/* Contenedor del Breadcrumb */}
      <CContainer className="px-4" fluid>
        <AppBreadcrumb />
      </CContainer>
    </CHeader>
  )
}

export default AppHeader
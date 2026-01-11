// src/App.js
import React, { Suspense, useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { CSpinner, useColorModes } from '@coreui/react'
import './scss/style.scss'
import './scss/examples.scss'

// Import ProtectedRoute directamente
import ProtectedRoute from './components/ProtectedRoute'

// Lazy loading para mejor performance
const DefaultLayout = React.lazy(() => import('./layout/DefaultLayout'))
const Login = React.lazy(() => import('./views/pages/login/Login'))
const Register = React.lazy(() => import('./views/pages/register/Register'))
const Page404 = React.lazy(() => import('./views/pages/page404/Page404'))
const Page500 = React.lazy(() => import('./views/pages/page500/Page500'))

const App = () => {
  // Mantenemos useColorModes pero solo para forzar el estado 'light'
  const { setColorMode } = useColorModes('coreui-free-react-admin-template-theme')

  useEffect(() => {
    // Forzamos el modo claro inmediatamente al cargar la App
    setColorMode('light')
    
    // Opcional: Forzar el atributo en el HTML por si acaso
    document.documentElement.setAttribute('data-coreui-theme', 'light')
  }, [setColorMode])

  return (
    <HashRouter>
      <Suspense
        fallback={
          <div className="pt-3 text-center">
            <CSpinner color="primary" variant="grow" />
          </div>
        }
      >
        <Routes>
          {/* Rutas públicas */}
          <Route exact path="/login" name="Login Page" element={<Login />} />
          <Route exact path="/register" name="Register Page" element={<Register />} />
          <Route exact path="/404" name="Page 404" element={<Page404 />} />
          <Route exact path="/500" name="Page 500" element={<Page500 />} />
          
          {/* Todas las demás rutas protegidas */}
          <Route 
            path="*" 
            name="Home" 
            element={
              <ProtectedRoute>
                <DefaultLayout />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </Suspense>
    </HashRouter>
  )
}

export default App
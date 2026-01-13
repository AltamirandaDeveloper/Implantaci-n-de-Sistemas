import React, { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { CContainer, CSpinner } from '@coreui/react'
import ProtectedRoute from './ProtectedRoute'
import routes from '../routes'

// Importa tu página 404. Si usas la plantilla CoreUI suele estar en:
const Page404 = React.lazy(() => import('../views/pages/page404/Page404')) 
// O si no tienes el archivo aún, crea uno simple o comenta la línea de arriba y usa un div temporal.

const AppContent = () => {
  return (
    <CContainer className="px-4" lg>
      <Suspense fallback={<CSpinner color="primary" />}>
        <Routes>
          {routes.map((route, idx) => {
            if (!route.element) return null
            const Element = route.element
            const elementNode = <Element />
            
            return (
              <Route
                key={idx}
                path={route.path}
                exact={route.exact}
                name={route.name}
                element={
                  route.allowedRoles && Array.isArray(route.allowedRoles) && route.allowedRoles.length > 0
                    ? <ProtectedRoute allowedRoles={route.allowedRoles}>{elementNode}</ProtectedRoute>
                    : elementNode
                }
              />
            )
          })}
          
          {/* Ruta raíz: Redirección inteligente */}
          {/* Si un estudiante entra a raíz, irá a dashboard -> ProtectedRoute detecta rol -> manda a 404. 
              Para evitar eso, podrías redirigir a 'content' por defecto, pero dejémoslo en dashboard 
              para que ProtectedRoute haga su trabajo de seguridad. */}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
          
          {/* AÑADIR LA RUTA 404 */}
          <Route path="/404" element={<Page404 />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
          
        </Routes>
      </Suspense>
    </CContainer>
  )
}

export default React.memo(AppContent)
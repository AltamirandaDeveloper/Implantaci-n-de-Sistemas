import React from 'react'
import {
  CButton,
  CCol,
  CContainer,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilMagnifyingGlass } from '@coreui/icons'

const Page404 = () => {
  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={6}>
            <div className="clearfix">
              <h1 className="float-start display-3 me-4">404</h1>
              <h4 className="pt-3">¡Ups! Estás perdido.</h4>
              <p className="text-body-secondary float-start">
                La página que buscas no fue encontrada o no tienes permiso para acceder.
              </p>
            </div>
            <div className="mt-4 d-flex gap-2">
              <CButton color="primary" href="#/login">Ir al Login</CButton>
              <CButton color="secondary" onClick={() => window.history.back()}>Volver atrás</CButton>
            </div>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Page404

import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CModalTitle,
  CContainer,
  CRow,
  CCol,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilHttps, cilPencil } from '@coreui/icons'

const Profile = () => {
  const [userInfo, setUserInfo] = useState({})
  const [editInfo, setEditInfo] = useState({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' })
  const [formErrors, setFormErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUserInfo(JSON.parse(storedUser))
    }
  }, [])

  const openEditModal = () => {
    setEditInfo({
      nombre: userInfo.nombre || '',
      apellido: userInfo.apellido || '',
      email: userInfo.email || '',
      telefono: userInfo.telefono || '',
    })
    setFormErrors({})
    setShowEditModal(true)
  }

  const handleEditInfo = () => {
    const errors = {}
    if (!editInfo.nombre) errors.nombre = 'Nombre requerido'
    if (!editInfo.apellido) errors.apellido = 'Apellido requerido'
    if (!editInfo.email) errors.email = 'Email requerido'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const updatedUser = { ...userInfo, ...editInfo }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUserInfo(updatedUser)
    setShowEditModal(false)
    setSuccessMessage('Información actualizada correctamente')
  }

  const handleChangePassword = () => {
    const errors = {}
    if (!password.current) errors.current = 'Ingrese la contraseña actual'
    if (!password.new) errors.new = 'Ingrese la nueva contraseña'
    if (password.new !== password.confirm) errors.confirm = 'La nueva contraseña no coincide'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    if (password.current !== userInfo.password) {
      setFormErrors({ current: 'Contraseña actual incorrecta' })
      return
    }

    const updatedUser = { ...userInfo, password: password.new }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUserInfo(updatedUser)
    setPassword({ current: '', new: '', confirm: '' })
    setShowPasswordModal(false)
    setSuccessMessage('Contraseña actualizada correctamente')
  }

  return (
    <div className="d-flex justify-content-center align-items-center flex-column">
      {successMessage && (
        <div
          className="alert alert-success text-center w-100"
          role="alert"
          style={{ maxWidth: 600 }}
        >
          {successMessage}
        </div>
      )}

      <CContainer>
        <CRow className="justify-content-center component-space">
          <CCol xs={12} md={6}>
            <CCard>
              <CCardHeader>
                <h5 className="text-center w-100">Información Personal</h5>
              </CCardHeader>
              <CCardBody>
                <div className="text-center mb-4">
                  <div className="mb-2">
                    <strong>Nombre:</strong> {userInfo.nombre}
                  </div>
                  <div className="mb-2">
                    <strong>Apellido:</strong> {userInfo.apellido}
                  </div>
                  <div className="mb-2">
                    <strong>Teléfono:</strong> {userInfo.telefono || 'No disponible'}
                  </div>
                  <div className="mb-2">
                    <strong>Email:</strong> {userInfo.email}
                  </div>
                  <div className="mb-2">
                    <strong>Rol:</strong> {userInfo.id_role === 1 ? 'Admin' : userInfo.id_role === 2 ? 'Estudiante' : 'Docente'}
                  </div>
                </div>
                <div className="d-flex justify-content-center gap-3">
                  <CButton color="primary" onClick={openEditModal}>
                    <CIcon icon={cilPencil} /> Editar Información
                  </CButton>
                  <CButton color="info" className="text-white" onClick={() => setShowPasswordModal(true)}>
                    <CIcon icon={cilHttps} className="me-2" />
                    Cambiar Contraseña
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>

      {/* Modal Editar Información */}
      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <CModalHeader>Editar Información Personal</CModalHeader>
        <CModalBody>
          <CForm>
            <CFormInput
              label="Nombre"
              value={editInfo.nombre || ''}
              onChange={(e) => setEditInfo({ ...editInfo, nombre: e.target.value })}
              className="mb-2"
              invalid={!!formErrors.nombre}
              feedback={formErrors.nombre}
            />
            <CFormInput
              label="Apellido"
              value={editInfo.apellido || ''}
              onChange={(e) => setEditInfo({ ...editInfo, apellido: e.target.value })}
              className="mb-2"
              invalid={!!formErrors.apellido}
              feedback={formErrors.apellido}
            />
            <CFormInput
              label="Teléfono"
              value={editInfo.telefono || ''}
              onChange={(e) => setEditInfo({ ...editInfo, telefono: e.target.value })}
              className="mb-2"
            />
            <CFormInput
              label="Email"
              value={editInfo.email || ''}
              onChange={(e) => setEditInfo({ ...editInfo, email: e.target.value })}
              className="mb-2"
              invalid={!!formErrors.email}
              feedback={formErrors.email}
            />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={handleEditInfo}>
            Guardar
          </CButton>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>
            Cancelar
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Cambiar Contraseña */}
      <CModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)}>
        <CModalHeader>
          <CModalTitle>Cambiar Contraseña</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CFormInput
              type="password"
              label="Contraseña Actual"
              value={password.current}
              onChange={(e) => setPassword({ ...password, current: e.target.value })}
              className="mb-3"
              invalid={!!formErrors.current}
              feedback={formErrors.current}
            />
            <CFormInput
              type="password"
              label="Nueva Contraseña"
              value={password.new}
              onChange={(e) => setPassword({ ...password, new: e.target.value })}
              className="mb-3"
              invalid={!!formErrors.new}
              feedback={formErrors.new}
            />
            <CFormInput
              type="password"
              label="Confirmar Nueva Contraseña"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              className="mb-3"
              invalid={!!formErrors.confirm}
              feedback={formErrors.confirm}
            />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" onClick={handleChangePassword}>
            Guardar
          </CButton>
          <CButton color="secondary" onClick={() => setShowPasswordModal(false)}>
            Cancelar
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Profile

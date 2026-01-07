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
      try {
        const parsed = JSON.parse(storedUser)
        // Normalize fields coming from different backends/localstorage shapes
        const nombreRaw = parsed.nombre || parsed.name || parsed.fullName || parsed.nombre_completo || ''
        const apellidoRaw = parsed.apellido || parsed.lastName || parsed.surname || ''
        let nombre = nombreRaw
        let apellido = apellidoRaw
        // If only a full name was provided, try to split into nombre/apellido
        if (!apellido && nombreRaw && nombreRaw.trim().includes(' ')) {
          const parts = nombreRaw.trim().split(' ')
          nombre = parts.shift()
          apellido = parts.join(' ')
        }
        const roleField = parsed.id_role || parsed.idRole || parsed.role || parsed.role_id
        const idRole = typeof roleField === 'string'
          ? (roleField === 'student' ? 2 : roleField === 'docente' || roleField === 'teacher' ? 3 : roleField === 'admin' ? 1 : Number(roleField) || roleField)
          : roleField

        const normalized = {
          id_usuario: parsed.id_usuario || parsed.id || parsed.userId || parsed.user_id,
          nombre: nombre || '',
          apellido: apellido || '',
          email: parsed.email || parsed.emailAddress || parsed.mail || '',
          telefono: parsed.telefono || parsed.phone || parsed.telefono_movil || '',
          id_role: idRole,
          password: parsed.password || parsed.pass || ''
        }
        setUserInfo(normalized)
      } catch (e) {
        console.error('Error parsing stored user', e)
      }
    }
  }, [])

    // Helper: update user on server and return merged record (or throw)
    const updateUserOnServer = async (updated) => {
      const apiBase = 'http://localhost:3001/usuarios'
      // Prefer `id` (resource id) then try `id_usuario` query
      const resourceId = updated.id || updated.id_usuario
      try {
        if (resourceId) {
          // Try PATCH by id
          const res = await fetch(`${apiBase}/${resourceId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
          })
          if (res.ok) return await res.json()
        }
      } catch (e) {
        // ignore and try query by id_usuario below
      }

      // If we reach here, try to find by id_usuario query and PATCH that record
      try {
        if (updated.id_usuario) {
          const q = await fetch(`${apiBase}?id_usuario=${updated.id_usuario}`)
          const arr = await q.json()
          if (Array.isArray(arr) && arr.length > 0) {
            const record = arr[0]
            const res2 = await fetch(`${apiBase}/${record.id}`, {
              method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
            })
            if (res2.ok) return await res2.json()
          }
        }
      } catch (e) {
        // ignore
      }

      // Last resort: try PUT to /usuarios/:id_usuario (some setups)
      try {
        if (updated.id_usuario) {
          const res3 = await fetch(`${apiBase}/${updated.id_usuario}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
          })
          if (res3.ok) return await res3.json()
        }
      } catch (e) {
        // ignore
      }

      throw new Error('No se pudo actualizar el usuario en el servidor')
    }

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
    ;(async () => {
      const updatedUser = { ...userInfo, ...editInfo }
      try {
        const serverUser = await updateUserOnServer(updatedUser)
        const merged = { ...updatedUser, ...serverUser }
        try { localStorage.setItem('user', JSON.stringify(merged)) } catch (e) { /* ignore */ }
        setUserInfo(merged)
        setShowEditModal(false)
        setSuccessMessage('Información actualizada correctamente')
      } catch (e) {
        console.error(e)
        setFormErrors({ form: 'No se pudo actualizar en el servidor. Intenta de nuevo.' })
      }
    })()
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
    ;(async () => {
      const updatedUser = { ...userInfo, password: password.new }
      try {
        const serverUser = await updateUserOnServer(updatedUser)
        const merged = { ...updatedUser, ...serverUser }
        try { localStorage.setItem('user', JSON.stringify(merged)) } catch (e) { }
        setUserInfo(merged)
        setPassword({ current: '', new: '', confirm: '' })
        setShowPasswordModal(false)
        setSuccessMessage('Contraseña actualizada correctamente')
      } catch (e) {
        console.error(e)
        setFormErrors({ form: 'No se pudo actualizar la contraseña en el servidor' })
      }
    })()
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

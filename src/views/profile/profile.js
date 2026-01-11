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
import { cilHttps, cilPencil, cilSchool } from '@coreui/icons'
import { supabase } from '../../lib/supabase'

const Profile = () => {
  const [userInfo, setUserInfo] = useState({})
  const [gradoNombre, setGradoNombre] = useState('')
  const [editInfo, setEditInfo] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
  })
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' })
  const [formErrors, setFormErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  // Estilo morado personalizado
  const purpleStyle = { backgroundColor: '#824283', borderColor: '#824283', color: 'white' }

  useEffect(() => {
    const fetchUserData = async () => {
      const storedUser = sessionStorage.getItem('user')
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser)
          const userId = parsed.id_usuario || parsed.id
          
          setUserInfo({
            ...parsed,
            id_usuario: userId
          })

          // Lógica corregida según tu estructura de tablas
          if (Number(parsed.id_role) === 2) {
            // 1. Buscar en la tabla estudiantes el id_grado
            const { data: estData, error: estError } = await supabase
              .from('estudiantes')
              .select('id_grado')
              .eq('id_usuario', userId)
              .single()

            if (estData && estData.id_grado) {
              // 2. Buscar el nombre en la tabla grados
              const { data: gradoData } = await supabase
                .from('grados')
                .select('nombre')
                .eq('id', estData.id_grado)
                .single()
              
              if (gradoData) setGradoNombre(`Grado ${gradoData.nombre}`)
            }
          }
        } catch (e) {
          console.error('Error al cargar datos de perfil:', e)
        }
      }
    }

    fetchUserData()
  }, [])

  const updateUserOnServer = async (payload) => {
    const id = userInfo.id_usuario || userInfo.id
    const { data, error } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
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

  const handleEditInfo = async () => {
    const errors = {}
    if (!editInfo.nombre) errors.nombre = 'Requerido'
    if (!editInfo.apellido) errors.apellido = 'Requerido'
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    try {
      const serverUser = await updateUserOnServer({
        nombre: editInfo.nombre,
        apellido: editInfo.apellido,
        email: editInfo.email,
        telefono: editInfo.telefono,
      })
      const mergedUser = { ...userInfo, ...serverUser }
      sessionStorage.setItem('user', JSON.stringify(mergedUser))
      setUserInfo(mergedUser)
      setShowEditModal(false)
      setSuccessMessage('Perfil actualizado')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (e) {
      setFormErrors({ form: 'Error al actualizar.' })
    }
  }

  const handleChangePassword = async () => {
    if (password.current !== userInfo.password) {
      setFormErrors({ current: 'Contraseña actual incorrecta' })
      return
    }
    if (password.new !== password.confirm) {
      setFormErrors({ confirm: 'No coinciden' })
      return
    }

    try {
      await updateUserOnServer({ password: password.new })
      const mergedUser = { ...userInfo, password: password.new }
      sessionStorage.setItem('user', JSON.stringify(mergedUser))
      setUserInfo(mergedUser)
      setShowPasswordModal(false)
      setPassword({ current: '', new: '', confirm: '' })
      setSuccessMessage('Contraseña cambiada')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (e) {
      setFormErrors({ form: 'Error de servidor' })
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center flex-column p-4">
      {successMessage && (
        <div className="alert alert-success text-center w-100 mb-4" style={{ maxWidth: 600 }}>
          {successMessage}
        </div>
      )}

      <CContainer>
        <CRow className="justify-content-center">
          <CCol xs={12} md={8} lg={6}>
            <CCard className="shadow-lg border-0">
              <CCardHeader className="py-3" style={purpleStyle}>
                <h5 className="mb-0 text-center" style={{ letterSpacing: '1px', fontWeight: 'bold' }}>
                  MI PERFIL
                </h5>
              </CCardHeader>
              <CCardBody className="p-4">
                <div className="mb-4">
                  <div className="row mb-3 border-bottom pb-2">
                    <div className="col-4 text-muted small fw-bold text-uppercase">Nombre:</div>
                    <div className="col-8 fw-bold">{userInfo.nombre}</div>
                  </div>
                  <div className="row mb-3 border-bottom pb-2">
                    <div className="col-4 text-muted small fw-bold text-uppercase">Apellido:</div>
                    <div className="col-8 fw-bold">{userInfo.apellido}</div>
                  </div>
                  <div className="row mb-3 border-bottom pb-2">
                    <div className="col-4 text-muted small fw-bold text-uppercase">Email:</div>
                    <div className="col-8">{userInfo.email}</div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-4 text-muted small fw-bold text-uppercase">Rol:</div>
                    <div className="col-8">
                      <span className="badge p-2" style={purpleStyle}>
                        {userInfo.id_role === 1 ? 'Administrador' : userInfo.id_role === 2 ? 'Estudiante' : 'Docente'}
                      </span>
                    </div>
                  </div>
                  {/* Campo de Grado dinámico según tu lógica de estudiantes */}
                  {Number(userInfo.id_role) === 2 && gradoNombre && (
                    <div className="row mb-3 border-bottom pb-2">
                      <div className="col-4 text-muted small fw-bold text-uppercase">Grado:</div>
                      <div className="col-8 text-primary fw-bold">
                        <CIcon icon={cilSchool} className="me-2" />
                        {gradoNombre}
                      </div>
                    </div>
                  )}
                </div>

                <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                  <CButton style={purpleStyle} onClick={openEditModal} className="px-4">
                    <CIcon icon={cilPencil} className="me-2" /> Editar Datos
                  </CButton>
                  <CButton color="dark" onClick={() => setShowPasswordModal(true)} className="px-4 text-white">
                    <CIcon icon={cilHttps} className="me-2" /> Seguridad
                  </CButton>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>

      {/* Modal Editar */}
      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)}>
        <CModalHeader style={purpleStyle} className="text-white">
          <CModalTitle>Editar Datos</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CFormInput label="Nombre" value={editInfo.nombre} onChange={(e) => setEditInfo({...editInfo, nombre: e.target.value})} className="mb-3" />
            <CFormInput label="Apellido" value={editInfo.apellido} onChange={(e) => setEditInfo({...editInfo, apellido: e.target.value})} className="mb-3" />
            <CFormInput label="Teléfono" value={editInfo.telefono} onChange={(e) => setEditInfo({...editInfo, telefono: e.target.value})} className="mb-3" />
            <CFormInput label="Email" value={editInfo.email} onChange={(e) => setEditInfo({...editInfo, email: e.target.value})} className="mb-3" />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>Cerrar</CButton>
          <CButton style={purpleStyle} onClick={handleEditInfo}>Guardar</CButton>
        </CModalFooter>
      </CModal>

      {/* Modal Password */}
      <CModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)}>
        <CModalHeader style={purpleStyle} className="text-white">
          <CModalTitle>Seguridad</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CForm>
            <CFormInput type="password" label="Contraseña Actual" onChange={(e) => setPassword({...password, current: e.target.value})} className="mb-3" invalid={!!formErrors.current} feedback={formErrors.current} />
            <CFormInput type="password" label="Nueva Contraseña" onChange={(e) => setPassword({...password, new: e.target.value})} className="mb-3" />
            <CFormInput type="password" label="Confirmar Nueva" onChange={(e) => setPassword({...password, confirm: e.target.value})} className="mb-3" invalid={!!formErrors.confirm} feedback={formErrors.confirm} />
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowPasswordModal(false)}>Cerrar</CButton>
          <CButton style={purpleStyle} onClick={handleChangePassword}>Actualizar</CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Profile
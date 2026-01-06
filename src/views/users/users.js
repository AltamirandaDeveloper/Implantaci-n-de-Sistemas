/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormSelect,
  CBadge,
  CFormLabel,
  CSpinner,
  CAvatar,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { 
  cilPencil, 
  cilTrash, 
  cilUserPlus, 
  cilSearch, 
  cilWarning,
  cilUser 
} from '@coreui/icons'
import axios from 'axios'

// Importamos tu componente de alerta personalizado
import AlertMessage from '../../components/ui/AlertMessage' 

const API_URL = 'http://localhost:3001'

const Users = () => {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [grados, setGrados] = useState([])
  const [gradosPorUsuario, setGradosPorUsuario] = useState({})
  
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Estado para manejar tu alerta personalizada
  const [alertData, setAlertData] = useState(null)

  // Estados para modales
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false) // 🔥 NUEVO MODAL DE CONFIRMACIÓN

  const [newUser, setNewUser] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    email: '',
    password: '',
    telefono: '',
    id_role: '',
  })

  const [userToEdit, setUserToEdit] = useState(null)
  const [userToView, setUserToView] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null) // 🔥 Usuario a eliminar
  const [gradosSeleccionados, setGradosSeleccionados] = useState([])

  /* ================= FETCH DATA & INIT ================= */
  
  const fetchUsuarios = async (currentGrados = grados) => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/usuarios`)
      setUsuarios(res.data)
      await fetchGradosUsuarios(res.data, currentGrados)
    } catch (err) {
      setAlertData({ 
        type: 'danger', 
        response: { message: 'Error al cargar usuarios' } 
      })
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true)
        const [rolesRes, gradosRes] = await Promise.all([
          axios.get(`${API_URL}/roles`),
          axios.get(`${API_URL}/grados`)
        ])
        
        setRoles(rolesRes.data)
        setGrados(gradosRes.data)

        const usuariosRes = await axios.get(`${API_URL}/usuarios`)
        setUsuarios(usuariosRes.data)
        
        await fetchGradosUsuarios(usuariosRes.data, gradosRes.data)

      } catch (err) {
        console.error('Error inicializando datos:', err)
        setAlertData({ type: 'danger', response: { message: 'Error de conexión con el servidor' } })
      } finally {
        setLoading(false)
      }
    }

    initData()
  }, [])

  const fetchGradosUsuarios = async (usuariosList, listaGrados) => {
    try {
      const gradosReference = listaGrados || grados 

      const [docenteRes, docenteGradosRes, estudiantesRes] = await Promise.all([
        axios.get(`${API_URL}/docente`),
        axios.get(`${API_URL}/docente_grados`),
        axios.get(`${API_URL}/estudiantes`)
      ])

      const map = {}
      usuariosList.forEach((u) => {
        if (u.id_role === 3) { // docente
          const d = docenteRes.data.find((doc) => doc.id_usuario === u.id)
          if (d) {
            const rel = docenteGradosRes.data.filter((r) => r.id_docente === d.id)
            map[u.id] = rel.map((r) => {
              const g = gradosReference.find((gr) => gr.id_grado === r.id_grado)
              return g ? `Grado ${g.nombre}` : null
            }).filter(Boolean)
          } else {
            map[u.id] = []
          }
        } else if (u.id_role === 2) { // estudiante
          const est = estudiantesRes.data.find((e) => e.id_usuario === u.id)
          if (est) {
            const g = gradosReference.find((gr) => gr.id_grado === est.id_grado)
            map[u.id] = g ? [`Grado ${g.nombre}`] : []
          } else {
            map[u.id] = []
          }
        } else {
          map[u.id] = []
        }
      })
      setGradosPorUsuario(map)
    } catch (err) {
      console.error('Error al cargar grados por usuario:', err)
    }
  }

  /* ================= HANDLERS ================= */
  const handleChange = (e) => {
    const { name, value } = e.target
    setNewUser({ ...newUser, [name]: value })
    if (name === 'id_role') {
      setGradosSeleccionados([])
    }
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setUserToEdit({ ...userToEdit, [name]: value })
    if (name === 'id_role') {
      setGradosSeleccionados([])
    }
  }

  const handleGradoChange = (e) => {
    const values = Array.from(e.target.selectedOptions, option => Number(option.value))
    setGradosSeleccionados(values)
  }

  const resetForm = () => {
    setNewUser({
      nombre: '', apellido: '', cedula: '', email: '',
      password: '', telefono: '', id_role: '',
    })
    setGradosSeleccionados([])
    setAlertData(null)
  }

  /* ================= CREATE ================= */
  const handleCreate = async () => {
    try {
      setAlertData(null)
      setIsSubmitting(true)
      
      if (!newUser.nombre || !newUser.apellido || !newUser.email || !newUser.password || !newUser.id_role) {
        setAlertData({ 
          type: 'danger', 
          response: { message: 'Por favor complete todos los campos requeridos' } 
        })
        setIsSubmitting(false)
        return
      }

      const roleId = Number(newUser.id_role)
      
      if (roleId === 2 && gradosSeleccionados.length !== 1) {
        setAlertData({ type: 'danger', response: { message: 'Seleccione exactamente un grado para el estudiante' } })
        setIsSubmitting(false)
        return
      }

      if (roleId === 3 && gradosSeleccionados.length === 0) {
        setAlertData({ type: 'danger', response: { message: 'Seleccione al menos un grado para el docente' } })
        setIsSubmitting(false)
        return
      }

      const usuarioData = {
        ...newUser,
        id_role: roleId,
        fecha_registro: new Date().toISOString(),
      }
      
      const usuarioRes = await axios.post(`${API_URL}/usuarios`, usuarioData)
      const id_usuario = usuarioRes.data.id

      if (roleId === 3) {
        const docenteRes = await axios.post(`${API_URL}/docente`, { id_usuario })
        const id_docente = docenteRes.data.id
        for (const id_grado of gradosSeleccionados) {
          await axios.post(`${API_URL}/docente_grados`, { id_docente, id_grado })
        }
      }

      if (roleId === 2 && gradosSeleccionados.length === 1) {
        await axios.post(`${API_URL}/estudiantes`, {
          id_usuario,
          id_grado: gradosSeleccionados[0],
        })
      }

      setAddModal(false)
      resetForm()
      await fetchUsuarios()
      
      setAlertData({ 
        type: 'success', 
        response: { message: 'Usuario creado exitosamente' } 
      })

    } catch (err) {
      console.error('Error al crear usuario:', err)
      setAlertData({ 
        type: 'danger', 
        response: err.response?.data || { message: 'Error al crear usuario' } 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ================= EDIT ================= */
  const handleEdit = async (user) => {
    try {
      setUserToEdit({ ...user })
      setGradosSeleccionados([])
      setAlertData(null)

      if (user.id_role === 3) {
        const docenteRes = await axios.get(`${API_URL}/docente?id_usuario=${user.id}`)
        if (docenteRes.data.length > 0) {
          const id_docente = docenteRes.data[0].id
          const relRes = await axios.get(`${API_URL}/docente_grados?id_docente=${id_docente}`)
          if (relRes.data.length > 0) {
            setGradosSeleccionados(relRes.data.map(r => r.id_grado))
          }
        }
      } else if (user.id_role === 2) {
        const estRes = await axios.get(`${API_URL}/estudiantes?id_usuario=${user.id}`)
        if (estRes.data.length > 0) {
          setGradosSeleccionados([estRes.data[0].id_grado])
        }
      }

      setEditModal(true)
    } catch (err) {
      console.error('Error al cargar datos edit:', err)
      setAlertData({ type: 'danger', response: { message: 'Error al cargar datos del usuario' } })
    }
  }

  const handleSaveEdit = async () => {
    try {
      setAlertData(null)
      setIsSubmitting(true)
      
      if (!userToEdit) return

      if (!userToEdit.nombre || !userToEdit.apellido || !userToEdit.email || !userToEdit.id_role) {
        setAlertData({ type: 'danger', response: { message: 'Complete los campos requeridos' } })
        setIsSubmitting(false)
        return
      }

      const roleId = Number(userToEdit.id_role)
      
      if (roleId === 2 && gradosSeleccionados.length !== 1) {
        setAlertData({ type: 'danger', response: { message: 'Seleccione un grado para el estudiante' } })
        setIsSubmitting(false)
        return
      }

      if (roleId === 3 && gradosSeleccionados.length === 0) {
        setAlertData({ type: 'danger', response: { message: 'Seleccione grados para el docente' } })
        setIsSubmitting(false)
        return
      }

      const usuarioData = {
        nombre: userToEdit.nombre,
        apellido: userToEdit.apellido,
        cedula: userToEdit.cedula,
        email: userToEdit.email,
        telefono: userToEdit.telefono,
        id_role: roleId,
      }
      
      if (userToEdit.password && userToEdit.password.trim() !== '') {
        usuarioData.password = userToEdit.password
      }

      await axios.patch(`${API_URL}/usuarios/${userToEdit.id}`, usuarioData)
      const id_usuario = userToEdit.id

      if (roleId === 3) {
        let id_docente = null
        const docenteRes = await axios.get(`${API_URL}/docente?id_usuario=${id_usuario}`)
        
        if (docenteRes.data.length === 0) {
          const newDocenteRes = await axios.post(`${API_URL}/docente`, { id_usuario })
          id_docente = newDocenteRes.data.id
        } else {
          id_docente = docenteRes.data[0].id
          const relRes = await axios.get(`${API_URL}/docente_grados?id_docente=${id_docente}`)
          for (const rel of relRes.data) {
            await axios.delete(`${API_URL}/docente_grados/${rel.id}`)
          }
        }
        
        for (const id_grado of gradosSeleccionados) {
          await axios.post(`${API_URL}/docente_grados`, { id_docente, id_grado })
        }
      }

      if (roleId === 2) {
        const estRes = await axios.get(`${API_URL}/estudiantes?id_usuario=${id_usuario}`)
        if (estRes.data.length === 0) {
          await axios.post(`${API_URL}/estudiantes`, { id_usuario, id_grado: gradosSeleccionados[0] })
        } else {
          await axios.patch(`${API_URL}/estudiantes/${estRes.data[0].id}`, { id_grado: gradosSeleccionados[0] })
        }
      }

      setEditModal(false)
      setUserToEdit(null)
      setGradosSeleccionados([])
      await fetchUsuarios()
      
      setAlertData({ 
        type: 'success', 
        response: { message: 'Usuario actualizado exitosamente' } 
      })

    } catch (err) {
      console.error('Error edit:', err)
      setAlertData({ 
        type: 'danger', 
        response: err.response?.data || { message: 'Error al actualizar usuario' } 
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ================= DELETE CON MODAL ================= */
  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return

    try {
      if (userToDelete.id_role === 3) {
        const docenteRes = await axios.get(`${API_URL}/docente?id_usuario=${userToDelete.id}`)
        if (docenteRes.data.length > 0) {
          const id_docente = docenteRes.data[0].id
          const relRes = await axios.get(`${API_URL}/docente_grados?id_docente=${id_docente}`)
          for (const rel of relRes.data) {
            await axios.delete(`${API_URL}/docente_grados/${rel.id}`)
          }
          await axios.delete(`${API_URL}/docente/${id_docente}`)
        }
      }

      if (userToDelete.id_role === 2) {
        const estRes = await axios.get(`${API_URL}/estudiantes?id_usuario=${userToDelete.id}`)
        if (estRes.data.length > 0) {
          await axios.delete(`${API_URL}/estudiantes/${estRes.data[0].id}`)
        }
      }

      await axios.delete(`${API_URL}/usuarios/${userToDelete.id}`)
      
      await fetchUsuarios()
      setDeleteModal(false)
      
      setAlertData({ 
        type: 'success', 
        response: { message: 'Usuario eliminado correctamente' } 
      })

    } catch (err) {
      console.error('Error delete:', err)
      setAlertData({ 
        type: 'danger', 
        response: { message: 'Error al eliminar usuario' } 
      })
      setDeleteModal(false)
    } finally {
      setUserToDelete(null)
    }
  }

  const handleViewDetails = (user) => {
    setUserToView(user)
    setDetailModal(true)
  }

  return (
    <div className="p-3">
      {/* COMPONENTE DE ALERTA GLOBAL */}
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1055 }}>
        <AlertMessage 
          response={alertData?.response} 
          type={alertData?.type} 
          onClose={() => setAlertData(null)} 
        />
      </div>

      <div className="d-flex justify-content-end mb-3">
        <CButton color="primary" onClick={() => setAddModal(true)}>
          <CIcon icon={cilUserPlus} className="me-2" />
          Crear usuario
        </CButton>
      </div>

      {loading && <div className="text-center my-3"><CSpinner color="primary" /> Cargando datos...</div>}

      <CCard>
        <CCardBody>
          <CTable striped hover responsive>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Nombre</CTableHeaderCell>
                <CTableHeaderCell>Email</CTableHeaderCell>
                <CTableHeaderCell>Rol</CTableHeaderCell>
                <CTableHeaderCell>Grado</CTableHeaderCell>
                <CTableHeaderCell>Acciones</CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {usuarios.map((user) => (
                <CTableRow key={user.id}>
                  <CTableDataCell>{user.nombre} {user.apellido}</CTableDataCell>
                  <CTableDataCell>{user.email}</CTableDataCell>
                  <CTableDataCell>
                    {roles.find((r) => r.id_role === user.id_role)?.nombre_rol || user.id_role}
                  </CTableDataCell>
                  <CTableDataCell>
                    {gradosPorUsuario[user.id]?.length > 0
                      ? gradosPorUsuario[user.id].map((g, i) => (
                          <CBadge key={i} color="info" className="me-1">
                            {g}
                          </CBadge>
                        ))
                      : <span className="text-muted small">Administrador</span>}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CButton size="sm" color="info" className="me-1 text-white" onClick={() => handleViewDetails(user)}>
                      <CIcon icon={cilSearch} />
                    </CButton>
                    <CButton size="sm" color="primary" className="me-1" onClick={() => handleEdit(user)}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton size="sm" color="danger" className="text-white" onClick={() => handleDeleteClick(user)}>
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        </CCardBody>
      </CCard>

      {/* MODAL CREAR USUARIO */}
      <CModal visible={addModal} onClose={() => { setAddModal(false); resetForm(); }}>
        <CModalHeader>
          <CModalTitle>Crear Nuevo Usuario</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <AlertMessage 
            response={alertData?.response} 
            type={alertData?.type} 
            onClose={() => setAlertData(null)} 
          />
          
          <CForm>
            <div className="mb-3">
              <CFormLabel>Nombre *</CFormLabel>
              <CFormInput
                name="nombre"
                value={newUser.nombre}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Apellido *</CFormLabel>
              <CFormInput
                name="apellido"
                value={newUser.apellido}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Cédula</CFormLabel>
              <CFormInput
                name="cedula"
                value={newUser.cedula}
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Email *</CFormLabel>
              <CFormInput
                type="email"
                name="email"
                value={newUser.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Contraseña *</CFormLabel>
              <CFormInput
                type="password"
                name="password"
                value={newUser.password}
                onChange={handleChange}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Teléfono</CFormLabel>
              <CFormInput
                name="telefono"
                value={newUser.telefono}
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Rol *</CFormLabel>
              <CFormSelect
                name="id_role"
                value={newUser.id_role}
                onChange={handleChange}
                required
              >
                <option value="">Seleccione un rol</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={rol.id_role}>
                    {rol.nombre_rol}
                  </option>
                ))}
              </CFormSelect>
            </div>
            
            {(newUser.id_role === '2' || newUser.id_role === '3') && (
              <div className="mb-3">
                <CFormLabel>
                  {newUser.id_role === '2' ? 'Grado (Estudiante)' : 'Grados (Docente)'} *
                </CFormLabel>
                <CFormSelect
                  multiple={newUser.id_role === '3'}
                  value={gradosSeleccionados}
                  onChange={handleGradoChange}
                  required
                  style={newUser.id_role === '3' ? { height: '120px' } : {}}
                >
                  <option value="" disabled>Seleccione...</option>
                  {grados.map((grado) => (
                    <option key={grado.id} value={grado.id_grado}>
                      Grado {grado.nombre}
                    </option>
                  ))}
                </CFormSelect>
                {newUser.id_role === '3' && (
                  <small className="text-muted d-block mt-1">
                    Ctrl + Click para seleccionar múltiples
                  </small>
                )}
              </div>
            )}
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setAddModal(false); resetForm(); }}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? <CSpinner size="sm" /> : 'Crear Usuario'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL EDITAR USUARIO */}
      <CModal visible={editModal} onClose={() => { setEditModal(false); setUserToEdit(null); setGradosSeleccionados([]); setAlertData(null); }}>
        <CModalHeader>
          <CModalTitle>Editar Usuario</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <AlertMessage 
            response={alertData?.response} 
            type={alertData?.type} 
            onClose={() => setAlertData(null)} 
          />

          {userToEdit && (
            <CForm>
              <div className="mb-3">
                <CFormLabel>Nombre *</CFormLabel>
                <CFormInput
                  name="nombre"
                  value={userToEdit.nombre || ''}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Apellido *</CFormLabel>
                <CFormInput
                  name="apellido"
                  value={userToEdit.apellido || ''}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Cédula</CFormLabel>
                <CFormInput
                  name="cedula"
                  value={userToEdit.cedula || ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Email *</CFormLabel>
                <CFormInput
                  name="email"
                  value={userToEdit.email || ''}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Contraseña (opcional)</CFormLabel>
                <CFormInput
                  type="password"
                  name="password"
                  value={userToEdit.password || ''}
                  onChange={handleEditChange}
                  placeholder="Dejar vacío para mantener actual"
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Teléfono</CFormLabel>
                <CFormInput
                  name="telefono"
                  value={userToEdit.telefono || ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Rol *</CFormLabel>
                <CFormSelect
                  name="id_role"
                  value={userToEdit.id_role || ''}
                  onChange={handleEditChange}
                  required
                >
                  <option value="">Seleccione un rol</option>
                  {roles.map((rol) => (
                    <option key={rol.id} value={rol.id_role}>
                      {rol.nombre_rol}
                    </option>
                  ))}
                </CFormSelect>
              </div>
              
              {(Number(userToEdit.id_role) === 2 || Number(userToEdit.id_role) === 3) && (
                <div className="mb-3">
                  <CFormLabel>
                    {Number(userToEdit.id_role) === 2 ? 'Grado (Estudiante)' : 'Grados (Docente)'} *
                  </CFormLabel>
                  <CFormSelect
                    multiple={Number(userToEdit.id_role) === 3}
                    value={gradosSeleccionados}
                    onChange={handleGradoChange}
                    required
                    style={Number(userToEdit.id_role) === 3 ? { height: '120px' } : {}}
                  >
                    <option value="" disabled>Seleccione...</option>
                    {grados.map((grado) => (
                      <option key={grado.id} value={grado.id_grado}>
                        Grado {grado.nombre}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              )}
            </CForm>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setEditModal(false); setUserToEdit(null); setGradosSeleccionados([]); }}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={handleSaveEdit} disabled={isSubmitting}>
            {isSubmitting ? <CSpinner size="sm" /> : 'Guardar Cambios'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL DETALLE */}
      <CModal visible={detailModal} onClose={() => setDetailModal(false)}>
        <CModalHeader>
          <CModalTitle>Detalle del usuario</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {userToView && (
            <>
              <p><strong>Nombre:</strong> {userToView.nombre}</p>
              <p><strong>Apellido:</strong> {userToView.apellido}</p>
              <p><strong>Cédula:</strong> {userToView.cedula || '—'}</p>
              <p><strong>Email:</strong> {userToView.email}</p>
              <p><strong>Teléfono:</strong> {userToView.telefono || '—'}</p>
              <p><strong>Rol:</strong> {roles.find((r) => r.id_role === userToView.id_role)?.nombre_rol || userToView.id_role}</p>
              <p><strong>Grados:</strong> {gradosPorUsuario[userToView.id]?.join(', ') || '—'}</p>
              <p><strong>Fecha registro:</strong> {new Date(userToView.fecha_registro).toLocaleString()}</p>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDetailModal(false)}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>

      {/* 🔥 MODAL DE CONFIRMACIÓN PARA ELIMINAR (NUEVO Y MEJORADO) */}
      <CModal 
        visible={deleteModal} 
        onClose={() => { setDeleteModal(false); setUserToDelete(null); }}
        size="md"
        alignment="center"
      >
        <CModalHeader className="bg-danger text-white border-0">
          <CModalTitle className="d-flex align-items-center">
            <CIcon icon={cilWarning} className="me-2" size="lg" />
            Confirmar Eliminación
          </CModalTitle>
        </CModalHeader>
        <CModalBody className="text-center py-4">
          {userToDelete && (
            <>
              {/* Avatar o icono del usuario */}
              <div className="mb-4">
                <div className="d-flex justify-content-center">
                  <div className="position-relative">
                    <CAvatar 
                      color="danger" 
                      size="xl"
                      className="border border-3 border-danger"
                      style={{ backgroundColor: 'rgba(220, 53, 69, 0.1)' }}
                    >
                      <CIcon icon={cilUser} size="xl" />
                    </CAvatar>
                    <div className="position-absolute top-0 end-0 translate-middle">
                      <div className="bg-danger rounded-circle p-1">
                        <CIcon icon={cilWarning} className="text-white" size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mensaje principal */}
              <h5 className="text-danger fw-bold mb-3">
                ¿Está seguro de eliminar este usuario?
              </h5>
              
              {/* Información del usuario */}
              <div className="alert alert-warning text-start mb-3">
                <div className="d-flex">
                  <CIcon icon={cilUser} className="me-2 mt-1" />
                  <div>
                    <strong>{userToDelete.nombre} {userToDelete.apellido}</strong>
                    <div className="small">
                      <div>Email: {userToDelete.email}</div>
                      <div>Rol: {roles.find((r) => r.id_role === userToDelete.id_role)?.nombre_rol || userToDelete.id_role}</div>
                      {gradosPorUsuario[userToDelete.id]?.length > 0 && (
                        <div>Grados: {gradosPorUsuario[userToDelete.id].join(', ')}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advertencia */}
              <div className="alert alert-light border text-start">
                <div className="d-flex">
                  <CIcon icon={cilWarning} className="me-2 text-warning" />
                  <div>
                    <strong className="text-warning">Advertencia:</strong>
                    <p className="mb-0 small">
                      Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al usuario.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter className="border-0 justify-content-center">
          <CButton 
            color="secondary" 
            className="px-4"
            onClick={() => { setDeleteModal(false); setUserToDelete(null); }}
          >
            Cancelar
          </CButton>
          <CButton 
            color="danger" 
            className="px-4"
            onClick={handleDeleteConfirm}
          >
            <CIcon icon={cilTrash} className="me-2" />
            Sí, Eliminar
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Users
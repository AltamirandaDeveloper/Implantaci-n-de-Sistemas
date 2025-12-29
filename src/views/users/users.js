/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react'
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
  CAlert,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash, cilUserPlus, cilSearch } from '@coreui/icons'
import axios from 'axios'

const API_URL = 'http://localhost:3001'

const Users = () => {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [grados, setGrados] = useState([])
  const [gradosPorUsuario, setGradosPorUsuario] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)

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
  const [gradosSeleccionados, setGradosSeleccionados] = useState([])

  /* ================= FETCH ================= */
  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/usuarios`)
      setUsuarios(res.data)
      await fetchGradosUsuarios(res.data)
    } catch (err) {
      setError('Error al cargar usuarios')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/roles`)
      setRoles(res.data)
    } catch (err) {
      console.error('Error al cargar roles:', err)
    }
  }

  const fetchGrados = async () => {
    try {
      const res = await axios.get(`${API_URL}/grados`)
      setGrados(res.data)
    } catch (err) {
      console.error('Error al cargar grados:', err)
    }
  }

  const fetchGradosUsuarios = async (usuariosList = usuarios) => {
    try {
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
              const g = grados.find((gr) => gr.id_grado === r.id_grado)
              return g ? `Grado ${g.nombre}` : null
            }).filter(Boolean)
          } else {
            map[u.id] = []
          }
        } else if (u.id_role === 2) { // estudiante
          const est = estudiantesRes.data.find((e) => e.id_usuario === u.id)
          if (est) {
            const g = grados.find((gr) => gr.id_grado === est.id_grado)
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

  useEffect(() => {
    fetchRoles()
    fetchGrados()
    fetchUsuarios()
  }, [])

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
      nombre: '',
      apellido: '',
      cedula: '',
      email: '',
      password: '',
      telefono: '',
      id_role: '',
    })
    setGradosSeleccionados([])
    setError('')
  }

  /* ================= CREATE ================= */
  const handleCreate = async () => {
    try {
      setError('')
      setIsSubmitting(true)
      
      // Validaciones
      if (!newUser.nombre || !newUser.apellido || !newUser.email || !newUser.password || !newUser.id_role) {
        setError('Por favor complete todos los campos requeridos')
        setIsSubmitting(false)
        return
      }

      // Validar grados según rol
      const roleId = Number(newUser.id_role)
      if (roleId === 2 && gradosSeleccionados.length !== 1) {
        setError('Seleccione exactamente un grado para el estudiante')
        setIsSubmitting(false)
        return
      }

      if (roleId === 3 && gradosSeleccionados.length === 0) {
        setError('Seleccione al menos un grado para el docente')
        setIsSubmitting(false)
        return
      }

      // 1. Crear usuario
      const usuarioData = {
        ...newUser,
        id_role: roleId,
        fecha_registro: new Date().toISOString(),
      }
      
      const usuarioRes = await axios.post(`${API_URL}/usuarios`, usuarioData)
      const id_usuario = usuarioRes.data.id

      // 2. Para docentes
      if (roleId === 3) {
        // Crear docente
        const docenteRes = await axios.post(`${API_URL}/docente`, { id_usuario })
        const id_docente = docenteRes.data.id
        
        // Asignar grados
        for (const id_grado of gradosSeleccionados) {
          await axios.post(`${API_URL}/docente_grados`, { 
            id_docente, 
            id_grado 
          })
        }
      }

      // 3. Para estudiantes
      if (roleId === 2 && gradosSeleccionados.length === 1) {
        await axios.post(`${API_URL}/estudiantes`, {
          id_usuario,
          id_grado: gradosSeleccionados[0],
        })
      }

      setAddModal(false)
      resetForm()
      fetchUsuarios()
      alert('Usuario creado exitosamente')
    } catch (err) {
      console.error('Error al crear usuario:', err)
      setError(err.response?.data?.message || 'Error al crear usuario. Verifique los datos.')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ================= EDIT ================= */
  const handleEdit = async (user) => {
    try {
      setUserToEdit({ ...user })
      setGradosSeleccionados([])
      setError('')

      // Cargar grados existentes
      if (user.id_role === 3) { // Docente
        const docenteRes = await axios.get(`${API_URL}/docente?id_usuario=${user.id}`)
        if (docenteRes.data.length > 0) {
          const id_docente = docenteRes.data[0].id
          const relRes = await axios.get(`${API_URL}/docente_grados?id_docente=${id_docente}`)
          if (relRes.data.length > 0) {
            setGradosSeleccionados(relRes.data.map(r => r.id_grado))
          }
        }
      } else if (user.id_role === 2) { // Estudiante
        const estRes = await axios.get(`${API_URL}/estudiantes?id_usuario=${user.id}`)
        if (estRes.data.length > 0) {
          setGradosSeleccionados([estRes.data[0].id_grado])
        }
      }

      setEditModal(true)
    } catch (err) {
      console.error('Error al cargar datos para editar:', err)
      setError('Error al cargar datos del usuario')
    }
  }

  const handleSaveEdit = async () => {
    try {
      setError('')
      setIsSubmitting(true)
      
      if (!userToEdit) return

      // Validaciones
      if (!userToEdit.nombre || !userToEdit.apellido || !userToEdit.email || !userToEdit.id_role) {
        setError('Por favor complete todos los campos requeridos')
        setIsSubmitting(false)
        return
      }

      const roleId = Number(userToEdit.id_role)
      
      // Validar grados según rol
      if (roleId === 2 && gradosSeleccionados.length !== 1) {
        setError('Seleccione exactamente un grado para el estudiante')
        setIsSubmitting(false)
        return
      }

      if (roleId === 3 && gradosSeleccionados.length === 0) {
        setError('Seleccione al menos un grado para el docente')
        setIsSubmitting(false)
        return
      }

      // 1. Actualizar usuario
      const usuarioData = {
        nombre: userToEdit.nombre,
        apellido: userToEdit.apellido,
        cedula: userToEdit.cedula,
        email: userToEdit.email,
        telefono: userToEdit.telefono,
        id_role: roleId,
      }
      
      // Solo incluir password si se cambió
      if (userToEdit.password && userToEdit.password.trim() !== '') {
        usuarioData.password = userToEdit.password
      }

      await axios.patch(`${API_URL}/usuarios/${userToEdit.id}`, usuarioData)
      const id_usuario = userToEdit.id

      // 2. Manejar docente y sus grados
      if (roleId === 3) {
        let id_docente = null
        
        // Buscar si ya existe docente
        const docenteRes = await axios.get(`${API_URL}/docente?id_usuario=${id_usuario}`)
        if (docenteRes.data.length === 0) {
          // Crear docente si no existe
          const newDocenteRes = await axios.post(`${API_URL}/docente`, { id_usuario })
          id_docente = newDocenteRes.data.id
        } else {
          id_docente = docenteRes.data[0].id
          
          // Eliminar relaciones de grados anteriores
          const relRes = await axios.get(`${API_URL}/docente_grados?id_docente=${id_docente}`)
          for (const rel of relRes.data) {
            await axios.delete(`${API_URL}/docente_grados/${rel.id}`)
          }
        }
        
        // Crear nuevas relaciones de grados
        for (const id_grado of gradosSeleccionados) {
          await axios.post(`${API_URL}/docente_grados`, { 
            id_docente, 
            id_grado 
          })
        }
      }

      // 3. Manejar estudiante
      if (roleId === 2) {
        const estRes = await axios.get(`${API_URL}/estudiantes?id_usuario=${id_usuario}`)
        if (estRes.data.length === 0) {
          // Crear estudiante si no existe
          await axios.post(`${API_URL}/estudiantes`, { 
            id_usuario, 
            id_grado: gradosSeleccionados[0] 
          })
        } else {
          // Actualizar estudiante existente
          await axios.patch(`${API_URL}/estudiantes/${estRes.data[0].id}`, {
            id_grado: gradosSeleccionados[0],
          })
        }
      }

      setEditModal(false)
      setUserToEdit(null)
      setGradosSeleccionados([])
      fetchUsuarios()
      alert('Usuario actualizado exitosamente')
    } catch (err) {
      console.error('Error al editar usuario:', err)
      setError(err.response?.data?.message || 'Error al actualizar usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ================= DELETE ================= */
  const handleDelete = async (user) => {
    if (!window.confirm(`¿Está seguro de eliminar al usuario ${user.nombre} ${user.apellido}?`)) return

    try {
      // Primero eliminar relaciones de grados si es docente
      if (user.id_role === 3) {
        const docenteRes = await axios.get(`${API_URL}/docente?id_usuario=${user.id}`)
        if (docenteRes.data.length > 0) {
          const id_docente = docenteRes.data[0].id
          // Eliminar relaciones docente_grados
          const relRes = await axios.get(`${API_URL}/docente_grados?id_docente=${id_docente}`)
          for (const rel of relRes.data) {
            await axios.delete(`${API_URL}/docente_grados/${rel.id}`)
          }
          // Eliminar docente
          await axios.delete(`${API_URL}/docente/${id_docente}`)
        }
      }

      // Eliminar estudiante si existe
      if (user.id_role === 2) {
        const estRes = await axios.get(`${API_URL}/estudiantes?id_usuario=${user.id}`)
        if (estRes.data.length > 0) {
          await axios.delete(`${API_URL}/estudiantes/${estRes.data[0].id}`)
        }
      }

      // Finalmente eliminar usuario
      await axios.delete(`${API_URL}/usuarios/${user.id}`)
      
      fetchUsuarios()
      alert('Usuario eliminado exitosamente')
    } catch (err) {
      console.error('Error al eliminar usuario:', err)
      alert('Error al eliminar usuario')
    }
  }

  /* ================= DETAILS ================= */
  const handleViewDetails = (user) => {
    setUserToView(user)
    setDetailModal(true)
  }

  /* ================= RENDER ================= */
  return (
    <div className="p-3">
      <div className="d-flex justify-content-end mb-3">
        <CButton color="primary" onClick={() => setAddModal(true)}>
          <CIcon icon={cilUserPlus} className="me-2" />
          Crear usuario
        </CButton>
      </div>

      {error && (
        <CAlert color="danger" dismissible onClose={() => setError('')}>
          {error}
        </CAlert>
      )}

      {loading && <div className="text-center my-3">Cargando...</div>}

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
                    {gradosPorUsuario[user.id]?.length
                      ? gradosPorUsuario[user.id].map((g, i) => (
                          <CBadge key={i} color="info" className="me-1">
                            {g}
                          </CBadge>
                        ))
                      : '—'}
                  </CTableDataCell>
                  <CTableDataCell>
                    <CButton size="sm" color="info" className="me-1" onClick={() => handleViewDetails(user)}>
                      <CIcon icon={cilSearch} />
                    </CButton>
                    <CButton size="sm" color="primary" className="me-1" onClick={() => handleEdit(user)}>
                      <CIcon icon={cilPencil} />
                    </CButton>
                    <CButton size="sm" color="danger" onClick={() => handleDelete(user)}>
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
          <CForm>
            <div className="mb-3">
              <CFormLabel>Nombre *</CFormLabel>
              <CFormInput
                type="text"
                name="nombre"
                value={newUser.nombre}
                onChange={handleChange}
                placeholder="Ingrese el nombre"
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Apellido *</CFormLabel>
              <CFormInput
                type="text"
                name="apellido"
                value={newUser.apellido}
                onChange={handleChange}
                placeholder="Ingrese el apellido"
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Cédula</CFormLabel>
              <CFormInput
                type="text"
                name="cedula"
                value={newUser.cedula}
                onChange={handleChange}
                placeholder="Ingrese la cédula"
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Email *</CFormLabel>
              <CFormInput
                type="email"
                name="email"
                value={newUser.email}
                onChange={handleChange}
                placeholder="email@ejemplo.com"
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
                placeholder="Ingrese la contraseña"
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Teléfono</CFormLabel>
              <CFormInput
                type="text"
                name="telefono"
                value={newUser.telefono}
                onChange={handleChange}
                placeholder="Ingrese el teléfono"
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
            
            {/* Selector de grados - Solo para estudiantes (id_role=2) y docentes (id_role=3) */}
            {(newUser.id_role === '2' || newUser.id_role === '3') && (
              <div className="mb-3">
                <CFormLabel>
                  {newUser.id_role === '2' ? 'Grado (Estudiante)' : 'Grados (Docente)'} *
                  {newUser.id_role === '2' && ' (Seleccione uno)'}
                  {newUser.id_role === '3' && ' (Seleccione uno o varios)'}
                </CFormLabel>
                <CFormSelect
                  multiple={newUser.id_role === '3'}
                  value={gradosSeleccionados}
                  onChange={handleGradoChange}
                  required
                >
                  <option value="">Seleccione {newUser.id_role === '2' ? 'un grado' : 'grados'}</option>
                  {grados.map((grado) => (
                    <option key={grado.id} value={grado.id_grado}>
                      Grado {grado.nombre}
                    </option>
                  ))}
                </CFormSelect>
                <small className="text-muted">
                  {newUser.id_role === '3' && 'Mantenga presionada la tecla Ctrl para seleccionar múltiples grados'}
                </small>
              </div>
            )}
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setAddModal(false); resetForm(); }}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? <><CSpinner size="sm" /> Creando...</> : 'Crear Usuario'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL EDITAR USUARIO */}
      <CModal visible={editModal} onClose={() => { setEditModal(false); setUserToEdit(null); setGradosSeleccionados([]); }}>
        <CModalHeader>
          <CModalTitle>Editar Usuario</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {userToEdit && (
            <CForm>
              <div className="mb-3">
                <CFormLabel>Nombre *</CFormLabel>
                <CFormInput
                  type="text"
                  name="nombre"
                  value={userToEdit.nombre || ''}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Apellido *</CFormLabel>
                <CFormInput
                  type="text"
                  name="apellido"
                  value={userToEdit.apellido || ''}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Cédula</CFormLabel>
                <CFormInput
                  type="text"
                  name="cedula"
                  value={userToEdit.cedula || ''}
                  onChange={handleEditChange}
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Email *</CFormLabel>
                <CFormInput
                  type="email"
                  name="email"
                  value={userToEdit.email || ''}
                  onChange={handleEditChange}
                  required
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Contraseña (dejar en blanco para no cambiar)</CFormLabel>
                <CFormInput
                  type="password"
                  name="password"
                  value={userToEdit.password || ''}
                  onChange={handleEditChange}
                  placeholder="Nueva contraseña"
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Teléfono</CFormLabel>
                <CFormInput
                  type="text"
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
              
              {/* Selector de grados - Solo para estudiantes (id_role=2) y docentes (id_role=3) */}
              {(userToEdit.id_role === 2 || userToEdit.id_role === 3) && (
                <div className="mb-3">
                  <CFormLabel>
                    {userToEdit.id_role === 2 ? 'Grado (Estudiante)' : 'Grados (Docente)'} *
                    {userToEdit.id_role === 2 && ' (Seleccione uno)'}
                    {userToEdit.id_role === 3 && ' (Seleccione uno o varios)'}
                  </CFormLabel>
                  <CFormSelect
                    multiple={userToEdit.id_role === 3}
                    value={gradosSeleccionados}
                    onChange={handleGradoChange}
                    required
                  >
                    <option value="">Seleccione {userToEdit.id_role === 2 ? 'un grado' : 'grados'}</option>
                    {grados.map((grado) => (
                      <option key={grado.id} value={grado.id_grado}>
                        Grado {grado.nombre}
                      </option>
                    ))}
                  </CFormSelect>
                  <small className="text-muted">
                    {userToEdit.id_role === 3 && 'Mantenga presionada la tecla Ctrl para seleccionar múltiples grados'}
                  </small>
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
            {isSubmitting ? <><CSpinner size="sm" /> Guardando...</> : 'Guardar Cambios'}
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
    </div>
  )
}

export default Users
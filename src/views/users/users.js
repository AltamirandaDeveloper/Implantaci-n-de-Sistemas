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

// Supabase client
import { supabase } from '../../lib/supabase'

// Importamos tu componente de alerta personalizado
import AlertMessage from '../../components/ui/AlertMessage'
// Zod schemas
import { createUserSchema, updateUserSchema } from '../../../schemas/users.schema'

const Users = () => {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [grados, setGrados] = useState([])
  const [gradosPorUsuario, setGradosPorUsuario] = useState({})

  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [alertData, setAlertData] = useState(null)
  const [formErrors, setFormErrors] = useState({})

  // Modales y formularios
  const [addModal, setAddModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [detailModal, setDetailModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)

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
  const [userToDelete, setUserToDelete] = useState(null)
  const [gradosSeleccionados, setGradosSeleccionados] = useState([]) // always an array

  /* ================= FETCH DATA & INIT (Supabase) ================= */

  const fetchUsuarios = async (currentGrados = grados) => {
    try {
      setLoading(true)
      const usersRes = await supabase
        .from('usuarios')
        .select(`
          *,
          estudiantes (id, id_grado),
          docente (id, id_usuario, docente_grados (id, id_grado))
        `)
        .order('fecha_registro', { ascending: false })

      if (usersRes.error) throw usersRes.error
      const users = usersRes.data || []
      setUsuarios(users)
      await fetchGradosUsuarios(users, currentGrados)
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
          supabase.from('roles').select('*'),
          supabase.from('grados').select('*').order('id', { ascending: true })
        ])

        if (rolesRes.error) throw rolesRes.error
        if (gradosRes.error) throw gradosRes.error

        setRoles(rolesRes.data || [])
        setGrados(gradosRes.data || [])

        await fetchUsuarios(gradosRes.data || [])
      } catch (err) {
        console.error('Error inicializando datos:', err)
        setAlertData({ type: 'danger', response: { message: 'Error de conexión con Supabase' } })
      } finally {
        setLoading(false)
      }
    }

    initData()
  }, [])

  const fetchGradosUsuarios = async (usuariosList, listaGrados) => {
    try {
      const gradosReference = Array.isArray(listaGrados) ? listaGrados : (Array.isArray(grados) ? grados : [])

      const [docenteRes, docenteGradosRes, estudiantesRes] = await Promise.all([
        supabase.from('docente').select('*'),
        supabase.from('docente_grados').select('*'),
        supabase.from('estudiantes').select('*'),
      ])

      if (docenteRes.error) throw docenteRes.error
      if (docenteGradosRes.error) throw docenteGradosRes.error
      if (estudiantesRes.error) throw estudiantesRes.error

      const docentes = Array.isArray(docenteRes.data) ? docenteRes.data : []
      const docenteGrados = Array.isArray(docenteGradosRes.data) ? docenteGradosRes.data : []
      const estudiantes = Array.isArray(estudiantesRes.data) ? estudiantesRes.data : []
      const usuariosArr = Array.isArray(usuariosList) ? usuariosList : []

      const map = {}
      usuariosArr.forEach((u) => {
        const role = Number(u.id_role)
        if (role === 3) { // docente
          const d = docentes.find((doc) => String(doc.id_usuario) === String(u.id))
          if (d) {
            const rel = docenteGrados.filter((r) => r.id_docente === d.id)
            map[u.id] = rel
              .map((r) => {
                const g = gradosReference.find((gr) => Number(gr.id) === Number(r.id_grado))
                return g ? `Grado ${g.nombre}` : null
              })
              .filter(Boolean)
          } else {
            map[u.id] = []
          }
        } else if (role === 2) { // estudiante
          const est = estudiantes.find((e) => String(e.id_usuario) === String(u.id))
          if (est) {
            const g = gradosReference.find((gr) => Number(gr.id) === Number(est.id_grado))
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
      setGradosPorUsuario({})
    }
  }

  /* ================= HELPERS & HANDLERS ================= */

  const handleChange = (e) => {
    const { name, value } = e.target
    setNewUser({ ...newUser, [name]: value })
    if (formErrors[name]) {
      const copy = { ...formErrors }
      delete copy[name]
      setFormErrors(copy)
    }
    if (name === 'id_role') {
      setGradosSeleccionados([])
    }
  }

  const handleEditChange = (e) => {
    const { name, value } = e.target
    setUserToEdit({ ...userToEdit, [name]: value })
    if (formErrors[name]) {
      const copy = { ...formErrors }
      delete copy[name]
      setFormErrors(copy)
    }
    if (name === 'id_role') {
      setGradosSeleccionados([])
    }
  }

  const handleGradoChange = (e) => {
    if (e.target.multiple) {
      const values = Array.from(e.target.selectedOptions, option => Number(option.value))
      setGradosSeleccionados(values)
    } else {
      setGradosSeleccionados([Number(e.target.value)])
    }
  }

  const resetForm = () => {
    setNewUser({
      nombre: '', apellido: '', cedula: '', email: '',
      password: '', telefono: '', id_role: '',
    })
    setGradosSeleccionados([])
    setAlertData(null)
    setFormErrors({})
  }

  /* ================= CREATE ================= */
  const handleCreate = async () => {
    try {
      setAlertData(null)
      setFormErrors({})
      setIsSubmitting(true)
      const roleId = Number(newUser.id_role)

      // Build payload for validation
      const payload = {
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        cedula: newUser.cedula,
        telefono: newUser.telefono,
        email: newUser.email,
        password: newUser.password,
        id_role: roleId,
      }
      if (roleId === 2) payload.grados = gradosSeleccionados
      if (roleId === 3) payload.grados = gradosSeleccionados

      // Choose schema: omit grados validation for admins (role 1)
      const schema = roleId === 1 ? createUserSchema.omit({ grados: true }) : createUserSchema
      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        const errors = {}
        parsed.error.issues.forEach((i) => {
          const key = i.path && i.path.length ? i.path[0] : '_'
          errors[key] = i.message
        })
        setFormErrors(errors)
        setIsSubmitting(false)
        return
      }

      // Additional role-specific checks (business rules)
      if (roleId === 2 && (!gradosSeleccionados || gradosSeleccionados.length !== 1)) {
        setAlertData({ type: 'danger', response: { message: 'Seleccione exactamente un grado para el estudiante' } })
        setIsSubmitting(false)
        return
      }
      if (roleId === 3 && (!gradosSeleccionados || gradosSeleccionados.length === 0)) {
        setAlertData({ type: 'danger', response: { message: 'Seleccione al menos un grado para el docente' } })
        setIsSubmitting(false)
        return
      }

      // Generador de UUID (usa crypto.randomUUID si está disponible)
      const genUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
        // Fallback simple (RFC4122 v4-like)
        const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
        return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`
      }

      const newId = genUUID()

      const usuarioData = {
        id: newId,
        nombre: newUser.nombre,
        apellido: newUser.apellido,
        cedula: newUser.cedula,
        email: newUser.email,
        password: newUser.password,
        telefono: newUser.telefono,
        id_role: roleId,
        fecha_registro: new Date().toISOString(),
      }

      const usuarioRes = await supabase.from('usuarios').insert([usuarioData]).select().single()
      if (usuarioRes.error) throw usuarioRes.error
      const id_usuario = usuarioRes.data.id

      if (roleId === 3) {
        const docenteRes = await supabase.from('docente').insert([{ id_usuario }]).select().single()
        if (docenteRes.error) throw docenteRes.error
        const id_docente = docenteRes.data.id
        if (gradosSeleccionados.length) {
          const pivots = gradosSeleccionados.map(id_grado => ({ id_docente, id_grado }))
          const pivotRes = await supabase.from('docente_grados').insert(pivots)
          if (pivotRes.error) throw pivotRes.error
        }
      }

      if (roleId === 2 && gradosSeleccionados.length === 1) {
        const estRes = await supabase.from('estudiantes').insert([{ id_usuario, id_grado: gradosSeleccionados[0] }])
        if (estRes.error) throw estRes.error
      }

      setAddModal(false)
      resetForm()
      await fetchUsuarios()
      setAlertData({ type: 'success', response: { message: 'Usuario creado exitosamente' } })
    } catch (err) {
      console.error('Error al crear usuario:', err)
      setAlertData({ type: 'danger', response: { message: err.message || 'Error al crear usuario' } })
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

      if (Number(user.id_role) === 3) {
        const docenteRes = await supabase.from('docente').select('*').eq('id_usuario', user.id)
        if (docenteRes.error) throw docenteRes.error
        if (docenteRes.data.length > 0) {
          const id_docente = docenteRes.data[0].id
          const relRes = await supabase.from('docente_grados').select('*').eq('id_docente', id_docente)
          if (relRes.error) throw relRes.error
          setGradosSeleccionados(relRes.data.map(r => r.id_grado))
        }
      } else if (Number(user.id_role) === 2) {
        const estRes = await supabase.from('estudiantes').select('*').eq('id_usuario', user.id)
        if (estRes.error) throw estRes.error
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
      setFormErrors({})
      setIsSubmitting(true)
      if (!userToEdit) return

      const roleId = Number(userToEdit.id_role)

      // Build payload for validation
      const payload = {
        nombre: userToEdit.nombre,
        apellido: userToEdit.apellido,
        cedula: userToEdit.cedula,
        telefono: userToEdit.telefono,
        email: userToEdit.email,
        password: userToEdit.password || '',
        id_role: roleId,
      }
      if (roleId === 2 || roleId === 3) payload.grados = gradosSeleccionados

      // Choose schema: omit grados validation for admins (role 1)
      const schema = roleId === 1 ? updateUserSchema.omit({ grados: true }) : updateUserSchema
      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        const errors = {}
        parsed.error.issues.forEach((i) => {
          const key = i.path && i.path.length ? i.path[0] : '_'
          errors[key] = i.message
        })
        setFormErrors(errors)
        setIsSubmitting(false)
        return
      }

      // Business rules for grados (give inline feedback)
      if (roleId === 2 && (!gradosSeleccionados || gradosSeleccionados.length !== 1)) {
        setFormErrors({ grados: 'Seleccione exactamente un grado para el estudiante' })
        setIsSubmitting(false)
        return
      }
      if (roleId === 3 && (!gradosSeleccionados || gradosSeleccionados.length === 0)) {
        setFormErrors({ grados: 'Seleccione al menos un grado para el docente' })
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
      if (userToEdit.password && userToEdit.password.trim() !== '') usuarioData.password = userToEdit.password

      const upd = await supabase.from('usuarios').update(usuarioData).eq('id', userToEdit.id)
      if (upd.error) throw upd.error

      const id_usuario = userToEdit.id

      if (roleId === 3) {
        let docQ = await supabase.from('docente').select('*').eq('id_usuario', id_usuario)
        if (docQ.error) throw docQ.error
        let id_docente
        if (docQ.data.length === 0) {
          const insDoc = await supabase.from('docente').insert([{ id_usuario }]).select().single()
          if (insDoc.error) throw insDoc.error
          id_docente = insDoc.data.id
        } else {
          id_docente = docQ.data[0].id
          const delP = await supabase.from('docente_grados').delete().eq('id_docente', id_docente)
          if (delP.error) throw delP.error
        }
        if (gradosSeleccionados.length) {
          const pivots = gradosSeleccionados.map(gid => ({ id_docente, id_grado: gid }))
          const pivIns = await supabase.from('docente_grados').insert(pivots)
          if (pivIns.error) throw pivIns.error
        }
      }

      if (roleId === 2) {
        const estQ = await supabase.from('estudiantes').select('*').eq('id_usuario', id_usuario)
        if (estQ.error) throw estQ.error
        if (estQ.data.length === 0) {
          const ins = await supabase.from('estudiantes').insert([{ id_usuario, id_grado: gradosSeleccionados[0] }])
          if (ins.error) throw ins.error
        } else {
          const updEst = await supabase.from('estudiantes').update({ id_grado: gradosSeleccionados[0] }).eq('id', estQ.data[0].id)
          if (updEst.error) throw updEst.error
        }
      }

      setEditModal(false)
      setUserToEdit(null)
      setGradosSeleccionados([])
      setFormErrors({})
      await fetchUsuarios()
      setAlertData({ type: 'success', response: { message: 'Usuario actualizado exitosamente' } })
    } catch (err) {
      console.error('Error edit:', err)
      setAlertData({
        type: 'danger',
        response: { message: err.message || 'Error al actualizar usuario' }
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* ================= DELETE ================= */
  const handleDeleteClick = (user) => {
    setUserToDelete(user)
    setDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    try {
      setIsSubmitting(true)
      const roleId = Number(userToEdit.id_role)

      // Build payload for validation
      const payload = {
        nombre: userToEdit.nombre,
        apellido: userToEdit.apellido,
        cedula: userToEdit.cedula,
        telefono: userToEdit.telefono,
        email: userToEdit.email,
        password: userToEdit.password || '',
        id_role: roleId,
      }
      if (roleId === 2) payload.grados = gradosSeleccionados
      if (roleId === 3) payload.grados = gradosSeleccionados

      // Choose schema for update (omit grados for admins)
      const schema = roleId === 1 ? updateUserSchema.omit({ grados: true }) : updateUserSchema
      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        const errors = {}
        parsed.error.issues.forEach((i) => {
          const key = i.path && i.path.length ? i.path[0] : '_'
          errors[key] = i.message
        })
        setFormErrors(errors)
        setIsSubmitting(false)
        return
      }

      if (roleId === 2 && (!gradosSeleccionados || gradosSeleccionados.length !== 1)) {
        setAlertData({ type: 'danger', response: { message: 'Seleccione un grado para el estudiante' } })
        setIsSubmitting(false)
        return
      }

      if (roleId === 3 && (!gradosSeleccionados || gradosSeleccionados.length === 0)) {
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
      if (userToEdit.password && userToEdit.password.trim() !== '') usuarioData.password = userToEdit.password
      console.error('Error eliminando usuario:', err)
      setAlertData({ type: 'danger', response: { message: err.message || 'Error al eliminar usuario' } })
      setDeleteModal(false)
    } finally {
      setUserToDelete(null)
      setIsSubmitting(false)
    }
  }

  const handleViewDetails = (user) => {
    setUserToView(user)
    setDetailModal(true)
  }

  /* ================= RENDER ================= */

  return (
    <div className="p-3">
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1055 }}>
        <AlertMessage response={alertData?.response} type={alertData?.type} onClose={() => setAlertData(null)} />
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
                    <CBadge color={user.id_role === 1 ? 'danger' : user.id_role === 3 ? 'success' : 'warning'}>
                      {roles.find(r => r.id === user.id_role)?.nombre_rol || user.id_role}
                    </CBadge>
                  </CTableDataCell>
                  <CTableDataCell>
                    {gradosPorUsuario[user.id]?.length > 0
                      ? gradosPorUsuario[user.id].map((g, i) => <CBadge key={i} color="info" className="me-1">{g}</CBadge>)
                      : <span className="text-muted small">—</span>}
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
          <AlertMessage response={alertData?.response} type={alertData?.type} onClose={() => setAlertData(null)} />
          <CForm>
            <div className="mb-3"><CFormLabel>Nombre *</CFormLabel><CFormInput name="nombre" value={newUser.nombre} onChange={handleChange} required invalid={!!formErrors.nombre} feedback={formErrors.nombre} /></div>
            <div className="mb-3"><CFormLabel>Apellido *</CFormLabel><CFormInput name="apellido" value={newUser.apellido} onChange={handleChange} required invalid={!!formErrors.apellido} feedback={formErrors.apellido} /></div>
            <div className="mb-3"><CFormLabel>Cédula</CFormLabel><CFormInput name="cedula" value={newUser.cedula} onChange={handleChange} invalid={!!formErrors.cedula} feedback={formErrors.cedula} /></div>
            <div className="mb-3"><CFormLabel>Email *</CFormLabel><CFormInput type="email" name="email" value={newUser.email} onChange={handleChange} required invalid={!!formErrors.email} feedback={formErrors.email} /></div>
            <div className="mb-3"><CFormLabel>Contraseña *</CFormLabel><CFormInput type="password" name="password" value={newUser.password} onChange={handleChange} required invalid={!!formErrors.password} feedback={formErrors.password} /></div>
            <div className="mb-3"><CFormLabel>Teléfono</CFormLabel><CFormInput name="telefono" value={newUser.telefono} onChange={handleChange} invalid={!!formErrors.telefono} feedback={formErrors.telefono} /></div>

            <div className="mb-3">
              <CFormLabel>Rol *</CFormLabel>
              <CFormSelect name="id_role" value={String(newUser.id_role)} onChange={handleChange} required invalid={!!formErrors.id_role} feedback={formErrors.id_role}>
                <option value="">Seleccione un rol</option>
                {roles.map((rol) => (
                  <option key={rol.id} value={String(rol.id)}>
                    {rol.nombre_rol}
                  </option>
                ))}
              </CFormSelect>
            </div>

            {Number(newUser.id_role) === 2 && (
              <div className="mb-3">
                <CFormLabel>Grado (Estudiante) *</CFormLabel>
                <CFormSelect value={gradosSeleccionados[0] || ''} onChange={handleGradoChange} required invalid={!!formErrors.grados} feedback={formErrors.grados}>
                  <option value="" disabled>Seleccione...</option>
                  {grados.map((grado) => (
                    <option key={grado.id} value={grado.id}>
                      Grado {grado.nombre}
                    </option>
                  ))}
                </CFormSelect>
              </div>
            )}

            {Number(newUser.id_role) === 3 && (
              <div className="mb-3">
                <CFormLabel>Grados (Docente) *</CFormLabel>
                <CFormSelect multiple value={gradosSeleccionados} onChange={handleGradoChange} required style={{ height: '120px' }} invalid={!!formErrors.grados} feedback={formErrors.grados}>
                  {grados.map((grado) => (
                    <option key={grado.id} value={grado.id}>
                      Grado {grado.nombre}
                    </option>
                  ))}
                </CFormSelect>
                <small className="text-muted d-block mt-1">Ctrl + Click para seleccionar múltiples</small>
              </div>
            )}
          </CForm>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setAddModal(false); resetForm(); }}>Cancelar</CButton>
          <CButton color="primary" onClick={handleCreate} disabled={isSubmitting}>{isSubmitting ? <CSpinner size="sm" /> : 'Crear Usuario'}</CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL EDITAR USUARIO */}
      <CModal visible={editModal} onClose={() => { setEditModal(false); setUserToEdit(null); setGradosSeleccionados([]); setAlertData(null); setFormErrors({}); }}>
        <CModalHeader><CModalTitle>Editar Usuario</CModalTitle></CModalHeader>
        <CModalBody>
          <AlertMessage response={alertData?.response} type={alertData?.type} onClose={() => setAlertData(null)} />
          {userToEdit ? (
            <CForm>
              <div className="mb-3"><CFormLabel>Nombre *</CFormLabel><CFormInput name="nombre" value={userToEdit.nombre || ''} onChange={handleEditChange} required invalid={!!formErrors.nombre} feedback={formErrors.nombre} /></div>
                <div className="mb-3"><CFormLabel>Apellido *</CFormLabel><CFormInput name="apellido" value={userToEdit.apellido || ''} onChange={handleEditChange} required invalid={!!formErrors.apellido} feedback={formErrors.apellido} /></div>
                <div className="mb-3"><CFormLabel>Cédula</CFormLabel><CFormInput name="cedula" value={userToEdit.cedula || ''} onChange={handleEditChange} invalid={!!formErrors.cedula} feedback={formErrors.cedula} /></div>
                <div className="mb-3"><CFormLabel>Email *</CFormLabel><CFormInput name="email" value={userToEdit.email || ''} onChange={handleEditChange} required invalid={!!formErrors.email} feedback={formErrors.email} /></div>
                <div className="mb-3"><CFormLabel>Contraseña (opcional)</CFormLabel><CFormInput type="password" name="password" value={userToEdit.password || ''} onChange={handleEditChange} placeholder="Dejar vacío para mantener actual" invalid={!!formErrors.password} feedback={formErrors.password} /></div>
                <div className="mb-3"><CFormLabel>Teléfono</CFormLabel><CFormInput name="telefono" value={userToEdit.telefono || ''} onChange={handleEditChange} invalid={!!formErrors.telefono} feedback={formErrors.telefono} /></div>

              <div className="mb-3">
                <CFormLabel>Rol *</CFormLabel>
                <CFormSelect name="id_role" value={String(userToEdit.id_role || '')} onChange={handleEditChange} required invalid={!!formErrors.id_role} feedback={formErrors.id_role}>
                  <option value="">Seleccione un rol</option>
                  {roles.map((rol) => (
                    <option key={rol.id} value={String(rol.id)}>{rol.nombre_rol}</option>
                  ))}
                </CFormSelect>
              </div>

              {Number(userToEdit.id_role) === 2 && (
                <div className="mb-3">
                  <CFormLabel>Grado (Estudiante) *</CFormLabel>
                  <CFormSelect value={gradosSeleccionados[0] || ''} onChange={handleGradoChange} required invalid={!!formErrors.grados} feedback={formErrors.grados}>
                    <option value="" disabled>Seleccione...</option>
                    {grados.map((grado) => <option key={grado.id} value={grado.id}>Grado {grado.nombre}</option>)}
                  </CFormSelect>
                </div>
              )}

              {Number(userToEdit.id_role) === 3 && (
                <div className="mb-3">
                  <CFormLabel>Grados (Docente) *</CFormLabel>
                  <CFormSelect multiple value={gradosSeleccionados} onChange={handleGradoChange} required style={{ height: '120px' }} invalid={!!formErrors.grados} feedback={formErrors.grados}>
                    {grados.map((grado) => <option key={grado.id} value={grado.id}>Grado {grado.nombre}</option>)}
                  </CFormSelect>
                </div>
              )}
            </CForm>
          ) : <div>Cargando...</div>}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setEditModal(false); setUserToEdit(null); setGradosSeleccionados([]); setFormErrors({}); }}>Cancelar</CButton>
          <CButton color="primary" onClick={handleSaveEdit} disabled={isSubmitting}>{isSubmitting ? <CSpinner size="sm" /> : 'Guardar Cambios'}</CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL DETALLE */}
      <CModal visible={detailModal} onClose={() => setDetailModal(false)}>
        <CModalHeader><CModalTitle>Detalle del usuario</CModalTitle></CModalHeader>
        <CModalBody>
          {userToView && (
            <>
              <p><strong>Nombre:</strong> {userToView.nombre}</p>
              <p><strong>Apellido:</strong> {userToView.apellido}</p>
              <p><strong>Cédula:</strong> {userToView.cedula || '—'}</p>
              <p><strong>Email:</strong> {userToView.email}</p>
              <p><strong>Teléfono:</strong> {userToView.telefono || '—'}</p>
              <p><strong>Rol:</strong> {roles.find(r => r.id === userToView.id_role)?.nombre_rol || userToView.id_role}</p>
              <p><strong>Grados:</strong> {gradosPorUsuario[userToView.id]?.join(', ') || '—'}</p>
              <p><strong>Fecha registro:</strong> {userToView.fecha_registro ? new Date(userToView.fecha_registro).toLocaleString() : '—'}</p>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDetailModal(false)}>Cerrar</CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal visible={deleteModal} onClose={() => { setDeleteModal(false); setUserToDelete(null); }}>
        <CModalHeader className="bg-danger text-white"><CModalTitle>Confirmar Eliminación</CModalTitle></CModalHeader>
        <CModalBody className="text-center">
          {userToDelete && (
            <>
              <div className="mb-4 d-flex justify-content-center">
                <CAvatar color="danger" size="xl" className="border border-3 border-danger"><CIcon icon={cilUser} size="xl" /></CAvatar>
              </div>
              <h5 className="text-danger fw-bold mb-3">¿Está seguro de eliminar este usuario?</h5>
              <div className="alert alert-warning text-start mb-3">
                <strong>{userToDelete.nombre} {userToDelete.apellido}</strong>
                <div className="small">Email: {userToDelete.email}</div>
                <div className="small">Rol: {roles.find(r => r.id === userToDelete.id_role)?.nombre_rol || userToDelete.id_role}</div>
                {gradosPorUsuario[userToDelete.id]?.length > 0 && <div className="small">Grados: {gradosPorUsuario[userToDelete.id].join(', ')}</div>}
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => { setDeleteModal(false); setUserToDelete(null); }}>Cancelar</CButton>
          <CButton color="danger" onClick={handleDeleteConfirm}>Sí, Eliminar</CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Users
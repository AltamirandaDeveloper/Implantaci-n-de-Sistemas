"use client"

import { useState, useEffect } from "react"
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CButton,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormInput, CFormLabel, CFormSelect, CFormTextarea,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody,
  CTableDataCell, CBadge, CSpinner, CListGroup, CListGroupItem
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilPlus, cilTrash, cilPencil, cilInfo } from "@coreui/icons"
import AlertMessage from "../../components/ui/AlertMessage"

// 1. IMPORTAR SUPABASE
import { supabase } from '../../lib/supabase';  
import { activitySchema } from '../../../schemas/activities.schema'

const Activities = () => {
  const [actividades, setActividades] = useState([])
  const [contenidos, setContenidos] = useState([])
  const [grados, setGrados] = useState([]) // Para el selector del Admin
  const [loading, setLoading] = useState(true)
  
  // Estados de UI
  const [visible, setVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [alert, setAlert] = useState(null)
  const [infoModal, setInfoModal] = useState({ visible: false, data: null })
  const [deleteModal, setDeleteModal] = useState({ visible: false, id: null })
  
  // Estado del Formulario
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    instrucciones: "",
    tipo: "tarea",
    fecha_vencimiento: "",
    id_contenido: "",
    id_grado: "" // Nuevo campo necesario
  })
  const [formErrors, setFormErrors] = useState({})

  // --- 1. OBTENER USUARIO Y ROLES ---
  const user = JSON.parse(sessionStorage.getItem('user') || '{}')
  const idRole = Number(user.id_role)
  const isAdmin = idRole === 1
  const isStudent = idRole === 2
  const isTeacher = idRole === 3
  const hasManagePermission = isAdmin || isTeacher

  useEffect(() => {
    fetchData()
  }, [])

  // --- 2. FETCH DATA CON FILTROS DE SEGURIDAD ---
  const fetchData = async () => {
    try {
      setLoading(true)
      
      // A. Consulta de Actividades
      let queryAct = supabase
        .from('actividades')
        .select(`
          *,
          contenidos (titulo),
          grados (nombre) 
        `) // Asumiendo que hiciste la FK con grados

      // FILTRO: Si es estudiante o docente, SOLO ve su grado
      if (isStudent || isTeacher) {
        if (user.id_grado) {
          queryAct = queryAct.eq('id_grado', user.id_grado)
        } else {
          // Si no tiene grado asignado, no ve nada por seguridad
          setActividades([]) 
          setLoading(false)
          return
        }
      }
      
      // B. Consulta de Contenidos (Para el dropdown del formulario)
      let queryCont = supabase.from('contenidos').select('id, titulo, grado_objetivo')
      
      // FILTRO: El docente solo debe poder seleccionar contenidos de SU grado
      if (isTeacher) {
         queryCont = queryCont.eq('grado_objetivo', user.id_grado)
      }

      // Ejecutar consultas
      const [actRes, contRes, gradosRes] = await Promise.all([
        queryAct,
        queryCont,
        supabase.from('grados').select('*') // Solo útil para admin o display
      ])

      if (actRes.error) throw actRes.error
      if (contRes.error) throw contRes.error

      setActividades(actRes.data || [])
      setContenidos(contRes.data || [])
      setGrados(gradosRes.data || [])

    } catch (error) {
      console.error("Error fetching data:", error.message)
      setAlert({ message: "Error al cargar datos", type: "danger" })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (formErrors[name]) {
      const copy = { ...formErrors }
      delete copy[name]
      setFormErrors(copy)
    }
  }

  // Preparar Modal para Nuevo (Pre-llenado de grado)
  const handleOpenNew = () => {
    setEditMode(false)
    setFormData({
      id: null,
      nombre: "",
      instrucciones: "",
      tipo: "tarea",
      fecha_vencimiento: "",
      id_contenido: "",
      // Si es docente, bloqueamos el grado al suyo. Si es admin, vacío.
      id_grado: isTeacher ? user.id_grado : "" 
    })
    setFormErrors({})
    setVisible(true)
  }

  // --- 3. SUBMIT CON SEGURIDAD DE ESCRITURA ---
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!hasManagePermission) {
      setAlert({ message: 'No tienes permiso', type: 'danger' })
      return
    }

    setFormErrors({})

    // SEGURIDAD: Forzar el grado si es docente
    let gradoFinal = formData.id_grado
    if (isTeacher) {
        gradoFinal = user.id_grado
    }

    const payload = {
      nombre: formData.nombre,
      instrucciones: formData.instrucciones,
      tipo: formData.tipo,
      fecha_vencimiento: formData.fecha_vencimiento,
      id_contenido: formData.id_contenido ? Number(formData.id_contenido) : null,
      id_grado: Number(gradoFinal) // Guardamos el grado
    }

    // Validación Zod (Asegúrate de actualizar tu schema para incluir id_grado si es requerido)
    const parsed = activitySchema.safeParse(payload)
    if (!parsed.success) {
      const errors = {}
      parsed.error.issues.forEach(i => {
        const key = i.path && i.path.length ? i.path[0] : '_'
        errors[key] = i.message
      })
      setFormErrors(errors)
      return
    }

    try {
      if (editMode) {
        const { error } = await supabase
          .from('actividades')
          .update(payload)
          .eq('id', formData.id)
        
        if (error) throw error
        setAlert({ message: "Actividad actualizada", type: "success" })
      } else {
        // Incluimos id_docente si tu tabla lo tiene
        const insertData = {
            ...payload,
            // id_docente: user.id // Descomentar si tu tabla actividades tiene esta columna
        }
        const { error } = await supabase
          .from('actividades')
          .insert([insertData])
        
        if (error) throw error
        setAlert({ message: "Actividad creada", type: "success" })
      }
      setFormErrors({})
      fetchData()
      handleCloseModal()
    } catch (error) {
      setAlert({ message: "Error: " + error.message, type: "danger" })
    }
  }

  // 4. DELETE
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('actividades')
        .delete()
        .eq('id', deleteModal.id)
      
      if (error) throw error
      setAlert({ message: "Actividad eliminada", type: "success" })
      setDeleteModal({ visible: false, id: null })
      fetchData()
    } catch (error) {
      setAlert({ message: "Error al eliminar", type: "danger" })
    }
  }

  const handleEdit = (activity) => {
    setFormData({
      id: activity.id,
      nombre: activity.nombre,
      instrucciones: activity.instrucciones,
      tipo: activity.tipo,
      fecha_vencimiento: activity.fecha_vencimiento,
      id_contenido: activity.id_contenido || "",
      id_grado: activity.id_grado // Cargamos el grado existente
    })
    setEditMode(true)
    setVisible(true)
    setFormErrors({})
  }

  const handleCloseModal = () => {
    setVisible(false)
    setEditMode(false)
    setFormData({ id: null, nombre: "", instrucciones: "", tipo: "tarea", fecha_vencimiento: "", id_contenido: "", id_grado: "" })
    setFormErrors({})
  }

  const getTipoBadge = (tipo) => {
    const colors = { tarea: "primary", ensayo: "warning", lectura: "info", practica: "success", quiz: "danger" }
    return <CBadge color={colors[tipo] || "secondary"}>{(tipo || "N/A").toUpperCase()}</CBadge>
  }

  if (loading) return <div className="text-center p-5"><CSpinner color="primary" /></div>

  return (
    <CRow>
      <CCol xs={12}>
        {alert && <AlertMessage response={alert} type={alert.type} onClose={() => setAlert(null)} />}

        <CCard className="mb-4 shadow-sm">
          <CCardHeader className="d-flex justify-content-between align-items-center bg-white">
            <strong className="fs-5">Módulo de Actividades</strong>
            {hasManagePermission && (
              <CButton color="primary" onClick={handleOpenNew}>
                <CIcon icon={cilPlus} className="me-2" /> Nueva Actividad
              </CButton>
            )}
          </CCardHeader>
          <CCardBody>
             {actividades.length === 0 ? (
                <div className="text-center py-5"><p className="text-muted">No hay actividades disponibles para tu grado.</p></div>
             ) : (
                <CTable hover responsive align="middle">
                <CTableHead color="light">
                    <CTableRow>
                    <CTableHeaderCell>Nombre</CTableHeaderCell>
                    <CTableHeaderCell>Tipo</CTableHeaderCell>
                    <CTableHeaderCell>Grado</CTableHeaderCell>
                    <CTableHeaderCell>Contenido Relacionado</CTableHeaderCell>
                    <CTableHeaderCell>Vencimiento</CTableHeaderCell>
                    <CTableHeaderCell>Acciones</CTableHeaderCell>
                    </CTableRow>
                </CTableHead>
                <CTableBody>
                    {actividades.map((activity) => (
                    <CTableRow key={activity.id}>
                        <CTableDataCell><strong>{activity.nombre}</strong></CTableDataCell>
                        <CTableDataCell>{getTipoBadge(activity.tipo)}</CTableDataCell>
                        <CTableDataCell>
                            <CBadge color="info" shape="rounded-pill">
                                {activity.grados?.nombre || activity.id_grado}
                            </CBadge>
                        </CTableDataCell>
                        <CTableDataCell>
                        {activity.contenidos?.titulo || "Sin relación"}
                        </CTableDataCell>
                        <CTableDataCell>{activity.fecha_vencimiento}</CTableDataCell>
                        <CTableDataCell>
                        <div className="d-flex gap-2">
                            <CButton color="secondary" size="sm" onClick={() => setInfoModal({ visible: true, data: activity })}>
                            <CIcon icon={cilInfo} style={{color: 'white'}} />
                            </CButton>
                            {hasManagePermission && (
                            <>
                                <CButton color="info" size="sm" onClick={() => handleEdit(activity)}>
                                <CIcon icon={cilPencil} style={{color: 'white'}} />
                                </CButton>
                                <CButton color="danger" size="sm" onClick={() => setDeleteModal({ visible: true, id: activity.id })}>
                                <CIcon icon={cilTrash} />
                                </CButton>
                            </>
                            )}
                        </div>
                        </CTableDataCell>
                    </CTableRow>
                    ))}
                </CTableBody>
                </CTable>
             )}
          </CCardBody>
        </CCard>
      </CCol>

      {/* MODAL INFO */}
      <CModal visible={infoModal.visible} backdrop="static" onClose={() => setInfoModal({ visible: false, data: null })}>
        <CModalHeader><CModalTitle>Detalles de Actividad</CModalTitle></CModalHeader>
        <CModalBody>
          {infoModal.data && (
            <>
              <h5>{infoModal.data.nombre}</h5>
              <p className="mt-3"><strong>Instrucciones:</strong></p>
              <div className="bg-light p-3 border rounded mb-3">{infoModal.data.instrucciones}</div>
              <CListGroup flush>
                <CListGroupItem><strong>Tipo:</strong> {getTipoBadge(infoModal.data.tipo)}</CListGroupItem>
                <CListGroupItem><strong>Grado:</strong> {infoModal.data.grados?.nombre || infoModal.data.id_grado}</CListGroupItem>
                <CListGroupItem><strong>Contenido:</strong> {infoModal.data.contenidos?.titulo || "N/A"}</CListGroupItem>
                <CListGroupItem><strong>Vence el:</strong> {infoModal.data.fecha_vencimiento}</CListGroupItem>
              </CListGroup>
            </>
          )}
        </CModalBody>
      </CModal>

      {/* MODAL FORMULARIO */}
      <CModal visible={visible} backdrop="static" onClose={handleCloseModal} size="lg">
        <CModalHeader closeButton={false}><CModalTitle>{editMode ? "Editar" : "Nueva"} Actividad</CModalTitle></CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Nombre *</CFormLabel>
              <CFormInput name="nombre" value={formData.nombre} onChange={handleInputChange} required invalid={!!formErrors.nombre} feedback={formErrors.nombre} />
            </div>
            
            {/* SELECTOR DE GRADO (VISIBLE SOLO PARA ADMIN, O SOLO LECTURA PARA DOCENTE) */}
            <div className="mb-3">
                <CFormLabel>Grado Objetivo *</CFormLabel>
                <CFormSelect 
                    name="id_grado" 
                    value={formData.id_grado} 
                    onChange={handleInputChange} 
                    required 
                    disabled={isTeacher} // Bloqueado para docentes
                    invalid={!!formErrors.id_grado} 
                    feedback={formErrors.id_grado}
                >
                    <option value="">Seleccione grado</option>
                    {grados.map(g => (
                        <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                </CFormSelect>
                {isTeacher && <div className="form-text">Asignado automáticamente a tu grado.</div>}
            </div>

            <div className="mb-3">
              <CFormLabel>Instrucciones *</CFormLabel>
              <CFormTextarea name="instrucciones" rows="3" value={formData.instrucciones} onChange={handleInputChange} required invalid={!!formErrors.instrucciones} feedback={formErrors.instrucciones} />
            </div>
            <CRow>
                <CCol md={6} className="mb-3">
                <CFormLabel>Tipo</CFormLabel>
                <CFormSelect name="tipo" value={formData.tipo} onChange={handleInputChange} invalid={!!formErrors.tipo} feedback={formErrors.tipo}>
                  <option value="tarea">Tarea</option>
                  <option value="ensayo">Ensayo</option>
                  <option value="lectura">Lectura</option>
                  <option value="practica">Práctica</option>
                  <option value="quiz">Quiz</option>
                </CFormSelect>
              </CCol>
              <CCol md={6} className="mb-3">
                <CFormLabel>Fecha Vencimiento *</CFormLabel>
                <CFormInput type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={handleInputChange} required invalid={!!formErrors.fecha_vencimiento} feedback={formErrors.fecha_vencimiento} />
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormLabel>Contenido Relacionado</CFormLabel>
              <CFormSelect name="id_contenido" value={formData.id_contenido} onChange={handleInputChange} invalid={!!formErrors.id_contenido} feedback={formErrors.id_contenido}>
                <option value="">Seleccione un contenido (Opcional)</option>
                {contenidos.map((c) => (
                  <option key={c.id} value={c.id}>{c.titulo}</option>
                ))}
              </CFormSelect>
              {isTeacher && <div className="form-text">Solo se muestran contenidos de tu grado.</div>}
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>Cancelar</CButton>
            <CButton color="primary" type="submit">{editMode ? "Actualizar" : "Guardar"}</CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal visible={deleteModal.visible} backdrop="static" onClose={() => setDeleteModal({ visible: false, id: null })}>
        <CModalHeader closeButton={false}><CModalTitle>Confirmar eliminación</CModalTitle></CModalHeader>
        <CModalBody>¿Estás seguro de que deseas eliminar esta actividad?</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, id: null })}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={handleDelete}>Eliminar</CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Activities
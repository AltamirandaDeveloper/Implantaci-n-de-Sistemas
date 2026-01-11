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
  const [currentUser, setCurrentUser] = useState(null)
  const [hasManagePermission, setHasManagePermission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  
  const [alert, setAlert] = useState(null)
  const [infoModal, setInfoModal] = useState({ visible: false, data: null })
  const [deleteModal, setDeleteModal] = useState({ visible: false, id: null })
  
  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    instrucciones: "",
    tipo: "tarea",
    fecha_vencimiento: "",
    id_contenido: "",
  })
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('user')
      if (stored) {
        const parsed = JSON.parse(stored)
        const normalized = {
          ...parsed,
          id_usuario: parsed.id_usuario || parsed.id,
          id: parsed.id || parsed.id_usuario,
        }
        setCurrentUser(normalized)
        const role = Number(normalized.id_role ?? normalized.role ?? -1)
        setHasManagePermission(role === 1 || role === 3)
      }
    } catch (e) { /* ignore */ }
    fetchData()
  }, [])

  // 2. FETCH DATA CON SUPABASE (Usando Joins)
  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Traemos actividades y el título del contenido relacionado en un solo paso
      const { data: actData, error: actError } = await supabase
        .from('actividades')
        .select(`
          *,
          contenidos (titulo)
        `)
      
      const { data: contData, error: contError } = await supabase
        .from('contenidos')
        .select('id, titulo')

      if (actError || contError) throw actError || contError

      setActividades(actData || [])
      setContenidos(contData || [])
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

  // 3. SUBMIT (CREATE O UPDATE) CON SUPABASE
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!hasManagePermission) {
      setAlert({ message: 'No tienes permiso', type: 'danger' })
      return
    }

    setFormErrors({})

    const payload = {
      nombre: formData.nombre,
      instrucciones: formData.instrucciones,
      tipo: formData.tipo,
      fecha_vencimiento: formData.fecha_vencimiento,
      id_contenido: formData.id_contenido,
    }

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

    const activityData = payload

    try {
      if (editMode) {
        const { error } = await supabase
          .from('actividades')
          .update(activityData)
          .eq('id', formData.id)
        
        if (error) throw error
        setAlert({ message: "Actividad actualizada", type: "success" })
      } else {
        // La tabla `actividades` no contiene `id_docente` en el esquema; insertar solo activityData
        const { error } = await supabase
          .from('actividades')
          .insert([activityData])
        
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

  // 4. DELETE CON SUPABASE
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
    })
    setEditMode(true)
    setVisible(true)
    setFormErrors({})
  }

  const handleCloseModal = () => {
    setVisible(false)
    setEditMode(false)
    setFormData({ id: null, nombre: "", instrucciones: "", tipo: "tarea", fecha_vencimiento: "", id_contenido: "" })
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
              <CButton color="primary" onClick={() => { setEditMode(false); setVisible(true); setFormErrors({}); }}>
                <CIcon icon={cilPlus} className="me-2" /> Nueva Actividad
              </CButton>
            )}
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive align="middle">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>Tipo</CTableHeaderCell>
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
                      {/* Usamos el Join de Supabase directamente */}
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
          </CCardBody>
        </CCard>
      </CCol>

      {/* MODAL INFO */}
      <CModal visible={infoModal.visible} onClose={() => setInfoModal({ visible: false, data: null })}>
        <CModalHeader><CModalTitle>Detalles de Actividad</CModalTitle></CModalHeader>
        <CModalBody>
          {infoModal.data && (
            <>
              <h5>{infoModal.data.nombre}</h5>
              <p className="mt-3"><strong>Instrucciones:</strong></p>
              <div className="bg-light p-3 border rounded mb-3">{infoModal.data.instrucciones}</div>
              <CListGroup flush>
                <CListGroupItem><strong>Tipo:</strong> {getTipoBadge(infoModal.data.tipo)}</CListGroupItem>
                <CListGroupItem><strong>Contenido:</strong> {infoModal.data.contenidos?.titulo || "N/A"}</CListGroupItem>
                <CListGroupItem><strong>Vence el:</strong> {infoModal.data.fecha_vencimiento}</CListGroupItem>
              </CListGroup>
            </>
          )}
        </CModalBody>
      </CModal>

      {/* MODAL FORMULARIO */}
      <CModal visible={visible} onClose={handleCloseModal} size="lg">
        <CModalHeader><CModalTitle>{editMode ? "Editar" : "Nueva"} Actividad</CModalTitle></CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Nombre</CFormLabel>
              <CFormInput name="nombre" value={formData.nombre} onChange={handleInputChange} required invalid={!!formErrors.nombre} feedback={formErrors.nombre} />
            </div>
            <div className="mb-3">
              <CFormLabel>Instrucciones</CFormLabel>
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
                <CFormLabel>Fecha Vencimiento</CFormLabel>
                <CFormInput type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={handleInputChange} required invalid={!!formErrors.fecha_vencimiento} feedback={formErrors.fecha_vencimiento} />
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormLabel>Contenido Relacionado</CFormLabel>
              <CFormSelect name="id_contenido" value={formData.id_contenido} onChange={handleInputChange} required invalid={!!formErrors.id_contenido} feedback={formErrors.id_contenido}>
                <option value="">Seleccione un contenido</option>
                {contenidos.map((c) => (
                  <option key={c.id} value={c.id}>{c.titulo}</option>
                ))}
              </CFormSelect>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>Cancelar</CButton>
            <CButton color="primary" type="submit">{editMode ? "Actualizar" : "Guardar"}</CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal visible={deleteModal.visible} onClose={() => setDeleteModal({ visible: false, id: null })}>
        <CModalHeader><CModalTitle>Confirmar eliminación</CModalTitle></CModalHeader>
        <CModalBody>¿Estás seguro de que deseas eliminar esta actividad? Esta acción no se puede deshacer.</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, id: null })}>Cancelar</CButton>
          <CButton color="danger" className="text-white" onClick={handleDelete}>Eliminar</CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Activities
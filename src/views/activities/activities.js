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

  useEffect(() => {
    // load current user and permissions
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const parsed = JSON.parse(stored)
        setCurrentUser(parsed)
        const role = Number(parsed.id_role ?? parsed.role ?? parsed.role_id ?? -1)
        setHasManagePermission(role === 1 || role === 3)
      }
    } catch (e) {
      // ignore
    }
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [actividadesRes, contenidosRes] = await Promise.all([
        fetch("http://localhost:3001/actividades"),
        fetch("http://localhost:3001/contenidos"),
      ])
      const actData = await actividadesRes.json()
      const contData = await contenidosRes.json()
      setActividades(actData)
      setContenidos(contData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!hasManagePermission) {
      setAlert({ message: 'No tienes permiso para crear/editar actividades', type: 'danger' })
      return
    }

    // IMPORTANTE: Mantenemos id_contenido como String porque en tu db.json los IDs son alfanuméricos ("e627")
    const activityData = {
      nombre: formData.nombre,
      instrucciones: formData.instrucciones,
      tipo: formData.tipo,
      fecha_vencimiento: formData.fecha_vencimiento,
      id_contenido: formData.id_contenido, 
    }

    try {
      if (editMode) {
        await fetch(`http://localhost:3001/actividades/${formData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityData),
        })
        setAlert({ message: "Actividad actualizada correctamente", type: "success" })
      } else {
        await fetch("http://localhost:3001/actividades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityData),
        })
        setAlert({ message: "Actividad creada con éxito", type: "success" })
      }
      fetchData()
      handleCloseModal()
    } catch (error) {
      setAlert({ message: "Error al procesar la solicitud", type: "danger" })
    }
  }

  const handleDelete = async () => {
    if (!hasManagePermission) {
      setAlert({ message: 'No tienes permiso para eliminar actividades', type: 'danger' })
      setDeleteModal({ visible: false, id: null })
      return
    }
    try {
      await fetch(`http://localhost:3001/actividades/${deleteModal.id}`, {
        method: "DELETE",
      })
      setAlert({ message: "Actividad eliminada", type: "success" })
      setDeleteModal({ visible: false, id: null })
      fetchData()
    } catch (error) {
      setAlert({ message: "Error al eliminar", type: "danger" })
    }
  }

  const handleEdit = (activity) => {
    if (!hasManagePermission) {
      setAlert({ message: 'No tienes permiso para editar actividades', type: 'danger' })
      return
    }
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
  }

  const handleCloseModal = () => {
    setVisible(false)
    setEditMode(false)
    setFormData({ id: null, nombre: "", instrucciones: "", tipo: "tarea", fecha_vencimiento: "", id_contenido: "" })
  }

  const getTipoBadge = (tipo) => {
    const colors = { tarea: "primary", ensayo: "warning", lectura: "info", practica: "success", quiz: "danger" }
    return <CBadge color={colors[tipo] || "secondary"}>{(tipo || "N/A").toUpperCase()}</CBadge>
  }

  // CORRECCIÓN CLAVE: Buscar por c.id ya que c.id_contenido no existe en contenidos
  const getContenidoNombre = (idContenido) => {
    if (!idContenido) return "Sin relación"
    const contenido = contenidos.find((c) => c.id === idContenido)
    return contenido ? contenido.titulo : "Contenido no encontrado"
  }

  if (loading) return <div className="text-center p-5"><CSpinner color="primary" /></div>

  return (
    <CRow>
      <CCol xs={12}>
        {alert && <AlertMessage response={alert} type={alert.type} onClose={() => setAlert(null)} />}

        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Módulo de Actividades</strong>
            {hasManagePermission ? (
              <CButton color="primary" onClick={() => { setEditMode(false); setVisible(true); }}>
                <CIcon icon={cilPlus} className="me-2" /> Nueva Actividad
              </CButton>
            ) : (
              <div className="text-muted small">Solo docentes y administradores pueden crear actividades</div>
            )}
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive>
              <CTableHead>
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
                    <CTableDataCell>{getContenidoNombre(activity.id_contenido)}</CTableDataCell>
                    <CTableDataCell>{activity.fecha_vencimiento}</CTableDataCell>
                    <CTableDataCell>
                      <div className="d-flex gap-2">
                        <CButton color="secondary" size="sm" onClick={() => setInfoModal({ visible: true, data: activity })}>
                          <CIcon icon={cilInfo} style={{color: 'white'}} />
                        </CButton>
                        {hasManagePermission ? (
                          <>
                            <CButton color="info" size="sm" onClick={() => handleEdit(activity)}>
                              <CIcon icon={cilPencil} style={{color: 'white'}} />
                            </CButton>
                            <CButton color="danger" size="sm" onClick={() => setDeleteModal({ visible: true, id: activity.id })}>
                              <CIcon icon={cilTrash} />
                            </CButton>
                          </>
                        ) : (
                          <div className="text-muted small">Sin permisos</div>
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
        <CModalHeader><CModalTitle>Detalles</CModalTitle></CModalHeader>
        <CModalBody>
          {infoModal.data && (
            <>
              <h5>{infoModal.data.nombre}</h5>
              <p className="mt-3"><strong>Instrucciones:</strong></p>
              <div className="bg-light p-3 border rounded">{infoModal.data.instrucciones}</div>
              <CListGroup flush className="mt-3">
                <CListGroupItem><strong>Tipo:</strong> {getTipoBadge(infoModal.data.tipo)}</CListGroupItem>
                <CListGroupItem><strong>Relacionado con:</strong> {getContenidoNombre(infoModal.data.id_contenido)}</CListGroupItem>
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
              <CFormInput name="nombre" value={formData.nombre} onChange={handleInputChange} required />
            </div>
            <div className="mb-3">
              <CFormLabel>Instrucciones</CFormLabel>
              <CFormTextarea name="instrucciones" rows="3" value={formData.instrucciones} onChange={handleInputChange} required />
            </div>
            <CRow>
              <CCol md={6} className="mb-3">
                <CFormLabel>Tipo</CFormLabel>
                <CFormSelect name="tipo" value={formData.tipo} onChange={handleInputChange}>
                  <option value="tarea">Tarea</option>
                  <option value="ensayo">Ensayo</option>
                  <option value="lectura">Lectura</option>
                  <option value="practica">Práctica</option>
                  <option value="quiz">Quiz</option>
                </CFormSelect>
              </CCol>
              <CCol md={6} className="mb-3">
                <CFormLabel>Fecha Vencimiento</CFormLabel>
                <CFormInput type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={handleInputChange} required />
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormLabel>Contenido Relacionado</CFormLabel>
              <CFormSelect name="id_contenido" value={formData.id_contenido} onChange={handleInputChange} required>
                <option value="">Seleccione un contenido</option>
                {contenidos.map((c) => (
                  <option key={c.id} value={c.id}>{c.titulo}</option>
                ))}
              </CFormSelect>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>Cerrar</CButton>
            <CButton color="primary" type="submit">Guardar</CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal visible={deleteModal.visible} onClose={() => setDeleteModal({ visible: false, id: null })}>
        <CModalHeader><CModalTitle>Confirmar</CModalTitle></CModalHeader>
        <CModalBody>¿Deseas eliminar esta actividad?</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, id: null })}>No</CButton>
          <CButton color="danger" className="text-white" onClick={handleDelete}>Sí, eliminar</CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Activities
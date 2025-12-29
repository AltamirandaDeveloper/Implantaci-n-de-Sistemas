"use client"

import { useState, useEffect } from "react"
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
  CSpinner,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilPlus, cilTrash, cilPencil } from "@coreui/icons"

const Activities = () => {
  const [actividades, setActividades] = useState([])
  const [contenidos, setContenidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentActivity, setCurrentActivity] = useState(null)
  const [formData, setFormData] = useState({
    nombre: "",
    instrucciones: "",
    tipo: "tarea",
    fecha_vencimiento: "",
    id_contenido: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [actividadesRes, contenidosRes] = await Promise.all([
        fetch("http://localhost:3001/actividades"),
        fetch("http://localhost:3001/contenidos"),
      ])
      const actividadesData = await actividadesRes.json()
      const contenidosData = await contenidosRes.json()
      setActividades(actividadesData)
      setContenidos(contenidosData)
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

    const activityData = {
      ...formData,
      id_contenido: Number.parseInt(formData.id_contenido),
    }

    try {
      if (editMode && currentActivity) {
        await fetch(`http://localhost:3001/actividades/${currentActivity.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...activityData, id: currentActivity.id }),
        })
      } else {
        await fetch("http://localhost:3001/actividades", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activityData),
        })
      }
      fetchData()
      handleCloseModal()
    } catch (error) {
      console.error("Error saving activity:", error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Está seguro de eliminar esta actividad?")) {
      try {
        await fetch(`http://localhost:3001/actividades/${id}`, {
          method: "DELETE",
        })
        fetchData()
      } catch (error) {
        console.error("Error deleting activity:", error)
      }
    }
  }

  const handleEdit = (activity) => {
    setCurrentActivity(activity)
    setFormData({
      nombre: activity.nombre,
      instrucciones: activity.instrucciones,
      tipo: activity.tipo,
      fecha_vencimiento: activity.fecha_vencimiento,
      id_contenido: activity.id_contenido.toString(),
    })
    setEditMode(true)
    setVisible(true)
  }

  const handleCloseModal = () => {
    setVisible(false)
    setEditMode(false)
    setCurrentActivity(null)
    setFormData({
      nombre: "",
      instrucciones: "",
      tipo: "tarea",
      fecha_vencimiento: "",
      id_contenido: "",
    })
  }

  const getTipoBadge = (tipo) => {
    const colors = {
      tarea: "primary",
      ensayo: "warning",
      lectura: "info",
      practica: "success",
    }
    return <CBadge color={colors[tipo] || "secondary"}>{tipo.toUpperCase()}</CBadge>
  }

  const getContenidoNombre = (idContenido) => {
    const contenido = contenidos.find((c) => c.id_contenido === idContenido)
    return contenido ? contenido.titulo : "N/A"
  }

  if (loading) {
    return (
      <div className="text-center p-5">
        <CSpinner color="primary" />
      </div>
    )
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Módulo de Actividades</strong>
            <CButton color="primary" onClick={() => setVisible(true)}>
              <CIcon icon={cilPlus} className="me-2" />
              Nueva Actividad
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Nombre</CTableHeaderCell>
                  <CTableHeaderCell>Instrucciones</CTableHeaderCell>
                  <CTableHeaderCell>Tipo</CTableHeaderCell>
                  <CTableHeaderCell>Contenido Relacionado</CTableHeaderCell>
                  <CTableHeaderCell>Fecha Vencimiento</CTableHeaderCell>
                  <CTableHeaderCell>Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {actividades.map((activity) => (
                  <CTableRow key={activity.id}>
                    <CTableDataCell>{activity.nombre}</CTableDataCell>
                    <CTableDataCell>{activity.instrucciones}</CTableDataCell>
                    <CTableDataCell>{getTipoBadge(activity.tipo)}</CTableDataCell>
                    <CTableDataCell>{getContenidoNombre(activity.id_contenido)}</CTableDataCell>
                    <CTableDataCell>{new Date(activity.fecha_vencimiento).toLocaleDateString()}</CTableDataCell>
                    <CTableDataCell>
                      <CButton color="info" size="sm" className="me-2" onClick={() => handleEdit(activity)}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton color="danger" size="sm" onClick={() => handleDelete(activity.id)}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CCardBody>
        </CCard>
      </CCol>

      <CModal visible={visible} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>{editMode ? "Editar Actividad" : "Nueva Actividad"}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="nombre">Nombre de la Actividad</CFormLabel>
              <CFormInput
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="instrucciones">Instrucciones</CFormLabel>
              <CFormTextarea
                id="instrucciones"
                name="instrucciones"
                rows="4"
                value={formData.instrucciones}
                onChange={handleInputChange}
                placeholder="Ejemplo: Del contenido 'Números en Inglés', realizar un ensayo sobre la importancia de los números en la vida diaria para la próxima clase."
                required
              />
            </div>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="tipo">Tipo de Actividad</CFormLabel>
                  <CFormSelect id="tipo" name="tipo" value={formData.tipo} onChange={handleInputChange} required>
                    <option value="tarea">Tarea</option>
                    <option value="ensayo">Ensayo</option>
                    <option value="lectura">Lectura</option>
                    <option value="practica">Práctica</option>
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="fecha_vencimiento">Fecha de Vencimiento</CFormLabel>
                  <CFormInput
                    type="date"
                    id="fecha_vencimiento"
                    name="fecha_vencimiento"
                    value={formData.fecha_vencimiento}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormLabel htmlFor="id_contenido">Contenido Relacionado</CFormLabel>
              <CFormSelect
                id="id_contenido"
                name="id_contenido"
                value={formData.id_contenido}
                onChange={handleInputChange}
                required
              >
                <option value="">Seleccione un contenido</option>
                {contenidos.map((contenido) => (
                  <option key={contenido.id} value={contenido.id_contenido}>
                    {contenido.titulo}
                  </option>
                ))}
              </CFormSelect>
            </div>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={handleCloseModal}>
              Cancelar
            </CButton>
            <CButton color="primary" type="submit">
              {editMode ? "Actualizar" : "Guardar"}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>
    </CRow>
  )
}

export default Activities

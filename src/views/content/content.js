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
import { cilPlus, cilTrash, cilPencil, cilCloudDownload } from "@coreui/icons"

const Content = () => {
  const [contenidos, setContenidos] = useState([])
  const [grados, setGrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentContent, setCurrentContent] = useState(null)
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    tipo: "video",
    grado_objetivo: "",
    archivo_url: "",
    archivo_nombre: "",
    archivo_tipo: "",
    imagen_miniatura: "",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [contentRes, gradosRes] = await Promise.all([
        fetch("http://localhost:3001/contenidos"),
        fetch("http://localhost:3001/grados"),
      ])
      const contentData = await contentRes.json()
      const gradosData = await gradosRes.json()
      setContenidos(contentData)
      setGrados(gradosData)
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
    const userData = JSON.parse(localStorage.getItem("user") || '{"id_usuario": 1}')

    const contentData = {
      ...formData,
      grado_objetivo: Number.parseInt(formData.grado_objetivo),
      fecha_creacion: new Date().toISOString(),
      id_docente: userData.id_usuario,
    }

    try {
      if (editMode && currentContent) {
        await fetch(`http://localhost:3001/contenidos/${currentContent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...contentData, id: currentContent.id }),
        })
      } else {
        await fetch("http://localhost:3001/contenidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contentData),
        })
      }
      fetchData()
      handleCloseModal()
    } catch (error) {
      console.error("Error saving content:", error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Está seguro de eliminar este contenido?")) {
      try {
        await fetch(`http://localhost:3001/contenidos/${id}`, {
          method: "DELETE",
        })
        fetchData()
      } catch (error) {
        console.error("Error deleting content:", error)
      }
    }
  }

  const handleEdit = (content) => {
    setCurrentContent(content)
    setFormData({
      titulo: content.titulo,
      descripcion: content.descripcion,
      tipo: content.tipo,
      grado_objetivo: content.grado_objetivo.toString(),
      archivo_url: content.archivo_url,
      archivo_nombre: content.archivo_nombre,
      archivo_tipo: content.archivo_tipo,
      imagen_miniatura: content.imagen_miniatura || "",
    })
    setEditMode(true)
    setVisible(true)
  }

  const handleCloseModal = () => {
    setVisible(false)
    setEditMode(false)
    setCurrentContent(null)
    setFormData({
      titulo: "",
      descripcion: "",
      tipo: "video",
      grado_objetivo: "",
      archivo_url: "",
      archivo_nombre: "",
      archivo_tipo: "",
      imagen_miniatura: "",
    })
  }

  const getTipoBadge = (tipo) => {
    const colors = {
      video: "danger",
      audio: "info",
      documento: "warning",
      pdf: "success",
    }
    return <CBadge color={colors[tipo] || "secondary"}>{tipo.toUpperCase()}</CBadge>
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
            <strong>Módulo de Contenido</strong>
            <CButton color="primary" onClick={() => setVisible(true)}>
              <CIcon icon={cilPlus} className="me-2" />
              Nuevo Contenido
            </CButton>
          </CCardHeader>
          <CCardBody>
            <CTable hover responsive>
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Título</CTableHeaderCell>
                  <CTableHeaderCell>Descripción</CTableHeaderCell>
                  <CTableHeaderCell>Tipo</CTableHeaderCell>
                  <CTableHeaderCell>Grado</CTableHeaderCell>
                  <CTableHeaderCell>Archivo</CTableHeaderCell>
                  <CTableHeaderCell>Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {contenidos.map((content) => (
                  <CTableRow key={content.id}>
                    <CTableDataCell>{content.titulo}</CTableDataCell>
                    <CTableDataCell>{content.descripcion}</CTableDataCell>
                    <CTableDataCell>{getTipoBadge(content.tipo)}</CTableDataCell>
                    <CTableDataCell>
                      {grados.find((g) => g.id_grado === content.grado_objetivo)?.nombre || "N/A"}
                    </CTableDataCell>
                    <CTableDataCell>
                      <a href={content.archivo_url} target="_blank" rel="noopener noreferrer">
                        <CIcon icon={cilCloudDownload} /> {content.archivo_nombre}
                      </a>
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton color="info" size="sm" className="me-2" onClick={() => handleEdit(content)}>
                        <CIcon icon={cilPencil} />
                      </CButton>
                      <CButton color="danger" size="sm" onClick={() => handleDelete(content.id)}>
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
          <CModalTitle>{editMode ? "Editar Contenido" : "Nuevo Contenido"}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="titulo">Título</CFormLabel>
              <CFormInput
                type="text"
                id="titulo"
                name="titulo"
                value={formData.titulo}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="descripcion">Descripción</CFormLabel>
              <CFormTextarea
                id="descripcion"
                name="descripcion"
                rows="3"
                value={formData.descripcion}
                onChange={handleInputChange}
                required
              />
            </div>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="tipo">Tipo de Contenido</CFormLabel>
                  <CFormSelect id="tipo" name="tipo" value={formData.tipo} onChange={handleInputChange} required>
                    <option value="video">Video</option>
                    <option value="audio">Audio</option>
                    <option value="documento">Documento</option>
                    <option value="pdf">PDF</option>
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="grado_objetivo">Grado Objetivo</CFormLabel>
                  <CFormSelect
                    id="grado_objetivo"
                    name="grado_objetivo"
                    value={formData.grado_objetivo}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Seleccione un grado</option>
                    {grados.map((grado) => (
                      <option key={grado.id} value={grado.id_grado}>
                        Grado {grado.nombre}
                      </option>
                    ))}
                  </CFormSelect>
                </div>
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormLabel htmlFor="archivo_url">URL del Archivo (Cloudinary u otro servicio)</CFormLabel>
              <CFormInput
                type="url"
                id="archivo_url"
                name="archivo_url"
                value={formData.archivo_url}
                onChange={handleInputChange}
                placeholder="https://cloudinary.com/..."
                required
              />
            </div>
            <CRow>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="archivo_nombre">Nombre del Archivo</CFormLabel>
                  <CFormInput
                    type="text"
                    id="archivo_nombre"
                    name="archivo_nombre"
                    value={formData.archivo_nombre}
                    onChange={handleInputChange}
                    placeholder="ejemplo.mp4"
                    required
                  />
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="archivo_tipo">Tipo MIME del Archivo</CFormLabel>
                  <CFormInput
                    type="text"
                    id="archivo_tipo"
                    name="archivo_tipo"
                    value={formData.archivo_tipo}
                    onChange={handleInputChange}
                    placeholder="video/mp4, audio/mp3, application/pdf"
                    required
                  />
                </div>
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormLabel htmlFor="imagen_miniatura">URL de Miniatura (opcional)</CFormLabel>
              <CFormInput
                type="url"
                id="imagen_miniatura"
                name="imagen_miniatura"
                value={formData.imagen_miniatura}
                onChange={handleInputChange}
                placeholder="https://cloudinary.com/thumbnail.jpg"
              />
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

export default Content

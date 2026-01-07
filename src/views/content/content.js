"use client"

import { useState, useEffect } from "react"
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CButton,
  CModal, CModalHeader, CModalTitle, CModalBody, CModalFooter,
  CForm, CFormInput, CFormLabel, CFormSelect, CFormTextarea,
  CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody,
  CTableDataCell, CBadge, CSpinner, CProgress, CListGroup, CListGroupItem
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilPlus, cilTrash, cilCloudDownload, cilPencil, cilInfo } from "@coreui/icons"
import AlertMessage from "../../components/ui/AlertMessage"

const Content = () => {
  const [contenidos, setContenidos] = useState([])
  const [grados, setGrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [file, setFile] = useState(null)

  // NUEVOS ESTADOS
  const [alert, setAlert] = useState(null)
  const [isEdit, setIsEdit] = useState(false)
  const [infoModal, setInfoModal] = useState({ visible: false, data: null }) // Estado para ver detalles
  const [deleteModal, setDeleteModal] = useState({ visible: false, id: null })
  const [formData, setFormData] = useState({
    id: null, titulo: "", descripcion: "", grado_objetivo: "",
  })

  const user = JSON.parse(localStorage.getItem("user") || "{}")
  const isDocente = user.role === "teacher"

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [contentRes, gradosRes] = await Promise.all([
        fetch("http://localhost:3001/contenidos"),
        fetch("http://localhost:3001/grados"),
      ])
      setContenidos(await contentRes.json())
      setGrados(await gradosRes.json())
      setLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const uploadToCloudinary = async () => {
    const fd = new FormData()
    fd.append("file", file)
    setUploading(true)
    setUploadProgress(0)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10))
    }, 200)

    try {
      const res = await fetch("http://localhost:4000/upload", { method: "POST", body: fd })
      clearInterval(progressInterval)
      setUploadProgress(100)
      const data = await res.json()
      setUploading(false)
      return data
    } catch (error) {
      clearInterval(progressInterval); setUploading(false); throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isEdit) {
        await fetch(`http://localhost:3001/contenidos/${formData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            grado_objetivo: Number(formData.grado_objetivo)
          }),
        })
        setAlert({ message: "Contenido actualizado correctamente", type: "success" })
      } else {
        if (!file) return setAlert({ message: "Seleccione un archivo" })
        const uploaded = await uploadToCloudinary()
        let tipo = "raw"
        if (uploaded.mime.includes("image")) tipo = "image"
        else if (uploaded.mime.includes("video")) tipo = "video"
        else if (uploaded.mime.includes("pdf")) tipo = "pdf"

        const contentData = {
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          grado_objetivo: Number(formData.grado_objetivo),
          archivo_url: uploaded.url,
          archivo_nombre: file.name,
          archivo_tipo: uploaded.mime,
          cloudinary_tipo: uploaded.tipo,
          tipo: tipo,
          fecha_creacion: new Date().toISOString(),
          id_docente: user.id_usuario,
        }
        await fetch("http://localhost:3001/contenidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contentData),
        })
        setAlert({ message: "Contenido guardado con éxito", type: "success" })
      }
      setVisible(false); setFile(null); setIsEdit(false); fetchData()
      setFormData({ id: null, titulo: "", descripcion: "", grado_objetivo: "" })
    } catch (error) {
      setAlert({ message: "Error al procesar la solicitud" }); console.error(error)
    }
  }

  const handleDelete = async () => {
    try {
      await fetch(`http://localhost:3001/contenidos/${deleteModal.id}`, { method: "DELETE" })
      setAlert({ message: "Contenido eliminado correctamente", type: "success" })
      setDeleteModal({ visible: false, id: null }); fetchData()
    } catch (error) { setAlert({ message: "Error al eliminar" }) }
  }

  const handleEditClick = (c) => {
    setFormData({ id: c.id, titulo: c.titulo, descripcion: c.descripcion, grado_objetivo: c.grado_objetivo })
    setIsEdit(true); setVisible(true)
  }

  // FUNCIONES DE ESTILO MANTENIDAS
  const getFileLink = (contenido) => {
    if (contenido.tipo === "pdf") return `http://localhost:4000/download?url=${encodeURIComponent(contenido.archivo_url)}`
    return contenido.archivo_url
  }

  const getTipoBadge = (contenido) => {
    const tipo = contenido.tipo || contenido.cloudinary_tipo || "raw"
    const colors = { video: "danger", audio: "info", image: "warning", pdf: "success", raw: "secondary" }
    const tipoNombre = { video: "VIDEO", image: "IMAGEN", pdf: "PDF", raw: "DOCUMENTO", audio: "AUDIO" }
    return <CBadge color={colors[tipo] || "secondary"}>{tipoNombre[tipo] || tipo.toUpperCase()}</CBadge>
  }

  const getFileIconText = (contenido) => {
    if (contenido.tipo === "pdf") return "📄"
    if (contenido.tipo === "image") return "🖼️"
    if (contenido.tipo === "video") return "🎬"
    return "📎"
  }

  if (loading) return <div className="text-center p-5"><CSpinner color="primary" /><p className="mt-2">Cargando contenido...</p></div>

  return (
    <CRow>
      <CCol xs={12}>
        {alert && <AlertMessage response={alert} type={alert.type || 'danger'} onClose={() => setAlert(null)} />}

        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center">
            <strong>Módulo de Contenido Educativo</strong>
            {isDocente && (
              <CButton color="primary" onClick={() => { setIsEdit(false); setVisible(true); }}>
                <CIcon icon={cilPlus} className="me-2" /> Nuevo Contenido
              </CButton>
            )}
          </CCardHeader>
          <CCardBody>
            {contenidos.length === 0 ? (
              <div className="text-center py-5"><p className="text-muted">No hay contenido disponible.</p></div>
            ) : (
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
                  {contenidos.map((c) => (
                    <CTableRow key={c.id}>
                      <CTableDataCell><strong>{c.titulo}</strong></CTableDataCell>
                      <CTableDataCell>
                        {c.descripcion.length > 50 ? `${c.descripcion.substring(0, 50)}...` : c.descripcion}
                      </CTableDataCell>
                      <CTableDataCell>{getTipoBadge(c)}</CTableDataCell>
                      <CTableDataCell>
                        <span className="badge bg-primary">
                          Grado {grados.find((g) => g.id_grado === c.grado_objetivo)?.nombre || c.grado_objetivo}
                        </span>
                      </CTableDataCell>
                      <CTableDataCell>
                        <a href={getFileLink(c)} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-2 text-decoration-none text-primary">
                          <span className="fs-5">{getFileIconText(c)}</span>
                          <div className="d-flex flex-column">
                            <span className="fw-medium">
                              {c.archivo_nombre.length > 20 ? `${c.archivo_nombre.substring(0, 20)}...${c.archivo_nombre.split('.').pop()}` : c.archivo_nombre}
                            </span>
                          </div>
                        </a>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex gap-2">
                          {/* BOTÓN DE INFORMACIÓN (Disponible para todos) */}
                          <CButton size="sm" color="secondary" onClick={() => setInfoModal({ visible: true, data: c })} title="Ver detalles">
                            <CIcon icon={cilInfo} style={{color: 'white'}} />
                          </CButton>
                          
                          {isDocente && (
                            <>
                              <CButton size="sm" color="info" onClick={() => handleEditClick(c)} title="Editar">
                                <CIcon icon={cilPencil} style={{color: 'white'}} />
                              </CButton>
                              <CButton size="sm" color="danger" onClick={() => setDeleteModal({ visible: true, id: c.id })} title="Eliminar">
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

      {/* MODAL DE INFORMACIÓN DETALLADA */}
      <CModal visible={infoModal.visible} onClose={() => setInfoModal({ visible: false, data: null })} size="lg">
        <CModalHeader>
          <CModalTitle>Detalles del Contenido</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {infoModal.data && (
            <CRow>
              <CCol md={12}>
                <h4 className="text-primary">{infoModal.data.titulo}</h4>
                <hr />
                <p><strong>Descripción:</strong></p>
                <div className="p-3 bg-light rounded mb-3">
                  {infoModal.data.descripcion}
                </div>
                <CListGroup flush>
                  <CListGroupItem><strong>Tipo:</strong> {getTipoBadge(infoModal.data)}</CListGroupItem>
                  <CListGroupItem><strong>Dirigido a:</strong> Grado {grados.find(g => g.id_grado === infoModal.data.grado_objetivo)?.nombre || infoModal.data.grado_objetivo}</CListGroupItem>
                  <CListGroupItem><strong>Nombre del archivo:</strong> {infoModal.data.archivo_nombre}</CListGroupItem>
                  <CListGroupItem><strong>Fecha de carga:</strong> {new Date(infoModal.data.fecha_creacion).toLocaleDateString()}</CListGroupItem>
                </CListGroup>
              </CCol>
            </CRow>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" href={infoModal.data ? getFileLink(infoModal.data) : '#'} target="_blank">
            <CIcon icon={cilCloudDownload} className="me-2" /> Abrir Archivo
          </CButton>
          <CButton color="secondary" onClick={() => setInfoModal({ visible: false, data: null })}>Cerrar</CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL PARA NUEVO / EDITAR CONTENIDO */}
      <CModal visible={visible} onClose={() => setVisible(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{isEdit ? "Editar Contenido" : "Crear Nuevo Contenido"}</CModalTitle>
        </CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel htmlFor="titulo">Título del contenido *</CFormLabel>
              <CFormInput id="titulo" name="titulo" value={formData.titulo} onChange={handleInputChange} required />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="descripcion">Descripción *</CFormLabel>
              <CFormTextarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="4" required />
            </div>
            <div className="mb-3">
              <CFormLabel htmlFor="grado_objetivo">Grado objetivo *</CFormLabel>
              <CFormSelect id="grado_objetivo" name="grado_objetivo" value={formData.grado_objetivo} onChange={handleInputChange} required>
                <option value="">Seleccione un grado</option>
                {grados.map((g) => <option key={g.id} value={g.id_grado}>Grado {g.nombre}</option>)}
              </CFormSelect>
            </div>
            {!isEdit && (
              <div className="mb-3">
                <CFormLabel htmlFor="archivo">Archivo * (PDF, Imagen, Video)</CFormLabel>
                <CFormInput id="archivo" type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi" onChange={(e) => setFile(e.target.files[0])} required />
                {uploading && <div className="mt-2"><CProgress value={uploadProgress} animated /></div>}
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setVisible(false)} disabled={uploading}>Cancelar</CButton>
            <CButton color="primary" type="submit" disabled={uploading || (!isEdit && !file)}>
              {uploading ? <CSpinner size="sm" /> : isEdit ? "Actualizar" : "Guardar Contenido"}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      <CModal visible={deleteModal.visible} onClose={() => setDeleteModal({ visible: false, id: null })}>
        <CModalHeader><CModalTitle>Confirmar Eliminación</CModalTitle></CModalHeader>
        <CModalBody>¿Está seguro de que desea eliminar este contenido permanentemente?</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, id: null })}>Cancelar</CButton>
          <CButton color="danger" onClick={handleDelete} style={{color: 'white'}}>Eliminar</CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Content
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

// 1. IMPORTAR SUPABASE
import { supabase } from '../../lib/supabase';  
// Zod schema
import { createContentSchema, updateContentSchema } from '../../../schemas/content.schema'
import { useCallback } from 'react'

// URL del backend desplegado
const BACKEND_URL = 'https://backend-implantacion.onrender.com'

const Content = () => {
  const [contenidos, setContenidos] = useState([])
  const [grados, setGrados] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [file, setFile] = useState(null)

  const [alert, setAlert] = useState(null)
  const [isEdit, setIsEdit] = useState(false)
  const [infoModal, setInfoModal] = useState({ visible: false, data: null })
  const [deleteModal, setDeleteModal] = useState({ visible: false, id: null })
  
  const [formData, setFormData] = useState({
    id: null, titulo: "", descripcion: "", grado_objetivo: "",
  })
  const [formErrors, setFormErrors] = useState({})

  // Obtener usuario del localStorage (ya configurado en el login de Supabase)
  const user = JSON.parse(sessionStorage.getItem("user") || "{}")
  const isDocente = user.id_role === 1 || user.id_role === 3 // Admin o Docente

  useEffect(() => {
    fetchData()
  }, [])

  // 2. FETCH DATA DESDE SUPABASE
  const fetchData = async () => {
    try {
      setLoading(true)
      const [contentRes, gradosRes] = await Promise.all([
        supabase.from('contenidos').select('*').order('id', { ascending: false }),
        supabase.from('grados').select('*')
      ])
      
      if (contentRes.error) throw contentRes.error
      if (gradosRes.error) throw gradosRes.error

      setContenidos(contentRes.data || [])
      setGrados(gradosRes.data || [])
    } catch (error) {
      console.error("Error fetching data:", error.message)
      setAlert({ message: "Error al conectar con la base de datos", type: "danger" })
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

  // Mantenemos tu lógica de Cloudinary (servicio externo)
  const uploadToCloudinary = async () => {
    const fd = new FormData()
    fd.append("file", file)
    setUploading(true)
    setUploadProgress(0)
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => (prev >= 90 ? 90 : prev + 10))
    }, 200)

    try {
      const res = await fetch(`${BACKEND_URL}/upload`, { method: "POST", body: fd })
      clearInterval(progressInterval)
      setUploadProgress(100)
      const data = await res.json()
      setUploading(false)
      return data
    } catch (error) {
      clearInterval(progressInterval); setUploading(false); throw error
    }
  }

  // 3. SUBMIT (INSERT / UPDATE) EN SUPABASE
  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      setFormErrors({})

      // Build payload to validate
      const payload = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        grado_objetivo: Number(formData.grado_objetivo),
      }

      const schema = isEdit ? updateContentSchema : createContentSchema
      const parsed = schema.safeParse(payload)
      if (!parsed.success) {
        const errors = {}
        parsed.error.issues.forEach((i) => {
          const key = i.path && i.path.length ? i.path[0] : '_'
          errors[key] = i.message
        })
        setFormErrors(errors)
        return
      }

      if (isEdit) {
        const { error } = await supabase
          .from('contenidos')
          .update({
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            grado_objetivo: Number(formData.grado_objetivo)
          })
          .eq('id', formData.id)

        if (error) throw error
        setAlert({ message: "Contenido actualizado correctamente", type: "success" })
      } else {
        if (!file) {
          setFormErrors({ archivo: 'Seleccione un archivo' })
          return
        }

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
          tipo: tipo,
          id_docente: user.id || user.id_usuario,
          fecha_creacion: new Date().toISOString()
        }

        const { error } = await supabase
          .from('contenidos')
          .insert([contentData])

        if (error) throw error
        setAlert({ message: "Contenido guardado con éxito", type: "success" })
      }
      setVisible(false); setFile(null); setIsEdit(false); fetchData()
      setFormData({ id: null, titulo: "", descripcion: "", grado_objetivo: "" })
    } catch (error) {
      setAlert({ message: "Error: " + error.message, type: "danger" })
    }
  }

  // 4. DELETE EN SUPABASE
  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('contenidos')
        .delete()
        .eq('id', deleteModal.id)
      
      if (error) throw error
      setAlert({ message: "Contenido eliminado correctamente", type: "success" })
      setDeleteModal({ visible: false, id: null }); fetchData()
    } catch (error) { 
      setAlert({ message: "Error al eliminar" }) 
    }
  }

  const handleEditClick = (c) => {
    setFormData({ id: c.id, titulo: c.titulo, descripcion: c.descripcion, grado_objetivo: c.grado_objetivo })
    setIsEdit(true); setVisible(true)
  }

  // Helpers de UI (Mantenidos igual para no romper tu diseño)
  const getFileLink = (contenido) => {
    if (contenido.tipo === "pdf") return `${BACKEND_URL}/download?url=${encodeURIComponent(contenido.archivo_url)}`
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

        <CCard className="mb-4 shadow-sm">
          <CCardHeader className="d-flex justify-content-between align-items-center bg-white">
            <strong className="fs-5">Módulo de Contenido Educativo</strong>
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
              <CTable hover responsive align="middle">
                <CTableHead color="light">
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
                        {c.descripcion?.length > 50 ? `${c.descripcion.substring(0, 50)}...` : c.descripcion}
                      </CTableDataCell>
                      <CTableDataCell>{getTipoBadge(c)}</CTableDataCell>
                      <CTableDataCell>
                        <CBadge color="primary" shape="rounded-pill">
                          Grado {grados.find((g) => g.id === c.grado_objetivo)?.nombre || c.grado_objetivo}
                        </CBadge>
                      </CTableDataCell>
                      <CTableDataCell>
                        <a href={getFileLink(c)} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-2 text-decoration-none text-primary">
                          <span className="fs-5">{getFileIconText(c)}</span>
                          <span className="fw-medium">
                            {c.archivo_nombre?.length > 15 ? `${c.archivo_nombre.substring(0, 15)}...` : c.archivo_nombre}
                          </span>
                        </a>
                      </CTableDataCell>
                      <CTableDataCell>
                        <div className="d-flex gap-2">
                          <CButton size="sm" color="secondary" onClick={() => setInfoModal({ visible: true, data: c })}>
                            <CIcon icon={cilInfo} style={{color: 'white'}} />
                          </CButton>
                          {isDocente && (
                            <>
                              <CButton size="sm" color="info" onClick={() => handleEditClick(c)}>
                                <CIcon icon={cilPencil} style={{color: 'white'}} />
                              </CButton>
                              <CButton size="sm" color="danger" onClick={() => setDeleteModal({ visible: true, id: c.id })}>
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

      {/* MODAL DETALLES */}
      <CModal visible={infoModal.visible} backdrop = "static" onClose={() => setInfoModal({ visible: false, data: null })} size="lg">
        <CModalHeader closeButton = {false}><CModalTitle>Detalles del Contenido</CModalTitle></CModalHeader>
        <CModalBody>
          {infoModal.data && (
            <CRow>
              <CCol md={12}>
                <h4 className="text-primary">{infoModal.data.titulo}</h4>
                <p className="mt-3"><strong>Descripción:</strong></p>
                <div className="p-3 bg-light rounded mb-3">{infoModal.data.descripcion}</div>
                <CListGroup flush>
                  <CListGroupItem><strong>Tipo:</strong> {getTipoBadge(infoModal.data)}</CListGroupItem>
                  <CListGroupItem><strong>Dirigido a:</strong> Grado {grados.find(g => g.id === infoModal.data.grado_objetivo)?.nombre || infoModal.data.grado_objetivo}</CListGroupItem>
                  <CListGroupItem><strong>Archivo:</strong> {infoModal.data.archivo_nombre}</CListGroupItem>
                  <CListGroupItem><strong>Fecha:</strong> {new Date(infoModal.data.fecha_creacion).toLocaleDateString()}</CListGroupItem>
                </CListGroup>
              </CCol>
            </CRow>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="primary" href={infoModal.data ? getFileLink(infoModal.data) : '#'} target="_blank">
            <CIcon icon={cilCloudDownload} className="me-2" /> Descargar/Ver
          </CButton>
          <CButton color="secondary" onClick={() => setInfoModal({ visible: false, data: null })}>Cerrar</CButton>
        </CModalFooter>
      </CModal>

      {/* MODAL FORMULARIO */}
      <CModal visible={visible} onClose={() => setVisible(false)} size="lg" backdrop="static">
        <CModalHeader closeButton = {false}><CModalTitle>{isEdit ? "Editar Contenido" : "Subir Nuevo Contenido"}</CModalTitle></CModalHeader>
        <CForm onSubmit={handleSubmit}>
          <CModalBody>
            <div className="mb-3">
              <CFormLabel>Título *</CFormLabel>
              <CFormInput name="titulo" value={formData.titulo} onChange={handleInputChange} required invalid={!!formErrors.titulo} feedback={formErrors.titulo} />
            </div>
            <div className="mb-3">
              <CFormLabel>Descripción *</CFormLabel>
              <CFormTextarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} rows="3" required invalid={!!formErrors.descripcion} feedback={formErrors.descripcion} />
            </div>
            <div className="mb-3">
              <CFormLabel>Grado Objetivo *</CFormLabel>
              <CFormSelect name="grado_objetivo" value={formData.grado_objetivo} onChange={handleInputChange} required invalid={!!formErrors.grado_objetivo} feedback={formErrors.grado_objetivo}>
                <option value="">Seleccione un grado</option>
                {grados.map((g) => <option key={g.id} value={g.id}>Grado {g.nombre}</option>)}
              </CFormSelect>
            </div>
            {!isEdit && (
              <div className="mb-3">
                <CFormLabel>Archivo (PDF, Imagen, Video) *</CFormLabel>
                <CFormInput type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi" onChange={(e) => { setFile(e.target.files[0]); if (formErrors.archivo) { const copy = { ...formErrors }; delete copy.archivo; setFormErrors(copy); } }} required invalid={!!formErrors.archivo} feedback={formErrors.archivo} />
                {uploading && <div className="mt-2"><CProgress value={uploadProgress} animated label={`${uploadProgress}%`} /></div>}
              </div>
            )}
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setVisible(false)} disabled={uploading}>Cancelar</CButton>
            <CButton color="primary" type="submit" disabled={uploading || (!isEdit && !file)}>
              {uploading ? <CSpinner size="sm" /> : isEdit ? "Actualizar" : "Publicar"}
            </CButton>
          </CModalFooter>
        </CForm>
      </CModal>

      {/* MODAL ELIMINAR */}
      <CModal visible={deleteModal.visible} backdrop = "static" onClose={() => setDeleteModal({ visible: false, id: null })}>
        <CModalHeader closeButton = {false}><CModalTitle>Confirmar</CModalTitle></CModalHeader>
        <CModalBody>¿Estás seguro de eliminar este recurso educativo?</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setDeleteModal({ visible: false, id: null })}>Cancelar</CButton>
          <CButton color="danger" onClick={handleDelete} className="text-white">Eliminar</CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Content
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
  CNav,
  CNavItem,
  CNavLink,
  CTabContent,
  CTabPane,
  CFormCheck,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilPlus, cilTrash, cilPencil, cilList, cilNotes } from "@coreui/icons"

const Evaluations = () => {
  const [activeTab, setActiveTab] = useState(1)
  const [evaluaciones, setEvaluaciones] = useState([])
  const [contenidos, setContenidos] = useState([])
  const [resultados, setResultados] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [preguntasVisible, setPreguntasVisible] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [currentEvaluation, setCurrentEvaluation] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    tipo_habilidad: "grammar",
    duracion_minutos: 30,
    fecha_disponible_hasta: "",
    activa: true,
    id_contenido: "",
  })

  const [preguntaForm, setPreguntaForm] = useState({
    enunciado: "",
    tipo_pregunta: "opcion_multiple",
    puntos: 1,
    opciones: ["", ""],
    respuesta_correcta: 0,
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [evaluacionesRes, contenidosRes, resultadosRes, estudiantesRes] = await Promise.all([
        fetch("http://localhost:3001/evaluaciones"),
        fetch("http://localhost:3001/contenidos"),
        fetch("http://localhost:3001/resultados_evaluaciones"),
        fetch("http://localhost:3001/estudiantes"),
      ])
      const evaluacionesData = await evaluacionesRes.json()
      const contenidosData = await contenidosRes.json()
      const resultadosData = await resultadosRes.json()
      const estudiantesData = await estudiantesRes.json()

      setEvaluaciones(evaluacionesData)
      setContenidos(contenidosData)
      setResultados(resultadosData)
      setEstudiantes(estudiantesData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching data:", error)
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const userData = JSON.parse(localStorage.getItem("user") || '{"id_usuario": 1}')

    const evaluationData = {
      ...formData,
      duracion_minutos: Number.parseInt(formData.duracion_minutos),
      id_contenido: Number.parseInt(formData.id_contenido),
      id_docente: userData.id_usuario,
    }

    try {
      let savedEvaluation
      if (editMode && currentEvaluation) {
        const response = await fetch(`http://localhost:3001/evaluaciones/${currentEvaluation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...evaluationData, id: currentEvaluation.id }),
        })
        savedEvaluation = await response.json()
      } else {
        const response = await fetch("http://localhost:3001/evaluaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(evaluationData),
        })
        savedEvaluation = await response.json()
      }

      setCurrentEvaluation(savedEvaluation)
      fetchData()
      handleCloseModal()

      if (!editMode) {
        setPreguntasVisible(true)
      }
    } catch (error) {
      console.error("Error saving evaluation:", error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Está seguro de eliminar esta evaluación?")) {
      try {
        await fetch(`http://localhost:3001/evaluaciones/${id}`, {
          method: "DELETE",
        })
        fetchData()
      } catch (error) {
        console.error("Error deleting evaluation:", error)
      }
    }
  }

  const handleEdit = (evaluation) => {
    setCurrentEvaluation(evaluation)
    setFormData({
      titulo: evaluation.titulo,
      descripcion: evaluation.descripcion,
      tipo_habilidad: evaluation.tipo_habilidad,
      duracion_minutos: evaluation.duracion_minutos,
      fecha_disponible_hasta: evaluation.fecha_disponible_hasta,
      activa: evaluation.activa,
      id_contenido: evaluation.id_contenido.toString(),
    })
    setEditMode(true)
    setVisible(true)
  }

  const handleManageQuestions = async (evaluation) => {
    setCurrentEvaluation(evaluation)
    try {
      const response = await fetch(`http://localhost:3001/preguntas?id_evaluacion=${evaluation.id_evaluacion}`)
      const preguntasData = await response.json()
      setPreguntas(preguntasData)
      setPreguntasVisible(true)
    } catch (error) {
      console.error("Error fetching questions:", error)
    }
  }

  const handleCloseModal = () => {
    setVisible(false)
    setEditMode(false)
    setCurrentEvaluation(null)
    setFormData({
      titulo: "",
      descripcion: "",
      tipo_habilidad: "grammar",
      duracion_minutos: 30,
      fecha_disponible_hasta: "",
      activa: true,
      id_contenido: "",
    })
  }

  const handleClosePreguntasModal = () => {
    setPreguntasVisible(false)
    setPreguntas([])
    setPreguntaForm({
      enunciado: "",
      tipo_pregunta: "opcion_multiple",
      puntos: 1,
      opciones: ["", ""],
      respuesta_correcta: 0,
    })
  }

  const handlePreguntaInputChange = (e) => {
    const { name, value } = e.target
    setPreguntaForm({ ...preguntaForm, [name]: value })
  }

  const handleOpcionChange = (index, value) => {
    const nuevasOpciones = [...preguntaForm.opciones]
    nuevasOpciones[index] = value
    setPreguntaForm({ ...preguntaForm, opciones: nuevasOpciones })
  }

  const addOpcion = () => {
    setPreguntaForm({ ...preguntaForm, opciones: [...preguntaForm.opciones, ""] })
  }

  const removeOpcion = (index) => {
    const nuevasOpciones = preguntaForm.opciones.filter((_, i) => i !== index)
    setPreguntaForm({ ...preguntaForm, opciones: nuevasOpciones })
  }

  const handleSavePregunta = async (e) => {
    e.preventDefault()

    try {
      const preguntaData = {
        id_evaluacion: currentEvaluation.id_evaluacion,
        enunciado: preguntaForm.enunciado,
        tipo_pregunta: preguntaForm.tipo_pregunta,
        puntos: Number.parseInt(preguntaForm.puntos),
        orden: preguntas.length + 1,
      }

      const preguntaResponse = await fetch("http://localhost:3001/preguntas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preguntaData),
      })
      const savedPregunta = await preguntaResponse.json()

      if (preguntaForm.tipo_pregunta === "opcion_multiple" || preguntaForm.tipo_pregunta === "verdadero_falso") {
        for (let i = 0; i < preguntaForm.opciones.length; i++) {
          await fetch("http://localhost:3001/opciones_pregunta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id_pregunta: savedPregunta.id_pregunta,
              texto_opcion: preguntaForm.opciones[i],
              es_correcta: i === Number.parseInt(preguntaForm.respuesta_correcta),
            }),
          })
        }
      }

      const response = await fetch(`http://localhost:3001/preguntas?id_evaluacion=${currentEvaluation.id_evaluacion}`)
      const preguntasData = await response.json()
      setPreguntas(preguntasData)

      setPreguntaForm({
        enunciado: "",
        tipo_pregunta: "opcion_multiple",
        puntos: 1,
        opciones: ["", ""],
        respuesta_correcta: 0,
      })
    } catch (error) {
      console.error("Error saving question:", error)
    }
  }

  const getTipoHabilidadBadge = (tipo) => {
    const colors = {
      grammar: "primary",
      pronunciation: "danger",
      reading: "info",
      listening: "warning",
    }
    const labels = {
      grammar: "Gramática",
      pronunciation: "Pronunciación",
      reading: "Lectura",
      listening: "Listening",
    }
    return <CBadge color={colors[tipo] || "secondary"}>{labels[tipo] || tipo}</CBadge>
  }

  const getContenidoNombre = (idContenido) => {
    const contenido = contenidos.find((c) => c.id_contenido === idContenido)
    return contenido ? contenido.titulo : "N/A"
  }

  const getEstudianteNombre = (idEstudiante) => {
    const estudiante = estudiantes.find((e) => e.id_estudiante === idEstudiante)
    return estudiante ? `Estudiante ${idEstudiante}` : "N/A"
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
          <CCardHeader>
            <CNav variant="tabs" role="tablist">
              <CNavItem>
                <CNavLink active={activeTab === 1} onClick={() => setActiveTab(1)} style={{ cursor: "pointer" }}>
                  <CIcon icon={cilList} className="me-2" />
                  Evaluaciones
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink active={activeTab === 2} onClick={() => setActiveTab(2)} style={{ cursor: "pointer" }}>
                  <CIcon icon={cilNotes} className="me-2" />
                  Resultados
                </CNavLink>
              </CNavItem>
            </CNav>
          </CCardHeader>
          <CCardBody>
            <CTabContent>
              <CTabPane visible={activeTab === 1}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5>Gestión de Evaluaciones</h5>
                  <CButton color="primary" onClick={() => setVisible(true)}>
                    <CIcon icon={cilPlus} className="me-2" />
                    Nueva Evaluación
                  </CButton>
                </div>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Título</CTableHeaderCell>
                      <CTableHeaderCell>Tipo Habilidad</CTableHeaderCell>
                      <CTableHeaderCell>Contenido</CTableHeaderCell>
                      <CTableHeaderCell>Duración</CTableHeaderCell>
                      <CTableHeaderCell>Estado</CTableHeaderCell>
                      <CTableHeaderCell>Acciones</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {evaluaciones.map((evaluation) => (
                      <CTableRow key={evaluation.id}>
                        <CTableDataCell>{evaluation.titulo}</CTableDataCell>
                        <CTableDataCell>{getTipoHabilidadBadge(evaluation.tipo_habilidad)}</CTableDataCell>
                        <CTableDataCell>{getContenidoNombre(evaluation.id_contenido)}</CTableDataCell>
                        <CTableDataCell>{evaluation.duracion_minutos} min</CTableDataCell>
                        <CTableDataCell>
                          {evaluation.activa ? (
                            <CBadge color="success">Activa</CBadge>
                          ) : (
                            <CBadge color="secondary">Inactiva</CBadge>
                          )}
                        </CTableDataCell>
                        <CTableDataCell>
                          <CButton
                            color="warning"
                            size="sm"
                            className="me-2"
                            onClick={() => handleManageQuestions(evaluation)}
                          >
                            Preguntas
                          </CButton>
                          <CButton color="info" size="sm" className="me-2" onClick={() => handleEdit(evaluation)}>
                            <CIcon icon={cilPencil} />
                          </CButton>
                          <CButton color="danger" size="sm" onClick={() => handleDelete(evaluation.id)}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CTabPane>

              <CTabPane visible={activeTab === 2}>
                <h5 className="mb-3">Resultados de Evaluaciones</h5>
                <CTable hover responsive>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Estudiante</CTableHeaderCell>
                      <CTableHeaderCell>Evaluación</CTableHeaderCell>
                      <CTableHeaderCell>Nota Final</CTableHeaderCell>
                      <CTableHeaderCell>Estado</CTableHeaderCell>
                      <CTableHeaderCell>Fecha Completado</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {resultados.map((resultado) => {
                      const evaluacion = evaluaciones.find((e) => e.id_evaluacion === resultado.id_evaluacion)
                      return (
                        <CTableRow key={resultado.id}>
                          <CTableDataCell>{getEstudianteNombre(resultado.id_estudiante)}</CTableDataCell>
                          <CTableDataCell>{evaluacion?.titulo || "N/A"}</CTableDataCell>
                          <CTableDataCell>
                            <strong>{resultado.nota_final.toFixed(2)}</strong>
                          </CTableDataCell>
                          <CTableDataCell>
                            {resultado.estado_revision === "completado" ? (
                              <CBadge color="success">Completado</CBadge>
                            ) : (
                              <CBadge color="warning">En Progreso</CBadge>
                            )}
                          </CTableDataCell>
                          <CTableDataCell>
                            {resultado.fecha_completado ? new Date(resultado.fecha_completado).toLocaleString() : "N/A"}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </CTabPane>
            </CTabContent>
          </CCardBody>
        </CCard>
      </CCol>

      {/* Modal para crear/editar evaluación */}
      <CModal visible={visible} onClose={handleCloseModal} size="lg">
        <CModalHeader>
          <CModalTitle>{editMode ? "Editar Evaluación" : "Nueva Evaluación"}</CModalTitle>
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
                  <CFormLabel htmlFor="tipo_habilidad">Tipo de Habilidad</CFormLabel>
                  <CFormSelect
                    id="tipo_habilidad"
                    name="tipo_habilidad"
                    value={formData.tipo_habilidad}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="grammar">Gramática</option>
                    <option value="pronunciation">Pronunciación</option>
                    <option value="reading">Lectura</option>
                    <option value="listening">Listening</option>
                  </CFormSelect>
                </div>
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="duracion_minutos">Duración (minutos)</CFormLabel>
                  <CFormInput
                    type="number"
                    id="duracion_minutos"
                    name="duracion_minutos"
                    value={formData.duracion_minutos}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>
              </CCol>
            </CRow>
            <CRow>
              <CCol md={6}>
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
              </CCol>
              <CCol md={6}>
                <div className="mb-3">
                  <CFormLabel htmlFor="fecha_disponible_hasta">Disponible Hasta</CFormLabel>
                  <CFormInput
                    type="date"
                    id="fecha_disponible_hasta"
                    name="fecha_disponible_hasta"
                    value={formData.fecha_disponible_hasta}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </CCol>
            </CRow>
            <div className="mb-3">
              <CFormCheck
                id="activa"
                name="activa"
                label="Evaluación Activa"
                checked={formData.activa}
                onChange={handleInputChange}
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

      {/* Modal para gestionar preguntas */}
      <CModal visible={preguntasVisible} onClose={handleClosePreguntasModal} size="xl">
        <CModalHeader>
          <CModalTitle>Gestionar Preguntas - {currentEvaluation?.titulo}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow>
            <CCol md={6}>
              <h6>Preguntas Existentes ({preguntas.length})</h6>
              {preguntas.length === 0 ? (
                <p className="text-muted">No hay preguntas aún</p>
              ) : (
                <div className="mb-3" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {preguntas.map((pregunta, index) => (
                    <CCard key={pregunta.id} className="mb-2">
                      <CCardBody>
                        <p>
                          <strong>{index + 1}.</strong> {pregunta.enunciado}
                        </p>
                        <CBadge color="info">{pregunta.tipo_pregunta}</CBadge>
                        <CBadge color="secondary" className="ms-2">
                          {pregunta.puntos} pts
                        </CBadge>
                      </CCardBody>
                    </CCard>
                  ))}
                </div>
              )}
            </CCol>
            <CCol md={6}>
              <h6>Agregar Nueva Pregunta</h6>
              <CForm onSubmit={handleSavePregunta}>
                <div className="mb-3">
                  <CFormLabel htmlFor="enunciado">Enunciado</CFormLabel>
                  <CFormTextarea
                    id="enunciado"
                    name="enunciado"
                    rows="2"
                    value={preguntaForm.enunciado}
                    onChange={handlePreguntaInputChange}
                    required
                  />
                </div>
                <CRow>
                  <CCol md={8}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="tipo_pregunta">Tipo de Pregunta</CFormLabel>
                      <CFormSelect
                        id="tipo_pregunta"
                        name="tipo_pregunta"
                        value={preguntaForm.tipo_pregunta}
                        onChange={handlePreguntaInputChange}
                        required
                      >
                        <option value="opcion_multiple">Opción Múltiple</option>
                        <option value="verdadero_falso">Verdadero/Falso</option>
                        <option value="respuesta_corta">Respuesta Corta</option>
                        <option value="audio_pronunciacion">Pronunciación (Audio)</option>
                      </CFormSelect>
                    </div>
                  </CCol>
                  <CCol md={4}>
                    <div className="mb-3">
                      <CFormLabel htmlFor="puntos">Puntos</CFormLabel>
                      <CFormInput
                        type="number"
                        id="puntos"
                        name="puntos"
                        value={preguntaForm.puntos}
                        onChange={handlePreguntaInputChange}
                        min="1"
                        required
                      />
                    </div>
                  </CCol>
                </CRow>

                {(preguntaForm.tipo_pregunta === "opcion_multiple" ||
                  preguntaForm.tipo_pregunta === "verdadero_falso") && (
                  <div className="mb-3">
                    <CFormLabel>Opciones</CFormLabel>
                    {preguntaForm.opciones.map((opcion, index) => (
                      <div key={index} className="d-flex mb-2">
                        <CFormInput
                          type="text"
                          value={opcion}
                          onChange={(e) => handleOpcionChange(index, e.target.value)}
                          placeholder={`Opción ${index + 1}`}
                          required
                        />
                        <CFormCheck
                          type="radio"
                          name="respuesta_correcta"
                          className="ms-2"
                          checked={preguntaForm.respuesta_correcta === index}
                          onChange={() => setPreguntaForm({ ...preguntaForm, respuesta_correcta: index })}
                          label="Correcta"
                        />
                        {preguntaForm.opciones.length > 2 && (
                          <CButton color="danger" size="sm" className="ms-2" onClick={() => removeOpcion(index)}>
                            <CIcon icon={cilTrash} />
                          </CButton>
                        )}
                      </div>
                    ))}
                    {preguntaForm.tipo_pregunta === "opcion_multiple" && (
                      <CButton color="secondary" size="sm" onClick={addOpcion}>
                        + Agregar Opción
                      </CButton>
                    )}
                  </div>
                )}

                <CButton color="success" type="submit" className="w-100">
                  <CIcon icon={cilPlus} className="me-2" />
                  Agregar Pregunta
                </CButton>
              </CForm>
            </CCol>
          </CRow>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={handleClosePreguntasModal}>
            Cerrar
          </CButton>
        </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Evaluations

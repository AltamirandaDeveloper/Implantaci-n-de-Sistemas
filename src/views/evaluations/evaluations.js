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
  CAlert,
  CProgress,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilPlus, cilTrash, cilPencil, cilList, cilNotes, cilMediaPlay, cilCheckCircle } from "@coreui/icons"

const Evaluations = () => {
  // --- Estados Generales ---
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState(1)
  const [loading, setLoading] = useState(true)
  
  // --- Datos de la API ---
  const [evaluaciones, setEvaluaciones] = useState([])
  const [contenidos, setContenidos] = useState([])
  const [resultados, setResultados] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  
  // --- Estados de Gestión (Docente) ---
  const [visible, setVisible] = useState(false) // Modal Crear/Editar Evaluación
  const [preguntasVisible, setPreguntasVisible] = useState(false) // Modal Gestión Preguntas
  const [editMode, setEditMode] = useState(false)
  const [currentEvaluation, setCurrentEvaluation] = useState(null)
  const [preguntas, setPreguntas] = useState([]) // Preguntas para gestión
  
  // --- Estados de Examen (Estudiante) ---
  const [examModalVisible, setExamModalVisible] = useState(false)
  const [activeExam, setActiveExam] = useState(null)
  const [examQuestions, setExamQuestions] = useState([])
  const [examOptions, setExamOptions] = useState([])
  const [studentAnswers, setStudentAnswers] = useState({}) // { id_pregunta: valor }
  const [submittingExam, setSubmittingExam] = useState(false)

  // --- Formularios ---
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
    // Simular obtención de usuario logueado (En producción usar Context o Auth real)
    // Cambia el ID aquí para probar como Estudiante (id:2) o Docente (id:1)
    const storedUser = JSON.parse(localStorage.getItem("user")) || { id_usuario: 1, id_role: 2, nombre: "Admin" } 
    setCurrentUser(storedUser)
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
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
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  // ==========================================
  // LÓGICA DEL ESTUDIANTE (PRESENTAR EXAMEN)
  // ==========================================

  const handleStartExam = async (evaluation) => {
    try {
      setLoading(true)
      // 1. Obtener preguntas de la evaluación
      const preguntasRes = await fetch(`http://localhost:3001/preguntas?id_evaluacion=${evaluation.id_evaluacion}`)
      const preguntasData = await preguntasRes.json()

      // 2. Obtener todas las opciones (JSON server no soporta joins complejos facil, traemos todas y filtramos)
      // Idealmente: fetch(`http://localhost:3001/opciones_pregunta`) y filtrar, o hacer fetch por pregunta.
      // Optimizacion: Traer todas las opciones de una vez es más rápido para prototipos pequeños.
      const opcionesRes = await fetch(`http://localhost:3001/opciones_pregunta`)
      const opcionesData = await opcionesRes.json()

      setActiveExam(evaluation)
      setExamQuestions(preguntasData)
      setExamOptions(opcionesData)
      setStudentAnswers({})
      setExamModalVisible(true)
    } catch (error) {
      console.error("Error iniciando examen:", error)
      alert("Error al cargar el examen")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (preguntaId, valor) => {
    setStudentAnswers(prev => ({
      ...prev,
      [preguntaId]: valor
    }))
  }

  const submitExam = async () => {
    if (!window.confirm("¿Estás seguro de enviar tus respuestas?")) return
    
    setSubmittingExam(true)
    let totalPuntosPosibles = 0
    let totalPuntosObtenidos = 0
    const respuestasParaGuardar = []

    // 1. Calcular Nota
    examQuestions.forEach(pregunta => {
      const puntosPregunta = Number(pregunta.puntos)
      totalPuntosPosibles += puntosPregunta
      
      const respuestaEstudiante = studentAnswers[pregunta.id_pregunta]
      let puntosGanados = 0
      let idOpcionSeleccionada = null

      if (pregunta.tipo_pregunta === "opcion_multiple" || pregunta.tipo_pregunta === "verdadero_falso") {
        // Buscar la opción correcta en la BD
        const opcionesDePregunta = examOptions.filter(opt => opt.id_pregunta === pregunta.id_pregunta)
        const opcionCorrecta = opcionesDePregunta.find(opt => opt.es_correcta === true)
        
        // La respuesta del estudiante viene como ID de opcion (string o number)
        if (respuestaEstudiante && opcionCorrecta && String(respuestaEstudiante) === String(opcionCorrecta.id)) {
            puntosGanados = puntosPregunta
        }
        idOpcionSeleccionada = respuestaEstudiante ? Number(respuestaEstudiante) : null

      } else {
        // Lógica simple para respuestas abiertas (requiere revisión manual normalmente, aquí damos puntos si no está vacío para el demo)
        if (respuestaEstudiante && respuestaEstudiante.trim().length > 0) {
            // En un sistema real, esto iría a "pendiente de revisión". Aquí asumimos correcto para demo.
            // Opcional: puntosGanados = 0; 
            puntosGanados = puntosPregunta // Auto-aprobar completitud
        }
      }

      totalPuntosObtenidos += puntosGanados

      respuestasParaGuardar.push({
        id_pregunta: pregunta.id_pregunta,
        id_opcion_seleccionada: idOpcionSeleccionada, // Para selección multiple
        respuesta_texto: idOpcionSeleccionada ? null : respuestaEstudiante, // Para abiertas
        puntos_obtenidos: puntosGanados
      })
    })

    // Calcular nota final (Escala 1 a 10)
    const notaFinal = totalPuntosPosibles > 0 ? (totalPuntosObtenidos / totalPuntosPosibles) * 10 : 0

    try {
      // 2. Guardar Resultado General
      const resultadoData = {
        id_estudiante: currentUser.id_usuario, // Asumiendo que id_usuario mapea a estudiante
        id_evaluacion: activeExam.id_evaluacion,
        nota_final: Number(notaFinal.toFixed(2)),
        estado_revision: "completado",
        fecha_inicio: new Date().toISOString(), // Simplificado
        fecha_completado: new Date().toISOString()
      }

      const resResultado = await fetch("http://localhost:3001/resultados_evaluaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultadoData)
      })
      const resultadoGuardado = await resResultado.json()

      // 3. Guardar Respuestas Detalladas
      const promises = respuestasParaGuardar.map(respuesta => {
        return fetch("http://localhost:3001/respuestas_estudiantes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...respuesta,
            id_resultado: resultadoGuardado.id_resultado // Usar ID generado por JSON Server (aunque en json-server a veces usa 'id')
          })
        })
      })

      await Promise.all(promises)

      alert(`Examen enviado. Tu calificación: ${notaFinal.toFixed(2)}/10`)
      setExamModalVisible(false)
      fetchData() // Recargar tablas

    } catch (error) {
      console.error("Error guardando examen:", error)
      alert("Hubo un error al guardar tus respuestas.")
    } finally {
      setSubmittingExam(false)
    }
  }


  // ==========================================
  // LÓGICA DE GESTIÓN (DOCENTE)
  // ==========================================

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const evaluationData = {
      ...formData,
      duracion_minutos: Number.parseInt(formData.duracion_minutos),
      id_contenido: Number.parseInt(formData.id_contenido),
      id_docente: currentUser.id_usuario,
      // Generar un id_evaluacion numérico si es nuevo (simulación, backend real lo hace)
      id_evaluacion: editMode ? currentEvaluation.id_evaluacion : Date.now() 
    }

    try {
      if (editMode && currentEvaluation) {
        await fetch(`http://localhost:3001/evaluaciones/${currentEvaluation.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...evaluationData, id: currentEvaluation.id }),
        })
      } else {
        await fetch("http://localhost:3001/evaluaciones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(evaluationData),
        })
      }
      fetchData()
      handleCloseModal()
    } catch (error) {
      console.error("Error saving evaluation:", error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm("¿Está seguro de eliminar esta evaluación?")) {
      try {
        await fetch(`http://localhost:3001/evaluaciones/${id}`, { method: "DELETE" })
        fetchData()
      } catch (error) { console.error(error) }
    }
  }

  const handleManageQuestions = async (evaluation) => {
    setCurrentEvaluation(evaluation)
    try {
      const response = await fetch(`http://localhost:3001/preguntas?id_evaluacion=${evaluation.id_evaluacion}`)
      const preguntasData = await response.json()
      setPreguntas(preguntasData)
      setPreguntasVisible(true)
    } catch (error) { console.error(error) }
  }

  // --- Funciones de Preguntas ---
  const handleSavePregunta = async (e) => {
    e.preventDefault()
    try {
      const preguntaData = {
        id_evaluacion: currentEvaluation.id_evaluacion,
        enunciado: preguntaForm.enunciado,
        tipo_pregunta: preguntaForm.tipo_pregunta,
        puntos: Number.parseInt(preguntaForm.puntos),
        orden: preguntas.length + 1,
        id_pregunta: Date.now() // Simular ID autoincremental
      }

      const preguntaResponse = await fetch("http://localhost:3001/preguntas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preguntaData),
      })
      const savedPregunta = await preguntaResponse.json()

      // Guardar opciones si aplica
      if (["opcion_multiple", "verdadero_falso"].includes(preguntaForm.tipo_pregunta)) {
        for (let i = 0; i < preguntaForm.opciones.length; i++) {
          if(preguntaForm.opciones[i]) { // Solo guardar si hay texto
            await fetch("http://localhost:3001/opciones_pregunta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                id_pregunta: savedPregunta.id_pregunta, // Usar el ID lógico
                texto_opcion: preguntaForm.opciones[i],
                es_correcta: i === Number.parseInt(preguntaForm.respuesta_correcta),
                id_opcion: Date.now() + i // Simular ID
                }),
            })
          }
        }
      }

      // Refrescar lista
      const response = await fetch(`http://localhost:3001/preguntas?id_evaluacion=${currentEvaluation.id_evaluacion}`)
      setPreguntas(await response.json())
      
      // Reset form
      setPreguntaForm({ ...preguntaForm, enunciado: "", opciones: ["", ""], respuesta_correcta: 0 })
    } catch (error) { console.error(error) }
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

  // Helpers de Formulario de Preguntas
  const handlePreguntaInputChange = (e) => setPreguntaForm({ ...preguntaForm, [e.target.name]: e.target.value })
  const handleOpcionChange = (index, value) => {
    const opts = [...preguntaForm.opciones]; opts[index] = value;
    setPreguntaForm({ ...preguntaForm, opciones: opts })
  }
  const addOpcion = () => setPreguntaForm({ ...preguntaForm, opciones: [...preguntaForm.opciones, ""] })
  const removeOpcion = (index) => setPreguntaForm({ ...preguntaForm, opciones: preguntaForm.opciones.filter((_, i) => i !== index) })
  
  // Helpers de UI
  const handleCloseModal = () => { setVisible(false); setEditMode(false); setCurrentEvaluation(null); setFormData({ titulo: "", descripcion: "", tipo_habilidad: "grammar", duracion_minutos: 30, fecha_disponible_hasta: "", activa: true, id_contenido: "" }) }
  const handleClosePreguntasModal = () => { setPreguntasVisible(false); setPreguntas([]); }
  const getTipoHabilidadBadge = (tipo) => {
    const config = { grammar: {c:"primary", l:"Gramática"}, pronunciation: {c:"danger", l:"Pronunciación"}, reading: {c:"info", l:"Lectura"}, listening: {c:"warning", l:"Listening"} }
    const item = config[tipo] || {c:"secondary", l:tipo};
    return <CBadge color={item.c}>{item.l}</CBadge>
  }
  const getContenidoNombre = (id) => contenidos.find(c => c.id_contenido === id)?.titulo || "N/A"
  
  // Helpers Estudiante
  const getStudentResult = (evalId) => resultados.find(r => r.id_evaluacion === evalId && r.id_estudiante === currentUser.id_usuario)

  if (loading) return <div className="text-center p-5"><CSpinner color="primary" /></div>

  // ==========================================
  // RENDERIZADO
  // ==========================================

  // --- VISTA DOCENTE / ADMIN ---
  if (currentUser && currentUser.id_role !== 2) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>
              <CNav variant="tabs" role="tablist">
                <CNavItem><CNavLink active={activeTab === 1} onClick={() => setActiveTab(1)} style={{cursor:"pointer"}}><CIcon icon={cilList} className="me-2"/>Evaluaciones</CNavLink></CNavItem>
                <CNavItem><CNavLink active={activeTab === 2} onClick={() => setActiveTab(2)} style={{cursor:"pointer"}}><CIcon icon={cilNotes} className="me-2"/>Resultados</CNavLink></CNavItem>
              </CNav>
            </CCardHeader>
            <CCardBody>
              <CTabContent>
                <CTabPane visible={activeTab === 1}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Gestión de Evaluaciones</h5>
                    <CButton color="primary" onClick={() => setVisible(true)}><CIcon icon={cilPlus} className="me-2" />Nueva Evaluación</CButton>
                  </div>
                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Título</CTableHeaderCell>
                        <CTableHeaderCell>Habilidad</CTableHeaderCell>
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
                          <CTableDataCell>{evaluation.duracion_minutos} min</CTableDataCell>
                          <CTableDataCell>{evaluation.activa ? <CBadge color="success">Activa</CBadge> : <CBadge color="secondary">Inactiva</CBadge>}</CTableDataCell>
                          <CTableDataCell>
                            <CButton color="warning" size="sm" className="me-2 text-white" onClick={() => handleManageQuestions(evaluation)}>Preguntas</CButton>
                            <CButton color="info" size="sm" className="me-2 text-white" onClick={() => handleEdit(evaluation)}><CIcon icon={cilPencil} /></CButton>
                            <CButton color="danger" size="sm" className="text-white" onClick={() => handleDelete(evaluation.id)}><CIcon icon={cilTrash} /></CButton>
                          </CTableDataCell>
                        </CTableRow>
                      ))}
                    </CTableBody>
                  </CTable>
                </CTabPane>

                <CTabPane visible={activeTab === 2}>
                    {/* Tabla de Resultados Globales (Docente) */}
                    <h5 className="mb-3">Resultados de Estudiantes</h5>
                    <CTable hover responsive>
                        <CTableHead>
                            <CTableRow>
                                <CTableHeaderCell>Estudiante</CTableHeaderCell>
                                <CTableHeaderCell>Evaluación</CTableHeaderCell>
                                <CTableHeaderCell>Nota</CTableHeaderCell>
                                <CTableHeaderCell>Fecha</CTableHeaderCell>
                            </CTableRow>
                        </CTableHead>
                        <CTableBody>
                            {resultados.map((res) => (
                                <CTableRow key={res.id}>
                                    <CTableDataCell>{estudiantes.find(e => e.id_usuario === res.id_estudiante) ? `Estudiante ID: ${res.id_estudiante}` : res.id_estudiante}</CTableDataCell>
                                    <CTableDataCell>{evaluaciones.find(e => e.id_evaluacion === res.id_evaluacion)?.titulo || "N/A"}</CTableDataCell>
                                    <CTableDataCell><strong>{res.nota_final}</strong></CTableDataCell>
                                    <CTableDataCell>{new Date(res.fecha_completado).toLocaleDateString()}</CTableDataCell>
                                </CTableRow>
                            ))}
                        </CTableBody>
                    </CTable>
                </CTabPane>
              </CTabContent>
            </CCardBody>
          </CCard>
        </CCol>
        
        {/* Modales de Gestión (Solo Docente) */}
        <CModal visible={visible} onClose={handleCloseModal} size="lg">
            <CModalHeader><CModalTitle>{editMode ? "Editar" : "Nueva"} Evaluación</CModalTitle></CModalHeader>
            <CForm onSubmit={handleSubmit}>
                <CModalBody>
                    <div className="mb-3">
                        <CFormLabel>Título</CFormLabel>
                        <CFormInput name="titulo" value={formData.titulo} onChange={handleInputChange} required />
                    </div>
                    <div className="mb-3">
                        <CFormLabel>Descripción</CFormLabel>
                        <CFormTextarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} required />
                    </div>
                    <CRow>
                        <CCol md={6}>
                            <CFormLabel>Habilidad</CFormLabel>
                            <CFormSelect name="tipo_habilidad" value={formData.tipo_habilidad} onChange={handleInputChange}>
                                <option value="grammar">Gramática</option>
                                <option value="pronunciation">Pronunciación</option>
                                <option value="reading">Lectura</option>
                                <option value="listening">Listening</option>
                            </CFormSelect>
                        </CCol>
                        <CCol md={6}>
                            <CFormLabel>Duración (min)</CFormLabel>
                            <CFormInput type="number" name="duracion_minutos" value={formData.duracion_minutos} onChange={handleInputChange} required />
                        </CCol>
                    </CRow>
                    <div className="mt-3">
                        <CFormLabel>Contenido Relacionado</CFormLabel>
                        <CFormSelect name="id_contenido" value={formData.id_contenido} onChange={handleInputChange} required>
                            <option value="">Seleccionar...</option>
                            {contenidos.map(c => <option key={c.id} value={c.id_contenido}>{c.titulo}</option>)}
                        </CFormSelect>
                    </div>
                    <div className="mt-3">
                        <CFormLabel>Fecha Límite</CFormLabel>
                        <CFormInput type="date" name="fecha_disponible_hasta" value={formData.fecha_disponible_hasta} onChange={handleInputChange} />
                    </div>
                    <div className="mt-3">
                        <CFormCheck label="Activa" name="activa" checked={formData.activa} onChange={handleInputChange} />
                    </div>
                </CModalBody>
                <CModalFooter>
                    <CButton color="secondary" onClick={handleCloseModal}>Cancelar</CButton>
                    <CButton color="primary" type="submit">Guardar</CButton>
                </CModalFooter>
            </CForm>
        </CModal>

        <CModal visible={preguntasVisible} onClose={handleClosePreguntasModal} size="xl">
             <CModalHeader><CModalTitle>Gestionar Preguntas</CModalTitle></CModalHeader>
             <CModalBody>
                 <CRow>
                     <CCol md={6} style={{maxHeight: '70vh', overflowY:'auto'}}>
                         <h6>Preguntas Actuales</h6>
                         {preguntas.map((p, i) => (
                             <CCard key={p.id} className="mb-2">
                                 <CCardBody>
                                     <strong>{i+1}.</strong> {p.enunciado} <br/>
                                     <small className="text-muted">Tipo: {p.tipo_pregunta} | Puntos: {p.puntos}</small>
                                 </CCardBody>
                             </CCard>
                         ))}
                     </CCol>
                     <CCol md={6}>
                         <h6>Nueva Pregunta</h6>
                         <CForm onSubmit={handleSavePregunta}>
                             <div className="mb-2">
                                 <CFormLabel>Enunciado</CFormLabel>
                                 <CFormTextarea name="enunciado" value={preguntaForm.enunciado} onChange={handlePreguntaInputChange} required />
                             </div>
                             <CRow className="mb-2">
                                 <CCol><CFormSelect name="tipo_pregunta" value={preguntaForm.tipo_pregunta} onChange={handlePreguntaInputChange}>
                                     <option value="opcion_multiple">Opción Múltiple</option>
                                     <option value="verdadero_falso">Verdadero/Falso</option>
                                     <option value="respuesta_corta">Respuesta Corta</option>
                                 </CFormSelect></CCol>
                                 <CCol><CFormInput type="number" name="puntos" placeholder="Puntos" value={preguntaForm.puntos} onChange={handlePreguntaInputChange} required /></CCol>
                             </CRow>
                             {(preguntaForm.tipo_pregunta === "opcion_multiple" || preguntaForm.tipo_pregunta === "verdadero_falso") && (
                                 <div className="mb-3 bg-light p-2 rounded">
                                     <label>Opciones (Marque la correcta)</label>
                                     {preguntaForm.opciones.map((op, idx) => (
                                         <div key={idx} className="d-flex mb-1 align-items-center">
                                             <CFormInput size="sm" value={op} onChange={(e) => handleOpcionChange(idx, e.target.value)} placeholder={`Opción ${idx+1}`} required />
                                             <CFormCheck type="radio" name="respuesta_correcta" className="ms-2" checked={preguntaForm.respuesta_correcta === idx} onChange={() => setPreguntaForm({...preguntaForm, respuesta_correcta: idx})} />
                                             {preguntaForm.opciones.length > 2 && <CIcon icon={cilTrash} className="text-danger ms-2" onClick={() => removeOpcion(idx)} style={{cursor:'pointer'}} />}
                                         </div>
                                     ))}
                                     {preguntaForm.tipo_pregunta === "opcion_multiple" && <CButton size="sm" color="link" onClick={addOpcion}>+ Agregar Opción</CButton>}
                                 </div>
                             )}
                             <CButton type="submit" color="success" className="w-100 text-white">Agregar Pregunta</CButton>
                         </CForm>
                     </CCol>
                 </CRow>
             </CModalBody>
        </CModal>
      </CRow>
    )
  }

  // --- VISTA ESTUDIANTE ---
  return (
    <CRow>
      <CCol xs={12}>
        <CCard>
            <CCardHeader>
                <h4>Mis Evaluaciones</h4>
            </CCardHeader>
            <CCardBody>
                <div className="d-flex flex-wrap gap-3">
                    {evaluaciones.filter(ev => ev.activa).map(ev => {
                        const result = getStudentResult(ev.id_evaluacion)
                        return (
                            <CCard key={ev.id} style={{width: '18rem'}} className={result ? "border-success" : "border-primary"}>
                                <CCardHeader>{getTipoHabilidadBadge(ev.tipo_habilidad)}</CCardHeader>
                                <CCardBody>
                                    <h5>{ev.titulo}</h5>
                                    <p className="text-muted small">{ev.descripcion}</p>
                                    <hr/>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <small><CIcon icon={cilList}/> {ev.duracion_minutos} min</small>
                                        {result ? (
                                            <div className="text-end">
                                                <CBadge color="success" className="mb-1">Completado</CBadge>
                                                <div className="fw-bold">Nota: {result.nota_final}</div>
                                            </div>
                                        ) : (
                                            <CButton color="primary" onClick={() => handleStartExam(ev)}>
                                                <CIcon icon={cilMediaPlay} className="me-2"/> Iniciar
                                            </CButton>
                                        )}
                                    </div>
                                </CCardBody>
                            </CCard>
                        )
                    })}
                </div>
            </CCardBody>
        </CCard>
      </CCol>

      {/* Modal para PRESENTAR EXAMEN */}
      <CModal visible={examModalVisible} onClose={() => !submittingExam && setExamModalVisible(false)} size="xl" backdrop="static">
          <CModalHeader closeButton={!submittingExam}>
              <CModalTitle>{activeExam?.titulo}</CModalTitle>
          </CModalHeader>
          <CModalBody className="bg-light">
             {activeExam && (
                 <div className="container">
                     <CAlert color="info">
                         <strong>Instrucciones:</strong> Responde todas las preguntas. Al finalizar presiona "Enviar Examen".
                         Tiempo estimado: {activeExam.duracion_minutos} minutos.
                     </CAlert>
                     
                     {examQuestions.map((preg, index) => (
                         <CCard key={preg.id} className="mb-4 shadow-sm">
                             <CCardHeader className="bg-white">
                                 <strong>Pregunta {index + 1}</strong> 
                                 <span className="float-end badge bg-secondary">{preg.puntos} pt(s)</span>
                             </CCardHeader>
                             <CCardBody>
                                 <p className="lead" style={{fontSize: '1.1rem'}}>{preg.enunciado}</p>
                                 
                                 {/* Renderizar Inputs según tipo */}
                                 {(preg.tipo_pregunta === "opcion_multiple" || preg.tipo_pregunta === "verdadero_falso") && (
                                     <div className="d-flex flex-column gap-2">
                                         {examOptions
                                            .filter(opt => opt.id_pregunta === preg.id_pregunta)
                                            .map(opt => (
                                             <div key={opt.id} className="form-check p-2 border rounded hover-shadow">
                                                 <input 
                                                    className="form-check-input ms-1" 
                                                    type="radio" 
                                                    name={`preg_${preg.id_pregunta}`} 
                                                    id={`opt_${opt.id}`}
                                                    checked={String(studentAnswers[preg.id_pregunta]) === String(opt.id)} // Comparar IDs
                                                    onChange={() => handleAnswerChange(preg.id_pregunta, opt.id)}
                                                 />
                                                 <label className="form-check-label ms-3 w-100" htmlFor={`opt_${opt.id}`} style={{cursor:'pointer'}}>
                                                     {opt.texto_opcion}
                                                 </label>
                                             </div>
                                         ))}
                                     </div>
                                 )}

                                 {(preg.tipo_pregunta === "respuesta_corta" || preg.tipo_pregunta === "audio_pronunciacion") && (
                                     <div>
                                         <CFormLabel>Tu respuesta:</CFormLabel>
                                         <CFormTextarea 
                                            rows={3}
                                            placeholder={preg.tipo_pregunta === "audio_pronunciacion" ? "Escribe lo que escuchaste o transcribe tu respuesta..." : "Escribe tu respuesta aquí..."}
                                            value={studentAnswers[preg.id_pregunta] || ""}
                                            onChange={(e) => handleAnswerChange(preg.id_pregunta, e.target.value)}
                                         />
                                     </div>
                                 )}

                             </CCardBody>
                         </CCard>
                     ))}
                 </div>
             )}
          </CModalBody>
          <CModalFooter>
              <CButton color="secondary" disabled={submittingExam} onClick={() => setExamModalVisible(false)}>Cancelar</CButton>
              <CButton color="success text-white" disabled={submittingExam} onClick={submitExam}>
                  {submittingExam ? <CSpinner size="sm"/> : <><CIcon icon={cilCheckCircle} className="me-2"/> Enviar Examen</>}
              </CButton>
          </CModalFooter>
      </CModal>
    </CRow>
  )
}

export default Evaluations
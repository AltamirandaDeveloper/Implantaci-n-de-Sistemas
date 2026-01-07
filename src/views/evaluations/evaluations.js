import React, { useState, useEffect } from "react"
import { supabase } from '../../lib/supabase'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CButton, CModal, CModalHeader,
  CModalTitle, CModalBody, CModalFooter, CForm, CFormInput, CFormLabel,
  CFormSelect, CFormTextarea, CTable, CTableHead, CTableRow, CTableHeaderCell,
  CTableBody, CTableDataCell, CBadge, CSpinner, CNav, CNavItem, CNavLink,
  CTabContent, CTabPane, CFormCheck, CAlert, CProgress
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilPlus, cilTrash, cilList, cilNotes, cilMediaPlay, cilCheckCircle, cilMicrophone, cilChartLine, cilLockLocked } from "@coreui/icons"
import AlertMessage from "../../components/ui/AlertMessage"
import { evaluationSchema } from '../../../schemas/evaluations.schema'

const Evaluations = () => {
  // --- Estados Generales ---
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState(1) // 1: Evaluaciones, 2: Resultados
  const [loading, setLoading] = useState(true)

  // --- Datos ---
  const [evaluaciones, setEvaluaciones] = useState([])
  const [contenidos, setContenidos] = useState([])
  const [resultados, setResultados] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [usuarios, setUsuarios] = useState([])

  // --- Gestión Docente ---
  const [visible, setVisible] = useState(false)
  const [preguntasVisible, setPreguntasVisible] = useState(false)
  const [currentEvaluation, setCurrentEvaluation] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [puntosTotales, setPuntosTotales] = useState(0)

  // --- Examen Estudiante ---
  const [examModalVisible, setExamModalVisible] = useState(false)
  const [activeExam, setActiveExam] = useState(null)
  const [examQuestions, setExamQuestions] = useState([])
  const [examOptions, setExamOptions] = useState([])
  const [studentAnswers, setStudentAnswers] = useState({})
  const [submittingExam, setSubmittingExam] = useState(false)
  const [isListening, setIsListening] = useState(false)

  // --- Formularios ---
  const [formData, setFormData] = useState({
    titulo: "", descripcion: "", tipo_habilidad: "mixed", duracion_minutos: 20, fecha_disponible_hasta: "", activa: true, id_contenido: ""
  })

  const [formErrors, setFormErrors] = useState({})

  const handleFormChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      const copy = { ...formErrors }
      delete copy[name]
      setFormErrors(copy)
    }
  }

  const [preguntaForm, setPreguntaForm] = useState({
    enunciado: "", tipo_pregunta: "opcion_multiple", puntos: 5, opciones: ["", ""], respuesta_correcta: 0, respuesta_correcta_texto: ""
  })

  // --- Estados para Alertas y Confirmaciones ---
  const [alertMessage, setAlertMessage] = useState(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [evaluationToDelete, setEvaluationToDelete] = useState(null)
  const [deletePreguntaModalVisible, setDeletePreguntaModalVisible] = useState(false)
  const [preguntaToDelete, setPreguntaToDelete] = useState(null)

  // --- Estados para Modal de Confirmación de Entrega (Estudiante) ---
  const [submitConfirmModalVisible, setSubmitConfirmModalVisible] = useState(false)
  const [examResultModalVisible, setExamResultModalVisible] = useState(false)
  const [examResult, setExamResult] = useState(null)
  const [examScoreDetails, setExamScoreDetails] = useState({ total: 0, obtained: 0, percentage: 0 })

  // Simulación de Auth (normalizar fields `id` / `id_usuario`)
  useEffect(() => {
    const raw = JSON.parse(localStorage.getItem("user")) || { id_usuario: 3, id_role: 3, nombre: "Profe" }
    const storedUser = {
      ...raw,
      id_usuario: raw.id_usuario || raw.id,
      id: raw.id || raw.id_usuario,
    }
    setCurrentUser(storedUser)
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [evalRes, contRes, resRes, estRes, userRes] = await Promise.all([
        supabase.from('evaluaciones').select('*'),
        supabase.from('contenidos').select('*'),
        supabase.from('resultados_evaluaciones').select('*'),
        supabase.from('estudiantes').select('*'),
        supabase.from('usuarios').select('*'),
      ])

      if (evalRes.error) throw evalRes.error
      if (contRes.error) throw contRes.error
      if (resRes.error) throw resRes.error
      if (estRes.error) throw estRes.error
      if (userRes.error) throw userRes.error

      const evalData = (evalRes.data || []).map(r => ({ ...r, id_evaluacion: r.id }))
      const contData = (contRes.data || []).map(r => ({ ...r, id_contenido: r.id }))
      const resultadosData = resRes.data || []
      const estudiantesData = estRes.data || []
      const usuariosData = userRes.data || []

      setEvaluaciones(evalData)
      setContenidos(contData)
      setResultados(resultadosData)
      setEstudiantes(estudiantesData)
      setUsuarios(usuariosData)
    } catch (error) { 
      console.error(error)
      setAlertMessage({ message: "Error al cargar los datos", issues: ["No se pudieron cargar los datos del servidor"] })
    } finally { 
      setLoading(false) 
    }
  }

  // --- Funciones para mostrar alertas ---
  const showSuccess = (message) => {
    setAlertMessage({ message, type: 'success' })
  }

  const showError = (message, issues = []) => {
    setAlertMessage({ message, issues, type: 'danger' })
  }

  const closeAlert = () => {
    setAlertMessage(null)
  }

  // --- NUEVA FUNCIÓN: ELIMINAR EVALUACIÓN CON MODAL DE CONFIRMACIÓN ---
  const confirmDeleteEvaluation = (evaluation) => {
    setEvaluationToDelete(evaluation)
    setDeleteModalVisible(true)
  }

  const handleDeleteEvaluation = async () => {
    if (!evaluationToDelete) return
    
    try {
      // Primero eliminar todos los resultados asociados a esta evaluación
      const resultadosAEliminar = resultados.filter(res => res.id_evaluacion === evaluationToDelete.id_evaluacion)
      
      // Eliminar resultados asociados y luego la evaluación en Supabase
      const { error: delResErr } = await supabase
        .from('resultados_evaluaciones')
        .delete()
        .eq('id_evaluacion', evaluationToDelete.id)
      if (delResErr) throw delResErr

      const { error: delEvalErr } = await supabase
        .from('evaluaciones')
        .delete()
        .eq('id', evaluationToDelete.id)
      if (delEvalErr) throw delEvalErr
      
      // Actualizar estados locales
      setEvaluaciones(evaluaciones.filter(e => e.id !== evaluationToDelete.id))
      setResultados(resultados.filter(res => res.id_evaluacion !== evaluationToDelete.id_evaluacion))
      
      showSuccess(`Evaluación "${evaluationToDelete.titulo}" eliminada correctamente.`)
    } catch (error) { 
      console.error(error)
      showError("Error al eliminar la evaluación", ["No se pudo eliminar la evaluación", "Inténtalo de nuevo más tarde"])
    } finally {
      setDeleteModalVisible(false)
      setEvaluationToDelete(null)
    }
  }

  // --- Confirmación para eliminar pregunta ---
  const confirmDeletePregunta = (pregunta) => {
    setPreguntaToDelete(pregunta)
    setDeletePreguntaModalVisible(true)
  }

  const handleDeletePregunta = async () => {
    if (!preguntaToDelete) return
    
    try {
      const idToDelete = preguntaToDelete.id || preguntaToDelete.id_pregunta
      const { error: delPregErr } = await supabase.from('preguntas').delete().eq('id', idToDelete)
      if (delPregErr) throw delPregErr
      
      const filtered = preguntas.filter(p => 
        p.id !== preguntaToDelete.id && p.id_pregunta !== preguntaToDelete.id_pregunta
      )
      setPreguntas(filtered)
      setPuntosTotales(filtered.reduce((acc, curr) => acc + Number(curr.puntos), 0))
      showSuccess("Pregunta eliminada correctamente")
    } catch (error) { 
      console.error(error)
      showError("Error al eliminar la pregunta")
    } finally {
      setDeletePreguntaModalVisible(false)
      setPreguntaToDelete(null)
    }
  }

  // ==========================================
  // RECONOCIMIENTO DE VOZ (Nativo) - Mantenido
  // ==========================================
  const startListening = (idPregunta) => {
    if (!('webkitSpeechRecognition' in window)) {
      showError("Reconocimiento de voz no soportado", ["Tu navegador no soporta reconocimiento de voz", "Usa Chrome o Edge para esta función"])
      return
    }
    const recognition = new window.webkitSpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    setIsListening(true)
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      handleAnswerChange(idPregunta, transcript)
      setIsListening(false)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
  }

  // ==========================================
  // LÓGICA EXAMEN ESTUDIANTE - MODIFICADA
  // ==========================================
  const handleStartExam = async (ev) => {
    // --- VALIDACIÓN DE FECHA LÍMITE ---
    if (ev.fecha_disponible_hasta) {
      const fechaLimite = new Date(ev.fecha_disponible_hasta);
      const ahora = new Date();
      if (ahora > fechaLimite) {
        showError("Plazo vencido", ["El plazo para realizar esta evaluación ha vencido"])
        return;
      }
    }

    // --- NUEVA VALIDACIÓN: VERIFICAR SI YA EXISTE UN RESULTADO ---
    const yaPresento = resultados.some(res =>
      (res.id_estudiante === currentUser.id_usuario || res.id_estudiante === currentUser.id) &&
      res.id_evaluacion === ev.id_evaluacion
    )

    if (yaPresento) {
      showError("Evaluación ya realizada", ["Ya has realizado esta evaluación", "No puedes presentarla de nuevo"])
      return
    }

    const { data: pregsRaw, error: pregErr } = await supabase.from('preguntas').select('*').eq('id_evaluacion', ev.id_evaluacion)
    if (pregErr) throw pregErr
    const { data: optsRaw, error: optsErr } = await supabase.from('opciones_pregunta').select('*')
    if (optsErr) throw optsErr
    const pregs = (pregsRaw || []).map(p => ({ ...p, id_pregunta: p.id }))
    const totalPuntos = pregs.reduce((acc, p) => acc + Number(p.puntos), 0)
    if (totalPuntos !== 20) {
      showError("Error de configuración", [`Esta evaluación tiene un error de configuración (Suma ${totalPuntos} puntos en vez de 20)`, "Contacte al docente"])
      return
    }
    setActiveExam(ev)
    setExamQuestions(pregs)
    setExamOptions((optsRaw || []).map(o => ({ ...o, id_opcion: o.id })))
    setStudentAnswers({})
    setExamModalVisible(true)
  }

  const handleAnswerChange = (pid, val) => {
    setStudentAnswers(prev => ({ ...prev, [pid]: val }))
  }

  // --- Función para calcular la nota antes de enviar ---
  const calculateExamScore = () => {
    let notaAcumulada = 0
    const details = {
      total: 20,
      obtained: 0,
      percentage: 0
    }

    examQuestions.forEach(p => {
      let puntosGanados = 0
      const respuestaUser = studentAnswers[p.id_pregunta]
      if (p.tipo_pregunta === "opcion_multiple") {
        const opciones = examOptions.filter(o => o.id_pregunta === p.id_pregunta)
        const correcta = opciones.find(o => o.es_correcta)
        if (correcta && String(respuestaUser) === String(correcta.id_opcion)) puntosGanados = Number(p.puntos)
      } else {
        const textoCorrecto = (p.respuesta_correcta_texto || "").trim().toLowerCase()
        const textoUser = (respuestaUser || "").trim().toLowerCase()
        if (textoCorrecto && textoUser && textoUser.includes(textoCorrecto)) puntosGanados = Number(p.puntos)
      }
      notaAcumulada += puntosGanados
    })

    details.obtained = notaAcumulada
    details.percentage = (notaAcumulada / 20) * 100
    return { notaAcumulada, details }
  }

  // --- Confirmar entrega del examen (estudiante) ---
  const confirmSubmitExam = () => {
    // Verificar si hay preguntas sin responder
    const preguntasSinResponder = examQuestions.filter(p => !studentAnswers[p.id_pregunta])
    
    if (preguntasSinResponder.length > 0) {
      setAlertMessage({
        message: "Preguntas sin responder",
        issues: [`Tienes ${preguntasSinResponder.length} pregunta(s) sin responder`, "¿Estás seguro de que quieres entregar el examen?"],
        type: 'warning'
      })
    }
    
    setSubmitConfirmModalVisible(true)
  }

  const submitExam = async () => {
    setSubmitConfirmModalVisible(false)
    setSubmittingExam(true)
    
    const { notaAcumulada, details } = calculateExamScore()
    setExamScoreDetails(details)

    const nuevoResultado = {
      id_estudiante: currentUser.id_usuario,
      id_evaluacion: activeExam.id_evaluacion,
      nota_final: notaAcumulada,
      fecha_completado: new Date().toISOString()
    }
    
    try {
      const { error: insertResErr } = await supabase.from('resultados_evaluaciones').insert([{
        ...nuevoResultado,
        id_estudiante: currentUser.id || currentUser.id_usuario
      }])
      if (insertResErr) throw insertResErr
      
      setExamResult({
        nota: notaAcumulada,
        aprobado: notaAcumulada >= 10,
        fecha: new Date().toLocaleString()
      })
      // Cerrar el modal del examen antes de mostrar resultados para evitar solapamientos
      setExamModalVisible(false)
      setExamResultModalVisible(true)
    } catch (error) {
      showError("Error al enviar el examen", ["No se pudo guardar tu resultado", "Inténtalo de nuevo"])
    }
    
    setSubmittingExam(false)
  }

  const closeExamResultModal = () => {
    setExamResultModalVisible(false)
    setExamModalVisible(false)
    fetchData()
  }

  // ==========================================
  // GESTIÓN DOCENTE (Crear/Editar) - MODIFICADO CON ALERTAS
  // ==========================================
  const handleManageQuestions = async (ev) => {
    setCurrentEvaluation(ev)
    try {
      const { data, error } = await supabase.from('preguntas').select('*').eq('id_evaluacion', ev.id_evaluacion)
      if (error) throw error
      const mapped = (data || []).map(d => ({ ...d, id_pregunta: d.id }))
      setPreguntas(mapped)
      setPuntosTotales(mapped.reduce((acc, curr) => acc + Number(curr.puntos), 0))
      setPreguntasVisible(true)
    } catch (error) {
      showError("Error al cargar las preguntas")
    }
  }

  const handleSavePregunta = async (e) => {
    e.preventDefault()
    const puntosNuevos = Number(preguntaForm.puntos)
    if (puntosTotales + puntosNuevos > 20) {
      showError("Límite de puntos excedido", [`No puedes agregar esta pregunta`, `Excedería los 20 puntos (actual: ${puntosTotales} + ${puntosNuevos})`])
      return
    }
    
    try {
      const nuevaPregunta = {
        id_evaluacion: currentEvaluation.id_evaluacion,
        enunciado: preguntaForm.enunciado,
        tipo_pregunta: preguntaForm.tipo_pregunta,
        puntos: puntosNuevos,
        respuesta_correcta_texto: preguntaForm.respuesta_correcta_texto,
      }

      const { data: insData, error: insErr } = await supabase.from('preguntas').insert([nuevaPregunta]).select()
      if (insErr) throw insErr
      const r = insData[0]
      const pregGuardada = { ...r, id_pregunta: r.id }

      if (preguntaForm.tipo_pregunta === "opcion_multiple") {
        await Promise.all(preguntaForm.opciones.map(async (txt, idx) => {
          if (txt) {
            await supabase.from('opciones_pregunta').insert([{
              id_pregunta: pregGuardada.id,
              texto_opcion: txt,
              es_correcta: idx === preguntaForm.respuesta_correcta
            }])
          }
        }))
      }

      const actualizadas = [...preguntas, pregGuardada]
      setPreguntas(actualizadas)
      setPuntosTotales(actualizadas.reduce((acc, curr) => acc + Number(curr.puntos), 0))
      setPreguntaForm({ ...preguntaForm, enunciado: "", respuesta_correcta_texto: "", opciones: ["", ""] })
      showSuccess("Pregunta agregada correctamente")
    } catch (error) {
      showError("Error al guardar la pregunta")
    }
  }

  const handleSaveEvaluation = async (e) => {
    e.preventDefault()
    setFormErrors({})

    // Validate title & description with Zod
    const parsed = evaluationSchema.safeParse({ titulo: formData.titulo, descripcion: formData.descripcion })
    if (!parsed.success) {
      const errors = {}
      parsed.error.issues.forEach((i) => {
        const key = i.path && i.path.length ? i.path[0] : '_'
        errors[key] = i.message
      })
      setFormErrors(errors)
      return
    }

    if (!formData.fecha_disponible_hasta) {
      showError("Faltan datos", ["La fecha límite es obligatoria"])
      return
    }

    try {
      const payload = { ...formData, id_docente: currentUser.id || currentUser.id_usuario }
      const { data: insEval, error: insEvalErr } = await supabase.from('evaluaciones').insert([payload]).select()
      if (insEvalErr) throw insEvalErr
      setFormErrors({})
      showSuccess(`Evaluación "${formData.titulo}" creada correctamente`)
      fetchData()
      setVisible(false)
      setFormData({ 
        titulo: "", 
        descripcion: "", 
        tipo_habilidad: "mixed", 
        duracion_minutos: 20, 
        fecha_disponible_hasta: "", 
        activa: true, 
        id_contenido: "" 
      })
    } catch (error) {
      console.error(error)
      showError("Error al crear la evaluación", ["No se pudo guardar la evaluación", "Verifica los datos e inténtalo de nuevo"])
    }
  }

  if (loading) return <div className="text-center p-5"><CSpinner color="primary" /></div>

  // --- VISTA DOCENTE / ADMIN ---
  if (currentUser && (currentUser.id_role === 1 || currentUser.id_role === 3)) {
    // Filtrar resultados para mostrar solo los de evaluaciones existentes
    const resultadosFiltrados = resultados.filter(res => 
      evaluaciones.some(evalItem => evalItem.id_evaluacion === res.id_evaluacion)
    )

    return (
      <div className="p-3">
        <h3>Panel Docente - Evaluaciones</h3>
        
        {/* ALERTAS */}
        {alertMessage && (
          <div className="mb-3">
            <AlertMessage 
              response={alertMessage} 
              type={alertMessage.type || 'danger'} 
              onClose={closeAlert}
            />
          </div>
        )}
        
        {/* NAVEGACIÓN POR PESTAÑAS */}
        <CNav variant="tabs" className="mb-3">
          <CNavItem>
            <CNavLink active={activeTab === 1} onClick={() => setActiveTab(1)} style={{cursor: 'pointer'}}>
              Gestión de Exámenes
            </CNavLink>
          </CNavItem>
          <CNavItem>
            <CNavLink active={activeTab === 2} onClick={() => setActiveTab(2)} style={{cursor: 'pointer'}}>
              <CIcon icon={cilChartLine} className="me-1"/> Resultados de Estudiantes
            </CNavLink>
          </CNavItem>
        </CNav>

        <CTabContent>
          <CTabPane visible={activeTab === 1}>
            <CButton color="primary" onClick={() => setVisible(true)} className="mb-3">
              <CIcon icon={cilPlus} /> Nueva Evaluación
            </CButton>
            
            <CTable hover bordered align="middle">
              <CTableHead color="light">
                <CTableRow>
                  <CTableHeaderCell>Título / Descripción</CTableHeaderCell>
                  <CTableHeaderCell>Habilitado Hasta</CTableHeaderCell>
                  <CTableHeaderCell>Acciones</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {evaluaciones.map(ev => (
                  <CTableRow key={ev.id_evaluacion}>
                    <CTableDataCell>
                      <strong>{ev.titulo}</strong>
                      <div className="small text-muted">{ev.descripcion}</div>
                    </CTableDataCell>
                    <CTableDataCell>
                      {ev.fecha_disponible_hasta ? new Date(ev.fecha_disponible_hasta).toLocaleString() : 'Sin límite'}
                    </CTableDataCell>
                    <CTableDataCell>
                      <CButton color="warning" size="sm" className="me-2" onClick={() => handleManageQuestions(ev)}>
                        Gestionar Preguntas
                      </CButton>
                      <CButton color="danger" size="sm" onClick={() => confirmDeleteEvaluation(ev)}>
                        <CIcon icon={cilTrash} />
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CTabPane>

          {/* APARTADO RESULTADOS - Ahora solo muestra resultados de evaluaciones existentes */}
          <CTabPane visible={activeTab === 2}>
            <CCard>
              <CCardHeader>Notas y Desempeño</CCardHeader>
              <CCardBody>
                {resultadosFiltrados.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No hay resultados de evaluaciones disponibles.</p>
                  </div>
                ) : (
                  <CTable hover responsive>
                    <CTableHead>
                      <CTableRow>
                        <CTableHeaderCell>Estudiante</CTableHeaderCell>
                        <CTableHeaderCell>Evaluación</CTableHeaderCell>
                        <CTableHeaderCell>Fecha</CTableHeaderCell>
                        <CTableHeaderCell>Calificación</CTableHeaderCell>
                      </CTableRow>
                    </CTableHead>
                    <CTableBody>
                      {resultadosFiltrados.map(res => {
                        const user = usuarios.find(u => u.id_usuario === res.id_estudiante || u.id === res.id_estudiante)
                        const evalItem = evaluaciones.find(e => e.id_evaluacion === res.id_evaluacion)
                        return (
                          <CTableRow key={res.id}>
                            <CTableDataCell>{user ? `${user.nombre} ${user.apellido}` : 'ID: ' + res.id_estudiante}</CTableDataCell>
                            <CTableDataCell>{evalItem?.titulo || 'N/A'}</CTableDataCell>
                            <CTableDataCell>{new Date(res.fecha_completado).toLocaleDateString()}</CTableDataCell>
                            <CTableDataCell>
                              <CBadge color={res.nota_final >= 10 ? 'success' : 'danger'}>
                                {res.nota_final} / 20
                              </CBadge>
                            </CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                )}
              </CCardBody>
            </CCard>
          </CTabPane>
        </CTabContent>

        {/* Modal Crear Evaluación */}
        <CModal visible={visible} onClose={() => setVisible(false)}>
          <CModalHeader>Nueva Evaluación</CModalHeader>
          <CForm onSubmit={handleSaveEvaluation}>
            <CModalBody>
              <div className="mb-3">
                <CFormLabel>Título</CFormLabel>
                <CFormInput name="titulo" required value={formData.titulo} onChange={handleFormChange} placeholder="Ej: Examen Final" invalid={!!formErrors.titulo} feedback={formErrors.titulo} />
              </div>
              <div className="mb-3">
                <CFormLabel>Descripción</CFormLabel>
                <CFormTextarea name="descripcion"
                  value={formData.descripcion}
                  onChange={handleFormChange}
                  rows={3}
                  placeholder="Instrucciones para el estudiante..."
                  invalid={!!formErrors.descripcion} feedback={formErrors.descripcion}
                />
              </div>
              <div className="mb-3">
                <CFormLabel>Relacionar con Contenido</CFormLabel>
                <CFormSelect value={formData.id_contenido} onChange={e => setFormData({...formData, id_contenido: e.target.value})}>
                  <option value="">Selecciona un contenido (opcional)</option>
                  {contenidos.map(c => (
                    <option key={c.id_contenido} value={c.id_contenido}>{c.titulo}</option>
                  ))}
                </CFormSelect>
              </div>
              <div className="mb-3">
                <CFormLabel>Fecha Límite para Presentar</CFormLabel>
                <CFormInput 
                  type="datetime-local" 
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  value={formData.fecha_disponible_hasta} 
                  onChange={e => setFormData({...formData, fecha_disponible_hasta: e.target.value})} 
                />
              </div>
            </CModalBody>
            <CModalFooter>
              <CButton color="secondary" onClick={() => setVisible(false)}>Cancelar</CButton>
              <CButton type="submit" color="primary">Guardar</CButton>
            </CModalFooter>
          </CForm>
        </CModal>

        {/* Modal Gestionar Preguntas */}
        <CModal visible={preguntasVisible} onClose={() => setPreguntasVisible(false)} size="xl">
          <CModalHeader>
            <CModalTitle>Preguntas ({puntosTotales} / 20 Puntos)</CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow>
              <CCol md={7}>
                {preguntas.map((p, i) => (
                  <CCard key={p.id_pregunta || p.id || i} className="mb-2">
                    <CCardBody className="d-flex justify-content-between">
                      <div>
                        <strong>{i+1}. ({p.tipo_pregunta})</strong>: {p.enunciado}
                        <div className="small text-muted">Correcta: {p.respuesta_correcta_texto || "Ver opciones"}</div>
                      </div>
                      <div>
                        <CBadge color="info" className="me-2">{p.puntos} pts</CBadge>
                        <CButton color="danger" size="sm" onClick={() => confirmDeletePregunta(p)}>
                          <CIcon icon={cilTrash}/>
                        </CButton>
                      </div>
                    </CCardBody>
                  </CCard>
                ))}
                {puntosTotales < 20 && <CAlert color="warning">Faltan {20 - puntosTotales} puntos para completar.</CAlert>}
              </CCol>
              
              <CCol md={5}>
                <CCard>
                  <CCardHeader>Agregar Pregunta</CCardHeader>
                  <CCardBody>
                    <CForm onSubmit={handleSavePregunta}>
                      <div className="mb-2">
                        <CFormLabel>Enunciado</CFormLabel>
                        <CFormInput value={preguntaForm.enunciado} onChange={e => setPreguntaForm({...preguntaForm, enunciado: e.target.value})} required />
                      </div>
                      <div className="mb-2">
                        <CFormLabel>Tipo</CFormLabel>
                        <CFormSelect value={preguntaForm.tipo_pregunta} onChange={e => setPreguntaForm({...preguntaForm, tipo_pregunta: e.target.value})}>
                          <option value="opcion_multiple">Opción Múltiple</option>
                          <option value="completacion">Completación</option>
                          <option value="reconocimiento_voz">Reconocimiento de Voz</option>
                          <option value="lectura">Lectura (Comprensión)</option>
                        </CFormSelect>
                      </div>
                      <div className="mb-2">
                        <CFormLabel>Puntos</CFormLabel>
                        <CFormInput type="number" max={20 - puntosTotales} value={preguntaForm.puntos} onChange={e => setPreguntaForm({...preguntaForm, puntos: e.target.value})} required />
                      </div>
                      {preguntaForm.tipo_pregunta === "opcion_multiple" ? (
                        <div className="mb-2">
                          <CFormLabel>Opciones</CFormLabel>
                          {preguntaForm.opciones.map((op, idx) => (
                            <div key={idx} className="d-flex mb-1">
                              <CFormInput size="sm" value={op} onChange={e => {
                                const newOps = [...preguntaForm.opciones]; newOps[idx] = e.target.value;
                                setPreguntaForm({...preguntaForm, opciones: newOps})
                              }} placeholder={`Opción ${idx+1}`} />
                              <CFormCheck type="radio" name="corr" checked={preguntaForm.respuesta_correcta === idx} onChange={() => setPreguntaForm({...preguntaForm, respuesta_correcta: idx})} className="ms-2"/>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mb-2">
                          <CFormLabel>{preguntaForm.tipo_pregunta === "reconocimiento_voz" ? "Palabra a pronunciar" : "Respuesta Correcta"}</CFormLabel>
                          <CFormInput value={preguntaForm.respuesta_correcta_texto} onChange={e => setPreguntaForm({...preguntaForm, respuesta_correcta_texto: e.target.value})} required />
                        </div>
                      )}
                      <CButton type="submit" color="success" className="w-100 text-white" disabled={puntosTotales >= 20}>Agregar</CButton>
                    </CForm>
                  </CCardBody>
                </CCard>
              </CCol>
            </CRow>
          </CModalBody>
        </CModal>

        {/* Modal de Confirmación para Eliminar Evaluación */}
        <CModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)}>
          <CModalHeader>Confirmar Eliminación</CModalHeader>
          <CModalBody>
            ¿Estás seguro de eliminar la evaluación <strong>"{evaluationToDelete?.titulo}"</strong>? 
            <br /><br />
            <span className="text-danger">
              <strong>Esta acción no se puede deshacer.</strong> Se eliminarán todas las preguntas y resultados asociados.
            </span>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setDeleteModalVisible(false)}>
              Cancelar
            </CButton>
            <CButton color="danger" onClick={handleDeleteEvaluation}>
              Eliminar
            </CButton>
          </CModalFooter>
        </CModal>

        {/* Modal de Confirmación para Eliminar Pregunta */}
        <CModal visible={deletePreguntaModalVisible} onClose={() => setDeletePreguntaModalVisible(false)}>
          <CModalHeader>Confirmar Eliminación</CModalHeader>
          <CModalBody>
            ¿Estás seguro de eliminar esta pregunta?
            <br /><br />
            <strong>"{preguntaToDelete?.enunciado?.substring(0, 100)}..."</strong>
            <br /><br />
            <span className="text-danger">
              <strong>Esta acción no se puede deshacer.</strong>
            </span>
          </CModalBody>
          <CModalFooter>
            <CButton color="secondary" onClick={() => setDeletePreguntaModalVisible(false)}>
              Cancelar
            </CButton>
            <CButton color="danger" onClick={handleDeletePregunta}>
              Eliminar Pregunta
            </CButton>
          </CModalFooter>
        </CModal>
      </div>
    )
  }

  // --- VISTA ESTUDIANTE - MODIFICADA CON VALIDACIÓN DE FECHA LÍMITE Y RESULTADO ---
  return (
    <div className="p-3">
      <h3>Mis Evaluaciones</h3>
      
      {/* ALERTAS PARA ESTUDIANTE */}
      {alertMessage && (
        <div className="mb-3">
          <AlertMessage 
            response={alertMessage} 
            type={alertMessage.type || 'danger'} 
            onClose={closeAlert}
          />
        </div>
      )}
      
      <CRow>
        {evaluaciones.filter(e => e.activa).map(ev => {
          const yaPresento = resultados.some(res =>
            (res.id_estudiante === currentUser.id_usuario || res.id_estudiante === currentUser.id) &&
            res.id_evaluacion === ev.id_evaluacion
          )
          
          const esVencida = ev.fecha_disponible_hasta && new Date() > new Date(ev.fecha_disponible_hasta);

          return (
            <CCol md={4} key={ev.id_evaluacion}>
              <CCard className="mb-3 shadow-sm">
                <CCardBody>
                  <h5>{ev.titulo}</h5>
                  <p className="text-muted small">{ev.descripcion}</p>
                  {ev.fecha_disponible_hasta && (
                    <div className="mb-2 small">
                      <strong>Límite:</strong> {new Date(ev.fecha_disponible_hasta).toLocaleString()}
                    </div>
                  )}
                  {yaPresento ? (
                    <CBadge color="success" className="p-2"><CIcon icon={cilCheckCircle} className="me-1"/> Evaluación Completada</CBadge>
                  ) : esVencida ? (
                    <CBadge color="danger" className="p-2"><CIcon icon={cilLockLocked} className="me-1"/> Plazo Vencido</CBadge>
                  ) : (
                    <CButton color="primary" onClick={() => handleStartExam(ev)}>Iniciar Prueba</CButton>
                  )}
                </CCardBody>
              </CCard>
            </CCol>
          )
        })}
      </CRow>

      {/* Modal Examen */}
      <CModal visible={examModalVisible} size="lg" backdrop="static">
        <CModalHeader>{activeExam?.titulo}</CModalHeader>
        <CModalBody>
          {examQuestions.map((p, idx) => (
            <CCard key={p.id_pregunta || p.id || idx} className="mb-3 border-top-primary border-top-3">
              <CCardBody>
                <h5>{idx+1}. {p.enunciado} <CBadge color="secondary" className="float-end">{p.puntos} pts</CBadge></h5>
                {p.tipo_pregunta === "opcion_multiple" && (
                  <div className="mt-3">
                    {examOptions.filter(o => o.id_pregunta === p.id_pregunta).map(opt => (
                      <div key={opt.id_opcion} className="form-check">
                        <input className="form-check-input" type="radio" name={`p-${p.id_pregunta}`}
                          onChange={() => handleAnswerChange(p.id_pregunta, opt.id_opcion)} />
                        <label className="form-check-label">{opt.texto_opcion}</label>
                      </div>
                    ))}
                  </div>
                )}
                {(p.tipo_pregunta === "completacion" || p.tipo_pregunta === "lectura") && (
                  <CFormInput className="mt-2" placeholder="Escribe tu respuesta..."
                    onChange={e => handleAnswerChange(p.id_pregunta, e.target.value)} />
                )}
                {p.tipo_pregunta === "reconocimiento_voz" && (
                  <div className="mt-2 text-center">
                    <CButton color={isListening ? "danger" : "info"} className="text-white rounded-pill" onClick={() => startListening(p.id_pregunta)}>
                      <CIcon icon={cilMicrophone} className="me-2" />
                      {isListening ? "Escuchando..." : "Presiona para hablar"}
                    </CButton>
                    <div className="mt-2 p-2 bg-light border rounded">
                      <strong>Tu voz: </strong> {studentAnswers[p.id_pregunta] || "..."}
                    </div>
                  </div>
                )}
              </CCardBody>
            </CCard>
          ))}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setExamModalVisible(false)} disabled={submittingExam}>
            Cancelar
          </CButton>
          <CButton color="success" className="text-white" onClick={confirmSubmitExam} disabled={submittingExam}>
            {submittingExam ? "Enviando..." : "Entregar Examen"}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Modal de Confirmación de Entrega (Estudiante) */}
      <CModal visible={submitConfirmModalVisible} onClose={() => setSubmitConfirmModalVisible(false)}>
        <CModalHeader>Confirmar Entrega</CModalHeader>
        <CModalBody>
          <div className="text-center mb-3">
            <CIcon icon={cilCheckCircle} size="xl" className="text-warning" />
            <h5 className="mt-3">¿Estás seguro de entregar el examen?</h5>
            <p className="text-muted">
              Una vez entregado, no podrás modificar tus respuestas.
            </p>
          </div>
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setSubmitConfirmModalVisible(false)} disabled={submittingExam}>
            Volver al Examen
          </CButton>
          <CButton color="success" className="text-white" onClick={submitExam} disabled={submittingExam}>
            {submittingExam ? "Enviando..." : "Sí, Entregar"}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Overlay oscuro para atenuar el examen cuando se muestra la confirmación */}
      {submitConfirmModalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 1040
        }} />
      )}

      {/* Modal de Resultados del Examen (Estudiante) */}
      <CModal visible={examResultModalVisible} onClose={closeExamResultModal}>
        <CModalHeader className="border-0 pb-0">
          <div className="text-center w-100">
            {examResult?.aprobado ? (
              <CIcon icon={cilCheckCircle} size="xxl" className="text-success" />
            ) : (
              <CIcon icon={cilLockLocked} size="xxl" className="text-danger" />
            )}
          </div>
        </CModalHeader>
        <CModalBody className="text-center pt-0">
          <h4 className="mb-3">
            {examResult?.aprobado ? '¡Felicidades!' : 'Necesitas mejorar'}
          </h4>
          
          <div className="mb-4">
            <h1 className={`display-4 ${examResult?.aprobado ? 'text-success' : 'text-danger'}`}>
              {examResult?.nota || 0}/20
            </h1>
            <div className="mt-3">
              <CProgress 
                value={examScoreDetails.percentage} 
                color={examResult?.aprobado ? "success" : "danger"}
                className="mb-2"
                style={{ height: '20px' }}
              />
              <small className="text-muted">
                {(examScoreDetails.percentage ?? 0).toFixed(1)}% de aprovechamiento
              </small>
            </div>
          </div>
          
          <div className={`alert ${examResult?.aprobado ? 'alert-success' : 'alert-danger'}`} role="alert">
            <h5 className="alert-heading">
              {examResult?.aprobado ? 'Aprobado' : 'No Aprobado'}
            </h5>
            <p className="mb-0">
              {examResult?.aprobado 
                ? 'Has superado la evaluación satisfactoriamente.' 
                : 'No alcanzaste la nota mínima para aprobar (10/20).'
              }
            </p>
          </div>
          
          <div className="mt-4">
            <p className="text-muted small">
              Resultado registrado el {examResult?.fecha || 'hoy'}
            </p>
          </div>
        </CModalBody>
        <CModalFooter className="border-0 justify-content-center">
          <CButton color="primary" onClick={closeExamResultModal} className="px-5">
            Ver Mis Evaluaciones
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  )
}

export default Evaluations
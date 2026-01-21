import React, { useState, useEffect } from "react"
import { supabase } from '../../lib/supabase'
import {
  CCard, CCardBody, CCardHeader, CCol, CRow, CButton, CModal, CModalHeader,
  CModalTitle, CModalBody, CModalFooter, CForm, CFormInput, CFormLabel,
  CFormSelect, CFormTextarea, CTable, CTableHead, CTableRow, CTableHeaderCell,
  CTableBody, CTableDataCell, CBadge, CSpinner, CNav, CNavItem, CNavLink,
  CTabContent, CTabPane, CFormCheck, CAlert, CProgress,
} from "@coreui/react"
import CIcon from "@coreui/icons-react"
import { cilPlus, cilTrash, cilList, cilNotes, cilMediaPlay, cilCheckCircle, cilMicrophone, cilChartLine, cilLockLocked, cilVolumeHigh, cilCloudDownload, cilStar } from "@coreui/icons"
import AlertMessage from "../../components/ui/AlertMessage"
import { evaluationSchema } from '../../../schemas/evaluations.schema'
import { generateEvaluationReport } from '../../utils/pdfGenerator'

// --- UTILIDAD: Algoritmo de Levenshtein ---
const levenshteinDistance = (a, b) => {
  const matrix = [];
  let i, j;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  for (i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// --- MAPEO DE NÚMEROS A TEXTO (0-20 y decenas básicas) ---
const numberMap = {
    '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five',
    '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten',
    '11': 'eleven', '12': 'twelve', '13': 'thirteen', '14': 'fourteen', '15': 'fifteen',
    '16': 'sixteen', '17': 'seventeen', '18': 'eighteen', '19': 'nineteen', '20': 'twenty',
    '30': 'thirty', '40': 'forty', '50': 'fifty', '60': 'sixty', '70': 'seventy', '80': 'eighty', '90': 'ninety', '100': 'one hundred'
};

// --- FUNCIÓN MEJORADA DE VALIDACIÓN DE VOZ ---
const isSpeechCorrect = (spoken, target) => {
  if (!spoken || !target) return false;
  
  // 1. Normalización básica (minusculas, sin puntuación)
  let cleanSpoken = spoken.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
  let cleanTarget = target.trim().toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");

  // 2. CORRECCIÓN DE NÚMEROS (Si dice "3", lo convertimos a "three")
  // Dividimos por espacios para manejar frases cortas, aunque usualmente es una palabra
  cleanSpoken = cleanSpoken.split(' ').map(word => numberMap[word] || word).join(' ');
  cleanTarget = cleanTarget.split(' ').map(word => numberMap[word] || word).join(' ');

  // 3. Comparación directa
  if (cleanSpoken === cleanTarget) return true;

  // 4. Aproximación (Levenshtein)
  const distance = levenshteinDistance(cleanSpoken, cleanTarget);
  const maxLength = Math.max(cleanSpoken.length, cleanTarget.length);
  const tolerance = Math.max(2, Math.floor(maxLength * 0.2)); // 20% de error permitido

  return distance <= tolerance;
}

const Evaluations = () => {
  // --- Estados Generales ---
  const [currentUser, setCurrentUser] = useState(null)
  const [activeTab, setActiveTab] = useState(1) 
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

  // --- Estados para Alertas ---
  const [alertMessage, setAlertMessage] = useState(null)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [evaluationToDelete, setEvaluationToDelete] = useState(null)
  const [deletePreguntaModalVisible, setDeletePreguntaModalVisible] = useState(false)
  const [preguntaToDelete, setPreguntaToDelete] = useState(null)

  const [submitConfirmModalVisible, setSubmitConfirmModalVisible] = useState(false)
  const [examResultModalVisible, setExamResultModalVisible] = useState(false)
  const [examResult, setExamResult] = useState(null)
  const [examScoreDetails, setExamScoreDetails] = useState({ total: 0, obtained: 0, percentage: 0 })

  useEffect(() => {
    const raw = JSON.parse(sessionStorage.getItem("user")) || null
    if (raw) {
        const storedUser = {
        ...raw,
        id_usuario: raw.id_usuario || raw.id,
        id: raw.id || raw.id_usuario,
        }
        setCurrentUser(storedUser)
        fetchData(storedUser)
    } else {
        setLoading(false)
    }
  }, [])

  const fetchData = async (userSession) => {
    try {
      setLoading(true)
      const user = userSession || currentUser
      if (!user) return

      let evalQuery = supabase.from('evaluaciones').select('*')
      let contQuery = supabase.from('contenidos').select('*')
      
      if (user.id_role === 2 || user.id_role === 3) {
          if (user.id_grado) {
              evalQuery = evalQuery.eq('id_grado', user.id_grado)
              if (user.id_role === 3) {
                  contQuery = contQuery.eq('grado_objetivo', user.id_grado)
              }
          } else {
              setEvaluaciones([])
              setLoading(false)
              return
          }
      }

      const [evalRes, contRes, resRes, estRes, userRes] = await Promise.all([
        evalQuery,
        contQuery,
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

  const showSuccess = (message) => setAlertMessage({ message, type: 'success' })
  const showError = (message, issues = []) => setAlertMessage({ message, issues, type: 'danger' })
  const closeAlert = () => setAlertMessage(null)

  const handleDownloadSingleReport = (evaluacion) => {
    if (!currentUser) return;
    const hayNotas = resultados.some(r => 
      String(r.id_evaluacion) === String(evaluacion.id) || 
      String(r.id_evaluacion) === String(evaluacion.id_evaluacion)
    );
    
    if (!hayNotas) {
        showError("Sin datos", ["Nadie ha presentado esta evaluación todavía."])
        return
    }

    try {
        generateEvaluationReport(
            `${currentUser.nombre} ${currentUser.apellido}`,
            evaluacion,
            resultados,
            usuarios
        )
        showSuccess(`Generando reporte para: ${evaluacion.titulo}`)
    } catch (error) {
        console.error("Error PDF", error)
        showError("Error al generar el PDF: " + error.message)
    }
  }

  const confirmDeleteEvaluation = (evaluation) => { setEvaluationToDelete(evaluation); setDeleteModalVisible(true) }

  const handleDeleteEvaluation = async () => {
    if (!evaluationToDelete) return
    try {
      const { error: delResErr } = await supabase.from('resultados_evaluaciones').delete().eq('id_evaluacion', evaluationToDelete.id)
      if (delResErr) throw delResErr
      const { error: delEvalErr } = await supabase.from('evaluaciones').delete().eq('id', evaluationToDelete.id)
      if (delEvalErr) throw delEvalErr
      setEvaluaciones(evaluaciones.filter(e => e.id !== evaluationToDelete.id))
      setResultados(resultados.filter(res => res.id_evaluacion !== evaluationToDelete.id_evaluacion))
      showSuccess(`Evaluación "${evaluationToDelete.titulo}" eliminada correctamente.`)
    } catch (error) { 
      showError("Error al eliminar la evaluación", ["No se pudo eliminar la evaluación", "Inténtalo de nuevo más tarde"])
    } finally {
      setDeleteModalVisible(false); setEvaluationToDelete(null)
    }
  }

  const confirmDeletePregunta = (pregunta) => { setPreguntaToDelete(pregunta); setDeletePreguntaModalVisible(true) }

  const handleDeletePregunta = async () => {
    if (!preguntaToDelete) return
    try {
      const idToDelete = preguntaToDelete.id || preguntaToDelete.id_pregunta
      const { error: delPregErr } = await supabase.from('preguntas').delete().eq('id', idToDelete)
      if (delPregErr) throw delPregErr
      const filtered = preguntas.filter(p => p.id !== preguntaToDelete.id && p.id_pregunta !== preguntaToDelete.id_pregunta)
      setPreguntas(filtered)
      setPuntosTotales(filtered.reduce((acc, curr) => acc + Number(curr.puntos), 0))
      showSuccess("Pregunta eliminada correctamente")
    } catch (error) { showError("Error al eliminar la pregunta") } 
    finally { setDeletePreguntaModalVisible(false); setPreguntaToDelete(null) }
  }

  const startListening = (idPregunta) => {
    if (!('webkitSpeechRecognition' in window)) {
      showError("Navegador no compatible", ["Tu navegador no soporta reconocimiento de voz", "Usa Google Chrome"])
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

  const speakText = (text) => {
    if (!text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US' 
    utterance.rate = 0.8 
    const voices = window.speechSynthesis.getVoices()
    const englishVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en-GB')
    if (englishVoice) { utterance.voice = englishVoice }
    window.speechSynthesis.speak(utterance)
  }

  const handleStartExam = async (ev) => {
    if (ev.fecha_disponible_hasta) {
      const fechaLimite = new Date(ev.fecha_disponible_hasta);
      const ahora = new Date();
      if (ahora > fechaLimite) {
        showError("Plazo vencido", ["El plazo para realizar esta evaluación ha vencido"])
        return;
      }
    }
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
      showError("Error de configuración", [`Esta evaluación tiene un error de configuración (Suma ${totalPuntos} puntos)`, "Contacte al docente"])
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

  const calculateExamScore = () => {
    let notaAcumulada = 0
    const details = { total: 20, obtained: 0, percentage: 0 }

    examQuestions.forEach(p => {
      let puntosGanados = 0
      const respuestaUser = studentAnswers[p.id_pregunta]
      
      if (p.tipo_pregunta === "opcion_multiple") {
        const opciones = examOptions.filter(o => o.id_pregunta === p.id_pregunta)
        const correcta = opciones.find(o => o.es_correcta)
        if (correcta && String(respuestaUser) === String(correcta.id_opcion)) puntosGanados = Number(p.puntos)
      } 
      else {
        const textoCorrecto = p.respuesta_correcta_texto || "";
        const textoUsuario = respuestaUser || "";

        if (p.tipo_pregunta === "reconocimiento_voz") {
            if (isSpeechCorrect(textoUsuario, textoCorrecto)) {
                puntosGanados = Number(p.puntos);
            }
        } else {
            if (textoUsuario.trim().toLowerCase() === textoCorrecto.trim().toLowerCase()) {
                puntosGanados = Number(p.puntos);
            }
        }
      }
      notaAcumulada += puntosGanados
    })

    details.obtained = notaAcumulada
    details.percentage = (notaAcumulada / 20) * 100
    return { notaAcumulada, details }
  }

  const confirmSubmitExam = () => {
    const preguntasSinResponder = examQuestions.filter(p => !studentAnswers[p.id_pregunta])
    if (preguntasSinResponder.length > 0) {
      setAlertMessage({ message: "Preguntas sin responder", issues: [`Tienes ${preguntasSinResponder.length} sin responder`], type: 'warning' })
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
      setExamResult({ nota: notaAcumulada, aprobado: notaAcumulada >= 10, fecha: new Date().toLocaleString() })
      setExamModalVisible(false)
      setExamResultModalVisible(true)
    } catch (error) { showError("Error al enviar el examen") }
    setSubmittingExam(false)
  }

  const closeExamResultModal = () => { setExamResultModalVisible(false); setExamModalVisible(false); fetchData() }

  const handleManageQuestions = async (ev) => {
    setCurrentEvaluation(ev)
    // Limpiamos alertas previas al abrir el modal
    setAlertMessage(null)
    try {
      const { data, error } = await supabase.from('preguntas').select('*').eq('id_evaluacion', ev.id_evaluacion)
      if (error) throw error
      const mapped = (data || []).map(d => ({ ...d, id_pregunta: d.id }))
      setPreguntas(mapped)
      setPuntosTotales(mapped.reduce((acc, curr) => acc + Number(curr.puntos), 0))
      setPreguntasVisible(true)
    } catch (error) { showError("Error al cargar las preguntas") }
  }

  const handleSavePregunta = async (e) => {
    e.preventDefault()
    const puntosNuevos = Number(preguntaForm.puntos)
    if (puntosTotales + puntosNuevos > 20) {
      showError("Límite de puntos excedido", [`Excedería los 20 puntos`])
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
    } catch (error) { showError("Error al guardar la pregunta") }
  }

  const handleSaveEvaluation = async (e) => {
    e.preventDefault()
    setFormErrors({})
    const parsed = evaluationSchema.safeParse({ titulo: formData.titulo, descripcion: formData.descripcion })
    if (!parsed.success) {
      const errors = {}; parsed.error.issues.forEach((i) => { errors[i.path[0]] = i.message }); setFormErrors(errors); return
    }
    if (!formData.fecha_disponible_hasta) { showError("Faltan datos", ["La fecha límite es obligatoria"]); return }
    try {
      let gradoAutomatico = currentUser.id_grado;
      if (!gradoAutomatico && currentUser.id_role === 3) { showError("Error de permisos", ["No tienes un grado asignado."]); return }
      const payload = { 
          ...formData, id_docente: currentUser.id || currentUser.id_usuario, id_grado: Number(gradoAutomatico) 
      }
      const { data: insEval, error: insEvalErr } = await supabase.from('evaluaciones').insert([payload]).select()
      if (insEvalErr) throw insEvalErr
      setFormErrors({}); showSuccess(`Evaluación creada correctamente`); fetchData(); setVisible(false)
      setFormData({ titulo: "", descripcion: "", tipo_habilidad: "mixed", duracion_minutos: 20, fecha_disponible_hasta: "", activa: true, id_contenido: "" })
    } catch (error) { showError("Error al crear la evaluación") }
  }

  if (loading) return <div className="text-center p-5"><CSpinner color="primary" /></div>

  // --- VISTA DOCENTE / ADMIN ---
  if (currentUser && (currentUser.id_role === 1 || currentUser.id_role === 3)) {
    const resultadosFiltrados = resultados.filter(res => 
      evaluaciones.some(evalItem => evalItem.id_evaluacion === res.id_evaluacion)
    )

    return (
      <div className="p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="text-white">Panel Docente - Grado {currentUser.id_grado}</h3>
        </div>
        {/* Alerta Global para el panel principal */}
        {alertMessage && !visible && !preguntasVisible && <AlertMessage response={alertMessage} type={alertMessage.type || 'danger'} onClose={closeAlert} />}
        
        <CNav variant="tabs" className="mb-3">
          <CNavItem><CNavLink active={activeTab === 1} onClick={() => setActiveTab(1)} style={{cursor: 'pointer'}}>Gestión de Exámenes</CNavLink></CNavItem>
        </CNav>
        <CTabContent>
          <CTabPane visible={activeTab === 1}>
            <CButton color="primary" onClick={() => setVisible(true)} className="mb-3"><CIcon icon={cilPlus} /> Nueva Evaluación</CButton>
            <CTable hover bordered align="middle">
              <CTableHead color="light">
                <CTableRow><CTableHeaderCell>Título / Descripción</CTableHeaderCell><CTableHeaderCell>Habilitado Hasta</CTableHeaderCell><CTableHeaderCell>Acciones</CTableHeaderCell></CTableRow>
              </CTableHead>
              <CTableBody>
                {evaluaciones.map(ev => (
                  <CTableRow key={ev.id_evaluacion}>
                    <CTableDataCell><strong>{ev.titulo}</strong><div className="small text-muted">{ev.descripcion}</div></CTableDataCell>
                    <CTableDataCell>{ev.fecha_disponible_hasta ? new Date(ev.fecha_disponible_hasta).toLocaleString() : 'Sin límite'}</CTableDataCell>
                    <CTableDataCell>
                        <div className="d-flex gap-2">
                            <CButton color="success" size="sm" className="text-white" title="Descargar Notas PDF" onClick={() => handleDownloadSingleReport(ev)}><CIcon icon={cilCloudDownload} /></CButton>
                            <CButton color="warning" size="sm" onClick={() => handleManageQuestions(ev)} title="Gestionar Preguntas"><CIcon icon={cilList} /></CButton>
                            <CButton color="danger" size="sm" onClick={() => confirmDeleteEvaluation(ev)} title="Eliminar"><CIcon icon={cilTrash} /></CButton>
                        </div>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </CTabPane>
          <CTabPane visible={activeTab === 2}>
            <CCard>
              <CCardHeader>Notas y Desempeño (General)</CCardHeader>
              <CCardBody>
                {resultadosFiltrados.length === 0 ? <div className="text-center py-4"><p className="text-muted">No hay resultados disponibles.</p></div> : 
                  <CTable hover responsive>
                    <CTableHead><CTableRow><CTableHeaderCell>Estudiante</CTableHeaderCell><CTableHeaderCell>Evaluación</CTableHeaderCell><CTableHeaderCell>Fecha</CTableHeaderCell><CTableHeaderCell>Calificación</CTableHeaderCell></CTableRow></CTableHead>
                    <CTableBody>
                      {resultadosFiltrados.map(res => {
                        const user = usuarios.find(u => u.id_usuario === res.id_estudiante || u.id === res.id_estudiante)
                        const evalItem = evaluaciones.find(e => e.id_evaluacion === res.id_evaluacion)
                        return (
                          <CTableRow key={res.id}>
                            <CTableDataCell>{user ? `${user.nombre} ${user.apellido}` : 'ID: ' + res.id_estudiante}</CTableDataCell>
                            <CTableDataCell>{evalItem?.titulo || 'N/A'}</CTableDataCell>
                            <CTableDataCell>{new Date(res.fecha_completado).toLocaleDateString()}</CTableDataCell>
                            <CTableDataCell><CBadge color={res.nota_final >= 10 ? 'success' : 'danger'}>{res.nota_final} / 20</CBadge></CTableDataCell>
                          </CTableRow>
                        )
                      })}
                    </CTableBody>
                  </CTable>
                }
              </CCardBody>
            </CCard>
          </CTabPane>
        </CTabContent>

        <CModal visible={visible} backdrop="static" onClose={() => setVisible(false)}>
          <CModalHeader closeButton={false}>Nueva Evaluación</CModalHeader>
          <CForm onSubmit={handleSaveEvaluation}>
            <CModalBody>
              <div className="mb-3"><CFormLabel>Título</CFormLabel><CFormInput name="titulo" required value={formData.titulo} onChange={handleFormChange} /></div>
              <div className="mb-3"><CFormLabel>Descripción</CFormLabel><CFormTextarea name="descripcion" value={formData.descripcion} onChange={handleFormChange} rows={3} /></div>
              <div className="mb-3"><CFormLabel>Contenido</CFormLabel><CFormSelect value={formData.id_contenido} onChange={e => setFormData({...formData, id_contenido: e.target.value})}>
                  <option value="">Selecciona...</option>{contenidos.map(c => <option key={c.id_contenido} value={c.id_contenido}>{c.titulo}</option>)}</CFormSelect></div>
              <div className="mb-3"><CFormLabel>Fecha Límite</CFormLabel><CFormInput type="datetime-local" required min={new Date().toISOString().slice(0, 16)} value={formData.fecha_disponible_hasta} onChange={e => setFormData({...formData, fecha_disponible_hasta: e.target.value})} /></div>
            </CModalBody>
            <CModalFooter><CButton color="secondary" onClick={() => setVisible(false)}>Cancelar</CButton><CButton type="submit" color="primary">Guardar</CButton></CModalFooter>
          </CForm>
        </CModal>

        {/* Modal Preguntas CON ALERTA INTERNA */}
        <CModal visible={preguntasVisible} size="xl" onClose={() => setPreguntasVisible(false)}>
          <CModalHeader><CModalTitle>Preguntas ({puntosTotales} / 20)</CModalTitle></CModalHeader>
          <CModalBody>
            {/* AQUÍ ESTÁ LA SOLUCIÓN AL PROBLEMA 1 */}
            {alertMessage && <AlertMessage response={alertMessage} type={alertMessage.type || 'danger'} onClose={closeAlert} />}
            
            <CRow>
              <CCol md={7}>
                {preguntas.map((p, i) => (
                  <CCard key={i} className="mb-2"><CCardBody className="d-flex justify-content-between">
                      <div><strong>{i+1}. ({p.tipo_pregunta})</strong>: {p.enunciado}</div>
                      <div><CBadge color="info" className="me-2">{p.puntos} pts</CBadge><CButton color="danger" size="sm" onClick={() => confirmDeletePregunta(p)}><CIcon icon={cilTrash}/></CButton></div>
                  </CCardBody></CCard>
                ))}
              </CCol>
              <CCol md={5}>
                <CCard><CCardHeader>Nueva Pregunta</CCardHeader><CCardBody>
                    <CForm onSubmit={handleSavePregunta}>
                      <CFormInput className="mb-2" value={preguntaForm.enunciado} onChange={e => setPreguntaForm({...preguntaForm, enunciado: e.target.value})} required placeholder="Enunciado" />
                      <CFormSelect className="mb-2" value={preguntaForm.tipo_pregunta} onChange={e => setPreguntaForm({...preguntaForm, tipo_pregunta: e.target.value})}>
                          <option value="opcion_multiple">Opción Múltiple</option><option value="completacion">Completación</option><option value="reconocimiento_voz">Voz</option><option value="lectura">Lectura</option>
                      </CFormSelect>
                      <CFormInput type="number" className="mb-2" max={20 - puntosTotales} value={preguntaForm.puntos} onChange={e => setPreguntaForm({...preguntaForm, puntos: e.target.value})} required placeholder="Puntos" />
                      {preguntaForm.tipo_pregunta === "opcion_multiple" ? (
                        <div className="mb-2"><CFormLabel>Opciones</CFormLabel>{preguntaForm.opciones.map((op, idx) => (
                            <div key={idx} className="d-flex mb-1"><CFormInput size="sm" value={op} onChange={e => { const newOps = [...preguntaForm.opciones]; newOps[idx] = e.target.value; setPreguntaForm({...preguntaForm, opciones: newOps}) }} placeholder={`Opción ${idx+1}`} /><CFormCheck type="radio" name="corr" checked={preguntaForm.respuesta_correcta === idx} onChange={() => setPreguntaForm({...preguntaForm, respuesta_correcta: idx})} className="ms-2"/></div>
                          ))}</div>
                      ) : (
                        <CFormInput className="mb-2" value={preguntaForm.respuesta_correcta_texto} onChange={e => setPreguntaForm({...preguntaForm, respuesta_correcta_texto: e.target.value})} required placeholder="Respuesta Correcta" />
                      )}
                      <CButton type="submit" color="success" className="w-100 text-white" disabled={puntosTotales >= 20}>Agregar</CButton>
                    </CForm>
                  </CCardBody></CCard>
              </CCol>
            </CRow>
          </CModalBody>
        </CModal>
        {/* Modales Delete */}
        <CModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)}><CModalHeader>Confirmar</CModalHeader><CModalBody>Eliminar evaluación?</CModalBody><CModalFooter><CButton color="secondary" onClick={() => setDeleteModalVisible(false)}>Cancelar</CButton><CButton color="danger" onClick={handleDeleteEvaluation}>Eliminar</CButton></CModalFooter></CModal>
        <CModal visible={deletePreguntaModalVisible} onClose={() => setDeletePreguntaModalVisible(false)}><CModalHeader>Confirmar</CModalHeader><CModalBody>Eliminar pregunta?</CModalBody><CModalFooter><CButton color="secondary" onClick={() => setDeletePreguntaModalVisible(false)}>Cancelar</CButton><CButton color="danger" onClick={handleDeletePregunta}>Eliminar</CButton></CModalFooter></CModal>
      </div>
    )
  }

  // --- VISTA ESTUDIANTE ---
  return (
    <div className="p-3">
      <h3>Mis Evaluaciones</h3>
      {alertMessage && <AlertMessage response={alertMessage} type={alertMessage.type || 'danger'} onClose={closeAlert} />}
      
      {evaluaciones.length === 0 ? <div className="alert alert-info">No hay evaluaciones disponibles.</div> :
      <CRow>
        {evaluaciones.filter(e => e.activa).map(ev => {
          const resultado = resultados.find(res => (res.id_estudiante === currentUser.id_usuario || res.id_estudiante === currentUser.id) && res.id_evaluacion === ev.id_evaluacion)
          const yaPresento = !!resultado;
          const esVencida = ev.fecha_disponible_hasta && new Date() > new Date(ev.fecha_disponible_hasta);

          return (
            <CCol md={4} key={ev.id_evaluacion}>
              <CCard className="mb-3 shadow-sm">
                <CCardBody>
                  <h5>{ev.titulo}</h5>
                  <p className="text-muted small">{ev.descripcion}</p>
                  {ev.fecha_disponible_hasta && <div className="mb-2 small"><strong>Límite:</strong> {new Date(ev.fecha_disponible_hasta).toLocaleString()}</div>}
                  
                  {yaPresento ? (
                    <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded">
                        <span className="text-success fw-bold"><CIcon icon={cilCheckCircle} className="me-1"/> Completada</span>
                        <CBadge color={resultado.nota_final >= 10 ? 'success' : 'danger'} shape="rounded-pill" className="fs-6">
                            Nota: {resultado.nota_final}/20
                        </CBadge>
                    </div>
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
      </CRow>}

      <CModal visible={examModalVisible} size="lg" backdrop="static">
        <CModalHeader>{activeExam?.titulo}</CModalHeader>
        <CModalBody>
          {examQuestions.map((p, idx) => (
            <CCard key={idx} className="mb-3 border-top-primary border-top-3">
              <CCardBody>
                <h5>{idx+1}. {p.enunciado} <CBadge color="secondary" className="float-end">{p.puntos} pts</CBadge></h5>
                {p.tipo_pregunta === "opcion_multiple" && (
                  <div className="mt-3">
                    {examOptions.filter(o => o.id_pregunta === p.id_pregunta).map(opt => (
                      <div key={opt.id_opcion} className="form-check">
                        <input className="form-check-input" type="radio" name={`p-${p.id_pregunta}`} onChange={() => handleAnswerChange(p.id_pregunta, opt.id_opcion)} />
                        <label className="form-check-label">{opt.texto_opcion}</label>
                      </div>
                    ))}
                  </div>
                )}
                {(p.tipo_pregunta === "completacion" || p.tipo_pregunta === "lectura") && <CFormInput className="mt-2" placeholder="Respuesta..." onChange={e => handleAnswerChange(p.id_pregunta, e.target.value)} />}
                {p.tipo_pregunta === "reconocimiento_voz" && (
                  <div className="mt-2 text-center">
                    <CButton color="warning" variant="outline" className="rounded-pill px-4 mb-3" onClick={() => speakText(p.respuesta_correcta_texto)}><CIcon icon={cilVolumeHigh}/> Escuchar</CButton><br/>
                    <CButton color={isListening ? "danger" : "info"} className="text-white rounded-pill" onClick={() => startListening(p.id_pregunta)}><CIcon icon={cilMicrophone}/> Hablar</CButton>
                    <div className="mt-2 p-2 bg-light border rounded"><strong>Tu voz: </strong> {studentAnswers[p.id_pregunta] || "..."}</div>
                  </div>
                )}
              </CCardBody>
            </CCard>
          ))}
        </CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setExamModalVisible(false)}>Cancelar</CButton><CButton color="success" className="text-white" onClick={confirmSubmitExam}>{submittingExam ? "Enviando..." : "Entregar"}</CButton></CModalFooter>
      </CModal>

      <CModal visible={submitConfirmModalVisible} onClose={() => setSubmitConfirmModalVisible(false)}>
        <CModalHeader>Confirmar Entrega</CModalHeader><CModalBody>¿Estás seguro?</CModalBody>
        <CModalFooter><CButton color="secondary" onClick={() => setSubmitConfirmModalVisible(false)}>Volver</CButton><CButton color="success" className="text-white" onClick={submitExam}>Sí, Entregar</CButton></CModalFooter>
      </CModal>

      <CModal visible={examResultModalVisible} onClose={closeExamResultModal}>
        <CModalHeader><div className="text-center w-100"><CIcon icon={examResult?.aprobado ? cilCheckCircle : cilLockLocked} size="xxl" className={examResult?.aprobado ? "text-success" : "text-danger"} /></div></CModalHeader>
        <CModalBody className="text-center">
          <h4>{examResult?.aprobado ? '¡Felicidades!' : 'Necesitas mejorar'}</h4>
          <h1 className={`display-4 ${examResult?.aprobado ? 'text-success' : 'text-danger'}`}>{examResult?.nota || 0}/20</h1>
          <p>{examResult?.aprobado ? 'Aprobado' : 'No Aprobado'}</p>
        </CModalBody>
        <CModalFooter className="justify-content-center"><CButton color="primary" onClick={closeExamResultModal}>Cerrar</CButton></CModalFooter>
      </CModal>
    </div>
  )
}

export default Evaluations
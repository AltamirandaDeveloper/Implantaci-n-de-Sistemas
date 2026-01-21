import React, { useState, useEffect } from 'react';
import { 
  CCard, CCardBody, CCardHeader, CCol, CRow, CTable, 
  CTableBody, CTableHead, CTableHeaderCell, CTableRow, 
  CTableDataCell, CSpinner
} from '@coreui/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';

// 1. Importamos el cliente de Supabase
import { supabase } from '../../lib/supabase'; 

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    totalDocentes: 0,
    totalContenidos: 0,
    promedioNotas: 0,
    usuariosRecientes: [],
    distribucionRoles: [],
    datosGraficoNotas: []
  });

  const [loading, setLoading] = useState(true);
  const COLORS = ['#321fdb', '#3399ff', '#f9b115'];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 2. Ejecutamos consultas en paralelo a Supabase
      const [usersRes, contenidosRes, resultadosRes, evalRes] = await Promise.all([
        supabase.from('usuarios').select('*'),
        supabase.from('contenidos').select('id'),
        supabase.from('resultados_evaluaciones').select('*').order('id', { ascending: false }).limit(5),
        supabase.from('evaluaciones').select('id, titulo'),
      ])

      if (usersRes.error) throw usersRes.error
      if (contenidosRes.error) throw contenidosRes.error
      if (resultadosRes.error) throw resultadosRes.error
      if (evalRes.error) throw evalRes.error

      const users = usersRes.data || []
      const contenidos = contenidosRes.data || []
      const resultados = resultadosRes.data || []
      const evaluaciones = evalRes.data || []

      // 3. Cálculos de KPIs
      const estudiantes = users.filter(u => Number(u.id_role) === 2)
      const docentes = users.filter(u => Number(u.id_role) === 3)
      const admins = users.filter(u => Number(u.id_role) === 1)

      // Cálculo de promedio desde Supabase (usamos todos los resultados para el promedio global)
      const { data: allNotas, error: notasErr } = await supabase.from('resultados_evaluaciones').select('nota_final')
      if (notasErr) throw notasErr
      const sumaNotas = allNotas?.reduce((acc, curr) => acc + parseFloat(curr.nota_final || 0), 0) || 0
      const promedio = allNotas?.length > 0 ? (sumaNotas / allNotas.length).toFixed(1) : '0.0'

      // 4. Formatear datos para Gráfico de Barras (Rendimiento) — combinar resultados con usuarios y evaluaciones
      const chartData = resultados.map(res => {
        const user = users.find(u => (u.id === res.id_estudiante) || (u.id_usuario && u.id_usuario === res.id_estudiante))
        const ev = evaluaciones.find(e => e.id === res.id_evaluacion)
        return {
          name: user ? `${user.nombre || 'N/A'}` : 'N/A',
          examen: ev ? ev.titulo : 'Evaluación',
          nota: parseFloat(res.nota_final) || 0,
        }
      })

      // 5. Formatear datos para Gráfico Circular (Roles)
      const roleData = [
        { name: 'Estudiantes', value: estudiantes.length },
        { name: 'Docentes', value: docentes.length },
        { name: 'Admins', value: admins.length },
      ]

      // Usuarios recientes (ordenados por fecha_registro si existe)
      const recientes = [...users].sort((a,b) => new Date(b.fecha_registro || 0) - new Date(a.fecha_registro || 0)).slice(0,5)

      setStats({
        totalEstudiantes: estudiantes.length,
        totalDocentes: docentes.length,
        totalContenidos: contenidos.length || 0,
        promedioNotas: promedio,
        usuariosRecientes: recientes,
        distribucionRoles: roleData,
        datosGraficoNotas: chartData,
      })

    } catch (error) {
      console.error("Error cargando datos de Supabase:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
        <CSpinner color="primary" variant="grow" />
      </div>
    );
  }

  return (
    <div className="p-3">
      <h2 className="mb-4 text-primary text-white fw-bold">Dashboard Educativo</h2>

      {/* Tarjetas de Estadísticas */}
      <CRow className="mb-4">
        <CCol xs={12} sm={6} lg={3}>
          <CCard className="mb-3 border-top-primary border-top-3 shadow-sm">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-medium-emphasis small">Estudiantes</div>
                  <div className="fs-4 fw-semibold">{stats.totalEstudiantes}</div>
                </div>
                <Users className="text-primary" size={24} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
        
        <CCol xs={12} sm={6} lg={3}>
          <CCard className="mb-3 border-top-info border-top-3 shadow-sm">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-medium-emphasis small">Docentes</div>
                  <div className="fs-4 fw-semibold">{stats.totalDocentes}</div>
                </div>
                <GraduationCap className="text-info" size={24} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} sm={6} lg={3}>
          <CCard className="mb-3 border-top-warning border-top-3 shadow-sm">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-medium-emphasis small">Contenidos</div>
                  <div className="fs-4 fw-semibold">{stats.totalContenidos}</div>
                </div>
                <BookOpen className="text-warning" size={24} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} sm={6} lg={3}>
          <CCard className="mb-3 border-top-danger border-top-3 shadow-sm">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <div className="text-medium-emphasis small">Promedio Global</div>
                  <div className="fs-4 fw-semibold">{stats.promedioNotas}</div>
                </div>
                <TrendingUp className="text-danger" size={24} />
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Gráficos */}
      <CRow className="mb-4">
        <CCol xs={12} lg={8}>
          <CCard className="mb-4 shadow-sm h-100">
            <CCardHeader className="bg-white fw-bold">Rendimiento de Últimas Evaluaciones</CCardHeader>
            <CCardBody>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.datosGraficoNotas}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="nota" fill="#321fdb" name="Nota" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={4}>
          <CCard className="mb-4 shadow-sm h-100">
            <CCardHeader className="bg-white fw-bold">Distribución de Roles</CCardHeader>
            <CCardBody className="d-flex align-items-center justify-content-center">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={stats.distribucionRoles}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={80}
                      fill="#8884d8" paddingAngle={5} dataKey="value"
                    >
                      {stats.distribucionRoles.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Tabla Recientes */}
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4 shadow-sm">
            <CCardHeader className="bg-white fw-bold">Usuarios Registrados Recientemente</CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Nombre Completo</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Cédula</CTableHeaderCell>
                    <CTableHeaderCell className="text-center">Rol</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {stats.usuariosRecientes.map((user, index) => (
                    <CTableRow key={user.id_usuario || index}>
                      <CTableDataCell>
                        <div className="fw-bold">{user.nombre} {user.apellido}</div>
                      </CTableDataCell>
                      <CTableDataCell>{user.email}</CTableDataCell>
                      <CTableDataCell>{user.cedula || 'N/A'}</CTableDataCell>
                      <CTableDataCell className="text-center">
                        <span className={`badge ${user.id_role === 1 ? 'bg-danger' : user.id_role === 3 ? 'bg-info' : 'bg-primary'}`}>
                          {user.id_role === 1 ? 'Admin' : user.id_role === 3 ? 'Docente' : 'Estudiante'}
                        </span>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
};

export default Dashboard;
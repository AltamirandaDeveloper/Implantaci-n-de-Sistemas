import React, { useState, useEffect } from 'react';
import { 
  CCard, 
  CCardBody, 
  CCardHeader, 
  CCol, 
  CRow, 
  CTable, 
  CTableBody, 
  CTableHead, 
  CTableHeaderCell, 
  CTableRow, 
  CTableDataCell,
  CWidgetStatsF, // Widget para estadísticas si lo tienes, sino usaremos Cards normales
  CSpinner
} from '@coreui/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react';

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
  const COLORS = ['#321fdb', '#3399ff', '#f9b115']; // Colores típicos de CoreUI

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, rolesRes, contenidosRes, resultadosRes, evaluacionesRes] = await Promise.all([
          fetch('http://localhost:3001/usuarios'),
          fetch('http://localhost:3001/roles'),
          fetch('http://localhost:3001/contenidos'),
          fetch('http://localhost:3001/resultados_evaluaciones'),
          fetch('http://localhost:3001/evaluaciones')
        ]);

        const users = await usersRes.json();
        const contenidos = await contenidosRes.json();
        const resultados = await resultadosRes.json();
        const evaluaciones = await evaluacionesRes.json();

        // 1. Cálculos
        const estudiantes = users.filter(u => u.id_role === 2);
        const docentes = users.filter(u => u.id_role === 3);
        const admins = users.filter(u => u.id_role === 1);

        const sumaNotas = resultados.reduce((acc, curr) => acc + parseFloat(curr.nota_final || 0), 0);
        const promedio = resultados.length > 0 ? (sumaNotas / resultados.length).toFixed(1) : 'N/A';

        // 2. Datos para Gráficos
        const roleData = [
          { name: 'Estudiantes', value: estudiantes.length },
          { name: 'Docentes', value: docentes.length },
          { name: 'Admins', value: admins.length },
        ];

        // 3. Gráfico de Notas (Últimos 5 resultados)
        const chartData = resultados.slice(0, 5).map(res => {
          const evaluacion = evaluaciones.find(ev => ev.id_evaluacion === res.id_evaluacion) || { titulo: 'Examen' };
          const estudiante = users.find(u => String(u.id_usuario) === String(res.id_estudiante) || String(u.id) === String(res.id_estudiante)) || { nombre: 'N/A', apellido: '' };
          return {
            name: `${estudiante.nombre || 'N/A'} ${estudiante.apellido || ''}`.trim(),
            examen: evaluacion.titulo,
            nota: parseFloat(res.nota_final) || 0
          };
        });

        const recientes = [...users].reverse().slice(0, 5);

        setStats({
          totalEstudiantes: estudiantes.length,
          totalDocentes: docentes.length,
          totalContenidos: contenidos.length,
          promedioNotas: promedio,
          usuariosRecientes: recientes,
          distribucionRoles: roleData,
          datosGraficoNotas: chartData
        });
        setLoading(false);

      } catch (error) {
        console.error("Error cargando datos:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <CSpinner color="primary" />
      </div>
    );
  }

  return (
    <div className="p-3">
      <h2 className="mb-4 text-primary">Panel de Control Educativo</h2>

      {/* Tarjetas de Estadísticas (KPIs) */}
      <CRow className="mb-4">
        <CCol xs={12} sm={6} lg={3}>
          <CCard className="mb-3 border-top-primary border-top-3">
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
          <CCard className="mb-3 border-top-info border-top-3">
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
          <CCard className="mb-3 border-top-warning border-top-3">
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
          <CCard className="mb-3 border-top-danger border-top-3">
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
        {/* Gráfico de Barras */}
        <CCol xs={12} lg={8}>
          <CCard className="mb-4 h-100">
            <CCardHeader>Rendimiento Reciente</CCardHeader>
            <CCardBody>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={stats.datosGraficoNotas}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="nota" fill="#321fdb" name="Nota Final" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        {/* Gráfico Circular */}
        <CCol xs={12} lg={4}>
          <CCard className="mb-4 h-100">
            <CCardHeader>Distribución de Roles</CCardHeader>
            <CCardBody className="d-flex align-items-center justify-content-center">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={stats.distribucionRoles}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
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

      {/* Tabla de Usuarios Recientes */}
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
            <CCardHeader>Usuarios Registrados Recientemente</CCardHeader>
            <CCardBody>
              <CTable align="middle" className="mb-0 border" hover responsive>
                <CTableHead color="light">
                  <CTableRow>
                    <CTableHeaderCell>Nombre</CTableHeaderCell>
                    <CTableHeaderCell>Email</CTableHeaderCell>
                    <CTableHeaderCell>Cédula</CTableHeaderCell>
                    <CTableHeaderCell>Fecha Registro</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {stats.usuariosRecientes.map((user, index) => (
                    <CTableRow key={user.id || user.id_usuario || index}>
                      <CTableDataCell>
                        <div className="fw-bold">{user.nombre} {user.apellido}</div>
                      </CTableDataCell>
                      <CTableDataCell>{user.email}</CTableDataCell>
                      <CTableDataCell>{user.cedula}</CTableDataCell>
                      <CTableDataCell>
                        {user.fecha_registro ? new Date(user.fecha_registro).toLocaleDateString() : '-'}
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
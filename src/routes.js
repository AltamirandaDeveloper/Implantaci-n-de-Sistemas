import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Users = React.lazy(() => import('./views/users/users'))
const Profile = React.lazy(() => import('./views/profile/profile'))
const Evaluations = React.lazy(() => import('./views/evaluations/evaluations'))
const Activities = React.lazy(() => import('./views/activities/activities'))
const Content = React.lazy(() => import('./views/content/content'))

const routes = [
  { path: '/', exact: true, name: 'Home' },
  // AGREGAMOS allowedRoles AQUÍ (1: Admin, 3: Teacher)
  { path: '/dashboard', name: 'Dashboard', element: Dashboard, allowedRoles: [1, 3] },
  { path: '/users', name: 'Usuarios', element: Users, allowedRoles: [1, 3] },
  { path: '/profile', name: 'Perfil', element: Profile },
  { path: '/evaluations', name: 'Evaluations', element: Evaluations },
  { path: '/activities', name: 'Actividades', element: Activities },
  { path: '/content', name: 'Contenido', element: Content },
]

export default routes
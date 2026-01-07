import React from 'react'

const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'))
const Colors = React.lazy(() => import('./views/theme/colors/Colors'))
const Users = React.lazy(() => import('./views/users/users'))
const Profile = React.lazy(() => import('./views/profile/profile'))
const Evaluations = React.lazy(() => import('./views/evaluations/evaluations'))
const Activities = React.lazy(() => import('./views/activities/activities'))
const Content = React.lazy(() => import('./views/content/content'))


const routes = [
  { path: '/', exact: true, name: 'Home' },
  { path: '/dashboard', name: 'Dashboard', element: Dashboard },
  { path: '/theme', name: 'Theme', element: Colors, exact: true },
  { path: '/theme/colors', name: 'Colors', element: Colors },
  { path: '/users', name: 'Users', element: Users, allowedRoles: [1, 3] },
  { path: '/profile', name: 'Profile', element: Profile },
  { path: '/evaluations', name: 'Evaluations', element: Evaluations },
  { path: '/activities', name: 'Activities', element: Activities },
  { path: '/content', name: 'Content', element: Content },
]

export default routes

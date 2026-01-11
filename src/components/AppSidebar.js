import React from 'react'
import { useSelector, useDispatch } from 'react-redux'

import {
  CCloseButton,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarToggler,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'

import { AppSidebarNav } from './AppSidebarNav'

import logoImg from 'src/assets/logo.png'

// sidebar nav config
import navigation from '../_nav'

const AppSidebar = () => {
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)

  return (
    <CSidebar
      className="border-end"
      colorScheme="dark"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
    >
      <CSidebarHeader className="border-bottom py-0" style={{height: 200, padding: 0, overflow: 'hidden'}}>
        <CSidebarBrand to="/" style={{position: 'relative', height: '98%', padding: 0, width: '100%', display: 'block'}}>
          <img src={logoImg} alt="Logo" style={{position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block'}} />
          <CCloseButton
            className="d-lg-none"
            dark
            onClick={() => dispatch({ type: 'set', sidebarShow: false })}
            style={{position: 'absolute', top: 8, right: 8, zIndex: 2}}
          />
        </CSidebarBrand>
      </CSidebarHeader>

      {(() => {
        let userRole = null
        try {
          const stored = sessionStorage.getItem('user')
          if (stored) {
            const parsed = JSON.parse(stored)
            userRole = Number(parsed.id_role ?? parsed.role ?? parsed.role_id ?? parsed.idRole)
          }
        } catch (e) {
          userRole = null
        }

        const filtered = navigation.filter(item => {
          const isAdminOrTeacher = userRole === 1 || userRole === 3

          if (item.to === '/users' || item.to === '/dashboard') {
            return isAdminOrTeacher
          }
          
          return true
        })

        return <AppSidebarNav items={filtered} />
      })()}
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
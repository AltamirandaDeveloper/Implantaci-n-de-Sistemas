import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { AppContent, AppSidebar, AppFooter, AppHeader } from "../components/index"

const DefaultLayout = () => {
  const navigate = useNavigate()

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('token')
    const user = localStorage.getItem('user')
    
    if (!token || !user) {
      navigate("/login")
    }
  }, [navigate])

  return (
    <div>
      <AppSidebar />
      <div className="wrapper d-flex flex-column min-vh-100">
        <AppHeader />
        <div className="body flex-grow-1">
          <AppContent />
        </div>
        <AppFooter />
      </div>
    </div>
  )
}

export default DefaultLayout
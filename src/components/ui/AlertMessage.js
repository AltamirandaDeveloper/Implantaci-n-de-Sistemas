import { CAlert } from '@coreui/react'
import { useEffect } from 'react'

const AlertMessage = ({ response, type = 'danger', onClose }) => {
  if (!response) return null

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose, response])

  const renderContent = () => {
    if ('issues' in response) {
      if (response.issues.length === 1) {
        return <span>{response.issues[0]}</span>
      }
      return (
        <ul style={{ marginBottom: 0 }}>
          {response.issues.map((issue, idx) => (
            <li key={idx}>{issue}</li>
          ))}
        </ul>
      )
    }

    if ('message' in response) {
      return response.message
    }

    return null
  }

  return (
    <CAlert color={type} onClose={onClose}>
      {renderContent()}
    </CAlert>
  )
}

export default AlertMessage
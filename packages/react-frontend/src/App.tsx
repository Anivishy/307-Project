import { Routes, Route } from 'react-router-dom'
import GroupPage from './pages/GroupPage'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<div style={{ padding: '2rem' }}>Home – Groups list coming soon</div>} />
      <Route path="/group/:groupId" element={<GroupPage />} />
    </Routes>
  )
}

export default App

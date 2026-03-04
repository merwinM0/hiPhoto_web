import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'
import Profile from './pages/Profile'
import RoomList from './pages/RoomList'
import RoomDetail from './pages/RoomDetail'
import PhotoDetail from './pages/PhotoDetail'

function App() {
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify" element={<VerifyEmail />} />
      
      {/* 需要认证的路由 */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/profile" element={<Profile />} />
          <Route path="/rooms" element={<RoomList />} />
          <Route path="/rooms/:roomId" element={<RoomDetail />} />
          <Route path="/photos/:photoId" element={<PhotoDetail />} />
        </Route>
      </Route>
      
      {/* 404 重定向 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App

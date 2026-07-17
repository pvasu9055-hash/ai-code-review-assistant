import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import Dashboard from './pages/Dashboard'
import NewReview from './pages/NewReview'
import Profile from './pages/Profile'
import History from './pages/History'
import ReviewDetail from './pages/ReviewDetail'
import Analytics from './pages/Analytics'
import UploadStandards from './pages/UploadStandards'
import RAGReview from './pages/RAGReview'
import DiffReview from './pages/DiffReview'
import MultiAgentReview from './pages/MultiAgentReview'
import GithubIntegration from './pages/GithubIntegration'
import DashboardLayout from './layouts/DashboardLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/new-review" element={<NewReview />} />
          <Route path="/diff-review" element={<DiffReview />} />
          <Route path="/multi-agent-review" element={<MultiAgentReview />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:reviewId" element={<ReviewDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/standards" element={<UploadStandards />} />
          <Route path="/rag-review" element={<RAGReview />} />
          <Route path="/github-integration" element={<GithubIntegration />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
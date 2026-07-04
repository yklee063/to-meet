import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ShareRoom from './pages/ShareRoom'
import CreateRoom from './pages/CreateRoom'
import Room from './pages/Room'
import Result from './pages/Result'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateRoom />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="/room/:code/result" element={<Result />} />
        <Route path="/share/:code" element={<ShareRoom />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
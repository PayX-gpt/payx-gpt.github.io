import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Funnel from './Funnel'
import Live from './pages/Live'
import { AuthGate } from './pages/live/AuthGate'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Funnel />} />
        <Route path="/live" element={<AuthGate><Live /></AuthGate>} />
      </Routes>
    </BrowserRouter>
  )
}

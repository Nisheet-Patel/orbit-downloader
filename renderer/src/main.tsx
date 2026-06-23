import ReactDOM from 'react-dom/client'
import { App } from './App'
import { PreloadGuard } from './components/layout/PreloadGuard'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <PreloadGuard>
    <App />
  </PreloadGuard>,
)

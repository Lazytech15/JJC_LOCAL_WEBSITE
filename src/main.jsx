import React, { Suspense, lazy } from "react"
import ReactDOM from "react-dom/client"
const App = lazy(() => import("./App.jsx"))
import "./index.css"

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('✅ SW registered:', reg.scope))
      .catch(err => console.error('❌ SW registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Suspense fallback={<div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Loading application...</div>}>
      <App />
    </Suspense>
  </React.StrictMode>,
)

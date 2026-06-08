import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught', error, info)
    this.setState({ error, info })
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{padding:20,fontFamily:'sans-serif'}}>
          <h2 style={{color:'#900'}}>Application error</h2>
          <div style={{whiteSpace:'pre-wrap',background:'#fff6f6',padding:12,borderRadius:6}}>
            {String(this.state.error && (this.state.error.message || this.state.error))}
            {this.state.info && this.state.info.componentStack && (
              <pre style={{marginTop:10}}>{this.state.info.componentStack}</pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

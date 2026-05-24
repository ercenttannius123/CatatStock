import React, { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, CartesianGrid, Bar, Legend } from 'recharts'
import AuthPage from './AuthPage'
Chart.register(...registerables)

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const pages = ['dashboard','stok','prediksi','restock','slowmoving','cashflow','input','umkm']

const trendChartLabels = {
  day: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
  week: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  year: ['2023', '2024', '2025', '2026']
}

export default function App(){
  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("isLoggedIn") === "true"
  )
  const [page, setPage] = useState('dashboard')
  const [authUser, setAuthUser] = useState(() => {
    try {
      const u = localStorage.getItem('authUser')
      return u ? JSON.parse(u) : null
    } catch (e) {
      return null
    }
  })
  const [umkmMode, setUmkmMode] = useState(false)
  const [toast, setToast] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [salesTab, setSalesTab] = useState('day')
  const [topProductsTab, setTopProductsTab] = useState('day')
  const trendRef = useRef(null)
  const roiRef = useRef(null)
  const trendChartRef = useRef(null)
  const roiChartRef = useRef(null)
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockProduct, setRestockProduct] = useState('')
  const [restockQuantity, setRestockQuantity] = useState(0)
  const [aiPrediction, setAiPrediction] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [prediksiKategori, setPrediksiKategori] = useState('')

  const cashflowData = {
    cashIn: 'Rp 8.200.000',
    cashOut: 'Rp 4.750.000',
    net: 'Rp 3.450.000'
  }
  

  useEffect(()=>{
    if (!isLoggedIn) { setProducts([]); return }
    let cancelled = false
    async function fetchProducts() {
      try {
        const res = await fetch(`${API_URL}/products`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        })
        if (!res.ok) {
          console.error('Failed loading products', res.status)
          return
        }
        const data = await res.json()
        if (cancelled) return
        const mapped = (Array.isArray(data) ? data : []).map(p => ({
          id: p.id ? `P${String(p.id).padStart(3,'0')}` : p.id,
          rawId: p.id,
          name: p.name,
          category: p.category || 'Lainnya',
          image: p.image_emoji || '',
          price: Math.round(p.price_buy) || 0,
          stock: p.stock || 0,
          value: (Math.round(p.price_buy) || 0) * (p.stock || 0)
        }))
        setProducts(mapped)
      } catch (e) {
        console.error('Error loading products', e)
      }
    }
    fetchProducts()
    return () => { cancelled = true }
  }, [isLoggedIn])

  // Derived dashboard metrics from products
  const totalProductsCount = products.length
  const criticalProducts = products.filter(p => typeof p.stock === 'number' && p.stock <= 10)
  const criticalCount = criticalProducts.length
  const slowMovingProducts = products.filter(p => typeof p.stock === 'number' && p.stock >= 50)
  const slowMovingCount = slowMovingProducts.length
  const totalStockValue = products.reduce((s, p) => s + ((p.price || p.price === 0 ? p.price : 0) * (p.stock || 0)), 0)
  const lowStockList = products.slice().sort((a,b)=> (a.stock||0) - (b.stock||0)).slice(0,3)

  // Derived dashboard/calculation values that depend on products/totalStockValue
  const umkmSummary = {
    lowStock: lowStockList.map(p=>p.name),
    slowMoving: products.filter(p=> (p.daysNotSold||0) > 30).map(p=>p.name)
  }

  const umkmWarnings = lowStockList.map(p=>`${p.name} akan habis dalam ${Math.max(1, Math.round((p.stock||0)/Math.max(1,5)))} hari`)

  const umkmRecommendations = lowStockList.map(p=>`Restock ${p.name} minimal ${Math.max(10, 50 - (p.stock||0))} unit`)

  const umkmCashflow = {
    cashIn: `Rp ${Math.round(totalStockValue * 0.4).toLocaleString()}`,
    cashOut: `Rp ${Math.round(totalStockValue * 0.3).toLocaleString()}`,
    profitToday: `Rp ${Math.round(totalStockValue * 0.1).toLocaleString()}`
  }

  // Top products by stock value
  const topProducts = products.slice().sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,4).map(p=>({
    name: p.name,
    profit: `Rp ${Math.round((p.value||0) * 0.2).toLocaleString()}`
  }))

  // category distribution (for profit/ROI charts)
  const categorySums = {}
  products.forEach(p=>{ const k = p.category || 'Lainnya'; categorySums[k] = (categorySums[k]||0) + (p.value||0) })
  const totalForCats = Object.values(categorySums).reduce((s,v)=>s+v,0) || 1
  const profitChart = Object.entries(categorySums).map(([name,val])=>({ name, percent: Math.round(val / totalForCats * 100) }))
  const roiData = profitChart

  const modalData = products.slice().sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,4).map(p=>({ name: p.name, value: `Rp ${Math.round(p.value||0).toLocaleString()}`, percent: Math.round(((p.value||0)/ (totalForCats||1)) * 100) }))

  const cashflowChart = [] // placeholder if needed later

  const salesData = { day: [], week: [], month: [], year: [] }

  const topProductsData = {
    day: topProducts.map(tp => ({ name: tp.name, value: Math.max(1, Math.round((products.find(p=>p.name===tp.name)?.value||0)/1000)) })),
    week: topProducts.map(tp => ({ name: tp.name, value: Math.max(1, Math.round((products.find(p=>p.name===tp.name)?.value||0)/1000) * 7) })),
    month: topProducts.map(tp => ({ name: tp.name, value: Math.max(1, Math.round((products.find(p=>p.name===tp.name)?.value||0)/1000) * 30) })),
    year: topProducts.map(tp => ({ name: tp.name, value: Math.max(1, Math.round((products.find(p=>p.name===tp.name)?.value||0)/1000) * 365) }))
  }

  const profitSummary = {
    totalProfit: `Rp ${Math.round(totalStockValue * 0.2).toLocaleString()}`,
    averageMargin: '20%'
  }

  useEffect(()=>{
    if (!toast) return
    const id = setTimeout(()=>setToast(''),2200)
    return ()=>clearTimeout(id)
  },[toast])

  function showToast(msg){ setToast(msg) }

  function handleUmkmToggle() {
    setUmkmMode(prev => {
      const newState = !prev
      if (newState) {
        setPage('umkm')
      } else {
        setPage('dashboard')
      }
      return newState
    })
  }

  function handleSignOut() {
    localStorage.removeItem("isLoggedIn")
    localStorage.removeItem('authUser')
    setIsLoggedIn(false)
    setAuthUser(null)
    setProducts([])
    setPage('dashboard')
    showToast('Berhasil keluar dari aplikasi')
  }

  function simulateScan(){ showToast('Barcode terdeteksi: 8993003800102') }

  function getFilteredProducts() {
    let filtered = products
    if (selectedCategory !== 'Semua') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }
    if (searchQuery) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }
    return filtered
  }

  function getStatus(stock) {
    if (stock <= 10) return { text: 'Kritis', class: 'bd' }
    if (stock <= 20) return { text: 'Menipis', class: 'bw' }
    return { text: 'Aman', class: 'bs' }
  }

  // Safe map helper: ensures we can call .map on possibly undefined values
  function safeMap(v) {
    if (!v) return []
    return Array.isArray(v) ? v : []
  }

  // Fetch products from backend and set state
  async function fetchProducts() {
    try {
      const res = await fetch(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      })
      if (!res.ok) {
        console.error('Failed loading products', res.status)
        return
      }
      const data = await res.json()
      const mapped = (Array.isArray(data) ? data : []).map(p => ({
        id: p.id ? `P${String(p.id).padStart(3,'0')}` : p.id,
        rawId: p.id,
        name: p.name,
        category: p.category || 'Lainnya',
        image: p.image_emoji || '',
        price: Math.round(p.price_buy) || 0,
        stock: p.stock || 0,
        value: (Math.round(p.price_buy) || 0) * (p.stock || 0)
      }))
      setProducts(mapped)
    } catch (e) {
      console.error('Error loading products', e)
    }
  }

  async function requestPrediction(kategori) {
    try {
      setAiError(null)
      setAiLoading(true)
      setAiPrediction(null)
      const body = { kategori: (kategori || prediksiKategori || 'BEVERAGES') }
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`${res.status} ${text}`)
      }
      const data = await res.json()
      setAiPrediction(data.prediksi)
      setAiLoading(false)
    } catch (e) {
      console.error('AI predict error', e)
      setAiError(e.message || String(e))
      setAiLoading(false)
    }
  }

  function addProduct(product) {
    ;(async ()=>{
      try {
        const body = {
          name: product.name,
          category: product.category,
          image_emoji: product.image,
          price_buy: product.price,
          stock: product.stock,
          product_code: product.product_code || null
        }
        const res = await fetch(`${API_URL}/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
          body: JSON.stringify(body)
        })
        if (res.ok) {
          await fetchProducts()
          showToast('Produk berhasil ditambahkan (server)')
        } else {
          // fallback to local add
          const newId = 'P' + String(products.length + 1).padStart(3, '0')
          const newProduct = { id: newId, ...product, value: product.price * product.stock }
          setProducts(prev => [...prev, newProduct])
          showToast('Produk ditambahkan secara lokal (server gagal)')
        }
      } catch (e) {
        console.error('Add product error', e)
        showToast('Gagal menambahkan produk')
      } finally {
        setShowAddModal(false)
      }
    })()
  }

  function editProduct(product) {
    ;(async ()=>{
      try {
        // try PUT to backend if rawId exists
        const rawId = product.rawId || null
        if (rawId) {
          const res = await fetch(`${API_URL}/products/${rawId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            body: JSON.stringify({ name: product.name, category: product.category, image_emoji: product.image, price_buy: product.price, stock: product.stock })
          })
          if (res.ok) {
            await fetchProducts()
            showToast('Produk berhasil diupdate (server)')
          } else {
            // fallback local
            const updated = products.map(p => p.id === product.id ? { ...product, value: product.price * product.stock } : p)
            setProducts(updated)
            showToast('Produk diupdate lokal (server tidak mendukung)')
          }
        } else {
          const updated = products.map(p => p.id === product.id ? { ...product, value: product.price * product.stock } : p)
          setProducts(updated)
          showToast('Produk diupdate lokal')
        }
      } catch (e) {
        console.error('Edit product error', e)
        showToast('Gagal update produk')
      } finally {
        setShowEditModal(false)
        setEditingProduct(null)
      }
    })()
  }

  function deleteProduct(product) {
    ;(async ()=>{
      try {
        if (!product) return
        const rawId = product.rawId || null
        if (rawId) {
          const res = await fetch(`${API_URL}/products/${rawId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
          })
          if (res.ok) {
            await fetchProducts()
            showToast('Produk dihapus (server)')
          } else {
            setProducts(prev => prev.filter(p => p.id !== product.id))
            showToast('Produk dihapus secara lokal (server gagal)')
          }
        } else {
          setProducts(prev => prev.filter(p => p.id !== product.id))
          showToast('Produk dihapus secara lokal')
        }
      } catch (e) {
        console.error('Delete product error', e)
        showToast('Gagal menghapus produk')
      } finally {
        setShowEditModal(false)
        setEditingProduct(null)
      }
    })()
  }

  function openEditModal(product) {
    setEditingProduct(product)
    setShowEditModal(true)
  }

  function getCriticalProducts() {
    return products.filter(p => p.stock <= 10)
  }

  function restockNow(product) {
    setRestockProduct(product.name)
    setRestockQuantity(Math.max(50 - product.stock, 10)) // suggest to bring to 50 or add 10
    setShowRestockModal(true)
  }

  function confirmRestock() {
    ;(async ()=>{
      try {
        const prod = products.find(p => p.name === restockProduct)
        if (!prod) { showToast('Produk tidak ditemukan'); return }
        const rawId = prod.rawId || null
        if (rawId) {
          const newStock = (prod.stock || 0) + restockQuantity
          const res = await fetch(`${API_URL}/products/${rawId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
            body: JSON.stringify({ stock: newStock })
          })
          if (res.ok) {
            await fetchProducts()
            showToast(`Restock ${restockProduct} berhasil (server)`)
          } else {
            // fallback local
            const updated = products.map(p => p.name === restockProduct ? { ...p, stock: p.stock + restockQuantity, value: p.price * (p.stock + restockQuantity) } : p)
            setProducts(updated)
            showToast(`Restock ${restockProduct} berhasil (lokal)`)
          }
        } else {
          const updated = products.map(p => p.name === restockProduct ? { ...p, stock: p.stock + restockQuantity, value: p.price * (p.stock + restockQuantity) } : p)
          setProducts(updated)
          showToast(`Restock ${restockProduct} berhasil (lokal)`)
        }
      } catch (e) {
        console.error('Restock error', e)
        showToast('Gagal restock')
      } finally {
        setShowRestockModal(false)
        setRestockProduct('')
        setRestockQuantity(0)
      }
    })()
  }

  function ProductForm({ product, onSubmit, onCancel, onDelete }) {
    const [formData, setFormData] = useState(product ? {
      id: product.id,
      name: product.name,
      category: product.category,
      image: product.image,
      product_code: product.product_code || '',
      price: product.price,
      stock: product.stock
    } : {
      name: '',
      category: 'Minuman',
      image: '',
      product_code: '',
      price: 0,
      stock: 0
    })

    const handleSubmit = (e) => {
      e.preventDefault()
      onSubmit(formData)
    }

    const handleFileChange = (e) => {
      const file = e.target.files && e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => setFormData(prev => ({ ...prev, image: reader.result }))
      reader.readAsDataURL(file)
    }

    const hasImage = formData.image && formData.image.trim() !== ''
    const totalValue = formData.price * formData.stock

    return (
      <form onSubmit={handleSubmit}>
        <div className="product-section">
          <div className="product-upload-area">
            {hasImage ? (
              (formData.image.startsWith && (formData.image.startsWith('http') || formData.image.startsWith('data:image'))) ? (
                <img src={formData.image} alt="Preview" className="product-image-preview" />
              ) : (
                <div style={{fontSize:'120px'}}>{formData.image}</div>
              )
            ) : (
              <>
                <div className="product-upload-icon">📷</div>
                <h3 className="product-upload-text">Upload Foto Produk</h3>
                <p className="product-upload-subtitle">PNG, JPG atau URL gambar</p>
              </>
            )}

            <input type="file" accept="image/*" id="product-upload" style={{display:'block',marginTop:12}} onChange={handleFileChange} />

            <h4 className="product-section-title">Informasi Produk</h4>

            <div className="product-field">
              <label className="product-field-label">Nama Produk</label>
              <input className="product-field-input" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required />
            </div>

            <div className="product-field">
              <label className="product-field-label">Kategori</label>
              <input className="product-field-input" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})} />
            </div>

            <div className="product-field">
              <label className="product-field-label">Kode Produk</label>
              <input className="product-field-input" value={formData.product_code} onChange={e=>setFormData({...formData, product_code:e.target.value})} />
            </div>

            <div className="product-field">
              <label className="product-field-label">Harga Beli</label>
              <input type="number" className="product-field-input" value={formData.price} onChange={e=>setFormData({...formData, price:parseInt(e.target.value)||0})} required />
            </div>

            <div className="product-field">
              <label className="product-field-label">Stok</label>
              <input type="number" className="product-field-input" value={formData.stock} onChange={e=>setFormData({...formData, stock:parseInt(e.target.value)||0})} required />
            </div>

          </div>

          <div className="product-field-group">
            <div className="product-summary-card">
              <div className="product-summary-title">Total Nilai Stok</div>
              <div className="product-summary-value">Rp {totalValue.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="product-footer">
          {product && (
            <button type="button" className="btn product-add-btn" style={{marginRight:8, background:'#ef4444', color:'#fff', border: '1px solid #ef4444'}} onClick={()=>{ if (window.confirm('Yakin ingin menghapus produk ini?')) { onDelete && onDelete() } }}>
              Hapus Produk
            </button>
          )}
          <button type="button" className="btn-product-cancel" onClick={onCancel}>Batal</button>
          <button type="submit" className="btn-product-save">+ Simpan Produk</button>
        </div>
      </form>
    )
  }
  if (!isLoggedIn) {
    return <AuthPage onLogin={(user) => {
      localStorage.setItem("isLoggedIn", "true")
      setIsLoggedIn(true)
      setPage("dashboard");
      if (user) {
        try { localStorage.setItem('authUser', JSON.stringify(user)) } catch (e) {}
        setAuthUser(user)
      } else {
        const stored = localStorage.getItem('authUser')
        if (stored) {
          try { setAuthUser(JSON.parse(stored)) } catch (e) {}
        }
      }
      showToast('Login berhasil!');
    }} />
  }

  if (!page) {
    return <div>Loading...</div>
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="logo" onClick={() => setPage('dashboard')} style={{ cursor: 'pointer' }}>
          <div className="logo-name">StokKu</div>
          <div className="logo-sub">Manajemen Stok Cerdas</div>
        </div>
        <nav className="nav">
          <div className="nav-section">Utama</div>
          <div className={`nav-item ${page==='dashboard'?'active':''}`} onClick={()=>setPage('dashboard')}> 
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/><rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/><rect x="9" y="9" width="5.5" height="5.5" rx="1"/></svg>
            <span>Dashboard</span>
          </div>
          <div className={`nav-item ${page==='stok'?'active':''}`} onClick={()=>setPage('stok')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 4h12M2 8h9M2 12h6"/></svg>
            <span>Semua Produk</span>
          </div>
          <div className="nav-section">AI Fitur</div>
          <div className={`nav-item ${page==='prediksi'?'active':''}`} onClick={()=>setPage('prediksi')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><polyline points="1.5,13 4.5,7 7.5,9.5 10.5,5 14.5,8.5"/></svg>
            <span>Prediksi Stok</span>
            <span className="nav-badge">3</span>
          </div>
          <div className={`nav-item ${page==='restock'?'active':''}`} onClick={()=>setPage('restock')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1.5v13M3.5 7l4.5-5.5L12.5 7"/></svg>
            <span>Saran Restock</span>
          </div>
          <div className={`nav-item ${page==='slowmoving'?'active':''}`} onClick={()=>setPage('slowmoving')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 2"/></svg>
            <span>Stok Tidak Laku</span>
            <span className="nav-badge">4</span>
          </div>
          <div className={`nav-item ${page==='cashflow'?'active':''}`} onClick={()=>setPage('cashflow')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="4.5" width="14" height="9" rx="1.5"/><path d="M4 4.5V3.5a1 1 0 011-1h6a1 1 0 011 1v1"/><circle cx="8" cy="9" r="1.5"/></svg>
            <span>Cashflow Stok</span>
          </div>
          <div className="nav-section">Input</div>
          <div className={`nav-item ${page==='input'?'active':''}`} onClick={()=>setPage('input')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1.5v13M1.5 8h13"/></svg>
            <span>Input Cepat</span>
          </div>
          <div className={`nav-item ${page==='umkm'?'active':''}`} onClick={()=>setPage('umkm')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1.5 14.5L8 2l6.5 12.5H1.5z"/></svg>
            <span>Mode UMKM</span>
          </div>
        </nav>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left"><div className="page-title">{page === 'dashboard' ? 'Dashboard' : page.charAt(0).toUpperCase()+page.slice(1)}</div></div>
          <div className="topbar-right">
            <div className="toggle-wrap" title="Mode tampilan sederhana untuk UMKM">
              <span className="toggle-label">Mode UMKM</span>
              <label className={`toggle ${umkmMode ? "active" : ""}`}>
                <input type="checkbox" checked={umkmMode} onChange={handleUmkmToggle} />
                <div className="toggle-track"></div>
                <div className="toggle-thumb"></div>
              </label>
            </div>
            
            <div className="topbar-divider"></div>
            
            <div className="toggle-wrap" title="Toggle mode gelap/terang">
              <svg className="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              <label className={`toggle ${isDarkMode ? "active" : ""}`}>
                <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} />
                <div className="toggle-track"></div>
                <div className="toggle-thumb"></div>
              </label>
            </div>
            
            <div className="topbar-divider"></div>
            
            <div className="user-badge">{(authUser && (authUser.name || authUser.username)) || 'Toko Maju Jaya'}</div>
            
            <button className="btn-icon" title="Keluar dari aplikasi" onClick={handleSignOut}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
          </div>
        </div>

        <div className="content">
          {/* DASHBOARD */}
          <div className={`page ${page==='dashboard'?'active':''}`} id="page-dashboard">
            <div className="section-label">Ringkasan Hari Ini</div>
           <div className="metrics-grid mb16">
              <div className="metric-card metric-card-total">
                <div>
                  <div className="metric-label">Total Produk</div>
                  <div className="metric-value">{totalProductsCount}</div>
                  <div className="metric-sub">aktif di sistem</div>
                </div>
              </div>

              <div className="metric-card metric-card-critical">
                <div>
                  <div className="metric-label">Stok Kritis</div>
                  <div className="metric-value metric-danger">{criticalCount}</div>
                  <div className="metric-sub">perlu restock segera</div>
                </div>
              </div>

              <div className="metric-card metric-card-slow">
                <div>
                  <div className="metric-label">Produk Tidak Laku</div>
                  <div className="metric-value">{slowMovingCount}</div>
                  <div className="metric-sub">lebih dari 30 hari</div>
                </div>
              </div>

              <div className="metric-card metric-card-modal">
                <div>
                  <div className="metric-label">Modal di Stok</div>
                  <div className="metric-value">Rp {totalStockValue.toLocaleString()}</div>
                  <div className="metric-sub metric-positive">+2,1% vs minggu lalu</div>
                </div>
              </div>

              <div className="metric-card metric-card-profit">
                <div>
                  <div className="metric-label">Profit Hari Ini</div>
                  <div className="metric-value metric-positive">Rp 450.000</div>
                  <div className="metric-sub metric-positive">+12%</div>
                </div>
              </div>
            </div>

            <div className="dashboard-insight-grid mb16">
              <div className="card compact-card insight-card">
                <div className="card-header"><div className="card-title">💡 Insight Hari Ini</div></div>
                <div className="insight-grid">
                  <div className="insight-item">
                    <div className="insight-item-icon">⚠️</div>
                    <div>
                      <div className="insight-item-title">3 produk akan habis dalam 2 hari</div>
                      <div className="insight-item-sub">Prioritaskan restock cepat</div>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-item-icon">📦</div>
                    <div>
                      <div className="insight-item-title">1 produk berpotensi tidak laku</div>
                      <div className="insight-item-sub">Evaluasi promosi & pergerakan</div>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-item-icon">💰</div>
                    <div>
                      <div className="insight-item-title">Modal tertahan Rp 1.200.000</div>
                      <div className="insight-item-sub">Kurangi stok slow-moving</div>
                    </div>
                  </div>
                  <div className="insight-item">
                    <div className="insight-item-icon">📈</div>
                    <div>
                      <div className="insight-item-title">Penjualan naik 12% dari kemarin</div>
                      <div className="insight-item-sub">Cashflow bergerak positif</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card compact-card">
                <div className="card-header">
                  <div className="card-title">Stok Hampir Habis</div>
                  <span className="badge bd">3 produk</span>
                </div>

                {lowStockList.map(p => {
                  const pct = Math.min(100, Math.round((p.stock || 0) / 50 * 100))
                  return (
                    <div className="prod-row" key={p.id}>
                      <div className="prod-icon">{p.image || '📦'}</div>

                      <div className="prod-info">
                        <div className="prod-top">
                          <div className="prod-name">{p.name}</div>
                          <span className={`badge ${p.stock<=10 ? 'bd' : 'bw'}`}>{p.stock<=10 ? 'Habis' : 'Menipis' } {p.stock} unit</span>
                        </div>

                        <div className="stock-bar">
                          <div className="stock-fill" style={{width:`${pct}%`}} />
                        </div>

                        <div className="prod-meta">{p.stock} unit tersisa</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="card compact-card">
                <div className="card-header">
                  <div className="card-title">Saran Restock Hari Ini</div>

                  <button
                    className="btn"
                    onClick={()=>setPage('restock')}
                  >
                    Lihat Semua
                  </button>
                </div>

                {lowStockList.map(p => (
                  <div className="restock-row" key={p.id}>
                    <div className="prod-icon">{p.image || '📦'}</div>

                    <div className="restock-left">
                      <div className="prod-name">{p.name}</div>
                      <div className="prod-meta">
                        Rata terjual - · Habis dalam {Math.max(1, Math.round((p.stock||0)/Math.max(1,5)))} hari
                      </div>
                    </div>

                    <div className="restock-meta">
                      <div className="restock-unit">{p.stock} unit</div>
                      <div className="restock-stock">stok {Math.max(1, Math.round((p.stock||0)/6))} hari</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="two-col mb16">
              <div className="card">
                <div className="card-header"><div className="card-title">Tren Penjualan</div></div>
                <div style={{padding:16}}>
                  <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:14}}>
                    <button className={`top-chart-button ${salesTab==='day' ? 'active' : ''}`} onClick={()=>setSalesTab('day')}>Hari</button>
                    <button className={`top-chart-button ${salesTab==='week' ? 'active' : ''}`} onClick={()=>setSalesTab('week')}>Minggu</button>
                    <button className={`top-chart-button ${salesTab==='month' ? 'active' : ''}`} onClick={()=>setSalesTab('month')}>Bulan</button>
                    <button className={`top-chart-button ${salesTab==='year' ? 'active' : ''}`} onClick={()=>setSalesTab('year')}>Tahun</button>
                  </div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={safeMap(salesData[salesTab]).map((value, index) => ({ name: trendChartLabels[salesTab][index] || `P${index + 1}`, value }))} margin={{ top: 12, right: 8, left: -12, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <Tooltip cursor={{ fill: 'rgba(16,185,129,0.06)' }} contentStyle={{ borderRadius: 14, border: '1px solid rgba(17,24,39,0.08)', background: '#fff', color: '#111827' }} />
                        <Bar dataKey="value" fill="#10B981" radius={[12, 12, 0, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">Top Produk</div></div>
                <div style={{padding:16}}>
                  <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:14}}>
                    <button className={`top-chart-button ${topProductsTab==='day' ? 'active' : ''}`} onClick={()=>setTopProductsTab('day')}>Hari</button>
                    <button className={`top-chart-button ${topProductsTab==='week' ? 'active' : ''}`} onClick={()=>setTopProductsTab('week')}>Minggu</button>
                    <button className={`top-chart-button ${topProductsTab==='month' ? 'active' : ''}`} onClick={()=>setTopProductsTab('month')}>Bulan</button>
                    <button className={`top-chart-button ${topProductsTab==='year' ? 'active' : ''}`} onClick={()=>setTopProductsTab('year')}>Tahun</button>
                  </div>
                  <div className="chart-wrapper">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart layout="vertical" data={safeMap(topProductsData[topProductsTab])} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#E5E7EB" strokeDasharray="3 3" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={100} />
                        <Tooltip cursor={{ fill: 'rgba(16,185,129,0.06)' }} contentStyle={{ borderRadius: 14, border: '1px solid rgba(17,24,39,0.08)', background: '#fff', color: '#111827' }} />
                        <Bar dataKey="value" fill="#10B981" radius={[12, 12, 12, 12]} barSize={22} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* STOK */}
          <div className={`page ${page==='stok'?'active':''}`} id="page-stok">
            <div className="full-card">
              <div className="card-header">
                <div className="card-title">Semua Produk</div>
                <div className="product-toolbar">

                  <div className="product-toolbar-left">

                    <select
                      value={selectedCategory}
                      onChange={(e)=>setSelectedCategory(e.target.value)}
                      className="toolbar-select"
                    >
                      <option>Semua</option>
                      <option>Minuman</option>
                      <option>Sembako</option>
                      <option>Snack</option>
                      <option>Kebersihan</option>
                      <option>Rumah Tangga</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Cari produk..."
                      value={searchQuery}
                      onChange={(e)=>setSearchQuery(e.target.value)}
                      className="toolbar-search"
                    />

                  </div>

                  <button
                    className="btn btn-primary product-add-btn"
                    onClick={()=>setShowAddModal(true)}
                  >
                    + Tambah Produk
                  </button>

                </div>
              </div>
              <div className="table-wrap">
                <table id="produkTable">
                  <thead>
                    <tr>
                      <th>Gambar</th>
                      <th>ID Produk</th>
                      <th>Nama Produk</th>
                      <th>Kategori</th>
                      <th>Stok</th>
                      <th>Harga Beli</th>
                      <th>Nilai Stok</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeMap(getFilteredProducts()).map(product => {
                      const status = getStatus(product.stock)
                      return (
                        <tr key={product.id}>
                          <td style={{fontSize:20,textAlign:'center'}}>{product.image}</td>
                          <td>{product.id}</td>
                          <td className="tname">{product.name}</td>
                          <td>{product.category}</td>
                          <td>{product.stock}</td>
                          <td>Rp {product.price.toLocaleString()}</td>
                          <td>Rp {product.value.toLocaleString()}</td>
                          <td><span className={`badge ${status.class}`}>{status.text}</span></td>
                          <td><button className="btn" onClick={()=>openEditModal(product)}>Edit</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PREDIKSI STOK */}
<div className={`page ${page==='prediksi'?'active':''}`} id="page-prediksi">
  <div className="section-label">
    🤖 AI Prediksi Stok — Moving Average 7 Hari + Tren Penjualan
  </div>

  {/* SUMMARY CARDS */}
  <div className="metrics-grid mb16">

    <div className="metric-card">
      <div>
        <div className="metric-label">Produk Kritis</div>
        <div className="metric-value metric-danger">3</div>
        <div className="metric-sub">stok &lt; 7 hari</div>
      </div>
    </div>

    <div className="metric-card">
      <div>
        <div className="metric-label">Akan Habis &lt; 7 Hari</div>
        <div className="metric-value" style={{color:'#f59e0b'}}>5</div>
        <div className="metric-sub">perlu perhatian</div>
      </div>
    </div>

    <div className="metric-card">
      <div>
        <div className="metric-label">Total Restock</div>
        <div className="metric-value metric-positive">248 unit</div>
        <div className="metric-sub">estimasi kebutuhan</div>
      </div>
    </div>

    <div className="metric-card">
      <div>
        <div className="metric-label">Potensi Kehilangan</div>
        <div className="metric-value" style={{color:'#4f46e5'}}>Rp 2,4jt</div>
        <div className="metric-sub">jika tidak restock</div>
      </div>
    </div>

  </div>

  <div style={{margin:'12px 0', display:'flex', alignItems:'center', gap:12}}>
    <div style={{fontSize:13,color:'var(--text3)'}}>Prediksi AI:</div>
    {aiLoading && <div>Meminta prediksi...</div>}
    {aiError && <div style={{color:'red'}}>Error: {aiError}</div>}
    {aiPrediction !== null && !aiLoading && (
      <div style={{fontWeight:700}}>Prediksi penjualan (next): {Math.round(aiPrediction)}</div>
    )}
  </div>

  <div className="full-card">

    <div className="card-header prediction-header">

      <div className="card-title">
        Prediksi Detail per Produk
      </div>

      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <span className="badge bi" style={{fontSize:11}}>AI Prediction</span>

        <select value={prediksiKategori} onChange={e=>setPrediksiKategori(e.target.value)} style={{padding:6,borderRadius:8,border:'1px solid var(--bg2)'}}>
          <option value="">Pilih Kategori (default BEVERAGES)</option>
          {Array.from(new Set(products.map(p=>p.category || 'Lainnya'))).map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:13}} onClick={()=>requestPrediction(prediksiKategori)}>
          Minta Prediksi
        </button>

        <button className="btn" style={{padding:'6px 14px',fontSize:13}} onClick={()=>{ navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(products.slice(0,10))); showToast('Sample produk disalin ke clipboard') }}>
          Export Laporan
        </button>
      </div>

    </div>

    <div className="table-wrap">

      <table className="prediction-table">

        <thead>
          <tr>
            <th style={{width:'160px'}}>Produk</th>
            <th style={{width:'100px'}}>Stok Saat Ini</th>
            <th style={{width:'110px'}}>Rata Jual/Hari</th>
            <th style={{width:'140px'}}>Prediksi Habis</th>
            <th style={{width:'280px'}}>Rekomendasi AI</th>
            <th style={{width:'100px'}}>Status</th>
          </tr>
        </thead>

        <tbody>
          {products.map(p => {
            const avgSale = Math.max(1, Math.round((p.value || 0) / Math.max(1, (p.price || 1) * 20)))
            const daysLeft = Math.max(0, Math.round((p.stock || 0) / Math.max(1, avgSale)))
            const status = p.stock <= 10 ? 'Darurat' : (p.stock <= 20 ? 'Menipis' : 'Aman')
            return (
              <tr key={p.id}>
                <td className="tname">
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:20}}>{p.image || '📦'}</span>
                    <span>{p.name}</span>
                  </div>
                </td>
                <td style={{fontWeight:600}}>{p.stock} unit</td>
                <td>
                  <div style={{fontSize:13}}>{avgSale} / hari</div>
                  <div style={{fontSize:11,color:'var(--text3)'}}>trend -</div>
                </td>
                <td>
                  <div className="pu" style={{fontWeight:700,color: daysLeft<=2 ? '#dc2626' : '#f59e0b'}}>{daysLeft} hari lagi</div>
                  <div className={`prediction-bar ${daysLeft<=2 ? 'critical' : (daysLeft<=7 ? 'warning' : 'ok')}`}>
                    <div className="prediction-fill" style={{width:`${Math.min(100, (1 - (daysLeft/30)) * 100)}%`}} />
                  </div>
                </td>
                <td>
                  <div style={{fontSize:13,lineHeight:1.4,color:'var(--text)'}}>
                    {daysLeft<=3 ? `🚨 Disarankan restock ${Math.max(10, 50 - (p.stock||0))} unit` : 'Tersedia'}
                  </div>
                </td>
                <td>
                  <span className={`ai-badge ${status==='Darurat' ? 'ai-badge-critical' : status==='Menipis' ? 'ai-badge-warning' : ''}`}> {status} </span>
                </td>
              </tr>
            )
          })}
        </tbody>

      </table>

    </div>

    <div className="prediction-engine-box">

      <div className="prediction-engine-title">
        AI Prediction Engine
      </div>

      <div className="prediction-engine-text">
        Prediksi dihitung menggunakan
        <strong> Moving Average 7 Hari + Exponential Smoothing</strong>.
        Sistem otomatis mendeteksi tren penjualan, musiman,
        dan pola weekend. Data diperbarui real-time setiap transaksi masuk.
      </div>

    </div>

  </div>
</div>

          {/* RESTOCK */}
          <div className={`page ${page==='restock'?'active':''}`} id="page-restock">
            <div className="section-label">Smart Restock Suggestion</div>
            <div className="full-card">
              <div className="restock-ai-card">

                <div className="restock-ai-left">

                  <div className="restock-product-icon">{lowStockList[0]?.image || '📦'}</div>
                  <div className="restock-product-info">
                    <div className="restock-product-name">{lowStockList[0]?.name || '—'}</div>
                    <div className="restock-product-meta">{lowStockList[0] ? `Stok ${lowStockList[0].stock} · Habis dalam ${Math.max(1, Math.round((lowStockList[0].stock||0)/Math.max(1,1)))} hari` : '-'}</div>
                  </div>

                </div>

                <div className="restock-ai-center">

                  <div className="restock-ai-label">
                    Rekomendasi AI
                  </div>

                  <div className="restock-ai-value">
                    48 unit
                  </div>

                  <div className="restock-ai-sub">
                    estimasi kebutuhan 7 hari
                  </div>

                </div>

                <div className="restock-ai-right">

                  <div className="restock-input-group">

                    <input
                      type="number"
                      value="48"
                      className="restock-input"
                    />

                    <span className="restock-unit">
                      unit
                    </span>

                  </div>

                  <button className="btn btn-primary restock-confirm-btn">
                    Konfirmasi
                  </button>

                </div>

              </div>
            </div>
          </div>

          {/* SLOWMOVING */}
          <div className={`page ${page==='slowmoving'?'active':''}`} id="page-slowmoving">
            <div className="section-label">Stok Tidak Laku — Slow Moving Detector</div>

            <div className="metrics-grid metrics-grid-3 mb16">

              <div className="metric-card">
                <div>
                  <div className="metric-label">Produk Tidak Laku</div>
                  <div className="metric-value metric-danger">4 produk</div>
                  <div className="metric-sub">lebih dari 30 hari</div>
                </div>
              </div>

              <div className="metric-card">
                <div>
                  <div className="metric-label">Total Modal Tertahan</div>
                  <div className="metric-value metric-danger">
                    Rp 1.080.000
                  </div>
                  <div className="metric-sub">
                    kapital terblokir
                  </div>
                </div>
              </div>

              <div className="metric-card">
                <div>
                  <div className="metric-label">Produk Terparah</div>
                  <div className="metric-value metric-danger">
                    {slowMovingProducts[0]?.name || '-'}
                  </div>
                  <div className="metric-sub">
                    {slowMovingProducts[0] ? `${slowMovingProducts[0].daysNotSold || 0} hari tidak terjual` : '-'}
                  </div>
                </div>
              </div>

            </div>

            <div className="full-card slowmoving-table">
              <div className="card-header">
                <div className="card-title">Produk Bermasalah</div>
              </div>

              <div className="slowmoving-info-box">
                Produk kopi menyumbang <b>80%</b> dari stok tidak laku.
                Disarankan untuk segera melakukan diskon atau bundling.
              </div>

              <div className="table-wrap">
                <table className="table slowmoving-table">
                  <thead>
                    <tr>
                      <th>PRODUK</th>
                      <th>HARI TIDAK TERJUAL</th>
                      <th>STOK</th>
                      <th>NILAI MODAL</th>
                      <th>LABEL</th>
                      <th>SARAN TINDAKAN</th>
                    </tr>
                  </thead>

                  <tbody>
                    {slowMovingProducts.map(p => (
                      <tr key={p.id}>
                        <td>{p.name}</td>

                        <td>
                          <div className="slow-bar-wrap">
                            <div className="slow-bar">
                              <div className="slow-bar-fill" style={{width: `${Math.min(100, Math.round(((p.daysNotSold||0)/120)*100))}%`}} />
                            </div>
                            <span>{p.daysNotSold || '—'} hari</span>
                          </div>
                        </td>

                        <td>{p.stock} unit</td>

                        <td>{`Rp ${Math.round(p.value||0).toLocaleString()}`}</td>

                        <td><span className="badge bd">{(p.daysNotSold||0) > 90 ? '90+ hari' : `${p.daysNotSold || 0} hari`}</span></td>

                        <td>
                          <div className="table-actions">
                            <button className="btn">Diskon</button>
                            <button className="btn">Bundling</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="full-card slowmoving-chart-card">
              <div className="card-header">
                <div className="card-title">
                  Distribusi Slow Moving
                </div>
              </div>

              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={safeMap(topProductsData[topProductsTab])}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e5e7eb"
                    />

                    <XAxis dataKey="name" />

                    <YAxis />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="#10b981"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* CASHFLOW */}
          <div className={`page ${page==='cashflow'?'active':''}`} id="page-cashflow">
            <div className="section-label">Insight Stok dan Cashflow</div>
            <div className="metrics-grid mb16" style={{gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px'}}>
              <div className="metric-card">
                <div className="metric-label">Total Nilai Stok</div>
                <div className="metric-value" style={{fontSize:18}}>Rp 12,4jt</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Profit Summary</div>
                <div className="metric-value" style={{fontSize:18,color:'var(--green)'}}>{profitSummary.totalProfit}</div>
                <div className="metric-sub" style={{marginTop:8}}>Margin rata-rata {profitSummary.averageMargin}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Cash In</div>
                <div className="metric-value" style={{fontSize:18}}>{cashflowData.cashIn}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Cash Out</div>
                <div className="metric-value" style={{fontSize:18,color:'#e74c3c'}}>{cashflowData.cashOut}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Net Cashflow</div>
                <div className="metric-value" style={{fontSize:18,color:'var(--green)'}}>{cashflowData.net}</div>
              </div>
            </div>

            <div className="two-col mb16">
              <div className="card">
                <div className="card-header"><div className="card-title">Penyerapan Modal per Produk</div></div>
                <div style={{display:'grid',gap:12,marginTop:12}}>
                  {safeMap(modalData).map((item, index) => (
                    <div key={index} style={{display:'grid',gap:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text3)'}}><span>{item.name}</span><span>{item.value}</span></div>
                      <div style={{height:8,borderRadius:9999,overflow:'hidden',background:'var(--bg2)'}}>
                        <div style={{width:`${item.percent}%`,height:'100%',background:'var(--green)'}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">ROI per Kategori</div></div>
                <div style={{display:'grid',gap:12,marginTop:12}}>
                  {safeMap(roiData).map((item, i) => (
                    <div key={i} className="roi-item" style={{display:'grid',gap:8}}>
                      <div className="flex-between" style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text3)'}}>
                        <span>{item.name}</span>
                        <span>{item.percent}%</span>
                      </div>
                      <div className="bar-bg" style={{height:8,borderRadius:9999,overflow:'hidden',background:'var(--bg2)'}}>
                        <div className="bar-fill" style={{width:`${item.percent}%`,height:'100%',background:'var(--green)'}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card mb16">
              <div className="card-header"><div className="card-title">Perbandingan Cashflow</div></div>
              <div style={{width:'100%',height:280,marginTop:16}}>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={cashflowChart} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="var(--text3)" />
                    <YAxis stroke="var(--text3)" tickFormatter={(value) => `Rp ${Math.round(value/1000000)}`} />
                    <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="in" fill="#16a085" name="Cash In" />
                    <Bar dataKey="out" fill="#e74c3c" name="Cash Out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* INPUT */}
          <div className={`page ${page==='input'?'active':''}`} id="page-input">
            <div className="section-label">Input Cepat</div>

            <div className="quick-input-grid">

              <div className="scanner-card">

                <div className="card-header">
                  <div className="card-title">
                    Scan Barcode
                  </div>
                </div>

                <label className="scanner-upload">

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                  />

                  <div className="scanner-upload-icon">
                    📷
                  </div>

                  <div className="scanner-upload-title">
                    Upload atau Scan Barcode
                  </div>

                  <div className="scanner-upload-sub">
                    Klik untuk buka kamera atau upload gambar barcode
                  </div>

                </label>

              </div>

              <div className="manual-input-card">

                <div className="card-header">
                  <div className="card-title">
                    Input Manual
                  </div>
                </div>

                <div className="manual-input-grid">

                  <div>
                    <label>Produk</label>

                    <select>
                      {products.map(p => (
                        <option key={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Tipe Transaksi</label>

                    <select>
                      <option>
                        Stok Masuk (+)
                      </option>

                      <option>
                        Stok Keluar (-)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label>Jumlah</label>

                    <input
                      type="number"
                      placeholder="10"
                    />
                  </div>

                  <button className="btn btn-primary">
                    Simpan
                  </button>

                </div>

              </div>

            </div>
          </div>

          {/* UMKM */}
          <div className={`page ${page==='umkm'?'active':''}`} id="page-umkm">
            <div className="section-label">Mode UMKM — Tampilan Sederhana</div>

            <div className="umkm-grid-2">

              <div className="umkm-card">
                <div className="umkm-card-title">
                  Daily Summary
                </div>

                <div style={{marginBottom:'14px'}}>
                  <div style={{
                    fontSize:13,
                    fontWeight:600,
                    marginBottom:8
                  }}>
                    Low Stock
                  </div>

                  <div className="umkm-summary-group">
                    {umkmSummary.lowStock.map((n, idx) => (
                      <span className="summary-chip" key={idx}>{n}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{
                    fontSize:13,
                    fontWeight:600,
                    marginBottom:8
                  }}>
                    Slow Moving
                  </div>

                  <div className="umkm-summary-group">
                    {umkmSummary.slowMoving.map((n, idx) => (
                      <span className="summary-chip" key={idx}>{n}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="umkm-card">
                <div className="umkm-card-title">
                  Estimated Stock Warning
                </div>

                {umkmWarnings.map((w, i) => (
                  <div className="umkm-warning" key={i}>{w}</div>
                ))}
              </div>

            </div>

            <div className="umkm-grid-2">

              <div className="umkm-card">
                <div className="umkm-card-title">
                  Action Recommendation
                </div>

                <div className="umkm-action-list">

                  {umkmRecommendations.map((r, i) => (
                    <div className="umkm-action-item" key={i}>{r}</div>
                  ))}

                </div>
              </div>

              <div className="umkm-card quick-restock-card">

                <div className="umkm-card-title">
                  Quick Restock
                </div>

                <div style={{
                  display:'flex',
                  flexDirection:'column',
                  gap:'12px'
                }}>

                  <select>
                    <option>
                      Pilih produk...
                    </option>
                  </select>

                  <input
                    type="number"
                    placeholder="Jumlah stok"
                  />

                  <button className="btn btn-primary">
                    Simpan Restock
                  </button>

                </div>

              </div>

            </div>

            <div className="umkm-card">

              <div className="umkm-card-title">
                Cashflow Summary
              </div>

              <div className="cashflow-mini">

                <div className="cashflow-row">
                  <span>Cash In</span>
                  <strong className="positive">{umkmCashflow.cashIn}</strong>
                </div>

                <div className="cashflow-row">
                  <span>Cash Out</span>
                  <strong className="negative">{umkmCashflow.cashOut}</strong>
                </div>

                <div className="cashflow-divider" />

                <div className="cashflow-row total">
                  <span>Profit Bersih</span>
                  <strong className="positive">{umkmCashflow.profitToday}</strong>
                </div>

              </div>

            </div>
          </div>

          {/* MODALS */}
          {showAddModal && (
            <div className="modal-overlay" onClick={()=>setShowAddModal(false)}>
              <div className="modal" onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">Tambah Produk Baru</div>
                  <button className="modal-close" onClick={()=>setShowAddModal(false)}>×</button>
                </div>
                <ProductForm onSubmit={addProduct} onCancel={()=>setShowAddModal(false)} />
              </div>
            </div>
          )}

          {showEditModal && editingProduct && (
            <div className="modal-overlay" onClick={()=>setShowEditModal(false)}>
              <div className="modal" onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">Edit Produk</div>
                  <button className="modal-close" onClick={()=>setShowEditModal(false)}>×</button>
                </div>
                <ProductForm product={editingProduct} onSubmit={editProduct} onCancel={()=>setShowEditModal(false)} onDelete={() => {
                  if (!editingProduct) return
                  if (window.confirm('Yakin ingin menghapus produk ini?')) {
                    deleteProduct(editingProduct)
                  }
                }} />
              </div>
            </div>
          )}

          {showRestockModal && (
            <div className="modal-overlay" onClick={()=>setShowRestockModal(false)}>
              <div className="modal" onClick={(e)=>e.stopPropagation()}>
                <div className="modal-header">
                  <div className="modal-title">Restock Produk Kritis</div>
                  <button className="modal-close" onClick={()=>setShowRestockModal(false)}>×</button>
                </div>
                <div style={{padding:20}}>
                  {safeMap(getCriticalProducts()).map(product => (
                    <div key={product.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--bg2)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:20}}>{product.image}</span>
                        <div>
                          <div style={{fontWeight:600}}>{product.name}</div>
                          <div style={{fontSize:12,color:'var(--text3)'}}>Stok: {product.stock} unit</div>
                        </div>
                      </div>
                      <button className="btn btn-primary" onClick={()=>restockNow(product)}>Restock</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={`toast ${toast? 'show':''}`} id="toast">{toast}</div>
        </div>
      </div>
    </div>
  )
}
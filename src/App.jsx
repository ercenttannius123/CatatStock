import React, { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts'
import AuthPage from './AuthPage'
Chart.register(...registerables)

const pages = ['dashboard','stok','prediksi','restock','slowmoving','cashflow','input','umkm']

export default function App(){
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [umkmMode, setUmkmMode] = useState(false)
  const [toast, setToast] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [salesTab, setSalesTab] = useState('day')
  const [topProductsTab, setTopProductsTab] = useState('day')
  const trendRef = useRef(null)
  const roiRef = useRef(null)
  const trendChartRef = useRef(null)
  const roiChartRef = useRef(null)
  const [products, setProducts] = useState([
    { id: 'P001', name: 'Susu UHT 1L', category: 'Minuman', image: '🥛', price: 8500, stock: 12, value: 102000 },
    { id: 'P002', name: 'Minyak Goreng 2L', category: 'Sembako', image: '🍳', price: 28000, stock: 22, value: 616000 },
    { id: 'P003', name: 'Cokelat Batang 100g', category: 'Snack', image: '🍫', price: 12000, stock: 9, value: 108000 },
    { id: 'P004', name: 'Beras 5kg', category: 'Sembako', image: '🌾', price: 65000, stock: 145, value: 9425000 },
    { id: 'P005', name: 'Sabun Mandi', category: 'Kebersihan', image: '🧼', price: 5500, stock: 87, value: 478500 },
    { id: 'P006', name: 'Kopi Sachet 20s', category: 'Minuman', image: '☕', price: 24000, stock: 45, value: 1080000 },
    { id: 'P007', name: 'Deterjen 1kg', category: 'Kebersihan', image: '🧺', price: 18000, stock: 34, value: 612000 },
    { id: 'P008', name: 'Gula Pasir 1kg', category: 'Sembako', image: '🧂', price: 15000, stock: 60, value: 900000 },
    { id: 'P009', name: 'Sirup Rasa Jeruk', category: 'Minuman', image: '🍊', price: 15000, stock: 18, value: 270000 },
    { id: 'P010', name: 'Tisu Wajah 100s', category: 'Rumah Tangga', image: '🧻', price: 8000, stock: 24, value: 192000 }
  ])
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showRestockModal, setShowRestockModal] = useState(false)
  const [restockProduct, setRestockProduct] = useState('')
  const [restockQuantity, setRestockQuantity] = useState(0)

  const profitSummary = {
    totalProfit: 'Rp 3.450.000',
    averageMargin: '27%'
  }

  const cashflowData = {
    cashIn: 'Rp 8.200.000',
    cashOut: 'Rp 4.750.000',
    net: 'Rp 3.450.000'
  }

  const umkmSummary = {
    lowStock: ['Susu UHT 1L', 'Cokelat Batang 100g'],
    slowMoving: ['Kopi Sachet 20s']
  }

  const umkmWarnings = [
    'Susu UHT 1L akan habis dalam 2 hari',
    'Stok snack mulai menipis'
  ]

  const umkmRecommendations = [
    'Restock susu UHT minimal 50 unit',
    'Kurangi pembelian kopi sachet'
  ]

  const umkmCashflow = {
    cashIn: 'Rp 2.500.000',
    cashOut: 'Rp 1.200.000',
    profitToday: 'Rp 1.300.000'
  }

  const topProducts = [
    { name: 'Minyak Goreng 2L', profit: 'Rp 1.200.000' },
    { name: 'Beras 5kg', profit: 'Rp 950.000' },
    { name: 'Gula 1kg', profit: 'Rp 520.000' },
    { name: 'Mie Instan Box', profit: 'Rp 380.000' }
  ]

  const profitChart = [
    { name: 'Minyak', percent: 40 },
    { name: 'Beras', percent: 30 },
    { name: 'Gula', percent: 20 },
    { name: 'Snack', percent: 10 }
  ]

  const roiData = [
    { name: 'Minyak', percent: 40 },
    { name: 'Beras', percent: 30 },
    { name: 'Gula', percent: 20 },
    { name: 'Snack', percent: 10 }
  ]

  const modalData = [
    { name: 'Beras 5kg', value: 'Rp 9,4jt', percent: 80 },
    { name: 'Minyak 2L', value: 'Rp 5,2jt', percent: 55 },
    { name: 'Gula 1kg', value: 'Rp 3,1jt', percent: 35 },
    { name: 'Mie Instan', value: 'Rp 2jt', percent: 20 }
  ]

  const cashflowChart = [
    { month: 'Jan', in: 3200000, out: 2100000 },
    { month: 'Feb', in: 2800000, out: 2500000 },
    { month: 'Mar', in: 4100000, out: 3000000 },
    { month: 'Apr', in: 3700000, out: 2900000 },
    { month: 'Mei', in: 4500000, out: 3100000 }
  ]

  const salesData = {
    day: [12, 18, 10, 25, 30],
    week: [120, 150, 180, 200],
    month: [400, 600, 550, 700],
    year: [5000, 7000, 6500]
  }

  const topProductsData = {
    day: [{name:'Minyak', value:20}, {name:'Beras', value:15}],
    week: [{name:'Minyak', value:140}, {name:'Beras', value:120}],
    month: [{name:'Minyak', value:600}, {name:'Beras', value:550}],
    year: [{name:'Minyak', value:7000}, {name:'Beras', value:6500}]
  }

  const safeMap = (array) => Array.isArray(array) ? array : []

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      const isDark = savedTheme === 'dark'
      setIsDarkMode(isDark)
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    } else {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }, [])

  // Apply theme changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Initialize charts
  useEffect(() => {
    if (roiRef.current) {
      const ctx = roiRef.current.getContext('2d')
      const roiChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Minuman', 'Sembako', 'Snack', 'Kebersihan', 'Rumah Tangga'],
          datasets: [{
            label: 'ROI (%)',
            data: [15, 20, 10, 8, 12],
            backgroundColor: '#1D9E75',
            borderColor: '#1D9E75',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      })
      return () => roiChart.destroy()
    }
  }, [])

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
    setIsLoggedIn(false)
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

  function addProduct(product) {
    const newId = 'P' + String(products.length + 1).padStart(3, '0')
    const newProduct = {
      id: newId,
      ...product,
      value: product.price * product.stock
    }
    setProducts([...products, newProduct])
    setShowAddModal(false)
    showToast('Produk berhasil ditambahkan!')
  }

  function editProduct(product) {
    const updated = products.map(p => p.id === product.id ? { ...product, value: product.price * product.stock } : p)
    setProducts(updated)
    setShowEditModal(false)
    setEditingProduct(null)
    showToast('Produk berhasil diupdate!')
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
    const updated = products.map(p => 
      p.name === restockProduct ? { ...p, stock: p.stock + restockQuantity, value: p.price * (p.stock + restockQuantity) } : p
    )
    setProducts(updated)
    setShowRestockModal(false)
    setRestockProduct('')
    setRestockQuantity(0)
    showToast(`Restock ${restockProduct} berhasil!`)
  }

  function ProductForm({ product, onSubmit, onCancel }) {
    const [formData, setFormData] = useState(product ? {
      id: product.id,
      name: product.name,
      category: product.category,
      image: product.image,
      price: product.price,
      stock: product.stock
    } : {
      name: '',
      category: 'Minuman',
      image: '📦',
      price: 0,
      stock: 0
    })

    const handleSubmit = (e) => {
      e.preventDefault()
      onSubmit(formData)
    }

    return (
      <form onSubmit={handleSubmit} style={{padding:20}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:15,marginBottom:20}}>
          <div>
            <label style={{display:'block',fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Nama Produk</label>
            <input type="text" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} required style={{width:'100%'}} />
          </div>
          <div>
            <label style={{display:'block',fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Kategori</label>
            <select value={formData.category} onChange={(e)=>setFormData({...formData, category: e.target.value})} style={{width:'100%'}}>
              <option>Minuman</option>
              <option>Sembako</option>
              <option>Snack</option>
              <option>Kebersihan</option>
              <option>Rumah Tangga</option>
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Gambar (Emoji)</label>
            <input type="text" value={formData.image} onChange={(e)=>setFormData({...formData, image: e.target.value})} style={{width:'100%'}} />
          </div>
          <div>
            <label style={{display:'block',fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Harga Beli</label>
            <input type="number" value={formData.price} onChange={(e)=>setFormData({...formData, price: parseInt(e.target.value)||0})} required style={{width:'100%'}} />
          </div>
          <div>
            <label style={{display:'block',fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Stok</label>
            <input type="number" value={formData.stock} onChange={(e)=>setFormData({...formData, stock: parseInt(e.target.value)||0})} required style={{width:'100%'}} />
          </div>
          <div>
            <label style={{display:'block',fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Nilai Stok (Auto)</label>
            <input type="text" value={`Rp ${(formData.price * formData.stock).toLocaleString()}`} readOnly style={{width:'100%',background:'var(--bg2)'}} />
          </div>
        </div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button type="button" className="btn" onClick={onCancel}>Batal</button>
          <button type="submit" className="btn btn-primary">Simpan</button>
        </div>
      </form>
    )
  }

  if (!isLoggedIn) {
    return <AuthPage onLogin={() => {
      setIsLoggedIn(true);
      setPage("dashboard");
    }} />
  }

  if (!page) {
    return <div>Loading...</div>
  }

  return (
    <div className="app">
      <style>{`
        .card, .full-card {
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          border-radius: 12px;
          transition: transform .2s ease, box-shadow .2s ease;
          background: var(--bg1);
          padding: 20px;
        }
        .card:hover, .full-card:hover {
          transform: translateY(-2px);
        }
        .metric-card {
          border-radius: 12px;
          padding: 18px 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transition: transform .2s ease, box-shadow .2s ease;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 110px;
          background: rgba(255,255,255,0.92);
        }
        .metric-card:hover {
          transform: translateY(-2px);
        }
        .metric-card .metric-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(255,255,255,0.8);
          font-size: 16px;
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.04);
        }
        .metric-card-total { background: rgba(227,244,255,0.9); }
        .metric-card-critical { background: rgba(255,235,235,0.95); }
        .metric-card-slow { background: rgba(255,244,229,0.95); }
        .metric-card-modal { background: rgba(234,251,236,0.95); }
        .metric-card-profit { background: rgba(237,251,245,0.95); }
        .insight-card {
          background: #fff9df;
          border-left: 4px solid #f5a623;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.04);
          padding: 20px;
        }
        .insight-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 0;
        }
        .insight-item:not(:last-child) {
          margin-bottom: 10px;
        }
        .insight-item-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(255, 179, 0, 0.12);
          color: #f0a02d;
        }
        .stock-bar {
          height: 8px !important;
          border-radius: 9999px !important;
          background: rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .stock-fill {
          border-radius: 9999px !important;
          height: 100% !important;
          background: linear-gradient(90deg, #E24B4A, #EF9F27);
        }
        .chart-panel {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          padding: 16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,251,255,0.95));
        }
        .chart-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: linear-gradient(0deg, rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px);
          background-size: 100% 32px, 32px 100%;
          pointer-events: none;
        }
        .chart-panel > div {
          position: relative;
          z-index: 1;
        }
        .top-chart-button {
          border-radius: 9999px;
          transition: all .2s ease;
          padding: 8px 14px;
          border: 1px solid rgba(29,158,117,0.22);
          background: transparent;
          color: var(--text);
        }
        .top-chart-button.active {
          background: linear-gradient(135deg,#1d9e75,#2dc18c);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 10px 24px rgba(29,158,117,0.18);
        }
        .top-chart-button:hover {
          transform: translateY(-1px);
        }
        .top-products-item {
          border-radius: 12px;
          padding: 14px;
          background: rgba(255,255,255,0.85);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.04);
        }
        .top-products-rank {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          background: rgba(29,158,117,0.1);
          color: #1d9e75;
        }
        .top-products-rank-top {
          background: linear-gradient(135deg,#ff8a3d,#ff5c55);
          color: #fff;
        }
        .best-seller-badge {
          padding: 2px 8px;
          border-radius: 9999px;
          background: rgba(255,140,46,0.14);
          color: #d35400;
          font-size: 11px;
          font-weight: 700;
        }
        .card, .full-card {
          margin-bottom: 20px;
        }
      `}</style>
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
            
            <div className="user-badge">Toko Maju Jaya</div>
            
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
              <div className="metric-card metric-card-total"><div className="metric-icon">📦</div><div><div className="metric-label">Total Produk</div><div className="metric-value">48</div><div className="metric-sub">aktif di sistem</div></div></div>
              <div className="metric-card metric-card-critical"><div className="metric-icon">⚠️</div><div><div className="metric-label">Stok Kritis</div><div className="metric-value" style={{color:'var(--red)'}}>3</div><div className="metric-sub">perlu restock segera</div></div></div>
              <div className="metric-card metric-card-slow"><div className="metric-icon">📦</div><div><div className="metric-label">Produk Tidak Laku</div><div className="metric-value" style={{color:'var(--amber)'}}>4</div><div className="metric-sub">lebih dari 30 hari</div></div></div>
              <div className="metric-card metric-card-modal"><div className="metric-icon">💰</div><div><div className="metric-label">Modal di Stok</div><div className="metric-value" style={{fontSize:18}}>Rp 12,4jt</div><div className="metric-sub" style={{color:'var(--green-dark)'}}>+2,1% vs minggu lalu</div></div></div>
              <div className="metric-card metric-card-profit"><div className="metric-icon">📈</div><div><div className="metric-label">Profit Hari Ini</div><div className="metric-value" style={{fontSize:18,color:'var(--green)'}}>Rp 450.000</div><div className="metric-sub" style={{color:'var(--green)'}}>+12%</div></div></div>
            </div>

            <div className="card mb16 insight-card">
              <div className="card-header"><div className="card-title">💡 Insight Hari Ini</div></div>
              <div style={{display:'grid', gap:12}}>
                <div className="insight-item">
                  <span className="insight-item-icon">⚠️</span>
                  <span>3 produk akan habis dalam 2 hari</span>
                </div>
                <div className="insight-item">
                  <span className="insight-item-icon">📦</span>
                  <span>1 produk berpotensi tidak laku</span>
                </div>
                <div className="insight-item">
                  <span className="insight-item-icon">💰</span>
                  <span>Modal tertahan Rp 1.200.000</span>
                </div>
                <div className="insight-item">
                  <span className="insight-item-icon">📈</span>
                  <span>Penjualan naik 12% dari kemarin</span>
                </div>
              </div>
            </div>

            <div className="two-col mb16">
              <div className="card">
                <div className="card-header"><div className="card-title">Stok Hampir Habis</div><span className="badge bd">3 produk</span></div>
                <div className="prod-row"><div className="prod-icon">🥛</div><div style={{flex:1}}><div className="prod-name">Susu UHT 1L</div><div className="stock-bar"><div className="stock-fill" style={{width:'12%'}}/></div><div className="prod-meta">12 unit tersisa</div></div><span className="badge bd">Habis 2 hari</span></div>
                <div className="prod-row"><div className="prod-icon">🍳</div><div style={{flex:1}}><div className="prod-name">Minyak Goreng 2L</div><div className="stock-bar"><div className="stock-fill" style={{width:'22%'}}/></div><div className="prod-meta">22 unit tersisa</div></div><span className="badge bw">Habis 5 hari</span></div>
                <div className="prod-row"><div className="prod-icon">🍫</div><div style={{flex:1}}><div className="prod-name">Cokelat Batang 100g</div><div className="stock-bar"><div className="stock-fill" style={{width:'18%'}}/></div><div className="prod-meta">9 unit tersisa</div></div><span className="badge bw">Habis 6 hari</span></div>
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">Saran Restock Hari Ini</div><button className="btn" onClick={()=>setPage('restock')}>Lihat Semua</button></div>
                <div className="restock-row"><div className="prod-icon">🥛</div><div style={{flex:1}}><div className="prod-name">Susu UHT 1L</div><div className="prod-meta">Rata terjual 6/hari · Habis 2 hari lagi</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:600,fontSize:14}}>48 unit</div><div style={{fontSize:10,color:'var(--text3)'}}>stok 8 hari</div></div></div>
                <div className="restock-row"><div className="prod-icon">🍳</div><div style={{flex:1}}><div className="prod-name">Minyak Goreng 2L</div><div className="prod-meta">Tren naik +40% · Habis 5 hari lagi</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:600,fontSize:14}}>30 unit</div><div style={{fontSize:10,color:'var(--text3)'}}>stok 7 hari</div></div></div>
                <div className="restock-row"><div className="prod-icon">🍫</div><div style={{flex:1}}><div className="prod-name">Cokelat Batang 100g</div><div className="prod-meta">Fast-moving · Sering habis malam hari</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:600,fontSize:14}}>60 unit</div><div style={{fontSize:10,color:'var(--text3)'}}>stok 10 hari</div></div></div>
              </div>
            </div>

            <div className="two-col mb16">
              <div className="card">
                <div className="card-header"><div className="card-title">Tren Penjualan</div></div>
                <div style={{padding:16}}>
                  <div style={{display:'flex', gap:8, marginBottom:16}}>
                    <button className={`top-chart-button ${salesTab==='day' ? 'active' : ''}`} onClick={()=>setSalesTab('day')}>Hari</button>
                    <button className={`top-chart-button ${salesTab==='week' ? 'active' : ''}`} onClick={()=>setSalesTab('week')}>Minggu</button>
                    <button className={`top-chart-button ${salesTab==='month' ? 'active' : ''}`} onClick={()=>setSalesTab('month')}>Bulan</button>
                    <button className={`top-chart-button ${salesTab==='year' ? 'active' : ''}`} onClick={()=>setSalesTab('year')}>Tahun</button>
                  </div>
                  <div className="chart-panel">
                    <div style={{display:'flex', gap:6, alignItems:'flex-end', height:180, width:'100%'}}>
                      {safeMap(salesData[salesTab]).map((val, i) => {
                        const max = Math.max(...salesData[salesTab])
                        const height = (val / max) * 100
                        return <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center'}}>
                          <div style={{width:'100%', height:`${height}%`, background:'linear-gradient(180deg, #34b27d, #1d9e75)', borderRadius:'12px 12px 0 0', minHeight:8, transition:'height .3s ease'}}></div>
                          <div style={{fontSize:10, marginTop:8, color:'var(--text3)'}}>{val}</div>
                        </div>
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">Top Produk</div></div>
                <div style={{padding:16}}>
                  <div style={{display:'flex', gap:8, marginBottom:16}}>
                    <button className={`top-chart-button ${topProductsTab==='day' ? 'active' : ''}`} onClick={()=>setTopProductsTab('day')}>Hari</button>
                    <button className={`top-chart-button ${topProductsTab==='week' ? 'active' : ''}`} onClick={()=>setTopProductsTab('week')}>Minggu</button>
                    <button className={`top-chart-button ${topProductsTab==='month' ? 'active' : ''}`} onClick={()=>setTopProductsTab('month')}>Bulan</button>
                    <button className={`top-chart-button ${topProductsTab==='year' ? 'active' : ''}`} onClick={()=>setTopProductsTab('year')}>Tahun</button>
                  </div>
                  <div style={{display:'grid', gap:12}}>
                    {safeMap(topProductsData[topProductsTab]).map((prod, i) => {
                      const max = Math.max(...topProductsData[topProductsTab].map(p=>p.value))
                      const width = (prod.value / max) * 100
                      return <div key={i} className="top-products-item">
                        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:12}}>
                          <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <div className={`top-products-rank ${i===0 ? 'top-products-rank-top' : ''}`}>{i+1}</div>
                            <span style={{fontSize:13,fontWeight:600,color:'var(--text)'}}>{prod.name}</span>
                          </div>
                          {i===0 && <span className="best-seller-badge">🔥 Best Seller</span>}
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text3)', marginTop:6}}>
                          <span></span>
                          <span>{prod.value}</span>
                        </div>
                        <div style={{height:8, borderRadius:9999, background:'var(--bg2)', overflow:'hidden', marginTop:8}}>
                          <div style={{width:`${width}%`, height:'100%', background:'var(--green)'}}></div>
                        </div>
                      </div>
                    })}
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
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <select value={selectedCategory} onChange={(e)=>setSelectedCategory(e.target.value)} style={{width:120}}>
                    <option>Semua</option>
                    <option>Minuman</option>
                    <option>Sembako</option>
                    <option>Snack</option>
                    <option>Kebersihan</option>
                    <option>Rumah Tangga</option>
                  </select>
                  <input type="text" placeholder="Cari produk..." style={{width:160}} value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} />
                  <button className="btn btn-primary" onClick={()=>setShowAddModal(true)}>+ Tambah Produk</button>
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
            <div className="section-label">Prediksi Habis Stok — Moving Average 7 Hari</div>
            <div className="full-card">
              <div className="tabs"><div className="tab active">Semua</div><div className="tab">Kritis (&lt;7 hari)</div><div className="tab">Normal</div></div>
              <div className="table-wrap">
                <table><thead><tr><th>Produk</th><th>Stok Saat Ini</th><th>Rata Jual/Hari</th><th>Prediksi Habis</th><th>Rekomendasi</th><th>Status</th></tr></thead>
                <tbody>
                  <tr><td className="tname">Susu UHT 1L</td><td>12 unit</td><td>6 / hari</td><td className="pu">2 hari lagi</td><td>Segera beli 48 unit</td><td><span className="badge bd">Darurat</span></td></tr>
                  <tr><td className="tname">Cokelat Batang 100g</td><td>9 unit</td><td>1,5 / hari</td><td className="pu">6 hari lagi</td><td>Beli 60 unit minggu ini</td><td><span className="badge bd">Segera</span></td></tr>
                </tbody></table>
              </div>
              <div className="info-box">Prediksi dihitung menggunakan <strong>Moving Average 7 hari</strong>. Data diperbarui otomatis setiap ada transaksi baru.</div>
            </div>
          </div>

          {/* RESTOCK */}
          <div className={`page ${page==='restock'?'active':''}`} id="page-restock">
            <div className="section-label">Smart Restock Suggestion</div>
            <div className="full-card">
              <div className="card-header"><div className="card-title">Rekomendasi Pembelian — Hari Ini</div><button className="btn btn-primary" onClick={()=>showToast('Export berhasil!')}>Export PDF</button></div>
              <div className="restock-row"><div className="prod-icon" style={{fontSize:18}}>🥛</div><div style={{flex:1}}><div className="prod-name">Susu UHT 1L</div><div className="prod-meta">Stok kritis. Rata terjual 6/hari. Habis dalam 2 hari.</div></div><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{textAlign:'right'}}><input type="number" defaultValue={48} style={{width:64,textAlign:'center',fontSize:13}} /><div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>unit</div></div><button className="btn btn-primary" onClick={()=>showToast('Restock Susu UHT 1L dikonfirmasi!')}>Konfirmasi</button></div></div>
            </div>
          </div>

          {/* SLOWMOVING */}
          <div className={`page ${page==='slowmoving'?'active':''}`} id="page-slowmoving">
            <div className="section-label">Stok Tidak Laku — Slow Moving Detector</div>

            <div className="slow-summary-grid mb16">
              <div className="metric-card warning-card">
                <div className="metric-label">📦 Produk Tidak Laku</div>
                <div className="metric-value">4 produk</div>
                <div className="metric-sub">lebih dari 30 hari</div>
              </div>
              <div className="metric-card warning-card">
                <div className="metric-label">💰 Total Modal Tertahan</div>
                <div className="metric-value">Rp 1.080.000</div>
                <div className="metric-sub">kapital terblokir</div>
              </div>
              <div className="metric-card warning-card">
                <div className="metric-label">⚠️ Produk Terparah</div>
                <div className="metric-value">Kopi Sachet 20s</div>
                <div className="metric-sub">87 hari tidak terjual</div>
              </div>
            </div>

            <div className="full-card slow-highlight-card mb16">
              <div className="card-header"><div className="card-title">🔥 Produk Paling Bermasalah</div></div>
              <div className="highlight-box">
                <div className="highlight-title">Kopi Sachet 20s</div>
                <div className="highlight-meta">Tidak terjual selama <strong>87 hari</strong></div>
                <div className="highlight-grid">
                  <div>Stok: <strong>45 unit</strong></div>
                  <div>Nilai: <strong>Rp 1.080.000</strong></div>
                </div>
                <div className="highlight-actions">
                  <button className="btn btn-warning">Diskon 20%</button>
                  <button className="btn">Bundling</button>
                  <button className="btn">Stop Restock</button>
                </div>
              </div>
            </div>

            <div className="full-card mb16">
              <div className="card-header"><div className="card-title">Produk Bermasalah</div></div>
              <div className="insight-note mb16">Produk kopi menyumbang 80% dari stok tidak laku. Disarankan untuk segera melakukan diskon atau bundling.</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Hari Tidak Terjual</th>
                      <th>Stok</th>
                      <th>Nilai Modal</th>
                      <th>Label</th>
                      <th>Saran Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="tname">Kopi Sachet 20s</td>
                      <td>
                        <div className="impact-line">
                          <div className="impact-bar">
                            <div className="impact-fill" style={{width:'97%'}} />
                          </div>
                          <span className="impact-label">87 hari</span>
                        </div>
                      </td>
                      <td>45 unit</td>
                      <td>Rp 1.080.000</td>
                      <td><span className="badge slow-badge slow-badge-90">90+ hari</span></td>
                      <td className="action-pill-cell">
                        <button className="action-pill">Diskon</button>
                        <button className="action-pill">Bundling</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="two-col mb16 slow-bottom-grid">
              <div className="card">
                <div className="card-header"><div className="card-title">📊 Distribusi Slow Moving</div></div>
                <div className="dist-item">
                  <span>Kopi Sachet</span>
                  <div className="dist-bar">
                    <div className="dist-fill" style={{width:'84%'}} />
                  </div>
                </div>
                <div className="dist-item">
                  <span>Snack</span>
                  <div className="dist-bar">
                    <div className="dist-fill amber" style={{width:'42%'}} />
                  </div>
                </div>
                <div className="dist-item">
                  <span>Minyak</span>
                  <div className="dist-bar">
                    <div className="dist-fill" style={{width:'24%'}} />
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">⚡ Quick Action</div></div>
                <div className="quick-actions">
                  <button className="btn btn-primary btn-full">Diskon semua produk slow moving</button>
                  <button className="btn btn-primary btn-full">Buat bundling otomatis</button>
                  <button className="btn btn-full">Hapus dari katalog</button>
                </div>
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
            <div className="section-label">Input Cepat — Voice & Barcode Scanner</div>
            <div className="two-col mb16">
              <div className="card"><div className="card-header"><div className="card-title">Voice Input</div><span className="badge bi">Beta</span></div><p style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>Ucapkan perintah seperti: <em>"Tambah 10 susu UHT"</em></p><button className="voice-btn" onClick={()=>{ showToast('Voice demo — menampilkan hasil'); document.getElementById('voiceResult') && (document.getElementById('voiceResult').style.display='block') }}><span className="voice-dot" id="voiceDot" /> <span id="voiceText">Tekan untuk mulai merekam</span></button><div id="voiceResult" style={{marginTop:12,padding:12,background:'var(--bg2)',borderRadius:'var(--radius)',display:'none'}}><div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>Terdeteksi:</div><div id="voiceResultText" style={{fontWeight:600,fontSize:14,marginBottom:10}}>&quot;Tambah 10 Susu UHT 1L&quot; — Stok: 12 → 22 unit</div><div style={{display:'flex',gap:8}}><button className="btn btn-primary" onClick={()=>{ showToast('Stok berhasil diperbarui!'); document.getElementById('voiceResult').style.display='none' }}>Simpan</button><button className="btn" onClick={()=>{ document.getElementById('voiceResult').style.display='none' }}>Batal</button></div></div></div>

              <div className="card"><div className="card-header"><div className="card-title">Scan Barcode</div></div><p style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>Arahkan kamera ke barcode produk untuk input otomatis.</p><div className="scan-area" onClick={simulateScan}><div style={{fontSize:28,marginBottom:8}}>⬛</div><div style={{fontSize:13,fontWeight:500}}>Ketuk untuk buka kamera</div><div style={{fontSize:11,marginTop:4,color:'var(--text3)'}}>Mendukung QR Code dan barcode standar</div></div><div id="scanResult" style={{marginTop:12,padding:12,background:'var(--bg2)',borderRadius:'var(--radius)',display:'none'}}><div style={{fontSize:11,color:'var(--text3)'}}>Produk ditemukan:</div><div style={{fontWeight:600,fontSize:15,margin:'5px 0 3px'}}>Susu UHT 1L</div><div style={{fontSize:12,color:'var(--text3)'}}>Stok saat ini: 12 unit</div><div style={{display:'flex',alignItems:'center',gap:8,marginTop:10}}><button className="btn" onClick={()=>{ const i = document.getElementById('qtyIn'); i && (i.value = Math.max(1,parseInt(i.value)-1)) }}>−</button><input type="number" defaultValue={10} id="qtyIn" style={{width:55,textAlign:'center'}} /><button className="btn" onClick={()=>{ const i = document.getElementById('qtyIn'); i && (i.value = parseInt(i.value)+1) }}>+</button><button className="btn btn-primary" onClick={()=>{ showToast('Stok ditambahkan!'); document.getElementById('scanResult').style.display='none' }}>Tambah Stok</button></div></div></div>
            </div>

            <div className="full-card"><div className="card-header"><div className="card-title">Input Manual</div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto auto',gap:10,alignItems:'end'}}><div><div style={{fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Produk</div><select style={{width:'100%'}}><option>Susu UHT 1L</option><option>Minyak Goreng 2L</option></select></div><div><div style={{fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Tipe Transaksi</div><select style={{width:'100%'}}><option>Stok Masuk (+)</option><option>Stok Keluar (−)</option></select></div><div><div style={{fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Jumlah</div><input type="number" defaultValue={10} style={{width:80}} /></div><button className="btn btn-primary" style={{padding:'8px 18px'}} onClick={()=>showToast('Stok berhasil disimpan!')}>Simpan</button></div></div>
          </div>

          {/* UMKM */}
          <div className={`page ${page==='umkm'?'active':''}`} id="page-umkm">
            <div className="section-label">Mode UMKM — Tampilan Sederhana</div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:16}}>
              <div style={{padding:16,background:'#fff4f0',borderRadius:18,boxShadow:'0 12px 20px rgba(0,0,0,0.04)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#b34735',marginBottom:8}}>⚠️ Produk Perlu Restock</div>
                <div style={{fontSize:24,fontWeight:700,color:'#83241c'}}>{safeMap(umkmSummary.lowStock).length} Produk</div>
              </div>
              <div style={{padding:16,background:'#edf9f1',borderRadius:18,boxShadow:'0 12px 20px rgba(0,0,0,0.04)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#217c4f',marginBottom:8}}>💰 Profit Hari Ini</div>
                <div style={{fontSize:24,fontWeight:700,color:'#145c39'}}>{umkmCashflow.profitToday}</div>
              </div>
              <div style={{padding:16,background:'#f7f7f8',borderRadius:18,boxShadow:'0 12px 20px rgba(0,0,0,0.04)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#5a5f68',marginBottom:8}}>📦 Total Produk Aktif</div>
                <div style={{fontSize:24,fontWeight:700,color:'#333'}}>{products.length} Produk</div>
              </div>
            </div>

            <div className="two-col mb16">
              <div className="card">
                <div className="card-header"><div className="card-title">Daily Summary</div></div>
                <div style={{padding:16,display:'grid',gap:16}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>Low Stock</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
                      {safeMap(umkmSummary.lowStock).map((item, index) => (
                        <span key={index} style={{padding:'6px 12px',borderRadius:9999,background:'#f2f3f5',color:'#343a40',fontSize:12,fontWeight:600}}>{item}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>Slow Moving</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
                      {safeMap(umkmSummary.slowMoving).map((item, index) => (
                        <span key={index} style={{padding:'6px 12px',borderRadius:9999,background:'#f2f3f5',color:'#343a40',fontSize:12,fontWeight:600}}>{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Estimated Stock Warning</div></div>
                <div style={{padding:16,display:'grid',gap:12}}>
                  {safeMap(umkmWarnings).map((warning, index) => {
                    const isUrgent = index === 0
                    return (
                      <div key={index} style={{background:'#fff1f1',padding:14,borderRadius:14,borderLeft:`4px solid ${isUrgent ? '#d94a43' : '#f0a45b'}`,display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:18}}>{isUrgent ? '🔴' : '🟠'}</span>
                        <div style={{fontSize:13,color:'#2f2f2f'}}>{warning}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="two-col mb16">
              <div className="card">
                <div className="card-header"><div className="card-title">Action Recommendation</div></div>
                <div style={{padding:16,display:'grid',gap:10}}>
                  {safeMap(umkmRecommendations).map((item, index) => (
                    <div key={index} style={{display:'flex',gap:10,alignItems:'flex-start',paddingBottom:index < umkmRecommendations.length - 1 ? 10 : 0,borderBottom:index < umkmRecommendations.length - 1 ? '1px solid var(--bg2)' : 'none'}}>
                      <span style={{fontSize:14,lineHeight:1.2,color:'var(--green)'}}>➡️</span>
                      <div style={{fontSize:13,color:'var(--text2)'}}>{item}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Quick Restock</div></div>
                <div style={{padding:16,display:'grid',gap:12}}>
                  <div style={{display:'grid',gap:8}}>
                    <div style={{fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>Produk</div>
                    <select value={restockProduct} onChange={(e)=>setRestockProduct(e.target.value)} style={{width:'100%'}}>
                      <option value="">Pilih produk...</option>
                      {safeMap(products).map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={{display:'grid',gap:8}}>
                    <div style={{fontSize:11,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>Jumlah</div>
                    <input type="number" value={restockQuantity} onChange={(e)=>setRestockQuantity(parseInt(e.target.value)||0)} style={{width:80}} />
                  </div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {[10,20,50].map((amount)=> (
                      <button key={amount} className="btn" type="button" onClick={()=>setRestockQuantity(amount)} style={{background: restockQuantity === amount ? 'var(--green)' : undefined, color: restockQuantity === amount ? 'white' : undefined}}>{`+${amount}`}</button>
                    ))}
                  </div>
                  <div style={{fontSize:12,color:'var(--text3)'}}>Estimasi stok cukup untuk 4 hari</div>
                  <button className="btn btn-primary" onClick={confirmRestock} disabled={!restockProduct || restockQuantity <= 0}>Simpan</button>
                </div>
              </div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:12,marginBottom:16}}>
              <div style={{padding:16,background:'#f4f9f5',borderRadius:18,boxShadow:'0 12px 20px rgba(0,0,0,0.04)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#2d6d44',marginBottom:8}}>💰 Cash In</div>
                <div style={{fontSize:22,fontWeight:700,color:'#145c39'}}>{umkmCashflow.cashIn}</div>
              </div>
              <div style={{padding:16,background:'#fff4f0',borderRadius:18,boxShadow:'0 12px 20px rgba(0,0,0,0.04)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#b34735',marginBottom:8}}>📉 Cash Out</div>
                <div style={{fontSize:22,fontWeight:700,color:'#d43a2b'}}>{umkmCashflow.cashOut}</div>
              </div>
              <div style={{padding:16,background:'#edf9f1',borderRadius:18,boxShadow:'0 12px 20px rgba(0,0,0,0.04)'}}>
                <div style={{fontSize:12,fontWeight:700,color:'#1f6c44',marginBottom:8}}>📈 Profit</div>
                <div style={{fontSize:22,fontWeight:700,color:'#145c39'}}>{umkmCashflow.profitToday}</div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><div className="card-title">Cashflow Comparison</div></div>
              <div style={{padding:16,display:'grid',gap:14}}>
                <div style={{display:'grid',gap:6}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text3)'}}><span>Cash In</span><span>{umkmCashflow.cashIn}</span></div>
                  <div style={{height:12,borderRadius:9999,background:'#e6f4ec',overflow:'hidden'}}><div style={{width:'80%',height:'100%',background:'#1d9e75'}} /></div>
                </div>
                <div style={{display:'grid',gap:6}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text3)'}}><span>Cash Out</span><span>{umkmCashflow.cashOut}</span></div>
                  <div style={{height:12,borderRadius:9999,background:'#ffe9e7',overflow:'hidden'}}><div style={{width:'38%',height:'100%',background:'#d94a43'}} /></div>
                </div>
                <div style={{display:'grid',gap:6}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--text3)'}}><span>Profit</span><span>{umkmCashflow.profitToday}</span></div>
                  <div style={{height:12,borderRadius:9999,background:'#e6f4ec',overflow:'hidden'}}><div style={{width:'52%',height:'100%',background:'#1d9e75'}} /></div>
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
                <ProductForm product={editingProduct} onSubmit={editProduct} onCancel={()=>setShowEditModal(false)} />
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
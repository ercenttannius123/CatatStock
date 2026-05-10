import React, { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
import AuthPage from './AuthPage'
Chart.register(...registerables)

const pages = ['dashboard','stok','prediksi','restock','slowmoving','cashflow','input','umkm']

export default function App(){
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [page, setPage] = useState('dashboard')
  const [umkmMode, setUmkmMode] = useState(false)
  const [toast, setToast] = useState('')
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

  if (!isLoggedIn) {
    return <AuthPage onLogin={() => setIsLoggedIn(true)} />
  }

  useEffect(() => {
    // Disabled chart for debugging
    /*
    if (trendRef.current) {
      if (trendChartRef.current) {
        try { trendChartRef.current.destroy() } catch(e){}
        trendChartRef.current = null
      }
      trendChartRef.current = new Chart(trendRef.current, {
        type: 'line',
        data: {
          labels: ['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'],
          datasets: [
            {
              label: 'Total Terjual',
              data: [42,58,51,73,88,105,91],
              borderColor: '#1D9E75',
              backgroundColor: 'rgba(29,158,117,0.07)',
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 4,
              pointBackgroundColor: '#1D9E75',
              pointBorderColor: 'white',
              pointBorderWidth: 2
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { font: { size: 11 } } },
            y: { ticks: { font: { size: 11 } } }
          }
        }
      })
    }

    if (roiRef.current) {
      if (roiChartRef.current) {
        try { roiChartRef.current.destroy() } catch(e){}
        roiChartRef.current = null
      }
      roiChartRef.current = new Chart(roiRef.current, {
        type: 'bar',
        data: {
          labels: ['Minuman','Sembako','Snack','Kebersihan'],
          datasets: [
            {
              data: [42,28,55,31],
              backgroundColor: ['#5DCAA5','#378ADD','#EF9F27','#D85A30'],
              borderRadius: 4,
              borderSkipped: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { font: { size: 10 } } },
            y: { ticks: { font: { size: 10 }, callback: (v) => v + '%' } }
          }
        }
      })
    }
    */
  }, [])

  // cleanup charts on unmount
  // useEffect(() => {
  //   return () => {
  //     if (trendChartRef.current) {
  //       try { trendChartRef.current.destroy() } catch(e){}
  //       trendChartRef.current = null
  //     }
  //     if (roiChartRef.current) {
  //       try { roiChartRef.current.destroy() } catch(e){}
  //       roiChartRef.current = null
  //     }
  //   }
  // }, [])

  useEffect(()=>{
    if (!toast) return
    const id = setTimeout(()=>setToast(''),2200)
    return ()=>clearTimeout(id)
  },[toast])

  function showToast(msg){ setToast(msg) }

  function toggleUMKM(e){ setUmkmMode(e.target.checked); if (e.target.checked) setPage('umkm') }

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

  return (
    <div className="app">
      <div>Dashboard Loaded Successfully</div>
    </div>
  )
        <div className="logo">
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
              <label className="toggle">
                <input type="checkbox" checked={umkmMode} onChange={toggleUMKM} />
                <div className="toggle-track"></div>
                <div className="toggle-thumb"></div>
              </label>
            </div>
            <div className="user-badge">Toko Maju Jaya</div>
          </div>
        </div>

        <div className="content">
          {/* DASHBOARD */}
          <div className={`page ${page==='dashboard'?'active':''}`} id="page-dashboard">
            <div className="section-label">Ringkasan Hari Ini</div>
            <div className="metrics-grid mb16">
              <div className="metric-card"><div className="metric-label">Total Produk</div><div className="metric-value">48</div><div className="metric-sub">aktif di sistem</div></div>
              <div className="metric-card"><div className="metric-label">Stok Kritis</div><div className="metric-value" style={{color:'var(--red)'}}>3</div><div className="metric-sub">perlu restock segera</div></div>
              <div className="metric-card"><div className="metric-label">Produk Tidak Laku</div><div className="metric-value" style={{color:'var(--amber)'}}>4</div><div className="metric-sub">lebih dari 30 hari</div></div>
              <div className="metric-card"><div className="metric-label">Modal di Stok</div><div className="metric-value" style={{fontSize:18}}>Rp 12,4jt</div><div className="metric-sub" style={{color:'var(--green-dark)'}}>+2,1% vs minggu lalu</div></div>
            </div>

            <div className="two-col mb16">
              <div className="card">
                <div className="card-header"><div className="card-title">Stok Hampir Habis</div><span className="badge bd">3 produk</span></div>
                <div className="prod-row"><div className="prod-icon">🥛</div><div style={{flex:1}}><div className="prod-name">Susu UHT 1L</div><div className="stock-bar"><div className="stock-fill" style={{width:'12%',background:'#E24B4A'}}/></div><div className="prod-meta">12 unit tersisa</div></div><span className="badge bd">Habis 2 hari</span></div>
                <div className="prod-row"><div className="prod-icon">🍳</div><div style={{flex:1}}><div className="prod-name">Minyak Goreng 2L</div><div className="stock-bar"><div className="stock-fill" style={{width:'22%',background:'#EF9F27'}}/></div><div className="prod-meta">22 unit tersisa</div></div><span className="badge bw">Habis 5 hari</span></div>
                <div className="prod-row"><div className="prod-icon">🍫</div><div style={{flex:1}}><div className="prod-name">Cokelat Batang 100g</div><div className="stock-bar"><div className="stock-fill" style={{width:'18%',background:'#EF9F27'}}/></div><div className="prod-meta">9 unit tersisa</div></div><span className="badge bw">Habis 6 hari</span></div>
              </div>

              <div className="card">
                <div className="card-header"><div className="card-title">Saran Restock Hari Ini</div><button className="btn" onClick={()=>setPage('restock')}>Lihat Semua</button></div>
                <div className="restock-row"><div className="prod-icon">🥛</div><div style={{flex:1}}><div className="prod-name">Susu UHT 1L</div><div className="prod-meta">Rata terjual 6/hari · Habis 2 hari lagi</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:600,fontSize:14}}>48 unit</div><div style={{fontSize:10,color:'var(--text3)'}}>stok 8 hari</div></div></div>
                <div className="restock-row"><div className="prod-icon">🍳</div><div style={{flex:1}}><div className="prod-name">Minyak Goreng 2L</div><div className="prod-meta">Tren naik +40% · Habis 5 hari lagi</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:600,fontSize:14}}>30 unit</div><div style={{fontSize:10,color:'var(--text3)'}}>stok 7 hari</div></div></div>
                <div className="restock-row"><div className="prod-icon">🍫</div><div style={{flex:1}}><div className="prod-name">Cokelat Batang 100g</div><div className="prod-meta">Fast-moving · Sering habis malam hari</div></div><div style={{textAlign:'right'}}><div style={{fontWeight:600,fontSize:14}}>60 unit</div><div style={{fontSize:10,color:'var(--text3)'}}>stok 10 hari</div></div></div>
              </div>
            </div>

            <div className="full-card">
              <div className="card-header"><div className="card-title">Tren Penjualan 7 Hari Terakhir</div><div style={{display:'flex',gap:14,fontSize:11,color:'var(--text3)'}}><span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:3,background:'#1D9E75',display:'inline-block',borderRadius:2}}></span>Total Terjual</span></div></div>
              <div className="chart-wrap" style={{height:180}}><canvas ref={trendRef} id="trendChart"></canvas></div>
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
                    {getFilteredProducts().map(product => {
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

          {/* PREDIKSI */}
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
            <div className="metrics-grid metrics-grid-3 mb16"><div className="metric-card"><div className="metric-label">Tidak Laku 30+ Hari</div><div className="metric-value" style={{color:'var(--amber)'}}>4 produk</div></div></div>
            <div className="full-card"><div className="card-header"><div className="card-title">Produk Bermasalah</div></div><div className="table-wrap"><table><thead><tr><th>Produk</th><th>Hari Tidak Terjual</th><th>Stok</th><th>Nilai Modal</th><th>Label</th><th>Saran Tindakan</th></tr></thead><tbody><tr><td className="tname">Kopi Sachet 20s</td><td>87 hari</td><td>45 unit</td><td>Rp 1.080.000</td><td><span className="badge bd">90+ hari</span></td><td><span style={{fontSize:11,color:'var(--amber)'}}>Diskon atau bundling segera</span></td></tr></tbody></table></div></div>
          </div>

          {/* CASHFLOW */}
          <div className={`page ${page==='cashflow'?'active':''}`} id="page-cashflow">
            <div className="section-label">Insight Stok dan Cashflow</div>
            <div className="metrics-grid mb16"><div className="metric-card"><div className="metric-label">Total Nilai Stok</div><div className="metric-value" style={{fontSize:18}}>Rp 12,4jt</div></div></div>
            <div className="two-col mb16"><div className="card"><div className="card-header"><div className="card-title">Penyerapan Modal per Produk</div></div><div className="cf-row"><div className="cf-name">Beras 5kg</div><div className="cf-bar-wrap"><div className="cf-bar" style={{width:'76%',background:'#1D9E75'}}></div></div><div className="cf-val">Rp 9,4jt</div></div></div><div className="card"><div className="card-header"><div className="card-title">ROI per Kategori</div></div><div style={{height:150}} className="chart-wrap"><canvas ref={roiRef} id="roiChart"></canvas></div></div></div>
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
            <div className="umkm-card">
              <div className="umkm-heading">Status Stok</div>
              <div className="umkm-value" style={{color:'#A32D2D'}}>{getCriticalProducts().length} produk perlu dibeli sekarang!</div>
              <div className="umkm-desc">{getCriticalProducts().map(p => p.name).join(', ')}</div>
              <button className="btn btn-primary btn-lg" style={{marginTop:14}} onClick={()=>setShowRestockModal(true)}>Restock Now</button>
            </div>
            <div className="full-card" style={{marginTop:20}}>
              <div className="card-header"><div className="card-title">Quick Restock</div></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr auto auto',gap:10,alignItems:'end'}}>
                <div>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Produk</div>
                  <select value={restockProduct} onChange={(e)=>setRestockProduct(e.target.value)} style={{width:'100%'}}>
                    <option value="">Pilih produk...</option>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:0.05+'em'}}>Jumlah</div>
                  <input type="number" value={restockQuantity} onChange={(e)=>setRestockQuantity(parseInt(e.target.value)||0)} style={{width:80}} />
                </div>
                <button className="btn btn-primary" onClick={confirmRestock} disabled={!restockProduct || restockQuantity <= 0}>Simpan</button>
              </div>
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
              {getCriticalProducts().map(product => (
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
  )
}

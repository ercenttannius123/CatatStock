import React, { useEffect, useRef, useState } from 'react'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

const pages = ['dashboard','stok','prediksi','restock','slowmoving','cashflow','input','umkm']

export default function App(){
  const [page, setPage] = useState('dashboard')
  const [umkmMode, setUmkmMode] = useState(false)
  const [toast, setToast] = useState('')
  const trendRef = useRef(null)
  const roiRef = useRef(null)
  const trendChartRef = useRef(null)
  const roiChartRef = useRef(null)

  useEffect(() => {
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
  }, [])

  // cleanup charts on unmount
  useEffect(() => {
    return () => {
      if (trendChartRef.current) {
        try { trendChartRef.current.destroy() } catch(e){}
        trendChartRef.current = null
      }
      if (roiChartRef.current) {
        try { roiChartRef.current.destroy() } catch(e){}
        roiChartRef.current = null
      }
    }
  }, [])

  useEffect(()=>{
    if (!toast) return
    const id = setTimeout(()=>setToast(''),2200)
    return ()=>clearTimeout(id)
  },[toast])

  function showToast(msg){ setToast(msg) }

  function toggleUMKM(e){ setUmkmMode(e.target.checked); if (e.target.checked) setPage('umkm') }

  function simulateScan(){ showToast('Barcode terdeteksi: 8993003800102') }

  function filterTable(val){
    const t = document.getElementById('produkTable')
    if (!t) return
    const q = val.toLowerCase()
    Array.from(t.querySelectorAll('tbody tr')).forEach(r=>{ r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none' })
  }

  return (
    <div className="app">
      <div className="sidebar">
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

          {/* STOCK PAGE */}
          <div className={`page ${page==='stok'?'active':''}`} id="page-stok">
            <div className="full-card">
              <div className="card-header"><div className="card-title">Semua Produk</div><div style={{display:'flex',gap:8,alignItems:'center'}}> <input type="text" placeholder="Cari produk..." style={{width:160}} onInput={(e)=>filterTable(e.target.value)} /> <button className="btn btn-primary" onClick={()=>showToast('Fitur tambah produk segera hadir!')}>+ Tambah Produk</button></div></div>
              <div className="table-wrap">
                <table id="produkTable">
                  <thead><tr><th>Nama Produk</th><th>Kategori</th><th>Stok</th><th>Harga Beli</th><th>Nilai Stok</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    <tr><td className="tname">Susu UHT 1L</td><td>Minuman</td><td>12</td><td>Rp 8.500</td><td>Rp 102.000</td><td><span className="badge bd">Kritis</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Susu UHT 1L')}>Edit</button></td></tr>
                    <tr><td className="tname">Minyak Goreng 2L</td><td>Sembako</td><td>22</td><td>Rp 28.000</td><td>Rp 616.000</td><td><span className="badge bw">Menipis</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Minyak Goreng 2L')}>Edit</button></td></tr>
                    <tr><td className="tname">Cokelat Batang 100g</td><td>Snack</td><td>9</td><td>Rp 12.000</td><td>Rp 108.000</td><td><span className="badge bw">Menipis</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Cokelat Batang 100g')}>Edit</button></td></tr>
                    <tr><td className="tname">Beras 5kg</td><td>Sembako</td><td>145</td><td>Rp 65.000</td><td>Rp 9.425.000</td><td><span className="badge bs">Aman</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Beras 5kg')}>Edit</button></td></tr>
                    <tr><td className="tname">Sabun Mandi</td><td>Kebersihan</td><td>87</td><td>Rp 5.500</td><td>Rp 478.500</td><td><span className="badge bs">Aman</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Sabun Mandi')}>Edit</button></td></tr>
                    <tr><td className="tname">Kopi Sachet 20s</td><td>Minuman</td><td>45</td><td>Rp 24.000</td><td>Rp 1.080.000</td><td><span className="badge bg">Tidak Laku</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Kopi Sachet')}>Edit</button></td></tr>
                    <tr><td className="tname">Deterjen 1kg</td><td>Kebersihan</td><td>34</td><td>Rp 18.000</td><td>Rp 612.000</td><td><span className="badge bg">Slow Moving</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Deterjen')}>Edit</button></td></tr>
                    <tr><td className="tname">Gula Pasir 1kg</td><td>Sembako</td><td>60</td><td>Rp 15.000</td><td>Rp 900.000</td><td><span className="badge bs">Aman</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Gula')}>Edit</button></td></tr>
                    <tr><td className="tname">Sirup Rasa Jeruk</td><td>Minuman</td><td>18</td><td>Rp 15.000</td><td>Rp 270.000</td><td><span className="badge bg">Slow Moving</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Sirup')}>Edit</button></td></tr>
                    <tr><td className="tname">Tisu Wajah 100s</td><td>Rumah Tangga</td><td>24</td><td>Rp 8.000</td><td>Rp 192.000</td><td><span className="badge bg">Slow Moving</span></td><td><button className="btn" onClick={()=>showToast('Edit produk: Tisu')}>Edit</button></td></tr>
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
            <div className="umkm-card"><div className="umkm-heading">Status Stok</div><div className="umkm-value" style={{color:'#A32D2D'}}>3 produk perlu dibeli sekarang!</div><div className="umkm-desc">Susu UHT, Minyak Goreng, Cokelat Batang</div><button className="btn btn-primary btn-lg" style={{marginTop:14}} onClick={()=>setPage('restock')}>Lihat dan Beli Sekarang →</button></div>
          </div>

        </div>
      </div>

      <div className={`toast ${toast? 'show':''}`} id="toast">{toast}</div>
    </div>
  )
}

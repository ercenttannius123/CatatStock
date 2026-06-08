import React, { useEffect, useRef, useState } from 'react'
import categoriesFromFile from './data/categories.json'
import { Chart, registerables } from 'chart.js'
import { ResponsiveContainer, BarChart, PieChart, Pie, AreaChart, Area, Cell, Sector, XAxis, YAxis, Tooltip, CartesianGrid, Bar, Legend } from 'recharts'
import AuthPage from './AuthPage'
Chart.register(...registerables)

const API_URL = import.meta.env.VITE_API_URL || 'https://catatstock-production.up.railway.app/';

const pages = ['dashboard','stok','prediksi','restock','slowmoving','cashflow','input','monitoring']

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
  const [activeTopProductIndex, setActiveTopProductIndex] = useState(null)
  
  const [toast, setToast] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('isDarkMode') === 'true'
    } catch (e) {
      return false
    }
  })
  const [salesTab, setSalesTab] = useState('day')
  const [topProductsTab, setTopProductsTab] = useState('day')
  const trendRef = useRef(null)
  const roiRef = useRef(null)
  const trendChartRef = useRef(null)
  const roiChartRef = useRef(null)
  const modalScrollRef = useRef(null)
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
  const [runtimeError, setRuntimeError] = useState(null)
  const [prediksiKategori, setPrediksiKategori] = useState('')
  const [transactions, setTransactions] = useState([])
  const [monitoringPage, setMonitoringPage] = useState(1)
  const LOGS_PER_PAGE = 15
  const [profitTodayValue, setProfitTodayValue] = useState(null)
  const [profitTodayRevenue, setProfitTodayRevenue] = useState(null)
  const [profitTab, setProfitTab] = useState('day')
  const [inputProductId, setInputProductId] = useState('')
  const [inputTxType, setInputTxType] = useState('out')
  const [inputQty, setInputQty] = useState(1)
  const [barcodeValue, setBarcodeValue] = useState('')
  const [scanQty, setScanQty] = useState(1)
  const [scanType, setScanType] = useState('out')
  

  const cashInVal = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.total_price, 0)
  const cashOutVal = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.total_price, 0)

  const scrollModal = (amount) => {
    if (modalScrollRef.current) {
      modalScrollRef.current.scrollBy({ top: amount, behavior: 'smooth' })
    }
  }
  const netVal = cashInVal - cashOutVal
  const cashflowData = {
    cashIn: `Rp ${Math.round(cashInVal).toLocaleString()}`,
    cashOut: `Rp ${Math.round(cashOutVal).toLocaleString()}`,
    net: `${netVal >= 0 ? '+' : ''}Rp ${Math.round(netVal).toLocaleString()}`
  }

  useEffect(()=>{
    if (!isLoggedIn) { setProducts([]); setTransactions([]); return }
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
        const isLikelyUrl = (s) => {
          if (!s || typeof s !== 'string') return false
          const t = s.trim()
          if (/^<a\s+/i.test(t)) return true
          if (/^data:image\//i.test(t)) return true
          if (/^(https?:)?\/\//i.test(t)) return true
          if (t.startsWith('/')) return true
          if (/\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(t)) return true
          // fallback: contains a slash and a dot (path-like)
          return t.includes('/') && t.includes('.')
        }

        const stripHtml = (s) => (typeof s === 'string') ? s.replace(/<[^>]*>/g, '').trim() : s
        const extractSrc = (s) => {
          if (!s || typeof s !== 'string') return s
          // match <img src="..."> or <a href="...">
          const mImg = s.match(/<img[^>]+src=["']([^"']+)["']/i)
          if (mImg && mImg[1]) return mImg[1].trim()
          const mA = s.match(/<a[^>]+href=["']([^"']+)["']/i)
          if (mA && mA[1]) return mA[1].trim()
          return s
        }

        const mapped = (Array.isArray(data) ? data : []).map(p => {
          const rawImage = p.image_emoji || (p.image && typeof p.image === 'string' ? p.image : '')
          const extracted = extractSrc(rawImage)
          const cleaned = stripHtml(extracted)
          let imageUrl = null
          if (p.image_url && typeof p.image_url === 'string' && p.image_url.trim()) imageUrl = p.image_url
          else if (isLikelyUrl(cleaned)) {
            // prepend API origin for root-relative paths
            if (cleaned.startsWith('/')) imageUrl = `${API_URL}${cleaned}`
            else imageUrl = cleaned
          } else if (p.has_image) {
            imageUrl = `${API_URL}/products/${p.id}/image`
          }
          return {
            id: p.id ? `P${String(p.id).padStart(3,'0')}` : p.id,
            rawId: p.id,
            name: p.name,
            category: p.category || 'Lainnya',
            image: cleaned || '',
            image_url: imageUrl,
            price: Math.round(p.price_buy) || 0,
            sellPrice: Math.round(p.price_sell) || Math.round(p.price_buy) || 0,
            daysNotSold: p.days_not_sold || 0,
          product_code: p.product_code || '',
            stock: p.stock || 0,
          value: (Math.round(p.price_buy) || 0) * (p.stock || 0)
          }
        })
        console.log('loaded products sample', mapped[0])
        setProducts(mapped)
        if (mapped.length > 0 && !inputProductId) {
          setInputProductId(String(mapped[0].rawId))
        }
        
      } catch (e) {
        console.error('Error loading products', e)
      }
    }
    async function fetchTransactions() {
      try {
        const res = await fetch(`${API_URL}/transactions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
        })
        if (!res.ok) {
          console.error('Failed loading transactions', res.status)
          return
        }
        const data = await res.json()
        if (cancelled) return
        setTransactions(Array.isArray(data) ? data : [])
        // fetch profit today after loading transactions
        try {
          const r = await fetch(`${API_URL}/reports/profit_today`, { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } })
          if (r.ok) {
            const jd = await r.json()
            setProfitTodayValue(typeof jd.profit === 'number' ? jd.profit : (jd.profit ? Number(jd.profit) : 0))
            setProfitTodayRevenue(typeof jd.revenue === 'number' ? jd.revenue : (jd.revenue ? Number(jd.revenue) : 0))
          } else {
            setProfitTodayValue(null)
            setProfitTodayRevenue(null)
          }
        } catch (e) {
          console.error('Failed fetching profit_today', e)
          setProfitTodayValue(null)
          setProfitTodayRevenue(null)
        }
      } catch (e) {
        console.error('Error loading transactions', e)
      }
    }
    fetchProducts()
    fetchTransactions()
    return () => { cancelled = true }
  }, [isLoggedIn])

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
      localStorage.setItem('isDarkMode', isDarkMode ? 'true' : 'false')
    } catch (e) {
      // ignore
    }
  }, [isDarkMode])

  // Temporary global error catcher to surface runtime errors in the UI
  useEffect(() => {
    function handleErr(e) {
      try { console.error('Captured error', e) } catch (ex) {}
      const msg = e && (e.message || (e.error && e.error.message)) ? (e.message || e.error.message) : String(e)
      setRuntimeError(msg)
      return false
    }
    function handleRejection(e) {
      try { console.error('Captured rejection', e) } catch (ex) {}
      const msg = e && e.reason ? (e.reason.message || String(e.reason)) : 'Unhandled rejection'
      setRuntimeError(msg)
    }
    window.addEventListener('error', handleErr)
    window.addEventListener('unhandledrejection', handleRejection)
    return () => { window.removeEventListener('error', handleErr); window.removeEventListener('unhandledrejection', handleRejection) }
  }, [])

  const totalProductsCount = products.length
  // compute AI daily boost per product (10% of aggregated AI prediction, evenly distributed)
  const aiTotalPred = (() => {
    if (!aiPrediction) return 0
    if (typeof aiPrediction === 'number') return aiPrediction
    if (Array.isArray(aiPrediction)) return aiPrediction.reduce((a,b)=>a + (typeof b === 'number' ? b : 0), 0)
    if (typeof aiPrediction === 'object') return Object.values(aiPrediction).reduce((a,b)=>a + (typeof b === 'number' ? b : 0), 0)
    return 0
  })()

  // per-category AI predictions (if available) and per-category daily boost
  const aiPredByCategory = (aiPrediction && typeof aiPrediction === 'object' && !Array.isArray(aiPrediction)) ? aiPrediction : {}
  const productsCountByCategory = products.reduce((acc, p) => { const k = p.category || 'Lainnya'; acc[k] = (acc[k]||0) + 1; return acc }, {})
  const aiDailyBoostPerCategory = {}
  Object.keys(productsCountByCategory).forEach(cat => {
    const pred = Number(aiPredByCategory[cat] || 0) || 0
    const cnt = productsCountByCategory[cat] || 1
    aiDailyBoostPerCategory[cat] = Math.round((pred * 0.1) / cnt)
  })

  const aiDailyBoostPerProduct = products.length > 0 ? Math.round((aiTotalPred * 0.1) / products.length) : 0

  // build sold counts per product for a recent window (used to compute avg sale/day)
  const windowDays = 30
  const now = new Date()
  const soldMap = {}
  transactions.forEach(t => {
    try {
      if (!t || t.type !== 'out') return
      const d = t.created_at ? new Date(t.created_at) : null
      if (!d) return
      const daysDiff = Math.floor((now - d) / (1000 * 60 * 60 * 24))
      if (daysDiff < 0 || daysDiff >= windowDays) return
      const pid = String(t.product_id !== undefined ? t.product_id : (t.product_code || t.product || ''))
      const qty = Number(t.quantity !== undefined ? t.quantity : (t.qty !== undefined ? t.qty : 1)) || 0
      soldMap[pid] = (soldMap[pid] || 0) + qty
    } catch (e) {
      // ignore malformed transaction
    }
  })

  const getAvgSaleFromHistoryOrAi = (p) => {
    const pid = String(p.rawId !== undefined ? p.rawId : p.id)
    const sold = soldMap[pid] || 0
    // historical average (per day) based on windowDays
    const histAvg = sold > 0 ? (sold / windowDays) : 0
    // prefer per-category AI boost when available
    const category = p.category || 'Lainnya'
    const aiBoostForCat = (aiDailyBoostPerCategory && aiDailyBoostPerCategory[category]) ? aiDailyBoostPerCategory[category] : (aiDailyBoostPerProduct || 0)
    const chosen = (aiBoostForCat > histAvg && aiBoostForCat > 0) ? aiBoostForCat : histAvg
    return Math.max(1, Math.round(chosen || 0))
  }

  const criticalProducts = products.filter(p => {
    const baseAvgSale = getAvgSaleFromHistoryOrAi(p)
    const avgSale = Math.max(1, baseAvgSale)
    const daysLeft = Math.max(0, Math.round((p.stock || 0) / Math.max(1, avgSale)))
    return daysLeft <= 3
  })
  const criticalCount = criticalProducts.length
  // slow-moving now determined by days not sold > 30 (from backend's days_not_sold)
  const slowMovingProducts = products.filter(p => (p.daysNotSold || 0) > 30)
  const slowMovingCount = slowMovingProducts.length
  // total modal tertahan: sum of buy price * stock for slow-moving products
  const totalModalTertahan = slowMovingProducts.reduce((s, p) => s + (((p.price || p.price === 0) ? Number(p.price) : 0) * (p.stock || 0)), 0)
  // chart data for slow-moving products (plot stock for each slow-moving product)
  const slowMovingChartData = slowMovingProducts.slice().sort((a,b)=>(b.stock||0)-(a.stock||0)).map(p => ({ name: p.name || '-', value: Number(p.stock || 0) }))
  const akanHabisProducts = products.filter(p => {
    const baseAvgSale = getAvgSaleFromHistoryOrAi(p)
    const avgSale = Math.max(1, baseAvgSale)
    const daysLeft = Math.max(0, Math.round((p.stock || 0) / Math.max(1, avgSale)))
    return daysLeft >= 4 && daysLeft <= 6
  })
  const akanHabisCount = akanHabisProducts.length
  const totalStockValue = products.reduce((s, p) => s + ((p.price || p.price === 0 ? p.price : 0) * (p.stock || 0)), 0)
  const lowStockList = products.slice().sort((a,b)=> (a.stock||0) - (b.stock||0)).slice(0,3)

  // derive categories: merge static file categories with categories found in loaded products
  const derivedCategories = Array.from(new Set(products.map(p => (p.category || '').toString().trim()).filter(Boolean)))
  const fileCats = Array.isArray(categoriesFromFile) ? categoriesFromFile.map(c=>c.toString().trim()).filter(Boolean) : []
  const allCats = Array.from(new Set([...(fileCats || []), ...derivedCategories])).sort((a,b)=> a.localeCompare(b))
  const categoriesList = ['Semua', ...allCats]

  // Derived dashboard/calculation values that depend on products/totalStockValue

  // compute estimated avg sale and days left per product, derive status (heuristic)
  const productStatus = products.map(p => {
    const avgSale = Math.max(1, getAvgSaleFromHistoryOrAi(p))
    const daysLeft = Math.max(0, Math.ceil((p.stock || 0) / Math.max(1, avgSale)))
    let status = null
    if (daysLeft <= 1) status = 'darurat'
    else if (daysLeft <= 3) status = 'menipis'
    return { id: p.id, rawId: p.rawId, name: p.name, stock: p.stock || 0, daysLeft, status }
  })
  const statusList = productStatus.filter(x => x.status)

  // If AI prediction output exists, try to derive statuses from AI predictions and merge
  let aiDerivedStatusList = []
  try {
    if (aiPrediction && Array.isArray(aiPrediction) && aiPrediction.length > 0) {
      const mapPred = {}
      aiPrediction.forEach(item => {
        const key = item.rawId || item.id || item.product_id || String(item.id || item.rawId || item.product_id)
        mapPred[String(key)] = item
      })
      aiDerivedStatusList = products.map(p => {
        const key = String(p.rawId || p.rawId === 0 ? p.rawId : p.id)
        const pred = mapPred[key]
        if (!pred) return null
        const daysLeft = pred.days_left || pred.daysLeft || pred.predicted_days || pred.days || null
        let status = pred.status || null
        if (!status && typeof daysLeft === 'number') {
          if (daysLeft <= 1) status = 'darurat'
          else if (daysLeft <= 3) status = 'menipis'
        }
        if (!status) return null
        return { id: p.id, rawId: p.rawId, name: p.name, stock: p.stock || 0, daysLeft: (typeof daysLeft === 'number' ? daysLeft : 0), status }
      }).filter(Boolean)
    }
  } catch (e) {
    console.warn('AI merge error', e)
    aiDerivedStatusList = []
  }

  // prefer AI-derived statuses when available, otherwise use heuristic statusList
  const combinedStatusList = (aiDerivedStatusList && aiDerivedStatusList.length > 0) ? aiDerivedStatusList : statusList

  const emergencyList = combinedStatusList.filter(x => x.status === 'darurat').sort((a,b)=>a.daysLeft - b.daysLeft)
  const menipisList = combinedStatusList.filter(x => x.status === 'menipis').sort((a,b)=>a.daysLeft - b.daysLeft)

  const criticalStatusItems = combinedStatusList.filter(x => x.status === 'darurat' || x.status === 'menipis').sort((a,b) => (a.daysLeft||0) - (b.daysLeft||0))

  // Compute restock need per product: restock = max(0, round(avgSale*7 - stock))
  const restockPerProduct = products.map(p => {
    const avgSale = Math.max(1, getAvgSaleFromHistoryOrAi(p))
    const restock = Math.max(0, Math.round((avgSale || 0) * 7 - (p.stock || 0)))
    return { id: p.id, restock, price: (p.price || 0) }
  })
  const totalRestock = restockPerProduct.reduce((s, r) => s + r.restock, 0)
  const potensiKehilangan = restockPerProduct.reduce((s, r) => s + r.restock * r.price, 0)

  // Build restock suggestions: prefer AI prediction output when available
  const restockSuggestions = (() => {
    try {
      const crit = Array.isArray(combinedStatusList) ? combinedStatusList : []
      if (crit.length === 0) return []
      const mapPred = {}
      if (Array.isArray(aiPrediction) && aiPrediction.length > 0) {
        aiPrediction.forEach(pred => {
          const key = String(pred.rawId || pred.id || pred.product_id || '')
          mapPred[key] = pred
        })
      }
      return crit.map(item => {
        const key = String(item.id || item.rawId || (item.rawId === 0 ? item.rawId : ''))
        const prod = products.find(p => String(p.id) === key || String(p.rawId) === key) || (products.find(p => String(p.id) === String(item.id)) || {})
        const pred = mapPred[key]
        const suggested = (pred && (pred.restock || pred.restock_qty || pred.suggested_restock || pred.restock_units)) || Math.max(0, Math.round((pred && pred.avgSale ? pred.avgSale : getAvgSaleFromHistoryOrAi(prod) || 0) * 7 - (prod.stock || 0)))
        const daysLeft = pred?.days_left || pred?.daysLeft || item.daysLeft || null
        return { id: prod.id || item.id, rawId: prod.rawId || item.rawId, name: prod.name || item.name || '—', stock: prod.stock || 0, suggested: suggested || 0, daysLeft }
      })
    } catch (e) {
      console.warn('restockSuggestions build error', e)
      return []
    }
  })()

  // Prebuild restock card elements to simplify JSX and avoid inline IIFEs
  const restockCards = (() => {
    try {
      let displaySugs = (restockSuggestions && restockSuggestions.length > 0 ? restockSuggestions : [])
      if ((combinedStatusList && combinedStatusList.length === 1) && displaySugs.length > 1) {
        displaySugs = [displaySugs[0]]
      }
      return displaySugs.map((topSug, idx) => {
        const prod = topSug ? (products.find(x => String(x.rawId) === String(topSug.rawId) || String(x.id) === String(topSug.id)) || topSug) : (lowStockList[0] || {})
        const days = topSug && topSug.daysLeft ? topSug.daysLeft : Math.max(1, Math.round(((prod && prod.stock) || 0) / Math.max(1,1)))
        const suggested = topSug && topSug.suggested ? topSug.suggested : Math.max(0, Math.round((getAvgSaleFromHistoryOrAi(prod)||0)*7 - (prod.stock||0)))
        return (
          <div className="restock-ai-card" key={String(topSug && (topSug.id || topSug.rawId) || idx)}>
            <div className="restock-ai-left">
              <div className="restock-product-icon">{renderProductIcon(prod || {},36,8)}</div>
              <div className="restock-product-info">
                <div className="restock-product-name">{prod?.name || '—'}</div>
                <div className="restock-product-meta">{prod ? `Stok ${prod.stock} · Habis dalam ${days} hari` : '-'}</div>
              </div>
            </div>
            <div className="restock-ai-center">
              <div className="restock-ai-label">Rekomendasi AI</div>
              <div className="restock-ai-value">{`${suggested} unit`}</div>
              <div className="restock-ai-sub">estimasi kebutuhan 7 hari</div>
            </div>
            <div className="restock-ai-right" />
          </div>
        )
      })
    } catch (e) {
      console.warn('restockCards build error', e)
      return []
    }
  })()

  // Top products by sales revenue (aggregate from transactions)
  const topProducts = (() => {
    try {
      const rev = {}
      transactions.forEach(t => {
        if (!t || t.type !== 'out') return
        const pid = t.product_id !== undefined ? String(t.product_id) : String(t.product_id || t.product_code || t.product || '')
        const amount = Number(t.total_price !== undefined ? t.total_price : ((t.price || 0) * (t.quantity || 0))) || 0
        const prod = products.find(p => String(p.rawId) === pid || String(p.id) === pid) || {}
        const name = t.product_name || prod.name || '—'
        if (!rev[pid]) rev[pid] = { id: pid, name, revenue: 0, image_url: prod.image_url || prod.image || '' }
        rev[pid].revenue += amount
      })
      return Object.values(rev).sort((a,b)=>b.revenue - a.revenue).slice(0,5)
    } catch (e) {
      console.warn('topProducts build error', e)
      return []
    }
  })()
  const topProductColors = ['#60A5FA', '#34D399', '#FBBF24', '#A78BFA', '#F9A8D4']
  const renderTopProductPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const percentValue = Math.round(percent * 100)
    // only show label for slices with >5% contribution
    if (percentValue <= 5) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.55
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)
    return (
      <text x={x} y={y} fill="#111827" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={13} fontWeight={700}>
        {`${percentValue}%`}
      </text>
    )
  }

  const renderActivePieShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 12} startAngle={startAngle} endAngle={endAngle} fill={fill} />
      </g>
    )
  }

  // Custom tooltip for donut slices
  const DonutTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null
    const p = payload[0]
    const value = p.value || 0
    const percent = topProductTotalRevenue ? (value / topProductTotalRevenue) * 100 : 0
    return (
      <div style={{ padding: 12, borderRadius: 12, background: '#fff', color: '#111827', boxShadow: '0 6px 18px rgba(15,23,42,0.08)', border: '1px solid rgba(17,24,39,0.06)', minWidth: 160 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>{p.payload.name}</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Rp {Math.round(value).toLocaleString('id-ID')}</div>
        <div style={{ fontSize: 12, fontWeight: 700 }}>{percent >= 1 ? `${percent.toFixed(1)}%` : `${percent.toFixed(2)}%`}</div>
      </div>
    )
  }

  // category distribution (for profit/ROI charts)
  const categorySums = {}
  products.forEach(p=>{ const k = p.category || 'Lainnya'; categorySums[k] = (categorySums[k]||0) + (p.value||0) })
  const totalForCats = Object.values(categorySums).reduce((s,v)=>s+v,0) || 1
  const profitChart = Object.entries(categorySums).map(([name,val])=>({ name, percent: Math.round(val / totalForCats * 100) }))
  const roiData = profitChart

  // keep a larger set of products here, but limit visible items in the UI to 5 with scrolling
  const modalData = products.slice().sort((a,b)=>(b.value||0)-(a.value||0)).slice(0,50).map(p=>({ name: p.name, value: `Rp ${Math.round(p.value||0).toLocaleString()}`, percent: Math.round(((p.value||0)/ (totalForCats||1)) * 100) }))

  const cashflowChart = (() => {
    const groups = {}
    transactions.forEach(t => {
      if (!t.created_at) return
      const date = new Date(t.created_at)
      const key = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
      if (!groups[key]) {
        groups[key] = { month: key, in: 0, out: 0 }
      }
      if (t.type === 'out') {
        groups[key].in += t.total_price || 0
      } else if (t.type === 'in') {
        groups[key].out += t.total_price || 0
      }
    })
    
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const parseKey = (k) => {
        const parts = k.split(' ')
        const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'Mei': 4, 'Jun': 5, 'Jul': 6, 'Agu': 7, 'Sep': 8, 'Okt': 9, 'Nov': 10, 'Des': 11 }
        return new Date(parseInt(parts[1]), months[parts[0]] || 0, 1)
      }
      return parseKey(a) - parseKey(b)
    })
    
    const chart = sortedKeys.map(k => ({
      month: k,
      in: Math.round(groups[k].in),
      out: Math.round(groups[k].out)
    }))

    if (chart.length === 0) {
      return [
        { month: 'Mar 2026', in: Math.round(totalStockValue * 0.1), out: Math.round(totalStockValue * 0.15) },
        { month: 'Apr 2026', in: Math.round(totalStockValue * 0.25), out: Math.round(totalStockValue * 0.2) },
        { month: 'Mei 2026', in: Math.round(totalStockValue * 0.4), out: Math.round(totalStockValue * 0.3) }
      ]
    }
    return chart
  })()

  // build sales trend data from transactions (use 'out' = sales, sum quantities)
  const salesData = (() => {
    const dayArr = new Array(7).fill(0)
    const weekArr = new Array(4).fill(0)
    const monthArr = new Array(12).fill(0)
    const yearArr = trendChartLabels.year.map(_ => 0)

    // helper: parse transaction date to Date
    const txDate = (t) => t && t.created_at ? new Date(t.created_at) : null

    // DAY: current week Monday..Sunday
    const now = new Date()
    const dayOfWeek = (d) => (d.getDay() + 6) % 7 // Monday=0..Sunday=6
    const monday = new Date(now)
    monday.setDate(now.getDate() - dayOfWeek(now))
    monday.setHours(0,0,0,0)

    transactions.forEach(t => {
      if (!t || t.type !== 'out') return
      const d = txDate(t)
      if (!d) return
      // compute revenue (omset) for this transaction: prefer total_price if present
      const amount = Number(t.total_price !== undefined ? t.total_price : ((t.price || 0) * (t.quantity || 0))) || 0
      // day index
      const dayIndex = Math.floor((d - monday) / (24*60*60*1000))
      if (dayIndex >= 0 && dayIndex < 7) {
        dayArr[dayIndex] += amount
      }
      // week index (last 4 weeks)
      const diffDays = Math.floor((now - d) / (24*60*60*1000))
      const weekIndex = Math.floor(diffDays / 7)
      if (weekIndex >= 0 && weekIndex < 4) {
        // weekArr[0] = this week, weekArr[1] = 1 week ago, keep order most recent first
        weekArr[3 - weekIndex] += amount
      }
      // month index (0=Jan..11=Dec of current year)
      if (d.getFullYear() === now.getFullYear()) {
        monthArr[d.getMonth()] += amount
      }
      // year index
      const yIndex = trendChartLabels.year.indexOf(String(d.getFullYear()))
      if (yIndex !== -1) {
        yearArr[yIndex] += amount
      }
    })

    // ensure arrays are numbers (no NaN)
    return { day: dayArr.map(n => Math.round(n||0)), week: weekArr.map(n=>Math.round(n||0)), month: monthArr.map(n=>Math.round(n||0)), year: yearArr.map(n=>Math.round(n||0)) }
  })()

  const currentWeekRevenue = salesData.week[3] || 0
  const previousWeekRevenue = salesData.week[2] || 0
  const weeklyRevenueChange = previousWeekRevenue === 0 ? (currentWeekRevenue === 0 ? 0 : 100) : Math.round(((currentWeekRevenue - previousWeekRevenue) / previousWeekRevenue) * 100)
  const weeklyRevenueChangeLabel = `${weeklyRevenueChange >= 0 ? '+' : ''}${weeklyRevenueChange}% vs minggu lalu`
  const weeklyRevenueChangePositive = weeklyRevenueChange >= 0
  const lastMonthRevenue = salesData.month[new Date().getMonth() - 1] || 0
  const monthlyRevenueChange = lastMonthRevenue === 0 ? (currentWeekRevenue === 0 ? 0 : 100) : Math.round(((currentWeekRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
  const monthlyRevenueChangeLabel = `${monthlyRevenueChange >= 0 ? '+' : ''}${monthlyRevenueChange}% vs bulan lalu`
  const monthlyRevenueChangePositive = monthlyRevenueChange >= 0
  const trendChartData = getLabelsForTab(salesTab, salesData).map((label, index) => ({ name: label, value: salesData[salesTab][index] || 0 }))
  const smoothedTrendChartData = trendChartData.map((item, index, array) => {
    const window = array.slice(Math.max(0, index - 1), Math.min(array.length, index + 2))
    const averageValue = Math.round(window.reduce((sum, entry) => sum + entry.value, 0) / window.length)
    return { ...item, value: averageValue }
  })

  const topProductLeaderboard = topProducts.slice(0, 5)
  const topProductTotalRevenue = Math.max(1, topProductLeaderboard.reduce((sum, item) => sum + (item.revenue || 0), 0))

  const recentActivities = transactions.slice().sort((a,b)=>{
    const da = a && a.created_at ? new Date(a.created_at) : new Date(0)
    const db = b && b.created_at ? new Date(b.created_at) : new Date(0)
    return db - da
  }).slice(0, 10)

  // compute profit per period from transactions (revenue - cost)
  const profitPeriods = (() => {
    const now = new Date()
    const isSameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
    let dayRev=0, dayCost=0, weekRev=0, weekCost=0, monthRev=0, monthCost=0, yearRev=0, yearCost=0
    transactions.forEach(t => {
      if (!t || t.type !== 'out') return
      const d = t.created_at ? new Date(t.created_at) : null
      if (!d) return
      const qty = Number(t.quantity || 0)
      const rev = Number(t.total_price !== undefined ? t.total_price : ((t.price || 0) * qty)) || 0
      // determine cost: prefer product.buy price from products list
      const prod = products.find(p => String(p.rawId) === String(t.product_id) || String(p.id) === String(t.product_id) || String(p.product_code) === String(t.product_code))
      const unitCost = (prod && (prod.price || prod.price === 0)) ? Number(prod.price) : (t.cost || 0)
      const cost = unitCost * qty

      // day (today)
      if (isSameDay(d, now)) { dayRev += rev; dayCost += cost }
      // week: last 7 days including today
      const diffDays = Math.floor((now - d) / (24*60*60*1000))
      if (diffDays >= 0 && diffDays < 7) { weekRev += rev; weekCost += cost }
      // month: same calendar month
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) { monthRev += rev; monthCost += cost }
      // year
      if (d.getFullYear() === now.getFullYear()) { yearRev += rev; yearCost += cost }
    })
    return {
      day: Math.round((dayRev - dayCost) || 0),
      week: Math.round((weekRev - weekCost) || 0),
      month: Math.round((monthRev - monthCost) || 0),
      year: Math.round((yearRev - yearCost) || 0)
    }
  })()

  // compute cash in/out/net per period from transactions
  const cashPeriods = (() => {
    const now = new Date()
    const isSameDay = (a,b) => a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
    let dayIn=0, dayOut=0, weekIn=0, weekOut=0, monthIn=0, monthOut=0, yearIn=0, yearOut=0
    transactions.forEach(t => {
      if (!t) return
      const d = t.created_at ? new Date(t.created_at) : null
      if (!d) return
      const amount = Number(t.total_price !== undefined ? t.total_price : ((t.price || 0) * (t.quantity || 0))) || 0
      // day
      if (isSameDay(d, now)) {
        if (t.type === 'out') dayIn += amount
        else if (t.type === 'in') dayOut += amount
      }
      // week (last 7 days)
      const diffDays = Math.floor((now - d) / (24*60*60*1000))
      if (diffDays >= 0 && diffDays < 7) {
        if (t.type === 'out') weekIn += amount
        else if (t.type === 'in') weekOut += amount
      }
      // month
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
        if (t.type === 'out') monthIn += amount
        else if (t.type === 'in') monthOut += amount
      }
      // year
      if (d.getFullYear() === now.getFullYear()) {
        if (t.type === 'out') yearIn += amount
        else if (t.type === 'in') yearOut += amount
      }
    })
    return {
      day: { in: Math.round(dayIn || 0), out: Math.round(dayOut || 0) },
      week: { in: Math.round(weekIn || 0), out: Math.round(weekOut || 0) },
      month: { in: Math.round(monthIn || 0), out: Math.round(monthOut || 0) },
      year: { in: Math.round(yearIn || 0), out: Math.round(yearOut || 0) }
    }
  })()

  function getLabelsForTab(tab, data) {
    const now = new Date()
    const monthNames = trendChartLabels.month
    if (tab === 'day') {
      // current week Monday..Sunday
      const d = new Date(now)
      const dayOfWeek = (d.getDay() + 6) % 7
      const monday = new Date(d)
      monday.setDate(d.getDate() - dayOfWeek)
      monday.setHours(0,0,0,0)
      return (data.day || []).map((_, i) => {
        const dd = new Date(monday)
        dd.setDate(monday.getDate() + i)
        return dd.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' })
      })
    }
    if (tab === 'week') {
      // last 4 weeks labels (start date)
      return (data.week || []).map((_, i) => {
        const start = new Date(now)
        const weeksBack = 3 - i
        start.setDate(now.getDate() - weeksBack * 7)
        const s = new Date(start)
        s.setDate(start.getDate() - ((start.getDay() + 6) % 7)) // align to Monday
        const e = new Date(s)
        e.setDate(s.getDate() + 6)
        const sStr = s.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        const eStr = e.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
        return `${sStr}–${eStr}`
      })
    }
    if (tab === 'month') {
      return (data.month || []).map((_, i) => monthNames[i] || `B${i+1}`)
    }
    // year
    return (data.year || []).map((_, i) => trendChartLabels.year[i] || String(new Date().getFullYear() - (trendChartLabels.year.length - 1 - i)))
  }

  const topProductsData = {
    day: topProducts.map(tp => {
      const now = new Date()
      const dayOfWeek = (now.getDay() + 6) % 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - dayOfWeek)
      monday.setHours(0,0,0,0)
      const arr = new Array(7).fill(0)
      transactions.forEach(t => {
        if (!t || t.type !== 'out') return
        const pid = t.product_id !== undefined ? String(t.product_id) : String(t.product_id || t.product_code || '')
        if (String(pid) !== String(tp.id)) return
        const d = t.created_at ? new Date(t.created_at) : null
        if (!d) return
        const idx = Math.floor((d - monday) / (24*60*60*1000))
        if (idx >= 0 && idx < 7) arr[idx] += Number(t.total_price !== undefined ? t.total_price : ((t.price || 0) * (t.quantity || 0))) || 0
      })
      return { name: tp.name, value: Math.max(1, Math.round((arr.reduce((s,n)=>s+n,0)||0)/1000)), image_url: tp.image_url }
    }),
    week: topProducts.map(tp => {
      const now = new Date()
      const arr = new Array(4).fill(0)
      transactions.forEach(t => {
        if (!t || t.type !== 'out') return
        const pid = t.product_id !== undefined ? String(t.product_id) : String(t.product_id || t.product_code || '')
        if (String(pid) !== String(tp.id)) return
        const d = t.created_at ? new Date(t.created_at) : null
        if (!d) return
        const diffDays = Math.floor((now - d) / (24*60*60*1000))
        const weekIndex = Math.floor(diffDays / 7)
        if (weekIndex >= 0 && weekIndex < 4) arr[3 - weekIndex] += Number(t.total_price !== undefined ? t.total_price : ((t.price || 0) * (t.quantity || 0))) || 0
      })
      return { name: tp.name, value: Math.max(1, Math.round((arr.reduce((s,n)=>s+n,0)||0)/1000)), image_url: tp.image_url }
    }),
    month: topProducts.map(tp => {
      const now = new Date()
      const arr = new Array(12).fill(0)
      transactions.forEach(t => {
        if (!t || t.type !== 'out') return
        const pid = t.product_id !== undefined ? String(t.product_id) : String(t.product_id || t.product_code || '')
        if (String(pid) !== String(tp.id)) return
        const d = t.created_at ? new Date(t.created_at) : null
        if (!d) return
        if (d.getFullYear() === now.getFullYear()) arr[d.getMonth()] += Number(t.total_price !== undefined ? t.total_price : ((t.price || 0) * (t.quantity || 0))) || 0
      })
      return { name: tp.name, value: Math.max(1, Math.round((arr.reduce((s,n)=>s+n,0)||0)/1000)), image_url: tp.image_url }
    }),
    year: topProducts.map(tp => {
      const arr = trendChartLabels.year.map(() => 0)
      transactions.forEach(t => {
        if (!t || t.type !== 'out') return
        const pid = t.product_id !== undefined ? String(t.product_id) : String(t.product_id || t.product_code || '')
        if (String(pid) !== String(tp.id)) return
        const d = t.created_at ? new Date(t.created_at) : null
        if (!d) return
        const yIndex = trendChartLabels.year.indexOf(String(d.getFullYear()))
        if (yIndex !== -1) arr[yIndex] += Number(t.total_price !== undefined ? t.total_price : ((t.price || 0) * (t.quantity || 0))) || 0
      })
      return { name: tp.name, value: Math.max(1, Math.round((arr.reduce((s,n)=>s+n,0)||0)/1000)), image_url: tp.image_url }
    })
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

  // Helper: return a short emoji or box fallback for product without usable image
  function getProductEmoji(p) {
    try {
      const s = (p && (p.image || ''))
      if (typeof s === 'string') {
        const t = s.trim()
        if (!t) return '📦'
        if (t.length <= 2) return t
        // if it looks like data URL or html or url, prefer box fallback here
        if (/^(data:image|https?:|\/|<)/i.test(t)) return '📦'
        // otherwise, if it's short enough, show it
        return t.length <= 3 ? t : '📦'
      }
    } catch (e) {}
    return '📦'
  }

  function renderProductIcon(p, size=20, radius=6) {
    if (p && p.image_url) {
      return <img src={p.image_url} alt={p.name || ''} style={{width:size,height:size,objectFit:'cover',borderRadius:radius}} />
    }
    return <span style={{fontSize:size}}>{getProductEmoji(p)}</span>
  }

  function getCategoryBadgeStyle(category) {
    const normalized = (category || '').toString().trim().toLowerCase()
    const categoryStyles = {
      beverages: { background: 'rgba(59,130,246,0.12)', color: '#2563eb' },
      'personal care': { background: 'rgba(234,88,12,0.12)', color: '#c2410c' },
      snack: { background: 'rgba(168,85,247,0.12)', color: '#7c3aed' },
      food: { background: 'rgba(16,185,129,0.12)', color: '#0f766e' },
      'frozen food': { background: 'rgba(14,165,233,0.12)', color: '#0ea5e9' },
      default: { background: 'rgba(15,23,42,0.06)', color: 'var(--text)' },
    }
    return categoryStyles[normalized] || categoryStyles.default
  }

  function TopProductsYAxisTick(props) {
    const { x, y, payload } = props
    const product = topProducts.find(tp => tp.name === payload.value) || {}
    const imageUrl = product.image_url
    return (
      <g transform={`translate(${x}, ${y - 12})`}>
        <foreignObject x={0} y={0} width={180} height={34}>
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={payload.value} style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 6, flexShrink: 0, background: 'var(--bg3)', border: '1px solid var(--border)' }} />
            ) : (
              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'rgba(16,185,129,0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)', fontSize: 14, flexShrink: 0 }}>
                {getProductEmoji(product)}
              </div>
            )}
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: 118 }}>{payload.value}</div>
          </div>
        </foreignObject>
      </g>
    )
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
      // normalize image fields (support HTML snippets, anchor tags, root-relative paths)
      const isLikelyUrl = (s) => {
        if (!s || typeof s !== 'string') return false
        const t = s.trim()
        if (/^<a\s+/i.test(t)) return true
        if (/^data:image\//i.test(t)) return true
        if (/^(https?:)?\/\//i.test(t)) return true
        if (t.startsWith('/')) return true
        if (/\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(t)) return true
        return t.includes('/') && t.includes('.')
      }
      const stripHtml = (s) => (typeof s === 'string') ? s.replace(/<[^>]*>/g, '').trim() : s
      const extractSrc = (s) => {
        if (!s || typeof s !== 'string') return s
        const mImg = s.match(/<img[^>]+src=["']([^"']+)["']/i)
        if (mImg && mImg[1]) return mImg[1].trim()
        const mA = s.match(/<a[^>]+href=["']([^"']+)["']/i)
        if (mA && mA[1]) return mA[1].trim()
        return s
      }

      const mapped = (Array.isArray(data) ? data : []).map(p => {
        const rawImage = p.image_emoji || (p.image && typeof p.image === 'string' ? p.image : '')
        const extracted = extractSrc(rawImage)
        const cleaned = stripHtml(extracted)
        let imageUrl = null
        if (p.image_url && typeof p.image_url === 'string' && p.image_url.trim()) imageUrl = p.image_url
        else if (isLikelyUrl(cleaned)) {
          if (cleaned.startsWith('/')) imageUrl = `${API_URL}${cleaned}`
          else imageUrl = cleaned
        } else if (p.has_image) {
          imageUrl = `${API_URL}/products/${p.id}/image`
        }
        return {
          id: p.id ? `P${String(p.id).padStart(3,'0')}` : p.id,
          rawId: p.id,
          name: p.name,
          category: p.category || 'Lainnya',
          image: cleaned || '',
          image_url: imageUrl,
          price: Math.round(p.price_buy) || 0,
          sellPrice: Math.round(p.price_sell) || Math.round(p.price_buy) || 0,
          product_code: p.product_code || '',
          stock: p.stock || 0,
          value: (Math.round(p.price_buy) || 0) * (p.stock || 0)
        }
      })
      setProducts(mapped)
      if (mapped.length > 0 && !inputProductId) {
        setInputProductId(String(mapped[0].rawId))
      }
      
    } catch (e) {
      console.error('Error loading products', e)
    }
  }

  async function requestPrediction(kategori) {
    try {
      setAiError(null)
      setAiLoading(true)
      setAiPrediction(null)
      // determine categories to request: if a specific category provided, use it;
      // otherwise request for all categories found in current products
      const categories = (kategori && String(kategori).trim())
        ? [kategori]
        : Array.from(new Set(products.map(p => (p.category || 'Lainnya'))))

      // fetch predictions for all categories in parallel and combine results
      const fetches = categories.map(cat => fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kategori: cat })
      }).then(async res => {
        if (!res.ok) {
          const t = await res.text().catch(()=>'')
          throw new Error(`${res.status} ${t}`)
        }
        return res.json()
      }))

      const results = await Promise.all(fetches)
      // build per-category prediction map. Server may return numeric `prediksi` or an array.
      const predByCat = {}
      results.forEach((r, idx) => {
        const cat = categories[idx] || 'Lainnya'
        if (!r) { predByCat[cat] = 0; return }
        if (Array.isArray(r.prediksi)) {
          // sum numeric entries
          predByCat[cat] = r.prediksi.reduce((s, it) => s + (typeof it === 'number' ? it : 0), 0)
        } else if (typeof r.prediksi === 'number') {
          predByCat[cat] = r.prediksi
        } else if (r.prediksi && typeof r.prediksi === 'object' && typeof r.prediksi.prediksi === 'number') {
          // sometimes wrapper
          predByCat[cat] = r.prediksi.prediksi
        } else {
          predByCat[cat] = 0
        }
      })
      setAiPrediction(predByCat)
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
          price_sell: (product.priceSell !== undefined ? product.priceSell : product.price),
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
          const newProduct = { id: newId, ...product, sellPrice: (product.priceSell !== undefined ? product.priceSell : product.price), value: product.price * product.stock }
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
            body: JSON.stringify({ name: product.name, category: product.category, image_emoji: product.image, price_buy: product.price, price_sell: (product.priceSell !== undefined ? product.priceSell : product.price), stock: product.stock })
          })
          if (res.ok) {
            await fetchProducts()
            showToast('Produk berhasil diupdate (server)')
          } else {
            // fallback local
            const updated = products.map(p => p.id === product.id ? { ...product, sellPrice: (product.priceSell !== undefined ? product.priceSell : product.price), value: product.price * product.stock } : p)
            setProducts(updated)
            showToast('Produk diupdate lokal (server tidak mendukung)')
          }
        } else {
          const updated = products.map(p => p.id === product.id ? { ...product, sellPrice: (product.priceSell !== undefined ? product.priceSell : product.price), value: product.price * product.stock } : p)
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
        showToast('Gagal melakukan restock')
      } finally {
        setShowRestockModal(false)
      }
    })()
  }

  async function fetchTransactions() {
    try {
      const res = await fetch(`${API_URL}/transactions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` }
      })
      if (!res.ok) {
        console.error('Failed loading transactions', res.status)
        return
      }
      const data = await res.json()
      const txs = Array.isArray(data) ? data : []
      setTransactions(txs)

      try {
        // compute last sale date per product from transactions (type 'out')
        const lastSaleMap = {}
        txs.forEach(t => {
          if (!t || t.type !== 'out') return
          const pid = t.product_id !== undefined ? String(t.product_id) : String(t.product_id || t.product_code || t.product || '')
          const d = t.created_at ? new Date(t.created_at) : (t.date ? new Date(t.date) : null)
          if (!d || isNaN(d.getTime())) return
          if (!lastSaleMap[pid] || lastSaleMap[pid] < d) lastSaleMap[pid] = d
        })
        const now = new Date()
        // update products state with computed daysNotSold
        setProducts(prev => prev.map(p => {
          const key = p.rawId !== undefined ? String(p.rawId) : String(p.id)
          const last = lastSaleMap[key]
          const daysNotSold = last ? Math.floor((now - last) / (24*60*60*1000)) : 9999
          return { ...p, daysNotSold }
        }))
      } catch (e) {
        console.warn('Failed computing daysNotSold', e)
      }
    } catch (e) {
      console.error('Error loading transactions', e)
    }
  }

  async function saveTransaction() {
    try {
      if (!inputProductId) {
        showToast('Pilih produk terlebih dahulu')
        return
      }
      if (!inputQty || inputQty <= 0) {
        showToast('Jumlah harus lebih besar dari 0')
        return
      }
      const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          product_id: parseInt(inputProductId),
          type: inputTxType,
          quantity: parseInt(inputQty)
        })
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Gagal menyimpan transaksi')
        return
      }
      showToast(`Transaksi ${data.product_name} berhasil disimpan!`)
      setInputQty(1)
      await fetchProducts()
      await fetchTransactions()
    } catch (e) {
      console.error('Save transaction error', e)
      showToast('Gagal menyimpan transaksi')
    }
  }

  // Quick-scan submit: find product by barcode and reuse saveTransaction flow
  async function handleScanSubmit(type) {
    try {
      if (!barcodeValue || !barcodeValue.trim()) {
        showToast('Masukkan barcode terlebih dahulu')
        return
      }
      const code = barcodeValue.trim()
      // find product by product_code or id
      const prod = products.find(p => String(p.product_code) === code || String(p.rawId) === code || String(p.id) === code)
      if (!prod) {
        showToast('Produk tidak ditemukan untuk barcode tersebut')
        return
      }
      // set manual input states and reuse saveTransaction
      setInputProductId(String(prod.rawId))
      setInputTxType(type)
      setInputQty(Math.max(1, Number(scanQty) || 1))
      // attempt to POST same as saveTransaction
      const res = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({ product_id: parseInt(prod.rawId), type: type, quantity: Math.max(1, Number(scanQty) || 1) })
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Gagal mencatat transaksi')
        return
      }
      showToast(`Transaksi ${data.product_name || prod.name} berhasil disimpan!`)
      setBarcodeValue('')
      setScanQty(1)
      await fetchProducts()
      await fetchTransactions()
    } catch (e) {
      console.error('handleScanSubmit error', e)
      showToast('Gagal memproses scan')
    }
  }

  









  function ProductForm({ product, onSubmit, onCancel, onDelete }) {
    const [formData, setFormData] = useState(product ? {
      rawId: product.rawId || null,
      id: product.id,
      name: product.name,
      category: product.category,
      image: product.image,
      product_code: product.product_code || '',
      price: product.price,
      priceSell: product.sellPrice !== undefined ? product.sellPrice : product.price,
      stock: product.stock
    } : {
      rawId: null,
      name: '',
      category: '',
      image: '',
      product_code: '',
      price: 0,
      priceSell: 0,
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
            <input type="file" accept="image/*" id="product-upload" className="product-upload-input" onChange={handleFileChange} />
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
                <p className="product-upload-subtitle">Klik untuk upload gambar produk</p>
              </>
            )}
          </div>

          <div className="product-block">
            <h4 className="product-section-title">Informasi Produk</h4>
            <div className="info-grid">
              <div className="product-field">
                <label className="product-field-label">Nama Produk</label>
                <input className="product-field-input" value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required />
              </div>

              <div className="product-field">
                <label className="product-field-label">Kategori</label>
                <select className="product-field-input" value={formData.category} onChange={e=>setFormData({...formData, category:e.target.value})}>
                  <option value="" disabled>Pilih Kategori</option>
                  {categoriesList.filter(c=>c!=='Semua').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="product-field product-field-full">
                <label className="product-field-label">Kode Produk</label>
                <input className="product-field-input" value={formData.product_code} onChange={e=>setFormData({...formData, product_code:e.target.value})} />
              </div>
            </div>
          </div>

          <div className="product-block">
            <h4 className="product-section-title">Harga & Stok</h4>
            <div className="price-stock-grid">
              <div className="product-field">
                <label className="product-field-label">Harga Beli</label>
                <input type="number" className="product-field-input" value={formData.price} onChange={e=>setFormData({...formData, price:parseInt(e.target.value)||0})} required />
              </div>

              <div className="product-field">
                <label className="product-field-label">Harga Jual</label>
                <input type="number" className="product-field-input" value={formData.priceSell} onChange={e=>setFormData({...formData, priceSell:parseInt(e.target.value)||0})} />
              </div>

              <div className="product-field">
                <label className="product-field-label">Stok</label>
                <input type="number" className="product-field-input" value={formData.stock} onChange={e=>setFormData({...formData, stock:parseInt(e.target.value)||0})} required />
              </div>
            </div>
          </div>

          <div className="product-block">
            <div className="product-summary-card product-summary-card-compact">
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
          <button type="submit" className="btn-product-save">Simpan Produk</button>
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
      {runtimeError && (
        <div style={{position:'fixed',left:12,right:12,top:12,zIndex:9999,background:'#ffefef',color:'#900',padding:12,borderRadius:6,boxShadow:'0 4px 10px rgba(0,0,0,0.12)'}}>
          <strong>Runtime error:</strong>
          <div style={{marginTop:6,whiteSpace:'pre-wrap',fontSize:13}}>{String(runtimeError)}</div>
        </div>
      )}
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
          </div>
          <div className={`nav-item ${page==='restock'?'active':''}`} onClick={()=>setPage('restock')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1.5v13M3.5 7l4.5-5.5L12.5 7"/></svg>
            <span>Saran Restock</span>
          </div>
          <div className={`nav-item ${page==='slowmoving'?'active':''}`} onClick={()=>setPage('slowmoving')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6"/><path d="M8 5v3.5l2 2"/></svg>
            <span>Stok Tidak Laku</span>
          </div>
          <div className={`nav-item ${page==='cashflow'?'active':''}`} onClick={()=>setPage('cashflow')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1" y="4.5" width="14" height="9" rx="1.5"/><path d="M4 4.5V3.5a1 1 0 011-1h6a1 1 0 011 1v1"/><circle cx="8" cy="9" r="1.5"/></svg>
            <span>Arus Kas Stok</span>
          </div>
          <div className={`nav-item ${page==='monitoring'?'active':''}`} onClick={()=>setPage('monitoring')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2" y="2" width="12" height="12" rx="2" />
              <line x1="5" y1="6" x2="11" y2="6" />
              <line x1="5" y1="9" x2="11" y2="9" />
              <line x1="5" y1="12" x2="8" y2="12" />
            </svg>
            <span>Log Pemantauan</span>
          </div>
          <div className="nav-section">Input</div>
          <div className={`nav-item ${page==='input'?'active':''}`} onClick={()=>setPage('input')}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M8 1.5v13M1.5 8h13"/></svg>
            <span>Input Cepat</span>
          </div>
        </nav>
      </div>

      <div className="main">
        <div className="topbar">
          <div className="topbar-left"><div className="page-title">{page === 'dashboard' ? 'Dashboard' : page.charAt(0).toUpperCase()+page.slice(1)}</div></div>
          <div className="topbar-right">
            
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
            <div className="dashboard-kpi-grid mb16">
              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-icon">📦</div>
                <div className="dashboard-kpi-title">Total Produk</div>
                <div className="dashboard-kpi-value">{totalProductsCount}</div>
                <div className="dashboard-kpi-sub">Aktif di sistem</div>
                <div className={`dashboard-kpi-trend ${weeklyRevenueChangePositive ? 'positive' : 'negative'}`}>
                  {weeklyRevenueChangePositive ? '↑' : '↓'} {weeklyRevenueChangeLabel}
                </div>
              </div>
              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-icon">⚠️</div>
                <div className="dashboard-kpi-title">Stok Kritis</div>
                <div className="dashboard-kpi-value">{criticalCount}</div>
                <div className="dashboard-kpi-sub">Perlu restock segera</div>
                <div className={`dashboard-kpi-trend ${criticalCount <= 3 ? 'positive' : 'negative'}`}>
                  {criticalCount <= 3 ? '↓' : '↑'} {criticalCount <= 3 ? 'Stabil' : 'Naik'}
                </div>
              </div>
              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-icon">🗄️</div>
                <div className="dashboard-kpi-title">Produk Tidak Laku</div>
                <div className="dashboard-kpi-value">{slowMovingCount}</div>
                <div className="dashboard-kpi-sub">Lebih dari 30 hari</div>
                <div className={`dashboard-kpi-trend ${slowMovingCount > 5 ? 'negative' : 'positive'}`}>
                  {slowMovingCount > 5 ? '↑' : '↓'} {slowMovingCount > 5 ? 'Meningkat' : 'Menurun'}
                </div>
              </div>
              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-icon">💼</div>
                <div className="dashboard-kpi-title">Modal di Stok</div>
                <div className="dashboard-kpi-value">Rp {totalStockValue.toLocaleString()}</div>
                <div className="dashboard-kpi-sub">Nilai persediaan</div>
                <div className="dashboard-kpi-trend positive">↑ 4% vs minggu lalu</div>
              </div>
              <div className="dashboard-kpi-card">
                <div className="dashboard-kpi-icon">📈</div>
                <div className="dashboard-kpi-title">Profit Hari Ini</div>
                <div className="dashboard-kpi-value">{profitTodayValue !== null ? `Rp ${Math.round(profitTodayValue).toLocaleString()}` : 'Rp -'}</div>
                <div className="dashboard-kpi-sub">Performa operasional</div>
                <div className={`dashboard-kpi-trend ${profitTodayValue >= 0 ? 'positive' : 'negative'}`}>
                  {profitTodayValue >= 0 ? '↑' : '↓'} {profitTodayValue >= 0 ? 'Naik' : 'Turun'}
                </div>
              </div>
            </div>

            <div className="dashboard-small-kpi-grid mb16">
              <div className="dashboard-small-kpi-card dashboard-small-kpi-critical">
                <div className="dashboard-small-kpi-icon">⚠️</div>
                <div className="dashboard-small-kpi-title">Produk Darurat</div>
                <div className="dashboard-small-kpi-value">{emergencyList.length}</div>
              </div>
              <div className="dashboard-small-kpi-card dashboard-small-kpi-neutral">
                <div className="dashboard-small-kpi-icon">💼</div>
                <div className="dashboard-small-kpi-title">Modal Tertahan</div>
                <div className="dashboard-small-kpi-value">Rp {totalStockValue.toLocaleString()}</div>
              </div>
              <div className="dashboard-small-kpi-card dashboard-small-kpi-positive">
                <div className="dashboard-small-kpi-icon">📈</div>
                <div className="dashboard-small-kpi-title">Penjualan Hari Ini</div>
                <div className="dashboard-small-kpi-value">{profitTodayRevenue !== null ? `Rp ${Math.round(profitTodayRevenue).toLocaleString()}` : 'Rp -'}</div>
              </div>
            </div>

            {/* ROW 2: Top Produk Terlaris - Pie left, Ranking right (equal height) */}
            <div className="two-col mb16 dashboard-top-products-grid">
              <div className="card dashboard-card dashboard-section-card dashboard-donut-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'stretch', height: '100%' }}>
                <div className="card-header"><div className="card-title">Top Produk Terlaris</div></div>
                <div className="donut-grid" style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                  <div className="donut-chart-wrap" style={{ flex: 1 }}>
                    <ResponsiveContainer width="100%" height={420}>
                      <PieChart>
                        <Pie
                          data={topProductLeaderboard}
                          dataKey="revenue"
                          nameKey="name"
                          innerRadius={95}
                          outerRadius={160}  
                          paddingAngle={2}
                          cornerRadius={14}
                          activeIndex={activeTopProductIndex}
                          activeShape={renderActivePieShape}
                          onMouseEnter={(_, index) => setActiveTopProductIndex(index)}
                          onMouseLeave={() => setActiveTopProductIndex(null)}
                          label={renderTopProductPieLabel}
                          labelLine={false}
                          isAnimationActive={true}
                          animationDuration={900}
                        >
                          {topProductLeaderboard.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={topProductColors[index % topProductColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} cursor={{ fill: 'rgba(16,185,129,0.06)' }} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* center stats inside donut - only show revenue value */}
                    <div className="donut-center" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                      <div className="donut-center-value">Rp {Math.round(topProductTotalRevenue).toLocaleString('id-ID')}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card dashboard-card dashboard-section-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div className="card-header"><div className="card-title">Ranking Top 5 Produk Terlaris</div></div>
                <div className="top-products-legend" style={{ marginTop: 8, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  {topProductLeaderboard.map((item, index) => {
                    const percent = ((item.revenue || 0) / topProductTotalRevenue) * 100
                    const percentLabel = percent < 1 ? `${percent.toFixed(1)}%` : `${Math.round(percent)}%`
                    return (
                      <div className="top-products-legend-item" key={item.id || item.name}>
                        <span className="legend-dot" style={{ background: topProductColors[index % topProductColors.length] }} />
                        <div className="legend-details">
                          <div className="legend-name">{item.name}</div>
                          <div className="legend-revenue">Rp {Math.round(item.revenue).toLocaleString('id-ID')}</div>
                        </div>
                        <div className="legend-percent">{percentLabel}</div>
                      </div>
                    )
                  })}
                  {topProductLeaderboard.length === 0 && <div className="empty-state">Tidak ada data top produk</div>}
                </div>
              </div>
            </div>

            {/* ROW 3: Tren Penjualan (full width, larger) */}
            <div className="dashboard-fullwidth mb16">
              <div className="card dashboard-card dashboard-section-card">
                <div className="card-header"><div className="card-title">Tren Penjualan</div></div>
                <div className="chart-summary-row">
                  <div>
                    <div className="chart-summary-label">Total penjualan minggu ini</div>
                    <div className="chart-summary-value">Rp {currentWeekRevenue.toLocaleString('id-ID')}</div>
                  </div>
                  <div className="chart-summary-groups">
                    <div className={`chart-summary-chip ${weeklyRevenueChangePositive ? 'positive' : 'negative'}`}>
                      <span>{weeklyRevenueChangePositive ? '↑' : '↓'}</span>
                      <span>{weeklyRevenueChangeLabel}</span>
                    </div>
                    <div className={`chart-summary-chip ${monthlyRevenueChangePositive ? 'positive' : 'negative'}`}>
                      <span>{monthlyRevenueChangePositive ? '↑' : '↓'}</span>
                      <span>{monthlyRevenueChangeLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="chart-area-card chart-area-card-compact">
                  {smoothedTrendChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={520}>
                      <AreaChart data={smoothedTrendChartData} margin={{ top: 18, right: 24, left: 24, bottom: 12 }}>
                      <defs>
                        <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0.06} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} interval="preserveStartEnd" minTickGap={14} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} tickFormatter={(value) => {
                        const million = value / 1000000
                        if (million >= 1) {
                          return `Rp ${Number.isInteger(million) ? million : million.toFixed(1)} jt`
                        }
                        return `Rp ${Math.round(value).toLocaleString('id-ID')}`
                      }} domain={[0, 'auto']} tickCount={6} />
                      <Tooltip cursor={{ fill: 'rgba(16,185,129,0.06)' }} contentStyle={{ borderRadius: 14, border: '1px solid rgba(17,24,39,0.08)', background: '#fff', color: '#111827' }} formatter={(value) => [`Rp ${Math.round(value).toLocaleString('id-ID')}`, 'Penjualan']} />
                      <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3.5} fill="url(#trendGradient)" fillOpacity={0.22} dot={{ r: 4 }} activeDot={{ r: 7, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                  ) : (
                    <div className="empty-state" style={{ padding: '42px 0', textAlign: 'center' }}>Tidak ada data tren penjualan</div>
                  )}
                </div>
              </div>
            </div>

            {/* ROW 4: Saran Restock Hari Ini (full width) */}
            <div className="dashboard-fullwidth mb16">
              <div className="card dashboard-card dashboard-section-card">
                <div className="card-header"><div className="card-title">Saran Restock Hari Ini</div><button className="btn btn-primary" onClick={()=>setPage('restock')}>Lihat Semua</button></div>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="compact-table modern-table fixed-table-layout">
                    <colgroup>
                      <col style={{ width: '38%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '12%' }} />
                      <col style={{ width: '14%' }} />
                      <col style={{ width: '12%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="text-left">Produk</th>
                        <th className="text-center">Tipe</th>
                        <th className="text-center">Stok Saat Ini</th>
                        <th className="text-center">Habis Dalam</th>
                        <th className="text-center">Rekomendasi</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {restockSuggestions.filter(p => Number(p.suggested || 0) > 0).map(p => {
                        const prod = products.find(x => x.id === p.id) || products.find(x => String(x.rawId) === String(p.rawId)) || p
                        const img = prod.image_url || prod.image || prod.image_emoji || ''
                        const categoryLabel = prod.category || prod.product_code || 'Tanpa Kategori'
                        const badgeStyle = getCategoryBadgeStyle(categoryLabel)
                        const status = p.status === 'darurat' ? 'Darurat' : p.status === 'menipis' ? 'Hampir Habis' : 'Aman'
                        const statusClass = p.status === 'darurat' ? 'bd' : p.status === 'menipis' ? 'bw' : 'bs'
                        return (
                          <tr key={p.id}>
                            <td className="text-left">
                              <div className="product-cell dashboard-product-card">
                                <div className="product-avatar">{img ? <img src={img} alt={prod.name} /> : renderProductIcon(prod,32,8)}</div>
                                <div className="product-content">
                                  <div className="product-name">{prod.name || p.name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="product-category-badge" style={badgeStyle}>{categoryLabel.toUpperCase()}</span>
                            </td>
                            <td className="text-center"><span className="chip chip-stock">{p.stock} unit</span></td>
                            <td className="text-center"><span className="chip chip-warning">{p.daysLeft ? `${p.daysLeft} hari` : '—'}</span></td>
                            <td className="text-center"><span className="badge badge-restock">Restock {p.suggested} Unit</span></td>
                            <td className="text-center"><span className={`badge ${statusClass}`}>{status}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ROW 5: Aktivitas Terbaru (bottom) */}
            <div className="card dashboard-card dashboard-section-card">
              <div className="card-header"><div className="card-title">Aktivitas Terbaru</div></div>
              <div className="timeline-feed" style={{ marginTop: 12 }}>
                {recentActivities.slice(0,8).map((t, idx) => {
                  const isIncoming = t.type === 'in'
                  const isAdjustment = t.type === 'adjust'
                  const label = isIncoming ? 'Stok Masuk' : isAdjustment ? 'Penyesuaian Stok' : 'Stok Keluar'
                  const amount = `${isIncoming ? '+' : isAdjustment ? '' : '-'}${t.quantity || 0} unit`
                  const time = t.created_at ? new Date(t.created_at).toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' }) : '-'
                  const date = t.created_at ? new Date(t.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short' }) : ''
                  return (
                    <div className="timeline-item" key={t.id || idx}>
                      <div className="timeline-marker">
                        <div className={`timeline-dot ${isIncoming ? 'incoming' : isAdjustment ? 'warning' : 'outgoing'}`} />
                        {idx < Math.min(recentActivities.length, 8) - 1 && <div className="timeline-line" />}
                      </div>
                      <div className="timeline-body">
                        <div className="timeline-top">
                          <div className="timeline-label">{label}</div>
                          <div className={`timeline-amount ${isIncoming ? 'positive' : isAdjustment ? 'warning' : 'negative'}`}>{amount}</div>
                        </div>
                        <div className="timeline-product">{t.product_name || 'Produk tidak dikenal'}</div>
                        <div className="timeline-footer">{time} · {date}</div>
                      </div>
                    </div>
                  )
                })}
                {recentActivities.length === 0 && <div className="empty-state">Tidak ada aktivitas terbaru</div>}
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
                      {categoriesList.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
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
                <table id="produkTable" className="compact-table">
                  <colgroup>
                    <col style={{width:'80px'}} />
                    <col style={{width:'320px'}} />
                    <col style={{width:'90px'}} />
                    <col style={{width:'100px'}} />
                    <col style={{width:'100px'}} />
                    <col style={{width:'110px'}} />
                    <col style={{width:'110px'}} />
                    <col style={{width:'100px'}} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Gambar</th>
                      <th>Produk</th>
                      <th style={{textAlign:'center'}}>Tipe</th>
                      <th>Stok</th>
                      <th>Harga Beli</th>
                      <th>Harga Jual</th>
                      <th>Nilai Stok</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeMap(getFilteredProducts()).map(product => {
                      return (
                        <tr key={product.id}>
                          <td style={{textAlign:'center'}}>
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} style={{width:56,height:56,objectFit:'cover',borderRadius:12}} />
                            ) : (
                              renderProductIcon(product,28,10)
                            )}
                          </td>
                          <td>
                            <div className="product-cell">
                              <div className="product-name-row">
                                <div className="product-name">{product.name}</div>
                              </div>
                              <div className="product-meta-row">
                                <span className="product-code-sub">#{product.product_code || product.id}</span>
                              </div>
                            </div>
                          </td>
                          <td className="product-type-cell">
                            <span className="category-badge">{product.category || 'Umum'}</span>
                          </td>
                          <td>
                            <span className={`stock-status ${product.stock <= 5 ? 'critical' : product.stock <= 20 ? 'low' : 'safe'}`}>
                              {product.stock} unit
                            </span>
                          </td>
                          <td>Rp {product.price.toLocaleString()}</td>
                          <td>Rp {product.sellPrice.toLocaleString()}</td>
                          <td>Rp {product.value.toLocaleString()}</td>
                          <td><button className="btn btn-edit btn-edit-small" onClick={()=>openEditModal(product)}><span className="edit-icon">✏️</span>Edit</button></td>
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
    <div className="section-label">🤖 AI Prediksi Stok</div>

  {/* SUMMARY CARDS */}
  <div className="metrics-grid mb16">

    <div className="metric-card">
      <div>
        <div className="metric-label">Produk Kritis</div>
        <div className="metric-value metric-danger">{criticalCount}</div>
        <div className="metric-sub">Stok &lt;= 3 hari</div>
      </div>
    </div>

    <div className="metric-card">
      <div>
        <div className="metric-label">Akan Habis (4-6 hari)</div>
        <div className="metric-value" style={{color:'#f59e0b'}}>{akanHabisCount}</div>
        <div className="metric-sub">perlu perhatian</div>
      </div>
    </div>

    <div className="metric-card">
      <div>
        <div className="metric-label">Total Restock</div>
        <div className="metric-value metric-positive">{totalRestock.toLocaleString()} unit</div>
        <div className="metric-sub">estimasi kebutuhan</div>
      </div>
    </div>

    <div className="metric-card">
      <div>
        <div className="metric-label">Potensi Kehilangan</div>
        <div className="metric-value" style={{color:'#4f46e5'}}>Rp {potensiKehilangan.toLocaleString()}</div>
        <div className="metric-sub">jika tidak restock</div>
      </div>
    </div>

  </div>

  <div style={{margin:'12px 0', display:'flex', alignItems:'center', gap:12}}>
    <div style={{fontSize:13,color:'var(--text3)'}}>Prediksi AI:</div>
    {aiLoading && <div>Meminta prediksi...</div>}
    {aiError && <div style={{color:'red'}}>Error: {aiError}</div>}
    {aiPrediction !== null && !aiLoading && (
      <div style={{fontWeight:700}}>Prediksi Berhasil!</div>
    )}
    {/* show per-category predictions when available */}
    {aiPrediction && typeof aiPrediction === 'object' && !Array.isArray(aiPrediction) && (
      <div style={{marginLeft:8, display:'flex', gap:12, flexWrap:'wrap'}}>
        {(() => {
          const exclude = new Set(['BEVERAGES','AUTOMOTIVE','MEATS'])
          return Object.keys(aiPrediction).filter(cat => !exclude.has(cat)).map(cat => (
            <div key={cat} style={{fontSize:12, color:'var(--text2)'}}>{cat}: <strong>{Math.round(Number(aiPrediction[cat]||0)).toLocaleString()}</strong></div>
          ))
        })()}
      </div>
    )}
  </div>

  <div className="full-card">

    <div className="card-header prediction-header">

      <div className="card-title">
        Prediksi Detail per Produk
      </div>

      <div style={{ display:'flex', gap:14, alignItems:'center' }}>
        <span className="badge bi" style={{fontSize:11}}>AI Prediction</span>

        <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:13}} onClick={()=>requestPrediction()}>
          Minta Prediksi
        </button>

        <button className="btn" style={{padding:'6px 14px',fontSize:13}} onClick={()=>{ navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(products.slice(0,10))); showToast('Sample produk disalin ke clipboard') }}>
          Export Laporan
        </button>
      </div>

    </div>

    <div className="table-wrap">

      <table id="prediksiTable" className="compact-table">
        <colgroup>
          <col style={{width:'90px'}} />
          <col style={{width:'260px'}} />
          <col style={{width:'12%'}} />
          <col style={{width:'12%'}} />
          <col style={{width:'14%'}} />
          <col style={{width:'14%'}} />
          <col style={{width:'10%'}} />
          <col style={{width:'6%'}} />
        </colgroup>
        <thead>
          <tr>
            <th>Gambar</th>
            <th>Produk</th>
            <th style={{textAlign:'center'}}>Tipe</th>
            <th style={{textAlign:'center'}}>Stok Saat Ini</th>
            <th>Rata-rata Jual/Hari</th>
            <th>Prediksi Habis</th>
            <th>Rekomendasi AI</th>
            <th style={{textAlign:'center'}}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            return products.map(p => {
              const avgSale = Math.max(1, getAvgSaleFromHistoryOrAi(p))
              const daysLeft = Math.max(0, Math.round((p.stock || 0) / Math.max(1, avgSale)))
              const predictionClass = daysLeft > 30 ? 'badge-safe' : daysLeft > 7 ? 'badge-warning' : 'badge-critical'
              const recommendationClass = daysLeft > 30 ? 'ai-badge-safe' : daysLeft > 7 ? 'ai-badge-warning' : 'ai-badge-critical'
              const recommendationText = daysLeft > 30 ? 'Stok Aman' : daysLeft > 7 ? 'Restock Segera' : 'Kritis'
              const actionLabel = daysLeft > 7 ? 'Detail' : 'Restock'
              const actionHandler = () => daysLeft > 7 ? openEditModal(p) : restockNow(p)
              return (
                <tr key={p.id}>
                  <td style={{textAlign:'center'}}>
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} style={{width:56,height:56,objectFit:'cover',borderRadius:12}} />
                    ) : (
                      renderProductIcon(p,28,10)
                    )}
                  </td>
                  <td>
                    <div className="prediksi-product-info">
                      <div className="product-name-row">
                        <div className="product-name">{p.name}</div>
                      </div>
                      <div className="product-meta-row">
                        <span className="product-code-sub">{p.product_code || p.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="product-type-cell">
                    <span className="category-badge">{p.category || 'Umum'}</span>
                  </td>
                  <td>
                    <span className={`stock-status ${p.stock <= 5 ? 'critical' : p.stock <= 20 ? 'low' : 'safe'}`}>
                      {p.stock} unit
                    </span>
                  </td>
                  <td>
                    <span className="badge avg-badge">{avgSale} / hari</span>
                  </td>
                  <td>
                    <span className={`badge ${predictionClass}`}>{daysLeft} hari lagi</span>
                  </td>
                  <td>
                    <span className={`ai-badge ${recommendationClass}`}>{recommendationText}</span>
                  </td>
                  <td>
                    <button type="button" className={daysLeft > 7 ? 'btn btn-edit btn-edit-small' : 'btn btn-primary btn-edit-small'} onClick={actionHandler}>
                      {actionLabel}
                    </button>
                  </td>
                </tr>
              )
            })
          })()}
        </tbody>
      </table>

    </div>

    {/* AI Prediction Engine description removed per user request */}

  </div>
</div>

          {/* RESTOCK */}
          <div className={`page ${page==='restock'?'active':''}`} id="page-restock">
            <div className="section-label">Smart Restock Suggestion</div>
            <div className="full-card">
              <div style={{display:'grid',gap:12}}>
                {restockCards}
                {(!restockSuggestions || restockSuggestions.length === 0) && (
                  <div style={{color:'var(--text2)',padding:12}}>Tidak ada saran restock dari AI saat ini.</div>
                )}
              </div>
            </div>
          </div>

          {/* SLOWMOVING */}
          <div className={`page ${page==='slowmoving'?'active':''}`} id="page-slowmoving">
            <div className="section-label">Stok Tidak Laku</div>

            <div className="metrics-grid metrics-grid-3 mb16">

              <div className="metric-card">
                <div>
                  <div className="metric-label">Produk Tidak Laku</div>
                  <div className="metric-value metric-danger">{slowMovingCount} produk</div>
                  <div className="metric-sub">lebih dari 30 hari</div>
                </div>
              </div>

              <div className="metric-card">
                <div>
                  <div className="metric-label">Total Modal Tertahan</div>
                  <div className="metric-value metric-danger">{`Rp ${Math.round(totalModalTertahan).toLocaleString()}`}</div>
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

              {/* info box removed per user request */}

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
                  Distribusi Stok Tidak Laku
                </div>
              </div>

              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={safeMap(slowMovingChartData)}
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
            <div className="section-label">Insight Stok dan Arus Kas</div>
            <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginBottom:8}}>
              <button className={`top-chart-button ${profitTab==='day' ? 'active' : ''}`} onClick={()=>setProfitTab('day')}>Hari</button>
              <button className={`top-chart-button ${profitTab==='week' ? 'active' : ''}`} onClick={()=>setProfitTab('week')}>Minggu</button>
              <button className={`top-chart-button ${profitTab==='month' ? 'active' : ''}`} onClick={()=>setProfitTab('month')}>Bulan</button>
              <button className={`top-chart-button ${profitTab==='year' ? 'active' : ''}`} onClick={()=>setProfitTab('year')}>Tahun</button>
            </div>
            <div className="metrics-grid mb16" style={{gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px'}}>
              <div className="metric-card">
                <div className="metric-label">Total Nilai Stok</div>
                <div className="metric-value" style={{fontSize:18}}>Rp {totalStockValue.toLocaleString()}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Profit</div>
                <div className="metric-value" style={{fontSize:18,color:'var(--green)'}}>
                  {profitTab === 'day' && profitTodayValue !== null
                    ? `Rp ${Math.round(profitTodayValue).toLocaleString()}`
                    : `Rp ${Math.round(profitPeriods[profitTab] || 0).toLocaleString()}`}
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Pemasukan</div>
                <div className="metric-value" style={{fontSize:18}}>{profitTab === 'day' && profitTodayRevenue !== null ? `Rp ${Math.round(profitTodayRevenue).toLocaleString()}` : `Rp ${Math.round((cashPeriods[profitTab] && cashPeriods[profitTab].in) || 0).toLocaleString()}`}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Pengeluaran</div>
                <div className="metric-value" style={{fontSize:18,color:'#e74c3c'}}>{`Rp ${Math.round((cashPeriods[profitTab] && cashPeriods[profitTab].out) || 0).toLocaleString()}`}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Arus Kas Bersih</div>
                <div className="metric-value" style={{fontSize:18,color:'var(--green)'}}>{`Rp ${Math.round(((profitTab === 'day' && profitTodayRevenue !== null ? profitTodayRevenue : (cashPeriods[profitTab] && cashPeriods[profitTab].in) || 0) - ((cashPeriods[profitTab] && cashPeriods[profitTab].out) || 0))).toLocaleString()}`}</div>
              </div>
            </div>

            <div className="two-col mb16">
              <div className="card cashflow-card">
                <div className="card-header"><div className="card-title">Penyerapan Modal per Produk</div></div>
                <div style={{display:'grid',gap:12,marginTop:12, maxHeight: 280, overflowY: 'auto', paddingRight:6}}>
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
              <div className="card cashflow-card">
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

            <div className="card mb16 cashflow-card">
              <div className="card-header"><div className="card-title">Perbandingan Arus Kas</div></div>
              <div style={{width:'100%',height:200,marginTop:16}}>
                <ResponsiveContainer width="100%" height={188}>
                  <BarChart data={cashflowChart} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="var(--text3)" />
                    <YAxis stroke="var(--text3)" tickFormatter={(value) => `Rp ${Math.round(value/1000000)}`} />
                    <Tooltip formatter={(value) => `Rp ${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="in" fill="#16a085" name="Pemasukan" />
                    <Bar dataKey="out" fill="#e74c3c" name="Pengeluaran" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card mb16 cashflow-card">
              <div className="card-header">
                <div className="card-title">Riwayat Transaksi Terkini</div>
                <span className="badge bi">{transactions.length} transaksi</span>
              </div>
              <div className="table-wrap" style={{marginTop:12}}>
                <table id="cashflowTable" className="compact-table">
                  <colgroup>
                    <col style={{width:'160px'}} />
                    <col style={{width:'320px'}} />
                    <col style={{width:'120px'}} />
                    <col style={{width:'100px'}} />
                    <col style={{width:'140px'}} />
                    <col style={{width:'120px'}} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Produk</th>
                      <th>Tipe</th>
                      <th>Jumlah</th>
                      <th>Harga</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{textAlign:'center',padding:24,color:'var(--text-secondary)'}}>
                          Belum ada transaksi tercatat. Masukkan transaksi baru di halaman Input Cepat!
                        </td>
                      </tr>
                    ) : (
                      transactions.slice(0, 15).map(t => {
                        const dateStr = new Date(t.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                        const prod = products.find(p => String(p.rawId) === String(t.product_id) || String(p.id) === String(t.product_id) || String(p.product_code) === String(t.product_code)) || {}
                        const candidate = prod.image_url || t.product_emoji || t.image || ''
                        const isImage = (s) => typeof s === 'string' && (s.startsWith && s.startsWith('data:image/') || /^(https?:)?\/\//.test(s) || /\.(jpe?g|png|gif|webp|svg|bmp)(\?|$)/i.test(s))
                        const isIn = t.type === 'in'
                        return (
                          <tr key={t.id}>
                            <td style={{fontFamily:'monospace',fontSize:12}}>{dateStr}</td>
                            <td>
                              <div className="product-cell" style={{flexDirection:'row',alignItems:'center',gap:12}}>
                                {isImage ? (
                                  <img src={candidate} alt={t.product_name} style={{width:40,height:40,objectFit:'cover',borderRadius:8}} />
                                ) : (
                                  <div style={{width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{t.product_emoji || '📦'}</div>
                                )}
                                <div style={{display:'flex',flexDirection:'column'}}>
                                  <div style={{fontWeight:700}}>{t.product_name}</div>
                                  <div className="product-code-sub" style={{fontSize:12,marginTop:6}}>{prod.product_code || prod.id || ''}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${isIn ? 'bs' : 'bd'}`}>{isIn ? 'Stok Masuk' : 'Stok Keluar'}</span>
                            </td>
                            <td>{t.quantity} unit</td>
                            <td>Rp {Math.round(t.price).toLocaleString()}</td>
                            <td style={{fontWeight:700}} className={t.type === 'out' ? 'metric-positive' : 'metric-danger'}>
                              {t.type === 'out' ? '+' : '-'}Rp {Math.round(t.total_price).toLocaleString()}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MONITORING LOGS */}
          <div className={`page ${page==='monitoring'?'active':''}`} id="page-monitoring">
            <div className="section-label">📋 Log Pemantauan Stok & Aktivitas</div>

            <div className="full-card monitoring-card">
                <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                <div className="card-title">Audit Trail & Log Aktivitas Real-time</div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn" onClick={fetchTransactions}>🔄 Refresh Log</button>
                  <button className="btn" style={{background:'#e74c3c',color:'#fff',borderColor:'#e74c3c'}} onClick={() => { if(window.confirm('Bersihkan log? Tindakan ini hanya bersifat visual untuk sesi saat ini.')) { setTransactions([]) } }}>🗑️ Clear Log</button>
                </div>
              </div>

                {/* Info banner removed per user request */}

              <div className="table-wrap" style={{marginTop:8}}>
                <table id="monitoringTable" className="compact-table monitoring-table">
                  <colgroup>
                    <col style={{width:'180px'}} />
                    <col style={{width:'320px'}} />
                    <col style={{width:'160px'}} />
                    <col style={{width:'120px'}} />
                    <col style={{width:'140px'}} />
                    <col style={{width:'110px'}} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Produk</th>
                      <th>Jenis Aktivitas</th>
                      <th>Perubahan Stok</th>
                      <th>Aktor</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{textAlign:'center',padding:32,color:'var(--text-secondary)'}}>
                          Belum ada catatan log pemantauan stok di sistem.
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const start = (monitoringPage - 1) * LOGS_PER_PAGE
                        const pageItems = transactions.slice(start, start + LOGS_PER_PAGE)
                        return pageItems.map(t => {
                          const dateStr = new Date(t.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                          const isStockIn = t.type === 'in'
                          const prod = products.find(p => String(p.rawId) === String(t.product_id) || String(p.id) === String(t.product_id) || String(p.product_code) === String(t.product_code)) || {}
                          const productImage = prod.image_url || t.product_emoji || t.image || ''
                          const productCode = prod.product_code || t.product_code || prod.id || ''

                          return (
                            <tr key={t.id}>
                              <td style={{fontFamily:'monospace',fontSize:12}}>{dateStr}</td>
                              <td>
                                <div className="product-cell" style={{flexDirection:'row',alignItems:'center',gap:12}}>
                                  {productImage && typeof productImage === 'string' ? (
                                    <img src={productImage} alt={t.product_name} style={{width:40,height:40,objectFit:'cover',borderRadius:8}} />
                                  ) : (
                                    <div style={{width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>{t.product_emoji || '📦'}</div>
                                  )}
                                  <div style={{display:'flex',flexDirection:'column'}}>
                                    <div style={{fontWeight:700}}>{t.product_name}</div>
                                    <div className="product-code-sub" style={{fontSize:12,marginTop:6}}>{productCode}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className={`badge ${isStockIn ? 'bs' : 'bd'}`}>{isStockIn ? 'Stok Masuk' : 'Stok Keluar'}</span>
                              </td>
                              <td style={{fontWeight:700}} className={isStockIn ? 'metric-positive' : 'metric-danger'}>
                                {isStockIn ? '+' : '-'}{t.quantity} unit
                              </td>
                              <td>
                                <span className="user-badge" style={{padding:'6px 10px',borderRadius:8,fontSize:12}}>
                                  {t.user_name || t.actor || authUser?.username || 'Administrator'}
                                </span>
                              </td>
                              <td>
                                <button className="btn" onClick={() => { alert(JSON.stringify(t, null, 2)) }}>
                                  Detail
                                </button>
                              </td>
                            </tr>
                          )
                        })
                      })()
                    )}
                  </tbody>
                </table>

                {/* pagination */}
                {transactions.length > LOGS_PER_PAGE && (
                  <div style={{display:'flex',justifyContent:'flex-end',gap:8,alignItems:'center',marginTop:12}}>
                    <button className="btn" disabled={monitoringPage === 1} onClick={() => setMonitoringPage(m => Math.max(1, m - 1))}>Prev</button>
                    <div style={{fontSize:13,color:'var(--text3)'}}>Halaman {monitoringPage} / {Math.max(1, Math.ceil(transactions.length / LOGS_PER_PAGE))}</div>
                    <button className="btn" disabled={monitoringPage >= Math.ceil(transactions.length / LOGS_PER_PAGE)} onClick={() => setMonitoringPage(m => Math.min(Math.ceil(transactions.length / LOGS_PER_PAGE), m + 1))}>Next</button>
                  </div>
                )}
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
                    id="scanner-file-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    onChange={async (e) => {
                      const f = e.target.files && e.target.files[0]
                      if (!f) return
                      const fd = new FormData()
                      fd.append('file', f)
                      try {
                        const r = await fetch(`${API_URL}/decode_barcode`, { method: 'POST', body: fd })
                        const jd = await r.json()
                        if (!r.ok) {
                          showToast(jd.error || 'Gagal decode barcode')
                        } else if (jd.codes && jd.codes.length > 0) {
                          setBarcodeValue(String(jd.codes[0]))
                          showToast(`Barcode terdeteksi: ${jd.codes[0]}`)
                        } else {
                          showToast('Tidak menemukan kode pada gambar')
                        }
                      } catch (err) {
                        console.error('decode upload error', err)
                        showToast('Gagal menghubungi server decode')
                      }
                    }}
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

                  {barcodeValue ? (() => {
                    const prod = products.find(p => String(p.product_code) === String(barcodeValue) || String(p.rawId) === String(barcodeValue) || String(p.id) === String(barcodeValue))
                    return (
                      <div style={{marginTop:12,borderTop:'1px solid var(--bg3)',paddingTop:12}}>
                        <div style={{display:'flex',alignItems:'center',gap:12}}>
                          <div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
                            {prod ? (
                              <>
                                <div style={{width:48,height:48,flex:'0 0 48px'}}>{renderProductIcon(prod,48,8)}</div>
                                <div style={{display:'flex',flexDirection:'column'}}>
                                  <div style={{fontWeight:700}}>{prod.name}</div>
                                  <div style={{fontSize:13,color:'var(--text3)'}}>Kode produk: {prod.product_code || prod.id}</div>
                                </div>
                              </>
                            ) : (
                              <div style={{fontSize:13,color:'var(--text3)'}}>Kode terdeteksi: {barcodeValue}</div>
                            )}
                          </div>
                          <div style={{flex:'0 0 120px',display:'flex',justifyContent:'flex-end'}}>
                            <input type="number" min={1} value={scanQty} onChange={e=>setScanQty(Math.max(1,parseInt(e.target.value)||1))} style={{width:80,padding:'8px',borderRadius:6,border:'1px solid var(--bg3)'}} />
                          </div>
                        </div>

                        <div style={{display:'flex',justifyContent:'center',gap:8,marginTop:12}}>
                          <button className="btn" onClick={()=>handleScanSubmit('in')}>Stok Masuk (+)</button>
                          <button className="btn" onClick={()=>handleScanSubmit('out')}>Stok Keluar (-)</button>
                        </div>
                      </div>
                    )
                  })() : null}

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

                    <select
                      value={inputProductId}
                      onChange={e => setInputProductId(e.target.value)}
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.rawId}>
                            {getProductEmoji(p)} {p.name}
                          </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label>Tipe Transaksi</label>

                    <select
                      value={inputTxType}
                      onChange={e => setInputTxType(e.target.value)}
                    >
                      <option value="in">
                        Stok Masuk (+)
                      </option>

                      <option value="out">
                        Stok Keluar (-)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label>Jumlah</label>

                    <input
                      type="number"
                      placeholder="10"
                      value={inputQty}
                      onChange={e => setInputQty(Math.max(1, parseInt(e.target.value) || 1))}
                    />
                  </div>

                  <button className="btn btn-primary" onClick={saveTransaction}>
                    Simpan Transaksi
                  </button>

                </div>

              </div>

            </div>
          </div>

          

          {/* MODALS */}
          {showAddModal && (
            <div className="modal-overlay" onClick={()=>setShowAddModal(false)}>
              <div className="modal modal-product" ref={modalScrollRef} onClick={(e)=>e.stopPropagation()}>
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
              <div className="modal modal-product" ref={modalScrollRef} onClick={(e)=>e.stopPropagation()}>
                <div className="modal-product-header">
                  <div className="modal-product-title">Edit Produk</div>
                  <button className="modal-product-close" onClick={()=>setShowEditModal(false)}>×</button>
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
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} style={{width:36,height:36,objectFit:'cover',borderRadius:8}} />
                        ) : (
                          renderProductIcon(product,20,8)
                        )}
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

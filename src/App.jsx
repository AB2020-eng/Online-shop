import { useEffect, useMemo, useRef, useState } from 'react'
import WebApp from '@twa-dev/sdk'
import Papa from 'papaparse'
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import Product from './Product.jsx'

function CopyNumber({ telebirrNo, bankAccount, payment, setSuccess }) {
  const [copied, setCopied] = useState(false)
  const value = payment === 'telebirr' ? telebirrNo : bankAccount
  return (
    <button
      className="btn btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setSuccess('Number Copied!')
          setTimeout(() => setCopied(false), 1500)
        } catch {}
      }}
    >
      {copied ? 'Copied ✅' : 'Copy'}
    </button>
  )
}

function Header({ cart, total, isCheckout, checkout, setIsCheckout, storeName, fmt }) {
  const location = useLocation()
  return (
    <div className="header">
      <div className="left">
        {location.pathname !== '/' && (
          <Link to="/" className="back-arrow" aria-label="Back to home">←</Link>
        )}
        <Link to="/" className="brand">
          <img src="/images/NS.jpg" alt="NOBLE SHOES" className="logo" />
          <span className="store-name">NOBLE SHOES</span>
        </Link>
      </div>
      <div className="cart-summary">
        <div className="cart-pill">
          <span className="cart-count">{cart.reduce((n, i) => n + i.qty, 0)}</span>
          <span className="cart-total">{fmt.format(total)}</span>
        </div>
        {!isCheckout ? (
          <button className="btn btn-urban-checkout" disabled={cart.length === 0} onClick={checkout}>Checkout</button>
        ) : (
          <button className="btn btn-secondary" onClick={() => setIsCheckout(false)}>Back</button>
        )}
        <div className="header-links">
          <Link to="/saved">Saved</Link>
          <Link to="/orders">My Orders</Link>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [cart, setCart] = useState([])
  const [isCheckout, setIsCheckout] = useState(false)
  const [customer, setCustomer] = useState({ name: '', contact: '', address: '' })
  const [payment, setPayment] = useState('cod')
  const [success, setSuccess] = useState('')
  const [zone, setZone] = useState('')
  const [fee, setFee] = useState(0)
  const [outCity, setOutCity] = useState('')
  const [wishlist, setWishlist] = useState(() => {
    try {
      const raw = localStorage.getItem('wishlist') || '[]'
      const ids = JSON.parse(raw)
      return Array.isArray(ids) ? ids : []
    } catch {
      return []
    }
  })
  const [ordersStatus, setOrdersStatus] = useState({})
  const storeName = useMemo(() => import.meta.env.VITE_STORE_NAME || 'NOBLE SHOES', [])
  const telebirrNo = useMemo(() => import.meta.env.VITE_TELEBIRR || '0967448402', [])
  const bankAccount = useMemo(() => import.meta.env.VITE_BANK || 'CBE 1234567890', [])
  const botToken = useMemo(() => import.meta.env.VITE_BOT_TOKEN || '', [])
  const ownerChatId = useMemo(() => import.meta.env.VITE_OWNER_CHAT_ID || '855358658', [])
  const fmt = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }), [])
  const total = useMemo(() => cart.reduce((sum, i) => sum + (parseFloat(i.price) || 0) * i.qty, 0), [cart])
  const totalWithFee = useMemo(() => total + (isCheckout ? fee : 0), [total, fee, isCheckout])
  const mainHandlerRef = useRef(null)
  const zones = useMemo(() => [
    { name: 'Bole', fee: 200, label: 'ETB 200' },
    { name: 'Addis Ketema', fee: 200, label: 'ETB 200' },
    { name: 'Arada', fee: 200, label: 'ETB 200' },
    { name: 'Kirkos', fee: 200, label: 'ETB 200' },
    { name: 'Lideta', fee: 200, label: 'ETB 200' },
    { name: 'Yeka', fee: 200, label: 'ETB 200' },
    { name: 'Nifas Silk-Lafto', fee: 200, label: 'ETB 200' },
    { name: 'Kolfe Keranio', fee: 200, label: 'ETB 200' },
    { name: 'Gullele', fee: 200, label: 'ETB 200' },
    { name: 'Akaky Kaliti', fee: 200, label: 'ETB 200' },
    { name: 'Lemi Kura', fee: 200, label: 'ETB 200' },
    { name: 'Out of Addis', fee: 0, label: 'Based on distance' }
  ], [])

  useEffect(() => {
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : undefined
    try {
      if (tg) tg.ready()
    } catch {}
    try {
      const params = tg && tg.themeParams ? tg.themeParams : {}
      const root = document.documentElement
      if (params.bg_color) root.style.setProperty('--tg-theme-bg-color', `#${params.bg_color}`)
      if (params.text_color) root.style.setProperty('--tg-theme-text-color', `#${params.text_color}`)
      if (params.button_color) root.style.setProperty('--tg-button-color', `#${params.button_color}`)
      if (params.button_text_color) root.style.setProperty('--tg-button-text-color', `#${params.button_text_color}`)
    } catch {}
    Papa.parse('/products.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = Array.isArray(results.data) ? results.data : []
        setProducts(data)
      },
      error: () => setError('Failed to load products')
    })
    Papa.parse('/orders.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const arr = Array.isArray(results.data) ? results.data : []
        const map = {}
        arr.forEach(r => {
          if (r.id) map[r.id] = r.status || 'Pending'
        })
        setOrdersStatus(map)
      }
    })
  }, [])

  useEffect(() => {
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : undefined
    if (!tg) return
    try {
      tg.MainButton.hide()
      if (!isCheckout && cart.length > 0) {
        tg.MainButton.setText(`Checkout ${fmt.format(total)}`)
        tg.MainButton.show()
        mainHandlerRef.current = () => setIsCheckout(true)
      } else {
        tg.MainButton.hide()
        mainHandlerRef.current = null
      }
    } catch {}
  }, [isCheckout, cart, total, fmt])

  useEffect(() => {
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : undefined
    if (!tg) return
    const wrapper = () => {
      try {
        const fn = mainHandlerRef.current
        if (typeof fn === 'function') fn()
      } catch {}
    }
    try {
      tg.onEvent('mainButtonClicked', wrapper)
    } catch {}
    return () => {
      try { tg.offEvent('mainButtonClicked', wrapper) } catch {}
    }
  }, [])

  const addToCart = (p, variant, qty = 1) => {
    setCart(prev => {
      const idx = prev.findIndex(i => i.id === p.id && JSON.stringify(i.variant || {}) === JSON.stringify(variant || {}))
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], qty: next[idx].qty + qty }
        return next
      }
      return [...prev, { ...p, qty, variant }]
    })
  }

  const sendOrderToOwner = async (payload) => {
    try {
      const resp = await fetch('/api/send-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok || data.ok === false) {
        const reason = data?.description || data?.data?.description || data?.error || ''
        setError(reason ? `Failed to notify owner (${reason})` : 'Failed to notify owner.')
        return
      }
    } catch (e) {
      setError('Failed to notify owner.')
    }
  }

  const sendReceiptPhoto = async (file) => {
    if (!botToken || !file) return
    const fd = new FormData()
    fd.append('chat_id', ownerChatId)
    fd.append('photo', file)
    fd.append('caption', `Payment receipt • ${customer.name || ''} • ${customer.contact || ''}`)
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: fd
      })
      setSuccess('Receipt sent')
    } catch (e) {
      setError('Failed to send receipt. Check bot token.')
    }
  }

  const toggleWishlist = (id) => {
    setWishlist(prev => {
      const has = prev.includes(id)
      const next = has ? prev.filter(x => x !== id) : [...prev, id]
      try { localStorage.setItem('wishlist', JSON.stringify(next)) } catch {}
      return next
    })
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0))
  }

  const checkout = () => {
    if (cart.length === 0) return
    setIsCheckout(true)
  }

  const buyNow = (p, variant, qty = 1) => {
    addToCart(p, variant, qty)
    setIsCheckout(true)
  }

  const placeOrder = () => {
    const name = String(customer.name || '').trim()
    const contact = String(customer.contact || '').trim()
    const address = String(customer.address || '').trim()
    const pay = String(payment || '').trim()
    if (!name || !contact || !address || !pay) {
      alert('Please complete your name, contact, address and payment method')
      return
    }
    const payload = {
      items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, variant: i.variant })),
      total: totalWithFee,
      customer: { name, contact, address },
      payment: pay,
      delivery: { zone, fee, city: zone === 'Out of Addis' ? outCity : '' }
    }
    sendOrderToOwner(payload)
    setSuccess('Order placed successfully')
    try {
      const orderId = String(Date.now())
      const raw = localStorage.getItem('orders') || '[]'
      const list = JSON.parse(raw)
      const items = cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, variant: i.variant }))
      const next = Array.isArray(list) ? [...list, { id: orderId, items, total: totalWithFee, status: 'Pending', customer, payment, delivery: { zone, fee, city: zone === 'Out of Addis' ? outCity : '' } }] : [{ id: orderId, items, total: totalWithFee, status: 'Pending', customer, payment, delivery: { zone, fee, city: zone === 'Out of Addis' ? outCity : '' } }]
      localStorage.setItem('orders', JSON.stringify(next))
    } catch {}
    setCart([])
    setIsCheckout(false)
    setCustomer({ name: '', contact: '', address: '' })
    setPayment('cod')
    setZone('')
    setFee(0)
    setOutCity('')
  }

  useEffect(() => {
    if (!success) return
    const t = setTimeout(() => setSuccess(''), 2000)
    return () => clearTimeout(t)
  }, [success])

  return (
    <BrowserRouter>
      <BackButtonManager isCheckout={isCheckout} setIsCheckout={setIsCheckout} />
      {success && (
        <div className="toast success">
          {success}
        </div>
      )}
      <Header cart={cart} total={total} isCheckout={isCheckout} checkout={checkout} setIsCheckout={setIsCheckout} storeName={storeName} fmt={fmt} />
      {!isCheckout ? (
        <>
          {error && <div className="container">{error}</div>}
          <Routes>
            <Route path="/" element={
              <div className="container">
                <div className="grid">
                  {products.map(p => (
                    <div key={p.id} className="card">
                      <Link to={`/product/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <img src={p.image_url} alt={p.name} />
                        <div className="name">{p.name}</div>
                        <div className="price">{fmt.format(parseFloat(p.price) || 0)}</div>
                      </Link>
                      <div className="actions">
                        <button className="btn btn-gold" onClick={() => { addToCart(p, {}, 1) }}>Add to cart</button>
                        {(() => {
                          const count = cart.filter(i => i.id === p.id).reduce((n, i) => n + i.qty, 0)
                          return count > 0 ? <span className="added-pill">Added: {count}</span> : null
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            } />
            <Route path="/product/:id" element={<Product products={products} addToCart={addToCart} onBuy={buyNow} fmt={fmt} wishlist={wishlist} toggleWishlist={toggleWishlist} />} />
            <Route path="/saved" element={
              <div className="container">
                <div className="summary-title">Saved</div>
                <div className="grid">
                  {products.filter(p => wishlist.includes(p.id)).map(p => (
                    <div key={p.id} className="card">
                      <Link to={`/product/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <img src={p.image_url} alt={p.name} />
                        <div className="name">{p.name}</div>
                        <div className="price">{fmt.format(parseFloat(p.price) || 0)}</div>
                      </Link>
                      <div className="actions">
                        <button className="btn btn-secondary" onClick={() => toggleWishlist(p.id)}>Remove</button>
                        <button className="btn btn-gold" onClick={() => { addToCart(p, {}, 1); setIsCheckout(true) }}>Buy Now</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            } />
            <Route path="/orders" element={
              <div className="container">
                <div className="summary-title">My Orders</div>
                <div className="grid">
                  {(() => {
                    let list = []
                    try {
                      const raw = localStorage.getItem('orders') || '[]'
                      list = JSON.parse(raw)
                    } catch {}
                    return Array.isArray(list) ? list : []
                  })().map(o => (
                    <div key={o.id} className="card">
                      <div className="name">Order #{o.id}</div>
                      <div className="price">{fmt.format(o.total || 0)}</div>
                      <div className="desc">{ordersStatus[o.id] || o.status || 'Pending'}</div>
                    </div>
                  ))}
                </div>
              </div>
            } />
          </Routes>
        </>
      ) : (
        <div className="container checkout">
          <div className="summary">
            <div className="summary-title">Order Summary</div>
            {cart.map(i => (
              <div key={i.id} className="summary-row">
                <span>{i.qty} × {i.name}{i.variant?.size ? ` · ${i.variant.size}` : ''}{i.variant?.color ? ` · ${i.variant.color}` : ''}</span>
                <span>{fmt.format((parseFloat(i.price) || 0) * i.qty)}</span>
              </div>
            ))}
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>{zone === 'Out of Addis' ? 'Based on distance' : fmt.format(fee)}</span>
            </div>
            <div className="summary-total">
              <span>Total</span>
              <span>{fmt.format(totalWithFee)}</span>
            </div>
          </div>
          <div className="form">
            <div className="form-group">
              <label>Delivery Zone</label>
              <select value={zone} onChange={e => { 
                const z = zones.find(v => v.name === e.target.value) || { name: '', fee: 0 }
                setZone(z.name); setFee(z.fee)
              }}>
                <option value="">Select area</option>
                {zones.map(z => <option key={z.name} value={z.name}>{z.name} ({z.label})</option>)}
              </select>
            </div>
            {zone === 'Out of Addis' && (
              <div className="form-group">
                <label>City</label>
                <input value={outCity} onChange={e => setOutCity(e.target.value)} placeholder="City name" />
              </div>
            )}
            <div className="form-group">
              <label>Name</label>
              <input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label>Phone number</label>
              <input value={customer.contact} onChange={e => setCustomer({ ...customer, contact: e.target.value })} placeholder="+251..." />
            </div>
            <div className="form-group">
              <label>Address</label>
              <textarea value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} placeholder="Delivery address" rows="3" />
            </div>
            <div className="form-group">
              <label>Payment Method</label>
              <div className="radio-group">
                <label className="radio">
                  <input type="radio" name="payment" value="cod" checked={payment === 'cod'} onChange={e => setPayment(e.target.value)} />
                  <span>Cash on Delivery</span>
                </label>
                <label className="radio">
                  <input type="radio" name="payment" value="telebirr" checked={payment === 'telebirr'} onChange={e => setPayment(e.target.value)} />
                  <span>Telebirr</span>
                </label>
                <label className="radio">
                  <input type="radio" name="payment" value="bank" checked={payment === 'bank'} onChange={e => setPayment(e.target.value)} />
                  <span>Bank Transfer</span>
                </label>
              </div>
            </div>
            {payment !== 'cod' && (
              <div className="payment-info">
                <div className="summary-row">
                  <span>{payment === 'telebirr' ? 'Telebirr' : 'Bank Account'}</span>
                  <span className="copy-target">{payment === 'telebirr' ? telebirrNo : bankAccount}</span>
                </div>
                <div className="actions">
                  <CopyNumber telebirrNo={telebirrNo} bankAccount={bankAccount} payment={payment} setSuccess={setSuccess} />
                </div>
                <div className="form-group">
                  <label>Upload Payment Receipt</label>
                  <input type="file" accept="image/*" onChange={async e => {
                    const f = e.target.files && e.target.files[0]
                    if (!f) return
                    sendReceiptPhoto(f)
                  }} />
                </div>
              </div>
            )}
            <div className="actions">
              <button className="btn btn-secondary" onClick={() => setIsCheckout(false)}>Back</button>
              <button className="btn btn-primary" onClick={placeOrder}>Place Order</button>
            </div>
          </div>
          <div className="store-address">
            Mexico, Debrework Building, 4th floor, No. 409
          </div>
        </div>
      )}
    </BrowserRouter>
  )
}

function BackButtonManager({ isCheckout, setIsCheckout }) {
  const location = useLocation()
  const navigate = useNavigate()
  useEffect(() => {
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : undefined
    if (!tg) return
    try {
      if (location.pathname === '/' && !isCheckout) tg.BackButton.hide()
      else tg.BackButton.show()
    } catch {}
  }, [location.pathname, isCheckout])
  useEffect(() => {
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : undefined
    if (!tg) return
    const handler = () => {
      try {
        if (location.pathname === '/' && !isCheckout) {
          tg.close()
        } else {
          setIsCheckout(false)
          navigate('/')
        }
      } catch {}
    }
    try { tg.onEvent('backButtonClicked', handler) } catch {}
    return () => { try { tg.offEvent('backButtonClicked', handler) } catch {} }
  }, [location.pathname, isCheckout, navigate, setIsCheckout])
  return null
}

export default App

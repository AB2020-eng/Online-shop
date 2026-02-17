import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import WebApp from '@twa-dev/sdk'

export default function Product({ products, addToCart, onBuy, fmt, wishlist = [], toggleWishlist }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = useMemo(() => products.find(p => String(p.id) === String(id)), [products, id])
  const imgs = useMemo(() => {
    const all = [product?.image_url, product?.image_2, product?.image_3, product?.image_4].filter(Boolean)
    if (all.length === 0 && product?.image_url) return [product.image_url, product.image_url, product.image_url, product.image_url]
    return all.length ? all : []
  }, [product])
  const [idx, setIdx] = useState(0)
  const sizes = useMemo(() => {
    const raw = product?.sizes || ''
    const list = String(raw).split(/[|,]/).map(s => s.trim()).filter(Boolean)
    return list
  }, [product])
  const colors = useMemo(() => {
    const raw = product?.colors || ''
    const list = String(raw).split(/[|,]/).map(s => s.trim()).filter(Boolean)
    return list
  }, [product])
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const sizeStockMap = useMemo(() => {
    const raw = product?.sizes_stock || ''
    const map = {}
    String(raw).split('|').forEach(pair => {
      const [k, v] = String(pair).split(':')
      const key = String(k || '').trim()
      const val = parseInt(String(v || '0').trim(), 10) || 0
      if (key) map[key] = val
    })
    return map
  }, [product])
  const selectedStock = useMemo(() => {
    if (size && sizeStockMap[size] != null) return sizeStockMap[size]
    const total = parseInt(product?.stock || '0', 10) || 0
    return total
  }, [size, sizeStockMap, product])
  const [expanded, setExpanded] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [qty, setQty] = useState(1)
  const [copied, setCopied] = useState(false)
  const colorCss = (c) => {
    const name = String(c || '').toLowerCase()
    const map = {
      blue: '#2563eb',
      red: '#ef4444',
      green: '#22c55e',
      brown: '#92400e',
      grey: '#6b7280',
      gray: '#6b7280',
      pink: '#ec4899',
      purple: '#8b5cf6',
      yellow: '#f59e0b',
      orange: '#f97316',
      white: '#ffffff',
      black: '#000000'
    }
    if (name in map) return map[name]
    if (/^#|rgb|hsl/i.test(c)) return c
    return '#1f1f1f'
  }

  if (!product) {
    return (
      <div className="container">
        <div className="summary-title">Product not found</div>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Back</button>
      </div>
    )
  }

  const next = () => setIdx(i => (i + 1) % imgs.length)
  const prev = () => setIdx(i => (i - 1 + imgs.length) % imgs.length)

  return (
    <div className="container product">
      <div className="gallery">
        <div className="image-main">
          <img src={imgs[idx]} alt={product.name} onClick={() => setExpanded(true)} />
          {imgs.length > 1 && (
            <div className="slider">
              <button className="btn btn-secondary" onClick={prev}>◀</button>
              <div className="dots">
                {imgs.map((_, i) => (
                  <button
                    key={i}
                    className={`dot ${i === idx ? 'active' : ''}`}
                    onClick={() => setIdx(i)}
                  />
                ))}
              </div>
              <button className="btn btn-secondary" onClick={next}>▶</button>
            </div>
          )}
        </div>
      </div>
      <div className="details">
        <div className="name">{product.name}</div>
        <div className="price">{fmt.format(parseFloat(product.price) || 0)}</div>
        {selectedStock > 0 && (
          <div className="instock"><span className="dot"></span> In Stock</div>
        )}
        <div className="desc">{product.description}</div>
        <div className="actions">
          <button className="btn btn-secondary" onClick={() => toggleWishlist && toggleWishlist(product.id)}>{wishlist.includes(product.id) ? '♥ Saved' : '♡ Save'}</button>
          <button className="btn btn-secondary" onClick={() => {
            const url = window.location.href
            const tryCopy = async () => {
              try {
                await navigator.clipboard.writeText(url)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              } catch {}
            }
            tryCopy().then(() => {
              try {
                if (navigator.share) {
                  navigator.share({ title: product.name, url })
                } else if (WebApp.openLink) {
                  WebApp.openLink(url)
                }
              } catch {}
            })
          }}>{copied ? 'Link Copied ✅' : 'Share'}</button>
        </div>
        {!!sizes.length && (
          <div className="variants">
            <div className="variant-title">Size</div>
            <div className="size-list">
              {sizes.map(s => (
                <button
                  key={s}
                  className={`size-option ${size === s ? 'selected' : ''} ${sizeStockMap[s] === 0 ? 'disabled' : ''}`}
                  disabled={sizeStockMap[s] === 0}
                  onClick={() => setSize(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {!!colors.length && (
          <div className="variants">
            <div className="variant-title">Color</div>
            <div className="color-list">
              {colors.map(c => (
                <button
                  key={c}
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: colorCss(c) }}
                  onClick={() => setColor(c)}
                  title={c}
                >
                </button>
              ))}
            </div>
          </div>
        )}
        {selectedStock > 0 && selectedStock < 3 && (
          <div className="limited">Only {selectedStock} left!</div>
        )}
        <div className="qty">
          <button className="btn btn-secondary" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
          <input className="qty-input" type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))} />
          <button className="btn btn-secondary" onClick={() => setQty(q => q + 1)}>+</button>
        </div>
        <div className="actions">
          <button className="btn btn-gold" onClick={() => addToCart(product, { size, color }, qty)}>Add to cart</button>
          <button className="btn btn-secondary" onClick={() => onBuy ? onBuy(product, { size, color }, qty) : navigate('/')} >Go to checkout</button>
          <button className="btn btn-secondary" onClick={() => navigate('/')}>Back</button>
        </div>
      </div>
      {expanded && (
        <div className="overlay" onClick={() => setExpanded(false)}>
          <img
            src={imgs[idx]}
            alt={product.name}
            className={`modal-image ${zoom ? 'zoom' : ''}`}
            onClick={(e) => { e.stopPropagation(); setZoom(z => !z) }}
          />
        </div>
      )}
    </div>
  )
}

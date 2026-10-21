import React, { useEffect, useMemo, useState } from 'react';
import { aiRequest, imageUrl, money, request } from './api.js';

const categories = ['All crafts', 'Pottery', 'Jewellery', 'Textiles', 'Woodwork', 'Home décor', 'Art'];
const categoryIcons = { Pottery: '◒', Jewellery: '✳', Textiles: '⌁', Woodwork: '⌂', 'Home décor': '❋', Art: '▧' };

function App() {
  const [page, setPage] = useState('home');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All crafts');
  const [sort, setSort] = useState('featured');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [auth, setAuth] = useState(readAuth);
  const [authRole, setAuthRole] = useState('customer');
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    request('/products')
      .then((data) => {
        if (active) {
          setProducts(Array.isArray(data) ? data : []);
          setError('');
        }
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refreshKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const handleExpiredAuth = () => {
      setAuth(null);
      setToast('Your session expired. Please sign in again.');
    };
    window.addEventListener('auth-expired', handleExpiredAuth);
    return () => window.removeEventListener('auth-expired', handleExpiredAuth);
  }, []);

  const availableProducts = products.filter((product) => product.status === 'available' && Number(product.stock) > 0);
  const filteredProducts = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = availableProducts.filter((product) => {
      const matchesTerm = !term || `${product.name} ${product.description} ${product.category}`.toLowerCase().includes(term);
      const matchesCategory = category === 'All crafts' || product.category?.toLowerCase().includes(category.toLowerCase());
      const price = Number(product.price);
      const matchesPrice = (minPrice === '' || price >= Number(minPrice)) && (maxPrice === '' || price <= Number(maxPrice));
      return matchesTerm && matchesCategory && matchesPrice;
    });
    if (sort === 'price-low') return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === 'price-high') return [...filtered].sort((a, b) => b.price - a.price);
    if (sort === 'rating') return [...filtered].sort((a, b) => (b.ratingRankScore ?? -1) - (a.ratingRankScore ?? -1));
    if (sort === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    return filtered;
  }, [availableProducts, category, maxPrice, minPrice, query, sort]);

  function readAuth() {
    try {
      return JSON.parse(sessionStorage.getItem('artisan-market-auth') || 'null');
    } catch {
      return null;
    }
  }

  function saveAuth(value) {
    sessionStorage.setItem('artisan-market-auth', JSON.stringify(value));
    setAuth(value);
    setShowAuth(false);
    setToast(`Welcome${value.name ? `, ${value.name}` : ''}.`);
    setRefreshKey((key) => key + 1);
    if (value.role === 'admin') {
      setPage('admin');
    }
  }

  function openAuth(role = 'customer') {
    setAuthRole(role);
    setShowAuth(true);
  }

  function signOut() {
    sessionStorage.removeItem('artisan-market-auth');
    setAuth(null);
    setPage('home');
    setToast('You have been signed out.');
  }

  async function addToCart(product, quantity = 1) {
    if (!auth || auth.role !== 'customer') {
      setToast('Sign in as a customer to add items to your cart.');
      openAuth('customer');
      return;
    }
    try {
      await request('/cart/add', { method: 'POST', token: auth.token, body: { productId: product._id, quantity } });
      setToast(`${product.name} added to your cart.`);
    } catch (reason) {
      setToast(reason.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <button className="brand" onClick={() => { setPage('home'); setSelected(null); }} aria-label="Common Thread home">
          <span className="brand-mark">ct</span><span>common<span className="brand-light">thread</span></span>
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={page === 'marketplace' ? 'active' : ''} onClick={() => { setPage('marketplace'); setSelected(null); }}>Shop all</button>
          <button onClick={() => { setCategory('Pottery'); setPage('marketplace'); setSelected(null); }}>Our crafts</button>
          <button onClick={() => { setPage('artisan'); setSelected(null); }}>For artisans</button>
        </nav>
        <div className="header-actions">
          {auth?.role === 'customer' && <button className="text-action" onClick={() => { setPage('orders'); setSelected(null); }}>My orders</button>}
          {auth?.role === 'customer' && <button className="icon-button" aria-label="Shopping cart" onClick={() => { setPage('cart'); setSelected(null); }}><CartIcon /></button>}
          {auth?.role === 'admin' && <button className="text-action" onClick={() => { setPage('admin'); setSelected(null); }}>Admin dashboard</button>}
          {auth ? <button className="account-button" onClick={signOut}>Sign out</button> : <button className="account-button" onClick={() => openAuth()}>Sign in</button>}
          <button className="mobile-menu" onClick={() => setPage('marketplace')} aria-label="Browse the marketplace">☰</button>
        </div>
      </header>

      <main>
        {selected ? (
          <ProductDetail product={selected} auth={auth} onAuth={() => openAuth('customer')} onBack={() => setSelected(null)} onAdd={addToCart} />
        ) : page === 'home' ? (
          <HomePage products={availableProducts} loading={loading} error={error} onBrowse={() => setPage('marketplace')} onSelect={setSelected} onCategory={(value) => { setCategory(value); setPage('marketplace'); }} onRetry={() => setRefreshKey((key) => key + 1)} />
        ) : page === 'marketplace' ? (
          <Marketplace products={filteredProducts} loading={loading} error={error} query={query} setQuery={setQuery} category={category} setCategory={setCategory} sort={sort} setSort={setSort} minPrice={minPrice} setMinPrice={setMinPrice} maxPrice={maxPrice} setMaxPrice={setMaxPrice} onSelect={setSelected} onRetry={() => setRefreshKey((key) => key + 1)} />
        ) : page === 'cart' ? (
          <CustomerCart auth={auth} onAuth={() => openAuth()} onToast={setToast} onCheckout={() => setPage('checkout')} onBrowse={() => setPage('marketplace')} />
        ) : page === 'checkout' ? (
          <Checkout auth={auth} onAuth={() => openAuth()} onToast={setToast} onBack={() => setPage('cart')} onComplete={() => { setPage('orders'); setToast('Your order has been placed.'); }} />
        ) : page === 'orders' ? (
          <CustomerOrders auth={auth} onAuth={() => openAuth()} onBrowse={() => setPage('marketplace')} />
        ) : page === 'artisan' ? (
          <ArtisanPage auth={auth} products={products} onAuth={() => openAuth('artisan')} onToast={setToast} onRefresh={() => setRefreshKey((key) => key + 1)} />
        ) : page === 'admin' ? (
          <AdminDashboard auth={auth} onAuth={() => openAuth('admin')} onToast={setToast} />
        ) : null}
      </main>

      <footer className="site-footer">
        <div className="footer-brand"><span className="brand-mark">ct</span><span>Made slowly. Loved for longer.</span></div>
        <p>Every purchase keeps a tradition in motion.</p>
        <span>© {new Date().getFullYear()} Common Thread</span>
      </footer>
      {showAuth && <AuthModal initialRole={authRole} onClose={() => setShowAuth(false)} onSuccess={saveAuth} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function HomePage({ products, loading, error, onBrowse, onSelect, onCategory, onRetry }) {
  const featured = products.slice(0, 4);
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-line" /> A little more human</span>
          <h1>Objects with<br /><em>a story to tell.</em></h1>
          <p>Handmade with care, passed down through generations, and made to find their way into your home.</p>
          <button className="button button-dark" onClick={onBrowse}>Explore the collection <span aria-hidden="true">↗</span></button>
          <div className="hero-note"><span className="note-stars">✳</span><span>Made by hand, never by the thousands</span></div>
        </div>
        <div className="hero-art" aria-label="Handcrafted ceramic vessels" role="img">
          <div className="sun-disc" />
          <div className="hero-vase vase-one" /><div className="hero-vase vase-two" /><div className="hero-vase vase-three" />
          <span className="art-caption">Clay, shaped by hand · Rajasthan</span>
        </div>
        <span className="hero-index">01 — 04</span>
      </section>

      <section className="values-row">
        <div><span className="value-icon">✳</span><div><b>Made with meaning</b><small>One-of-a-kind, always</small></div></div>
        <div><span className="value-icon">⌂</span><div><b>Meet the maker</b><small>Every piece has a person</small></div></div>
        <div><span className="value-icon">↗</span><div><b>Buy a little better</b><small>Thoughtful by nature</small></div></div>
      </section>

      <section className="section category-section">
        <div className="section-heading"><div><span className="eyebrow">Find your kind of craft</span><h2>Made by hand, <em>for you.</em></h2></div><button className="link-button" onClick={onBrowse}>All crafts <span>→</span></button></div>
        <div className="category-grid">
          {categories.slice(1).map((item, index) => <button className={`category-tile category-${index}`} key={item} onClick={() => onCategory(item)}>
            <span className="category-symbol">{categoryIcons[item]}</span><span>{item}</span><small>Explore pieces →</small>
          </button>)}
        </div>
      </section>

      <section className="section featured-section">
        <div className="section-heading"><div><span className="eyebrow">A few good things</span><h2>Fresh from <em>the makers.</em></h2></div><button className="link-button" onClick={onBrowse}>View the collection <span>→</span></button></div>
        {error ? <ErrorPanel message={error} onRetry={onRetry} /> : loading ? <ProductSkeletons count={4} /> : featured.length ? <ProductGrid products={featured} onSelect={onSelect} /> : <EmptyState title="The shelves are getting ready." text="There aren't any available pieces just yet. Come back soon or explore all crafts." action="Browse crafts" onClick={onBrowse} />}
      </section>

      <section className="maker-banner">
        <div className="maker-art" aria-hidden="true"><span>✳</span><i /><i /><i /></div>
        <div className="maker-copy"><span className="eyebrow">A marketplace with heart</span><h2>Good things are<br /><em>made by people.</em></h2><p>Meet the independent makers behind every piece — and bring home something with a little more soul.</p><button className="button button-outline" onClick={onBrowse}>Meet the makers <span>↗</span></button></div>
      </section>
    </>
  );
}

function Marketplace({ products, loading, error, query, setQuery, category, setCategory, sort, setSort, minPrice, setMinPrice, maxPrice, setMaxPrice, onSelect, onRetry }) {
  return <section className="page-section">
    <div className="page-title"><span className="eyebrow">The good stuff</span><h1>Shop the <em>collection.</em></h1><p>Small-batch, thoughtful, and made by someone who cares.</p></div>
    <div className="shop-controls">
      <label className="search-field"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" aria-label="Search products" /></label>
      <label className="select-label"><span>Craft</span><select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="price-filter"><span>From ₹</span><input aria-label="Minimum price" type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></label>
      <label className="price-filter"><span>To ₹</span><input aria-label="Maximum price" type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label>
      <label className="select-label"><span>Sort by</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="featured">Featured</option><option value="rating">Top rated · weighted</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name</option></select></label>
    </div>
    <div className="result-count">{products.length} {products.length === 1 ? 'piece' : 'pieces'} to discover</div>
    {error ? <ErrorPanel message={error} onRetry={onRetry} /> : loading ? <ProductSkeletons count={8} /> : products.length ? <ProductGrid products={products} onSelect={onSelect} /> : <EmptyState title="Nothing on this shelf (yet)." text="Try another search, price range, or craft category." action="Clear filters" onClick={() => { setQuery(''); setCategory('All crafts'); setMinPrice(''); setMaxPrice(''); }} />}
  </section>;
}

function ProductGrid({ products, onSelect }) {
  return <div className="product-grid">{products.map((product, index) => <ProductCard product={product} key={product._id} index={index} onSelect={onSelect} />)}</div>;
}

function ProductCard({ product, index, onSelect }) {
  const Card = onSelect ? 'button' : 'article';
  return <Card className="product-card" type={onSelect ? 'button' : undefined} onClick={onSelect ? () => onSelect(product) : undefined}>
    <div className={`product-image image-tone-${index % 6}`}>
      {product.image && <img src={imageUrl(product.image)} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
      <span className="image-fallback">{categoryIcons[product.category] || '✳'}</span>
      {index === 0 && <span className="product-tag">Made by hand</span>}
      <span className="product-arrow">↗</span>
    </div>
    <div className="product-card-info"><div><span className="product-category">{product.category || 'Handmade'}</span><h3>{product.name}</h3></div><strong>{money(product.price)}</strong></div>
    <p className="artisan-line">{product.reviewCount > 0 ? `${product.averageRating} ★ · ${product.reviewCount} ${product.reviewCount === 1 ? 'review' : 'reviews'}` : 'Not yet rated'}{product.artisan?.name ? ` · by ${product.artisan.name}` : ''}</p>
  </Card>;
}

function ProductDetail({ product, auth, onAuth, onBack, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const [reviewSummary, setReviewSummary] = useState({ rating: 0, reviewCount: 0, reviews: [] });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');

  useEffect(() => {
    let active = true;
    setReviewsLoading(true);
    request(`/reviews/product/${product._id}`)
      .then((summary) => active && setReviewSummary(summary))
      .catch((reason) => active && setReviewsError(reason.message))
      .finally(() => active && setReviewsLoading(false));
    return () => { active = false; };
  }, [product._id]);

  return <section className="detail-section">
    <button className="back-button" onClick={onBack}>← Back to the collection</button>
    <div className="detail-layout">
      <div className="detail-image image-tone-2">
        {product.image && <img src={imageUrl(product.image)} alt={product.name} onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
        <span className="image-fallback">{categoryIcons[product.category] || '✳'}</span>
      </div>
      <div className="detail-copy"><span className="eyebrow">{product.category || 'Handmade'} · made with care</span><h1>{product.name}</h1><div className="detail-price">{money(product.price)}</div>
        <p className="detail-description">{product.description}</p>
        <div className="detail-maker"><span className="maker-avatar">✳</span><span><small>Made by an independent artisan</small><b>{product.artisan?.name || 'Every piece has its own story'}</b></span></div>
        <div className="stock-note">{product.stock > 0 ? `${product.stock} available · ready to find a home` : 'Currently unavailable'}</div>
        <div className="detail-actions"><div className="quantity-control"><button aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button><span>{quantity}</span><button aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(Number(product.stock) || 1, value + 1))}>+</button></div><button className="button button-dark" disabled={!product.stock} onClick={() => onAdd(product, quantity)}>Add to cart <span>↗</span></button></div>
      </div>
    </div>
    <section className="reviews-section" aria-label="Customer reviews">
      <div className="reviews-heading">
        <div><span className="eyebrow">From the people who brought it home</span><h2>Customer reviews</h2></div>
        {reviewSummary.reviewCount > 0 && <strong>{reviewSummary.rating} / 5 · {reviewSummary.reviewCount} {reviewSummary.reviewCount === 1 ? 'review' : 'reviews'}</strong>}
      </div>
      {reviewsLoading ? <p className="form-hint">Loading reviews…</p> : reviewsError ? <p className="form-error" role="alert">{reviewsError}</p> : reviewSummary.reviews.length ? (
        <div className="review-list">{reviewSummary.reviews.map((review) => (
          <article className="review-item" key={review._id}>
            <div><strong>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</strong><small>Verified purchase</small></div>
            {review.comment && <p>{review.comment}</p>}
            <time dateTime={review.createdAt}>{new Date(review.createdAt).toLocaleDateString()}</time>
          </article>
        ))}</div>
      ) : <p className="form-hint">No reviews yet. Reviews can be left after a delivered order.</p>}
      {auth?.role === 'customer' && <p className="form-hint">To leave a review, open this item from your delivered orders.</p>}
      {auth && auth.role !== 'customer' && <p className="form-hint">Reviews are available to customers after delivery.</p>}
      {!auth && <button className="link-button" onClick={onAuth}>Sign in to review a delivered purchase <span>→</span></button>}
    </section>
  </section>;
}

function CustomerCart({ auth, onAuth, onToast, onCheckout, onBrowse }) {
  const [cart, setCart] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!auth || auth.role !== 'customer') { setBusy(false); return undefined; }
    let active = true;
    request('/cart/mycart', { token: auth.token }).then((result) => active && setCart(result)).catch((reason) => {
      if (!active) return;
      if (reason.status === 404) setCart({ products: [] });
      else setError(reason.message);
    }).finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [auth, reload]);

  async function changeQuantity(productId, quantity) {
    try {
      await request('/cart/update-quantity', { method: 'PUT', token: auth.token, body: { productId, quantity } });
      const result = await request('/cart/mycart', { token: auth.token });
      setCart(result);
    } catch (reason) { onToast(reason.message); }
  }
  async function remove(productId) {
    try {
      await request('/cart/remove-item', { method: 'DELETE', token: auth.token, body: { productId } });
      const result = await request('/cart/mycart', { token: auth.token });
      setCart(result);
    } catch (reason) { onToast(reason.message); }
  }
  if (!auth || auth.role !== 'customer') return <SignInPrompt title="Your basket, when you're ready." text="Sign in as a customer to see your saved items." onAuth={onAuth} />;
  if (busy) return <section className="page-section"><div className="page-title"><h1>Your <em>basket.</em></h1></div><ProductSkeletons count={2} /></section>;
  return <section className="page-section">
    <div className="page-title"><span className="eyebrow">A few good things</span><h1>Your <em>basket.</em></h1></div>
    {error ? <ErrorPanel message={error} onRetry={() => { setError(''); setBusy(true); setReload((key) => key + 1); }} /> : !cart?.products?.length ? <EmptyState title="Your basket is taking a breather." text="Find something handmade that feels like you." action="Explore the collection" onClick={onBrowse} /> :
      <div className="cart-layout"><div className="cart-lines">{cart.products.map((item) => {
        const product = item.product;
        if (!product) return null;
        return <div className="cart-line" key={product._id}><div className="cart-thumb image-tone-1"><span>{categoryIcons[product.category] || '✳'}</span></div><div className="cart-product"><b>{product.name}</b><small>{product.category}</small><strong>{money(product.price)}</strong></div><div className="quantity-control"><button onClick={() => item.quantity > 1 ? changeQuantity(product._id, item.quantity - 1) : remove(product._id)} aria-label="Decrease quantity">−</button><span>{item.quantity}</span><button onClick={() => changeQuantity(product._id, item.quantity + 1)} aria-label="Increase quantity">+</button></div><strong className="cart-subtotal">{money(product.price * item.quantity)}</strong><button className="remove-button" onClick={() => remove(product._id)} aria-label={`Remove ${product.name}`}>×</button></div>;
      })}</div><aside className="order-summary"><span className="eyebrow">The little details</span><h2>Order summary</h2><div><span>Subtotal</span><b>{money(cart.products.reduce((sum, item) => sum + (Number(item.product?.price) || 0) * item.quantity, 0))}</b></div><div><span>Delivery</span><small>Calculated by the maker</small></div><p>Cash on delivery is supported by the current checkout.</p><button className="button button-dark full-width" onClick={onCheckout}>Continue to checkout <span>→</span></button></aside></div>}
  </section>;
}

function Checkout({ auth, onAuth, onToast, onBack, onComplete }) {
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    if (address.trim().length < 5) { setError('Please enter a complete delivery address.'); return; }
    setSubmitting(true); setError('');
    try {
      await request('/orders/checkout', { method: 'POST', token: auth.token, body: { deliveryAddress: address.trim() } });
      onComplete();
    } catch (reason) { setError(reason.message); onToast(reason.message); }
    finally { setSubmitting(false); }
  }
  if (!auth || auth.role !== 'customer') return <SignInPrompt title="Sign in before checkout." text="Your account keeps your delivery and order details together." onAuth={onAuth} />;
  return <section className="page-section narrow-section"><button className="back-button" onClick={onBack}>← Back to your basket</button><div className="page-title"><span className="eyebrow">Almost home</span><h1>Where should it <em>go?</em></h1><p>For now, checkout is cash on delivery.</p></div>
    <form className="form-card" onSubmit={submit}><label>Delivery address<textarea value={address} onChange={(event) => setAddress(event.target.value)} minLength="5" required rows="4" placeholder="House / street, city, state, postal code" /></label><div className="payment-note"><span>◉</span><div><b>Cash on delivery</b><small>Payment method supported by the marketplace</small></div></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark full-width" disabled={submitting}>{submitting ? 'Placing your order…' : 'Place order'} <span>↗</span></button></form>
  </section>;
}

function CustomerOrders({ auth, onAuth, onBrowse }) {
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!auth || auth.role !== 'customer') { setBusy(false); return undefined; }
    let active = true;
    request('/orders/myorders', { token: auth.token }).then((data) => active && setOrders(Array.isArray(data) ? data : [])).catch((reason) => active && setError(reason.message)).finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [auth]);
  if (!auth || auth.role !== 'customer') return <SignInPrompt title="Your orders, all in one place." text="Sign in as a customer to check on your handmade finds." onAuth={onAuth} />;
  return <section className="page-section"><div className="page-title"><span className="eyebrow">The journey home</span><h1>Your <em>orders.</em></h1></div>
    {busy ? <ProductSkeletons count={2} /> : error ? <ErrorPanel message={error} /> : orders.length ? <div className="orders-list">{orders.map((order) => <article className="order-card" key={order._id}><div className="order-top"><div><span className="eyebrow">Order placed</span><b>{new Date(order.createdAt).toLocaleDateString()}</b></div><span className={`status-pill status-${order.status}`}>{order.status}</span><strong>{money(order.totalAmount)}</strong></div><div className="order-items">{order.items?.map((item) => <div className="order-item" key={item._id || `${item.productName}-${item.status}`}><p>{item.productName} × {item.quantity} — {item.status}</p>{order.status === 'delivered' && item.status === 'delivered' && item.product?._id && <ReviewComposer auth={auth} productId={item.product._id} orderId={order._id} onAuth={onAuth} />}</div>)}</div><small>Delivering to: {order.deliveryAddress}</small></article>)}</div> : <EmptyState title="No orders just yet." text="Your next favourite handmade thing is out there." action="Explore the collection" onClick={onBrowse} />}
  </section>;
}

function ReviewComposer({ auth, productId, orderId, onAuth }) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await request(`/reviews/product/${productId}`, {
        method: 'POST',
        token: auth.token,
        body: { orderId, rating, comment },
      });
      setSubmitted(true);
      setOpen(false);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  if (submitted) return <p className="form-success">Thank you — your review has been submitted.</p>;
  if (!auth || auth.role !== 'customer') return <button className="link-button" onClick={onAuth}>Sign in to review <span>→</span></button>;

  return <div className="review-composer">
    {!open ? <button className="link-button" onClick={() => setOpen(true)}>Write a review <span>→</span></button> : (
      <form className="review-form" onSubmit={submit}>
        <label>Rating
          <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>
            {[5, 4, 3, 2, 1].map((value) => <option value={value} key={value}>{value} {value === 1 ? 'star' : 'stars'}</option>)}
          </select>
        </label>
        <label>Your note (optional)
          <textarea value={comment} onChange={(event) => setComment(event.target.value)} maxLength={1000} rows={3} />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="review-form-actions">
          <button className="button button-dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit review'}</button>
          <button className="link-button" type="button" onClick={() => { setOpen(false); setError(''); }}>Cancel</button>
        </div>
      </form>
    )}
  </div>;
}

function ArtisanPage({ auth, products, onAuth, onToast, onRefresh }) {
  const [artisanId, setArtisanId] = useState('');
  const [ownProducts, setOwnProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', price: '', stock: '', productionCost: '', laborCost: '', packagingCost: '', image: null });
  const [statusError, setStatusError] = useState('');
  const [categorySuggestion, setCategorySuggestion] = useState(null);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [suggestingPrice, setSuggestingPrice] = useState(false);
  const [demandCategory, setDemandCategory] = useState('');
  const [demandResult, setDemandResult] = useState(null);
  const [estimatingDemand, setEstimatingDemand] = useState(false);
  useEffect(() => () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);
  useEffect(() => {
    setPriceSuggestion(null);
  }, [form.category, form.productionCost, form.laborCost, form.packagingCost]);
  useEffect(() => {
    if (!auth || auth.role !== 'artisan') return undefined;
    let active = true;
    setLoading(true);
    Promise.all([request('/auth/check', { method: 'POST', token: auth.token }), request('/orders/artisan', { token: auth.token }), request('/products/mine', { token: auth.token })])
      .then(([profile, artisanOrders, artisanProducts]) => {
        if (!active) return;
        setArtisanId(profile?.artisanId || '');
        setOrders(Array.isArray(artisanOrders) ? artisanOrders : []);
        setOwnProducts(Array.isArray(artisanProducts) ? artisanProducts : []);
        setStatusError('');
      })
      .catch((reason) => active && setStatusError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [auth]);

  const orderItems = orders.flatMap((order) => (order.items || []).filter((item) => String(item.artisan?._id || item.artisan) === artisanId).map((item) => ({ ...item, orderId: order._id })));
  const ownCategories = [...new Set(ownProducts.map((product) => product.category).filter(Boolean))];
  const stats = [
    ['Your pieces', ownProducts.length],
    ['Available now', ownProducts.filter((item) => item.status === 'available').length],
    ['Items to fulfil', orderItems.filter((item) => !['delivered', 'cancelled'].includes(item.status)).length],
    ['Order value', money(orderItems.filter((item) => item.status !== 'cancelled').reduce((sum, item) => sum + (Number(item.subtotal) || 0), 0))],
  ];
  async function createProduct(event) {
    event.preventDefault();
    if (!form.image) { onToast('Choose a product image before publishing.'); return; }
    const body = new FormData();
    Object.entries(form).forEach(([key, value]) => { if (!['image', 'laborCost', 'packagingCost'].includes(key) && value !== '') body.append(key, value); });
    body.append('image', form.image);
    setSaving(true);
    try {
      await request('/products/create', { method: 'POST', token: auth.token, body });
      const refreshedProducts = await request('/products/mine', { token: auth.token });
      setOwnProducts(Array.isArray(refreshedProducts) ? refreshedProducts : []);
      setForm({ name: '', description: '', category: '', price: '', stock: '', productionCost: '', laborCost: '', packagingCost: '', image: null });
      setCategorySuggestion(null);
      setImagePreview('');
      setPriceSuggestion(null);
      setFormOpen(false);
      onToast('Your piece has been submitted for review.');
      onRefresh();
    } catch (reason) { onToast(reason.message); }
    finally { setSaving(false); }
  }
  async function suggestCategory(file) {
    setForm((current) => ({ ...current, image: file }));
    setCategorySuggestion(null);
    setImagePreview(file ? URL.createObjectURL(file) : '');
    if (!file) return;
    const body = new FormData();
    body.append('image', file);
    setSuggestingCategory(true);
    try {
      const suggestion = await aiRequest('/api/v1/category/predict', { method: 'POST', body });
      setCategorySuggestion(suggestion);
    } catch (reason) { onToast(reason.message); }
    finally { setSuggestingCategory(false); }
  }
  async function suggestPrice() {
    const productionCost = Number(form.productionCost);
    if (!Number.isFinite(productionCost) || productionCost <= 0) {
      onToast('Enter a production cost before requesting a price suggestion.');
      return;
    }
    setSuggestingPrice(true);
    try {
      const comparablePrices = ownProducts
        .filter((product) => product.status === 'available' && product.category?.toLowerCase() === form.category.trim().toLowerCase())
        .map((product) => Number(product.price))
        .filter((price) => Number.isFinite(price) && price > 0);
      setPriceSuggestion(await aiRequest('/api/v1/price/recommend', {
        method: 'POST',
        body: {
          category: form.category.trim() || 'handmade craft',
          production_cost: productionCost,
          labor_cost: Number(form.laborCost) || 0,
          packaging_cost: Number(form.packagingCost) || 0,
          comparable_prices: comparablePrices,
        },
      }));
    } catch (reason) { onToast(reason.message); }
    finally { setSuggestingPrice(false); }
  }
  async function estimateDemand() {
    const categoryProducts = ownProducts.filter((product) => product.category === demandCategory);
    const categoryProductIds = new Set(categoryProducts.map((product) => String(product._id)));
    const quantitiesByDate = new Map();
    const dates = [];
    orders.forEach((order) => {
      const date = order.createdAt ? new Date(order.createdAt).toISOString().slice(0, 10) : '';
      if (!date) return;
      let categoryQuantity = 0;
      (order.items || []).forEach((item) => {
        const productId = String(item.product?._id || item.product || '');
        if (categoryProductIds.has(productId) && item.status !== 'cancelled') {
          categoryQuantity += Number(item.quantity || 0);
        }
      });
      if (categoryQuantity > 0) {
        dates.push(date);
        quantitiesByDate.set(date, (quantitiesByDate.get(date) || 0) + categoryQuantity);
      }
    });
    const today = new Date();
    const end = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 27);
    const startKey = start.toISOString().slice(0, 10);
    if (!demandCategory || !dates.length || dates.sort()[0] > startKey) {
      setDemandResult({
        status: 'insufficient_data',
        message: 'There is not yet 28 days of order history for this category. No estimate has been generated.',
      });
      return;
    }
    const dailySales = Array.from({ length: 28 }, (_, index) => {
      const day = new Date(start);
      day.setUTCDate(day.getUTCDate() + index);
      const key = day.toISOString().slice(0, 10);
      return { date: key, quantity: quantitiesByDate.get(key) || 0 };
    });
    setEstimatingDemand(true);
    try {
      const availableStock = categoryProducts.reduce((sum, product) => sum + Math.max(0, Number(product.stock) || 0), 0);
      setDemandResult(await aiRequest('/api/v1/demand/forecast', {
        method: 'POST',
        body: { category: demandCategory, daily_sales: dailySales, available_stock: availableStock },
      }));
    } catch (reason) { onToast(reason.message); }
    finally { setEstimatingDemand(false); }
  }
  async function updateStatus(orderId, itemId, status) {
    try {
      await request(`/orders/artisan/${orderId}/items/${itemId}/status`, { method: 'PATCH', token: auth.token, body: { status } });
      const result = await request('/orders/artisan', { token: auth.token });
      setOrders(Array.isArray(result) ? result : []);
      onToast('Order item status updated.');
    } catch (reason) { onToast(reason.message); }
  }
  if (!auth || auth.role !== 'artisan') return <section className="artisan-intro"><span className="eyebrow">For the people who make</span><h1>Your hands make<br /><em>the good stuff.</em></h1><p>Bring your craft to a community that values the time, skill, and story behind every piece.</p><button className="button button-dark" onClick={onAuth}>Sign in or join as an artisan <span>↗</span></button><div className="artisan-limit">Artisan registration and login use your existing backend account.</div></section>;

  return <section className="page-section artisan-dashboard">
    <div className="dashboard-heading"><div><span className="eyebrow">Your little corner</span><h1>Good morning, <em>maker.</em></h1><p>Here's what's happening with your work.</p></div><button className="button button-dark" onClick={() => setFormOpen((open) => !open)}>{formOpen ? 'Close form' : '+ Add a piece'}</button></div>
    {statusError && <ErrorPanel message={statusError} />}
    <div className="stats-grid">{stats.map(([label, value]) => <div className="stat-card" key={label}><small>{label}</small><b>{loading ? '—' : value}</b></div>)}</div>
    {formOpen && <form className="form-card product-form" onSubmit={createProduct}><div className="form-heading"><span className="eyebrow">A new handmade story</span><h2>Add a product</h2></div><label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Category<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="e.g. Pottery" /></label>{categorySuggestion && <div className="ai-suggestion"><span className="eyebrow">AI category suggestion · {categorySuggestion.method === 'zero_shot_pretrained' ? 'pretrained prototype' : 'trained artifact'}</span><b>{categorySuggestion.category}</b><small>Relative score: {Math.round(categorySuggestion.confidence * 100)}%. {categorySuggestion.confidence_note}</small>{categorySuggestion.alternatives?.length > 0 && <small>Alternatives: {categorySuggestion.alternatives.map((item) => `${item.category} (${Math.round(item.score * 100)}%)`).join(', ')}</small>}<button type="button" className="link-button" onClick={() => setForm({ ...form, category: categorySuggestion.category })}>Use this category <span>→</span></button></div>}{suggestingCategory && <p className="form-hint">Checking the image with the optional AI service…</p>}<label>Description<textarea required rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="form-row"><label>Selling price (₹)<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label><label>Materials / production cost (₹)<input required type="number" min="0" step="0.01" value={form.productionCost} onChange={(event) => setForm({ ...form, productionCost: event.target.value })} /></label><label>Stock<input required type="number" min="0" step="1" value={form.stock} onChange={(event) => setForm({ ...form, stock: event.target.value })} /></label></div><p className="form-hint">Optional costs below are used only by the price suggestion; the current product schema stores one production-cost value.</p><div className="form-row"><label>Extra labour cost (₹)<input type="number" min="0" step="0.01" value={form.laborCost} onChange={(event) => setForm({ ...form, laborCost: event.target.value })} /></label><label>Packaging cost (₹)<input type="number" min="0" step="0.01" value={form.packagingCost} onChange={(event) => setForm({ ...form, packagingCost: event.target.value })} /></label></div><button className="ai-secondary-button" type="button" onClick={suggestPrice} disabled={suggestingPrice}>{suggestingPrice ? 'Estimating…' : 'Suggest a price'}</button>{priceSuggestion && <div className="ai-suggestion"><span className="eyebrow">Cost-based baseline · not a sales guarantee</span><b>{money(priceSuggestion.recommended_price)}</b><small>{priceSuggestion.explanation}</small>{priceSuggestion.comparable_price_median != null && <small>Median of {priceSuggestion.category} comparisons: {money(priceSuggestion.comparable_price_median)}.</small>}<button type="button" className="link-button" onClick={() => setForm({ ...form, price: String(priceSuggestion.recommended_price) })}>Use suggested price <span>→</span></button></div>}<label>Product image<input required type="file" accept="image/*" onChange={(event) => suggestCategory(event.target.files?.[0] || null)} /></label>{imagePreview && <div className="image-preview"><img src={imagePreview} alt={form.name ? `${form.name} image preview` : 'Selected product image preview'} /><span>Image preview · stored with your product on submit</span></div>}<p className="form-hint">Products are created with the existing endpoint and default to pending approval. Category suggestions use pretrained CLIP unless you train the optional classifier; pricing uses an explainable baseline.</p><button className="button button-dark" disabled={saving}>{saving ? 'Submitting…' : 'Submit for approval'} <span>↗</span></button></form>}
    <div className="dashboard-section-title"><div><span className="eyebrow">Your catalogue</span><h2>Pieces on the shelf</h2></div></div>
    {ownProducts.length ? <div className="product-grid artisan-product-grid">{ownProducts.map((product, index) => <div className="artisan-product" key={product._id}><ProductCard product={product} index={index} /><div className="artisan-product-bottom"><span className={`status-pill status-${product.status}`}>{product.status}</span></div>{product.status === 'rejected' && product.reviewFeedback && <p className="form-error">Admin feedback: {product.reviewFeedback}</p>}</div>)}</div> : <EmptyState title="Your shelf is waiting." text="Add your first handmade piece to get started." action="Add a piece" onClick={() => setFormOpen(true)} />}
    <div className="demand-panel"><div><span className="eyebrow">A careful look at real orders</span><h2>Demand outlook</h2><p>Requires 28 consecutive days of artisan order history. No estimate is shown when there is not enough data.</p></div><div className="demand-controls"><select value={demandCategory} onChange={(event) => { setDemandCategory(event.target.value); setDemandResult(null); }} aria-label="Category for demand outlook"><option value="">Choose a category</option>{ownCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select><button className="button button-dark" type="button" onClick={estimateDemand} disabled={estimatingDemand || !demandCategory}>{estimatingDemand ? 'Estimating…' : 'Estimate demand'}</button></div>{demandResult && <div className={`demand-result ${demandResult.status === 'insufficient_data' ? 'demand-insufficient' : ''}`} role="status"><b>{demandResult.status === 'insufficient_data' ? 'Not enough history yet' : demandResult.status === 'invalid_data' ? 'History needs attention' : 'Seven-day baseline estimate'}</b><p>{demandResult.message || demandResult.explanation}</p>{demandResult.stock_context && <p>Current stock: {demandResult.stock_context.available_stock} · Estimated seven-day demand: {demandResult.stock_context.estimated_seven_day_demand} · {demandResult.stock_context.may_need_restock ? 'Consider reviewing stock.' : 'Current stock covers this baseline.'}</p>}{demandResult.forecast?.length > 0 && <ul>{demandResult.forecast.map((entry) => <li key={entry.date}><span>{new Date(`${entry.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span><b>{entry.estimated_units} units</b></li>)}</ul>}</div>}</div>
    <div className="dashboard-section-title"><div><span className="eyebrow">Orders to care for</span><h2>Order items</h2></div></div>
    {orderItems.length ? <div className="orders-list">{orderItems.map((item) => {
      const nextStatuses = {
        placed: ['accepted', 'cancelled'],
        accepted: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: [],
        cancelled: [],
      }[item.status] || [];
      return <article className="order-card" key={`${item.orderId}-${item._id}`}><div className="order-top"><div><span className="eyebrow">Order {item.orderId.slice(-6)}</span><b>{item.productName} × {item.quantity}</b></div><span className={`status-pill status-${item.status}`}>{item.status}</span><strong>{money(item.subtotal)}</strong></div><label className="status-select">Update status<select value={item.status} onChange={(event) => updateStatus(item.orderId, item._id, event.target.value)} disabled={!nextStatuses.length}><option value={item.status}>{item.status}</option>{nextStatuses.map((status) => <option value={status} key={status}>{status}</option>)}</select></label></article>;
    })}</div> : <p className="subtle-copy">No orders for your work yet.</p>}
  </section>;
}

function AdminDashboard({ auth, onAuth, onToast }) {
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [rejectionFeedback, setRejectionFeedback] = useState({});

  useEffect(() => {
    if (!auth || auth.role !== 'admin') return undefined;
    let active = true;
    setBusy(true);
    Promise.all([
      request('/admin/dashboard', { token: auth.token }),
      request('/admin/products', { token: auth.token })
    ])
      .then(([dashboard, list]) => {
        if (!active) return;
        setStats(dashboard);
        setProducts(Array.isArray(list) ? list : []);
        setError('');
      })
      .catch((reason) => active && setError(reason.message))
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [auth]);

  async function updateProductStatus(productId, status, feedback = '') {
    const product = products.find((item) => item._id === productId);
    const decision = status === 'available' ? 'approve' : 'reject';
    if (!window.confirm(`${decision === 'approve' ? 'Approve' : 'Reject'} "${product?.name || 'this product'}"?`)) return;
    try {
      await request(`/admin/products/${productId}/status`, { method: 'PATCH', token: auth.token, body: { status, feedback } });
      const [result, nextDashboard] = await Promise.all([
        request('/admin/products', { token: auth.token }),
        request('/admin/dashboard', { token: auth.token }),
      ]);
      setProducts(Array.isArray(result) ? result : []);
      setStats(nextDashboard);
      setRejectionFeedback((current) => ({ ...current, [productId]: '' }));
      onToast('Product status updated.');
    } catch (reason) {
      onToast(reason.message);
    }
  }

  if (!auth || auth.role !== 'admin') {
    return <section className="page-section prompt-section"><span className="prompt-mark">ct</span><h1>Admin access</h1><p>Sign in with the marketplace admin account to view approvals and order metrics.</p><button className="button button-dark" onClick={onAuth}>Sign in as admin <span>↗</span></button></section>;
  }

  return <section className="page-section">
    <div className="page-title"><span className="eyebrow">Marketplace operations</span><h1>Admin <em>dashboard</em></h1></div>
    {busy ? <ProductSkeletons count={4} /> : error ? <ErrorPanel message={error} /> : <>
      <div className="stats-grid">
        <div className="stat-card"><small>Total artisans</small><b>{stats?.totalArtisans ?? 0}</b></div>
        <div className="stat-card"><small>Total customers</small><b>{stats?.totalCustomers ?? 0}</b></div>
        <div className="stat-card"><small>Total products</small><b>{stats?.totalProducts ?? 0}</b></div>
        <div className="stat-card"><small>Pending products</small><b>{stats?.pendingProducts ?? 0}</b></div>
        <div className="stat-card"><small>Approved</small><b>{stats?.approvedProducts ?? 0}</b></div>
        <div className="stat-card"><small>Rejected</small><b>{stats?.rejectedProducts ?? 0}</b></div>
        <div className="stat-card"><small>Total orders</small><b>{stats?.totalOrders ?? 0}</b></div>
        <div className="stat-card"><small>Pending orders</small><b>{stats?.pendingOrders ?? 0}</b></div>
        <div className="stat-card"><small>Delivered</small><b>{stats?.deliveredOrders ?? 0}</b></div>
        <div className="stat-card"><small>Delivered sales</small><b>{money(stats?.deliveredSales ?? 0)}</b></div>
        <div className="stat-card"><small>Available stock units</small><b>{stats?.availableInventory ?? 0}</b></div>
      </div>
      <p className="form-hint">Delivered sales count only delivered order items; cash-on-delivery orders are not counted as delivered before fulfillment.</p>
      {stats?.ordersByStatus && <p className="form-hint">Orders by status: {Object.entries(stats.ordersByStatus).map(([status, count]) => `${status}: ${count}`).join(' · ') || 'No orders yet'}</p>}
      <div className="dashboard-section-title"><div><span className="eyebrow">Pending approvals</span><h2>Product review queue</h2></div></div>
      <div className="orders-list">{products.filter((product) => product.status === 'pending').length ? products.filter((product) => product.status === 'pending').map((product) => <article className="order-card" key={product._id}><div className="order-top"><div><span className="eyebrow">{product.category}</span><b>{product.name}</b></div><strong>{money(product.price)}</strong></div><p>{product.description}</p><div className="detail-maker"><span className="maker-avatar">✳</span><span><small>Artisan</small><b>{product.artisan?.name || 'Unknown artisan'}</b></span></div><small>Production cost: {money(product.productionCost || 0)} · Stock: {product.stock}</small><div className="form-row"><button className="button button-dark" type="button" onClick={() => updateProductStatus(product._id, 'available')}>Approve</button><button className="button button-outline" type="button" onClick={() => updateProductStatus(product._id, 'rejected', rejectionFeedback[product._id] || '')}>Reject</button></div><label className="review-feedback-label">Feedback for artisan (optional)<textarea maxLength={500} rows={2} value={rejectionFeedback[product._id] || ''} onChange={(event) => setRejectionFeedback((current) => ({ ...current, [product._id]: event.target.value }))} /></label></article>) : <EmptyState title="No pending products" text="Everything is clear for now." action="Refresh" onClick={() => window.location.reload()} />}</div>
      <div className="dashboard-section-title"><div><span className="eyebrow">Inventory</span><h2>Marketplace products</h2></div></div>
      <div className="orders-list">{products.map((product) => <article className="order-card" key={product._id}><div className="order-top"><div><span className="eyebrow">{product.category}</span><b>{product.name}</b></div><strong>{money(product.price)}</strong></div><p>Stock: {product.stock} · Status: {product.status}</p><small>Artisan: {product.artisan?.name || 'Unknown'} · Production cost: {money(product.productionCost || 0)}</small>{product.status === 'rejected' && product.reviewFeedback && <p className="form-hint">Rejection feedback: {product.reviewFeedback}</p>}{product.status === 'available' && <button className="link-button" type="button" onClick={() => updateProductStatus(product._id, 'rejected')}>Reject listing <span>→</span></button>}</article>)}</div>
    </>}
  </section>;
}

function AuthModal({ initialRole, onClose, onSuccess }) {
  const [role, setRole] = useState(initialRole);
  const [mode, setMode] = useState('login');
  const [fields, setFields] = useState({ name: '', email: '', phone: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const authPath = role === 'customer' ? '/customers' : role === 'admin' ? '/admin' : '/auth';
    const endpoint = role === 'admin' ? '/admin/login' : mode === 'register' ? `${authPath}/register` : `${authPath}/login`;
    const body = role === 'admin' ? { email: fields.email, password: fields.password } : mode === 'register' ? fields : { email: fields.email, password: fields.password };
    try {
      const result = await request(endpoint, { method: 'POST', body });
      const tokenValue = typeof result === 'string' ? result : result?.token || result?.accessToken;
      if (role === 'admin') {
        if (typeof tokenValue !== 'string' || tokenValue.length < 20) {
          setError(typeof result === 'string' ? result : 'Admin login failed.');
          return;
        }
        onSuccess({ role, token: tokenValue.replace(/^"|"$/g, ''), name: 'Marketplace Admin' });
        return;
      }
      if (mode === 'register') {
        setMode('login');
        setError(typeof result === 'string' ? result : 'Account created. Sign in to continue.');
      } else if (typeof tokenValue !== 'string' || tokenValue.length < 20) {
        setError(typeof result === 'string' ? result : 'The server did not return a valid sign-in token.');
      } else {
        onSuccess({ role, token: tokenValue.replace(/^"|"$/g, ''), name: fields.name || 'Marketplace user' });
      }
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><button className="modal-close" onClick={onClose} aria-label="Close sign in">×</button><span className="eyebrow">A warm welcome</span><h2 id="auth-title">{mode === 'login' ? 'Come on in.' : 'Make a little space.'}</h2><p>Sign in or join the Common Thread community.</p><div className="auth-tabs"><button className={role === 'customer' ? 'selected' : ''} onClick={() => { setRole('customer'); setMode('login'); setError(''); }}>Customer</button><button className={role === 'artisan' ? 'selected' : ''} onClick={() => { setRole('artisan'); setMode('login'); setError(''); }}>Artisan</button><button className={role === 'admin' ? 'selected' : ''} onClick={() => { setRole('admin'); setMode('login'); setError(''); }}>Admin</button></div>{role !== 'admin' && <button className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'New around here? Create an account' : 'Already part of the community? Sign in'}</button>}<form onSubmit={submit} className="auth-form">{role !== 'admin' && mode === 'register' && <><label>Your name<input autoComplete="name" required value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} /></label><label>Phone number<input autoComplete="tel" required value={fields.phone} onChange={(event) => setFields({ ...fields, phone: event.target.value })} /></label></>}<label>Email address<input type="email" autoComplete="email" required value={fields.email} onChange={(event) => setFields({ ...fields, email: event.target.value })} /></label><label>Password<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="6" required value={fields.password} onChange={(event) => setFields({ ...fields, password: event.target.value })} /></label>{error && <p className={error.startsWith('Account created') ? 'form-success' : 'form-error'} role="alert">{error}</p>}<button className="button button-dark full-width" disabled={busy}>{busy ? 'One moment…' : role === 'admin' ? 'Admin sign in' : mode === 'login' ? 'Sign in' : 'Create account'} <span>↗</span></button></form>{role !== 'admin' && <small className="auth-disclaimer">Your sign-in token stays in this browser tab session.</small>}</section></div>;
}

function SignInPrompt({ title, text, onAuth }) {
  return <section className="page-section prompt-section"><span className="prompt-mark">ct</span><h1>{title}</h1><p>{text}</p><button className="button button-dark" onClick={onAuth}>Sign in <span>↗</span></button></section>;
}

function EmptyState({ title, text, action, onClick }) {
  return <div className="empty-state"><span className="empty-flower">✳</span><h3>{title}</h3><p>{text}</p><button className="link-button" onClick={onClick}>{action} <span>→</span></button></div>;
}

function ErrorPanel({ message, onRetry }) {
  return <div className="error-panel" role="alert"><span>!</span><div><b>We couldn't load this just now.</b><small>{message}</small></div>{onRetry && <button onClick={onRetry}>Try again</button>}</div>;
}

function ProductSkeletons({ count }) {
  return <div className="product-grid">{Array.from({ length: count }, (_, index) => <div className="skeleton-card" key={index}><div className="skeleton-image" /><div className="skeleton-line" /><div className="skeleton-line short" /></div>)}</div>;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.2 4.2" /></svg>;
}

function CartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h8a2 2 0 0 0 1.9-1.4L21 8H6" /><circle cx="10" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></svg>;
}

export default App;

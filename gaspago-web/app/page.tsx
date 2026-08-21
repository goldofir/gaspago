'use client'

import { useEffect, useRef, useState } from 'react'

/* ————— Canvas flame: blue gas core, orange brand tips ————— */
function FlameCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0, h = 0, raf = 0
    const DPR = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) return
      w = rect.width; h = rect.height
      canvas.width = w * DPR; canvas.height = h * DPR
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number }
    const parts: P[] = []

    const spawn = () => {
      const cx = w / 2
      const spread = Math.min(w * 0.16, 90)
      parts.push({
        x: cx + (Math.random() - 0.5) * spread,
        y: h * 0.92,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -(1.4 + Math.random() * 2.2),
        life: 0,
        max: 55 + Math.random() * 45,
        r: 5 + Math.random() * 14,
      })
    }

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      for (let i = 0; i < 4; i++) spawn()

      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]
        p.life++
        p.x += p.vx + Math.sin((p.life + p.y) * 0.05) * 0.45
        p.y += p.vy
        p.vy *= 0.992
        const t = p.life / p.max
        if (t >= 1) { parts.splice(i, 1); continue }

        const alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
        const radius = p.r * (1 - t * 0.6)

        /* blue core at base → orange body → gold ember tips */
        let r: number, g: number, b: number
        if (t < 0.22) { r = 80; g = 140; b = 255 }
        else if (t < 0.55) { r = 255; g = 101; b = 36 }
        else { r = 255; g = 160; b = 60 }

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius)
        grad.addColorStop(0, `rgba(${r},${g},${b},${(alpha * 0.55).toFixed(3)})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fill()
      }

      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return <canvas ref={ref} className="flame-canvas" aria-hidden="true" />
}

/* ————— Scroll reveal: enhances already-visible content ————— */
function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = document.querySelectorAll('[data-reveal]')
    const io = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }),
      { threshold: 0.15 },
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
}

export default function Home() {
  useReveal()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="site">
      <style>{`
        .site {
          background: var(--navy);
          color: #EAF0F8;
          font-family: 'Sora', -apple-system, sans-serif;
          overflow-x: hidden;
          min-height: 100vh;
        }
        .site ::selection { background: var(--flame); color: var(--navy); }

        /* ——— Nav ——— */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px clamp(20px, 5vw, 64px);
          background: linear-gradient(to bottom, rgba(10,22,40,.92), rgba(10,22,40,0));
          backdrop-filter: blur(2px);
        }
        .nav-brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 17px; letter-spacing: -.02em; color: #fff; text-decoration: none; }
        .nav-brand:hover { text-decoration: none; }
        .nav-flame-ico {
          width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
          background: var(--flame);
          display: grid; place-items: center;
        }
        .nav-links { display: flex; align-items: center; gap: 26px; }
        .nav-link { color: #B9C6D8; font-size: 13.5px; font-weight: 400; text-decoration: none; transition: color .2s; }
        .nav-link:hover { color: #fff; text-decoration: none; }
        .nav-cta {
          background: var(--flame); color: var(--navy); font-weight: 700; font-size: 13.5px;
          padding: 9px 18px; border-radius: 10px; border: none; text-decoration: none;
          transition: transform .18s cubic-bezier(.22,1,.36,1), background .2s;
        }
        .nav-cta:hover { background: var(--flame-lt); transform: translateY(-1px); text-decoration: none; color: var(--navy); }
        .nav-burger { display: none; background: none; border: none; color: #fff; padding: 6px; }

        /* ——— Hero ——— */
        .hero {
          position: relative; min-height: 100vh;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          text-align: center; padding: 120px 20px 80px;
        }
        .flame-canvas {
          position: absolute; inset: 0; width: 100%; height: 100%;
          pointer-events: none; opacity: .85;
        }
        .hero-inner { position: relative; z-index: 2; max-width: 880px; }
        .hero h1 {
          font-size: clamp(2.4rem, 7vw, 5.2rem);
          font-weight: 800; line-height: 1.04; letter-spacing: -.035em;
          text-wrap: balance; color: #fff;
          animation: rise .9s cubic-bezier(.22,1,.36,1) both;
        }
        .hero h1 .pay { color: var(--flame); }
        .hero-sub {
          margin: 26px auto 0; max-width: 54ch;
          font-size: clamp(1rem, 1.6vw, 1.18rem); font-weight: 300; line-height: 1.65; color: #B9C6D8;
          animation: rise .9s .12s cubic-bezier(.22,1,.36,1) both;
        }
        .hero-ctas {
          margin-top: 42px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;
          animation: rise .9s .24s cubic-bezier(.22,1,.36,1) both;
        }
        .btn-primary {
          background: var(--flame); color: var(--navy);
          font-family: inherit; font-weight: 700; font-size: 15.5px;
          padding: 16px 32px; border-radius: 14px; border: none; text-decoration: none;
          display: inline-flex; align-items: center; gap: 9px;
          box-shadow: 0 8px 40px rgba(255,101,36,.35);
          transition: transform .18s cubic-bezier(.22,1,.36,1), box-shadow .2s, background .2s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 52px rgba(255,101,36,.5); background: var(--flame-lt); text-decoration: none; color: var(--navy); }
        .btn-ghost {
          background: rgba(255,255,255,.06); color: #EAF0F8;
          font-family: inherit; font-weight: 500; font-size: 15.5px;
          padding: 16px 32px; border-radius: 14px; border: 1px solid rgba(255,255,255,.14); text-decoration: none;
          display: inline-flex; align-items: center; gap: 9px;
          transition: background .2s, border-color .2s, transform .18s cubic-bezier(.22,1,.36,1);
        }
        .btn-ghost:hover { background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.28); transform: translateY(-2px); text-decoration: none; color: #fff; }
        @keyframes rise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: none; } }

        .hero-hint {
          position: absolute; bottom: 34px; left: 50%; transform: translateX(-50%);
          font-size: 12px; color: #5A6B84; letter-spacing: .04em;
          animation: rise .9s .5s cubic-bezier(.22,1,.36,1) both;
        }

        /* ——— Shared section shell ——— */
        .sec { padding: clamp(80px, 12vw, 150px) clamp(20px, 6vw, 72px); position: relative; }
        .sec-inner { max-width: 1080px; margin: 0 auto; }
        .sec h2 {
          font-size: clamp(1.8rem, 4.4vw, 3.1rem); font-weight: 800; letter-spacing: -.03em;
          line-height: 1.1; color: #fff; text-wrap: balance;
        }
        .sec-lead { margin-top: 18px; max-width: 58ch; font-size: 1.05rem; font-weight: 300; line-height: 1.7; color: #B9C6D8; }

        [data-reveal] { opacity: 1; transform: none; }
        @media (prefers-reduced-motion: no-preference) {
          [data-reveal] { opacity: .01; transform: translateY(34px); transition: opacity .8s cubic-bezier(.22,1,.36,1), transform .8s cubic-bezier(.22,1,.36,1); }
          [data-reveal].in { opacity: 1; transform: none; }
        }

        /* ——— Steps (real sequence) ——— */
        .steps { margin-top: 64px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: rgba(255,255,255,.08); border-radius: 20px; overflow: hidden; }
        .step { background: var(--navy-mid); padding: 38px 32px 44px; position: relative; }
        .step-n {
          font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--flame);
          display: inline-block; margin-bottom: 22px;
        }
        .step h3 { font-size: 1.25rem; font-weight: 700; letter-spacing: -.015em; color: #fff; margin-bottom: 10px; }
        .step p { font-size: .94rem; font-weight: 300; line-height: 1.65; color: #A6B4C8; }
        .step strong { color: #EAF0F8; font-weight: 600; }

        /* ——— FGOL: the gold moment ——— */
        .fgol { background: var(--gold); color: #241A02; }
        .fgol h2 { color: #241A02; }
        .fgol .sec-lead { color: #5C4A10; font-weight: 400; }
        .fgol-grid { margin-top: 58px; display: grid; grid-template-columns: 1.1fr .9fr; gap: clamp(32px, 6vw, 80px); align-items: center; }
        .fgol-points { display: flex; flex-direction: column; gap: 26px; }
        .fgol-point h3 { font-size: 1.1rem; font-weight: 700; letter-spacing: -.01em; margin-bottom: 6px; }
        .fgol-point p { font-size: .95rem; line-height: 1.65; color: #5C4A10; max-width: 46ch; }
        .fgol-ticket {
          background: #241A02; border-radius: 22px; padding: 34px 32px;
          font-family: 'JetBrains Mono', monospace; color: #F5E6B8;
          box-shadow: 0 24px 80px rgba(36,26,2,.35);
          transform: rotate(1.6deg);
        }
        .fgol-ticket .row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; }
        .fgol-ticket .row + .row { border-top: 1px dashed rgba(245,230,184,.25); }
        .fgol-ticket .dim { color: #A8955C; }
        .fgol-ticket .big { font-size: 21px; font-weight: 500; }
        .fgol-ticket .flame-txt { color: #FFB35C; }
        .fgol-ticket .cash { color: var(--gold); font-weight: 500; }

        /* ——— Network ——— */
        .net-grid { margin-top: 58px; display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
        .net-card {
          border: 1px solid rgba(255,255,255,.1); border-radius: 18px; padding: 26px 20px;
          background: linear-gradient(160deg, rgba(255,255,255,.045), rgba(255,255,255,0));
        }
        .net-pct { font-family: 'JetBrains Mono', monospace; font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 500; color: var(--flame); letter-spacing: -.02em; }
        .net-lv { margin-top: 6px; font-size: .82rem; color: #8DA0BB; }
        .net-desc { margin-top: 14px; font-size: .88rem; font-weight: 300; line-height: 1.6; color: #A6B4C8; }

        /* ——— Distribuidoras ——— */
        .dist { background: #071120; }
        .dist-flex { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(36px, 6vw, 90px); align-items: center; }
        .dist-list-b { margin-top: 30px; display: flex; flex-direction: column; gap: 0; }
        .dist-item { display: flex; gap: 16px; padding: 20px 0; border-top: 1px solid rgba(255,255,255,.08); }
        .dist-item:last-child { border-bottom: 1px solid rgba(255,255,255,.08); }
        .dist-item-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--flame); margin-top: 8px; flex-shrink: 0; }
        .dist-item h3 { font-size: 1.02rem; font-weight: 600; color: #fff; margin-bottom: 4px; }
        .dist-item p { font-size: .9rem; font-weight: 300; line-height: 1.6; color: #A6B4C8; }
        .dist-cta-box {
          border-radius: 24px; padding: clamp(34px, 4vw, 52px);
          background: radial-gradient(120% 140% at 20% 0%, rgba(255,101,36,.22), rgba(255,101,36,.04) 55%),
                      var(--navy-mid);
          border: 1px solid rgba(255,101,36,.25);
        }
        .dist-cta-box h3 { font-size: clamp(1.4rem, 2.6vw, 1.9rem); font-weight: 800; letter-spacing: -.02em; color: #fff; line-height: 1.2; }
        .dist-cta-box p { margin: 16px 0 28px; font-size: .96rem; font-weight: 300; line-height: 1.65; color: #B9C6D8; }

        /* ——— Final CTA ——— */
        .final { text-align: center; padding-bottom: clamp(100px, 14vw, 180px); }
        .final h2 { font-size: clamp(2.2rem, 6vw, 4.4rem); }
        .final .sec-lead { margin-left: auto; margin-right: auto; text-align: center; }
        .final-ctas { margin-top: 44px; display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }

        /* ——— Footer ——— */
        .footer {
          border-top: 1px solid rgba(255,255,255,.08);
          padding: 40px clamp(20px, 6vw, 72px);
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 18px;
        }
        .footer-brand { display: flex; align-items: center; gap: 9px; font-weight: 800; font-size: 15px; color: #fff; }
        .footer-links { display: flex; gap: 22px; }
        .footer-links a { color: #7C8DA6; font-size: 13px; text-decoration: none; transition: color .2s; }
        .footer-links a:hover { color: #fff; text-decoration: none; }
        .footer-copy { font-size: 12.5px; color: #51617A; width: 100%; text-align: left; margin-top: 6px; }

        /* ——— Mobile ——— */
        @media (max-width: 1100px) {
          .net-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 860px) {
          .fgol-grid, .dist-flex { grid-template-columns: 1fr; }
          .fgol-ticket { transform: rotate(0); max-width: 420px; }
          .net-grid { grid-template-columns: repeat(2, 1fr); }
          .steps { grid-template-columns: 1fr; }
        }
        @media (max-width: 700px) {
          .nav-links {
            display: none;
            position: fixed; top: 0; right: 0; bottom: 0; width: min(78vw, 320px);
            background: var(--navy-mid); flex-direction: column; align-items: flex-start;
            padding: 90px 32px 32px; gap: 24px; z-index: 60;
            box-shadow: -20px 0 60px rgba(0,0,0,.4);
          }
          .nav-links.open { display: flex; }
          .nav-burger { display: block; z-index: 70; position: relative; }
          .nav-link { font-size: 16px; }
          .hero { min-height: 92vh; }
        }
      `}</style>

      {/* ————— Nav ————— */}
      <header className="nav">
        <a className="nav-brand" href="/">
          <span className="nav-flame-ico" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2c1 4-4 6-4 11a6 6 0 0 0 12 0c0-2-1-4-2.5-5.5C17 10 15 11 15 9c0-2.5-1.5-5.5-3-7z" fill="#0A1628"/>
            </svg>
          </span>
          GÁS<span style={{ color: 'var(--flame)' }}>PAGO</span>
        </a>
        <nav className={`nav-links${menuOpen ? ' open' : ''}`}>
          <a className="nav-link" href="#como-funciona" onClick={() => setMenuOpen(false)}>Como funciona</a>
          <a className="nav-link" href="#fgol" onClick={() => setMenuOpen(false)}>FGOL</a>
          <a className="nav-link" href="#distribuidoras" onClick={() => setMenuOpen(false)}>Distribuidoras</a>
          <a className="nav-cta" href="#baixar" onClick={() => setMenuOpen(false)}>Baixar o app</a>
        </nav>
        <button className="nav-burger" aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'} onClick={() => setMenuOpen(o => !o)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {menuOpen ? <><path d="M18 6 6 18"/><path d="m6 6 12 12"/></> : <><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>}
          </svg>
        </button>
      </header>

      {/* ————— Hero ————— */}
      <section className="hero">
        <FlameCanvas />
        <div className="hero-inner">
          <h1>Seu gás chega em minutos.<br /><span className="pay">E ele paga você de volta.</span></h1>
          <p className="hero-sub">
            Peça o botijão pelo app ou WhatsApp, receba da distribuidora mais próxima
            e ganhe cashback em FGOL a cada pedido. Simples assim.
          </p>
          <div className="hero-ctas">
            <a className="btn-primary" href="#baixar">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/></svg>
              Baixar o app
            </a>
            <a className="btn-ghost" href="https://wa.me/" target="_blank" rel="noopener noreferrer">
              Pedir pelo WhatsApp
            </a>
          </div>
        </div>
        <span className="hero-hint">role para descobrir</span>
      </section>

      {/* ————— Como funciona ————— */}
      <section className="sec" id="como-funciona">
        <div className="sec-inner">
          <div data-reveal>
            <h2>Do pedido à chama acesa,<br />em três passos.</h2>
          </div>
          <div className="steps" data-reveal>
            <div className="step">
              <span className="step-n">01</span>
              <h3>Peça onde preferir</h3>
              <p>Pelo <strong>app</strong> ou direto no <strong>WhatsApp</strong> — digite &ldquo;gás&rdquo;, informe o CEP e escolha a distribuidora com o melhor preço, nota e prazo.</p>
            </div>
            <div className="step">
              <span className="step-n">02</span>
              <h3>Receba em minutos</h3>
              <p>A distribuidora <strong>mais próxima</strong> aceita na hora. Pague com <strong>PIX</strong>, cartão ou seu próprio saldo FGOL — sem dinheiro na porta.</p>
            </div>
            <div className="step">
              <span className="step-n">03</span>
              <h3>Ganhe de volta</h3>
              <p>Entrega confirmada, <strong>cashback em FGOL</strong> cai na sua carteira automaticamente. Junte e pague o próximo botijão com ele.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ————— FGOL ————— */}
      <section className="sec fgol" id="fgol">
        <div className="sec-inner">
          <div data-reveal>
            <h2>FGOL: o troco que valoriza.</h2>
            <p className="sec-lead">
              Cashback de verdade — um token real na rede Polygon, não pontinho de programa de fidelidade.
              Cada botijão devolve uma parte do valor direto na sua carteira.
            </p>
          </div>
          <div className="fgol-grid">
            <div className="fgol-points" data-reveal>
              <div className="fgol-point">
                <h3>Cai sozinho, sem resgate</h3>
                <p>Entrega confirmada, FGOL creditado. Sem cupom, sem cadastro extra, sem pegadinha de validade curta.</p>
              </div>
              <div className="fgol-point">
                <h3>Vale como dinheiro no app</h3>
                <p>Use o saldo para abater o próximo pedido — pagamento misto com PIX ou cartão quando faltar.</p>
              </div>
              <div className="fgol-point">
                <h3>Seu, de verdade</h3>
                <p>FGOL é registrado em blockchain pública. Transparência total sobre quanto você tem e quanto vale.</p>
              </div>
            </div>
            <div data-reveal>
              <div className="fgol-ticket" role="img" aria-label="Exemplo de pedido: botijão 13 quilos por 109 reais, pago via PIX, com cashback de 54 FGOL creditado">
                <div className="row"><span className="dim">PEDIDO</span><span>#1203</span></div>
                <div className="row"><span>Botijão 13kg</span><span>R$ 109,00</span></div>
                <div className="row"><span className="dim">Pagamento</span><span>PIX</span></div>
                <div className="row"><span className="dim">Entrega</span><span className="flame-txt">28 min</span></div>
                <div className="row big"><span>Cashback</span><span className="cash">+54 FGOL</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ————— Distribuidoras ————— */}
      <section className="sec dist" id="distribuidoras">
        <div className="sec-inner">
          <div className="dist-flex">
            <div data-reveal>
              <h2>Para distribuidoras:<br />venda mais, sem call center.</h2>
              <div className="dist-list-b">
                <div className="dist-item">
                  <span className="dist-item-dot" aria-hidden="true" />
                  <div>
                    <h3>Pedidos direto no seu painel</h3>
                    <p>App e WhatsApp viram canais de venda. Você recebe, aceita e despacha — tudo num lugar só.</p>
                  </div>
                </div>
                <div className="dist-item">
                  <span className="dist-item-dot" aria-hidden="true" />
                  <div>
                    <h3>Repasse automático via PIX</h3>
                    <p>Pagamento cai com split automático. Sem conciliação manual, sem boleto atrasado.</p>
                  </div>
                </div>
                <div className="dist-item">
                  <span className="dist-item-dot" aria-hidden="true" />
                  <div>
                    <h3>Clientes que voltam</h3>
                    <p>O cashback em FGOL fideliza pra você — quem ganha de volta pede de novo no mesmo lugar.</p>
                  </div>
                </div>
              </div>
            </div>
            <div data-reveal>
              <div className="dist-cta-box">
                <h3>Cadastre sua distribuidora e comece a receber pedidos.</h3>
                <p>Sem taxa de adesão. Você define preço, área de entrega e percentual de cashback — a plataforma cuida do resto.</p>
                <a className="btn-primary" href="https://wa.me/" target="_blank" rel="noopener noreferrer">Quero ser parceira</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ————— Final CTA ————— */}
      <section className="sec final" id="baixar">
        <div className="sec-inner" data-reveal>
          <h2>Acenda o <span style={{ color: 'var(--flame)' }}>Gás Pago</span>.</h2>
          <p className="sec-lead">
            Grátis para baixar. O primeiro pedido já rende FGOL.
          </p>
          <div className="final-ctas">
            <a className="btn-primary" href="#" aria-disabled="true" title="Em breve nas lojas">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="3"/><path d="M12 18h.01"/></svg>
              Baixar o app
            </a>
            <a className="btn-ghost" href="https://wa.me/" target="_blank" rel="noopener noreferrer">Pedir pelo WhatsApp</a>
          </div>
        </div>
      </section>

      {/* ————— Footer ————— */}
      <footer className="footer">
        <div className="footer-brand">
          <span className="nav-flame-ico" aria-hidden="true" style={{ width: 24, height: 24, borderRadius: 7 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 2c1 4-4 6-4 11a6 6 0 0 0 12 0c0-2-1-4-2.5-5.5C17 10 15 11 15 9c0-2.5-1.5-5.5-3-7z" fill="#0A1628"/>
            </svg>
          </span>
          GÁS<span style={{ color: 'var(--flame)' }}>PAGO</span>
        </div>
        <div className="footer-links">
          <a href="#como-funciona">Como funciona</a>
          <a href="#fgol">FGOL</a>
          <a href="#distribuidoras">Distribuidoras</a>
          <a href="/termos">Termos</a>
          <a href="/privacidade">Privacidade</a>
          <a href="/admin">Painel</a>
        </div>
        <p className="footer-copy">© 2026 Gás Pago. Todos os direitos reservados.</p>
      </footer>
    </div>
  )
}

// ============================================================
// AZ Representações — Sections
// ============================================================

const { useEffect, useRef, useState } = React;

// -------------------- useReveal --------------------

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nodes = Array.from(el.querySelectorAll('.reveal, .reveal-slide'));
    if (!nodes.length) return;

    const pending = new Set(nodes);
    const timers = new Set();

    let safetyDelay = 1500;
    try {
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;top:-9999px;opacity:0;animation:revealIn 100ms forwards;';
      document.body.appendChild(probe);
      requestAnimationFrame(() => {
        setTimeout(() => {
          const op = parseFloat(getComputedStyle(probe).opacity || '0');
          if (op < 0.5) safetyDelay = 120;
          probe.remove();
        }, 140);
      });
    } catch (e) {}

    const revealNode = (node) => {
      node.classList.add('in');
      const t = setTimeout(() => { node.classList.add('revealed-final'); timers.delete(t); }, safetyDelay);
      timers.add(t);
      const onEnd = () => { node.classList.add('revealed-final'); node.removeEventListener('animationend', onEnd); };
      node.addEventListener('animationend', onEnd);
    };

    const check = () => {
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const threshold = vh * 0.93;
      pending.forEach((node) => {
        const r = node.getBoundingClientRect();
        if (r.top < threshold && r.bottom > 0) { revealNode(node); pending.delete(node); }
      });
      if (pending.size === 0) { window.removeEventListener('scroll', check); window.removeEventListener('resize', check); }
    };

    check();
    const t = setTimeout(check, 50);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);

    let io;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting && pending.has(e.target)) { revealNode(e.target); pending.delete(e.target); io.unobserve(e.target); }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -6% 0px' }
      );
      nodes.forEach((n) => io.observe(n));
    }

    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      clearTimeout(t);
      timers.forEach((tm) => clearTimeout(tm));
      if (io) io.disconnect();
    };
  }, []);
  return ref;
}

// -------------------- useMagnetic --------------------

function useMagnetic(strength = 0.3) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const onMove = (e) => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = e.clientX - cx;
        const dy = e.clientY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.max(r.width, r.height) * 1.6;
        if (dist < maxDist) {
          const f = (1 - dist / maxDist) * strength;
          el.style.transition = 'transform 0.25s cubic-bezier(0.16,1,0.3,1)';
          el.style.transform = `translate(${dx * f}px,${dy * f}px)`;
        } else {
          el.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
          el.style.transform = '';
        }
        ticking = false;
      });
    };
    const onLeave = () => { el.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)'; el.style.transform = ''; };
    window.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('mouseleave', onLeave);
    return () => { window.removeEventListener('mousemove', onMove); el.removeEventListener('mouseleave', onLeave); };
  }, [strength]);
  return ref;
}

// -------------------- CountUp --------------------

function CountUp({ target }) {
  const [value, setValue] = useState(0);
  const ref = useRef(null);
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !done.current) {
        done.current = true;
        io.disconnect();
        const dur = 1800;
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min((now - start) / dur, 1);
          const ease = 1 - Math.pow(1 - t, 3);
          setValue(Math.round(ease * target));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return <span ref={ref}>{value}</span>;
}

// -------------------- MarcaCard --------------------

function MarcaCard({ b }) {
  const isPdf = b.logo?.toLowerCase().endsWith('.pdf');
  return (
    <a
      className="marca"
      href={b.href}
      target="_blank"
      rel="noopener noreferrer"
      data-hover
      aria-label={`${b.name} - site oficial`}
      style={{ '--logo-scale': b.logoScale ?? 1 }}
    >
      <div className="marca-logo-frame">
        {isPdf ? (
          <object className="marca-logo-object" data={b.logo} type="application/pdf" aria-label={`${b.name} logo`}>
            <span className="marca-fallback">{b.name}</span>
          </object>
        ) : (
          <img className="marca-logo-image" src={b.logo} alt={`${b.name} logo`} loading="lazy" />
        )}
      </div>
      <div className="marca-copy">
        <div className="marca-name">{b.name}</div>
        <div className="marca-meta">{b.meta}</div>
      </div>
    </a>
  );
}

// -------------------- Side Index --------------------

const CHAPTERS = [
  { roman: 'I',   label: 'Sobre',   href: '#sobre' },
  { roman: 'II',  label: 'Ambientes', href: '#colecao' },
  { roman: 'III', label: 'Marcas',  href: '#marcas' },
  { roman: 'IV',  label: 'Contato', href: '#contato' },
];

function SideIndex() {
  const [active, setActive] = useState(null);
  useEffect(() => {
    const onScroll = () => {
      const probe = (window.innerHeight || 800) * 0.45;
      let found = null;
      CHAPTERS.forEach((c) => {
        const el = document.querySelector(c.href);
        if (!el) return;
        if (el.getBoundingClientRect().top <= probe) found = c.href;
      });
      setActive(found);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className="side-index" aria-label="Capítulos">
      {CHAPTERS.map((c) => (
        <a key={c.href} href={c.href} className={`si-item${active === c.href ? ' active' : ''}`}>
          <span className="roman">{c.roman}</span>
          <span className="tick"></span>
          <span className="si-label">{c.label}</span>
        </a>
      ))}
    </nav>
  );
}

// -------------------- Section Eyebrow --------------------

function SectionEyebrow({ roman, label }) {
  return (
    <div className="section-eyebrow reveal">
      <span className="roman">{roman}</span>
      <span className="rule"></span>
      <span className="label">{label}</span>
    </div>
  );
}

// -------------------- Nav --------------------

function Nav({ isDark, onToggle }) {
  const [scrolled, setScrolled] = useState(false);
  const [overMedia, setOverMedia] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const band = 84; // faixa ocupada pela navbar no topo
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      // transparente SOMENTE quando uma imagem do carrossel esta atras da navbar
      const vps = document.querySelectorAll('.carousel');
      let over = false;
      vps.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= band && r.bottom >= 0) over = true;
      });
      setOverMedia(over);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#sobre',   label: 'Sobre' },
    { href: '#colecao', label: 'Ambientes' },
    { href: '#marcas',  label: 'Marcas' },
    { href: '#contato', label: 'Contato' },
  ];

  return (
    <nav className={`nav${scrolled ? ' scrolled' : ''}${overMedia ? ' over-media' : ''}${menuOpen ? ' menu-open' : ''}`}>
      <a href="#top" className="nav-mark" data-hover onClick={() => setMenuOpen(false)}>
        <img src="assets/logo-az-purple.png" alt="AZ Representações" className="nav-logo" />
      </a>
      <div className="nav-links">
        {links.map((l) => (
          <a key={l.href} href={l.href} data-hover>{l.label}</a>
        ))}
      </div>
      <div className="nav-controls">
      <button
        className="nav-theme-toggle"
        onClick={onToggle}
        aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
        title={isDark ? 'Modo claro' : 'Modo escuro'}
      >
        {isDark ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="rgba(184,160,130,0.9)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1"  x2="12" y2="3"/>
            <line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1"  y1="12" x2="3"  y2="12"/>
            <line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
            <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(42,20,50,0.82)">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>
      <button
        className="nav-burger"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuOpen}
      >
        <span></span><span></span><span></span>
      </button>
      </div>
      <div className={`nav-mobile${menuOpen ? ' open' : ''}`}>
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
        ))}
        <a
          className="nav-mobile-ig"
          href="https://www.instagram.com/az_representacoes/"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMenuOpen(false)}
        >Instagram</a>
      </div>
    </nav>
  );
}

// -------------------- ModernChandelierDrop --------------------

function ModernChandelierDrop() {
  const ch = (a) => `rgba(188,170,150,${a})`;
  const pl = (a) => `rgba(28,24,30,${a})`;

  return (
    <div className="hero-chandelier" aria-hidden="true">
      <svg viewBox="0 0 220 280" width="160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ch-rod" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d9cbbb" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#9b8a77" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="ch-shade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5f0e9" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#ddd3c6" stopOpacity="0.93" />
          </linearGradient>
          <linearGradient id="ch-brass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c6b097" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#8c7459" stopOpacity="0.98" />
          </linearGradient>
          <filter id="ch-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.12" />
          </filter>
        </defs>
        <ellipse cx="110" cy="248" rx="40" ry="7" fill={pl(0.08)} />
        <rect x="100" y="4" width="20" height="8" rx="4" fill={pl(0.76)} stroke={ch(0.18)} strokeWidth="0.8" />
        <line x1="110" y1="12" x2="110" y2="48" stroke="url(#ch-rod)" strokeWidth="1.3" />
        <rect x="94" y="48" width="32" height="6" rx="3" fill="url(#ch-brass)" stroke={ch(0.22)} strokeWidth="0.7" />
        <line x1="110" y1="54" x2="110" y2="100" stroke="url(#ch-rod)" strokeWidth="1.1" />
        <g filter="url(#ch-soft)">
          {/* cúpula dome em latão (mid-century) */}
          <path d="M70 154 C70 116 88 100 110 100 C132 100 150 116 150 154 Z" fill="url(#ch-brass)" stroke={ch(0.4)} strokeWidth="1" />
          <path d="M82 150 C82 124 94 112 110 112 C126 112 138 124 138 150 Z" fill={pl(0.06)} />
          <path d="M78 116 C92 106 128 106 142 116" stroke={ch(0.5)} strokeWidth="0.7" />
          {/* aro inferior */}
          <ellipse cx="110" cy="154" rx="40" ry="7" fill="url(#ch-brass)" stroke={ch(0.32)} strokeWidth="0.8" />
          <ellipse cx="110" cy="154" rx="30" ry="5" fill={pl(0.12)} />
          {/* globo de luz quente */}
          <circle cx="110" cy="159" r="9" fill="#f6ecd8" stroke={ch(0.3)} strokeWidth="0.6" />
          <circle cx="110" cy="158" r="4.5" fill="#fff7e6" />
        </g>
      </svg>
    </div>
  );
}

// -------------------- ModernFloorFurniture --------------------

function ModernFloorFurniture() {
  const ch = (a) => `rgba(188,170,150,${a})`;
  const pl = (a) => `rgba(28,24,30,${a})`;
  const wood = (a) => `rgba(126,90,62,${a})`;

  return (
    <div className="hero-furniture" aria-hidden="true">
      <div
        className="furniture-chair"
        style={{ '--drop-delay': '0.08s', '--drop-duration': '1.3s', '--drop-x': '-8px', '--drop-rot-start': '-7deg', '--drop-rot-mid': '-1deg' }}
      >
        <svg viewBox="0 0 220 230" width="154" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="chair-upholstery" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#efe6da" />
              <stop offset="100%" stopColor="#d3c1ac" />
            </linearGradient>
            <linearGradient id="chair-wood" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ab7b51" />
              <stop offset="100%" stopColor="#7a5336" />
            </linearGradient>
          </defs>
          <ellipse cx="110" cy="202" rx="62" ry="9" fill={pl(0.09)} />
          {/* pernas de madeira anguladas (mid-century) */}
          <g stroke="url(#chair-wood)" strokeLinecap="round">
            <line x1="74" y1="150" x2="56" y2="196" strokeWidth="7" />
            <line x1="146" y1="150" x2="164" y2="196" strokeWidth="7" />
            <line x1="88" y1="146" x2="80" y2="190" strokeWidth="6" />
            <line x1="132" y1="146" x2="140" y2="190" strokeWidth="6" />
          </g>
          {/* encosto reclinado de linhas limpas */}
          <path d="M54 60 C54 36 72 26 110 26 C148 26 166 36 166 60 L166 116 L54 116 Z" fill={ch(0.82)} stroke={pl(0.3)} strokeWidth="1.1" />
          <path d="M62 58 C62 40 76 32 110 32 C144 32 158 40 158 58 L158 110 L62 110 Z" fill="url(#chair-upholstery)" stroke={pl(0.24)} strokeWidth="0.9" />
          <path d="M110 38 L110 104" stroke={pl(0.12)} strokeWidth="0.8" />
          {/* braços baixos arredondados */}
          <rect x="42" y="92" width="22" height="44" rx="11" fill={ch(0.7)} stroke={pl(0.24)} strokeWidth="0.9" />
          <rect x="156" y="92" width="22" height="44" rx="11" fill={ch(0.7)} stroke={pl(0.24)} strokeWidth="0.9" />
          {/* assento */}
          <path d="M58 116 H162 L156 148 H64 Z" fill="url(#chair-upholstery)" stroke={pl(0.22)} strokeWidth="0.9" />
          <path d="M64 148 H156 L154 156 H66 Z" fill={ch(0.5)} stroke={pl(0.2)} strokeWidth="0.7" />
        </svg>
      </div>

      <div
        className="furniture-sofa"
        style={{ '--drop-delay': '0.34s', '--drop-duration': '1.7s', '--drop-x': '0px', '--drop-rot-start': '3deg', '--drop-rot-mid': '0deg' }}
      >
        <svg viewBox="0 0 360 230" width="280" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="sofa-fabric" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eee5d9" />
              <stop offset="100%" stopColor="#d2c0ac" />
            </linearGradient>
            <linearGradient id="sofa-base" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a7764e" />
              <stop offset="100%" stopColor="#734c30" />
            </linearGradient>
          </defs>
          <ellipse cx="180" cy="198" rx="126" ry="10" fill={pl(0.08)} />
          {/* pés de madeira angulados (mid-century) */}
          <g stroke="url(#sofa-base)" strokeLinecap="round">
            <line x1="62" y1="150" x2="48" y2="186" strokeWidth="8" />
            <line x1="298" y1="150" x2="312" y2="186" strokeWidth="8" />
            <line x1="150" y1="150" x2="144" y2="182" strokeWidth="7" />
            <line x1="210" y1="150" x2="216" y2="182" strokeWidth="7" />
          </g>
          {/* encosto baixo + duas almofadas */}
          <rect x="34" y="56" width="292" height="58" rx="16" fill={ch(0.82)} stroke={pl(0.24)} strokeWidth="1" />
          <rect x="48" y="48" width="138" height="54" rx="12" fill="url(#sofa-fabric)" stroke={pl(0.2)} strokeWidth="0.8" />
          <rect x="174" y="48" width="138" height="54" rx="12" fill="url(#sofa-fabric)" stroke={pl(0.2)} strokeWidth="0.8" />
          {/* braços baixos */}
          <rect x="28" y="80" width="26" height="62" rx="13" fill={ch(0.72)} stroke={pl(0.22)} strokeWidth="0.9" />
          <rect x="306" y="80" width="26" height="62" rx="13" fill={ch(0.72)} stroke={pl(0.22)} strokeWidth="0.9" />
          {/* base + assentos separados */}
          <rect x="42" y="110" width="276" height="40" rx="14" fill={pl(0.09)} stroke={pl(0.2)} strokeWidth="0.9" />
          <rect x="58" y="114" width="120" height="32" rx="10" fill="url(#sofa-fabric)" stroke={pl(0.16)} strokeWidth="0.7" />
          <rect x="182" y="114" width="120" height="32" rx="10" fill="url(#sofa-fabric)" stroke={pl(0.16)} strokeWidth="0.7" />
        </svg>
      </div>

      <div
        className="furniture-table"
        style={{ '--drop-delay': '0.58s', '--drop-duration': '1.1s', '--drop-x': '6px', '--drop-rot-start': '9deg', '--drop-rot-mid': '1deg' }}
      >
        <svg viewBox="0 0 150 170" width="96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="table-top" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#a9764d" />
              <stop offset="100%" stopColor="#70482d" />
            </linearGradient>
          </defs>
          <ellipse cx="75" cy="158" rx="40" ry="6" fill={pl(0.08)} />
          {/* pernas em tripé de madeira anguladas */}
          <g stroke="url(#table-top)" strokeLinecap="round">
            <line x1="75" y1="56" x2="44" y2="140" strokeWidth="7" />
            <line x1="75" y1="56" x2="106" y2="140" strokeWidth="7" />
            <line x1="75" y1="58" x2="75" y2="144" strokeWidth="6" />
          </g>
          {/* tampo redondo */}
          <ellipse cx="75" cy="36" rx="49" ry="11" fill={pl(0.16)} stroke={pl(0.24)} strokeWidth="1" />
          <ellipse cx="75" cy="32" rx="49" ry="11" fill="url(#table-top)" stroke={pl(0.18)} strokeWidth="0.8" />
          <ellipse cx="75" cy="32" rx="35" ry="7" fill={ch(0.12)} stroke={pl(0.1)} strokeWidth="0.6" />
          {/* cubo central de junção */}
          <rect x="70" y="40" width="10" height="20" rx="3" fill={wood(0.4)} stroke={pl(0.2)} strokeWidth="0.7" />
        </svg>
      </div>
    </div>
  );
}

// -------------------- Hero --------------------

function Hero({ chandelierKey }) {
  const bgRef = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      if (!bgRef.current) return;
      const y = window.scrollY;
      bgRef.current.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(${1 + y * 0.0002})`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section id="top" className="hero">
      <div className="hero-bg">
        <div className="hero-overlay"></div>
        <div className="hero-orbs">
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>
          <div className="orb orb-3"></div>
        </div>
        <div className="hero-bg-noise"></div>
      </div>

      {/* key={chandelierKey} força re-mount ao voltar pro modo escuro → apenas o lustre cai e acende */}
      <ModernChandelierDrop key={chandelierKey} />
      <ModernFloorFurniture />

      <div className="hero-content">
        <div className="hero-eyebrow">
          <div className="eyebrow">
            <span className="dash"></span>
            Representação Comercial · Desde 2007
          </div>
        </div>

        <h1 className="hero-title">
          <span className="line-mask"><span className="line">Representação</span></span>
          <span className="line-mask"><span className="line">Comercial de</span></span>
          <span className="line-mask"><span className="line">Mobiliário de</span></span>
          <span className="line-mask"><span className="line"><span className="accent italic">Alto Padrão.</span></span></span>
        </h1>

        <div className="hero-credentials">
          <span>17 anos</span>
          <span className="cred-sep">·</span>
          <span>Lojas conceituadas</span>
          <span className="cred-sep">·</span>
          <span>Regiões de atuação</span>
        </div>

        <div className="hero-meta">
          <div className="hero-tagline">
            Através de lojas conceituadas, unimos marcas reconhecidas pelo
            design, inovação e excelência a quem busca transformar ambientes
            comuns em inesquecíveis.
          </div>
          <div className="scroll-cue">
            <span>Role</span>
            <span className="bar"></span>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------------------- Sobre --------------------

function Sobre() {
  const ref = useReveal();
  return (
    <section id="sobre" className="section sobre" ref={ref}>
      <div className="section-inner">
        <div className="section-head">
          <div className="head-left">
            <SectionEyebrow roman="I" label="Sobre" />
            <h2 className="section-title reveal d1">
              Representamos mobiliário<br />
              de <em>design atemporal.</em>
            </h2>
          </div>
          <p className="section-lead reveal d2">
            O mobiliário de alto padrão é resultado de pessoas, materiais
            e tempo — e merece ser apresentado com a mesma atenção com que
            é feito.
          </p>
        </div>

        <div className="sobre-grid">
          <div className="sobre-text">
            <p className="reveal dropcap">
              A AZ Representações é a interlocutora, nas regiões de atuação,
              de fábricas de mobiliário que entendem que cada espaço é único
              e especial. Trabalhamos lado a lado com lojistas de referência
              e seus arquitetos e designers parceiros para criar ambientes
              que duram gerações.
            </p>
            <p className="reveal d1">
              Cada fábrica que representamos é escolhida pelo ofício antes
              do nome — pela maneira como tratam a madeira, pedra, couro,
              tecido e metal. E principalmente, pelo modo como suas peças
              envelhecem, pelas mãos por trás de cada acabamento. Não somos
              um catálogo amplo, e sim uma curadoria estreita.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}

// -------------------- Categorias --------------------

const CATEGORIES = [
  {
    n: '01', name: 'Sala de Estar',
    desc: 'Century, Tumar, Iummi e Schuster.',
    // Ordem definida pelo cliente (cronológica das fotos; a 12 vai por último).
    // Fotos tratadas em Images_Sala_Estar/melhoradas/ como sala_01.jpg … sala_12.jpg.
    // (o carrossel é tela cheia — 'format' do grid antigo não se aplica;
    //  ajustar 'pos'/'fit' por foto depois se alguma cortar mal.)
    shots: [
      { src: 'Images_Sala_Estar/melhoradas/sala_01.jpg', caption: 'Sala de Estar · 01' },
      { src: 'Images_Sala_Estar/melhoradas/sala_02.jpg', caption: 'Sala de Estar · 02' },
      { src: 'Images_Sala_Estar/melhoradas/sala_03.jpg', caption: 'Sala de Estar · 03' },
      { src: 'Images_Sala_Estar/melhoradas/sala_04.jpg', caption: 'Sala de Estar · 04' },
      { src: 'Images_Sala_Estar/melhoradas/sala_05.jpg', caption: 'Sala de Estar · 05' },
      { src: 'Images_Sala_Estar/melhoradas/sala_06.jpg', caption: 'Sala de Estar · 06' },
      { src: 'Images_Sala_Estar/melhoradas/sala_07.jpg', caption: 'Sala de Estar · 07' },
      { src: 'Images_Sala_Estar/melhoradas/sala_08.jpg', caption: 'Sala de Estar · 08' },
      { src: 'Images_Sala_Estar/melhoradas/sala_09.jpg', caption: 'Sala de Estar · 09' },
      { src: 'Images_Sala_Estar/melhoradas/sala_10.jpg', caption: 'Sala de Estar · 10' },
      { src: 'Images_Sala_Estar/melhoradas/sala_11.jpg', caption: 'Sala de Estar · 11' },
      { src: 'Images_Sala_Estar/melhoradas/sala_12.jpg', caption: 'Sala de Estar · 12' },
    ],
  },
  {
    n: '02', name: 'Sala de Jantar',
    desc: 'Tumar, Century, Schuster, Iummi e ADM.',
    shots: [
      { format: 'tall',   caption: 'Tumar · foto 1' },
      { format: 'wide',   caption: 'Century · Schuster · foto 2' },
      { format: 'square', caption: 'Iummi · ADM · foto 3' },
    ],
  },
  {
    n: '03', name: 'Quarto',
    desc: 'Century, Schuster e Iummi.',
    shots: [
      { format: 'wide', src: 'Images_Quarto/melhoradas/WhatsApp_Image_2026-07-02_at_09.47.48.jpg', caption: 'Quarto · 01' },
      { format: 'tall', src: 'Images_Quarto/melhoradas/WhatsApp_Image_2026-07-02_at_09.47.58.jpg', caption: 'Quarto · 02', pos: 'center 22%' },
      { format: 'tall', src: 'Images_Quarto/melhoradas/WhatsApp_Image_2026-07-02_at_09.48.06.jpg', caption: 'Quarto · 03' },
      { format: 'wide', src: 'Images_Quarto/melhoradas/WhatsApp_Image_2026-07-02_at_09.48.15.jpg', caption: 'Quarto · 04' },
      { format: 'wide', src: 'Images_Quarto/melhoradas/WhatsApp_Image_2026-07-02_at_09.48.23.jpg', caption: 'Quarto · 05' },
    ],
  },
  {
    n: '04', name: 'Office',
    desc: 'Century, Schuster, Iummi e ADM.',
    shots: [
      { format: 'tall',     src: 'Images_Office/melhoradas/WhatsApp_Image_2026-06-26_at_16.24.58.jpg', caption: 'Office · 01' },
      { format: 'tall',     src: 'Images_Office/melhoradas/WhatsApp_Image_2026-06-26_at_16.25.12.jpg', caption: 'Office · 02' },
      { format: 'wide',     src: 'Images_Office/melhoradas/WhatsApp_Image_2026-06-26_at_16.25.26.jpg', caption: 'Office · 03' },
      { format: 'portrait', src: 'Images_Office/melhoradas/WhatsApp_Image_2026-06-26_at_16.25.35.jpg', caption: 'Office · 04' },
      { format: 'portrait', src: 'Images_Office/melhoradas/WhatsApp_Image_2026-07-02_at_09.47.18.jpg', caption: 'Office · 05' },
    ],
  },
  {
    n: '05', name: 'Outdoor & Lounge',
    desc: 'Bux.',
    shots: [
      { format: 'wide',   caption: 'Bux · foto 1' },
      { format: 'tall',   caption: 'Bux · foto 2' },
      { format: 'square', caption: 'Bux · foto 3' },
    ],
  },
];

// Variantes responsivas geradas por scripts/make-carousel-variants.mjs (sharp).
// O original (2560px no lado maior) continua sendo o maior candidato → telas
// grandes recebem exatamente a mesma imagem de hoje. Telas menores recebem a
// variante menor adequada (economia grande no mobile). Ver CLAUDE.md.
const CAROUSEL_VARIANT_WIDTHS = [640, 1280, 1600];
function buildSrcSet(src) {
  if (!src) return undefined;
  const base = src.replace(/\.jpe?g$/i, '');
  const parts = CAROUSEL_VARIANT_WIDTHS.map((w) => `${base}-${w}.jpg ${w}w`);
  parts.push(`${src} 2560w`);
  return parts.join(', ');
}

function Carousel({ num, name, desc, shots }) {
  const [idx, setIdx] = useState(0);
  const n = shots.length;
  const go = (d) => setIdx((p) => (p + d + n) % n);
  return (
    <div className="carousel">
      <div className="carousel-stack">
        {shots.map((s, i) => (
          <figure key={i} className={`carousel-slide${i === idx ? ' active' : ''}`}>
            {s.src ? (
              s.fit === 'contain' ? (
                <>
                  <img className="slide-bg" src={s.src} srcSet={buildSrcSet(s.src)} sizes="100vw" alt="" aria-hidden="true" />
                  <img className="slide-img fit-contain" src={s.src} srcSet={buildSrcSet(s.src)} sizes="100vw" alt={s.caption} loading="lazy" />
                </>
              ) : (
                <img className="slide-img" src={s.src} srcSet={buildSrcSet(s.src)} sizes="100vw" alt={s.caption} loading="lazy" style={s.pos ? { objectPosition: s.pos } : undefined} />
              )
            ) : (
              <div className="img-placeholder">
                <span className="label">{name}<br />· foto {i + 1} ·</span>
              </div>
            )}
          </figure>
        ))}
      </div>
      <div className="carousel-scrim"></div>
      {n > 1 && (
        <>
          <button className="carousel-arrow prev" onClick={() => go(-1)} aria-label="Anterior">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 5 8 12 15 19" /></svg>
          </button>
          <button className="carousel-arrow next" onClick={() => go(1)} aria-label="Próximo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 5 16 12 9 19" /></svg>
          </button>
        </>
      )}
      <div className="carousel-title">
        <span className="carousel-num">{num}</span>
        <h3 className="carousel-name">{name}</h3>
        <p className="carousel-desc">{desc}</p>
      </div>
      <div className="carousel-dots">
        {shots.map((s, i) => (
          <button
            key={i}
            className={`dot${i === idx ? ' active' : ''}`}
            onClick={() => setIdx(i)}
            aria-label={`Ir para foto ${i + 1}`}
          ></button>
        ))}
      </div>
    </div>
  );
}

function Categorias() {
  const ref = useReveal();
  return (
    <section id="colecao" className="section categorias" ref={ref}>
      <div className="section-inner">
        <div className="section-head">
          <div className="head-left">
            <SectionEyebrow roman="II" label="Ambientes" />
            <h2 className="section-title reveal d1">
              Diversos ambientes,<br />
              <em>um mesmo padrão.</em>
            </h2>
          </div>
          <p className="section-lead reveal d2">
            Da sala que recebe ao quarto que recolhe, disponibilizamos peças
            que se encaixam nos ambientes e com seu projeto como um todo.
          </p>
        </div>
        <div className="gallery">
          {CATEGORIES.map((c) => (
            <Carousel key={c.n} num={c.n} name={c.name} desc={c.desc} shots={c.shots} />
          ))}
        </div>
      </div>
    </section>
  );
}

// -------------------- Marquee --------------------

const MARQUEE_BRANDS = [
  { name: 'ADM',           country: 'Brasil' },
  { name: 'Bux',           country: 'Brasil' },
  { name: 'Century',       country: 'Brasil' },
  { name: 'Iummi',         country: 'Brasil' },
  { name: 'Ponto Vírgula', country: 'Brasil' },
  { name: 'Schuster',      country: 'Brasil' },
  { name: 'Tumar',         country: 'Brasil' },
];

function Marquee() {
  const items = [...MARQUEE_BRANDS, ...MARQUEE_BRANDS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {items.map((b, i) => (
          <span key={i} className="marquee-item">
            <span className="ital">{b.name}</span>
            <span className="dot"></span>
            <span className="country">{b.country}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// -------------------- Marcas --------------------

const BRANDS = [
  { name: 'ADM',           meta: 'Site oficial', href: 'https://www.admmobiliario.com.br/pt', logo: 'assets/logos/adm.png', logoScale: 0.84 },
  { name: 'Bux',           meta: 'Site oficial', href: 'https://www.buxgarden.com/', logo: 'assets/logos/bux.jpeg', logoScale: 0.76 },
  { name: 'Century',       meta: 'Site oficial', href: 'https://meucentury.com/', logo: 'assets/logos/century.png', logoScale: 0.82 },
  { name: 'Iummi',         meta: 'Site oficial', href: 'https://www.iummi.com.br/', logo: 'assets/logos/iummi.png', logoScale: 0.92 },
  { name: 'Ponto Vírgula', meta: 'Site oficial', href: 'https://pontovirgula.com/', logo: 'assets/logos/pv.png', logoScale: 0.86 },
  { name: 'Schuster',      meta: 'Site oficial', href: 'https://www.moveis-schuster.com.br/', logo: 'assets/logos/schuster.png', logoScale: 0.78 },
  { name: 'Tumar',         meta: 'Site oficial', href: 'https://www.tumar.com.br/', logo: 'assets/logos/tumar.png', logoScale: 0.92 },
];

function Marcas() {
  const ref = useReveal();
  return (
    <section id="marcas" className="section marcas" ref={ref}>
      <div className="section-inner">
        <div className="section-head">
          <div className="head-left">
            <SectionEyebrow roman="III" label="Marcas representadas" />
            <h2 className="section-title reveal d1">
              Diversas fábricas,<br />
              <em>um dom em comum.</em>
            </h2>
          </div>
          <p className="section-lead reveal d2">
            Marcas reconhecidas pelo design, inovação e excelência, reunidas
            pela forma como unem matéria, proporção e acabamento.
          </p>
        </div>
        <div className="marcas-grid reveal d3">
          {BRANDS.map((b) => (
            <MarcaCard key={b.name} b={b} />
          ))}
        </div>
      </div>
    </section>
  );
}

// -------------------- Contato --------------------

function Contato() {
  const ref = useReveal();
  const waNumber = '5567993336652';
  const waMessage = encodeURIComponent('Olá, gostaria de solicitar um orçamento.');

  return (
    <section id="contato" className="section contato" ref={ref}>
      <div className="contato-inner">
        <div className="contato-eyebrow reveal" style={{ display: 'flex', justifyContent: 'center', gap: 18, alignItems: 'center', marginBottom: 32 }}>
          <span style={{ fontFamily: 'var(--display)', fontSize: 13, letterSpacing: '0.28em', color: 'var(--champagne)' }}>IV</span>
          <span style={{ width: 36, height: 1, background: 'var(--cream-3)', opacity: 0.5 }}></span>
          <span style={{ fontFamily: 'var(--sans)', fontSize: 10, letterSpacing: '0.36em', textTransform: 'uppercase', color: 'var(--cream-2)' }}>Atendimento exclusivo</span>
        </div>
        <h2 className="contato-title reveal d1">
          Conte sobre<br />
          <em>seu projeto.</em>
        </h2>
        <p className="contato-lead reveal d2">
          Atendimento exclusivo para lojistas e seus consultores. Envie o
          briefing, a planta ou uma referência — respondemos no mesmo dia útil.
        </p>

        <a
          href={`https://wa.me/${waNumber}?text=${waMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-cta reveal d3"
          data-hover
        >
          <svg className="wa-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.057 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.889-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.886 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <span>Solicitar orçamento via WhatsApp</span>
          <span className="arrow"></span>
        </a>

        <div className="contato-secondary">
          <div className="contato-block reveal d4">
            <div className="block-label">WhatsApp</div>
            <div className="block-value">+55 67 99333-6652</div>
            <div className="block-sub">Atendimento direto para lojistas e consultores</div>
          </div>
          <div className="contato-block reveal d5">
            <div className="block-label">E-mail</div>
            <div className="block-value">atendimento@azrep.com.br</div>
            <div className="block-sub">Resposta em até 24h úteis</div>
          </div>
          <div className="contato-block reveal d5">
            <div className="block-label">Horário</div>
            <div className="block-value">Seg — Sex<br />09h às 18h</div>
            <div className="block-sub">Sáb · sob agendamento</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// -------------------- Footer --------------------

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-logo">AZ · REPRESENTAÇÕES</div>
        <a
          className="footer-social"
          href="https://www.instagram.com/az_representacoes/"
          target="_blank"
          rel="noopener noreferrer"
          data-hover
          aria-label="Instagram da AZ Representações"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="17.4" cy="6.6" r="1.15" fill="currentColor" />
          </svg>
          <span>@az_representacoes</span>
        </a>
        <div className="footer-mini">© 2026 · Todos os direitos reservados</div>
      </div>
    </footer>
  );
}

// -------------------- Aurora --------------------

function Aurora({ isDark }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animId;
    const PAD = 80;

    const resize = () => {
      canvas.width  = window.innerWidth  + PAD * 2;
      canvas.height = window.innerHeight + PAD * 2;
    };
    // bx/by = base position (0-1), ax/ay = drift amplitude,
    // sx/sy = drift speed, px/py = phase offset, r = radius fraction, a = opacity
    const BLOBS = [
      { bx:0.15, by:0.22, ax:0.12, ay:0.10, sx:0.055, sy:0.042, px:0.0, py:1.3, r:0.60, rgb:[62,  18,  90 ], a:0.80 },
      { bx:0.82, by:0.18, ax:0.10, ay:0.14, sx:0.048, sy:0.060, px:2.1, py:0.4, r:0.54, rgb:[100, 40, 155 ], a:0.68 },
      { bx:0.50, by:0.62, ax:0.15, ay:0.09, sx:0.038, sy:0.052, px:1.1, py:2.9, r:0.68, rgb:[45,  12,  70 ], a:0.72 },
      { bx:0.88, by:0.68, ax:0.08, ay:0.12, sx:0.062, sy:0.045, px:3.4, py:0.9, r:0.42, rgb:[184,160, 130 ], a:0.34 },
      { bx:0.12, by:0.78, ax:0.11, ay:0.10, sx:0.050, sy:0.068, px:0.7, py:3.1, r:0.46, rgb:[75,  30, 115 ], a:0.62 },
      { bx:0.55, by:0.32, ax:0.13, ay:0.11, sx:0.072, sy:0.050, px:2.6, py:1.6, r:0.44, rgb:[128, 72, 190 ], a:0.50 },
      { bx:0.35, by:0.82, ax:0.09, ay:0.08, sx:0.044, sy:0.038, px:1.8, py:0.6, r:0.36, rgb:[184,160, 130 ], a:0.24 },
    ];

    const renderFrame = (t) => {
      const W  = canvas.width;
      const H  = canvas.height;
      const dim = Math.min(W, H);

      ctx.clearRect(0, 0, W, H);

      BLOBS.forEach(b => {
        const cx = PAD + (b.bx + Math.sin(t * b.sx + b.px) * b.ax) * (W - PAD * 2);
        const cy = PAD + (b.by + Math.sin(t * b.sy + b.py) * b.ay) * (H - PAD * 2);
        const radius = b.r * dim;
        const [r, g, bl] = b.rgb;

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0,   `rgba(${r},${g},${bl},${b.a})`);
        grad.addColorStop(0.4, `rgba(${r},${g},${bl},${+(b.a * 0.35).toFixed(2)})`);
        grad.addColorStop(1,   `rgba(${r},${g},${bl},0)`);

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      });

      ctx.globalCompositeOperation = 'source-over';
    };

    resize();

    // No mobile (ou "menos animações") o canvas animado — 7 blends de tela
    // cheia por frame + blur(60px) de CSS sobre a viewport inteira — trava a
    // rolagem. Desenha UMA vez (estático): mantém o visual, sem custo de runtime.
    const liteAurora = window.matchMedia('(max-width: 760px)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (liteAurora) {
      renderFrame(0);
      const onResize = () => { resize(); renderFrame(0); };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }

    window.addEventListener('resize', resize);

    const draw = (ts) => {
      renderFrame(ts / 1000);
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    // pausa a animação quando a aba não está visível (economia de CPU/bateria)
    const onVisibility = () => {
      cancelAnimationFrame(animId);
      if (!document.hidden) animId = requestAnimationFrame(draw);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top:  '-80px',
        left: '-80px',
        width:  'calc(100% + 160px)',
        height: 'calc(100% + 160px)',
        zIndex: 0,
        pointerEvents: 'none',
        opacity: isDark ? 0.45 : 0.07,
        filter: 'blur(60px)',
        transition: 'opacity 0.65s ease',
      }}
    />
  );
}

// -------------------- App --------------------

function App() {
  const [isDark, setIsDark] = useState(false);
  const [chandelierKey, setChandelierKey] = useState(0);

  const toggleTheme = () => {
    /* Ativa transição suave em todos os elementos */
    document.documentElement.classList.add('theme-transitioning');
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 700);

    if (isDark) {
      /* Escuro → Claro: esconde lustre */
      document.documentElement.setAttribute('data-theme', 'light');
      setIsDark(false);
    } else {
      /* Claro → Escuro: lustre cai e acende */
      document.documentElement.removeAttribute('data-theme');
      setIsDark(true);
      /* Pequeno delay para o CSS do tema escuro estar ativo antes do drop */
      setTimeout(() => setChandelierKey(k => k + 1), 80);
    }
  };

  useEffect(() => {
    if (!window.Lenis) return;
    const lenis = new window.Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothTouch: false,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.2,
    });

    let rafId;
    const raf = (time) => { lenis.raf(time); rafId = requestAnimationFrame(raf); };
    rafId = requestAnimationFrame(raf);

    /* ── Navegação suave via âncoras ── */
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    /* ── Trava (snap) nos painéis de ambientes: assenta ao parar de rolar ── */
    /* Desativado no mobile / "menos animações": o scrollTo forçado após cada
       parada briga com a rolagem por toque e dá sensação de travamento. */
    const liteSnap = window.matchMedia('(max-width: 760px)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let snapTimer;
    const onSnapScroll = () => {
      clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const ps = Array.from(document.querySelectorAll('#colecao .carousel'));
        if (!ps.length) return;
        const vh = window.innerHeight;
        let best = null, bestDist = Infinity;
        ps.forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.top > vh * 0.85 || r.bottom < vh * 0.15) return; // painel precisa estar bem visível
          const dist = Math.abs(r.top);
          if (dist < bestDist) { bestDist = dist; best = el; }
        });
        if (best && bestDist > 6 && bestDist < vh * 0.92) {
          lenis.scrollTo(best, { duration: 1.15, easing: easeInOutCubic });
        }
      }, 90);
    };
    if (!liteSnap) window.addEventListener('scroll', onSnapScroll, { passive: true });

    const onAnchorClick = (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      /* Flash sutil no link clicado */
      anchor.classList.add('nav-flash');
      setTimeout(() => anchor.classList.remove('nav-flash'), 600);

      lenis.scrollTo(target, {
        duration: 1.6,
        easing: easeInOutCubic,
        offset: -88,   /* compensa a nav fixa */
      });
    };

    document.addEventListener('click', onAnchorClick);
    return () => {
      clearTimeout(snapTimer);
      window.removeEventListener('scroll', onSnapScroll);
      lenis.destroy();
      cancelAnimationFrame(rafId);
      document.removeEventListener('click', onAnchorClick);
    };
  }, []);

  return (
    <>
      <Aurora isDark={isDark} />
      <Nav isDark={isDark} onToggle={toggleTheme} />
      <main>
        <Hero chandelierKey={chandelierKey} />
        <Sobre />
        <Categorias />
        <Marquee />
        <Marcas />
        <Contato />
      </main>
      <Footer />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

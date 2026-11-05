/* ============================================================================
   SITE INSTITUCIONAL - Agitação Esportes

   O que tem aqui:
     0. os endereços do site (constantes: trocar aqui)
     1. menu do celular (abre, fecha e fecha de novo ao clicar num item)
     2. cabeçalho sólido depois que a página rola
     3. o item do menu acompanha a seção que está na tela
     4. "Início" volta para o topo de verdade
     5. entradas conforme a página rola, marolinha do toque, água parada fora da tela
     6. blog: lê data/blog.json (gravado pelo Gestor) e monta os cartões
     7. eventos: lê o Gestor ao vivo, com data/eventos.json como reserva
   Sem biblioteca: o site tem que abrir rápido no 4G.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------- 0. endereços do site -------------------------- */
  /* Em localhost usa o Gestor (8101) e o app de inscrições (8102) desta máquina; publicado, os domínios. */
  var LOCAL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1');
  var DOMINIO_GESTOR = 'https://gestor.agitacaoesportes.com.br/';
  var DOMINIO_ATLETA = 'https://atleta.agitacaoesportes.com.br/';
  var API_GESTOR = LOCAL ? 'http://localhost:8101/' : DOMINIO_GESTOR;
  var APP_ATLETA = LOCAL ? 'http://localhost:8102/' : DOMINIO_ATLETA;

  /* Botão "Área do aluno". Hoje é o app que os alunos já usam; quando o app próprio entrar,
     é só trocar esta linha (o site inteiro segue) e, se quiser, o href dos HTML. */
  var AREA_DO_ALUNO = 'https://tecnofitacademia.page.link/App';

  /* Central de Atendimento WhatsApp, (79) 98866-9367 */
  var WHATSAPP = 'https://wa.me/message/5R76JUZZV2YIP1';

  [].forEach.call(document.querySelectorAll('a[data-area-aluno]'), function (a) { a.href = AREA_DO_ALUNO; });
  [].forEach.call(document.querySelectorAll('a[data-zap]'), function (a) { a.href = WHATSAPP; });

  var topo = document.getElementById('topo');
  var menu = document.getElementById('menu');
  var botao = document.getElementById('btnMenu');

  function suave() {
    return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---------------------------- 1. menu ---------------------------------- */
  function abrirMenu(sim) {
    menu.classList.toggle('aberto', sim);
    botao.setAttribute('aria-expanded', sim ? 'true' : 'false');
    botao.setAttribute('aria-label', sim ? 'Fechar menu' : 'Abrir menu');
    document.documentElement.style.overflow = sim ? 'hidden' : '';
  }

  if (botao && menu) {
    botao.addEventListener('click', function () {
      abrirMenu(!menu.classList.contains('aberto'));
    });

    menu.addEventListener('click', function (ev) {
      if (ev.target.closest && ev.target.closest('a')) { abrirMenu(false); }
    });

    /* Esc fecha, para quem navega pelo teclado */
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && menu.classList.contains('aberto')) {
        abrirMenu(false);
        botao.focus();
      }
    });

    /* girar o celular ou aumentar a janela com o menu aberto não pode deixar a página travada */
    var telaGrande = window.matchMedia('(min-width: 1040px)');
    if (telaGrande.addEventListener) {
      telaGrande.addEventListener('change', function (ev) {
        if (ev.matches) { abrirMenu(false); }
      });
    }
  }

  /* ------------------- 2. cabeçalho sólido ao rolar ---------------------- */
  /* blog e cadastro já nascem com .solido e ficam assim */
  var sempreSolido = topo && topo.classList.contains('solido');
  var rolando = false;
  function aoRolar() {
    rolando = false;
    if (topo && !sempreSolido) { topo.classList.toggle('solido', window.scrollY > 40); }
  }
  window.addEventListener('scroll', function () {
    if (!rolando) { rolando = true; requestAnimationFrame(aoRolar); }
  }, { passive: true });
  aoRolar();

  /* ---------------- 3. item do menu conforme a seção --------------------- */
  var secoes = [].slice.call(document.querySelectorAll('main section[id]'));
  var links = {};
  [].forEach.call(document.querySelectorAll('.menu a[href^="#"]'), function (a) {
    links[a.getAttribute('href').slice(1)] = a;
  });

  if ('IntersectionObserver' in window && secoes.length) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) { return; }
        Object.keys(links).forEach(function (k) { links[k].classList.remove('ativo'); });
        if (links[e.target.id]) { links[e.target.id].classList.add('ativo'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secoes.forEach(function (s) { observador.observe(s); });
  }

  /* -------------------- 4. "Início" volta para o topo --------------------- */
  /* O alvo #topo é o cabeçalho fixo: o salto padrão não chega no zero. Levamos na mão. */
  [].forEach.call(document.querySelectorAll('a[href="#topo"]'), function (a) {
    a.addEventListener('click', function (ev) {
      ev.preventDefault();
      window.scrollTo({ top: 0, behavior: suave() ? 'smooth' : 'auto' });
      history.replaceState(null, '', location.pathname + location.search);
    });
  });

  /* ------------------------ 5. entradas ao rolar -------------------------- */
  /* Marca os blocos e revela cada um quando entra na tela. Quem pediu menos movimento vê tudo direto. */
  var obsEntrada = null;
  function prepararAnimacoes() {
    var alvos = document.querySelectorAll(
      '.secao .etiqueta, .secao h2, .secao-sub, .raia, .unidade, .evento, .prova, .post, .rede, .ja-aluno, ' +
      '.aula-in > *, .blog-mais'
    );
    if (!suave() || !('IntersectionObserver' in window)) { return; }

    if (!obsEntrada) {
      obsEntrada = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) { return; }
          var el = e.target;
          el.classList.add('visivel');
          obsEntrada.unobserve(el);
          /* depois de entrar a classe sai: o hover de cada bloco volta a usar a transição dele */
          setTimeout(function () { el.classList.remove('anima', 'visivel'); }, 1000);
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    }

    [].forEach.call(alvos, function (el, i) {
      if (el.hasAttribute('data-entrada')) { return; }   /* já preparado antes */
      el.setAttribute('data-entrada', '');
      el.classList.add('anima');
      el.style.setProperty('--atraso', ((i % 4) * 60) + 'ms');
      obsEntrada.observe(el);
    });
  }

  /* A água fora da tela para de andar: é bateria e processamento jogados fora */
  if ('IntersectionObserver' in window) {
    var obsAgua = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { e.target.classList.toggle('parado', !e.isIntersecting); });
    });
    [].forEach.call(document.querySelectorAll('.hero, .capa-interna, .ondas, .aula, #unidades'), function (el) {
      obsAgua.observe(el);
    });
  }

  /* Tocou na água do topo, faz uma marolinha */
  var hero = document.querySelector('.hero');
  if (hero && suave()) {
    hero.addEventListener('pointerdown', function (ev) {
      if (ev.target.closest && ev.target.closest('a, button')) { return; }
      var caixa = hero.getBoundingClientRect();
      var m = document.createElement('i');
      m.className = 'marola';
      m.style.left = (ev.clientX - caixa.left) + 'px';
      m.style.top = (ev.clientY - caixa.top) + 'px';
      m.addEventListener('animationend', function () { m.remove(); });
      hero.appendChild(m);
    });
  }

  var ano = document.getElementById('ano');
  if (ano) { ano.textContent = new Date().getFullYear(); }

  /* -------------------------- 6. blog do site ----------------------------- */
  /* data/blog.json é gravado pelo Gestor (Cadastros > Blog do site > PUBLICAR NO SITE).
     Sem o arquivo, a seção da home continua escondida e o blog.html mostra o convite do Instagram. */

  function escapar(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function dataBonita(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) { return ''; }
    var meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun',
                 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    return p[2] + ' ' + (meses[Number(p[1]) - 1] || '') + ' ' + p[0];
  }

  function cartaoPost(p, comLink) {
    var capa = p.imagem
      ? '<img src="' + escapar(p.imagem) + '" alt="" loading="lazy">'
      : '<span class="post-capa-vazia">' + escapar(p.categoria || 'Agitação') + '</span>';
    var destino = comLink ? 'blog.html#' + encodeURIComponent(p.slug) : '#' + encodeURIComponent(p.slug);
    return '' +
      '<article class="post">' +
      '  <a class="post-capa" href="' + destino + '" tabindex="-1" aria-hidden="true">' + capa + '</a>' +
      '  <div class="post-txt">' +
      '    <p class="post-meta"><b>' + escapar(p.categoria || '') + '</b>' +
      '      <span>' + escapar(dataBonita(p.data)) + '</span></p>' +
      '    <h3><a href="' + destino + '">' + escapar(p.titulo) + '</a></h3>' +
      '    <p>' + escapar(p.chamada) + '</p>' +
      '    <a class="post-ler" href="' + destino + '" aria-label="Ler o post: ' + escapar(p.titulo) + '">Ler o post</a>' +
      '  </div>' +
      '</article>';
  }

  function carregarBlog() {
    var caixaHome = document.getElementById('blogCards');
    var caixaLista = document.getElementById('blogLista');
    if (!caixaHome && !caixaLista) { return; }

    fetch('data/blog.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) { throw new Error('sem arquivo'); } return r.json(); })
      .then(function (dados) {
        var posts = (dados && dados.posts) || [];
        if (!posts.length) { throw new Error('sem posts'); }

        /* o link do Blog no menu e no rodapé só aparece quando há o que ler */
        [].forEach.call(document.querySelectorAll('[data-com-blog]'), function (a) { a.hidden = false; });

        /* destaques primeiro, depois a ordem que veio do Gestor (data desc) */
        posts.sort(function (a, b) {
          return (Number(b.destaque) || 0) - (Number(a.destaque) || 0);
        });

        if (caixaHome) {
          caixaHome.innerHTML = posts.slice(0, 3).map(function (p) {
            return cartaoPost(p, true);
          }).join('');
          document.getElementById('blog').hidden = false;
        }

        if (caixaLista) { montarBlogCompleto(posts); }

        prepararAnimacoes();
      })
      .catch(function () {
        if (caixaLista) {
          caixaLista.innerHTML =
            '<div class="blog-vazio">' +
            '<h2>Em breve, novidades por aqui.</h2>' +
            '<p>Enquanto o blog não chega, o dia a dia da Agitação está no Instagram.</p>' +
            '<a class="btn btn-violeta" href="https://www.instagram.com/agitacao/" target="_blank" rel="noopener">Ver o Instagram</a>' +
            '</div>';
        }
        prepararAnimacoes();
      });
  }

  function montarBlogCompleto(posts) {
    var lista = document.getElementById('blogLista');
    var artigo = document.getElementById('blogPost');
    var capa = document.getElementById('blogCapa');

    function mostrar() {
      var slug = decodeURIComponent((location.hash || '').replace('#', ''));
      var achado = null;
      posts.forEach(function (p) { if (p.slug === slug) { achado = p; } });

      if (capa) { capa.hidden = !!achado; }
      if (achado) {
        lista.hidden = true;
        artigo.hidden = false;
        artigo.innerHTML = '' +
          '<p class="post-meta"><b>' + escapar(achado.categoria || '') + '</b>' +
          '  <span>' + escapar(dataBonita(achado.data)) + '</span></p>' +
          '<h1>' + escapar(achado.titulo) + '</h1>' +
          '<p class="post-chamada">' + escapar(achado.chamada) + '</p>' +
          (achado.imagem ? '<img class="post-imagem" src="' + escapar(achado.imagem) + '" alt="">' : '') +
          '<div class="post-corpo">' + (achado.conteudo || '') + '</div>' +
          (achado.link
            ? '<p><a class="btn btn-noite" href="' + escapar(achado.link) +
              '" target="_blank" rel="noopener">Ver no Instagram</a></p>'
            : '') +
          '<p><a class="post-voltar" href="blog.html">Voltar para o blog</a></p>';
        window.scrollTo({ top: 0, behavior: 'auto' });
      } else {
        artigo.hidden = true;
        lista.hidden = false;
        lista.innerHTML = posts.map(function (p) { return cartaoPost(p, false); }).join('');
      }
    }

    window.addEventListener('hashchange', mostrar);
    mostrar();
  }

  /* ---------------------------- 7. eventos -------------------------------- */
  /* Os eventos vêm do Gestor, ao vivo: GET <API_GESTOR>api/eventos.json, servido direto do banco.
     Se o Gestor não responder, o site cai no data/eventos.json publicado pelo painel (Cadastros >
     Eventos > PUBLICAR NO SITE), tirando o que já passou. Sem nenhum dos dois, o bloco fica escondido. */

  var MESES_CURTO = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
                     'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  function pedacosData(iso) {
    var p = String(iso || '').split('-');
    if (p.length !== 3) { return null; }
    return { dia: p[2], mes: MESES_CURTO[Number(p[1]) - 1] || '', ano: p[0] };
  }

  function diaEMes(iso) {
    var d = pedacosData(iso);
    return d ? d.dia + '/' + d.mes.toLowerCase() : '';
  }

  function cartaoEvento(e, base) {
    var d = pedacosData(e.data);
    if (!d) { return ''; }

    var situacao = Number(e.situacao) || 0;   /* 1 aberto | 2 em breve | 0 fechado */
    var restam = (Number(e.vagas) || 0) - (Number(e.ocupadas) || 0);

    var linha = [];
    if (e.local) { linha.push(escapar(e.local)); }
    if (e.cidade) { linha.push(escapar(e.cidade) + (e.uf ? '/' + escapar(e.uf) : '')); }
    if (e.modalidades) { linha.push(escapar(e.modalidades)); }

    var extra;
    if (situacao === 1) {
      extra = 'inscrições até ' + diaEMes(e.inscricaoAte) +
              (restam > 0 ? ' · restam ' + restam + ' vagas' : ' · vagas esgotadas');
    } else if (situacao === 2) {
      extra = 'inscrições abrem em ' + diaEMes(e.inscricaoDe);
    } else {
      extra = 'inscrições encerradas';
    }

    /* a capa vem relativa: 'img/eventos/...' do arquivo publicado, ou 'api/capa?ev=N' do
       Gestor; nesse caso o endereço é no domínio dele */
    var urlCapa = e.capa ? ((base || '') + e.capa) : '';
    var capa = urlCapa
      ? '<a class="prova-capa" href="' + APP_ATLETA + '" target="_blank" rel="noopener">' +
        '<img src="' + escapar(urlCapa) + '" alt="' + escapar(e.nome) + '" loading="lazy"></a>'
      : '';

    var acao;
    if (situacao === 1 && restam > 0) {
      acao = '<a class="btn btn-violeta" href="' + APP_ATLETA +
             '" target="_blank" rel="noopener">Inscrever-se</a>';
    } else if (situacao === 2) {
      acao = '<span class="tag">Em breve</span>';
    } else {
      acao = '<span class="tag">Encerrada</span>';
    }

    var mapa = e.maps
      ? ' <a class="prova-mapa" href="' + escapar(e.maps) +
        '" target="_blank" rel="noopener">ver no mapa</a>'
      : '';

    return '' +
      '<article class="prova' + (situacao === 1 ? '' : ' prova-off') + '">' +
      capa +
      '  <div class="prova-data"><b>' + escapar(d.dia) + '</b><span>' + escapar(d.mes) + '</span></div>' +
      '  <div class="prova-txt">' +
      '    <h3>' + escapar(e.nome) + (e.edicao ? ' · ' + escapar(e.edicao) : '') + '</h3>' +
      '    <p>' + linha.join(' · ') + '</p>' +
      '    <p class="prova-extra">' + escapar(extra) +
           (e.largada ? ' · início às ' + escapar(e.largada) : '') + mapa + '</p>' +
      '  </div>' +
      acao +
      '</article>';
  }

  function carregarEventos() {
    var bloco = document.getElementById('proximos');
    var caixa = document.getElementById('provasCards');
    if (!bloco || !caixa) { return; }

    function montar(dados, base) {
      var eventos = (dados && dados.eventos) || [];
      caixa.innerHTML = eventos.map(function (e) { return cartaoEvento(e, base); }).join('');
      bloco.hidden = !caixa.innerHTML;
      prepararAnimacoes();
    }

    /* 1a tentativa: o Gestor, ao vivo. Com prazo curto: se ele estiver fora do ar, a home não
       pode ficar esperando. Resposta vazia do Gestor é resposta: não há evento, e pronto. */
    var opcoes = { cache: 'no-cache' };
    if (window.AbortController) {
      var corta = new AbortController();
      opcoes.signal = corta.signal;
      setTimeout(function () { corta.abort(); }, 3500);
    }

    fetch(API_GESTOR + 'api/eventos.json', opcoes)
      .then(function (r) { if (!r.ok) { throw new Error('gestor ' + r.status); } return r.json(); })
      .then(function (dados) { montar(dados, API_GESTOR); })
      .catch(function () {
        /* 2a tentativa: o arquivo publicado pelo painel. Pode estar velho, então o que já
           passou fica de fora. */
        return fetch('data/eventos.json', { cache: 'no-cache' })
          .then(function (r) { if (!r.ok) { throw new Error('sem arquivo'); } return r.json(); })
          .then(function (dados) {
            var hoje = new Date().toISOString().slice(0, 10);
            var validos = ((dados && dados.eventos) || []).filter(function (e) { return String(e.data || '') >= hoje; });
            montar({ eventos: validos }, '');
          });
      })
      .catch(function () { /* o bloco continua escondido */ });
  }

  carregarEventos();
  carregarBlog();
  prepararAnimacoes();
})();

/* ============================================================================
   PAGINA DE CAPTACAO - Site\cadastro.html (aula experimental)

   O LINK DE CAPTACAO do Gestor (Gestao > Captacao de clientes) traz o token:
   cadastro.html?c=<32 letras hex>. Aqui:
     1. no dominio do site, http vira https (o Gestor so aceita o envio
        vindo da origem https do site);
     2. sem token com formato valido: aviso de link desativado;
     3. conta a visita (GET api/leadvisita?c=...): {"ok":0} = link trocado
        no Gestor -> aviso de link desativado. Gestor fora do ar: o
        formulario continua (o envio mostra a saida pelo WhatsApp);
     4. confere os campos com as MESMAS regras do Gestor (uRegras: nome sem
        numero, celular com DDD e o 9, e-mail simples, aceite da LGPD) e so
        entao envia (POST api/lead, form-urlencoded - sem pedido previo de
        CORS). O servidor confere tudo de novo: isto aqui e so para a pessoa
        nao esperar a resposta para saber o que corrigir;
     5. "t" leva quanto tempo a pagina ficou aberta e "empresa" e a armadilha
        de robo (campo escondido): o Gestor descarta os dois casos.
   Sem biblioteca: a pagina tem que abrir rapido no 4G.
   ========================================================================== */
(function () {
  'use strict';

  /* 1. https no dominio do site */
  var host = location.hostname;
  var doSite = host === 'agitacaoesportes.com.br' || host === 'www.agitacaoesportes.com.br';
  if (doSite && location.protocol === 'http:') {
    location.replace('https://' + location.host + location.pathname + location.search);
    return;
  }

  /* em desenvolvimento o Gestor roda na 8101, a porta do ServerModule.dfm dele;
     publicado como ISAPI, se /api/ nao chegar na DLL, troque por
     'https://gestor.agitacaoesportes.com.br/Agitacao.dll/' (ver Site\README.md) */
  var LOCAL = (host === 'localhost' || host === '127.0.0.1');
  var API_GESTOR = LOCAL ? 'http://localhost:8101/' : 'https://gestor.agitacaoesportes.com.br/';
  var ZAP = '5579988669367';   /* Central de Atendimento WhatsApp, (79) 98866-9367 */

  /* O Gestor recusa "interesse" fora da lista dele (uApiCaptacao.pas, tabela INTERESSES), e a lista
     ainda nao tem as modalidades da Agitacao. Quem nao esta aqui vai como 'outro', com o nome da
     modalidade na frente do detalhe: chega no Gestor como "Outro: Natacao - o que a pessoa escreveu".
     Quando o Gestor passar a aceitar natacao, voleibol etc., e so acrescentar nesta lista. */
  var INTERESSES_DO_GESTOR = { natacao: 1, voleibol: 1, handebol: 1, basquete: 1, funcional: 1, eventos: 1, outro: 1 };
  var DDDS = ' 11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49' +
             ' 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89' +
             ' 91 92 93 94 95 96 97 98 99 ';

  var abertoEm = Date.now();
  var form = document.getElementById('cadForm');
  var pronto = document.getElementById('cadPronto');
  var off = document.getElementById('cadOff');
  if (!form || !pronto || !off) { return; }

  var nome = document.getElementById('cadNome');
  var cel = document.getElementById('cadCel');
  var email = document.getElementById('cadEmail');
  var detalhe = document.getElementById('cadDetalhe');
  var conta = document.getElementById('cadConta');
  var aceite = document.getElementById('cadAceite');
  var armadilha = document.getElementById('cadEmpresa');
  var enviar = document.getElementById('cadEnviar');
  var falha = document.getElementById('cadFalha');
  var enviando = false;

  /* 2. o token do link */
  function lerToken() {
    var m = /[?&]c=([0-9a-fA-F]{16,40})(&|$)/.exec(location.search);
    return m ? m[1].toLowerCase() : '';
  }
  var token = lerToken();

  function mostrar(el) {
    form.hidden = true;
    pronto.hidden = el !== pronto;
    off.hidden = el !== off;
    try { el.focus({ preventScroll: true }); } catch (e) { }
    var cartao = document.getElementById('cadCartao');
    if (cartao && cartao.getBoundingClientRect().top < 0) {
      cartao.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  function linkDesativado() { mostrar(off); }

  function comPrazo(ms) {
    var opcoes = { cache: 'no-store', mode: 'cors', credentials: 'omit' };
    if (window.AbortController) {
      var corta = new AbortController();
      opcoes.signal = corta.signal;
      setTimeout(function () { corta.abort(); }, ms);
    }
    return opcoes;
  }

  if (!token) {
    linkDesativado();
    return;
  }

  /* 3. a visita (e se o link ainda vale) */
  if (window.fetch) {
    fetch(API_GESTOR + 'api/leadvisita?c=' + encodeURIComponent(token), comPrazo(5000))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.ok === 0) { linkDesativado(); } })
      .catch(function () { /* Gestor fora: o formulario fica; o envio explica */ });
  }

  /* ------------------------------------------------------------ campos */
  function normalizar(s) {
    return String(s || '').replace(/[\s ]+/g, ' ').trim();
  }
  function digitosDoFone(s) {
    var n = String(s || '').replace(/[^0-9]/g, '');
    while (n.charAt(0) === '0') { n = n.slice(1); }
    if ((n.length === 12 || n.length === 13) && n.slice(0, 2) === '55') { n = n.slice(2); }
    return n;
  }
  function mascaraFone(n) {
    n = n.slice(0, 11);
    if (n.length <= 2) { return n.length ? '(' + n : ''; }
    if (n.length <= 7) { return '(' + n.slice(0, 2) + ') ' + n.slice(2); }
    return '(' + n.slice(0, 2) + ') ' + n.slice(2, 7) + '-' + n.slice(7);
  }

  /* as regras do Gestor (uRegras.NomeDePessoaValido, CelularValido, EmailValido) */
  var PARTICULAS = { da: 1, de: 1, 'do': 1, das: 1, dos: 1 };
  function erroNome(v) {
    var s = normalizar(v);
    if (!s) { return 'Preencha o seu nome.'; }
    if (s.length > 100) { return 'O nome aceita até 100 letras.'; }
    if (/[0-9]/.test(s)) { return 'O nome não leva números.'; }
    if (!/^[\p{L}][\p{L}\p{M} '’.-]*$/u.test(s)) { return 'Use só letras no nome (acento, hífen e apóstrofo valem).'; }
    if (/['’.-]{2}/.test(s)) { return 'Confira o nome: tem pontuação repetida.'; }
    var partes = s.split(' '), fortes = 0;
    for (var i = 0; i < partes.length; i++) {
      var letras = (partes[i].match(/\p{L}/gu) || []).length;
      if (!letras) { return 'Confira o nome: cada parte precisa ter letra.'; }
      if (letras >= 2 && !PARTICULAS[partes[i].toLowerCase()]) { fortes++; }
    }
    if (!fortes) { return 'Escreva o nome por extenso.'; }
    return '';
  }
  function erroCel(v) {
    if (!normalizar(v)) { return 'Preencha o seu celular com DDD.'; }
    if (/[a-zA-Z]/.test(v)) { return 'O celular leva só números.'; }
    var n = digitosDoFone(v);
    if (n.length !== 11) { return 'Digite o DDD e os 9 dígitos do celular.'; }
    if (DDDS.indexOf(' ' + n.slice(0, 2) + ' ') < 0) { return 'O DDD ' + n.slice(0, 2) + ' não existe. Confira o número.'; }
    if (n.charAt(2) !== '9') { return 'Celular começa com 9 depois do DDD.'; }
    return '';
  }
  function erroEmail(v) {
    var s = String(v || '').trim();
    if (!s) { return ''; }
    if (s.length > 120) { return 'O e-mail aceita até 120 caracteres.'; }
    if (s.length < 5 || /[\s,;<>"():\[\]\\]/.test(s)) { return 'Confira o e-mail.'; }
    var p = s.split('@');
    if (p.length !== 2 || !p[0]) { return 'Confira o e-mail.'; }
    var d = p[1];
    if (d.length < 3 || d.indexOf('.') < 1 || d.charAt(d.length - 1) === '.' || d.indexOf('..') >= 0) { return 'Confira o e-mail.'; }
    return '';
  }
  function erroDetalhe(v) {
    var s = normalizar(v);
    if (s.length > 150) { return 'Escreva até 150 letras.'; }
    if (/[<>]/.test(s)) { return 'Tire os sinais < e > do texto.'; }
    return '';
  }

  function marcarCampo(input, idErro, msg) {
    var caixa = input.closest('.cad-campo');
    if (caixa) { caixa.classList.toggle('cad-invalido', !!msg); }
    var e = document.getElementById(idErro);
    if (e) { e.textContent = msg || ''; }
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (msg) { input.setAttribute('aria-describedby', idErro); } else { input.removeAttribute('aria-describedby'); }
  }
  function marcarAceite(msg) {
    var caixa = aceite.closest('.cad-aceite');
    if (caixa) { caixa.classList.toggle('cad-invalido', !!msg); }
    document.getElementById('cadAceiteErro').textContent = msg || '';
  }

  cel.addEventListener('input', function () {
    var n = String(cel.value || '').replace(/[^0-9]/g, '');
    var m = mascaraFone(n);
    if (cel.value !== m) { cel.value = m; }
  });
  detalhe.addEventListener('input', function () {
    if (conta) { conta.textContent = String(detalhe.value || '').length + '/150'; }
  });
  /* o erro some quando a pessoa corrige; aparece de novo no envio ou ao sair do campo ja errado */
  [[nome, 'cadNomeErro', erroNome], [cel, 'cadCelErro', erroCel], [email, 'cadEmailErro', erroEmail]].forEach(function (c) {
    c[0].addEventListener('blur', function () {
      if (c[0].value) { marcarCampo(c[0], c[1], c[2](c[0].value)); }
    });
    c[0].addEventListener('input', function () {
      if (c[0].getAttribute('aria-invalid') === 'true') { marcarCampo(c[0], c[1], c[2](c[0].value)); }
    });
  });
  aceite.addEventListener('change', function () { if (aceite.checked) { marcarAceite(''); } });

  function mostrarFalha(html) {
    falha.innerHTML = html;
    falha.hidden = false;
  }
  var ZAP_HTML = '<a href="https://wa.me/' + ZAP + '?text=' +
    encodeURIComponent('Olá! Quero marcar uma aula experimental.') + '" target="_blank" rel="noopener">chame no WhatsApp</a>';

  function travar(sim) {
    enviando = sim;
    enviar.disabled = sim;
    enviar.classList.toggle('enviando', sim);
    enviar.textContent = sim ? 'Enviando' : 'Quero minha aula experimental';
  }

  function corpo(dados) {
    return Object.keys(dados).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(dados[k]);
    }).join('&');
  }

  /* 4. envio */
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    if (enviando) { return; }
    falha.hidden = true;

    var eNome = erroNome(nome.value), eCel = erroCel(cel.value), eEmail = erroEmail(email.value);
    var eDet = erroDetalhe(detalhe.value);
    marcarCampo(nome, 'cadNomeErro', eNome);
    marcarCampo(cel, 'cadCelErro', eCel);
    marcarCampo(email, 'cadEmailErro', eEmail);
    marcarAceite(aceite.checked ? '' : 'Marque a autorização para a equipe poder chamar você.');
    if (eDet) { mostrarFalha(eDet); }
    var primeiro = eNome ? nome : (eCel ? cel : (eEmail ? email : (eDet ? detalhe : (!aceite.checked ? aceite : null))));
    if (primeiro) { try { primeiro.focus(); } catch (e) { } return; }

    var escolhido = form.querySelector('input[name="interesse"]:checked');
    var interesse = escolhido ? escolhido.value : '';
    var textoDetalhe = normalizar(detalhe.value);
    if (interesse && !INTERESSES_DO_GESTOR[interesse]) {
      textoDetalhe = (escolhido.getAttribute('data-rotulo') + (textoDetalhe ? ' - ' + textoDetalhe : '')).slice(0, 150);
      interesse = 'outro';
    }
    var dados = {
      c: token,
      nome: normalizar(nome.value),
      celular: digitosDoFone(cel.value),
      email: String(email.value || '').trim().toLowerCase(),
      interesse: interesse,
      detalhe: textoDetalhe,
      aceite: '1',
      empresa: armadilha ? armadilha.value : '',
      t: String(Date.now() - abertoEm)
    };

    if (!window.fetch) {
      mostrarFalha('Este navegador não consegue enviar o cadastro. Por favor, ' + ZAP_HTML + '.');
      return;
    }
    travar(true);
    var opcoes = comPrazo(15000);
    opcoes.method = 'POST';
    opcoes.headers = { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' };
    opcoes.body = corpo(dados);
    fetch(API_GESTOR + 'api/lead', opcoes)
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { return { status: r.status, d: d || {} }; });
      })
      .then(function (res) {
        travar(false);
        var d = res.d;
        if (res.status === 200 && d.ok === 1) {
          var zap = document.getElementById('cadZapPronto');
          if (zap) {
            zap.href = 'https://wa.me/' + ZAP + '?text=' + encodeURIComponent('Olá! Acabei de deixar meu contato no site ' +
              'para marcar uma aula experimental. Meu nome é ' + dados.nome + '.');
          }
          mostrar(pronto);
          return;
        }
        if (d.e === 'link' || res.status === 403) { linkDesativado(); return; }
        if (res.status === 429 || d.e === 'limite') {
          mostrarFalha('Recebemos muitos envios daqui em pouco tempo. Espere alguns minutos e tente de novo, ou ' + ZAP_HTML + '.');
          return;
        }
        if (d.e === 'dados') {
          var mapa = { nome: [nome, 'cadNomeErro', 'Confira o seu nome.'], celular: [cel, 'cadCelErro', 'Confira o celular com DDD.'],
                       email: [email, 'cadEmailErro', 'Confira o e-mail.'] };
          var m = mapa[d.campo];
          if (m) { marcarCampo(m[0], m[1], m[2]); try { m[0].focus(); } catch (e) { } return; }
          if (d.campo === 'aceite') { marcarAceite('Marque a autorização para a equipe poder chamar você.'); return; }
          mostrarFalha('Confira os dados e tente de novo.');
          return;
        }
        mostrarFalha('Não deu para enviar agora. Tente de novo em instantes, ou ' + ZAP_HTML + '.');
      })
      .catch(function () {
        travar(false);
        mostrarFalha('Não deu para enviar agora (internet ou servidor). Tente de novo em instantes, ou ' + ZAP_HTML + '.');
      });
  });
})();

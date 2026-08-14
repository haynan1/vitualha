<?xml version="1.0" encoding="UTF-8"?>
<!--
  Apresentacao do feed RSS no navegador.

  Sem esta folha, quem clica em "RSS" cai numa arvore XML crua precedida do
  aviso "This XML file does not appear to have any style information" — o que
  parece defeito do site, e nao um endereco para assinar. Agregador nenhum le
  esta transformacao: ela existe so para o humano que abriu o link.

  Bilingue por leitura do <language> do canal, para nao precisar de um arquivo
  por idioma. XSLT 1.0 é o unico dialeto que os navegadores implementam.

  A CSP do site permite `style-src 'self' 'unsafe-inline'`, entao o <style>
  embutido aplica. Nao ha fonte externa nem script: a pagina é so texto.
-->
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">

  <xsl:output method="html" encoding="UTF-8" indent="yes" />

  <!-- pt-br, pt, en-us, en… decidido pelo prefixo. -->
  <xsl:variable name="pt" select="starts-with(/rss/channel/language, 'pt')" />

  <xsl:template match="/">
    <html>
      <xsl:attribute name="lang">
        <xsl:value-of select="/rss/channel/language" />
      </xsl:attribute>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <!-- Pagina de servico: util para quem chega, sem valor de busca. -->
        <meta name="robots" content="noindex, follow" />
        <title>
          <xsl:value-of select="/rss/channel/title" />
        </title>
        <style>
          :root {
            color-scheme: light dark;
            --bg: #fafaf7;
            --surface: #ffffff;
            --text: #1c1c1c;
            --text-muted: #666666;
            --border: rgba(28, 28, 28, 0.09);
            --primary: #1b5e20;
            --tint: #e8f5e9;
          }

          @media (prefers-color-scheme: dark) {
            :root {
              --bg: #17181a;
              --surface: #212421;
              --text: #f2f2ef;
              --text-muted: #a9aca6;
              --border: rgba(255, 255, 255, 0.08);
              --primary: #8fd694;
              --tint: rgba(143, 214, 148, 0.12);
            }
          }

          * { box-sizing: border-box; }

          body {
            margin: 0;
            padding: 3rem 1.5rem 5rem;
            background: var(--bg);
            color: var(--text);
            font-family: 'Inter Variable', ui-sans-serif, system-ui, -apple-system, sans-serif;
            font-size: 1rem;
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
          }

          .wrap { max-width: 44rem; margin: 0 auto; }

          .brand {
            display: flex;
            align-items: center;
            gap: 0.625rem;
            margin-bottom: 2.5rem;
          }

          .monogram {
            display: grid;
            place-items: center;
            width: 2rem;
            height: 2rem;
            border-radius: 0.5rem;
            background: var(--primary);
            color: var(--bg);
            font-weight: 700;
            font-size: 1.0625rem;
            letter-spacing: -0.02em;
          }

          .brand-name {
            font-family: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
            font-weight: 700;
            font-size: 1.0625rem;
            letter-spacing: -0.01em;
          }

          h1 {
            font-family: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
            font-size: clamp(1.75rem, 1.4rem + 1.6vw, 2.5rem);
            line-height: 1.15;
            letter-spacing: -0.025em;
            margin: 0 0 0.75rem;
          }

          .tagline {
            font-size: 1.0625rem;
            color: var(--text-muted);
            margin: 0 0 2rem;
          }

          .notice {
            background: var(--tint);
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            padding: 1.25rem 1.375rem;
            margin-bottom: 3rem;
          }

          .notice p { margin: 0 0 0.875rem; font-size: 0.9375rem; }
          .notice p:last-child { margin-bottom: 0; }

          .feed-url {
            display: block;
            font-family: ui-monospace, 'SF Mono', 'Cascadia Mono', monospace;
            font-size: 0.875rem;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            padding: 0.6875rem 0.875rem;
            color: var(--text);
            word-break: break-all;
            text-decoration: none;
          }

          .feed-url:hover { border-color: var(--primary); }

          .count {
            font-size: 0.8125rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-muted);
            margin: 0 0 1.25rem;
          }

          article {
            padding: 1.75rem 0;
            border-top: 1px solid var(--border);
          }

          article h2 {
            font-family: 'Manrope Variable', ui-sans-serif, system-ui, sans-serif;
            font-size: 1.25rem;
            line-height: 1.3;
            letter-spacing: -0.015em;
            margin: 0 0 0.5rem;
          }

          article h2 a { color: var(--text); text-decoration: none; }
          article h2 a:hover { color: var(--primary); text-decoration: underline; text-underline-offset: 0.15em; }

          .meta {
            font-size: 0.8125rem;
            color: var(--text-muted);
            margin: 0 0 0.625rem;
          }

          .summary { margin: 0 0 0.875rem; color: var(--text-muted); font-size: 0.9375rem; }

          .tags { display: flex; flex-wrap: wrap; gap: 0.375rem; }

          .tag {
            font-size: 0.75rem;
            color: var(--text-muted);
            border: 1px solid var(--border);
            border-radius: 999px;
            padding: 0.1875rem 0.5625rem;
          }

          footer {
            margin-top: 3rem;
            padding-top: 1.75rem;
            border-top: 1px solid var(--border);
            font-size: 0.9375rem;
          }

          footer a { color: var(--primary); text-decoration: none; }
          footer a:hover { text-decoration: underline; text-underline-offset: 0.15em; }

          a:focus-visible, .feed-url:focus-visible {
            outline: 2px solid var(--primary);
            outline-offset: 2px;
            border-radius: 0.25rem;
          }
        </style>
      </head>

      <body>
        <div class="wrap">
          <div class="brand">
            <span class="monogram">V</span>
            <span class="brand-name">Vitualha</span>
          </div>

          <h1><xsl:value-of select="/rss/channel/title" /></h1>
          <p class="tagline"><xsl:value-of select="/rss/channel/description" /></p>

          <div class="notice">
            <xsl:choose>
              <xsl:when test="$pt">
                <p>
                  <strong>Isto é um feed RSS.</strong> Copie o endereço abaixo e
                  cole no seu leitor de feeds para receber os artigos novos assim
                  que saírem — sem algoritmo, sem cadastro e sem e-mail.
                </p>
              </xsl:when>
              <xsl:otherwise>
                <p>
                  <strong>This is an RSS feed.</strong> Copy the address below into
                  your feed reader to get new articles as they are published — no
                  algorithm, no sign-up, no email.
                </p>
              </xsl:otherwise>
            </xsl:choose>

            <a class="feed-url">
              <xsl:attribute name="href">
                <xsl:value-of select="/rss/channel/atom:link[@rel='self']/@href" />
              </xsl:attribute>
              <xsl:value-of select="/rss/channel/atom:link[@rel='self']/@href" />
            </a>
          </div>

          <p class="count">
            <xsl:value-of select="count(/rss/channel/item)" />
            <xsl:choose>
              <xsl:when test="$pt"> artigos publicados</xsl:when>
              <xsl:otherwise> published articles</xsl:otherwise>
            </xsl:choose>
          </p>

          <xsl:apply-templates select="/rss/channel/item" />

          <footer>
            <a>
              <xsl:attribute name="href">
                <xsl:value-of select="/rss/channel/link" />
              </xsl:attribute>
              <xsl:choose>
                <xsl:when test="$pt">← Ir para o site</xsl:when>
                <xsl:otherwise>← Go to the website</xsl:otherwise>
              </xsl:choose>
            </a>
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>

  <xsl:template match="item">
    <article>
      <h2>
        <a>
          <xsl:attribute name="href"><xsl:value-of select="link" /></xsl:attribute>
          <xsl:value-of select="title" />
        </a>
      </h2>

      <p class="meta">
        <xsl:call-template name="data-legivel">
          <xsl:with-param name="rfc822" select="pubDate" />
        </xsl:call-template>
        <xsl:if test="*[local-name()='creator']">
          <xsl:text> · </xsl:text>
          <xsl:value-of select="*[local-name()='creator']" />
        </xsl:if>
      </p>

      <p class="summary"><xsl:value-of select="description" /></p>

      <xsl:if test="category">
        <div class="tags">
          <xsl:for-each select="category">
            <span class="tag"><xsl:value-of select="." /></span>
          </xsl:for-each>
        </div>
      </xsl:if>
    </article>
  </xsl:template>

  <!--
    "Mon, 10 Aug 2026 00:00:00 GMT" -> "10 de agosto de 2026" / "10 Aug 2026".

    XSLT 1.0 nao tem funcao de data: o formato RFC-822 do RSS tem largura fixa
    nesses campos, entao recortar por posicao é seguro. O mes vira nome por
    tabela porque traduzir numero de mes daria o mesmo trabalho.
  -->
  <xsl:template name="data-legivel">
    <xsl:param name="rfc822" />
    <xsl:variable name="dia" select="substring($rfc822, 6, 2)" />
    <xsl:variable name="mes" select="substring($rfc822, 9, 3)" />
    <xsl:variable name="ano" select="substring($rfc822, 13, 4)" />

    <xsl:choose>
      <xsl:when test="$pt">
        <xsl:value-of select="number($dia)" />
        <xsl:text> de </xsl:text>
        <xsl:choose>
          <xsl:when test="$mes = 'Jan'">janeiro</xsl:when>
          <xsl:when test="$mes = 'Feb'">fevereiro</xsl:when>
          <xsl:when test="$mes = 'Mar'">março</xsl:when>
          <xsl:when test="$mes = 'Apr'">abril</xsl:when>
          <xsl:when test="$mes = 'May'">maio</xsl:when>
          <xsl:when test="$mes = 'Jun'">junho</xsl:when>
          <xsl:when test="$mes = 'Jul'">julho</xsl:when>
          <xsl:when test="$mes = 'Aug'">agosto</xsl:when>
          <xsl:when test="$mes = 'Sep'">setembro</xsl:when>
          <xsl:when test="$mes = 'Oct'">outubro</xsl:when>
          <xsl:when test="$mes = 'Nov'">novembro</xsl:when>
          <xsl:otherwise>dezembro</xsl:otherwise>
        </xsl:choose>
        <xsl:text> de </xsl:text>
        <xsl:value-of select="$ano" />
      </xsl:when>

      <xsl:otherwise>
        <xsl:value-of select="number($dia)" />
        <xsl:text> </xsl:text>
        <xsl:value-of select="$mes" />
        <xsl:text> </xsl:text>
        <xsl:value-of select="$ano" />
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>
</xsl:stylesheet>

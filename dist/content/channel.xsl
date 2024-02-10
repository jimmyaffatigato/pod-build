<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <xsl:template match="/rss/channel">
    <html>
      <head>
        <link rel="stylesheet" type="text/css" href="/styles.css" />
        <title>
          <xsl:value-of select="title" />
        </title>
      </head>
      <body>
        <h1>
          <xsl:value-of select="title" />
        </h1>
        <h2>Episodes</h2>
        <table border="1" collapse="true">
          <tr>
            <th>img</th>
            <th>S</th>
            <th>E</th>
            <th>title</th>
            <th>pubDate</th>
            <th>duration</th>
            <th>audio</th>
          </tr>
          <xsl:for-each select="item">
            <tr>
              <td>
                <a>
                  <xsl:attribute name="href">
                    <xsl:value-of select="itunes:image/@href"></xsl:value-of>
                  </xsl:attribute>
                  <img height="40">
                    <xsl:attribute name="src">
                      <xsl:value-of select="itunes:image/@href" />
                    </xsl:attribute>
                  </img>
                </a>
              </td>
              <td>
                <xsl:value-of select="itunes:season" />
              </td>
              <td>
                <xsl:value-of select="itunes:episode" />
              </td>
              <td>
                <a>
                  <xsl:attribute name="href">
                    <xsl:value-of select="link"></xsl:value-of>
                  </xsl:attribute>
                  <xsl:value-of select="itunes:title" />
                </a>
              </td>
              <td>
                <xsl:value-of select="pubDate" />
              </td>
              <td><xsl:value-of select="itunes:duration" />s</td>
              <td>
                <audio controls="">
                  <xsl:attribute name="src">
                    <xsl:value-of select="enclosure/@url" />
                  </xsl:attribute>
                </audio>
              </td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>

</xsl:stylesheet>
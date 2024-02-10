# `pod-build`

`pod-build` is a local development environment for podcast publishing.

It uses open technologies and opinionated defaults to generate a hostable podcast feed bundle.

Input: `config.json` with accompanying `content` directory.  
Output: Hostable `public` directory.

`Generator` transforms a `Config` object (usually imported from `config.json`) into a `Channel` object, which contains formatted and validated field text for the elements of a standard podcast feed's XML (RSS) file. The generator is designed to be extendable. The referenced media files are copied from the local `content` folder to `public/media`.

The RSS writer `RSS.writeRSS()` outputs the channel's state in XML format with podcast feed headers. By default, this file is written to `public/rss.xml`.

`SiteBuilder` builds a static site in `public`, creating each page specified in the podcast fields.

## `config.json`

`generator`: { ... }

`channel`: { ... }

`domain`: Host domain for links.

`title`: Title of feed

`pubDate`: Publication date of this version of the feed (any string recognized by `Date`)

`copyright`: Copyright/License declaration

## `rss.xml`

## `<channel>`

### `<title>`

Title of feed (plain text)

### `<pubDate>`

Publication date of this version of the feed (RFC2822 string)

### `<link>`

URL of the host domain (URL string)

### `<copyright>`

Copyright/License declaration (plain text)

### `<generator>`

Name and version of this generator

### `<docs>`

Link to a documentation page. `docs.html` hosted at `HOST/docs`

### `<description>`

## TODO

- Expand documentation on dev side (this doc) and user-facing (`/docs.html`)
- Allow more flexibility for configuration - right now, the defaults are the only way to do some things

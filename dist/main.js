var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/lib/Generator.ts
var import_promises4 = __toESM(require("fs/promises"));
var import_path3 = __toESM(require("path"));

// src/lib/util.ts
var import_ffprobe = __toESM(require("@ffprobe-installer/ffprobe"));
var import_child_process = require("child_process");
var import_promises = __toESM(require("fs/promises"));
var import_path = __toESM(require("path"));
var GENERATORNAME = `POD GENERATOR`;
var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
async function getAudioMetadata(filePath, emit = false) {
  const ffprobePath = import_ffprobe.default.path;
  const ffprobeProcess = (0, import_child_process.spawn)(ffprobePath, ["-show_format", filePath]);
  const promise = new Promise((res, rej) => {
    ffprobeProcess.stdout.on("data", (data) => {
      const result = String(data);
      if (emit) {
        console.log(result);
        import_promises.default.writeFile(import_path.default.join(__dirname, "audioData.txt"), result);
      }
      const durationMatch = /duration=([0-9\.]+)/.exec(result);
      const sizeMatch = /size=([0-9]+)/.exec(result);
      const duration = Number(durationMatch[1]);
      const size = Number(sizeMatch[1]);
      if (!isNaN(duration) && !isNaN(size)) {
        res({
          size,
          duration,
          type: ""
        });
      }
      rej(() => {
        console.error(`Invalid. Received: { duration: ${durationMatch}, size: ${size} }`);
      });
    });
  });
  return promise;
}
async function importJSON(path4) {
  try {
    const fileContents = await import_promises.default.readFile(path4, "utf-8");
    return await JSON.parse(fileContents);
  } catch {
    throw new Error(`File ${path4} could not be imported`);
  }
}
function formatDateISO8601(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getDate()}`;
}
function dateToRFC2822(date) {
  const weekday = String(weekdays[date.getDay()]);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(months[date.getMonth()]);
  const year = String(date.getFullYear());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  const timezone = String(date.getTimezoneOffset()).padStart(4, "0");
  return `${weekday}, ${day} ${month} ${year} ${hour}:${minute}:${second} ${date.getTimezoneOffset() >= 0 ? "+" : "-"}${timezone}`;
}
function formatDurationHHMMSS(timeInSeconds) {
  timeInSeconds = Math.floor(timeInSeconds);
  const hours = Math.floor(timeInSeconds / 3600);
  const minutes = Math.floor(timeInSeconds % 3600 / 60);
  const seconds = Math.floor(timeInSeconds % 60);
  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(seconds).padStart(2, "0");
  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}
function formatEpCode(season, episode) {
  return `s${String(season).padStart(2, "0")}-e${String(episode).padStart(2, "0")}`;
}

// src/lib/ChannelGenerator.ts
var import_promises2 = __toESM(require("fs/promises"));
var import_sharp = __toESM(require("sharp"));
var import_path2 = __toESM(require("path"));
var ChannelGenerator = class {
  static async compile(config) {
    if (!validateConfig(config)) {
      throw new Error("Config failed validation");
    }
    const channelConfig = config.channel;
    const domain = channelConfig.domain;
    const footerHTML = await import_promises2.default.readFile(import_path2.default.join(CONTENTDIR, "footer.html"), "utf-8");
    const mediaFiles = [];
    const localImageFile = import_path2.default.join(CONTENTDIR, channelConfig.imageFile);
    const publicImageFile = import_path2.default.join(MEDIADIR, channelConfig.imageFile);
    mediaFiles.push([localImageFile, publicImageFile]);
    const imageURL = `${domain}/media/${channelConfig.imageFile}`;
    const channel = {
      atomLink: `${domain}/rss.xml`,
      title: channelConfig.title,
      pubDate: dateToRFC2822(new Date(channelConfig.pubDate)),
      link: `${domain}`,
      language: "en-us",
      copyright: channelConfig.copyright || "",
      generator: GENERATORNAME,
      docs: `${domain}/docs.html`,
      description: channelConfig.description,
      image: {
        url: imageURL,
        title: channelConfig.title,
        link: domain
      },
      itunesAuthor: channelConfig.author,
      itunesImage: {
        href: imageURL
      },
      itunesKeywords: (channelConfig.keywords || []).join(","),
      itunesExplicit: channelConfig.explicit || false,
      itunesOwner: {
        itunesName: channelConfig.author,
        itunesEmail: channelConfig.email
      },
      itunesType: channelConfig.serial ? "serial" : "episodic",
      itunesCategory: channelConfig.category,
      items: []
    };
    for (const itemConfig of config.channel.items) {
      const audioFileLocalPath = import_path2.default.join(CONTENTDIR, itemConfig.audioFile);
      const audioFilePublicPath = import_path2.default.join(MEDIADIR, itemConfig.audioFile);
      mediaFiles.push([audioFileLocalPath, audioFilePublicPath]);
      const imageFileLocalPath = import_path2.default.join(CONTENTDIR, itemConfig.imageFile);
      const imageFilePublicPath = import_path2.default.join(MEDIADIR, itemConfig.imageFile);
      mediaFiles.push([imageFileLocalPath, imageFilePublicPath]);
      const audioFileURL = `${domain}/media/${itemConfig.audioFile}`;
      const imageFileURL = `${domain}/media/${itemConfig.imageFile}`;
      const itemID = formatEpCode(itemConfig.season, itemConfig.episode);
      const link = `${domain}/ep/${itemID}.html`;
      const audioMetadata = await getAudioMetadata(audioFileLocalPath);
      const descriptionHTML = await import_promises2.default.readFile(import_path2.default.join(CONTENTDIR, itemConfig.descriptionFile), "utf-8");
      const description = [descriptionHTML, footerHTML].join("");
      const itemProps = {
        // Format full title: "s##-e## - {title}"
        // if a format were to be applied programmatically, it would be here.
        title: `${itemID} - ${itemConfig.title}`,
        itunesTitle: itemConfig.title,
        pubDate: itemConfig.pubDate,
        link,
        itunesImage: {
          href: imageFileURL
        },
        description,
        itunesDuration: Math.floor(audioMetadata.duration),
        itunesSeason: itemConfig.season,
        itunesEpisode: itemConfig.episode,
        itunesExplicit: channelConfig.explicit,
        itunesEpisodeType: itemConfig.episodeType,
        enclosure: {
          length: Math.floor(audioMetadata.size),
          // Type is assumed to be mp3. Don't complicate things.
          type: "audio/mpeg",
          url: audioFileURL
        }
      };
      channel.items.push(itemProps);
    }
    for (const mediaFile of mediaFiles) {
      const [origin, destination] = mediaFile;
      await import_promises2.default.cp(origin, destination);
    }
    const faviconImage = (0, import_sharp.default)(publicImageFile);
    const publicFaviconFile = import_path2.default.join(PUBLICDIR, "favicon.bmp");
    faviconImage.resize(16, 16);
    await faviconImage.toFile(publicFaviconFile);
    await import_promises2.default.rename(publicFaviconFile, import_path2.default.join(PUBLICDIR, "favicon.ico"));
    return channel;
  }
};
function validateConfig(config) {
  const channel = config.channel;
  return !!channel?.title && !!channel.domain && !!channel.pubDate && !!channel.author && !!channel.description && !!channel.imageFile && !!channel.email;
}

// src/lib/SiteBuilder.ts
var import_jsdom = require("jsdom");

// src/lib/XML.ts
var XML = class {
  static readElementText(parent, tagName) {
    return parent.getElementsByTagName(tagName)[0].textContent;
  }
  static appendChildren(parent, children) {
    if (Object.hasOwn(children, "appendChild")) {
      children = children;
      parent.appendChild(children);
    } else if (Array.isArray(children)) {
      for (const element of children) {
        if (element) {
          parent.appendChild(element);
        }
      }
    } else {
    }
  }
  static element(doc, tagName, children, attributes) {
    const e = doc.createElement(tagName);
    if (children) {
      if (Array.isArray(children)) {
        for (const c of children) {
          if (typeof c == "string") {
            const textNode = doc.createTextNode(c);
            e.appendChild(textNode);
          } else {
            e.appendChild(c);
          }
        }
      } else {
        if (typeof children == "string") {
          const textNode = doc.createTextNode(children);
          e.appendChild(textNode);
        } else {
          e.appendChild(children);
        }
      }
    }
    if (attributes) {
      for (const a of attributes) {
        e.setAttribute(a[0], a[1]);
      }
    }
    return e;
  }
  static head(doc, title, faviconURL = "/favicon.ico", stylesheetURL = "/styles.css") {
    doc.title = title;
    const linkStylesheet = doc.createElement("link");
    doc.head.appendChild(linkStylesheet);
    linkStylesheet.href = stylesheetURL;
    linkStylesheet.rel = "stylesheet";
    const linkFavicon = doc.createElement("link");
    doc.head.appendChild(linkFavicon);
    linkFavicon.href = faviconURL;
    linkFavicon.rel = "icon";
  }
  static nav(parent, channelLink, imageURL, title, atomLink) {
    const doc = parent.ownerDocument;
    const nav = doc.createElement("nav");
    parent.appendChild(nav);
    const homeLink = doc.createElement("a");
    nav.appendChild(homeLink);
    homeLink.href = channelLink;
    const homeIcon = doc.createElement("img");
    homeLink.appendChild(homeIcon);
    homeIcon.src = imageURL;
    homeIcon.height = 20;
    const homeTitle = doc.createElement("span");
    homeLink.appendChild(homeTitle);
    homeTitle.textContent = title;
    nav.appendChild(doc.createTextNode(" ("));
    const subscribeLink = doc.createElement("a");
    nav.appendChild(subscribeLink);
    subscribeLink.href = atomLink;
    subscribeLink.textContent = "Subscribe";
    nav.appendChild(doc.createTextNode(")"));
  }
  static downloadLink(parent, enclosure) {
    const doc = parent.ownerDocument;
    const span = doc.createElement("span");
    span.className = "downloadLink";
    parent.appendChild(span);
    const link = doc.createElement("a");
    link.href = enclosure.url;
    link.textContent = "Download";
    link.title = `Download ${enclosure.url.substring(enclosure.url.lastIndexOf("/") + 1)}`;
    span.appendChild(link);
    span.appendChild(doc.createTextNode(` (${(enclosure.length / 1e6).toFixed(1)} MB, ${enclosure.type})`));
  }
};

// node_modules/mustache/mustache.mjs
var objectToString = Object.prototype.toString;
var isArray = Array.isArray || function isArrayPolyfill(object) {
  return objectToString.call(object) === "[object Array]";
};
function isFunction(object) {
  return typeof object === "function";
}
function typeStr(obj) {
  return isArray(obj) ? "array" : typeof obj;
}
function escapeRegExp(string) {
  return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}
function hasProperty(obj, propName) {
  return obj != null && typeof obj === "object" && propName in obj;
}
function primitiveHasOwnProperty(primitive, propName) {
  return primitive != null && typeof primitive !== "object" && primitive.hasOwnProperty && primitive.hasOwnProperty(propName);
}
var regExpTest = RegExp.prototype.test;
function testRegExp(re, string) {
  return regExpTest.call(re, string);
}
var nonSpaceRe = /\S/;
function isWhitespace(string) {
  return !testRegExp(nonSpaceRe, string);
}
var entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;"
};
function escapeHtml(string) {
  return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
    return entityMap[s];
  });
}
var whiteRe = /\s*/;
var spaceRe = /\s+/;
var equalsRe = /\s*=/;
var curlyRe = /\s*\}/;
var tagRe = /#|\^|\/|>|\{|&|=|!/;
function parseTemplate(template, tags) {
  if (!template)
    return [];
  var lineHasNonSpace = false;
  var sections = [];
  var tokens = [];
  var spaces = [];
  var hasTag = false;
  var nonSpace = false;
  var indentation = "";
  var tagIndex = 0;
  function stripSpace() {
    if (hasTag && !nonSpace) {
      while (spaces.length)
        delete tokens[spaces.pop()];
    } else {
      spaces = [];
    }
    hasTag = false;
    nonSpace = false;
  }
  var openingTagRe, closingTagRe, closingCurlyRe;
  function compileTags(tagsToCompile) {
    if (typeof tagsToCompile === "string")
      tagsToCompile = tagsToCompile.split(spaceRe, 2);
    if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
      throw new Error("Invalid tags: " + tagsToCompile);
    openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + "\\s*");
    closingTagRe = new RegExp("\\s*" + escapeRegExp(tagsToCompile[1]));
    closingCurlyRe = new RegExp("\\s*" + escapeRegExp("}" + tagsToCompile[1]));
  }
  compileTags(tags || mustache.tags);
  var scanner = new Scanner(template);
  var start, type, value, chr, token, openSection;
  while (!scanner.eos()) {
    start = scanner.pos;
    value = scanner.scanUntil(openingTagRe);
    if (value) {
      for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
        chr = value.charAt(i);
        if (isWhitespace(chr)) {
          spaces.push(tokens.length);
          indentation += chr;
        } else {
          nonSpace = true;
          lineHasNonSpace = true;
          indentation += " ";
        }
        tokens.push(["text", chr, start, start + 1]);
        start += 1;
        if (chr === "\n") {
          stripSpace();
          indentation = "";
          tagIndex = 0;
          lineHasNonSpace = false;
        }
      }
    }
    if (!scanner.scan(openingTagRe))
      break;
    hasTag = true;
    type = scanner.scan(tagRe) || "name";
    scanner.scan(whiteRe);
    if (type === "=") {
      value = scanner.scanUntil(equalsRe);
      scanner.scan(equalsRe);
      scanner.scanUntil(closingTagRe);
    } else if (type === "{") {
      value = scanner.scanUntil(closingCurlyRe);
      scanner.scan(curlyRe);
      scanner.scanUntil(closingTagRe);
      type = "&";
    } else {
      value = scanner.scanUntil(closingTagRe);
    }
    if (!scanner.scan(closingTagRe))
      throw new Error("Unclosed tag at " + scanner.pos);
    if (type == ">") {
      token = [type, value, start, scanner.pos, indentation, tagIndex, lineHasNonSpace];
    } else {
      token = [type, value, start, scanner.pos];
    }
    tagIndex++;
    tokens.push(token);
    if (type === "#" || type === "^") {
      sections.push(token);
    } else if (type === "/") {
      openSection = sections.pop();
      if (!openSection)
        throw new Error('Unopened section "' + value + '" at ' + start);
      if (openSection[1] !== value)
        throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
    } else if (type === "name" || type === "{" || type === "&") {
      nonSpace = true;
    } else if (type === "=") {
      compileTags(value);
    }
  }
  stripSpace();
  openSection = sections.pop();
  if (openSection)
    throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);
  return nestTokens(squashTokens(tokens));
}
function squashTokens(tokens) {
  var squashedTokens = [];
  var token, lastToken;
  for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    token = tokens[i];
    if (token) {
      if (token[0] === "text" && lastToken && lastToken[0] === "text") {
        lastToken[1] += token[1];
        lastToken[3] = token[3];
      } else {
        squashedTokens.push(token);
        lastToken = token;
      }
    }
  }
  return squashedTokens;
}
function nestTokens(tokens) {
  var nestedTokens = [];
  var collector = nestedTokens;
  var sections = [];
  var token, section;
  for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    token = tokens[i];
    switch (token[0]) {
      case "#":
      case "^":
        collector.push(token);
        sections.push(token);
        collector = token[4] = [];
        break;
      case "/":
        section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
        break;
      default:
        collector.push(token);
    }
  }
  return nestedTokens;
}
function Scanner(string) {
  this.string = string;
  this.tail = string;
  this.pos = 0;
}
Scanner.prototype.eos = function eos() {
  return this.tail === "";
};
Scanner.prototype.scan = function scan(re) {
  var match = this.tail.match(re);
  if (!match || match.index !== 0)
    return "";
  var string = match[0];
  this.tail = this.tail.substring(string.length);
  this.pos += string.length;
  return string;
};
Scanner.prototype.scanUntil = function scanUntil(re) {
  var index = this.tail.search(re), match;
  switch (index) {
    case -1:
      match = this.tail;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, index);
      this.tail = this.tail.substring(index);
  }
  this.pos += match.length;
  return match;
};
function Context(view, parentContext) {
  this.view = view;
  this.cache = { ".": this.view };
  this.parent = parentContext;
}
Context.prototype.push = function push(view) {
  return new Context(view, this);
};
Context.prototype.lookup = function lookup(name) {
  var cache = this.cache;
  var value;
  if (cache.hasOwnProperty(name)) {
    value = cache[name];
  } else {
    var context = this, intermediateValue, names, index, lookupHit = false;
    while (context) {
      if (name.indexOf(".") > 0) {
        intermediateValue = context.view;
        names = name.split(".");
        index = 0;
        while (intermediateValue != null && index < names.length) {
          if (index === names.length - 1)
            lookupHit = hasProperty(intermediateValue, names[index]) || primitiveHasOwnProperty(intermediateValue, names[index]);
          intermediateValue = intermediateValue[names[index++]];
        }
      } else {
        intermediateValue = context.view[name];
        lookupHit = hasProperty(context.view, name);
      }
      if (lookupHit) {
        value = intermediateValue;
        break;
      }
      context = context.parent;
    }
    cache[name] = value;
  }
  if (isFunction(value))
    value = value.call(this.view);
  return value;
};
function Writer() {
  this.templateCache = {
    _cache: {},
    set: function set(key, value) {
      this._cache[key] = value;
    },
    get: function get(key) {
      return this._cache[key];
    },
    clear: function clear() {
      this._cache = {};
    }
  };
}
Writer.prototype.clearCache = function clearCache() {
  if (typeof this.templateCache !== "undefined") {
    this.templateCache.clear();
  }
};
Writer.prototype.parse = function parse(template, tags) {
  var cache = this.templateCache;
  var cacheKey = template + ":" + (tags || mustache.tags).join(":");
  var isCacheEnabled = typeof cache !== "undefined";
  var tokens = isCacheEnabled ? cache.get(cacheKey) : void 0;
  if (tokens == void 0) {
    tokens = parseTemplate(template, tags);
    isCacheEnabled && cache.set(cacheKey, tokens);
  }
  return tokens;
};
Writer.prototype.render = function render(template, view, partials, config) {
  var tags = this.getConfigTags(config);
  var tokens = this.parse(template, tags);
  var context = view instanceof Context ? view : new Context(view, void 0);
  return this.renderTokens(tokens, context, partials, template, config);
};
Writer.prototype.renderTokens = function renderTokens(tokens, context, partials, originalTemplate, config) {
  var buffer = "";
  var token, symbol, value;
  for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
    value = void 0;
    token = tokens[i];
    symbol = token[0];
    if (symbol === "#")
      value = this.renderSection(token, context, partials, originalTemplate, config);
    else if (symbol === "^")
      value = this.renderInverted(token, context, partials, originalTemplate, config);
    else if (symbol === ">")
      value = this.renderPartial(token, context, partials, config);
    else if (symbol === "&")
      value = this.unescapedValue(token, context);
    else if (symbol === "name")
      value = this.escapedValue(token, context, config);
    else if (symbol === "text")
      value = this.rawValue(token);
    if (value !== void 0)
      buffer += value;
  }
  return buffer;
};
Writer.prototype.renderSection = function renderSection(token, context, partials, originalTemplate, config) {
  var self = this;
  var buffer = "";
  var value = context.lookup(token[1]);
  function subRender(template) {
    return self.render(template, context, partials, config);
  }
  if (!value)
    return;
  if (isArray(value)) {
    for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
      buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate, config);
    }
  } else if (typeof value === "object" || typeof value === "string" || typeof value === "number") {
    buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate, config);
  } else if (isFunction(value)) {
    if (typeof originalTemplate !== "string")
      throw new Error("Cannot use higher-order sections without the original template");
    value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);
    if (value != null)
      buffer += value;
  } else {
    buffer += this.renderTokens(token[4], context, partials, originalTemplate, config);
  }
  return buffer;
};
Writer.prototype.renderInverted = function renderInverted(token, context, partials, originalTemplate, config) {
  var value = context.lookup(token[1]);
  if (!value || isArray(value) && value.length === 0)
    return this.renderTokens(token[4], context, partials, originalTemplate, config);
};
Writer.prototype.indentPartial = function indentPartial(partial, indentation, lineHasNonSpace) {
  var filteredIndentation = indentation.replace(/[^ \t]/g, "");
  var partialByNl = partial.split("\n");
  for (var i = 0; i < partialByNl.length; i++) {
    if (partialByNl[i].length && (i > 0 || !lineHasNonSpace)) {
      partialByNl[i] = filteredIndentation + partialByNl[i];
    }
  }
  return partialByNl.join("\n");
};
Writer.prototype.renderPartial = function renderPartial(token, context, partials, config) {
  if (!partials)
    return;
  var tags = this.getConfigTags(config);
  var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
  if (value != null) {
    var lineHasNonSpace = token[6];
    var tagIndex = token[5];
    var indentation = token[4];
    var indentedValue = value;
    if (tagIndex == 0 && indentation) {
      indentedValue = this.indentPartial(value, indentation, lineHasNonSpace);
    }
    var tokens = this.parse(indentedValue, tags);
    return this.renderTokens(tokens, context, partials, indentedValue, config);
  }
};
Writer.prototype.unescapedValue = function unescapedValue(token, context) {
  var value = context.lookup(token[1]);
  if (value != null)
    return value;
};
Writer.prototype.escapedValue = function escapedValue(token, context, config) {
  var escape = this.getConfigEscape(config) || mustache.escape;
  var value = context.lookup(token[1]);
  if (value != null)
    return typeof value === "number" && escape === mustache.escape ? String(value) : escape(value);
};
Writer.prototype.rawValue = function rawValue(token) {
  return token[1];
};
Writer.prototype.getConfigTags = function getConfigTags(config) {
  if (isArray(config)) {
    return config;
  } else if (config && typeof config === "object") {
    return config.tags;
  } else {
    return void 0;
  }
};
Writer.prototype.getConfigEscape = function getConfigEscape(config) {
  if (config && typeof config === "object" && !isArray(config)) {
    return config.escape;
  } else {
    return void 0;
  }
};
var mustache = {
  name: "mustache.js",
  version: "4.2.0",
  tags: ["{{", "}}"],
  clearCache: void 0,
  escape: void 0,
  parse: void 0,
  render: void 0,
  Scanner: void 0,
  Context: void 0,
  Writer: void 0,
  /**
   * Allows a user to override the default caching strategy, by providing an
   * object with set, get and clear methods. This can also be used to disable
   * the cache by setting it to the literal `undefined`.
   */
  set templateCache(cache) {
    defaultWriter.templateCache = cache;
  },
  /**
   * Gets the default or overridden caching object from the default writer.
   */
  get templateCache() {
    return defaultWriter.templateCache;
  }
};
var defaultWriter = new Writer();
mustache.clearCache = function clearCache2() {
  return defaultWriter.clearCache();
};
mustache.parse = function parse2(template, tags) {
  return defaultWriter.parse(template, tags);
};
mustache.render = function render2(template, view, partials, config) {
  if (typeof template !== "string") {
    throw new TypeError('Invalid template! Template should be a "string" but "' + typeStr(template) + '" was given as the first argument for mustache#render(template, view, partials)');
  }
  return defaultWriter.render(template, view, partials, config);
};
mustache.escape = escapeHtml;
mustache.Scanner = Scanner;
mustache.Context = Context;
mustache.Writer = Writer;
var mustache_default = mustache;

// src/lib/SiteBuilder.ts
var HTMLTEMPLATE = "<!DOCTYPE html><head></head><body></body></html>";
var SiteBuilder = class _SiteBuilder {
  static buildPage(builder) {
    const dom = new import_jsdom.JSDOM(HTMLTEMPLATE);
    const doc = dom.window.document;
    builder(doc);
    const output = dom.serialize();
    dom.window.close();
    return output;
  }
  static generateItemPageTemplate() {
    return _SiteBuilder.buildPage((document) => {
      XML.head(document, "{{channel.title}}");
      XML.nav(document.body, "{{channel.link}}", "{{channel.image.url}}", "{{channel.title}}", "{{channel.atomLink}}");
      const coverImage = document.createElement("img");
      document.body.appendChild(coverImage);
      coverImage.src = "{{item.itunesImage.href}}";
      coverImage.height = 300;
      const itemTitle = document.createElement("h1");
      document.body.appendChild(itemTitle);
      const itemTitleLink = document.createElement("a");
      itemTitle.appendChild(itemTitleLink);
      itemTitleLink.href = "{{item.link}}";
      itemTitleLink.textContent = "{{item.title}}";
      const itemDuration = document.createElement("span");
      itemTitle.appendChild(itemDuration);
      itemDuration.textContent = ` ({{duration}})`;
      const dateElement = document.createElement("h2");
      document.body.appendChild(dateElement);
      dateElement.textContent = "{{date}}";
      const audioSection = document.createElement("section");
      document.body.appendChild(audioSection);
      const audioElement = document.createElement("audio");
      audioSection.appendChild(audioElement);
      audioElement.controls = true;
      audioElement.src = "{{item.enclosure.url}}";
      const downloadLinkSpan = document.createElement("span");
      downloadLinkSpan.className = "downloadLink";
      document.body.appendChild(downloadLinkSpan);
      const downloadLinkA = document.createElement("a");
      downloadLinkA.href = "{{item.enclosure.url}}";
      downloadLinkA.textContent = "Download";
      downloadLinkA.title = `Download "{{fileName}}"`;
      downloadLinkSpan.appendChild(downloadLinkA);
      downloadLinkSpan.appendChild(document.createTextNode(` ({{downloadSize}} MB, {{item.enclosure.type}})`));
      const description = document.createElement("section");
      document.body.appendChild(description);
      description.className = "episodeDescription";
      description.innerHTML = "{{{item.description}}}";
    });
  }
  static generateItemPage(template, channel, item) {
    const pageHTML = mustache_default.render(template, {
      channel,
      item,
      date: formatDateISO8601(new Date(item.pubDate)),
      duration: formatDurationHHMMSS(item.itunesDuration),
      fileName: item.enclosure.url.substring(item.enclosure.url.lastIndexOf("/") + 1),
      downloadSize: (item.enclosure.length / 1e6).toFixed(1)
    });
    return pageHTML;
  }
  static generateIndex(channel) {
    return _SiteBuilder.buildPage((doc) => {
      XML.head(doc, channel.title);
      const channelImage = doc.createElement("img");
      doc.body.appendChild(channelImage);
      channelImage.className = "channelImage";
      channelImage.src = channel.image.url;
      channelImage.alt = channel.image.title;
      const channelTitle = doc.createElement("h1");
      doc.body.appendChild(channelTitle);
      const titleLink = doc.createElement("a");
      titleLink.href = channel.link;
      titleLink.textContent = channel.title;
      channelTitle.appendChild(titleLink);
      const subscribeP = doc.createElement("p");
      doc.body.appendChild(subscribeP);
      const subscribeLink = doc.createElement("a");
      subscribeLink.href = channel.atomLink;
      subscribeLink.textContent = "Subscribe";
      subscribeP.appendChild(subscribeLink);
      const channelDescription = doc.createElement("p");
      doc.body.appendChild(channelDescription);
      channelDescription.textContent = channel.description;
      const episodesHeader = doc.createElement("h2");
      doc.body.appendChild(episodesHeader);
      episodesHeader.className = "episodesHeader";
      episodesHeader.textContent = "Episodes";
      const itemList = doc.createElement("table");
      doc.body.appendChild(itemList);
      const tbody = doc.createElement("tbody");
      itemList.appendChild(tbody);
      for (const item of channel.items) {
        const row = doc.createElement("tr");
        tbody.appendChild(row);
        const imgCell = doc.createElement("td");
        row.appendChild(imgCell);
        const itemIcon = doc.createElement("img");
        imgCell.appendChild(itemIcon);
        itemIcon.src = item.itunesImage.href;
        itemIcon.height = 20;
        const itemLinkCell = doc.createElement("td");
        row.appendChild(itemLinkCell);
        const itemLink = doc.createElement("a");
        itemLinkCell.appendChild(itemLink);
        itemLink.href = item.link;
        itemLink.textContent = item.title;
        const durationCell = doc.createElement("td");
        row.appendChild(durationCell);
        durationCell.textContent = `(${formatDurationHHMMSS(item.itunesDuration)})`;
        const dateCell = doc.createElement("td");
        row.appendChild(dateCell);
        dateCell.textContent = formatDateISO8601(new Date(item.pubDate));
      }
      doc.body.appendChild(doc.createElement("hr"));
      const footerElement = doc.createElement("footer");
      doc.body.appendChild(footerElement);
      const docsLink = doc.createElement("a");
      footerElement.appendChild(docsLink);
      docsLink.href = channel.docs;
      docsLink.textContent = "Docs";
    });
  }
  static generateDocsPage() {
    const dom = new import_jsdom.JSDOM(HTMLTEMPLATE);
    dom.window.document.title = "Docs";
    const output = dom.serialize();
    return output;
  }
};

// src/lib/RSS.ts
var import_promises3 = __toESM(require("fs/promises"));
var import_jsdom2 = require("jsdom");
var XMLHEADER = `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE rss>`;
var RSSTEMPLATE = `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:content="http://purl.org/rss/1.0/modules/content/"></rss>`;
var RSS = class _RSS {
  static parse(xml) {
    return _RSS.parseRSSChannel(xml);
  }
  static parseRSSChannel(xml) {
    const dom = new import_jsdom2.JSDOM(xml, {
      contentType: "application/xml"
    });
    const doc = dom.window.document;
    const channel = doc.getElementsByTagName("channel")[0];
    const atomLink = channel.getElementsByTagName("atom:link")[0].getAttribute("href");
    const title = XML.readElementText(channel, "title");
    const pubDate = XML.readElementText(channel, "pubDate");
    const link = XML.readElementText(channel, "link");
    const language = XML.readElementText(channel, "language");
    const copyright = XML.readElementText(channel, "copyright");
    const docs = XML.readElementText(channel, "docs");
    const description = XML.readElementText(channel, "description");
    const imageElement = channel.getElementsByTagName("image")[0];
    const image = {
      url: XML.readElementText(imageElement, "url"),
      title: XML.readElementText(imageElement, "title"),
      link: XML.readElementText(imageElement, "link")
    };
    const itunesAuthor = XML.readElementText(channel, "itunes:author");
    const itunesExplicit = Boolean(XML.readElementText(channel, "itunesExplicit"));
    const itunesImageHref = channel.getElementsByTagName("itunes:image")[0].getAttribute("href");
    const itunesKeywords = XML.readElementText(channel, "itunes:keywords");
    const itunesDuration = Number(XML.readElementText(channel, "itunes:duration"));
    const itunesOwner = channel.getElementsByClassName("itunes:owner")[0];
    const itunesName = XML.readElementText(itunesOwner, "itunes:name");
    const itunesEmail = XML.readElementText(itunesOwner, "itunes:email");
    const items = Array.from(channel.getElementsByTagName("item")).map(_RSS.parseRSSItem);
    dom.window.close();
    return {
      atomLink,
      title,
      pubDate,
      link,
      language,
      copyright,
      docs,
      description,
      image,
      itunesAuthor,
      itunesDuration,
      itunesExplicit,
      itunesImage: {
        href: itunesImageHref
      },
      itunesKeywords,
      itunesOwner: {
        itunesName,
        itunesEmail
      },
      items
    };
  }
  static parseRSSItem(element) {
    const title = XML.readElementText(element, "title");
    const itunesTitle = XML.readElementText(element, "itunes:title");
    const pubDate = XML.readElementText(element, "pubDate");
    const link = XML.readElementText(element, "link");
    const itunesImage = element.getElementsByTagName("itunes:image")[0].getAttribute("href");
    const description = element.getElementsByTagName("description")[0].firstChild.textContent;
    const enclosureElement = element.getElementsByTagName("enclosure")[0];
    const enclosure = {
      length: Number(enclosureElement.getAttribute("length")),
      type: enclosureElement.getAttribute("type"),
      url: enclosureElement.getAttribute("url")
    };
    const itunesDuration = Number(XML.readElementText(element, "itunes:duration"));
    const itunesExplicit = Boolean(XML.readElementText(element, "itunes:explicit"));
    const itunesEpisode = Number(XML.readElementText(element, "itunes:episode"));
    const itunesSeason = Number(XML.readElementText(element, "itunes:season"));
    return {
      title,
      itunesTitle,
      pubDate,
      link,
      itunesImage: {
        href: itunesImage
      },
      description,
      enclosure,
      itunesDuration,
      itunesExplicit,
      itunesEpisode,
      itunesSeason
    };
  }
  static async channelToRSS(channel) {
    const dom = new import_jsdom2.JSDOM(`${RSSTEMPLATE}`, {
      contentType: "application/xml"
    });
    const doc = dom.window.document;
    const rssElement = doc.getElementsByTagName("rss")[0];
    const channelElement = doc.createElement("channel");
    rssElement.appendChild(channelElement);
    const channelChildren = [];
    if (channel.atomLink) {
      channelChildren.push(
        XML.element(doc, "atom:link", null, [
          ["href", channel.atomLink],
          ["rel", "self"],
          ["type", "application/rss+xml"]
        ])
      );
    }
    if (channel.title) {
      channelChildren.push(XML.element(doc, "title", channel.title));
    }
    if (channel.image?.url && channel.image.title && channel.image.link) {
      channelChildren.push(XML.element(doc, "image", [XML.element(doc, "url", channel.image.url), XML.element(doc, "title", channel.image.title), XML.element(doc, "link", channel.image.link)]));
    }
    if (channel.pubDate) {
      channelChildren.push(XML.element(doc, "pubDate", channel.pubDate));
    }
    if (channel.language) {
      channelChildren.push(XML.element(doc, "language", channel.language));
    }
    if (channel.description) {
      channelChildren.push(XML.element(doc, "description", channel.description));
    }
    if (channel.link) {
      channelChildren.push(XML.element(doc, "link", channel.link));
    }
    if (channel.copyright) {
      channelChildren.push(XML.element(doc, "copyright", channel.copyright));
    }
    if (channel.generator) {
      channelChildren.push(XML.element(doc, "generator", channel.generator));
    }
    if (channel.docs) {
      channelChildren.push(XML.element(doc, "docs", channel.docs));
    }
    if (channel.itunesAuthor) {
      channelChildren.push(XML.element(doc, "itunes:author", channel.itunesAuthor));
    }
    if (channel.itunesImage.href) {
      channelChildren.push(XML.element(doc, "itunes:image", null, [["href", channel.itunesImage.href]]));
    }
    if (channel.itunesKeywords) {
      channelChildren.push(XML.element(doc, "itunes:keywords", channel.itunesKeywords));
    }
    if (channel.itunesExplicit) {
      channelChildren.push(XML.element(doc, "itunes:explicit", String(channel.itunesExplicit)));
    }
    if (channel.itunesOwner?.itunesName && channel.itunesOwner.itunesEmail) {
      channelChildren.push(XML.element(doc, "itunes:owner", [XML.element(doc, "itunes:name", channel.itunesOwner.itunesName), XML.element(doc, "itunes:email", channel.itunesOwner.itunesEmail)]));
    }
    if (channel.itunesType) {
      channelChildren.push(XML.element(doc, "itunes:type", channel.itunesType));
    }
    if (channel.itunesCategory) {
      const f = (category) => {
        const categoryElement = XML.element(doc, "itunes:category", null, [["text", category.text]]);
        if (category.subcategory) {
          const subcategoryElement = XML.element(doc, "itunes:category", null, [["text", category.subcategory]]);
          categoryElement.appendChild(subcategoryElement);
        }
        channelChildren.push(categoryElement);
      };
      if (Array.isArray(channel.itunesCategory)) {
        for (const itunesCategory of channel.itunesCategory) {
          f(itunesCategory);
        }
      } else {
        f(channel.itunesCategory);
      }
    }
    for (const item of channel.items) {
      const itemElement = doc.createElement("item");
      const itemChildren = [];
      if (item.title) {
        itemChildren.push(XML.element(doc, "title", item.title));
      }
      if (item.itunesTitle) {
        itemChildren.push(XML.element(doc, "itunes:title", item.itunesTitle));
      }
      if (item.itunesImage?.href) {
        itemChildren.push(XML.element(doc, "itunes:image", null, [["href", item.itunesImage.href]]));
      }
      if (item.pubDate) {
        itemChildren.push(XML.element(doc, "pubDate", item.pubDate));
      }
      if (item.link) {
        itemChildren.push(XML.element(doc, "guid", item.link, [["isPermalink", "true"]]));
      }
      if (item.link) {
        itemChildren.push(XML.element(doc, "link", item.link));
      }
      if (item.description) {
        itemChildren.push(XML.element(doc, "description", doc.createCDATASection(item.description)));
      }
      if (item.enclosure?.length && item.enclosure.type && item.enclosure.url) {
        itemChildren.push(
          XML.element(doc, "enclosure", null, [
            ["length", String(item.enclosure.length)],
            ["type", item.enclosure.type],
            ["url", item.enclosure.url]
          ])
        );
      }
      if (item.itunesDuration) {
        itemChildren.push(XML.element(doc, "itunes:duration", String(item.itunesDuration)));
      }
      if (item.itunesExplicit) {
        itemChildren.push(XML.element(doc, "itunes:explicit", String(item.itunesExplicit)));
      }
      if (item.itunesSeason) {
        itemChildren.push(XML.element(doc, "itunes:season", String(item.itunesSeason)));
      }
      if (item.itunesEpisode) {
        itemChildren.push(XML.element(doc, "itunes:episode", String(item.itunesEpisode)));
      }
      XML.appendChildren(itemElement, itemChildren);
      channelChildren.push(itemElement);
    }
    XML.appendChildren(channelElement, channelChildren);
    const output = `${XMLHEADER}${dom.serialize()}`;
    dom.window.close();
    return output;
  }
  static async writeRSS(channel, rssFile) {
    const rss = await _RSS.channelToRSS(channel);
    await import_promises3.default.writeFile(rssFile, rss);
    return rss;
  }
};

// src/lib/Generator.ts
var CONFIGPATH = import_path3.default.join(__dirname, "config.json");
var CONTENTDIR = import_path3.default.join(__dirname, "content");
var PUBLICDIR = import_path3.default.join(__dirname, "public");
var RSSFILE = import_path3.default.join(PUBLICDIR, "rss.xml");
var EPDIR = import_path3.default.join(PUBLICDIR, "ep");
var MEDIADIR = import_path3.default.join(PUBLICDIR, "media");
var defaultConfig = {
  channel: {
    title: "",
    pubDate: formatDateISO8601(/* @__PURE__ */ new Date()),
    domain: "",
    author: "",
    description: "",
    imageFile: "",
    email: "",
    items: []
  }
};
var Generator = class _Generator {
  /**
   * Imports `config.json`, builds an `RSSChannel`, and compiles a static site for the content in `./public`.
   */
  static async start() {
    const config = await importJSON(CONFIGPATH);
    const channel = await _Generator.generateChannel(config);
    if (channel) {
      await RSS.writeRSS(channel, RSSFILE);
      await _Generator.buildSite(channel);
    }
  }
  static async init() {
    try {
      await import_promises4.default.access(CONTENTDIR);
    } catch {
      await import_promises4.default.mkdir(CONTENTDIR);
    }
    try {
      await import_promises4.default.access(PUBLICDIR);
    } catch {
      await import_promises4.default.mkdir(PUBLICDIR);
    }
    try {
      await import_promises4.default.access(EPDIR);
    } catch {
      await import_promises4.default.mkdir(EPDIR);
    }
    try {
      await import_promises4.default.access(MEDIADIR);
    } catch {
      await import_promises4.default.mkdir(MEDIADIR);
    }
    try {
      await import_promises4.default.access(CONFIGPATH);
    } catch {
      const output = defaultConfig;
      output.$schema = "config.schema.json";
      await import_promises4.default.writeFile(CONFIGPATH, JSON.stringify(defaultConfig));
    }
  }
  /**
   * Transforms `Config` into `RSSChannel`
   */
  static async generateChannel(config) {
    const channel = await ChannelGenerator.compile(config);
    await import_promises4.default.writeFile(import_path3.default.join(__dirname, "channel.json"), JSON.stringify(channel));
    return channel;
  }
  static async buildSite(channel) {
    const indexHTML = SiteBuilder.generateIndex(channel);
    const indexFile = import_path3.default.join(PUBLICDIR, "index.html");
    const pageTemplate = SiteBuilder.generateItemPageTemplate();
    const pages = channel.items.map((item) => {
      const pageHTML = SiteBuilder.generateItemPage(pageTemplate, channel, item);
      const itemID = formatEpCode(item.itunesSeason, item.itunesEpisode);
      const outputPath = import_path3.default.join(EPDIR, `${itemID}.html`);
      return { pageHTML, outputPath };
    });
    await import_promises4.default.writeFile(indexFile, indexHTML);
    for (const page of pages) {
      const { pageHTML, outputPath } = page;
      await import_promises4.default.writeFile(outputPath, pageHTML);
    }
    import_promises4.default.cp(import_path3.default.join(CONTENTDIR, "styles.css"), import_path3.default.join(PUBLICDIR, "styles.css"));
    import_promises4.default.cp(import_path3.default.join(CONTENTDIR, "docs.html"), import_path3.default.join(PUBLICDIR, "docs.html"));
  }
};

// src/main.ts
main();
async function main() {
  await Generator.init();
  await Generator.start();
}
/*! Bundled license information:

mustache/mustache.mjs:
  (*!
   * mustache.js - Logic-less {{mustache}} templates with JavaScript
   * http://github.com/janl/mustache.js
   *)
*/

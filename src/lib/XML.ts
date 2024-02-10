export default class XML {
  static readElementText(parent: Element, tagName: string): string {
    return parent.getElementsByTagName(tagName)[0].textContent;
  }

  static appendChildren(parent: Element, children: Element | Element[]) {
    if (Object.hasOwn(children, "appendChild")) {
      children = children as Element;
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

  static element(doc: Document, tagName: string, children?: (Node | string)[] | (Node | string), attributes?: [string, string][]) {
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

  static head(doc: Document, title: string, faviconURL: string = "/favicon.ico", stylesheetURL: string = "/styles.css") {
    doc.title = title;

    // TODO: Stylesheets are included here
    const linkStylesheet = doc.createElement("link");
    doc.head.appendChild(linkStylesheet);
    linkStylesheet.href = stylesheetURL;
    linkStylesheet.rel = "stylesheet";
    const linkFavicon = doc.createElement("link");
    doc.head.appendChild(linkFavicon);
    linkFavicon.href = faviconURL;
    linkFavicon.rel = "icon";
  }

  static nav(parent: Element, channelLink: string, imageURL: string, title: string, atomLink: string) {
    const doc = parent.ownerDocument;
    // Nav
    const nav = doc.createElement("nav");
    parent.appendChild(nav);
    // Home Link <a>
    const homeLink = doc.createElement("a");
    nav.appendChild(homeLink);
    homeLink.href = channelLink;
    // Home Icon <img>
    const homeIcon = doc.createElement("img");
    homeLink.appendChild(homeIcon);
    homeIcon.src = imageURL;
    homeIcon.height = 20;
    // Home Title <span>
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

  static downloadLink(parent: Element, enclosure: { url: string; length: number; type: string }) {
    const doc = parent.ownerDocument;
    const span = doc.createElement("span");
    span.className = "downloadLink";
    parent.appendChild(span);
    const link = doc.createElement("a");
    link.href = enclosure.url;
    link.textContent = "Download";
    link.title = `Download ${enclosure.url.substring(enclosure.url.lastIndexOf("/") + 1)}`;
    span.appendChild(link);
    span.appendChild(doc.createTextNode(` (${(enclosure.length / 1000000).toFixed(1)} MB, ${enclosure.type})`));
  }
}

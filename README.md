# megbrennan.com

Meg Brennan's website, a static site hosted on GitHub Pages.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `<page>/index.html` | The live pages, one folder per URL (`/music` is `music/index.html`) |
| `assets/images/` | Photos and artwork used on the pages |
| `assets/css/` | The site template's stylesheet (`template.css`) and per-block styles (`components/`) |
| `assets/site/site.js` | Site script (header layout, image crops, parallax, gallery grid, videos, mobile menu, search) |
| `assets/fonts/fonts.css` | Font definitions |
| `assets/favicon/`, `favicon.ico` | Site icon: `favicon.svg` is the source, the `.ico` and Apple touch icon are rendered from it |
| `s/` | PDF downloads (summer camp files) |
| `_original/` | Untouched snapshot of every page and the template stylesheets, kept as the build source |
| `tools/build.py` | Regenerates the pages from `_original/` |

Unlinked draft pages (`/home`, `/welcome`, `/about-intro`, `/summer-camps`) are kept. Template
placeholder pages (FAQ, Terms, Privacy, `/contact-1` and the demo blog) are skipped by the build
(`SKIP_PAGES` in `tools/build.py`).

## Preview locally

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000. Links and assets use root paths (`/music`, `/assets/...`), so the
site has to be served from the root of a domain. It will not render correctly from a
`username.github.io/megbrennan.com/` project URL.

## Editing

Edit the HTML files directly. For a one-off change, edit the page's `index.html` and commit.

`tools/build.py` regenerates every page from `_original/` and overwrites the built pages, so
re-run it only if you want to redo the conversion. Content changes made through the build (such
as removing the contact form) live in `CONTENT_EDITS` in that file.

### Changing fonts

`assets/fonts/fonts.css` declares Jost and Montserrat under the family names the site CSS uses
(`futura-pt` and `proxima-nova`), so the CSS needs no changes. To try another font, download its
`.woff2` files into `assets/fonts/` and point the matching `@font-face` rules at them.

## Notes

- **Contact**: there is no contact form. The contact page links to email and Instagram.
- **Search**: sends queries to a DuckDuckGo search limited to megbrennan.com.
- The SoundCloud playlist embedded on the unlinked `/home` draft page no longer exists.

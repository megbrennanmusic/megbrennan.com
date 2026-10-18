# megbrennan.com

Static copy of Meg Brennan's Squarespace site, hosted on GitHub Pages.

## Layout

| Path | What it is |
|---|---|
| `index.html`, `<page>/index.html` | The live pages, one folder per URL (`/music` is `music/index.html`) |
| `assets/` | Images, CSS and icons mirrored from Squarespace's CDN, plus `fonts/` and `site/` |
| `assets/site/site.js` | Small script that replaces the Squarespace runtime (header layout, image crops, parallax, gallery grid, videos, mobile menu, search) |
| `assets/fonts/fonts.css` | Free stand-ins for the original Adobe fonts |
| `s/` | PDF downloads (summer camp files) |
| `_original/` | Untouched HTML snapshot of every page as Squarespace served it, kept as a backup |
| `tools/build.py` | Regenerates the pages from `_original/` |

Every page from the Squarespace site is kept, including unlinked template pages (`/contact-1`,
the demo blog) and drafts (`/home`, `/welcome`, `/about-intro`, `/summer-camps`). The only
exceptions are the lorem ipsum FAQ, Terms and Privacy pages, which the build skips
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

`assets/fonts/fonts.css` declares the free fonts under the original family names
(`futura-pt` uses Jost, `proxima-nova` uses Montserrat), so the site CSS needs no changes. To
try another font, download its `.woff2` files into `assets/fonts/` and point the matching
`@font-face` rules at them.

## Going live

1. Merge this work into `main`. In the repo's **Settings > Pages**, set the source to "Deploy from a branch", choose `main`
   and `/ (root)`. The `CNAME` file sets the custom domain to `www.megbrennan.com`.
2. At the domain's DNS provider, replace the Squarespace records with:

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `samueljun.github.io` |

3. Once DNS has updated (minutes to a few hours), tick **Enforce HTTPS** in Settings > Pages.
4. Only then cancel the Squarespace website plan. If the domain itself was registered through
   Squarespace, it is billed separately and can stay there for DNS, or be transferred to another
   registrar.

## Known differences from the Squarespace site

- **Fonts**: Jost and Montserrat replace Futura PT and Proxima Nova, which were licensed through
  Squarespace.
- **Contact form**: removed. The page links to email and Instagram instead.
- **Search**: sends queries to a DuckDuckGo search limited to megbrennan.com.
- **Analytics**: Squarespace's visitor stats are gone.
- The SoundCloud playlist embedded on the unlinked `/home` draft page no longer exists on
  SoundCloud (it fails on the Squarespace site too).
- The footer's template links (FAQ, Terms Of Service, Privacy Policy, Volunteer, Donate, Contact
  Us) are removed, along with the FAQ, Terms and Privacy pages.

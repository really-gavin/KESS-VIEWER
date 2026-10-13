# Kestrel Web Viewer

A read-only window onto the Kestrel web that works in any browser. It runs entirely in the page
(no server): it reads pages straight from the `really-gavin/KESTREL-WEB` repository, the same way the
Kestrel OS browser does.

- `kes://name/page` opens `sites/name/page.html`; `kess://` opens `secure/`.
- Type a word (or several) to see a list of the pages that contain it. Type `kes://name/` to open a site directly.
- Pages are filtered before they are shown: scripts, styles, images and unknown tags are removed,
  and only `kes://` / `kess://` links work.
- Share a page with a link such as `https://<you>.github.io/<repo>/#kes://gavin/`.

## Publish it

1. Create a new public repository (for example `kestrel-viewer`) and upload these files.
2. Settings -> Pages -> Source: **Deploy from a branch**, Branch: **main**, folder **/ (root)** -> Save.
3. After a minute it is live at `https://<your-name>.github.io/<repo>/`.

To point it at a different Kestrel web repository, edit the `CONFIG` line at the top of `viewer.js`.

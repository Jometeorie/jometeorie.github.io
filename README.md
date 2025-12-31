# Personal Academic Homepage (Static)

This repository contains a lightweight static academic homepage (pure HTML/CSS/JS).

## Structure

- `index.html`: page content (About / News / Publications / Education / Talks)
- `assets/style.css`: styles (clean, white background)
- `assets/icons.js`: inline SVG icons (no external dependency)
- `assets/main.js`: loads and renders publications
- `data/publications.json`: publications data (one paper = one card)

## How to preview locally

Open `index.html` directly in your browser, or run a simple local server:

```bash
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## Deploy with GitHub Pages

1. Push this repo to GitHub.
2. In GitHub: **Settings → Pages**
3. **Build and deployment**: choose **Deploy from a branch**
4. Select branch `main` and folder `/ (root)`

## Edit publications

Edit `data/publications.json`. Example item:

```json
{
  "title": "Your paper title",
  "authors": "You, Coauthors",
  "venue": "ACL",
  "year": 2025,
  "kind": "Main",
  "links": { "paper": "", "pdf": "", "code": "", "project": "" }
}
```



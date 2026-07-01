# Cookie Run Classic Treasure Search

Searchable treasure database for Cookie Run Classic (LINE version), scraped from
[cookierun.fandom.com](https://cookierun.fandom.com/wiki/List_of_Treasures/LINE). Search by ability
text (e.g. "obstacle", "energy"), filter by grade, filter to evolved treasures, EN/TH UI toggle,
and an evolution recipe view (base item + ingredients, linking out to the wiki).

Live: https://cookierunclassic-treasure.vercel.app

## Stack

Vite + React, no backend. All data lives in `public/treasures.json` and `public/images/`.

## Data pipeline

`data-pipeline/` holds the scraper that produced `public/treasures.json`:

- `raw/*.txt` — raw wikitext dumped from the fandom wiki's treasure list pages
- `parse.js` — parses the wikitext tables into `treasures.json`
- `resolve-images.js` — resolves treasure image filenames to CDN URLs via the fandom API
- `download-images.js` — downloads all images locally (the CDN blocks hotlinking by referer)
- `fetch-evolve-details.js` — pulls each evolved treasure's own wiki page for its base item,
  ingredients, and corrected Blessed Effect numbers (the summary list page has `???` gaps)

Re-running the pipeline: `node data-pipeline/parse.js`, then `resolve-images.js`,
`download-images.js`, `fetch-evolve-details.js` in order, then copy `data-pipeline/treasures.json`
and `data-pipeline/images/` into `public/`.

This structure is meant to make it easy to later move the data into a real backend (e.g. Supabase)
without redoing the scrape.

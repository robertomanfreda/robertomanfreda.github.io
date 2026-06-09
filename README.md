# robertomanfreda.github.io

Personal GitHub Pages site for Roberto Manfreda.

The site is a static React app built with Vite, TypeScript, and plain CSS. GitHub Pages serves the generated `dist/` artifact.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

Public routes are `/`, `/respawn/`, and `/llm-model-checker/`. Legacy `respawn.html` and `llm-model-checker.html` redirect to the clean routes.

The LLM Model Checker reads static JSON from `public/data/`. `scripts/update-llm-data.py` refreshes the model catalog from public Hugging Face metadata and the curated Ollama/GGUF mapping.

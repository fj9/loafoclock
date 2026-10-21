# <img src="public/favicon.svg" alt="" width="44" align="absmiddle"> Loaf O'Clock

*It's always Loaf O'Clock somewhere.*

[![Deploy to GitHub Pages](https://github.com/fj9/loafoclock/actions/workflows/deploy.yml/badge.svg)](https://github.com/fj9/loafoclock/actions/workflows/deploy.yml)

A free sourdough planner that shows how feed, temperature and the fridge move your bake, so you can fit it around your day.

**Status: version 2 is being built.** The new app puts one multi-day timeline front and centre, from your first feed to a loaf that is ready to carve, with levers you can pull to make it fit your life. There are two ways to plan: start a loaf now and tweak the levers, or pick when you want bread and work backwards. The build plan is in [docs/build-plan.md](docs/build-plan.md).

**Made by** [fj9](https://github.com/fj9) · [LinkedIn](https://www.linkedin.com/in/frankiej9/) · [Ko-fi](https://ko-fi.com/fjnine) (optional, and everything stays free either way)

## Where things are

```text
src/domain/    the logic: feeding chart and ratio fit, recipe amounts, rest lengths, clock display,
               saved settings and bake. Pure TypeScript with tests (the plan model arrives in milestone 1)
src/app/       the Preact app (a placeholder shell for now)
src/styles/    design tokens (the Flour and Ember themes) and base styles
docs/          the build plan
public/        favicon and app icons
```

## Development

Vite, Preact, TypeScript, Vitest and `vite-plugin-pwa`. Node 22 or later is recommended.

```bash
npm install
npm run dev         # dev server with hot reload
npm run typecheck   # TypeScript, strict
npm test            # unit and component tests (Vitest)
npm run build       # production build into dist/
npm run preview     # serve the production build, including the service worker
npm run icons       # re-render the PNG icons from public/favicon.svg
```

Browser storage keys start with `loafoclock`, because storage is shared across `fj9.github.io` and this app must never read the first app's data.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`: install, typecheck, test, build, then publish `dist/` to GitHub Pages. For a new repository, set **Settings, then Pages, then Source** to **GitHub Actions** once. The build uses relative paths (`base: './'`), so it works under `https://<user>.github.io/<repo>/`.

## Credits and licence

- The recipe began with a sourdough guide tea towel by [Stuart Gardiner](https://www.stuartgardiner.com). This project is not affiliated with or endorsed by him.
- Heading font: [Alfa Slab One](https://fontsource.org/fonts/alfa-slab-one) (SIL Open Font Licence), bundled with `@fontsource`.
- Built with [Vite](https://vitejs.dev), [Preact](https://preactjs.com), [Vitest](https://vitest.dev) and [vite-plugin-pwa](https://vite-pwa-org.netlify.app).

The code is released under the [MIT licence](LICENSE).

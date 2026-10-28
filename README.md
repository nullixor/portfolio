# James Yang Portfolio

A personal portfolio built with HTML, CSS, JavaScript, and Three.js. The site has Home, About, and Projects sections, an interactive 3D scene, and a downloadable résumé. Its lightweight animated background is the default; visitors can enable the full scene from the settings gear.

## Deploy on Vercel

Import this repository from GitHub into Vercel. Keep the repository root as the project root, select **Other** for the framework, and deploy. `vercel.json` sets the build command to `npm run build` and the output directory to `dist`. No environment variables are required.

The complete website, including fonts, models, JavaScript, and the résumé PDF, is in `dist/`. The build command checks the JavaScript syntax; it does not generate `dist/`, so commit changes to that folder when updating the site.

## Run locally

Use Node.js 22 or newer:

```sh
npm ci
npm run build
python3 -m http.server 4176 --directory dist
```

Then open `http://localhost:4176`. A local server is needed for the 3D model files to load correctly.

## Make changes

- `dist/index.html` and `dist/main.js` contain the page content and interactions.
- `dist/style.css` contains the layout and styling.
- `dist/world.js` and the other JavaScript modules in `dist/` contain the 3D scenes and animation.
- `dist/assets/James-Yang-Resume.pdf` is linked from Home and About.

## Assets and rights

Three.js and its MIT license are included in `dist/vendor/`. The Darkbyte font and its supplied license are included in `dist/assets/`. [Exclusion by Detto Doodles](https://www.dafont.com/exclusion.font) is listed by its creator as **100% Free**; [Font Meme defines “Free”](https://fontmeme.com/read/) as allowing personal and commercial use. The résumé embeds Times New Roman font subsets; standalone Times New Roman files are not included. No license is granted for the portfolio's original content or artwork.

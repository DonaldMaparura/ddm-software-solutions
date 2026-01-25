# DDM Software Solutions — Static Site

This repository contains a lightweight, modern single-page marketing site suitable for hosting on GitHub Pages.

Files changed/added:
- `index.html` — single-page app layout showcasing services
- `css/style.css` — modern 2026-themed styling
- `js/app.js` — small interactivity and canvas visual

To publish on GitHub Pages:

1. Create a repository (or use this one) and push the files.
2. In repository Settings → Pages, set the source to the `main` (or `master`) branch and `/ (root)`.
3. The site will be available at `https://<your-gh-username>.github.io/<repo-name>/`.

Local preview:

Run a simple HTTP server in the project root (example using Python 3):

```bash
python -m http.server 8000
# then open http://localhost:8000
```

If you want me to commit these changes to git, create a branch, or add a CNAME for a custom domain, tell me and I will do that next.

Form submissions (hosting-only-on-GitHub options)

- Quick (recommended): Use a form backend service such as Formspree, Getform, or Basin.
	- Sign up at the provider, create a new form, and copy the provided POST endpoint (e.g. `https://formspree.io/f/xyz`).
	- Open `index.html` and update the meta `form-endpoint` to that URL:

		```html
		<meta name="form-endpoint" content="https://formspree.io/f/your-form-id">
		```

	- The site already includes a contact form and client-side submit handler in `js/app.js` that POSTs JSON to that endpoint and shows success/failure messages.

- Simple embed: Use a Google Form and embed it (iframe) into the `#contact` section. Responses go to Google Sheets automatically.

- Advanced (avoid exposing tokens): If you need submissions written into your GitHub repo or to create issues automatically, use a trusted third-party form service webhook to call a backend you control, or configure a small serverless function (Cloudflare Workers, Vercel, Netlify) to accept form submissions and commit via the GitHub API. These approaches require separate hosting for the function.

Testing the new contact form locally:

1. Update the `form-endpoint` meta in `index.html` with your provider endpoint.
2. Start a local server from the project root:

```bash
python -m http.server 8000
# or
npx http-server -p 8000
```
3. Open `http://localhost:8000`, fill the form, and verify deliveries per your provider dashboard.


# Onboarding user research

A clickable, static-HTML prototype of the **Assembly Studio** onboarding / AI Builder end-to-end flow — marketing site → sign-up/auth → personalize → build page → portal app pages → client portal. Used for user-research / testing sessions.

This is a **standalone prototype**. It is **not** part of the `assemblycom/core` codebase and ships no production code.

## Run it locally

No build step — it's plain HTML/CSS/JS. Serve the folder with any static server:

```bash
python3 -m http.server 5186
# then open http://localhost:5186/index.html
```

## Pages

| File | What it is |
|---|---|
| `index.html` | Marketing landing page + sign-up / personalize flow (entry point) |
| `studio.html` | In-portal "Add App" build page (where the flow lands) |
| `crm.html` · `team.html` · `notifications.html` · `messages.html` · `brand.html` | Portal app pages |
| `portal.html` | Client-facing portal preview (themed) |
| `builder.html` | Existing plan-mode build screen |
| `assets/` | Icons + logo SVGs |

State (company name, user name/email, selected theme) is carried between pages via the URL hash, so the flow stays consistent.

## Editing together — avoiding conflicts

- **Work on a branch, open a PR.** Never commit straight to `main`. This is what prevents two people's edits from clobbering each other.
  ```bash
  git checkout -b yourname/what-youre-changing
  # …edit…
  git commit -am "describe the change"
  git push -u origin yourname/what-youre-changing
  # then open a Pull Request on GitHub
  ```
- **Divide by page.** Each `.html` page is self-contained (its own copy of the sidebar/styles), so two people editing *different* pages won't conflict. Try to avoid two people editing the **same** file at once.
- Keep PRs small and merge often.

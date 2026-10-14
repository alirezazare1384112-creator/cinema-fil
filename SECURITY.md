# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Latest `master` | ✅ |
| Older releases | ❌ |

Cinephile Vault is a **personal, local-first app** — there are no production deployments to update. Security fixes go to `master` and users update by `git pull && npm install && npx prisma db push && npm run build`.

## Reporting a Vulnerability

If you discover a security issue, **please do not open a public issue**. Instead:

1. Email the maintainer directly (see profile), **or**
2. Use GitHub's private vulnerability reporting: [github.com/alirezazare1384112-creator/cinema-fil/security/advisories/new](https://github.com/alirezazare1384112-creator/cinema-fil/security/advisories/new)

Please include:

- A clear description of the issue
- Steps to reproduce (if applicable)
- Affected versions / commit SHAs
- Suggested fix (optional)

### Response timeline

| Stage | Target |
|---|---|
| Acknowledgement of report | within 48 hours |
| Initial assessment | within 1 week |
| Fix or mitigation | within 30 days (severity-dependent) |
| Public disclosure | after fix is released, coordinated with reporter |

## Security-relevant surface

Cinephile Vault runs locally, so the attack surface is small but not zero:

| Surface | Risk | Mitigation in place |
|---|---|---|
| `/api/f2m` & `/api/f2m-image` | Scraping external sites — malformed HTML could cause issues | Regex parsing with try/catch; all fetched HTML passes through `decodeEntities` |
| `/api/ratings` | External OMDb API call | Cached for 30 days; never exposes the API key to client (only via `localStorage` in dev mode) |
| `/api/uploads/[...path]` | Path traversal risk | Path is restricted to `uploads/` directory via `path.resolve` + suffix check |
| `/api/play-external` | Spawning external process (system player) | Path is taken from local DB only — never from query params; user must have explicitly added the file |
| `localStorage` API keys | Same-origin scripts could read them | Keys never leave the browser; user can clear them from Settings page |

If you find a new vector, especially around **file path handling** or **external content parsing**, please report it privately.

## Out of scope

The following are **not** considered security issues:

- The app not running on macOS/Linux (it's clearly documented as Windows-focused)
- Self-XSS via the user's own localStorage (the user already has full machine access)
- Issues requiring the user to first compromise their own machine

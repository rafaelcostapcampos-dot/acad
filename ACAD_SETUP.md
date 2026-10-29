# ACAD — Cloudflare migration

Goal: two separate workout profiles, Brazilian Portuguese, sync across devices.

Plan:
1. Test React/Vite static deployment on Cloudflare Workers.
2. Audit original Node API and JSON persistence for compatibility.
3. Implement Workers API and D1 persistence with concurrency control.
4. Add profile selection and access restriction without traditional login.
5. Test backup, recovery, mobile and desktop sync.

Do not put secrets in the repository. Preserve AGPL notices and exercise media conditions.

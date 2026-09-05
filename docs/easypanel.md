# Deploy Glyph on Easypanel

Glyph needs one Next.js app container. Clerk and hosted Convex provide authentication, note data, and file storage.

1. Configure a production Clerk application and enable its Convex integration.
2. Select the production Convex deployment and set `CLERK_JWT_ISSUER_DOMAIN` in its environment settings to the production Clerk Frontend API URL.
3. Run `pnpm exec convex deploy` from the project to deploy the schema, authentication configuration, HTTP upload endpoint, and functions.
4. Create an Easypanel app from this repository using the included Dockerfile.
5. Supply these **build arguments**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`, and `NEXT_PUBLIC_CONVEX_SITE_URL`. Use the matching production deployment's client URL and HTTP Actions URL.
6. Supply those same values as runtime environment variables, plus `CLERK_SECRET_KEY`.
7. Route the app domain to port 3000 and enable HTTPS. Configure that domain in Clerk.
8. Deploy, sign in, upload a Markdown file, preview it, publish, and open the link in a signed-out browser. Unpublish and reload that browser to verify revocation.

The Docker image contains only the Next.js application. Convex deploys separately through its CLI, with no database migration command or companion containers. Keep Convex functions deployed before rolling out an app build that uses them. Rebuild the image whenever public keys or URLs change.

For local Docker execution: `docker compose --env-file .env.local up --build -d`.

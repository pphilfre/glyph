# Glyph

Upload Markdown and mathematical notes, preview them privately, and publish a clean, shareable page.

## Architecture

- **Clerk** signs users in. The official `ConvexProviderWithClerk` integration and Clerk JWTs authenticate both browser and Next.js server requests.
- **Convex** stores note metadata and source files in Convex File Storage.
- **Next.js** renders Markdown with remark, rehype, and KaTeX inside the existing Fumadocs-inspired reader.

There is one application and one Convex backend. No SQL database, object-storage server, migration step, or rendering service is required.

## Local setup

1. Install Node.js 24 and pnpm, then run `pnpm install --frozen-lockfile`.
2. Copy `.env.example` to `.env.local`. Add your Clerk publishable and secret keys.
3. In the Clerk dashboard, enable the **Convex integration** for the matching development or production instance. It adds `aud: "convex"` to the normal session token; no named JWT template is needed. Glyph's server reads and HTTP uploads use `getToken()` without a template, and `ConvexProviderWithClerk` detects the session audience for reactive requests. Copy the Clerk Frontend API URL (issuer). See the [official Clerk + Convex guide](https://docs.convex.dev/auth/clerk).
4. Run `pnpm exec convex dev`, sign in to Convex, and create/select a development project. The CLI writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`. If the initial push reports a missing issuer, leave it running while completing the next step.
5. Set the issuer **on the Convex deployment**, using another terminal:
   `pnpm exec convex env set CLERK_JWT_ISSUER_DOMAIN https://your-app.clerk.accounts.dev`.
   An entry in Next.js's `.env.local` alone does not configure Convex.
6. Copy the deployment's HTTP Actions URL into `NEXT_PUBLIC_CONVEX_SITE_URL` (normally `https://your-deployment.convex.site`). This differs from the `.convex.cloud` client URL.
7. Keep `pnpm exec convex dev` running to sync the schema/functions and generate types. In another terminal run `pnpm dev`, then visit `http://localhost:3000`.

Commit `convex/_generated` alongside function changes; the checked-in bindings let a fresh clone typecheck and build before connecting a deployment. The public landing page and `/p/test` work without credentials. Private features fail closed until Clerk and Convex are configured.

## Workflow and access

Sign in → upload → private preview → publish → copy link.

- `/dashboard` lists only notes whose owner matches the verified Clerk subject.
- Uploads go directly to an authenticated Convex HTTP action. It checks UTF-8 text, extension, and the 2 MB limit before storing a file, then calls an **internal** metadata mutation. Both derive the user from `ctx.auth.getUserIdentity()`; clients cannot provide owner IDs or attach arbitrary storage IDs.
- `/notes/[id]` requires Clerk authentication and a matching owner in Convex.
- Only owners can publish, unpublish, or delete. Delete removes the metadata and stored file.
- `/p/[slug]` is intentionally public. Slugs use unique Convex note IDs. Both the public metadata query and source reader require `published === true`; private, missing, and deleted notes are unavailable.
- Next.js reads source content through Convex actions and renders it at request time. No permanent storage URL is issued. Unpublishing revokes subsequent public requests, including source reads; content already downloaded by a reader cannot be recalled.
- `/p/test` is a labelled static example rendered by the same pipeline.

The upload endpoint uses bearer authentication, with CORS allowing explicit Authorization headers and no cookie credentials. This [Convex HTTP upload flow](https://docs.convex.dev/file-storage/upload-files#uploading-files-via-an-http-action) binds each stored file to its authenticated uploader without a separate upload-ticket table.

## Note format

Upload one UTF-8 `.md`, `.markdown`, `.mtex`, `.mathtex`, or `.tex` file, up to 2 MB. MathTeX uses the same Markdown syntax; a file beginning with a bare LaTeX math command and containing no dollar delimiters is treated as one display equation.

LaTeX `.tex` imports are converted on the server and saved as `.md` notes before opening the private preview. The converter supports titles, section headings, paragraphs, bold/italic text, lists (including nested lists), quotes, inline code/verbatim blocks, links, footnotes as parenthetical text, and inline/display equations including equation, align and gather environments. Both the uploaded file and converted note must fit within 2 MB. Malformed groups/environments or excessive nesting return a helpful error without storing a note.

Review the preview after conversion. Unsupported commands and environments (including tables, TikZ, custom macro definitions and references) are preserved as source with a conversion notice. Packages are not loaded, macros are not expanded, external files are not fetched, and document layout and automatic equation numbering are not reproduced. Keep your original `.tex` file for editing or compiling to PDF.

~~~md
# Mechanics

The kinetic energy of an object is:

$$
E_k = \frac{1}{2}mv^2
$$

## Example

If velocity doubles:

$$
E_k' = \frac{1}{2}m(2v)^2 = 4E_k
$$

Therefore the kinetic energy increases by a **factor of four**.
~~~

Headings, paragraphs, emphasis, lists, links, tables, blockquotes, inline/fenced code, and inline/display maths are supported. The first level-one heading becomes the note title. The reader includes heading navigation, code copying, accessible MathML, and print styles.

Raw HTML is discarded and the Markdown HTML tree is sanitised before KaTeX adds its own trusted markup. KaTeX runs with `trust: false` and expansion/size limits. LaTeX import converts text without running a TeX engine or shell commands. Notes are self-contained; there is no separate asset upload workflow.

## Verification

~~~sh
pnpm types:check
pnpm lint
pnpm test
pnpm build
~~~

Tests execute the Convex functions and HTTP upload flow with `convex-test`, covering anonymous rejection, ownership, publication revocation, file deletion, and validation. Rendering tests cover formatting, KaTeX, and malicious markup. Route tests verify authenticated token forwarding and public access. These run without service credentials. A real Clerk/Convex deployment is needed to verify JWT issuance, upload CORS, and the full browser workflow.

## Deployment

On Vercel, use the Next.js preset and the build command `npx convex deploy --cmd 'npm run build'`. Leave the output directory at its default. Normal builds use Next.js's standard output so Vercel's adapter can package the deployment.

Set the production Clerk issuer on the production Convex deployment, then run `pnpm exec convex deploy`. Build/deploy Next.js with the matching production Clerk publishable key and both Convex URLs; provide `CLERK_SECRET_KEY` at runtime. Public values are embedded at build time, so rebuild after changing them.

Optional Docker hosting runs only Next.js:
`docker compose --env-file .env.local up --build -d`.
The Dockerfile sets `BUILD_STANDALONE=1` to produce its standalone server. Do not set this variable on Vercel: Next.js 16.3 adapter builds omit the server trace file required by standalone packaging.

See [deployment instructions](docs/easypanel.md). Existing files in retired external services are not imported by this code change; re-upload source notes in the supported Markdown format.

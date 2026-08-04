# AI Development Workflow

## Source of Truth

The following documents are authoritative:

- ARCHITECTURE.md
- 01-pm-prd.md
- FRONTEND.md
- BACKEND.md
- DATABASE.md
- SUPABASE.md
- AUTH.md
- UX.md
- WHATSAPP.md
- DEVOPS.md
- QA.md

Do not redesign the architecture.

Do not introduce new frameworks.

Do not change API contracts.

Do not modify the database schema without approval.

## Development Rules

- Implement one milestone at a time.
- Never implement multiple unrelated features.
- Run lint before completion.
- Run typecheck before completion.
- Run build before completion.
- Fix all warnings.
- Explain any architectural deviation.

## Git Rules

Commit after every completed milestone.

Never leave work uncommitted.

Never modify documentation unless requested.

## Definition of Done

A milestone is complete only if:

- Build succeeds
- Typecheck succeeds
- Lint succeeds
- Tests (if applicable) pass
- Code is documented
# Project Documentation

The root [README](../README.md) covers running the app and the current module map.

| Document | Purpose | Status |
| --- | --- | --- |
| [Project requirements](PROJECT_REQUIREMENTS.md) | Confirmed scope and dated decisions. | Requirements; historical baseline sections are labeled |
| [System design](SYSTEM_DESIGN.md) | Module responsibilities, dependency rules, state ownership, migration boundaries. | Current structure and explicit next steps |
| [Workspace architecture](WORKSPACE_ARCHITECTURE.md) | Routes, providers, editor coordination, state lifetimes. | Implemented workspace |
| [AI game design](AI_GAME_DESIGN.md) | Text generation and proposed targeted editing. | Implemented and proposed sections distinguished |
| [Graph media design](GRAPH_MEDIA_DESIGN.md) | Graph-integrated images, music, generation, and acceptance criteria. | Initial provider/catalog integration implemented; live image access unverified |
| [Cloud storage design](CLOUD_STORAGE_DESIGN.md) | Private assets, story/outline persistence, ownership, revisions, recovery, and prioritized next work. | Internal adapter implemented; live connection/read checks passed; write/upload, provider jobs and hosted access unverified |
| [AI setup and deployment](AI_SETUP.md) | Environment API key, model selection, deployment configuration. | Setup guide; live eligibility requires verification |
| [Verification record](VERIFICATION.md) | Dated checks and their limits. | Historical evidence, not a claim about every current environment |

Read requirements first, then system and workspace architecture. Use feature
designs for implementation detail and verification for evidence. Feature documents distinguish implemented media foundations from proposed
generation and catalog work.

## Historical material

- [Requirements snapshot — 2026-09-28](archive/PROJECT_REQUIREMENTS_2026-09-28.md)
- [Meeting Script for Ryan](archive/Meeting%20Script%20for%20Ryan.md)
- [Ryan Meeting Decision Checklist](archive/Ryan%20Meeting%20Decision%20Checklist.md)

The archive preserves earlier proposals and unfilled decisions. Current confirmed
requirements take precedence. Original prototype HTML files remain in the parent
workspace and are not part of this repository. Agent instructions remain at the
repository root so tools can discover them.

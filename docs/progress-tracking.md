# Progress Tracking

Last updated: 2026-02-08

## Purpose
Single source of truth for implementation progress across all active plans.

## Update Rules
- Update this file after each completed operation.
- Keep entries in reverse chronological order (newest first).
- Add one log entry per operation.
- Include: date, track, completed step/work, status, validation, and commit hash.
- If commit is not created yet, set commit value to `pending` and fill it in the next update.
- If work is partial, mark status as `in_progress` and list explicit next step.

## Active Tracks
| Track | Source Doc | Current Step | Status | Next Action |
|---|---|---|---|---|
| Inventory Management | `docs/new-page-execution-plan.md` | Post-cutover fixes | in_progress | Stabilization and parity checks as needed |
| Functions Unification | `docs/functions-unification-plan-2026-02-08.md` | Step 10 | completed | E2E smoke + API integration checks |
| UI/UX Improvement | `docs/ui-improvement-plan-2026-02-08.md` | Step 1 | planned | UI audit and token spec |
| OCR/AI Receipts | `docs/receipt-ocr-ai-plan-2026-02-08.md` | Step 1 | planned | Data model and migration scaffolding |
| Weekly Recommendations | `docs/weekly-dish-recommendations-plan-2026-02-08.md` | Step 1 | planned | Instrument baseline recommendation events |

## Work Log
| Date | Track | Completed Work | Status | Validation | Commit |
|---|---|---|---|---|---|
| 2026-02-08 | UI/UX Improvement | Dish details modal: constrain height and enable scrolling | completed | Not run (not requested) | 378804f |
| 2026-02-08 | UI/UX Improvement | Dishes list: uniform cards + show-more modal with full recipe preview | completed | Not run (not requested) | 29a2cd4 |
| 2026-02-08 | Functions Unification | Step 10: E2E smoke flow (ingredients → dishes → plans → shopping → purchases → inventory → analytics) | completed | `scripts/step10-smoke.sh` | eb9ffa6 |
| 2026-02-08 | Functions Unification | Step 10: fixed plan date filtering for range queries | completed | `scripts/step10-smoke.sh` | b4fa605 |
| 2026-02-08 | Functions Unification | Step 9: ran migration (inventory ingredientKey backfill + localized unit normalization) | completed | `POST /api/migrations/step-9` (dry run + apply) | fd1d7c4 |
| 2026-02-08 | Functions Unification | Step 9: migration runner (user_id + ingredientKey backfill, optional inventory backfill) | completed | Not run (not requested) | bb54846 |
| 2026-02-08 | Functions Unification | Step 8: unified events feed with priorities (expiry/restock/critical/expensive) | completed | Not run (not requested) | a92fd51 |
| 2026-02-08 | Functions Unification | Step 7: backend analytics aggregation + frontend analytics views | completed | Not run (not requested) | 5a7fbd5 |
| 2026-02-08 | Functions Unification | Step 6: shopping list grouped by category with purchase builder + auto-refresh | completed | Not run (not requested) | 05b6803 |
| 2026-02-08 | Process / Maintenance | Fixed build errors after reference data rollout (readonly units + inventory lambda) | completed | `/opt/MealPlaner/scripts/app-java-up.sh` | 25d6158 |
| 2026-02-08 | Functions Unification | Step 5: unified reference data (units/categories/locations) via API and updated UI selectors | completed | Not run (not requested) | f27720b |
| 2026-02-08 | Functions Unification | Step 4: added purchase location selection when applying to inventory | completed | Not run (not requested) | f27720b |
| 2026-02-08 | Functions Unification | Step 4: purchases can auto-apply to inventory on create | completed | Not run (not requested) | 4eedffa |
| 2026-02-08 | Functions Unification | Step 3: Shopping List v2 uses inventory stock to calculate deficit (UI columns + build fix) | completed | Not run (not requested) | e2b8176 |
| 2026-02-08 | Functions Unification | Step 2: added `user_id` scoping to dishes, plans, ingredients, calories, purchases (Java backend) | completed | Not run (not requested) | 864d982 |
| 2026-02-08 | Functions Unification | Step 1: added `ingredientKey` to dishes and inventory (frontend + Java backend) | completed | Not run (not requested) | e48b438 |
| 2026-02-08 | Process / Governance | Created progress tracking document and linked process rule in `AGENTS.md` | completed | Documentation review | bc64b59 |

## Entry Template
Use this template for new rows in `Work Log`:

`YYYY-MM-DD | <track> | <completed work> | completed/in_progress/blocked | <checks run or N/A> | <commit hash>`

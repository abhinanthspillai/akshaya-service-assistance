# AGENTS.md — Akshaya MCA Project

## 0. Agent bootstrap
Before implementation work, read `ANTIGRAVITY.md` after this file.

If the human explicitly activates `tasks/000_MILESTONE_50_60_AUTONOMOUS.md`, follow its Autonomous Milestone Mode rules. That controller is the only approved exception to the normal one-task/one-branch workflow, and it never authorizes merging or pushing directly to `main`.

## 1. Start here
Before coding read, in order:
1. ANTIGRAVITY.md
2. docs/PROJECT_SPEC.md
3. docs/DECISIONS.md
4. docs/ARCHITECTURE.md
5. docs/DATABASE.md
6. docs/API_SPEC.md
7. docs/SECURITY.md
8. docs/TEST_STRATEGY.md
9. docs/IMPLEMENTATION_PLAN.md
10. the assigned task file or explicitly activated milestone controller

## 2. Authority
Approved specs override agent preference. A task cannot silently contradict a higher-authority document.

## 3. Mandatory behavior
- inspect existing repository before editing
- reuse existing patterns when conformant
- make smallest coherent change
- write/update tests
- run relevant test/lint/type/build commands
- use Alembic for schema changes
- never commit secrets
- never weaken authorization to make tests pass
- never invent roles, request states or transitions
- never expose private uploads publicly
- never put business-critical authorization only in React
- keep endpoint contracts synchronized with API_SPEC

## 4. Ambiguity
If the spec supports one reasonable implementation detail without changing product/architecture, choose the simplest option and record it in PR notes or the milestone progress ledger.
If ambiguity could change workflow, roles, security, schema meaning or API semantics, stop: Level 3 human decision.

## 5. Git
Normal mode: one task/issue -> one branch -> focused commits -> tests -> PR -> CI -> review -> merge.

Autonomous Milestone Mode: only when explicitly activated by the human through `tasks/000_MILESTONE_50_60_AUTONOMOUS.md`, use its dedicated milestone branch and task-by-task commit/validation rules.

Do not force-push shared protected branches. Never push directly to `main`. Never locally merge/squash implementation into `main`.

## 6. Definition of done
A task is done only when:
- acceptance criteria pass
- tests exist and pass in the appropriate environment
- lint/type/build checks pass where applicable
- migrations upgrade cleanly when schema changed, or a genuine environment limitation is explicitly documented
- security requirements are satisfied
- documentation/contracts are updated if needed
- no unrelated changes are included

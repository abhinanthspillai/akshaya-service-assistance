# AGENTS.md — Akshaya MCA Project

## 1. Start here
Before coding read, in order:
1. docs/PROJECT_SPEC.md
2. docs/DECISIONS.md
3. docs/ARCHITECTURE.md
4. docs/DATABASE.md
5. docs/API_SPEC.md
6. docs/SECURITY.md
7. docs/TEST_STRATEGY.md
8. docs/IMPLEMENTATION_PLAN.md
9. the assigned task file

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
If the spec supports one reasonable implementation detail without changing product/architecture, choose the simplest option and record it in PR notes.
If ambiguity could change workflow, roles, security, schema meaning or API semantics, stop: Level 3 human decision.

## 5. Git
One task/issue -> one branch -> focused commits -> tests -> PR -> CI -> review -> merge.
Do not force-push shared protected branches.

## 6. Definition of done
A task is done only when:
- acceptance criteria pass
- tests exist and pass
- lint/type/build checks pass where applicable
- migrations upgrade cleanly when schema changed
- security requirements are satisfied
- documentation/contracts are updated if needed
- no unrelated changes are included

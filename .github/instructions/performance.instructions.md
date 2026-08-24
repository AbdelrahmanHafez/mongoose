---
applyTo: "lib/**/*.js"
---

When reviewing runtime code, apply the rules in [PERFORMANCE.md](../../PERFORMANCE.md).

Report repeated allocations or work on hot paths. Check clones, `delete`, `split()`, `Object.keys()`, errors, promises, and generic path helpers.

Report repeated derivation of stable schema or projection data. Confirm that any proposed cache has a correct lifetime and invalidation rule.

Report unconditional `Map` or `Set` construction on repeated paths. Ask for a crossover benchmark that includes setup and key conversion.

Require performance claims to include a realistic benchmark and a behavior check. The benchmark must compare the current and proposed code.

Preserve public object identity and mutation behavior. Do not replace string `includes()` or `endsWith()` without target-runtime evidence.

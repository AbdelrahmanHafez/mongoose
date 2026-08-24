# Performance guidelines

Use these rules when you change code on a measured hot path. Preserve behavior before you optimize the path.

These rules are not general JavaScript style rules. A benchmark must cover the real operation and common input shapes.

Run `node benchmarks/performanceGuidelines.js` to reproduce the primitive benchmarks. Run the relevant operation benchmark before changing runtime code.

## Benchmark requirements

1. Measure the current code and proposed code in the same process.
2. Warm both versions and alternate their order between samples.
3. Include common input sizes, setup costs, and uncommon slow cases.
4. Assert that both versions produce the same result.
5. Use a full operation benchmark to confirm meaningful changes.

## Skip work that cannot affect the result

Put cheap checks before parsing, cloning, generic helpers, hooks, getters, validation, or loops.

Return early when no work exists. Create errors only on error paths. Keep empty hook paths synchronous when the caller permits it.

Do not create update objects or driver options that the operation will ignore. See #16043, #16331, #16370, #16407, and #16411.

## Avoid allocations on hot paths

Use object rest to omit properties from a new object. Avoid cloning an object and then calling `delete`.

When existing object identity must stay stable, mutate the object. Check `Object.hasOwn()` before `delete` when the property is usually absent.

Use `arguments` directly when an array is unnecessary. Avoid `Array.from(arguments)` on repeated call paths.

Keep fixed name checks allocation-free. Compare accepted names directly instead of calling `toLowerCase()`.

Skip clones and backups when later code cannot mutate the value. Document the immutability reason beside the fast path.

See #16174, #16331, #16347, #16370, and #16470.

## Use cheap access and iteration

Check `indexOf()` before `split()` when most values do not contain the delimiter.

Use direct property access for known top-level paths. Call `mpath` or another nested path helper only for nested paths.

Use one loop when `filter()`, `map()`, or similar methods would create intermediate arrays.

Use `utils.hasOwnKeys()` when you only need to know whether an object has an own key. Avoid allocating `Object.keys()`.

Use `null` for absent optional metadata when callers otherwise inspect an empty object on every operation.

Use `includes()` for array membership. Avoid constructing a `Set` for one small membership check.

See #16092, #16094, #16126, #16177, #16370, and #16408.

## Cache stable derived data

Cache schema and projection metadata when repeated calls read the same source object.

Build stable schema caches during model compilation when possible. Use a lazy cache when many callers never need the value.

Define the cache lifetime from the source data lifetime. Add invalidation before caching mutable source data.

See #16385, #16399, #16404, #16405, #16408, and #16439.

## Choose data structures for the workload

Prefer a plain object for small tables with trusted string keys or dense numeric keys. Use `Map` when key semantics require it.

Include construction cost when comparing a `Set` with linear search. Include key conversion cost in the same benchmark.

Keep linear search for small primitive-key workloads. Build a `Set` when repeated lookups recover its construction cost.

Do not use one item threshold for all paths. The ObjectId benchmark crossed earlier because `Set` avoided repeated string conversion.

See #16370, #16385, and #16474.

## Use measured string checks

Use `slice()` equality for fixed prefix checks only after a benchmark confirms it for the target runtime.

Do not replace string `includes()` with `indexOf()` only for speed. They had equal cost in the current benchmark.

Array `includes()` was faster than `indexOf()` for membership. Use `indexOf()` when you need the position.

Do not replace `endsWith()` with direct trailing character access without a benchmark. Direct access was slower on Node.js 24.15.0.

## Current microbenchmark results

These results use Node.js 24.15.0. Each value is the median of nine interleaved samples.

The benchmarks isolate JavaScript costs. They do not predict the total speedup for a database operation.

| Candidate pattern | Result |
| --- | ---: |
| Use array `includes()` for membership | About 1.2x faster |
| Guard `split()` with `indexOf()` | About 2x faster |
| Use `slice()` equality for a fixed prefix | About 2.2x faster |
| Compare fixed names without `toLowerCase()` | About 4.3x faster |
| Use object rest instead of clone plus `delete` | About 1.6x faster |
| Guard a usually missing `delete` | About 2.8x faster |
| Use `arguments` without `Array.from()` | More than 100x faster |
| Allocate an `Error` only on the error path | More than 1000x faster |
| Keep an empty hook path synchronous | About 9x faster |
| Use a POJO for ten numeric keys | About 2x faster |
| Use a POJO for ten trusted string keys | About 1.7x faster |
| Replace `filter().map()` with one loop | About 1.4x faster |
| Use `hasOwnKeys()` instead of `Object.keys()` | About 1.7x faster |
| Use direct access instead of `mpath.get()` for a top-level path | About 33x faster |
| Skip selection work for paths without getters | About 4x faster |
| Cache stable projection metadata | About 22x faster |
| Reuse an immutable ObjectId instead of cloning it | About 16x faster |
| Use a `null` sentinel instead of inspecting an empty object | About 3.6x faster |
| Use `Set` for repeated ObjectId lookups | 1.3x to 19x faster |
| Use `Set` for larger repeated primitive-key lookups | 1.3x to 3.8x faster |

The benchmark rejected two proposed blanket rules.

| Proposed rewrite | Result |
| --- | ---: |
| Replace string `includes()` with `indexOf()` | 1.00x, within noise |
| Replace array `includes()` with `indexOf()` | 0.83x, slower |
| Replace `endsWith()` with direct trailing access | 0.93x, slower |
| Use `Set` for ten primitive keys with one error | 0.79x, slower |
| Use `Set` for 25 primitive keys with one error | 0.93x, slower |

Re-run the benchmark after a Node.js minimum version change. Runtime optimizations can change these results.

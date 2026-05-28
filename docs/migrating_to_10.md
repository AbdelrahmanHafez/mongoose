# Migrating to Mongoose 10

This guide describes breaking changes in Mongoose 10.

## Removed `Document.prototype.validateSync()` {#removed-validatesync}

`Document.prototype.validateSync()` has been removed.
Use `Document.prototype.validate()` instead.

```javascript
// Before
const err = doc.validateSync();
if (err) {
  handleError(err);
}

// After
await doc.validate().catch(handleError);
```

`validate()` runs validate middleware and asynchronous validators.

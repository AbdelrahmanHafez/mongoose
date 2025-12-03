# Implementation: `flattenUUIDs` Option (gh-15021)

## Overview

Added a `flattenUUIDs` option to `toObject()` and `toJSON()` that converts UUID instances to their string representation (36-character hex string with dashes), similar to how `flattenObjectIds` works.

**References:**
- Discussion: https://github.com/Automattic/mongoose/discussions/14969#discussioncomment-11005437
- Issue: https://github.com/Automattic/mongoose/issues/15021

## Files Changed

### Runtime Implementation

**`lib/helpers/clone.js`**:
- Added import: `const UUID = require('bson').UUID;`
- Added UUID flattening logic after the Decimal128 handling:

```javascript
if (obj instanceof UUID) {
  if (options && options.flattenUUIDs) {
    return obj.toJSON();  // Returns 36-char hex string with dashes
  }
  return new UUID(obj.buffer);
}
```

### Bug Fixes (discovered during implementation)

Fixed incorrect UUID imports in several files that were using `require('mongodb/lib/bson').UUID` which returns `undefined`. Changed to `require('bson').UUID`:

- `lib/types/uuid.js`
- `lib/utils.js`
- `lib/types/buffer.js`
- `lib/cast/uuid.js`

### TypeScript Types

**`types/index.d.ts`**:
- Added `flattenUUIDs?: boolean` option to `ToObjectOptions`
- Renamed `UUIDToJSON<T>` to `UUIDToString<T>` for consistency with `ObjectIdToString<T>`
- Fixed the type helper to properly check for `Types.UUID` and `mongodb.UUID` before `TreatAsPrimitives`

**`types/document.d.ts`**:
- Added overloads for `toObject()` and `toJSON()` with `flattenUUIDs: true`

### Tests

**`test/document.test.js`**:
- Added a `describe` block with `createTestContext()` pattern
- Tests for `toObject()` with `flattenUUIDs: true`
- Tests for `toJSON()` with `flattenUUIDs: true`
- Tests verifying UUIDs remain as UUID instances when option is false/not specified

**`test/types/document.test.ts`**:
- Added TypeScript type tests for `flattenUUIDs` option

## Usage Example

```javascript
const mongoose = require('mongoose');
const { Schema } = mongoose;

const schema = new Schema({
  _id: 'UUID',
  uuid: 'UUID',
  nested: { uuid: 'UUID' }
});

const Model = mongoose.model('Test', schema);
const doc = new Model({
  _id: new mongoose.Types.UUID('00000000-0000-0000-0000-000000000000'),
  uuid: new mongoose.Types.UUID('11111111-1111-1111-1111-111111111111'),
  nested: { uuid: new mongoose.Types.UUID('22222222-2222-2222-2222-222222222222') }
});

// With flattenUUIDs: true - UUIDs become strings
const obj = doc.toObject({ flattenUUIDs: true });
// Result:
// {
//   _id: '00000000-0000-0000-0000-000000000000',
//   uuid: '11111111-1111-1111-1111-111111111111',
//   nested: { uuid: '22222222-2222-2222-2222-222222222222' }
// }

// Without flattenUUIDs - UUIDs remain as UUID instances
const obj2 = doc.toObject();
// obj2._id instanceof mongoose.Types.UUID === true
```

## Git Diff Summary

```
lib/cast/uuid.js            |   2 +-
lib/helpers/clone.js        |   8 ++++
lib/types/buffer.js         |   2 +-
lib/types/uuid.js           |   2 +-
lib/utils.js                |   2 +-
test/document.test.js       | 110 ++++++++++++++++++++++++++++++++++++++++++++
test/types/document.test.ts |  27 +++++++++++
types/document.d.ts         |   8 ++++
types/index.d.ts            |  34 ++++++++------
9 files changed, 177 insertions(+), 18 deletions(-)
```

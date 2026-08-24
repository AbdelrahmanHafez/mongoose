'use strict';

const assert = require('assert');
const mpath = require('mpath');
const { ObjectId } = require('mongodb');

const clone = require('../lib/helpers/clone');

process.nextTick(run);

function run() {
  const results = [
    compare('string indexOf vs includes', includesCheck, indexOfCheck, 5e6),
    compare('array indexOf vs includes', arrayIncludesCheck, arrayIndexOfCheck, 5e6),
    compare('guard split with indexOf', alwaysSplit, guardedSplit, 1e6),
    compare('slice equality vs startsWith', startsWithCheck, sliceCheck, 5e6),
    compare('last character vs endsWith', endsWithCheck, lastCharacterCheck, 5e6),
    compare('exact names vs toLowerCase', lowercaseCheck, exactNameCheck, 5e6),
    compare('object rest vs clone and delete', cloneAndDelete, restOmission, 5e5),
    compare('guard missing delete with hasOwn', unconditionalMissingDelete, guardedMissingDelete, 5e6),
    compare('direct arguments vs Array.from', copiedArguments, directArguments, 2e6),
    compare('lazy Error allocation', eagerError, lazyError, 2e4),
    compare('sync empty hook vs async hook', asyncEmptyHookCalls, syncEmptyHookCalls, 2e6),
    compare('POJO vs Map for 10 keys', mapLookupTable, objectLookupTable, 2e5),
    compare('POJO vs Map for 10 string keys', mapStringLookupTable, objectStringLookupTable, 2e5),
    compare('single loop vs filter and map', filterAndMap, singleLoop, 1e5),
    compare('hasOwnKeys vs Object.keys', objectKeysExistence, directOwnKeyExistence, 5e6),
    compare('direct property vs mpath.get', mpathTopLevelGet, directTopLevelGet, 5e6),
    compare('skip selection without getters', unconditionalSelection, guardedSelection, 1e6),
    compare('cached vs repeated metadata', repeatedProjectionMetadata, cachedProjectionMetadata, 2e5),
    compare('reuse ObjectId vs clone', cloneObjectId, reuseObjectId, 1e6),
    compare('null sentinel vs empty object', emptyObjectSentinel, nullSentinel, 5e6)
  ];

  const setResults = benchmarkSetThresholds();
  const primitiveSetResults = benchmarkPrimitiveSetThresholds();
  printResults(results.concat(setResults, primitiveSetResults));
}

function compare(name, baseline, candidate, iterations, samples = 9) {
  const warmupIterations = Math.min(iterations, 2e4);
  assert.strictEqual(baseline(warmupIterations), candidate(warmupIterations), `${name} changed the result`);

  const baselineSamples = [];
  const candidateSamples = [];
  for (let sample = 0; sample < samples; ++sample) {
    if (sample % 2 === 0) {
      baselineSamples.push(measure(baseline, iterations));
      candidateSamples.push(measure(candidate, iterations));
    } else {
      candidateSamples.push(measure(candidate, iterations));
      baselineSamples.push(measure(baseline, iterations));
    }
  }

  const baselineNs = median(baselineSamples);
  const candidateNs = median(candidateSamples);
  return { name, baselineNs, candidateNs, speedup: baselineNs / candidateNs };
}

function benchmarkSetThresholds() {
  const cases = [
    { documents: 10, errors: 1, repetitions: 2000 },
    { documents: 25, errors: 1, repetitions: 1000 },
    { documents: 25, errors: 6, repetitions: 1000 },
    { documents: 50, errors: 12, repetitions: 500 },
    { documents: 100, errors: 25, repetitions: 200 }
  ];

  return cases.map(testCase => {
    const data = createMembershipData(testCase.documents, testCase.errors);
    const linear = repetitions => linearMembership(repetitions, data.documents, data.errors);
    const indexed = repetitions => setMembership(repetitions, data.documents, data.errors);
    return compare(
      `Set vs linear search (${testCase.documents} docs, ${testCase.errors} errors)`,
      linear,
      indexed,
      testCase.repetitions
    );
  });
}

function benchmarkPrimitiveSetThresholds() {
  const cases = [
    { documents: 10, errors: 1, repetitions: 2e5 },
    { documents: 25, errors: 1, repetitions: 1e5 },
    { documents: 25, errors: 6, repetitions: 1e5 },
    { documents: 100, errors: 25, repetitions: 2e4 }
  ];

  return cases.map(testCase => {
    const data = createPrimitiveMembershipData(testCase.documents, testCase.errors);
    const linear = repetitions => linearPrimitiveMembership(repetitions, data.documents, data.errors);
    const indexed = repetitions => setPrimitiveMembership(repetitions, data.documents, data.errors);
    return compare(
      `Set vs linear primitive keys (${testCase.documents} docs, ${testCase.errors} errors)`,
      linear,
      indexed,
      testCase.repetitions
    );
  });
}

function printResults(results) {
  console.log(`Node.js ${process.versions.node}`);
  console.log('| Case | Baseline ns/op | Candidate ns/op | Candidate speedup |');
  console.log('| --- | ---: | ---: | ---: |');
  for (const result of results) {
    console.log(`| ${result.name} | ${result.baselineNs.toFixed(1)} | ${result.candidateNs.toFixed(1)} | ${result.speedup.toFixed(2)}x |`);
  }
}

function measure(fn, iterations) {
  const start = process.hrtime.bigint();
  const result = fn(iterations);
  const elapsed = Number(process.hrtime.bigint() - start);
  if (result === Number.MIN_SAFE_INTEGER) {
    throw new Error('Unexpected benchmark result');
  }
  return elapsed / iterations;
}

function median(values) {
  values.sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)];
}

const pathSamples = ['name', 'email', 'profile.age', 'settings locale'];

function includesCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += pathSamples[i % pathSamples.length].includes(' ') ? 1 : 0;
  }
  return result;
}

function indexOfCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += pathSamples[i % pathSamples.length].indexOf(' ') !== -1 ? 1 : 0;
  }
  return result;
}

const selectedPaths = ['name', 'email', 'status', 'profile', 'createdAt', 'updatedAt'];
const selectedPathSamples = ['name', 'missing', 'status', 'profile'];

function arrayIncludesCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += selectedPaths.includes(selectedPathSamples[i % selectedPathSamples.length]) ? 1 : 0;
  }
  return result;
}

function arrayIndexOfCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += selectedPaths.indexOf(selectedPathSamples[i % selectedPathSamples.length]) !== -1 ? 1 : 0;
  }
  return result;
}

function alwaysSplit(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += pathSamples[i % pathSamples.length].split('.')[0].length;
  }
  return result;
}

function guardedSplit(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const path = pathSamples[i % pathSamples.length];
    result += path.indexOf('.') === -1 ? path.length : path.split('.')[0].length;
  }
  return result;
}

const prefixSamples = ['user.profile.email', 'user.settings.theme', 'account.profile.email', 'user.profile'];
const userProfilePrefix = 'user.profile';

function startsWithCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += prefixSamples[i % prefixSamples.length].startsWith(userProfilePrefix) ? 1 : 0;
  }
  return result;
}

function sliceCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += prefixSamples[i % prefixSamples.length].slice(0, userProfilePrefix.length) === userProfilePrefix ? 1 : 0;
  }
  return result;
}

const wildcardSamples = ['profile.*', 'name', 'settings.locale', 'items.*'];

function endsWithCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += wildcardSamples[i % wildcardSamples.length].endsWith('*') ? 1 : 0;
  }
  return result;
}

function lastCharacterCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const path = wildcardSamples[i % wildcardSamples.length];
    result += path[path.length - 1] === '*' ? 1 : 0;
  }
  return result;
}

const constructorNames = ['ObjectId', 'ObjectID', 'String'];

function lowercaseCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += constructorNames[i % constructorNames.length].toLowerCase() === 'objectid' ? 1 : 0;
  }
  return result;
}

function exactNameCheck(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const name = constructorNames[i % constructorNames.length];
    result += name === 'ObjectId' || name === 'ObjectID' ? 1 : 0;
  }
  return result;
}

const options = {
  batchSize: 100,
  collation: 'en',
  comment: 'benchmark',
  hint: 'name_1',
  limit: 10,
  maxTimeMS: 1000,
  middleware: false,
  readPreference: 'primary',
  skip: 5,
  sort: 'name'
};

function cloneAndDelete(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const copy = { ...options };
    result += copy.middleware === false ? 1 : 0;
    delete copy.middleware;
    result += copy.batchSize;
  }
  return result;
}

function restOmission(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const { middleware, ...copy } = options;
    result += middleware === false ? 1 : 0;
    result += copy.batchSize;
  }
  return result;
}

const deleteTargets = [
  { name: 'John' },
  { name: 'Jane' },
  { name: 'Sam' },
  { name: 'Sally' }
];

function unconditionalMissingDelete(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const target = deleteTargets[i % deleteTargets.length];
    delete target.middleware;
    result += target.name.length;
  }
  return result;
}

function guardedMissingDelete(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const target = deleteTargets[i % deleteTargets.length];
    if (Object.hasOwn(target, 'middleware')) {
      delete target.middleware;
    }
    result += target.name.length;
  }
  return result;
}

function copiedArguments(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += sumCopiedArguments(i & 7, i & 3, i & 1, i & 15);
  }
  return result;
}

function directArguments(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += sumDirectArguments(i & 7, i & 3, i & 1, i & 15);
  }
  return result;
}

function sumCopiedArguments() {
  const args = Array.from(arguments);
  return args[0] + args[1] + args[2] + args[3];
}

function sumDirectArguments() {
  return arguments[0] + arguments[1] + arguments[2] + arguments[3];
}

function eagerError(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const error = new Error('Parallel save');
    result += error.message.length;
  }
  return result;
}

function lazyError(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += 'Parallel save'.length;
  }
  return result;
}

async function emptyAsyncHook() {
  return undefined;
}

function emptySyncHook() {
  return undefined;
}

function asyncEmptyHookCalls(iterations) {
  let result;
  for (let i = 0; i < iterations; ++i) {
    result = emptyAsyncHook();
  }
  return result == null ? 0 : 1;
}

function syncEmptyHookCalls(iterations) {
  let result;
  for (let i = 0; i < iterations; ++i) {
    result = emptySyncHook();
  }
  return result == null ? 1 : 0;
}

function mapLookupTable(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const table = new Map();
    for (let key = 0; key < 10; ++key) {
      table.set(key, key);
    }
    for (let key = 0; key < 10; ++key) {
      result += table.get(key);
    }
  }
  return result;
}

function objectLookupTable(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const table = {};
    for (let key = 0; key < 10; ++key) {
      table[key] = key;
    }
    for (let key = 0; key < 10; ++key) {
      result += table[key];
    }
  }
  return result;
}

const lookupKeys = Array.from({ length: 10 }, (_, index) => `field${index}`);

function mapStringLookupTable(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const table = new Map();
    for (let key = 0; key < lookupKeys.length; ++key) {
      table.set(lookupKeys[key], key);
    }
    for (let key = 0; key < lookupKeys.length; ++key) {
      result += table.get(lookupKeys[key]);
    }
  }
  return result;
}

function objectStringLookupTable(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const table = {};
    for (let key = 0; key < lookupKeys.length; ++key) {
      table[lookupKeys[key]] = key;
    }
    for (let key = 0; key < lookupKeys.length; ++key) {
      result += table[lookupKeys[key]];
    }
  }
  return result;
}

const nullableNumbers = Array.from({ length: 100 }, (_, index) => index % 10 === 0 ? null : index);

function filterAndMap(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const values = nullableNumbers.filter(value => value != null).map(value => value * 2);
    result += values.length + values[values.length - 1];
  }
  return result;
}

function singleLoop(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const values = [];
    for (let index = 0; index < nullableNumbers.length; ++index) {
      if (nullableNumbers[index] != null) {
        values.push(nullableNumbers[index] * 2);
      }
    }
    result += values.length + values[values.length - 1];
  }
  return result;
}

const populatedObject = { field0: 0, field1: 1, field2: 2, field3: 3, field4: 4 };

function objectKeysExistence(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += Object.keys(populatedObject).length > 0 ? 1 : 0;
  }
  return result;
}

function directOwnKeyExistence(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += hasOwnKeys(populatedObject) ? 1 : 0;
  }
  return result;
}

function hasOwnKeys(obj) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      return true;
    }
  }
  return false;
}

const users = [
  { name: 'Val', profile: { email: 'val@example.com' } },
  { name: 'Hafez', profile: { email: 'hafez@example.com' } },
  { name: 'Ada', profile: { email: 'ada@example.com' } },
  { name: 'Grace', profile: { email: 'grace@example.com' } }
];

function mpathTopLevelGet(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += mpath.get('name', users[i % users.length]).length;
  }
  return result;
}

function directTopLevelGet(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += users[i % users.length].name.length;
  }
  return result;
}

const getterCounts = [0, 0, 0, 1];

function unconditionalSelection(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const selected = isSelectedForBenchmark(prefixSamples[i % prefixSamples.length]);
    if (getterCounts[i % getterCounts.length] > 0) {
      result += selected ? 1 : 0;
    }
  }
  return result;
}

function guardedSelection(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    if (getterCounts[i % getterCounts.length] === 0) {
      continue;
    }
    result += isSelectedForBenchmark(prefixSamples[i % prefixSamples.length]) ? 1 : 0;
  }
  return result;
}

function isSelectedForBenchmark(path) {
  const paths = Object.keys(projection);
  for (let i = 0; i < paths.length; ++i) {
    if (path === paths[i] || path.startsWith(paths[i] + '.')) {
      return true;
    }
  }
  return false;
}

const projection = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`field${index}`, 1]));
let projectionMetadata;

function repeatedProjectionMetadata(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    const metadata = deriveProjectionMetadata(projection);
    result += metadata.paths.length + metadata.inclusive;
  }
  return result;
}

function cachedProjectionMetadata(iterations) {
  let result = 0;
  projectionMetadata = undefined;
  for (let i = 0; i < iterations; ++i) {
    projectionMetadata ??= deriveProjectionMetadata(projection);
    result += projectionMetadata.paths.length + projectionMetadata.inclusive;
  }
  return result;
}

function deriveProjectionMetadata(value) {
  const paths = Object.keys(value);
  return { paths, inclusive: value[paths[0]] ? 1 : 0 };
}

const objectIds = Array.from({ length: 100 }, () => new ObjectId());

function cloneObjectId(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += clone(objectIds[i % objectIds.length]).id[0];
  }
  return result;
}

function reuseObjectId(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += objectIds[i % objectIds.length].id[0];
  }
  return result;
}

const emptyOptionSamples = [{}, { getters: true }];
const nullableOptionSamples = [null, { getters: true }];

function emptyObjectSentinel(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += hasOwnKeys(emptyOptionSamples[i % emptyOptionSamples.length]) ? 1 : 0;
  }
  return result;
}

function nullSentinel(iterations) {
  let result = 0;
  for (let i = 0; i < iterations; ++i) {
    result += nullableOptionSamples[i % nullableOptionSamples.length] == null ? 0 : 1;
  }
  return result;
}

function linearMembership(repetitions, documents, errors) {
  let successful = 0;
  for (let repetition = 0; repetition < repetitions; ++repetition) {
    for (let index = 0; index < documents.length; ++index) {
      const documentError = errors.find(error => error._id.toString() === documents[index]._id.toString());
      successful += documentError == null ? 1 : 0;
    }
  }
  return successful;
}

function setMembership(repetitions, documents, errors) {
  let successful = 0;
  for (let repetition = 0; repetition < repetitions; ++repetition) {
    const failed = new Set(errors.map(error => error._id.toString()));
    for (let index = 0; index < documents.length; ++index) {
      successful += failed.has(documents[index]._id.toString()) ? 0 : 1;
    }
  }
  return successful;
}

function linearPrimitiveMembership(repetitions, documents, errors) {
  let successful = 0;
  for (let repetition = 0; repetition < repetitions; ++repetition) {
    for (let index = 0; index < documents.length; ++index) {
      successful += errors.indexOf(documents[index]) === -1 ? 1 : 0;
    }
  }
  return successful;
}

function setPrimitiveMembership(repetitions, documents, errors) {
  let successful = 0;
  for (let repetition = 0; repetition < repetitions; ++repetition) {
    const failed = new Set(errors);
    for (let index = 0; index < documents.length; ++index) {
      successful += failed.has(documents[index]) ? 0 : 1;
    }
  }
  return successful;
}

function createMembershipData(documentCount, errorCount) {
  const documents = Array.from({ length: documentCount }, () => ({ _id: new ObjectId() }));
  const errors = Array.from({ length: errorCount }, (_, index) => documents[index * 2]);
  return { documents, errors };
}

function createPrimitiveMembershipData(documentCount, errorCount) {
  const documents = Array.from({ length: documentCount }, (_, index) => `document${index}`);
  const errors = Array.from({ length: errorCount }, (_, index) => documents[index * 2]);
  return { documents, errors };
}

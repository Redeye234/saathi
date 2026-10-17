import test from "node:test";
import assert from "node:assert/strict";
import { isValidPassword, isValidUsername, normalizeUsername } from "../lib/auth-validation.mjs";

test("normalizes usernames consistently", () => {
  assert.equal(normalizeUsername("  Ramesh_01 "), "ramesh_01");
  assert.equal(normalizeUsername(null), "");
});

test("accepts safe usernames and rejects invalid formats", () => {
  assert.equal(isValidUsername("ramesh_01"), true);
  assert.equal(isValidUsername("worker.name-2"), true);
  assert.equal(isValidUsername("ab"), false);
  assert.equal(isValidUsername("worker with spaces"), false);
  assert.equal(isValidUsername("../admin"), false);
});

test("enforces password length limits", () => {
  assert.equal(isValidPassword("eight888"), true);
  assert.equal(isValidPassword("short"), false);
  assert.equal(isValidPassword("x".repeat(201)), false);
});

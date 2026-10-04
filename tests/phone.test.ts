import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, displayPhone } from "../src/lib/string-finder/phone";

test("normalizePhone: berbagai format Indonesia → 62xxxx", () => {
  assert.equal(normalizePhone("0812 3456 7890"), "6281234567890");
  assert.equal(normalizePhone("081234567890"), "6281234567890");
  assert.equal(normalizePhone("+62 812-3456-7890"), "6281234567890");
  assert.equal(normalizePhone("62812345678"), "62812345678");
  assert.equal(normalizePhone("81234567890"), "6281234567890");
});

test("normalizePhone: tolak nomor tak valid", () => {
  assert.equal(normalizePhone(""), null);
  assert.equal(normalizePhone("123"), null); // terlalu pendek
  assert.equal(normalizePhone("62123"), null); // tidak diikuti 8
  assert.equal(normalizePhone("abcd"), null);
});

test("displayPhone: 62xxxx → 0xxxx", () => {
  assert.equal(displayPhone("6281234567890"), "081234567890");
});

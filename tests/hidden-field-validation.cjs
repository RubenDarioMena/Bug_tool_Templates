const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'bug_tool_multilanguage.html'), 'utf8');
// Exercise the shipped validation engine without booting the UI or persistence.
const engine = html.slice(html.indexOf('function getFormRules('), html.indexOf('function scrollToField('));
const referenceInfo = html.slice(html.indexOf('function fieldReferenceInfo('), html.indexOf('function schemaFieldReferenceId('));
const keywordChecks = html.slice(html.indexOf('function keywordBadSet('), html.indexOf('function kwChipsInnerHtml('));
const fields = [
  { id: 'multiple', type: 'checkbox' },
  { id: 'single', type: 'text', required: true, regex: '^good$' },
  { id: 'many', type: 'textarea', hidden: true, required: true, regex: '^good$' },
  { id: 'keywords', type: 'keywords', kwOverlap: true },
  { id: 'choices', type: 'checklist', hidden: true },
  { id: 'limit', type: 'text' },
];
const form = { id: 'test', sections: [{ fields }], rules: [
  { whenExpr: 'multiple notEmpty', then: { action: 'hide', field: 'single' } },
  { whenExpr: 'multiple notEmpty', then: { action: 'show', field: 'many' } },
], tiles: [] };
const config = { data: { rules: {}, lists: { allowed: ['bad'] } } };
const context = vm.createContext({
  config,
  getForm: () => form,
  getForms: () => [form],
  allFields: f => f.sections.flatMap(s => s.fields.map(field => ({ field }))),
  getField: (f, id) => { const field = f.sections.flatMap(s => s.fields).find(f => f.id === id); return field && { field }; },
  resolveRef: value => value.startsWith('@') ? config.data.rules[value.slice(1)] : value,
  effectiveMultipleValues: (_field, raw) => raw,
  configuredText: value => value,
  templateValueForField: (_field, raw) => String(raw),
  listValues: id => config.data.lists[id],
  t: key => key,
  tp: key => key,
});
vm.runInContext(referenceInfo + engine + keywordChecks, context);
context.resolveValueReference = (_form, inst, id) => {
  if (id === 'key') return { found: true, complete: true, raw: inst.key };
  const ref = context.fieldReferenceInfo(form, id);
  if (!ref.found) return ref;
  let raw = inst.values[ref.baseId] ?? '';
  if (ref.accessor === 'length') raw = raw.length;
  if (ref.accessor === 'index') raw = raw[ref.index] ?? '';
  return { ...ref, complete: true, raw, fieldId: ref.baseId };
};
const inst = { formId: 'test', key: 'DEMO-1', values: {
  multiple: '', single: 'good', many: 'bad', keywords: ['bad'], choices: ['bad'], limit: '1',
} };
const validate = () => context.revalidate(inst, false);
const condition = src => context.ruleWhenTrue({ whenExpr: src }, inst, undefined, context.evalFieldRules(form, inst));
validate();
assert.deepEqual(Object.keys(inst.errors), []);
assert.equal(context.keywordBadSet(inst, fields[3]).size, 0);
for (const src of ['many notEmpty', 'many empty', 'many != "good"', 'NOT (many matches "good")',
  'many not matches "good"', 'many in ("bad")', 'many not in ("good")', 'many inList allowed',
  'choices[0] = "bad"', 'choices.length > 0', 'NOT (single = many)', 'limit < choices.length']) {
  assert.equal(condition(src), false, src);
}
assert.equal(condition('many = "bad" OR single = "good"'), true);
assert.equal(condition('multiple empty AND single = "good"'), true);
assert.equal(condition('NOT (many = "bad" AND single = "good")'), false);
config.data.rules.hiddenCheck = 'NOT (many matches "good")';
assert.equal(condition('@hiddenCheck'), false);
assert.equal(condition('key matches "^DEMO-"'), true);
// Visibility conditions keep reading saved values, so hidden fields can reappear.
assert.equal(context.ruleWhenTrue({ whenExpr: 'many = "bad"' }, inst), true);

form.rules.push({ whenExpr: 'NOT (many matches "good")', then: { action: 'error', field: 'limit' } });
form.rules.push({ when: { field: 'single', op: 'equalsField', value: 'many' }, then: { action: 'error', field: 'limit' } });
form.tiles = [
  { severity: 'error', whenExpr: '@hiddenCheck', text: 'hidden error' },
  { severity: 'error', field: 'many', whenExpr: 'many notEmpty', text: 'hidden target' },
  { severity: 'error', whenExpr: 'many = "bad" OR single = "bad"', text: 'active branch error' },
  { severity: 'warn', whenExpr: 'many = "bad"', text: 'saved context' },
  { severity: 'error', whenExpr: '', text: 'empty error condition' },
  { severity: 'warn', whenExpr: '   ', text: 'blank warning condition' },
];
const activeTileTexts = () => Array.from(context.evalTiles(form, inst), item => item.text);
validate();
assert.deepEqual(Object.keys(inst.errors), []);
assert.deepEqual(activeTileTexts(), ['saved context']);

inst.values.multiple = 'yes';
validate();
assert.deepEqual(Object.keys(inst.errors).sort(), ['keywords', 'limit', 'many']);
assert.equal(context.keywordBadSet(inst, fields[3]).has('bad'), true);
assert.deepEqual(activeTileTexts(), ['hidden error', 'hidden target', 'active branch error', 'saved context']);
inst.values.single = 'bad';
inst.values.many = 'good';
validate();
assert.deepEqual(Object.keys(inst.errors), []);
assert.equal(context.keywordBadSet(inst, fields[3]).size, 0);
assert.deepEqual(activeTileTexts(), ['hidden target']);

inst.values.multiple = '';
validate();
assert.deepEqual(Object.keys(inst.errors).sort(), ['keywords', 'single']);
assert.equal(inst.values.many, 'good');
assert.equal(inst.values.single, 'bad');
inst.values.single = '';
validate();
assert.equal(inst.errors.single, 'validation.required');
assert.equal(inst.errors.many, undefined);
inst.values.multiple = 'yes';
inst.values.many = '';
validate();
assert.equal(inst.errors.single, undefined);
assert.equal(inst.errors.many, 'validation.required');

form.rules.push({ whenExpr: 'multiple notEmpty', then: { action: 'disable', field: 'many' } });
validate();
assert.equal(inst.errors.many, undefined);
assert.equal(condition('NOT (many matches "good")'), false);
// Syntax-check every executable inline script, including code outside this engine.
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (!/type=["']application\/json/.test(match[1])) new vm.Script(match[2]);
}
console.log('Hidden-field validation regression checks passed.');

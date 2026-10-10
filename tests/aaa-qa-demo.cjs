const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const demo = JSON.parse(fs.readFileSync(path.join(root, 'examples/aaa-qa-session.json'), 'utf8'));
const sources = ['bug_data.csv', 'bug_fields.csv', 'bug_rules.csv'].map(name => fs.readFileSync(path.join(root, name), 'utf8'));
const server = http.createServer((request, response) => {
  const filename = request.url.split('?')[0].slice(1) || 'bug_tool_multilanguage.html';
  if (!['bug_tool_multilanguage.html', 'bug_data.csv', 'bug_fields.csv', 'bug_rules.csv'].includes(filename)) {
    response.writeHead(404); response.end(); return;
  }
  response.setHeader('Content-Type', filename.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/csv; charset=utf-8');
  response.end(fs.readFileSync(path.join(root, filename)));
});

async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: process.env.BUG_TOOL_BROWSER || 'chrome', headless: true });
  const pageErrors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => typeof liveState !== 'undefined' && liveState.current && state.instances.length);
    const initial = await page.evaluate(sources => {
      const live = buildLiveConfig(...sources);
      const instance = getActiveInstance();
      const fx = evalFieldRules(getForm('bug'), instance);
      return { errors: instance.errors, orphans: liveOrphansOf(live),
        sameSchema: JSON.stringify(live.schema) === JSON.stringify(config.schema),
        sameData: JSON.stringify(live.data) === JSON.stringify(config.data),
        defaults: instance.values.keywords, summary: buildOutput(instance).summary,
        crashHidden: fx.crashLog.hidden, output: buildOutput(instance).full };
    }, sources);
    assert.deepEqual(initial.errors, {});
    assert.deepEqual(initial.orphans, []);
    assert.equal(initial.sameSchema, true, 'CSV and the loaded config agree');
    assert.equal(initial.sameData, true);
    assert.equal(initial.crashHidden, true, 'No crash note must not trigger crash diagnostics');
    assert.deepEqual(initial.defaults, ['qa-gate', 'edge-case', 'physics-loop']);
    assert.match(initial.summary, /^\[PS5\]\[Gameplay \/ Traversal\] Naoe/);
    assert.match(initial.output, /Repro: 4\/5/);
    assert.doesNotMatch(initial.output, /\*\*Crash diagnostics\*\*|\*\*Performance diagnostics\*\*/);
    assert.equal(await page.locator('[data-section="crash"]').count(), 0);
    assert.equal(await page.locator('[data-section="performance"]').count(), 0);

    // Real UI input must reveal required fields and remove their errors/output
    // when the trigger is removed, without losing saved diagnostic values.
    await page.locator('[data-bind="shortDescription"]').fill('Application CRASH after loading a save');
    await page.locator('[data-bind="shortDescription"]').blur();
    await page.waitForFunction(() => !!getActiveInstance().errors.crashLog);
    assert.equal(await page.locator('[data-bind="crashLog"]').isVisible(), true);
    assert.equal(await page.locator('[data-bind="consoleReport"]').isVisible(), true);
    assert.equal(await page.locator('[data-bind="crashDump"]').count(), 0);
    await page.locator('[data-bind="crashLog"]').fill('ACS_18427_PS5_Crash.log');
    await page.locator('[data-bind="shortDescription"]').fill('Naoe wall eject fails');
    await page.locator('[data-bind="shortDescription"]').blur();
    await page.waitForFunction(() => !getActiveInstance().errors.crashType);
    assert.equal(await page.locator('[data-bind="crashLog"]').count(), 0);
    assert.equal(await page.evaluate(() => getActiveInstance().values.crashLog), 'ACS_18427_PS5_Crash.log');
    assert.doesNotMatch(await page.evaluate(() => buildOutput(getActiveInstance()).full), /Crash log:/);

    // Exercise every text trigger independently and also the keyword trigger.
    const triggerResults = await page.evaluate(() => {
      const form = getForm('bug');
      return ['shortDescription','description','preconditions','reproSteps','actual','expected','impact','workaround','additionalInfo','attachments','keywords'].map(id => {
        const inst = makeInstance('bug');
        inst.values[id] = id === 'keywords' ? ['crash','unique-a','unique-b'] : 'Observed a crash during the test.';
        return { id, shown: !evalFieldRules(form, inst).crashLog.hidden };
      });
    });
    triggerResults.forEach(result => assert.equal(result.shown, true, result.id));
    const negations = await page.evaluate(() => ['No crash observed.', 'Without crash.', 'Sin crash.', 'Not a crash.', 'No crashes observed.'].map(text => {
      const inst = makeInstance('bug'); inst.values.actual = text;
      return evalFieldRules(getForm('bug'), inst).crashLog.hidden;
    }));
    assert.equal(negations.every(Boolean), true);

    // Sample sessions are consumable through the actual import UI.
    await page.locator('#sessionFileInput').setInputFiles(path.join(root, 'examples/aaa-qa-session.json'));
    await page.waitForFunction(() => state.instances.length === 7 || document.getElementById('modal').classList.contains('open'));
    if (await page.locator('#modal.open').count()) await page.locator('#modalActions button').last().click();
    await page.waitForFunction(() => state.instances.length === 7);
    const samples = await page.evaluate(() => state.instances.map(inst => {
      revalidate(inst, false);
      return { title: inst.title, errors: inst.errors, output: buildOutput(inst).full,
        fx: evalFieldRules(getForm(inst.formId), inst), media: buildMediaName(inst.media[0], inst).name };
    }));
    samples.forEach(sample => assert.deepEqual(sample.errors, {}, sample.title));
    const crash = samples.find(sample => sample.title === 'Crash · PC');
    assert.equal(crash.fx.crashDump.hidden, false);
    assert.equal(crash.fx.consoleReport.hidden, true);
    assert.match(crash.output, /Crash dump: ACS_18428_PC_CrashDump.dmp/);
    assert.match(crash.media, /ACS-18428_PC_Repro.mp4/);
    const siege = samples.find(sample => sample.title === 'Siege · desync');
    assert.equal(siege.fx.round.hidden, false);
    assert.equal(siege.fx.questState.hidden, true);
    assert.doesNotMatch(siege.output, /Naoe|Himeji|Quest state:/);
    assert.match(siege.output, /Packet loss: 2.5%/);
    const loc = samples.find(sample => sample.title === 'Kestrel · árabe');
    assert.equal(loc.fx.localizedText.hidden, false);
    assert.match(loc.output, /الوصول/);

    // Dynamic lists enforce the selected project and region, not just global membership.
    const invalid = await page.evaluate(() => {
      const inst = makeInstance('bug');
      Object.assign(inst.values, { product: 'Rainbow Six Siege', failures: '6', packetLoss: '101',
        networkMode: 'Online - dedicated server', round: '0', version: '1.0', keywords: ['Naoe','Naoe','x'] });
      revalidate(inst, false);
      return { errors: inst.errors, characters: optionsForField(getField(getForm('bug'), 'character').field, inst),
        locations: optionsForField(getField(getForm('bug'), 'location').field, { ...inst, values: { ...inst.values, region: 'Bank' } }) };
    });
    for (const id of ['issueId','component','character','region','mission','failures','packetLoss','round','version','keywords']) assert.ok(invalid.errors[id], id);
    assert.ok(invalid.characters.includes('Hibana'));
    assert.ok(!invalid.characters.includes('Naoe'));
    assert.deepEqual(invalid.locations, ['Vault lobby','Server room']);
    const extra = await page.evaluate(() => {
      const bug = makeInstance('bug');
      bug.values.status = 'Closed'; revalidate(bug, false);
      const closedErrors = { ...bug.errors };
      bug.values.coverage = [checklistSpecialValue(getField(getForm('bug'), 'coverage').field)];
      bug.values.status = 'Open'; revalidate(bug, false);
      const allCoverageError = bug.errors.coverage;
      bug.values.keywords = ['Naoe','custom-one','custom-two']; revalidate(bug, false);
      const overlap = bug.errors.keywords;
      const reg = makeInstance('regression');
      Object.assign(reg.values, { regressionStatus: 'Verified Fixed', attempts: '5', failures: '1', version: reg.values.originalBuild });
      revalidate(reg, false);
      const fixedErrors = { ...reg.errors };
      reg.values.regressionStatus = 'Blocked'; revalidate(reg, false);
      const blockedErrors = { ...reg.errors };
      return { closedErrors, allCoverageError, overlap, fixedErrors, blockedErrors };
    });
    assert.ok(extra.closedErrors.resolved && extra.closedErrors.resolution);
    assert.equal(extra.allCoverageError, undefined);
    assert.ok(extra.overlap);
    assert.ok(extra.fixedErrors.failures && extra.fixedErrors.version && extra.fixedErrors.fixEvidence);
    assert.ok(extra.blockedErrors.blockerReason);
    assert.equal(extra.blockedErrors.fixEvidence, undefined);

    const before = await page.evaluate(() => getActiveInstance().output);
    await page.locator('#languageSelect').selectOption('en');
    assert.match(await page.locator('#label-product').textContent(), /^Project/);
    assert.equal(await page.evaluate(() => getActiveInstance().output), before);
    await page.locator('#themeSelect').selectOption('dark');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.locator('[data-bind="issueId"]').isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    if (process.env.BUG_TOOL_SCREENSHOTS) {
      fs.mkdirSync(process.env.BUG_TOOL_SCREENSHOTS, { recursive: true });
      await page.screenshot({ path: path.join(process.env.BUG_TOOL_SCREENSHOTS, 'aaa-qa-mobile.png') });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: path.join(process.env.BUG_TOOL_SCREENSHOTS, 'aaa-qa-desktop.png') });
    }
    await page.reload();
    await page.waitForFunction(() => state.instances.length === 7);
    assert.equal(await page.locator('#languageSelect').inputValue(), 'en');

    // Direct-file use must have the same usable demo, with no dependency on CSV fetch.
    const offline = await browser.newPage();
    offline.on('pageerror', error => pageErrors.push(error.message));
    await offline.goto(pathToFileURL(path.join(root, 'bug_tool_multilanguage.html')).href);
    await offline.waitForFunction(() => state.instances.length > 0);
    assert.deepEqual(await offline.evaluate(() => getActiveInstance().errors), {});
    assert.equal(await offline.evaluate(() => JSON.stringify(config.schema)), JSON.stringify(demo.config.schema));
    const arrayDefaults = await offline.evaluate(() => {
      const one = makeInstance('bug'), two = makeInstance('bug');
      one.values.coverage.push('Xbox Series X');
      return { two: two.values.coverage, invalid: initialFieldValue({ type: 'keywords', default: 'bad JSON' }),
        empty: initialFieldValue({ type: 'checklist' }), cleaned: initialFieldValue({ type: 'keywords', default: '[" a ", "a", "", 7]' }) };
    });
    assert.deepEqual(arrayDefaults, { two: ['PlayStation 5'], invalid: [], empty: [], cleaned: ['a'] });
    assert.deepEqual(pageErrors, []);
    console.log('AAA QA demo passed: CSV load, standalone fallback, 7 sample tickets, dynamic fields, crash triggers, validation, output, media, session import/persistence, languages and mobile layout.');
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; server.close(); });

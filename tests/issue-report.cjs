const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const net = require('node:net');
const http = require('node:http');
const { spawn } = require('node:child_process');

const repo = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(repo, 'bug_tool_multilanguage.html'), 'utf8');
// Parse every executable script, including the inline boot scripts.
for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
  if (!/type="application\/json"/.test(match[1])) new vm.Script(match[2]);
}
const context = vm.createContext({});
vm.runInContext(html.slice(html.indexOf('const ISSUE_MEDIA_EXTENSION'), html.indexOf('function readIssueMedia')), context);
const validate = context.validateIssueMedia;
assert.equal(validate([]), '');
assert.equal(validate([{ name: 'image.PNG', type: 'image/png', size: 1 }, { name: 'clip.mov', type: '', size: 1 }]), '');
assert.equal(validate([{ name: 'file.exe', type: 'image/png', size: 1 }]), 'issue.invalidMedia');
assert.equal(validate([{ name: 'image.png', type: 'text/plain', size: 1 }]), 'issue.invalidMedia');
assert.equal(validate(Array(21).fill({ name: 'image.png', type: 'image/png', size: 1 })), 'issue.limit');
assert.equal(validate([{ name: 'clip.mp4', type: 'video/mp4', size: 40 * 1024 * 1024 + 1 }]), 'issue.limit');

async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bug-tool-issues-'));
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  for (const file of ['BugTool_Server.ps1', 'bug_tool_multilanguage.html', 'bug_data.csv', 'bug_fields.csv', 'bug_rules.csv']) {
    fs.copyFileSync(path.join(repo, file), path.join(root, file));
  }
  const executable = process.env.PWSH || (process.platform === 'win32' ? 'powershell.exe' : 'pwsh');
  const child = spawn(executable, ['-NoLogo', '-NoProfile', '-File', path.join(root, 'BugTool_Server.ps1'), '-Port', String(port), '-NoBrowser']);
  let failure, logs = '';
  child.on('error', error => { failure = error; });
  child.stdout.on('data', data => { logs += data; });
  child.stderr.on('data', data => { logs += data; });
  const origin = `http://127.0.0.1:${port}`;
  const post = (report, extra = {}) => fetch(`${origin}/api/issues`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...extra },
    body: JSON.stringify(report),
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      if (failure) throw failure;
      try { ready = (await fetch(origin)).ok; } catch {}
      if (ready) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, logs);
    assert.equal((await fetch(`${origin}/bug_data.csv`)).status, 200);
    assert.equal((await fetch(origin, { method: 'HEAD' })).status, 200);
    const bytes = Buffer.from([0, 255, 128, 13, 10, 195, 177]);
    const media = ['../CON.png', '../CON.png', 'video.mov'].map((name, index) => ({
      name, type: index === 2 ? 'video/quicktime' : 'image/png', data: bytes.toString('base64'),
    }));
    const valid = { name: 'Escritorio 7', description: 'Falla de prueba: ñ, 日本語\nSegunda línea.', media };
    const response = await post(valid);
    assert.equal(response.status, 201, await response.clone().text());
    const { folder } = await response.json();
    assert.match(folder, /^\d{2}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}_\d{2,}$/);
    const reportDir = path.join(root, 'Issues', folder);
    const manifest = JSON.parse(fs.readFileSync(path.join(reportDir, 'report.json'), 'utf8'));
    assert.equal(manifest.description, valid.description);
    assert.equal(manifest.name, valid.name);
    assert.equal(manifest.media.length, 3);
    assert.ok(fs.readFileSync(path.join(reportDir, 'report.txt'), 'utf8').includes(valid.description));
    for (const file of manifest.media) {
      assert.equal(path.dirname(path.resolve(reportDir, file.file)), reportDir);
      assert.deepEqual(fs.readFileSync(path.join(reportDir, file.file)), bytes);
    }
    assert.equal(new Set(manifest.media.map(file => file.file)).size, 3);
    // Multiple simultaneous submissions must never overwrite an earlier report.
    const reports = await Promise.all(Array.from({ length: 4 }, () => post({ name: '', description: 'Without media', media: [] })));
    const folders = [];
    for (const result of reports) {
      assert.equal(result.status, 201, await result.clone().text());
      folders.push((await result.json()).folder);
    }
    assert.equal(new Set(folders).size, 4);
    assert.ok(folders.some(name => Number(name.split('_').at(-1)) > 1));
    for (const invalid of [
      { ...valid, description: '  ' },
      { ...valid, media: [{ name: 'bad.exe', type: 'image/png', data: 'AA==' }] },
      { ...valid, media: [{ name: 'bad.png', type: 'image/png', data: 'invalid!' }] },
      { ...valid, media: Array(21).fill(media[0]) },
    ]) assert.equal((await post(invalid)).status, 400);
    assert.equal((await post(valid, { Origin: 'https://example.com' })).status, 403);
    assert.equal((await post(valid, { 'Content-Type': 'text/plain' })).status, 403);
    assert.equal((await fetch(`${origin}/api/issues`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{' })).status, 400);
    const tooLarge = await new Promise((resolve, reject) => {
      const request = http.request(`${origin}/api/issues`, { method: 'POST', headers: {
        Origin: origin, 'Content-Type': 'application/json', 'Content-Length': 64 * 1024 * 1024 + 1,
      } }, response => { response.resume(); resolve(response.statusCode); });
      request.on('error', reject); request.end();
    });
    assert.equal(tooLarge, 413);
    assert.equal(fs.readdirSync(path.join(root, 'Issues')).length, 5);
    assert.ok(!fs.readdirSync(path.join(root, 'Issues')).some(name => name.startsWith('.pending')));
    console.log('Issue report tests passed: script syntax, media validation, HTTP, Unicode, binary integrity, collisions and rejected uploads.');
  } finally {
    child.kill();
    await new Promise(resolve => { if (child.exitCode !== null || failure) resolve(); else child.once('exit', resolve); });
    fs.rmSync(root, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

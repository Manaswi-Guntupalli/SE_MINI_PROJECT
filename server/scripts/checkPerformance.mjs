// TC-NF-PERF-01: local classroom workload, never the configured team database.
import { createRequire } from 'node:module';
import { once } from 'node:events';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { cpus } from 'node:os';
import { connectTestDatabase, closeTestDatabase } from '../test/database.mjs';

const require = createRequire(import.meta.url);
const users = 30;
const durationMs = 30000;
const targetMs = 2000;
const samples = [];
let listener, sessionStore, worker;
const startedAt = new Date().toISOString();
const report = {
  testId: 'TC-NF-PERF-01', requirement: 'OEP-NF-001', startedAt,
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  environment: { node: process.version, platform: process.platform, cpu: cpus()[0]?.model, logicalCpus: cpus().length },
  configuration: { concurrentUsers: users, durationMs, targetP95Ms: targetMs, questions: 20,
    database: 'Disposable real MongoDB 8.0.17 replica set', sessions: 'Real MongoStore',
    workload: '30 signed-in students: list/start; repeat load + versioned save + 100ms think time for 30s; submit + results',
    exclusions: 'Login/setup, browser rendering, external network, production hosting and sustained/capacity testing. This checks active-user classroom API latency, not simultaneous login throughput.' },
  status: 'failed',
};

try {
  if (Number(process.versions.node.split('.')[0]) !== 24) throw new Error('Node 24 is required');
  process.env.NODE_ENV = 'development';
  process.env.SESSION_SECRET = 'isolated-performance-test-session-secret';
  process.env.MONGO_URI = await connectTestDatabase();
  // Capture only our disposable app's session-store handle for orderly cleanup.
  const { MongoStore } = require('connect-mongo');
  const originalCreate = MongoStore.create;
  try {
    MongoStore.create = function (...args) { sessionStore = originalCreate.apply(this, args); return sessionStore; };
    listener = require('../app').listen(0, '127.0.0.1');
  } finally { MongoStore.create = originalCreate; }
  await once(listener, 'listening');
  const base = `http://127.0.0.1:${listener.address().port}`;
  const models = Object.fromEntries(['User', 'Exam', 'Attempt', 'Response', 'Result'].map(name => [name, require(`../models/${name}`)]));
  await Promise.all(Object.values(models).map(model => model.init()));
  const password = 'DisposablePerf123!';
  const passwordHash = await require('bcryptjs').hash(password, 12);
  const instructor = await models.User.create({ name: 'Performance Instructor', email: 'teacher@performance.invalid', role: 'Instructor', passwordHash });
  const students = await models.User.create(Array.from({ length: users }, (_, i) => ({ name: `Student ${i}`, email: `student${i}@performance.invalid`, role: 'Student', passwordHash })));
  const exam = await models.Exam.create({ title: 'Classroom performance', instructorId: instructor._id, status: 'Published', duration: 30,
    questions: Array.from({ length: 20 }, (_, i) => ({ questionText: `Question ${i + 1}`, options: [{ text: 'Correct', isCorrect: true }, { text: 'Other' }] })) });
  worker = require('../services/evaluationWorker').startEvaluationWorker();
  const actors = [];
  // Setup is intentionally sequential and outside the active-session latency metric.
  for (const student of students) {
    const actor = { cookie: '', token: '', student, revision: 0 };
    actor.call = async (endpoint, path, method = 'GET', body, measured = true) => {
      const start = performance.now();
      let status = 0;
      try {
        const response = await fetch(base + path, { method,
          headers: { 'Content-Type': 'application/json', Cookie: actor.cookie, 'X-CSRF-Token': actor.token },
          body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
        status = response.status;
        const data = await response.json();
        const cookies = response.headers.getSetCookie();
        if (cookies.length) actor.cookie = cookies.map(cookie => cookie.split(';')[0]).join('; ');
        if (status !== 200) throw new Error(`${endpoint}: HTTP ${status}`);
        return data;
      } finally { if (measured) samples.push({ endpoint, ms: performance.now() - start, status }); }
    };
    await actor.call('login', '/api/auth/login', 'POST', { email: student.email, password }, false);
    actor.token = (await actor.call('csrf', '/api/auth/csrf-token', 'GET', undefined, false)).csrfToken;
    actors.push(actor);
  }
  const workloadStart = performance.now();
  const outcomes = await Promise.allSettled(actors.map(async actor => {
    await actor.call('list', '/api/student/exams');
    const started = await actor.call('start', `/api/student/exams/${exam.id}/start`, 'POST', {});
    actor.attempt = started.attempt._id;
    const question = exam.questions[0];
    const stopAt = performance.now() + durationMs;
    do {
      await actor.call('load', `/api/student/attempts/${actor.attempt}`);
      const saved = await actor.call('save', `/api/student/attempts/${actor.attempt}/responses/${question.id}`, 'PUT',
        { selectedOptionId: question.options[actor.revision % 2].id, expectedRevision: actor.revision });
      if (saved.response.revision !== actor.revision + 1) throw new Error('Lost revision');
      actor.revision++;
      await new Promise(resolve => setTimeout(resolve, 100));
    } while (performance.now() < stopAt);
    const submitted = await actor.call('submit', `/api/student/attempts/${actor.attempt}/submit`, 'POST', { reason: 'Manual' });
    const expectedScore = actor.revision % 2 === 1 ? 1 : 0;
    if (submitted.result.score !== expectedScore) throw new Error('Incorrect score under load');
    const results = await actor.call('results', '/api/student/results');
    if (results.length !== 1 || results[0].score !== expectedScore) throw new Error('Incorrect result visibility under load');
  }));
  report.elapsedWorkloadMs = performance.now() - workloadStart;
  report.errors = outcomes.filter(value => value.status === 'rejected').map(value => String(value.reason));
  const stats = values => {
    const sorted = values.map(value => value.ms).sort((a, b) => a - b);
    return { count: values.length, errors: values.filter(value => value.status !== 200).length,
      p50Ms: sorted[Math.ceil(sorted.length * .5) - 1], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted.at(-1) };
  };
  report.overall = stats(samples);
  report.endpoints = Object.fromEntries([...new Set(samples.map(value => value.endpoint))].map(endpoint => [endpoint, stats(samples.filter(value => value.endpoint === endpoint))]));
  report.persisted = { attempts: await models.Attempt.countDocuments({ status: 'Submitted' }), responses: await models.Response.countDocuments(), results: await models.Result.countDocuments() };
  const complete = Object.values(report.persisted).every(count => count === users);
  report.status = complete && !report.errors.length && Object.values(report.endpoints).every(value => value.errors === 0 && value.p95Ms <= targetMs) ? 'passed' : 'failed';
} catch (error) { report.error = String(error); }
finally {
  worker?.stop();
  if (worker) await worker.done;
  if (listener) { listener.closeAllConnections(); await new Promise(resolve => listener.close(resolve)); }
  if (sessionStore) await sessionStore.close();
  await closeTestDatabase();
  report.finishedAt = new Date().toISOString();
  const output = new URL('../reports/performance.json', import.meta.url);
  mkdirSync(new URL('.', output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.status === 'passed' ? 0 : 1;
}

import { createRequire } from 'node:module';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';
import request from 'supertest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { connectTestDatabase, closeTestDatabase } from './database.mjs';
const require = createRequire(import.meta.url);
const app = require('../app');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Attempt = require('../models/Attempt');
const Result = require('../models/Result');
const bcrypt = require('bcryptjs');
let users, passwordHash, databaseUri;
const password = 'Acceptance123!';
const content = { questionText: '2 + 2?', options: [{ text: '4', isCorrect: true }, { text: '5', isCorrect: false }] };
async function login(user = users.Instructor) {
  const agent = request.agent(app);
  const response = await agent.post('/api/auth/login').send({ email: user.email, password });
  expect(response.status).toBe(200);
  const token = (await agent.get('/api/auth/csrf-token')).body.csrfToken;
  return { agent, token, cookie: response.headers['set-cookie'][0].split(';')[0] };
}
async function exam(overrides = {}) {
  return Exam.create({ title: 'Acceptance exam', duration: 30, instructorId: users.Instructor._id, ...overrides });
}
describe('Acceptance criteria #21 #23 #24 #33–#37', () => {
  beforeAll(async () => {
    databaseUri = await connectTestDatabase();
    await Promise.all([User.init(), Exam.init(), Attempt.init(), Result.init()]);
    passwordHash = await bcrypt.hash(password, 12);
  });
  afterAll(closeTestDatabase);
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Exam.deleteMany({}), Attempt.deleteMany({}), Result.deleteMany({})]);
    users = {};
    for (const role of ['Instructor', 'Student', 'Admin']) users[role] = await User.create({ name: role, email: `${role}@test.invalid`, passwordHash, role });
    users.otherInstructor = await User.create({ name: 'Other', email: 'other@test.invalid', passwordHash, role: 'Instructor' });
    users.otherStudent = await User.create({ name: 'Other student', email: 'otherstudent@test.invalid', passwordHash, role: 'Student' });
  });

  it('AC23-01: rejects wrong, missing, malformed and inactive credentials without leaking password data', async () => {
    for (const body of [{ email: users.Instructor.email, password: 'wrong' }, { email: 'unknown@test.invalid', password }, { email: {}, password }, { password }]) {
      const response = await request(app).post('/api/auth/login').send(body);
      expect([400, 401]).toContain(response.status);
      expect(JSON.stringify(response.body)).not.toContain(passwordHash);
      expect(response.headers['set-cookie']).toBeUndefined();
    }
    await User.findByIdAndUpdate(users.Instructor._id, { active: false });
    expect((await request(app).post('/api/auth/login').send({ email: users.Instructor.email, password })).status).toBe(403);
    expect((await User.findById(users.Student._id)).passwordHash).toBeUndefined();
    expect(await bcrypt.compare(password, (await User.findById(users.Student._id).select('+passwordHash')).passwordHash)).toBe(true);
  });
  it('AC23-02: rotates sessions on login and invalidates the old cookie and CSRF token', async () => {
    const { agent, cookie, token } = await login();
    const response = await agent.post('/api/auth/login').send({ email: users.Instructor.email, password });
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax');
    expect(response.headers['set-cookie'][0].split(';')[0]).not.toBe(cookie);
    expect((await request(app).get('/api/exams/mine').set('Cookie', cookie)).status).toBe(401);
    expect((await agent.post('/api/exams').set('X-CSRF-Token', token).send({ title: 'x', duration: 1 })).status).toBe(403);
  });
  it('AC23-03: logout clears the cookie and replay cannot access protected data', async () => {
    const { agent, token, cookie } = await login();
    const response = await agent.post('/api/auth/logout').set('X-CSRF-Token', token).send({});
    expect(response.status).toBe(200);
    expect(response.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
    expect((await request(app).get('/api/exams/mine').set('Cookie', cookie)).status).toBe(401);
  });
  it('AC24-01: current role and active status are rechecked for an existing session', async () => {
    const { agent } = await login();
    await User.findByIdAndUpdate(users.Instructor._id, { role: 'Student' });
    expect((await agent.get('/api/exams/mine')).status).toBe(403);
    await User.findByIdAndUpdate(users.Instructor._id, { active: false });
    expect((await agent.get('/api/student/exams')).status).toBe(401);
  });
  it.each(['Student', 'Admin'])('AC24-02: %s cannot call any Instructor management operation', async role => {
    const draft = await exam({ questions: [content] });
    const { agent, token } = await login(users[role]);
    const base = `/api/exams/${draft.id}`;
    for (const [method, path] of [['get', '/api/exams/mine'], ['get', base], ['post', '/api/exams'], ['put', base], ['delete', base], ['post', `${base}/questions`], ['put', `${base}/questions/${draft.questions[0].id}`], ['delete', `${base}/questions/${draft.questions[0].id}`], ['post', `${base}/publish`], ['get', `${base}/results`]]) {
      expect((await agent[method](path).set('X-CSRF-Token', token).send({})).status).toBe(403);
    }
    expect((await Exam.findById(draft.id)).status).toBe('Draft');
  });
  it('AC24-03: foreign Instructor identifiers cannot read, write, publish or disclose results', async () => {
    const draft = await exam({ questions: [content] });
    const { agent, token } = await login(users.otherInstructor);
    const base = `/api/exams/${draft.id}`;
    for (const [method, path] of [['get', base], ['put', base], ['delete', base], ['post', `${base}/publish`], ['post', `${base}/questions`], ['put', `${base}/questions/${draft.questions[0].id}`], ['delete', `${base}/questions/${draft.questions[0].id}`], ['get', `${base}/results`]]) {
      const response = await agent[method](path).set('X-CSRF-Token', token).send({ title: 'Attack' });
      expect(response.status).toBe(403);
      expect(JSON.stringify(response.body)).not.toContain('isCorrect');
    }
    expect((await Exam.findById(draft.id)).title).toBe('Acceptance exam');
  });
  it('AC23-04: rejects missing CSRF, cross-origin writes, malformed JSON and invalid sessions', async () => {
    const { agent, token } = await login();
    expect((await agent.post('/api/exams').send({ title: 'x', duration: 1 })).status).toBe(403);
    expect((await agent.post('/api/exams').set('Origin', 'https://attacker.invalid').set('X-CSRF-Token', token).send({ title: 'x', duration: 1 })).status).toBe(403);
    expect((await agent.post('/api/exams').set('Content-Type', 'application/json').send('{bad')).status).toBe(400);
    expect((await request(app).get('/api/exams/mine').set('Cookie', 'oep.sid=invalid')).status).toBe(401);
    expect(await Exam.countDocuments()).toBe(0);
  });
  it.each([undefined, null, ''])('AC33-01: optional start %j creates a persisted owned draft', async startTime => {
    const { agent, token } = await login();
    const response = await agent.post('/api/exams').set('X-CSRF-Token', token).send({ title: ' New exam ', duration: 0.5, startTime, instructorId: users.otherInstructor.id, status: 'Published' });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('Draft');
    expect(response.body.instructorId).toBe(users.Instructor.id);
    expect(response.body.startTime).toBeNull();
    expect((await agent.get('/api/exams/mine')).body[0]._id).toBe(response.body._id);
  });
  it.each([{ title: '' }, { description: {} }, { duration: 0 }, { duration: -1 }, { duration: 'Infinity' }, { duration: true }, { duration: [] }, { startTime: 'bad' }, { startTime: '2026-10-25T10:00' }])('AC33-02: invalid fields %j insert nothing', async invalid => {
    const { agent, token } = await login();
    const response = await agent.post('/api/exams').set('X-CSRF-Token', token).send({ title: 'Valid', duration: 30, ...invalid });
    expect(response.status).toBe(400);
    expect(await Exam.countDocuments()).toBe(0);
    expect(response.body.error).toBeUndefined();
  });
  it('AC34-01: cannot mass assign publication, ownership, questions or answer keys', async () => {
    const draft = await exam();
    const { agent, token } = await login();
    for (const body of [{ status: 'Published' }, { instructorId: users.otherInstructor.id }, { questions: [content] }]) {
      expect((await agent.put(`/api/exams/${draft.id}`).set('X-CSRF-Token', token).send(body)).status).toBe(400);
    }
    expect((await Exam.findById(draft.id)).status).toBe('Draft');
  });
  it.each([[], [{ text: 'a' }], [{ text: '', isCorrect: true }, { text: 'b' }], [{ text: 'a' }, { text: 'b' }], [{ text: 'a', isCorrect: true }, { text: 'b', isCorrect: true }]].map(options => [options]))('AC35-01: incomplete draft options %j cannot publish', async options => {
    const draft = await exam();
    const { agent, token } = await login();
    expect((await agent.post(`/api/exams/${draft.id}/questions`).set('X-CSRF-Token', token).send({ questionText: 'Q', options })).status).toBe(201);
    const response = await agent.post(`/api/exams/${draft.id}/publish`).set('X-CSRF-Token', token).send({});
    expect(response.status).toBe(400);
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect((await Exam.findById(draft.id)).status).toBe('Draft');
  });
  it('AC35-02: option removal clears correctness until a replacement is saved; rejects foreign option IDs', async () => {
    const draft = await exam({ questions: [content] });
    const { agent, token } = await login();
    const base = `/api/exams/${draft.id}/questions/${draft.questions[0].id}`;
    expect((await agent.put(base).set('X-CSRF-Token', token).send({ options: [{ text: 'b' }] })).status).toBe(200);
    expect((await agent.post(`/api/exams/${draft.id}/publish`).set('X-CSRF-Token', token).send({})).status).toBe(400);
    expect((await agent.put(base).set('X-CSRF-Token', token).send({ options: [{ _id: String(draft.questions[0].options[0]._id), text: 'foreign', isCorrect: true }] })).status).toBe(400);
    expect((await agent.put(base).set('X-CSRF-Token', token).send({ options: content.options })).status).toBe(200);
    expect((await agent.post(`/api/exams/${draft.id}/publish`).set('X-CSRF-Token', token).send({})).status).toBe(200);
  });
  it('AC36-01: listing and start share eligibility, hide answers and persist one unchanged deadline on concurrent resume', async () => {
    const available = await exam({ status: 'Published', questions: [content] });
    const arrived = await exam({ status: 'Published', startTime: new Date(Date.now() - 60000), questions: [content] });
    const future = await exam({ status: 'Published', startTime: new Date(Date.now() + 86400000), questions: [content] });
    const draft = await exam({ questions: [content] });
    const { agent, token } = await login(users.Student);
    const list = await agent.get('/api/student/exams');
    expect(new Set(list.body.map(value => value._id))).toEqual(new Set([available.id, arrived.id, future.id]));
    expect(JSON.stringify(list.body)).not.toMatch(/isCorrect|instructorId|questions/);
    expect(list.body.find(item => item._id === future.id).canStart).toBe(false);
    expect(list.body.find(item => item._id === available.id).canStart).toBe(true);
    for (const item of [future, draft]) expect((await agent.post(`/api/student/exams/${item.id}/start`).set('X-CSRF-Token', token).send({})).status).toBe(404);
    const starts = await Promise.all(Array.from({ length: 4 }, () => agent.post(`/api/student/exams/${available.id}/start`).set('X-CSRF-Token', token).send({ studentId: users.otherStudent.id, deadline: '2099-01-01' })));
    for (const response of starts) {
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body)).not.toMatch(/isCorrect|correctOption|passwordHash/);
      expect(response.body.attempt.studentId).toBe(users.Student.id);
      expect(new Date(response.body.attempt.deadline) - new Date(response.body.attempt.startedAt)).toBe(30 * 60000);
    }
    expect(new Set(starts.map(value => value.body.attempt.deadline)).size).toBe(1);
    expect(await Attempt.countDocuments()).toBe(1);
    // Advance the fixture's stored time directly; production Mongoose writes cannot reset deadlines.
    await Attempt.collection.updateOne({ examId: available._id }, { $set: { deadline: new Date(Date.now() - 1000) } });
    expect((await agent.post(`/api/student/exams/${available.id}/start`).set('X-CSRF-Token', token).send({})).status).toBe(409);
  });
  it('AC24-04: student attempt/result ownership, Instructor result ownership and Admin non-inheritance', async () => {
    const published = await exam({ status: 'Published', questions: [content] });
    const attempt = await Attempt.create({ examId: published._id, studentId: users.Student._id, startedAt: new Date(), deadline: new Date(Date.now() + 60000) });
    const result = await Result.create({ attemptId: attempt._id, examId: published._id, studentId: users.Student._id, score: 1, maximum: 1 });
    const student = await login(users.Student), other = await login(users.otherStudent), admin = await login(users.Admin), instructor = await login();
    expect((await student.agent.get(`/api/student/attempts/${attempt.id}`)).status).toBe(200);
    expect((await student.agent.get(`/api/student/results/${result.id}`)).status).toBe(200);
    expect((await other.agent.get(`/api/student/attempts/${attempt.id}`)).status).toBe(404);
    expect((await other.agent.get(`/api/student/results/${result.id}`)).status).toBe(404);
    expect((await other.agent.get('/api/student/results')).body).toEqual([]);
    expect((await instructor.agent.get(`/api/exams/${published.id}/results`)).body[0]._id).toBe(result.id);
    expect((await admin.agent.get('/api/student/exams')).status).toBe(403);
    expect((await instructor.agent.get('/api/admin/users')).status).toBe(403);
    expect((await student.agent.get('/api/admin/users')).status).toBe(403);
  });
  it('AC24-05: only Admin can provision/change accounts; duplicates and escalation are rejected', async () => {
    const { agent, token } = await login(users.Admin);
    const response = await agent.post('/api/admin/users').set('X-CSRF-Token', token).send({ name: 'New', email: 'new@test.invalid', password, role: 'Student' });
    expect(response.status).toBe(201);
    expect(JSON.stringify(response.body)).not.toMatch(/password/);
    expect((await agent.post('/api/admin/users').set('X-CSRF-Token', token).send({ name: 'New', email: 'new@test.invalid', password, role: 'Student' })).status).toBe(409);
    expect((await agent.patch(`/api/admin/users/${response.body.id}`).set('X-CSRF-Token', token).send({ role: 'Instructor', active: false })).status).toBe(200);
    const student = await login(users.Student);
    expect((await student.agent.patch(`/api/admin/users/${users.Student.id}`).set('X-CSRF-Token', student.token).send({ role: 'Admin' })).status).toBe(403);
    expect((await agent.patch(`/api/admin/users/${users.Student.id}`).set('X-CSRF-Token', token).send({ role: 'Root' })).status).toBe(400);
  });

  it('AC51-01: invalid provisioning, forbidden writes and inactive Admin sessions cannot change accounts', async () => {
    const { agent, token } = await login(users.Admin);
    const initialCount = await User.countDocuments();
    for (const body of [{}, { name: 'Invalid', email: 'bad', password, role: 'Student' },
      { name: 'Invalid', email: 'bad@test.invalid', password: 'short', role: 'Student' },
      { name: 'Invalid', email: 'bad@test.invalid', password, role: 'Root' }]) {
      expect((await agent.post('/api/admin/users').set('X-CSRF-Token', token).send(body)).status).toBe(400);
    }
    for (const user of [users.Student, users.Instructor]) {
      const forbidden = await login(user);
      expect((await forbidden.agent.post('/api/admin/users').set('X-CSRF-Token', forbidden.token)
        .send({ name: 'Attack', email: 'attack@test.invalid', password, role: 'Admin' })).status).toBe(403);
    }
    expect((await request(app).get('/api/admin/users')).status).toBe(401);
    expect(await User.countDocuments()).toBe(initialCount);
    await User.findByIdAndUpdate(users.Admin._id, { active: false });
    expect((await agent.get('/api/admin/users')).status).toBe(401);
  });

  it('AC51-02: Admin API demotion/deactivation revokes an existing session and preserves associated data', async () => {
    const draft = await exam({ status: 'Published', questions: [content] });
    const attempt = await Attempt.create({ studentId: users.Student._id, examId: draft._id, startedAt: new Date(), deadline: new Date(Date.now() + 60000) });
    const result = await Result.create({ attemptId: attempt._id, studentId: users.Student._id, examId: draft._id, score: 1, maximum: 1 });
    const instructor = await login(), student = await login(users.Student), admin = await login(users.Admin);
    expect((await admin.agent.patch(`/api/admin/users/${users.Instructor.id}`).set('X-CSRF-Token', admin.token).send({ role: 'Student' })).status).toBe(200);
    expect((await instructor.agent.get('/api/exams/mine')).status).toBe(403);
    expect((await admin.agent.patch(`/api/admin/users/${users.Student.id}`).set('X-CSRF-Token', admin.token).send({ active: false })).status).toBe(200);
    expect((await student.agent.get('/api/student/results')).status).toBe(401);
    expect(String((await Exam.findById(draft.id)).instructorId)).toBe(users.Instructor.id);
    expect(String((await Attempt.findById(attempt.id)).studentId)).toBe(users.Student.id);
    expect((await Result.findById(result.id)).score).toBe(1);
  });

  it('AC51-03: initial Admin bootstrap hashes supplied credentials, rejects weak input and refuses repeat bootstrap', async () => {
    const uri = new URL(databaseUri);
    uri.pathname = '/oep_bootstrap_isolated_test';
    const script = fileURLToPath(new URL('../scripts/bootstrapAdmin.js', import.meta.url));
    const run = promisify(execFile);
    const environment = { ...process.env, MONGO_URI: uri.href, NODE_ENV: 'test', ADMIN_EMAIL: 'bootstrap@test.invalid', ADMIN_PASSWORD: password };
    await expect(run(process.execPath, [script], { env: { ...environment, ADMIN_PASSWORD: 'short' } })).rejects.toMatchObject({ code: 1 });
    const created = await run(process.execPath, [script], { env: environment });
    expect(created.stdout).toContain('Initial Admin created');
    expect(created.stdout).not.toContain(password);
    await expect(run(process.execPath, [script], { env: environment })).rejects.toMatchObject({ code: 1 });
    const connection = await require('mongoose').createConnection(uri.href).asPromise();
    try {
      const stored = await connection.collection('users').findOne({ email: environment.ADMIN_EMAIL });
      expect(stored.role).toBe('Admin');
      expect(stored.passwordHash).not.toBe(password);
      expect(await bcrypt.compare(password, stored.passwordHash)).toBe(true);
      await connection.dropDatabase();
    } finally { await connection.close(); }
  });
  it('AC34-02: publication races reject stale edits/deletion and preserve historical attempts/results', async () => {
    const draft = await exam({ questions: [content] });
    const stale = await Exam.findById(draft.id);
    const { agent, token } = await login();
    expect((await agent.post(`/api/exams/${draft.id}/publish`).set('X-CSRF-Token', token).send({})).status).toBe(200);
    stale.title = 'Stale overwrite';
    await expect(stale.save()).rejects.toMatchObject({ name: 'VersionError' });
    expect((await agent.delete(`/api/exams/${draft.id}`).set('X-CSRF-Token', token).send({})).status).toBe(400);
    const attempt = await Attempt.create({ examId: draft._id, studentId: users.Student._id, startedAt: new Date(Date.now() - 1000), deadline: new Date() });
    const result = await Result.create({ attemptId: attempt._id, examId: draft._id, studentId: users.Student._id, score: 1, maximum: 1 });
    expect((await agent.put(`/api/exams/${draft.id}`).set('X-CSRF-Token', token).send({ title: 'Changed' })).status).toBe(400);
    expect(await Attempt.findById(attempt.id)).not.toBeNull();
    expect((await Result.findById(result.id)).score).toBe(1);
  });

  it('AC36-02: concurrent HTTP question edit/publication cannot publish invalid content or mutate a published answer key', async () => {
    const { agent, token } = await login();
    for (let index = 0; index < 4; index++) {
      const draft = await exam({ questions: [content] });
      const [published, edited] = await Promise.all([
        agent.post(`/api/exams/${draft.id}/publish`).set('X-CSRF-Token', token).send({}),
        agent.put(`/api/exams/${draft.id}/questions/${draft.questions[0].id}`).set('X-CSRF-Token', token).send({ options: [] }),
      ]);
      const stored = await Exam.findById(draft.id);
      if (published.status === 200) {
        expect([400, 409]).toContain(edited.status);
        expect(stored.status).toBe('Published');
        expect(stored.questions[0].options).toHaveLength(2);
      } else {
        expect([400, 409]).toContain(published.status);
        expect(edited.status).toBe(200);
        expect(stored.status).toBe('Draft');
      }
    }
  });
});

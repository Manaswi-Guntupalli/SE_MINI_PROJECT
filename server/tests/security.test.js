const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const request = require("supertest");

require("dotenv").config({
  path: path.resolve(__dirname, "../.env.test"),
  override: true,
});

const app = require("../app");
const User = require("../models/User");
const Exam = require("../models/Exam");

let instructor;
let instructor2;
let student;
let admin;

async function createUser(name, email, password, role, active = true) {
  const passwordHash = await bcrypt.hash(password, 12);

  return User.create({
    name,
    email,
    passwordHash,
    role,
    active,
  });
}

async function login(agent, email, password) {
  return agent
    .post("/api/auth/login")
    .send({ email, password });
}

async function getCsrfToken(agent) {
  const response = await agent.get("/api/auth/csrf-token");
  return response.body.csrfToken;
}

beforeAll(async () => {
  if (!process.env.MONGO_URI.includes("online_exam_portal_test")) {
    throw new Error(
      "Tests refused to run because MONGO_URI is not using online_exam_portal_test"
    );
  }

  await mongoose.connect(process.env.MONGO_URI);

  await User.deleteMany({});
  await Exam.deleteMany({});

  instructor = await createUser(
    "Test Instructor",
    "instructor@test.local",
    "Instructor123!",
    "Instructor"
  );

  instructor2 = await createUser(
    "Second Instructor",
    "instructor2@test.local",
    "Instructor234!",
    "Instructor"
  );

  student = await createUser(
    "Test Student",
    "student@test.local",
    "Student123!",
    "Student"
  );

  admin = await createUser(
    "Test Admin",
    "admin@test.local",
    "Admin123!",
    "Admin"
  );
});

afterAll(async () => {
  await Exam.deleteMany({});
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe("Authentication and RBAC", () => {
  test("rejects unauthenticated access to Instructor routes", async () => {
    const response = await request(app).get("/api/exams/mine");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");
  });

  test("rejects Student access to Instructor routes", async () => {
    const agent = request.agent(app);

    const loginResponse = await login(
      agent,
      "student@test.local",
      "Student123!"
    );

    expect(loginResponse.status).toBe(200);

    const response = await agent.get("/api/exams/mine");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Access denied");
  });

  test("rejects Admin access to Instructor routes", async () => {
    const agent = request.agent(app);

    const loginResponse = await login(
      agent,
      "admin@test.local",
      "Admin123!"
    );

    expect(loginResponse.status).toBe(200);

    const response = await agent.get("/api/exams/mine");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Access denied");
  });

  test("rejects an existing session after the user becomes inactive", async () => {
    const agent = request.agent(app);

    const loginResponse = await login(
      agent,
      "instructor2@test.local",
      "Instructor234!"
    );

    expect(loginResponse.status).toBe(200);

    await User.findByIdAndUpdate(instructor2._id, {
      active: false,
    });

    const response = await agent.get("/api/exams/mine");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication required");

    await User.findByIdAndUpdate(instructor2._id, {
      active: true,
    });
  });
});

describe("Instructor ownership and published exam protection", () => {
  test("prevents one Instructor from accessing another Instructor's exam", async () => {
    const exam = await Exam.create({
      title: "Ownership Test",
      description: "Automated ownership test",
      duration: 30,
      instructorId: instructor._id,
      status: "Draft",
    });

    const otherInstructor = request.agent(app);

    const loginResponse = await login(
      otherInstructor,
      "instructor2@test.local",
      "Instructor234!"
    );

    expect(loginResponse.status).toBe(200);

    const response = await otherInstructor.get(
      `/api/exams/${exam._id}`
    );

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Access denied");
  });

  test("prevents editing a published exam", async () => {
    const exam = await Exam.create({
      title: "Published Exam",
      description: "Must remain immutable",
      duration: 60,
      instructorId: instructor._id,
      status: "Published",
    });

    const agent = request.agent(app);

    const loginResponse = await login(
      agent,
      "instructor@test.local",
      "Instructor123!"
    );

    expect(loginResponse.status).toBe(200);

    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .put(`/api/exams/${exam._id}`)
      .set("X-CSRF-Token", csrfToken)
      .send({
        title: "Changed Published Exam",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Published exams cannot be edited"
    );

    const unchangedExam = await Exam.findById(exam._id);

    expect(unchangedExam.title).toBe("Published Exam");
  });

  test("prevents deleting a published exam", async () => {
    const exam = await Exam.create({
      title: "Published Delete Test",
      duration: 45,
      instructorId: instructor._id,
      status: "Published",
    });

    const agent = request.agent(app);

    const loginResponse = await login(
      agent,
      "instructor@test.local",
      "Instructor123!"
    );

    expect(loginResponse.status).toBe(200);

    const csrfToken = await getCsrfToken(agent);

    const response = await agent
      .delete(`/api/exams/${exam._id}`)
      .set("X-CSRF-Token", csrfToken);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      "Published exams cannot be deleted"
    );

    const stillExists = await Exam.findById(exam._id);

    expect(stillExists).not.toBeNull();
  });
});
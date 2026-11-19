const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { randomBytes } = require('node:crypto');
require("dotenv").config();

const User = require("../models/User");

const seedUsers = async () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Development seed accounts are not permitted in production. Use bootstrapAdmin.js.');
    process.exitCode = 1;
    return;
  }
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const testUsers = [
      {
        name: "Test Instructor",
        email: "instructor@test.com",
        role: "Instructor",
        active: true,
      },
      {
        name: "Second Instructor",
        email: "instructor2@test.com",
        role: "Instructor",
        active: true,
      },
      {
        name: "Test Student",
        email: "student@test.com",
        role: "Student",
        active: true,
      },
      {
        name: "Test Admin",
        email: "admin@test.com",
        role: "Admin",
        active: true,
      },
      {
        name: "Inactive User",
        email: "inactive@test.com",
        role: "Student",
        active: false,
      },
    ];

    for (const testUser of testUsers) {
      const password = randomBytes(18).toString('base64url');
      const passwordHash = await bcrypt.hash(password, 12);

      await User.findOneAndUpdate(
        { email: testUser.email },
        {
          name: testUser.name,
          email: testUser.email,
          passwordHash,
          role: testUser.role,
          active: testUser.active,
        },
        {
          upsert: true,
          new: true,
        }
      );

      console.log(`Created/updated: ${testUser.email} | temporary password: ${password}`);
    }

    console.log("Test users seeded successfully.");
  } catch (error) {
    console.error("Failed to seed users:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedUsers().catch(error => { console.error(error.message); process.exitCode = 1; });

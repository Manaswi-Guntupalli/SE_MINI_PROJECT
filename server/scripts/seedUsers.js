const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
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
        password: "Instructor123!",
        role: "Instructor",
        active: true,
      },
      {
        name: "Second Instructor",
        email: "instructor2@test.com",
        password: "Instructor234!",
        role: "Instructor",
        active: true,
      },
      {
        name: "Test Student",
        email: "student@test.com",
        password: "Student123!",
        role: "Student",
        active: true,
      },
      {
        name: "Test Admin",
        email: "admin@test.com",
        password: "Admin123!",
        role: "Admin",
        active: true,
      },
      {
        name: "Inactive User",
        email: "inactive@test.com",
        password: "Inactive123!",
        role: "Student",
        active: false,
      },
    ];

    for (const testUser of testUsers) {
      const passwordHash = await bcrypt.hash(testUser.password, 12);

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

      console.log(`Created/updated: ${testUser.email}`);
    }

    console.log("Test users seeded successfully.");
  } catch (error) {
    console.error("Failed to seed users:", error.message);
  } finally {
    await mongoose.disconnect();
  }
};

seedUsers();

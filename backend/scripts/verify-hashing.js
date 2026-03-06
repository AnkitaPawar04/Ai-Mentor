// backend/scripts/verify-hashing.js
import User from "../models/User.js";
import { sequelize } from "../config/db.js";
import dotenv from "dotenv";

dotenv.config();

const verifyHashing = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected.");

        const email = "a@gmail.com";
        const user = await User.findOne({ where: { email } });

        if (!user) {
            console.log("User a@gmail.com not found. Creating one...");
            const newUser = await User.create({
                name: "Test User",
                email,
                password: "oldpassword",
            });
            console.log("Created user with password 'oldpassword'");
            console.log("Hashed password in DB:", newUser.password);
        }

        const testUser = await User.findOne({ where: { email } });
        console.log("\n--- Testing Password Reset ---");
        const newPassword = "newpassword123";
        console.log("Setting password to:", newPassword);

        testUser.set("password", newPassword);
        console.log("Is password changed?", testUser.changed("password"));

        await testUser.save();
        console.log("User saved.");

        const updatedUser = await User.findOne({ where: { email } });
        console.log("Updated Hashed Password in DB:", updatedUser.password);

        const isMatched = await updatedUser.matchPassword(newPassword);
        console.log("Does new password match?", isMatched);

        if (isMatched) {
            console.log("✅ SUCCESS: Password was hashed and matches!");
        } else {
            console.log("❌ FAILURE: Password was NOT hashed correctly.");
        }

    } catch (error) {
        console.error("Verification failed:", error);
    } finally {
        process.exit();
    }
};

verifyHashing();

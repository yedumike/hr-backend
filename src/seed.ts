import "reflect-metadata"; // must be the very first import — TypeORM's decorators rely on this being loaded before anything else
import { AppDataSource } from "./data-source";
import { Role } from "./entities/Role";
import { User } from "./entities/User";
import bcrypt from "bcrypt"; // used to hash passwords — we never store plain text passwords in the DB

async function seed() {
  // open the connection to Neon (defined in data-source.ts)
  await AppDataSource.initialize();

  // repositories are TypeORM's way of querying/saving a specific entity/table
  const roleRepo = AppDataSource.getRepository(Role);
  const userRepo = AppDataSource.getRepository(User);

  // the 3 roles our system needs to exist before anyone can log in
  const roleNames = ["HR_ADMIN", "MANAGER", "EMPLOYEE"];

  // we'll store the created/found Role objects here, keyed by name,
  // so we can easily grab "HR_ADMIN" later when creating the admin user
  const roles: Record<string, Role> = {};

  for (const name of roleNames) {
    // check if this role already exists (so re-running this script is safe — "idempotent")
    let role = await roleRepo.findOne({ where: { name } });

    if (!role) {
      // doesn't exist yet — create and save it
      role = roleRepo.create({ name });
      await roleRepo.save(role);
      console.log(`Created role: ${name}`);
    }

    roles[name] = role;
  }

  // NOTE on the next block:
  // roles["HR_ADMIN"] is typed as `Role | undefined` by TypeScript,
  // because your tsconfig has `noUncheckedIndexedAccess: true` — this setting
  // forces us to prove a key actually exists before using it, since TS can't
  // verify that at compile time for a plain object lookup.
  // The fix pattern is always: assign to a variable, then `if (!x) throw`.
  // After that check, TypeScript "narrows" the type to just `Role` for the rest of the function.
  const adminRole = roles["HR_ADMIN"];
  if (!adminRole) {
    throw new Error("HR_ADMIN role was not created — seeding failed");
  }

  // check if an admin account already exists, so re-running this script doesn't duplicate it
  const existingAdmin = await userRepo.findOne({
    where: { email: "michaelntumyyedu@gmail.com" },
  });

  if (!existingAdmin) {
    // bcrypt.hash scrambles the password with a "salt" (random data) baked in,
    // so even if the DB leaks, raw passwords aren't exposed.
    // the "10" is the cost factor — higher = slower to compute = more secure, 10 is a solid default
    const passwordHash = await bcrypt.hash("Whatisthepassword4HRadmin?", 10);

    const admin = userRepo.create({
      email: "michaelntumyyedu@gmail.com",
      password_hash: passwordHash,
      role: adminRole,
    });

    await userRepo.save(admin);
    console.log("Created first admin: michaelntumyyedu@gmail.com / Whatisthepassword4HRadmin?");
  } else {
    console.log("Admin already exists, skipping.");
  }

  // close the DB connection cleanly when the script finishes
  await AppDataSource.destroy();
}

// run the seed function, and if anything throws, log it and exit with an error code
// (exit code 1 signals failure — useful if this is ever run in a CI/deploy pipeline)
// seed().catch((err) => {
//   console.error("Seed failed:", err);
//   process.exit(1);
// });

async function main() {
  try {
    await seed();
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

main();
/**
 * Creates (or promotes) an admin account from ADMIN_* environment variables.
 * Usage: npm run seed:admin
 */
const config = require('../src/config');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');

async function main() {
  const { ADMIN_NAME = 'Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in your .env file');
  }

  await connectDB(config.mongoUri);

  const email = ADMIN_EMAIL.toLowerCase();
  let user = await User.findOne({ email });
  if (user) {
    user.role = 'admin';
    await user.save();
    console.log(`Promoted existing user ${email} to admin`);
  } else {
    user = await User.create({ name: ADMIN_NAME, email, password: ADMIN_PASSWORD, role: 'admin' });
    console.log(`Created admin user ${email}`);
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);

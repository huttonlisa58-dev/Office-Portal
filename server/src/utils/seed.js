import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Employee from '../models/Employee.js';
import { ROLES } from '../config/constants.js';

async function run() {
  await connectDB();

  const email = process.env.SEED_ADMIN_EMAIL || 'admin@hrms.io';
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const name = process.env.SEED_ADMIN_NAME || 'Super Admin';

  // 1) Super admin (no company)
  let admin = await User.findOne({ email, company: null });
  if (!admin) {
    admin = await User.create({ name, email, password, role: ROLES.SUPER_ADMIN, company: null, isEmailVerified: true });
    console.log(`Created SUPER_ADMIN: ${email} / ${password}`);
  } else {
    console.log('SUPER_ADMIN already exists, skipping.');
  }

  // 2) Optional demo company + company admin + a couple of employees
  let demo = await Company.findOne({ slug: 'acme' });
  if (!demo) {
    demo = await Company.create({ name: 'Acme Inc', slug: 'acme', timezone: 'UTC' });
    const companyAdmin = await User.create({
      company: demo._id, name: 'Acme Admin', email: 'admin@acme.io',
      password: 'Acme@12345', role: ROLES.COMPANY_ADMIN, isEmailVerified: true,
    });
    const hr = await User.create({
      company: demo._id, name: 'Acme HR', email: 'hr@acme.io',
      password: 'Acme@12345', role: ROLES.HR, isEmailVerified: true,
    });
    const emp = await Employee.create({
      company: demo._id, employeeId: 'ACME-0001', firstName: 'Jane', lastName: 'Doe',
      email: 'jane@acme.io', phone: '+10000000000',
    });
    const empUser = await User.create({
      company: demo._id, name: 'Jane Doe', email: 'jane@acme.io',
      password: 'Acme@12345', role: ROLES.EMPLOYEE, employee: emp._id, isEmailVerified: true,
    });
    emp.user = empUser._id;
    await emp.save();
    console.log('Created demo company "Acme Inc" with admin@acme.io / hr@acme.io / jane@acme.io (pwd: Acme@12345)');
    void companyAdmin; void hr;
  } else {
    console.log('Demo company already exists, skipping.');
  }

  await mongoose.disconnect();
  console.log('Seed complete.');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });

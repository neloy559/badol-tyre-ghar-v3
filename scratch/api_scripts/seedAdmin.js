require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    const phone = '01711223344';
    const rawPassword = 'admin';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ phone });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    await User.create({
      phone,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      profile: {
        name: 'Master Admin',
        shopName: 'Badol Tyre Ghar',
      }
    });

    console.log('Admin created successfully!');
    console.log('Phone:', phone);
    console.log('Password:', rawPassword);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

seedAdmin();

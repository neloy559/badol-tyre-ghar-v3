const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/Badol Tyre Ghar - Products/version-3/backend/.env' });

const User = require('d:/Badol Tyre Ghar - Products/version-3/backend/src/modules/users/user.model');

async function checkAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const user = await User.findOne({ phone: '01647794452' }).lean();
    if (!user) {
      console.log('User 01647794452 not found.');
    } else {
      console.log('User Found:');
      console.log('- Name:', user.profile?.name);
      console.log('- Phone:', user.phone);
      console.log('- Role:', user.role);
      console.log('- IsVerified:', user.isVerified);
      console.log('- IsDeleted:', user.isDeleted);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkAdmin();

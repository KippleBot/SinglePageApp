const { randomUUID } = require('node:crypto')
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
require('dotenv').config()

const { Admin } = require('./models.cjs')

async function seedAdmin() {
  const { ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env
  if (!ADMIN_USERNAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD in server-api/.env.')
  }
  if (ADMIN_PASSWORD.length < 12 || ADMIN_PASSWORD.length > 128) {
    throw new Error('ADMIN_PASSWORD must be between 12 and 128 characters.')
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Set JWT_SECRET to a random secret of at least 32 characters.')
  }

  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/singlepagesite',
    { dbName: 'singlepagesite' }
  )
  await Admin.init()

  const adminID = process.env.ADMIN_ID?.trim() || randomUUID()
  const admin = await Admin.create({
    username: ADMIN_USERNAME.trim(),
    email: ADMIN_EMAIL.trim().toLowerCase(),
    password: await bcrypt.hash(ADMIN_PASSWORD, 12),
    adminID
  })

  console.log(`Admin created. Save this unique admin ID: ${admin.adminID}`)
}

seedAdmin()
  .catch((error) => {
    console.error('Could not create admin:', error.code === 11000
      ? 'Username, email, or admin ID already exists.'
      : error.message)
    process.exitCode = 1
  })
  .finally(() => mongoose.disconnect())

const express = require('express')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const { Admin, User } = require('./models.cjs')

const app = express()
const PORT = Number(process.env.PORT) || 5000
const COOKIE_NAME = 'admin_session'
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000
const JWT_ISSUER = 'astral-plane-site'

app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))
app.use(cookieParser())

function httpError(status, message) {
  const error = new Error(message)
  error.status = status
  return error
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}
// This code checks if the email has a @ in it and has characters before and after the @.
function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function validateUserFields(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const email = normalizeEmail(body.email)
  const age = body.age === '' || body.age === undefined ? null : body.age

  if (username.length < 2 || username.length > 40) {
    throw httpError(400, 'Username must be between 2 and 40 characters.')
  }
  if (!validEmail(email)) {
    throw httpError(400, 'Enter a valid email address.')
  }
  if (age !== null && (!Number.isInteger(age) || age < 0 || age > 100)) {
    throw httpError(400, 'Age must be a whole number from 0 to 100.')
  }
  else if (age < 15) {
    throw httpError(400, 'You must be at least 15 years old to register.')
  }

  return { username, email, age }
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_MS
  }
}

function requireAdmin(req, res, next) {
  const secret = process.env.JWT_SECRET
  if (!secret) return next(httpError(500, 'Server authentication is not configured.'))

  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return next(httpError(401, 'Admin sign-in is required.'))

  let claims
  try {
    claims = jwt.verify(token, secret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_ISSUER
    })
  } catch {
    return next(httpError(401, 'Admin sign-in has expired. Please sign in again.'))
  }

  if (claims.role !== 'admin' || !mongoose.isValidObjectId(claims.sub)) {
    return next(httpError(401, 'Admin sign-in is invalid.'))
  }

  Admin.findById(claims.sub)
    .select('_id username adminID')
    .then((admin) => {
      if (!admin) return next(httpError(401, 'Admin account is no longer available.'))
      req.admin = admin
      return next()
    })
    .catch(next)
}

app.post('/api/register', async (req, res) => {
  const { username, email, age } = validateUserFields(req.body || {})
  const password = typeof req.body.password === 'string' ? req.body.password : ''
  if (password.length < 8 || password.length > 128) {
    throw httpError(400, 'Password must be between 8 and 128 characters.')
  }

  const user = await User.create({
    username,
    email,
    age,
    password: await bcrypt.hash(password, 12)
  })

  res.status(201).json({
    message: 'Registration successful.',
    user: {
      _id: user._id,
      username: user.username,
      email: user.email,
      age: user.age
    }
  })
})

app.post('/api/admin/login', async (req, res) => {
  const { username, email, adminID } = req.body || {}
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (![username, email, adminID].every(value => typeof value === 'string' && value.trim())) {
    throw httpError(400, 'Enter your username, email, password, and admin ID.')
  }
  if (!password) throw httpError(400, 'Enter your password.')
  if (!process.env.JWT_SECRET) throw httpError(500, 'Server authentication is not configured.')
// this looks if there is an admin with the username, email, password and adminID
  // if it doesn't find one, it'll throw an error saying that the details are incorrect.
  const admin = await Admin.findOne({
    username: username.trim(),
    email: normalizeEmail(email),
    adminID: adminID.trim()
  }).select('+password')

  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    throw httpError(401, 'The admin sign-in details are incorrect.')
  }

  const token = jwt.sign(
    { role: 'admin' },
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      subject: admin.id,
      issuer: JWT_ISSUER,
      audience: JWT_ISSUER,
      expiresIn: '8h'
    }
  )

  res.cookie(COOKIE_NAME, token, cookieOptions())
  res.json({
    message: 'Signed in successfully.',
    admin: { username: admin.username, adminID: admin.adminID }
  })
})

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  })
  res.json({ message: 'Signed out.' })
})

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const users = await User.find()
    .select('_id username email age createdAt')
    .sort({ createdAt: -1 })
    .lean()
  res.json(users)
})

app.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid user ID.')

  const changes = validateUserFields(req.body || {})
  const user = await User.findByIdAndUpdate(req.params.id, changes, {
    new: true,
    runValidators: true,
    projection: '_id username email age createdAt'
  })
  if (!user) throw httpError(404, 'User not found.')
  res.json(user)
})

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw httpError(400, 'Invalid user ID.')
  const user = await User.findByIdAndDelete(req.params.id)
  if (!user) throw httpError(404, 'User not found.')
  res.json({ message: 'User deleted.' })
})

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)

  if (error.code === 11000) {
    return res.status(409).json({ message: 'That username, email, or admin ID is already in use.' })
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ message: 'The submitted data is invalid.' })
  }

  const status = Number.isInteger(error.status) ? error.status : 500
  if (status === 500) console.error('API request failed:', error)
  return res.status(status).json({
    message: status === 500 ? 'The server could not complete the request.' : error.message
  })
})

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('Set JWT_SECRET to a random secret of at least 32 characters in server-api/.env.')
  }

  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/singlepagesite',
    { dbName: 'singlepagesite' }
  )
  app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`))
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Backend failed to start:', error.message)
    process.exitCode = 1
  })
}

module.exports = { app, start }

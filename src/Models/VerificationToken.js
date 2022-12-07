import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const VerificationTokenSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now(),
  },
});

VerificationTokenSchema.pre('save', async function (next) {
  const salt = await bcrypt.genSalt(10);
  if (this.isModified('token')) {
    const hash = await bcrypt.hash(this.token, salt);
    this.token = hash;
  }
  next();
});

const VerifyToken = mongoose.model(
  'VerificationToken',
  VerificationTokenSchema
);
export default VerifyToken;

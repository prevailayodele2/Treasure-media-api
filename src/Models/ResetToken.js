import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const ResetTokenSchema = new mongoose.Schema({
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

ResetTokenSchema.pre('save', async function (next) {
  const salt = await bcrypt.genSalt(10);
  if (this.isModified('token')) {
    const hash = await bcrypt.hash(this.token, salt);
    this.token = hash;
  }
  next();
});

const ResetToken = mongoose.model(
  'ResetToken',
  ResetTokenSchema
);
export default ResetToken;

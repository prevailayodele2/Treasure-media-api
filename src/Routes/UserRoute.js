import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../Models/UserModel.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import verifyToken from './VerifyToken.js';
import Post from '../Models/PostModel.js';
//import { generateOTP } from './Mail/mail.js';
import VerifyToken from '../Models/VerificationToken.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import ResetToken from '../Models/ResetToken.js';

const JWTSEC = '#2@!@$ndja45883 r7##';

const generateOTP = () => {
  let OTP = '';
  for (let i = 0; i <= 3; i++) {
    let ranVal = Math.round(Math.random() * 9);
    OTP = OTP + ranVal;
  }
  return OTP;
};

const UserRoutes = express.Router();

// create user
UserRoutes.post(
  '/create/user',
  body('password').isLength({ min: 5 }),
  body('email').isEmail(),
  body('username').isLength({ min: 4 }),
  async (req, res) => {
    const { username, email, password, profile, phonenumber } = req.body;
    try {
      const error = validationResult(req);
      if (!error.isEmpty()) {
        return res.status(400).json('something went wrong');
      }
      const user = await User.findOne({ email: email });
      if (user) {
        return res.status(200).json('user with email already exist');
      }
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);
      const createdUser =  await User.create({
        username: username,
        email: email,
        password: hashedPassword,
        profile: profile,
        phonenumber: phonenumber,
      });
      const accessToken = jwt.sign(
        {
          id: user?._id,
          username: user?.username,
        },
        JWTSEC
      );
      await createdUser.save();
      const OTP = generateOTP();
      try {
        const verificationToken = await VerifyToken.create({
          user: createdUser?._id,
          token: OTP,
        });
        await verificationToken.save();
      } catch (error) {
        res.status(400).json(error)
      }
      var transport = nodemailer.createTransport({
        host: 'smtp.mailtrap.io',
        port: 2525,
        auth: {
          user: '8f4fcb3aae977e',
          pass: 'f79d430112c18c',
        },
      });
      await transport.sendMail({
        from: 'Treasure-media@gmail.com',
        to: createdUser?.email,
        subject: 'Verify your email using OTP',
        html: `<h1>Your OTP is ${OTP}</h1>`,
      });
      res.status(200).json({
        status: 'Pending',
        msg: 'Please check you email',
        user: createdUser?._id,
      });
    } catch (error) {
      res.status(500).json(error);
    }
  }
);

// verify user email
UserRoutes.post('/verify/email', async (req, res) => {
  // try {
  const { user, OTP } = req.body;
  const mainuser = await User.findById(user);
  if (!mainuser) return res.status(400).json('User not found');
  if (mainuser.verifed === true) {
    return res.status(400).json('User already verifed');
  }
  const token = await VerifyToken.findOne({ user: mainuser._id });
  if (!token) {
    return res.status(400).json('Sorry token not found');
  }
  const isMatch = await bcrypt.compareSync(OTP, token.token);
  if (!isMatch) {
    return res.status(400).json('Token is not valid');
  }

  mainuser.verifed = true;
  await VerifyToken.findByIdAndDelete(token._id);
  await mainuser.save();
  const accessToken = jwt.sign(
    {
      id: mainuser._id,
      username: mainuser.username,
    },
    JWTSEC
  );
  const { password, ...other } = mainuser._doc;
  const transport = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: process.env.MAILUSER,
      pass: process.env.MAILPASSWORD,
    },
  });
  transport.sendMail({
    from: 'Treasure-media@gmail.com',
    to: mainuser.email,
    subject: 'Email has been verified successfully',
    html: `Now you can login`,
  });
  return res.status(200).json({ other, accessToken });
  // } catch (error) {
  //   res.status(500).json({error: 'something went wrong verifying this user'})
  // }
});

//forget Password
UserRoutes.post('/forgetpassword', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email });
  if (!user) {
    return res.status(400).json('User not found');
  }
  const token = await ResetToken.findOne({ user: user._id });
  if (token) {
    return res
      .status(400)
      .json('After one hour you can request for another token');
  }
  const RandomTxt = crypto.randomBytes(20).toString('hex');
  const resetToken = new ResetToken({
    user: user._id,
    token: RandomTxt,
  });
  await resetToken.save();
  const transport = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: process.env.MAILUSER,
      pass: process.env.MAILPASSWORD,
    },
  });
  transport.sendMail({
    from: 'Treasure-media@gmail.com',
    to: user.email,
    subject: 'Reset Token',
    html: `<a href='http://localhost:3000/reset/password?token=${RandomTxt}&_id=${user._id}'> Click here to reset your password</a>`,
  });

  return res.status(200).json('Check your email to reset password');
});

//reset Password
UserRoutes.put('/reset/password', async (req, res) => {
  const { token, _id } = req.query;
  if (!token || !_id) {
    return res.status(400).json('Invalid request');
  }
  const user = await User.findOne({ _id: _id });
  if (!user) {
    return res.status(400).json('user not found');
  }
  const resetToken = await ResetToken.findOne({ user: user._id });
  if (!resetToken) {
    return res.status(400).json('Reset token is not found');
  }
  const isMatch = await bcrypt.compareSync(token, resetToken.token);
  if (!isMatch) {
    return res.status(400).json('Token is not valid');
  }

  const { password } = req.body;
  // const salt = await bcrypt.getSalt(10);
  const secpass = await bcrypt.hash(password, 10);
  user.password = secpass;
  await user.save();
  const transport = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
      user: process.env.MAILUSER,
      pass: process.env.MAILPASSWORD,
    },
  });
  transport.sendMail({
    from: 'Treasure-media@gmail.com',
    to: user.email,
    subject: 'Your password reset successfully',
    html: `Now you can login with new password`,
  });

  return res.status(200).json('Email has been sent');
});

//login
UserRoutes.post(
  '/login',
  body('password').isLength({ min: 5 }),
  body('email').isEmail(),
  async (req, res) => {
    const { email } = req.body;
    try {
      const error = validationResult(req);
      if (!error.isEmpty()) {
        return res.status(400).json('something went wrong');
      }
      const user = await User.findOne({ email: email });
      if (!user) {
        return res.status(400).json('user does not exist');
      }
      const decodePassword = await bcrypt.compare(
        req.body.password,
        user.password
      );
      if (!decodePassword) {
        return res.status(400).json('something went wront with your input');
      }
      const accessToken = jwt.sign(
        {
          id: user._id,
          username: user.username,
        },
        JWTSEC
      );
      req.headers.token = accessToken;
      const { password, ...other } = user._doc;
      res.status(200).json({ other, accessToken });
    } catch (error) {
      res
        .status(500)
        .json({ error: 'something went wrong loging in this user' });
    }
  }
);

//following
UserRoutes.put('/following/user/:id', verifyToken, async (req, res) => {
  try {
    if (req.params.id !== req.body.user) {
      const user = await User.findById(req.params.id);
      const otheruser = await User.findById(req.body.user);

      if (!user.Followers.includes(req.body.user)) {
        await user.updateOne({ $push: { Followers: req.body.user } });
        await otheruser.updateOne({ $push: { Following: req.params.id } });
        return res.status(200).json('User has been followed');
      } else {
        await user.updateOne({ $pull: { Followers: req.body.user } });
        await otheruser.updateOne({ $pull: { Following: req.params.id } });
        return res.status(200).json('User has been Unfollowed');
      }
    } else {
      return res.status(400).json("You can't follow yourself");
    }
  } catch (error) {}
});

//fetch post from followers
UserRoutes.get('/follower/post/:id', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const followersPost = await Promise.all(
      user.Following.map((item) => {
        return Post.find({ user: item });
      })
    );
    const userPost = await Post.find({ user: user._id });

    res.status(200).json(userPost.concat(...followersPost));
  } catch (error) {
    return res
      .status(500)
      .json('Something went wrong fetching User followers post');
  }
});

//update user Profile || password
UserRoutes.put('/update/:id', verifyToken, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        const secpass = await bcrypt.hash(req.body.password, salt);
        req.body.password = secpass;
        const updateuser = await User.findByIdAndUpdate(req.params.id, {
          $set: req.body,
        });
        await updateuser.save();
        res.status(200).json(updateuser);
      }
    } else {
      return res
        .status(400)
        .json('Your are not allow to update this user details ');
    }
  } catch (error) {
    return res.status(500).json('Internal server error');
  }
});

//delete user account
UserRoutes.delete('/delete/:id', verifyToken, async (req, res) => {
  try {
    if (req.params.id !== req.user.id) {
      return res.status(400).json("Account doesn't match");
    } else {
      const user = await User.findByIdAndDelete(req.params.id);
      return res.status(200).json('User account has been deleted');
    }
  } catch (error) {
    return res.status(500).json('Internal server error');
  }
});

//get following User
UserRoutes.get('/following/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const followinguser = await Promise.all(
      user.Following.map((item) => {
        return User.findById(item);
      })
    );

    let followingList = [];
    followinguser.map((person) => {
      const { email, password, phonenumber, Following, Followers, ...others } =
        person._doc;
      followingList.push(others);
    });

    res.status(200).json(followingList);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'something went wrong getting your folowing' });
  }
});

//get followers User
UserRoutes.get('/followers/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const followersuser = await Promise.all(
      user.Followers.map((item) => {
        return User.findById(item);
      })
    );

    let followersList = [];
    followersuser.map((person) => {
      const { email, password, phonenumber, Following, Followers, ...others } =
        person._doc;
      followersList.push(others);
    });

    res.status(200).json(followersList);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'something went wrong getting your followers' });
  }
});

//get user details for post
UserRoutes.get('/post/user/details/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(400).json('User not found');
    }
    const { email, password, phonenumber, ...others } = user._doc;
    res.status(200).json(others);
  } catch (error) {
    return res.status(500).json('Internal server error');
  }
});

//get user to follow
UserRoutes.get('/all/user/:id', async (req, res) => {
  try {
    const allUser = await User.find();
    const user = await User.findById(req.params.id);
    const followinguser = await Promise.all(
      user.Following.map((item) => {
        return item;
      })
    );
    let UserToFollow = allUser.filter((val) => {
      return !followinguser.find((item) => {
        return val._id.toString() === item;
      });
    });

    let filteruser = await Promise.all(
      UserToFollow.map((item) => {
        const {
          email,
          phonenumber,
          Followers,
          Following,
          password,
          ...others
        } = item._doc;
        return others;
      })
    );

    res.status(200).json(filteruser);
  } catch (error) {}
});
export default UserRoutes;

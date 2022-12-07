import express from 'express';
import Post from '../Models/PostModel.js';
import verifyToken from './VerifyToken.js';

const PostRoute = express.Router();

//create Post
PostRoute.post('/user/post', verifyToken, async (req, res) => {
  const { title, image, video } = req.body;
  try {
    const newpost = new Post({
      title: title,
      image: image,
      video: video,
      user: req.user.id,
    });
    const post = await newpost.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: 'something went wrong creating Post' });
  }
});

//get user post
PostRoute.get('/get/post/:id', async (req, res) => {
  try {
    const mypost = await Post.find({ user: req.params.id });
    if (!mypost) {
      return res.status(200).json("You don't have any post");
    }

    res.status(200).json(mypost);
  } catch (error) {
    res.status(500).json({ error: 'something went wrong gettin user Post' });
  }
});
//update post
PostRoute.put('/update/post/:id', async (req, res) => {
  //   try {
  let post = await Post.findById(req.params.id);
  if (!post) {
    return res.status(400).json('Post does not found');
  }
  post = await Post.findByIdAndUpdate(req.params.id, {
    $set: req.body,
  });
  let updatepost = await post.save();
  res.status(200).json(updatepost);
  //   } catch (error) {
  //     res.status(500).json({error: 'something went wrong updating Post'})
  //   }
});

//like and dislike

PostRoute.put('/:id/like', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post.like.includes(req.user.id)) {
      if (post.dislike.includes(req.user.id)) {
        await post.updateOne({ $pull: { dislike: req.user.id } });
      }
      await post.updateOne({ $push: { like: req.user.id } });
      return res.status(200).json('Post has been liked');
    } else {
      await post.updateOne({ $pull: { like: req.user.id } });
      return res.status(200).json('Post has been unlike');
    }
  } catch (error) {
    return res.status(500).json('something went wrong liking this post ');
  }
});
//dislike
PostRoute.put('/:id/dislike', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post.dislike.includes(req.user.id)) {
      if (post.like.includes(req.user.id)) {
        await post.updateOne({ $pull: { like: req.user.id } });
      }
      await post.updateOne({ $push: { dislike: req.user.id } });
      return res.status(200).json('Post has been disliked');
    } else {
      await post.updateOne({ $pull: { dislike: req.user.id } });
      return res.status(200).json('Post has been unlike');
    }
  } catch (error) {
    return res.status(500).json('Internal server error');
  }
});

//comment
PostRoute.put('/comment/post', verifyToken, async (req, res) => {
  try {
    const { comment, postid, profile } = req.body;
    const comments = {
      user: req.user.id,
      username: req.user.username,
      comment,
      profile,
    };
    const post = await Post.findById(postid);
    post.comments.push(comments);
    await post.save();
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: 'something went wrong comenting on a post' });
  }
});

// delete post
PostRoute.delete('/delete/post/:id', verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.user.toString() === req.user.id) {
      const deletepost = await Post.findByIdAndDelete(req.params.id);
      return res.status(200).json('You post has been deleted');
    } else {
      return res.status(400).json('You are not allow to delete this post');
    }
  } catch (error) {
    return res.status(500).json('Internal server error');
  }
});

export default PostRoute;

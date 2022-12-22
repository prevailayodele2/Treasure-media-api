import express from 'express'
import verifyToken from './VerifyToken.js'
import Message from '../Models/MessageModel.js'

const ChatRoute = express.Router()

//create message
ChatRoute.post('/msg', verifyToken, async (req, res)=>{
  const {from, to, message} = req.body
  try {
      const newMessage = await Message.create({
        message: message,
        Chatusers: [from, to],
        sender: from
      })
      return res.status(200).json(newMessage)
  } catch (error) {
   res.status(500).json({error: 'something went wrong creating chat message'}) 
  }
})

//get chat message
ChatRoute.get('/get/chat/msg/:mine/:sender', verifyToken, async (req, res)=>{
  const from = req.params.mine
  const to = req.params.sender
  try {
      const getMessage = await Message.find({
        Chatusers: {
            $all: [from, to]
        }
      }).sort({updatedAt:1})
      const allMessage = getMessage.map((msg)=>{
        return {
            myself: msg.sender.toString() === from,
            message: msg.message
        }
      })
      return res.status(200).json(allMessage)
  } catch (error) {
   res.status(500).json({error: 'something went wrong getting chat message'}) 
  }
})

export default ChatRoute
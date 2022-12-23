import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import UserRoutes from './Routes/UserRoute.js'
import PostRoute from './Routes/post.js'
import cors from 'cors'
import {Server} from 'socket.io'
import ChatRoute from './Routes/ChatRoute.js'

dotenv.config()

const MONGODBURL = "mongodb+srv://socialTreasure:oluwatominsin@cluster0.rng6kxn.mongodb.net/socialData?retryWrites=true&w=majority"
mongoose.connect(MONGODBURL).then(()=>{
    console.log('MongoDB Connected so start working')
}).catch((err)=>{
    console.log(err.message)
})
const app = express()

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/user', UserRoutes)
app.use('/api/post', PostRoute)
app.use('/api/chat', ChatRoute)

const PORT = process.env.Port || 5000
const server = app.listen(PORT, ()=>{
    console.log('Server running wild and not running madd')
})

const io = new Server(server, {
    cors:{
        origin: 'https://treasure-media.onrender.com',
        Credential: true
    }
})

global.onlineUsers = new Map()
io.on("connection", (socket)=>{
    global.chatsocket = socket
    socket.on('addUser', (id)=>{
        onlineUsers.set(id, socket.id)
        console.log('a user has connected')
    })
    socket.on("send-msg", (data)=>{
        const sendUserSocket = onlineUsers.get(data.to)
        if (sendUserSocket){
            socket.to(sendUserSocket).emit("msg-receive", data.message)
        }
     })
})
import express from 'express'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import UserRoutes from './Routes/UserRoute.js'
import PostRoute from './Routes/post.js'
import cors from 'cors'

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

const PORT = process.env.Port || 5000
app.listen(PORT, ()=>{
    console.log('Server running wild and not running madd')
})
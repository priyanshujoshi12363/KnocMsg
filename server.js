import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './src/db/index.js';
import UserRouter from './src/routers/UserRouter.js'
dotenv.config();

const app = express()
const port = process.env.PORT || 5000


app.use(cors()); 
app.use(express.json({ limit: "10mb" })); 
app.use(express.urlencoded({ extended: true })); 

app.use('/user' , UserRouter)

connectDB()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`✅ App running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("❌ DB Connection error:", error);
  });
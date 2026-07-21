import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";

const app = express();

const PORT = 8000;

app.use(express.json());
app.use(cors());

app.use("/api",chatRoutes);

app.listen(PORT, () => {
    console.log(`server is running on ${PORT}`);
    connectDB();
});

const connectDB= async() =>{
    try{
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("connected with DB");

    }catch(err){
        console.log("Failed to connect to db",err);

    }
}






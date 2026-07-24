import express from "express";
import Thread from "../models/Thread.js";
import getGroqAPIResponse from "../utils/groq.js";
import authMiddleware from "../middleware/auth.js";

const router=express.Router();

// Apply authMiddleware to all routes in this router
router.use(authMiddleware);

//Get All Threads
router.get("/thread",async(req,res)=>{
    try{
        const threads=await Thread.find({ userId: req.user.id }).sort({updatedAt:-1});
        res.json(threads);
    }catch(err){
        console.log(err);
        res.status(500).json({error:"Failed to fetch thread"});
    }
});

//Get Thread by ID
router.get("/thread/:threadId",async(req,res)=>{
    const {threadId} = req.params;

    try{
        const thread = await Thread.findOne({threadId, userId: req.user.id});
        if(!thread){
            return res.status(404).json({error:"Thread not found"});
        }
        res.json(thread.messages);
    }catch(err){
        console.log(err);
        res.status(500).json({error:"Failed to fetch chat"});
    }
});

//Delete Thread
router.delete("/thread/:threadId",async(req,res)=>{
    try{
        const {threadId} = req.params;
        const deletedThread=await Thread.findOneAndDelete({threadId, userId: req.user.id});

        if(!deletedThread){
            return res.status(404).json({error:"Thread not found"});
        }

        res.status(200).json({success:"Thread successfully deleted"});
    }catch(err){
        console.log(err);
        res.status(500).json({error:"Failed to delete thread"});
    }
});

//Create Chat Message / Continue Chat
router.post("/chat", async(req, res) => {
    const {threadId, message} = req.body;

    if(!threadId || !message) {
        return res.status(400).json({error: "missing required fields"});
    }

    try {
        let thread = await Thread.findOne({threadId, userId: req.user.id});

        if(!thread) {
            //create a new thread in Db
            thread = new Thread({
                userId: req.user.id,
                threadId,
                title: message.substring(0, 40) + (message.length > 40 ? "..." : ""),
                messages: [{role: "user", content: message}]
            });
        } else {
            thread.messages.push({role: "user", content: message});
        }

        // Pass the updated messages history to the Groq API helper
        const assistantReply = await getGroqAPIResponse(thread.messages);

        thread.messages.push({role: "assistant", content: assistantReply});
        thread.updatedAt = new Date();

        await thread.save();
        res.json({reply: assistantReply});
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "something went wrong"});
    }
});


export default router;
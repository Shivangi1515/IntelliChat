import express from "express";
import Thread from "../models/Thread.js";
import getGroqAPIResponse from "../utils/groq.js";

const router=express.Router();

//test

router.post("/test",async(req,res)=>{
    try{
        const thread=new Thread({
            threadId:"xyr",
            title: "Testing new Thread 2"
        });

        const response=await thread.save();
        res.send(response);

    }catch(err){
        console.log(err);
        res.status(500).json({error:"Failed to save in database"});

    }
});

//Get All Threads

router.get("/thread",async(req,res)=>{
    try{

        const threads=await Thread.find({}).sort({updatedAt:-1});
        //descending order of upadtedAt
        res.json(threads);

    }catch(err){

        console.log(err);
        res.status(500).json({error:"Failed to fetch thread"});

    }
});

router.get("/thread/:threadId",async(req,res)=>{
    const {threadId} = req.params;

    try{
        const thread = await Thread.findOne({threadId});
        if(!thread){
            return res.status(404).json({error:"Thread not found"});
        }
        res.json(thread.messages);

    }catch(err){
        console.log(err);
        res.status(500).json({error:"Failed to fetch chat"});

    }
});

router.delete("/thread/:threadId",async(req,res)=>{
    try{
        const {threadId} = req.params;
        const deletedThread=await Thread.findOneAndDelete({threadId});

        if(!deletedThread){
            return res.status(404).json({error:"Thread not found"});
        }

        res.status(200).json({success:"Thread successfully deleted"});


    }catch(err){
        console.log(err);
        res.status(500).json({error:"Failed to delete thread"});


    }
});

router.post("/chat", async(req, res) => {
    const {threadId, message} = req.body;

    if(!threadId || !message) {
        return res.status(400).json({error: "missing required fields"});
    }

    try {
        let thread = await Thread.findOne({threadId});

        if(!thread) {
            //create a new thread in Db
            thread = new Thread({
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
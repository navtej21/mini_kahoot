import  express  from "express";
import { createApp } from "./app.js";


const app=createApp();



app.listen(3000,()=>{
    console.log("hello world");
});
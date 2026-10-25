import  express  from "express";


const app=express();


app.get("/health",(req,res)=>{
    res.json({
        status:res.status,
        message:"success"
    })
});

app.listen(3000,()=>{
    console.log("hello world");
});
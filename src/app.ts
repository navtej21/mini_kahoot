import express from "express";
import { InMemoryRoomRepo } from "./repo/roomRepo.js";
import { RoomService } from "./service/roomService.js";
import { roomRoutes } from "./routes/rooms.js";
import { errorHandler,notFound } from "./middleware/errorhandler.js";


export function createApp(){
    const app=express();
    const repo=new InMemoryRoomRepo();
    const service=new RoomService(repo);
    app.use(express.json({
        limit:'50kb'
    }));
    app.get("/health",(req,res)=>{
        res.json({
            ok:true
        })
    });
    app.use("/rooms",roomRoutes(service));
    app.use(notFound);
    app.use(errorHandler);
    return app;
}


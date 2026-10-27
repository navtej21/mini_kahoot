import express from "express";
import { InMemoryRoomRepo } from "./repo/roomRepo.js";
import { RoomService } from "./service/roomService.js";
import { roomRoutes } from "./routes/rooms.js";
import { errorHandler,notFound } from "./middleware/errorhandler.js";
import { demoRouter } from "./sse/demo.js";
import { ConnectionManager } from "./sse/connectionmanager.js";
import { RoomBus } from "./sse/roombus.js";


export function createApp(){

    const bus=new RoomBus();
    const manager=new ConnectionManager(bus);
    const app=express();
    const repo=new InMemoryRoomRepo();
    const service=new RoomService(repo);
    app.use(express.json({
        limit:'50kb'
    }));
    app.use("/demo",demoRouter);
    
    app.get("/health",(req,res)=>{
        res.json({
            ok:true
        })
    });
    app.use("/rooms",roomRoutes(service,manager));
    app.use(notFound);
    app.use(errorHandler);
    return app;
}


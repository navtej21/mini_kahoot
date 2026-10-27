import { Router } from "express";

export const demoRouter=Router();


demoRouter.get("/stream",(req,res)=>{


   res.status(200).set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });


  res.flushHeaders();

 // 2. Send an event down the pipe
  res.write(`data: Hello from the server!\n\n`);

  // 3. Keep it open and send messages later...
  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify({ time: new Date() })}\n\n`);
  }, 1000);


  // 3. When the client leaves, stop the timer. Otherwise it runs forever.
  res.on('close', () => {
    clearInterval(interval);
    console.log('client left, timer stopped');
  });
})
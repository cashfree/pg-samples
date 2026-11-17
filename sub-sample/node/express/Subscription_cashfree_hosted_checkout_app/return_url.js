// Optional compatibility router. Mount this before other routes if needed.
// Verification, escaping and redacted diagnostics are handled by server.js.
const express=require('express');
const app=require('./server');
const router=express.Router();
router.all('/return-url',(req,res)=>{req.url='/return'+(req.url.includes('?')?req.url.slice(req.url.indexOf('?')):'');app(req,res);});
module.exports=router;

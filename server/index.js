const express = require("express");
const { Readable } = require("stream");
const bodyParser = require("body-parser");
const latex = require("node-latex");
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const cors = require("cors")

app.use(cors())

app.use(bodyParser.json());

app.post("/api/compile-latex", (req, res) => {
  const latexContent = req.body.content;

  if (!latexContent) {
    return res.status(400).send("LaTeX content is required");
  }

  const input = new Readable();
  input.push(latexContent);
  input.push(null);

  let output;
  try {
    output = latex(input);
  } catch (err) {
    console.error("Failed to initialize LaTeX compilation:", err);
    return res.status(500).send("Failed to initialize LaTeX compilation");
  }

  let chunks = [];
  output.on("data", (chunk) => {
    chunks.push(chunk);
  });

  output.on("end", () => {
    const pdfBuffer = Buffer.concat(chunks);
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=document.pdf",
      "Content-Length": pdfBuffer.length,
    });
    res.end(pdfBuffer);
  });

  output.on("error", (err) => {
    console.error("Failed to compile LaTeX:", err);
    res.status(500).send("Failed to compile LaTeX");
  });
});


io.on("connection",(socket)=>{
  console.log("Socket COnnected");
  socket.on("connectTo",(data)=>{
    socket.join(data.projectId)
  })
  socket.on("codeChange", (data)=>{
    socket.to(data.projectId).emit("changedCode",data.code)
  })
})



const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
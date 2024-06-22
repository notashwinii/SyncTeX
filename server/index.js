const express = require("express");
const { Readable } = require("stream");
const bodyParser = require("body-parser");
const latex = require("node-latex");
const app = express();

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
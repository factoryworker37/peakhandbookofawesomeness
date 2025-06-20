const express = require('express');
const express = require('express');
const bodyParser = require('body-parser');
const sanitize = require('sanitize-html');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
const PAGES_DIR = path.join(__dirname, 'public', 'pages');

[UPLOADS_DIR, PAGES_DIR].forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir); });

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/save', (req, res) => {
  const { title, content } = req.body;
  if (!title?.trim() || !content) return res.status(400).send("missing title or content");

  const safeHtml = sanitize(content, {
    allowedTags: sanitize.defaults.allowedTags.concat(['img', 'h1', 'h2', 'iframe']),
    allowedAttributes: {
      a: ['href'], img: ['src', 'alt'], iframe: ['src', 'width', 'height']
    }
  });

  const pageHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>${title}</title><link rel="stylesheet" href="/wiki.css"></head>
<body><h1>${title}</h1>${safeHtml}<p><a href="/">Go back to home</a></p></body></html>`;

  fs.writeFile(path.join(PAGES_DIR, `${title}.html`), pageHtml, err =>
    err ? res.status(500).send("error saving page") : res.send("saved")
  );
});

app.get('/api/pages', (_, res) => {
  fs.readdir(PAGES_DIR, (err, files) => {
    if (err) return res.json([]);
    res.json(files.filter(f => f.endsWith('.html')).map(f => f.replace('.html', '')));
  });
});

app.get('/wiki/:page', (req, res) => {
  res.sendFile(path.join(PAGES_DIR, `${req.params.page}.html`), err =>
    err ? res.status(404).send('page not found') : null
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`server running at http://localhost:${PORT}`));
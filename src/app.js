var http = require('http');
var fs = require('fs');
var index = fs.readFileSync('index.html');
const port = 80;

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(index);
}).listen(port, () => console.log(`releasetrain client listening at http://localhost:${port}`));
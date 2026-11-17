// Forward only the return endpoint through a public HTTPS tunnel.
const express = require('express');
const app = require('./server');
const returns = express();
returns.use((req, res) => {
  if (req.path !== '/return' || !['GET', 'POST'].includes(req.method)) {
    return res.status(404).send('Not found');
  }
  app(req, res);
});
if (require.main === module) {
  const port = process.env.RETURN_PORT || 4001;
  returns.listen(port, '127.0.0.1', () => console.log(`Return-only listener: http://127.0.0.1:${port}/return`));
}
module.exports = returns;

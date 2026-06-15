'use strict';

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`ewkwa-smufl-service listening on http://localhost:${PORT}`);
});

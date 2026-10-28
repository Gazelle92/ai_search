import http from 'node:http';
import { createHandler } from './lib/handler.js';
const port = Number(process.env.PORT || 3300);
http.createServer(createHandler()).listen(port, '127.0.0.1', () => console.log(`Fabric search: http://127.0.0.1:${port}`));

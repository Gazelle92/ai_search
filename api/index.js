import { createHandler } from '../server.js';

// One shared handler per warm instance; never starts a listening server on Vercel.
export default createHandler();

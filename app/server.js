import http from 'node:http';

const port = Number(process.env.PORT || 8080);
let ready = true;

export const handler = (request, response) => {
  if (request.url === '/healthz') return response.writeHead(200).end('ok');
  if (request.url === '/readyz') return response.writeHead(ready ? 200 : 503).end(ready ? 'ready' : 'not ready');
  if (request.url === '/orders' && request.method === 'GET') {
    return response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ orders: [], version: process.env.GIT_SHA || 'local' }));
  }
  return response.writeHead(404).end('not found');
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  http.createServer(handler).listen(port, () => console.log(`orders-api listening on ${port}`));
}

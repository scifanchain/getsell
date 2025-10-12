const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const cors = require('cors');
const Y = require('yjs');
const syncProtocol = require('y-protocols/sync');
const awarenessProtocol = require('y-protocols/awareness');
const encoding = require('lib0/encoding');
const decoding = require('lib0/decoding');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const docData = new Map();

const getDocData = (docname) => {
  let data = docData.get(docname);
  if (!data) {
    const ydoc = new Y.Doc();
    ydoc.gc = false;
    const awareness = new awarenessProtocol.Awareness(ydoc);
    data = { doc: ydoc, awareness, conns: new Map() };
    docData.set(docname, data);
    console.log('创建新文档:', docname);
  }
  return data;
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), connections: wss.clients.size, documents: docData.size });
});

const wss = new WebSocket.Server({ server });

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

wss.on('connection', (ws, req) => {
  let roomName = req.url.split('/').filter(p => p).pop() || 'default';
  if (roomName.includes('?')) roomName = roomName.split('?')[0];
  console.log('连接房间:', roomName);
  
  const data = getDocData(roomName);
  const { doc, awareness, conns } = data;
  const connId = Symbol();
  conns.set(connId, ws);
  
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MESSAGE_SYNC);
  syncProtocol.writeSyncStep1(encoder, doc);
  ws.send(encoding.toUint8Array(encoder));
  
  const docUpdateHandler = (update, origin) => {
    if (origin !== ws) {
      const enc = encoding.createEncoder();
      encoding.writeVarUint(enc, MESSAGE_SYNC);
      syncProtocol.writeUpdate(enc, update);
      ws.send(encoding.toUint8Array(enc));
    }
  };
  doc.on('update', docUpdateHandler);
  
  const awarenessChangeHandler = ({ added, updated, removed }) => {
    const changedClients = added.concat(updated).concat(removed);
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
    const msg = encoding.toUint8Array(enc);
    conns.forEach((conn) => { if (conn !== ws && conn.readyState === WebSocket.OPEN) conn.send(msg); });
  };
  awareness.on('update', awarenessChangeHandler);
  
  ws.on('message', (message) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const encoder = encoding.createEncoder();
      const messageType = decoding.readVarUint(decoder);
      if (messageType === MESSAGE_SYNC) {
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
        if (encoding.length(encoder) > 1) ws.send(encoding.toUint8Array(encoder));
      } else if (messageType === MESSAGE_AWARENESS) {
        awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), null);
      }
    } catch (err) {
      console.error('消息处理错误:', err);
    }
  });
  
  ws.on('close', () => {
    doc.off('update', docUpdateHandler);
    awareness.off('update', awarenessChangeHandler);
    conns.delete(connId);
    awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);
  });
});

const PORT = process.env.PORT || 4001;
server.listen(PORT, () => {
  console.log('Yjs服务器运行在端口', PORT);
});

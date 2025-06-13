let socket;

export const connectWebSocket = (onMessage) => {
  socket = new WebSocket("ws://localhost:5000/ws");
  socket.onmessage = (event) => onMessage(JSON.parse(event.data));
};

export const sendFrame = (blob) => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    blob.arrayBuffer().then((buffer) => socket.send(buffer));
  }
};

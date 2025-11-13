import socketio
import logging
from typing import Dict, Set

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins='*',
            logger=False,
            engineio_logger=False
        )
        self.connected_clients: Dict[str, Set[str]] = {}  # user_id -> set of session_ids
        self.session_to_user: Dict[str, str] = {}  # session_id -> user_id
        
        self._setup_handlers()

    def _setup_handlers(self):
        @self.sio.event
        async def connect(sid, environ, auth):
            logger.info(f"WebSocket client connected: {sid}")
            # Extract user_id from auth if available
            user_id = auth.get('user_id') if auth else None
            if user_id:
                if user_id not in self.connected_clients:
                    self.connected_clients[user_id] = set()
                self.connected_clients[user_id].add(sid)
                self.session_to_user[sid] = user_id
                logger.info(f"User {user_id} connected with session {sid}")

        @self.sio.event
        async def disconnect(sid):
            logger.info(f"WebSocket client disconnected: {sid}")
            user_id = self.session_to_user.pop(sid, None)
            if user_id and user_id in self.connected_clients:
                self.connected_clients[user_id].discard(sid)
                if not self.connected_clients[user_id]:
                    del self.connected_clients[user_id]

        @self.sio.event
        async def authenticate(sid, data):
            """Handle authentication after connection"""
            user_id = data.get('user_id')
            if user_id:
                if user_id not in self.connected_clients:
                    self.connected_clients[user_id] = set()
                self.connected_clients[user_id].add(sid)
                self.session_to_user[sid] = user_id
                await self.sio.emit('authenticated', {'status': 'success'}, to=sid)
                logger.info(f"User {user_id} authenticated with session {sid}")

    async def send_alert_to_user(self, user_id: str, alert_data: dict):
        """Send alert to a specific user"""
        if user_id in self.connected_clients:
            for sid in self.connected_clients[user_id]:
                try:
                    await self.sio.emit('alert:new', alert_data, to=sid)
                    logger.info(f"Alert sent to user {user_id} (session {sid})")
                except Exception as e:
                    logger.error(f"Failed to send alert to session {sid}: {e}")

    async def broadcast_alert(self, alert_data: dict):
        """Broadcast alert to all connected clients"""
        try:
            await self.sio.emit('alert:new', alert_data)
            logger.info(f"Alert broadcasted to all clients")
        except Exception as e:
            logger.error(f"Failed to broadcast alert: {e}")

    def get_asgi_app(self):
        """Get ASGI application for mounting"""
        return socketio.ASGIApp(self.sio)
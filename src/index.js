import app, { broadcastPushNotification } from './app.js';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Rise21 backend server running on http://localhost:${PORT}`);
});

export { broadcastPushNotification };
export default app;

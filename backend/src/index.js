const express = require('express');
const cors = require('cors');
const multer = require('multer');
const {
  createRouteFromImage,
  adjustRouteDistance,
  rebaseRoute,
  startRunSession,
  appendLocation,
  getRunSessionState,
  finishRunSession,
  listUserRuns,
  getMapConfig,
  normalizeProvider,
} = require('./services/routeService');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'tracecraft-backend' });
});

app.get('/v1/maps/config', (_req, res) => {
  res.json({ ok: true, ...getMapConfig() });
});

app.post('/v1/routes/from-image', upload.single('image'), async (req, res) => {
  try {
    const userId = req.body.userId || 'anonymous';
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'missing image file' });
    }
    const body = { ...req.body };
    const parseJsonField = (v) => {
      if (typeof v !== 'string') return v;
      try {
        return JSON.parse(v);
      } catch (_e) {
        return v;
      }
    };
    const route = await createRouteFromImage({
      userId,
      filename: req.file.originalname || 'upload',
      buffer: req.file.buffer,
      provider: normalizeProvider(body.provider),
      locale: body.locale,
      targetKm: Number(body.targetKm),
      startPoint: parseJsonField(body.startPoint),
      endPoint: parseJsonField(body.endPoint),
    });
    res.json({ ok: true, route });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'route generation failed' });
  }
});

app.post('/v1/routes/:routeId/adjust', async (req, res) => {
  try {
    const { routeId } = req.params;
    const targetKm = Number(req.body.targetKm);
    const route = adjustRouteDistance(routeId, targetKm);
    if (!route) {
      return res.status(404).json({ ok: false, error: 'route not found' });
    }
    res.json({ ok: true, route });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'adjust failed' });
  }
});

app.post('/v1/routes/:routeId/rebase', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { startPoint, endPoint, strategy } = req.body || {};
    const route = rebaseRoute(routeId, startPoint, endPoint, strategy);
    if (!route) {
      return res.status(404).json({ ok: false, error: 'route not found' });
    }
    res.json({ ok: true, route });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'rebase failed' });
  }
});

app.post('/v1/routes/:routeId/start-run', async (req, res) => {
  try {
    const { routeId } = req.params;
    const userId = req.body.userId || 'anonymous';
    const provider = req.body.provider;
    const session = startRunSession(routeId, userId, provider);
    if (!session) {
      return res.status(404).json({ ok: false, error: 'route not found' });
    }
    res.json({ ok: true, session });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'start run failed' });
  }
});

app.get('/v1/run/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const state = getRunSessionState(sessionId);
    if (!state) {
      return res.status(404).json({ ok: false, error: 'session not found' });
    }
    res.json({ ok: true, state });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'get state failed' });
  }
});

app.post('/v1/run/:sessionId/location', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const point = req.body;
    const updated = appendLocation(sessionId, point);
    if (!updated) {
      return res.status(404).json({ ok: false, error: 'session not found' });
    }
    res.json({ ok: true, acceptedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'location update failed' });
  }
});

app.post('/v1/run/:sessionId/finish', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const actualPath = req.body.actualPath || [];
    const result = finishRunSession(sessionId, actualPath);
    if (!result) {
      return res.status(404).json({ ok: false, error: 'session not found' });
    }
    res.json({ ok: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'finish failed' });
  }
});

app.get('/v1/users/me/runs', async (req, res) => {
  try {
    const userId = req.query.userId || 'anonymous';
    const runs = listUserRuns(userId);
    res.json({ ok: true, runs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'list runs failed' });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`TraceCraft backend listening on port ${port}`);
});


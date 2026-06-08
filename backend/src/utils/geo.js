function toRad(v) {
  return (v * Math.PI) / 180;
}

function pointDistanceMeters(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s1 = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return R * c;
}

function cumulativeLen(points) {
  const lens = [0];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += pointDistanceMeters(points[i - 1], points[i]);
    lens.push(total);
  }
  return { lens, total };
}

function resampleByDistance(points, spacingMeters = 8) {
  if (!Array.isArray(points) || points.length < 2 || spacingMeters <= 0) {
    return points || [];
  }
  const result = [points[0]];
  const { lens, total } = cumulativeLen(points);
  for (let d = spacingMeters; d < total; d += spacingMeters) {
    let i = 1;
    while (i < lens.length && lens[i] < d) {
      i += 1;
    }
    if (i >= points.length) {
      break;
    }
    const d0 = lens[i - 1];
    const d1 = lens[i];
    const ratio = d1 === d0 ? 0 : (d - d0) / (d1 - d0);
    const from = points[i - 1];
    const to = points[i];
    result.push({
      lat: from.lat + (to.lat - from.lat) * ratio,
      lng: from.lng + (to.lng - from.lng) * ratio,
      ts: Date.now() + result.length * 1000,
    });
  }
  result.push(points[points.length - 1]);
  return result;
}

function resampleByCount(points, targetCount = 120) {
  if (!Array.isArray(points) || points.length <= targetCount) {
    return points;
  }
  const step = Math.floor(points.length / targetCount);
  const out = [];
  for (let i = 0; i < points.length; i += step) {
    out.push(points[i]);
    if (out.length >= targetCount) {
      break;
    }
  }
  return out;
}

function angleSmooth(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return points || [];
  }
  const out = [points[0]];
  const toDeg = (v) => (v * 180) / Math.PI;
  for (let i = 1; i < points.length - 1; i += 1) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const angle1 = toDeg(Math.atan2(cur.lat - prev.lat, cur.lng - prev.lng));
    const angle2 = toDeg(Math.atan2(next.lat - cur.lat, next.lng - cur.lng));
    const diff = Math.abs(((angle2 - angle1 + 540) % 360) - 180);
    if (diff <= 110) {
      out.push(cur);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function scalePathPreserveShape(points, targetMeters, opts = {}) {
  if (!Array.isArray(points) || points.length < 2 || targetMeters <= 0) {
    return points || [];
  }
  const minPts = Number.isFinite(opts.minPoints) ? opts.minPoints : 3;
  const maxPts = Number.isFinite(opts.maxPoints) ? opts.maxPoints : points.length;
  let cur = 0;
  for (let i = 1; i < points.length; i += 1) {
    cur += pointDistanceMeters(points[i - 1], points[i]);
  }
  if (cur <= 0) {
    return points;
  }
  const ratio = targetMeters / cur;
  const center = latLngCentroid(points);
  const scaled = points.map((p, index) => {
    const nx = center.lat + (p.lat - center.lat) * ratio;
    const ny = center.lng + (p.lng - center.lng) * ratio;
    return {
      lat: nx,
      lng: ny,
      ts: points[index].ts || Date.now() + index * 1000,
    };
  });
  const smoothed = angleSmooth(scaled);
  return resampleByCount(smoothed, Math.min(Math.max(minPts, smoothed.length), maxPts));
}

function latLngCentroid(points) {
  const sum = points.reduce(
    (acc, p) => {
      acc.lat += p.lat;
      acc.lng += p.lng;
      return acc;
    },
    { lat: 0, lng: 0 }
  );
  return {
    lat: sum.lat / points.length,
    lng: sum.lng / points.length,
  };
}

module.exports = {
  pointDistanceMeters,
  scalePathPreserveShape,
  latLngCentroid,
  resampleByCount,
  resampleByDistance,
  angleSmooth,
};


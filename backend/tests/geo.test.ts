import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { GeoPoint } from '../../shared/types';
import { normalizePoint, normalizePoints } from '../src/services/geo-utils';
import {
  latLngCentroid,
  pointDistanceMeters,
  resampleByDistance,
  scalePathPreserveShape,
} from '../src/utils/geo';

function pathDistance(points: GeoPoint[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + pointDistanceMeters(points[index], point), 0);
}

test('normalizePoint keeps valid coordinates with fixed precision', () => {
  assert.deepEqual(normalizePoint({ lat: '30.123456789', lng: 120.987654321 }), {
    lat: 30.12345679,
    lng: 120.98765432,
  });
  assert.equal(normalizePoint({ lat: 'bad', lng: 120 }), null);
});

test('normalizePoints filters invalid points and adds timestamps', () => {
  const points = normalizePoints([{ lat: 1, lng: 2 }, { lat: NaN, lng: 3 }, { lat: 4, lng: 5 }]);

  assert.equal(points.length, 2);
  assert.equal(typeof points[0].ts, 'number');
});

test('resampleByDistance preserves first and last point', () => {
  const points: GeoPoint[] = [{ lat: 30, lng: 120 }, { lat: 30, lng: 120.01 }];
  const resampled = resampleByDistance(points, 100);

  assert.deepEqual(resampled[0], points[0]);
  assert.deepEqual(
    { lat: resampled[resampled.length - 1].lat, lng: resampled[resampled.length - 1].lng },
    points[1],
  );
  assert.ok(resampled.length > 2);
});

test('scalePathPreserveShape moves route distance toward target', () => {
  const points: GeoPoint[] = [
    { lat: 30, lng: 120 },
    { lat: 30, lng: 120.005 },
    { lat: 30.005, lng: 120.005 },
  ];
  const targetMeters = 2_000;
  const scaled = scalePathPreserveShape(points, targetMeters, { minPoints: 3, maxPoints: 20 });

  assert.ok(scaled.length >= 3);
  assert.ok(Math.abs(pathDistance(scaled) - targetMeters) < 150);
});

test('latLngCentroid returns arithmetic center', () => {
  assert.deepEqual(latLngCentroid([{ lat: 1, lng: 2 }, { lat: 3, lng: 6 }]), { lat: 2, lng: 4 });
});

import * as YUKA from 'yuka';
import type { TrackDefinition } from '../track/TrackDefinition.js';

/**
 * Samples the track centerline into a looping YUKA.Path.
 * Caller should clone the returned path per vehicle (YUKA.Path has internal _index state).
 */
export function buildYukaPath(track: TrackDefinition, waypointCount: number): YUKA.Path {
  const path = new YUKA.Path();
  path.loop = true;
  for (let i = 0; i < waypointCount; i++) {
    const t = i / waypointCount;
    const pt = track.getPointAt(t);
    path.add(new YUKA.Vector3(pt.x, 0, pt.z));
  }
  return path;
}

// Face-recognition attendance.
// DESIGN: the heavy lifting (face detection + 128-d embedding) is done on the
// client/edge using face-api.js or a TF.js model, so raw images never hit the server.
// The client sends an embedding; the server compares it to the stored one.
//
// To finish: capture employee.faceEmbedding at enrollment, then call verifyFace()
// during check-in (see attendance.controller -> checkIn with method=FACE).

export const FACE_MATCH_THRESHOLD = 0.55; // euclidean distance; lower = stricter

export function euclideanDistance(a = [], b = []) {
  if (!a.length || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export function verifyFace(storedEmbedding, candidateEmbedding) {
  const dist = euclideanDistance(storedEmbedding, candidateEmbedding);
  return { match: dist <= FACE_MATCH_THRESHOLD, distance: dist };
}

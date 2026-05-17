export function pointInPolygon(pt: { x: number; y: number }, poly: Array<{ x: number; y: number }>) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    if (yi === yj) continue;
    const intersect =
      yi > pt.y !== yj > pt.y && pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function screenToPlanFromRaster(
  locationX: number,
  locationY: number,
  fit: { originX: number; originY: number; displayW: number; displayH: number },
  zoom: number,
  panX: number,
  panY: number,
  minX: number,
  minY: number,
  planW: number,
  planH: number,
) {
  const localX = (locationX - fit.originX - panX) / zoom;
  const localY = (locationY - fit.originY - panY) / zoom;
  return {
    x: minX + (localX / fit.displayW) * planW,
    y: minY + (localY / fit.displayH) * planH,
  };
}

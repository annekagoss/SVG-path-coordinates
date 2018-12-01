/* BezierCurveGenerator */
/* This is Nash Vail's BezierCurveGenerator, adjusted a bit for this application */
/* https://github.com/nashvail/BezierCurveGenerator */

export class Point {
  constructor(x = 0, y = 0) {
    this.x = x;
    /*
			The reason to the following is because we
			want the origin to be at bottom left corner
			instead of the top left.
		*/
    this.y = y;
  }

  x() {
    return this.x;
  }

  y() {
    return this.y;
  }

  mark() {
    window.document
      .getElementById('graph')
      .insertAdjacentHTML(
        'beforeend',
        `<circle cx="${this.x}" cy="${this.y}" r="5" fill="#000" />`,
      );
  }
}

/*
* Class : BezierCurve( Collection of n points for a curve of degree n)
* ------------------------------------------------------------------
* Represents a Bezier curve, the number of points passed in the con-
* structor determine the degree of the curve.
*/

export class BezierCurve {
  constructor(points, plotHeight, samples) {
    this.plotHeight = plotHeight;
    if (points instanceof Point) {
      this.points = [];
      for (let i = 0; i < points.length; i++) {
        if (points[i] instanceof Point) {
          this.points.push(points[i]);
        }
      }
    } else if (typeof points === 'object') {
      this.points = points;
    } else {
      this.points = [];
    }

    // Drawing points are the number of points that render the curve,
    // the more the number of drawing points, smoother the curve.
    this.numDrawingPoints = samples;
    this.drawingPoints = [];

    this.calculateDrawingPoints();
  }

  calculateDrawingPoints() {
    const interval = 1 / this.numDrawingPoints;
    let t = interval;

    this.drawingPoints.push(this.calculateNewPoint(0));

    for (let i = 0; i < this.numDrawingPoints; i++) {
      this.drawingPoints.push(this.calculateNewPoint(t));
      t += interval;
    }
  }

  calculateNewPoint(t) {
    // Coordinates calculated using the general formula are relative to
    // origin at bottom left.
    let x = 0;
    let y = 0;
    const n = this.points.length - 1;
    for (let i = 0; i <= n; i++) {
      const bin = C(n, i) * (1 - t) ** (n - i) * t ** i;
      x += bin * this.points[i].x;
      y += bin * this.points[i].y;
    }

    return new Point(x, this.plotHeight - y);
  }
}

function C(n, k) {
  if (typeof n !== 'number' || typeof k !== 'number') {
    return false;
  }
  let coeff = 1;
  for (let x = n - k + 1; x <= n; x++) coeff *= x;
  for (let x = 1; x <= k; x++) coeff /= x;
  return coeff;
}

/*
* Class : Graph(id of the svg container)
* -------------------------------------------
* Represents a graph and exports methods for
* drawing lines and curves.
*/
export class Graph {
  constructor(id) {
    this.id = id
  }

  drawLine(point1, point2, id, stroke = 2, color = '#000000') {
    const el = document.getElementById(this.id)
    el && el.insertAdjacentHTML(
      'beforeend',
      `<line x1="${point1.x}" y1="${point1.y}" x2="${point2.x}" y2="${
        point2.y
      }" stroke="${color}" stroke-width="${stroke}" id="line"/>`,
    );
  }

  drawCurveFromPoints(points, id) {
    for (let i = 0; i < points.length; i++) {
      if (i + 1 < points.length) this.drawLine(points[i], points[i + 1], id);
    }
  }
}

// Utilty functions

export function drawHandles(graph, curve) {
  if (curve.points.length === 1) {
    curve.points[0].mark();
    return;
  }
  for (let i = 1; i < curve.points.length; i++) {
    if (i === 1 || i === curve.points.length - 1) {
      curve.points[i - 1].mark();
      curve.points[i].mark();
    }
    graph.drawLine(
      curve.points[i - 1],
      curve.points[i],
      1,
      i === 1 || i === curve.points.length - 1 ? '#00FF00' : '#AA4444',
    );
  }
  if (curve.points.length === 1) {
    curve.points[0].mark();
  }
}

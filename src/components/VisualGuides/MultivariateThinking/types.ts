export interface Point2D {
  x: number;
  y: number;
}

export interface Point {
  coords: number[]; // n-dimensional
}

export interface ClusterResult {
  centroid: Point2D;
  points: Point2D[];
  color: string;
}

export default {
  wrap(n: number, max: number) {
    return ((n - 1 + max) % max) + 1;
  },
  renderVisible(i: number, range:number, max: number): number[] {
    let visible: number[] = [];
    if(range > max) range = max;

    for (let offset = -range; offset <= range; offset++) {
      const val = this.wrap(i + offset, max);
      if (!visible.includes(val)) visible.push(val);
    }

    return visible;
  },
  circularRange(center: number, range: number, max: number) {
    let visible: number[] = [];
    for (let i = -range; i <= range; i++) {
      visible.push(this.wrap(center + i, max));
    }
    return visible;
  },
  circularDistance(a: number, b: number, max: number) {
    let diff = Math.abs(a - b);
    return Math.min(diff, max - diff);
  },
  itemDistance(visible: number[], a: number, b:number) {
    return Math.abs(visible.indexOf(a) - visible.indexOf(b));
  },
  indexDistance(a: number, b:number) {
    return Math.abs(a - b);
  },
  mapCircular<T>(arr: T[], start: number, count: number) {
    return Array.from({length: count}, (_, i) => arr[(start + i) % arr.length]);
  }
}
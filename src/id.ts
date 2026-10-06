const namespace = Math.random().toString(36).slice(2);
let next = 0;
export const uniqueId = () => `lg-${namespace}-${++next}`;

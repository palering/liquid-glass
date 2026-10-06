// Reproducible calibration oracle; experimental, outside runtime exports.
// Compare normalized maximum displacement at IOR 1.45, not slider numbers.
export function profile(t, kind) {
  t = Math.max(0, Math.min(1, t));
  if (kind === 'hermite') return {height: .5*t*t*(3-2*t), slope: 3*t*(1-t)};
  const v = kind === 'semicircle' ? t*(2-t) : 1-(1-t)**4;
  const numerator = kind === 'semicircle' ? .5*(1-t) : (1-t)**3;
  return {height: .5*Math.sqrt(Math.max(v, 0)), slope: Math.min(4, numerator/Math.sqrt(Math.max(v, 1e-6)))};
}
export function offset(t, kind, ior = 1.45) {
  const {height,slope} = profile(t,kind),nz=1/Math.hypot(slope,1),nx=slope*nz,eta=1/ior,k=1-eta*eta*(1-nz*nz);
  const rx=(eta*nz-Math.sqrt(k))*nx,rz=-eta+(eta*nz-Math.sqrt(k))*nz;
  return Math.abs(rx/Math.max(-rz,.05)*height);
}
const kinds=['hermite','semicircle','convex'],maxima=Object.fromEntries(kinds.map(kind=>[kind,Math.max(...Array.from({length:10001},(_,i)=>offset(i/10000,kind)))]));
const checks=[];
for(const kind of kinds)for(const ior of [1.01,1.45,2.5])for(const t of [0,1e-8,.001,.1,.5,.999,1]){
  const p=profile(t,kind),d=offset(t,kind,ior);checks.push({kind,ior,t,...p,offset:d,passed:Number.isFinite(d)&&p.height>=0&&p.height<=.5&&p.slope>=0&&p.slope<=4});
}
console.log(JSON.stringify({ior:1.45,samples:10001,maxSlope:4,minimumRoot:.001,maxOffsetPerBevel:maxima,gain:Object.fromEntries(kinds.map(k=>[k,maxima.hermite/maxima[k]])),checks,passed:checks.every(c=>c.passed),boundary:'Unit distance gradient and IOR 1.45 calibration; root floor and slope cap are stability conventions, not strict derivatives at the floor. Not a match to Studio or all IOR values.'},null,2));

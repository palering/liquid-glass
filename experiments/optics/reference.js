// CPU analysis oracle for the experimental geometry and height profiles.
// This is not part of the published runtime; GPU readback remains authoritative.
export function shapeDistance(p,half,radius,n){
 const d=p.map((v,i)=>Math.abs(v)-half[i]);
 if(d[0]>-radius&&d[1]>-radius){const q=p.map((v,i)=>Math.abs(v)-half[i]+radius);return Math.pow(Math.pow(q[0],n)+Math.pow(q[1],n),1/n)-radius;}
 return Math.min(Math.max(...d),0)+Math.hypot(...d.map(v=>Math.max(v,0)));
}
export function shapeGradient(p,half,radius,n){
 const d=p.map((v,i)=>Math.abs(v)-half[i]);
 if(d[0]>-radius&&d[1]>-radius){const q=p.map((v,i)=>Math.abs(v)-half[i]+radius),scale=Math.max(...q,1e-20),v=q.map(x=>x/scale),norm=Math.pow(v[0]**n+v[1]**n,1/n);return v.map((x,i)=>Math.sign(p[i])*Math.pow(x/Math.max(norm,1e-20),n-1));}
 const out=d.map(v=>Math.max(v,0)),length=Math.hypot(...out);
 if(length>0)return out.map((v,i)=>Math.sign(p[i])*v/length);
 if(d[0]===d[1])return p.map(v=>Math.sign(v)*.5);
 return d[0]>d[1]?[Math.sign(p[0]),0]:[0,Math.sign(p[1])];
}
export function heightProfile(depth,bevel){const t=Math.max(0,Math.min(1,depth/bevel));return{height:.5*bevel*t*t*(3-2*t),slope:3*t*(1-t)};}
export function transmittedRay(gradient,slope,ior){
 const length=Math.hypot(gradient[0]*slope,gradient[1]*slope,1),normal=[gradient[0]*slope/length,gradient[1]*slope/length,1/length],eta=1/ior,dot=-normal[2],k=1-eta*eta*(1-dot*dot);
 const ray=normal.map((v,i)=>eta*(i===2?-1:0)-(eta*dot+Math.sqrt(Math.max(k,0)))*v);
 return{normal,ray};
}

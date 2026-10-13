/**
 * The Jelly Resume's GLSL (WebGL2), ported verbatim from the playground. Differences:
 * the sky, stars and mist take a uAmt that fades the backdrop in over the real page
 * (the canvas is transparent until it does), and the playground's site-background
 * and floor shaders are gone (the real page is under the canvas; the fixed config
 * never uses the floor).
 */
export const HSV = `vec3 hsv(float h,float s,float v){ vec3 k=clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); return v*mix(vec3(1.0),k,s); }`
export const BODY_VS = `#version 300 es
in vec3 aPos; in vec2 aUv; in vec2 aLocal; in vec4 aRect; in float aJig; in float aSeed; in float aVis; in float aHl;
uniform mat4 uMVP; uniform float uLift, uLayerZ;
out vec2 vUv; out vec2 vLocal; out vec4 vRect; out float vJig; out float vSeed; out vec3 vWorld; out float vVis; out float vHl;
void main(){
  vUv=aUv; vLocal=aLocal; vRect=aRect; vJig=aJig; vSeed=aSeed; vVis=aVis; vHl=aHl;
  vec3 p = aPos; p.z += uLift + uLayerZ;
  vWorld = p; gl_Position = uMVP*vec4(p,1.0);
}`
export const BODY_FS = `#version 300 es
precision highp float; precision highp int;
in vec2 vUv; in vec2 vLocal; in vec4 vRect; in float vJig; in float vSeed; in vec3 vWorld; in float vVis; in float vHl;
uniform float uSearch; uniform vec3 uGlowA, uGlowB;
uniform sampler2D uAtlas; uniform float uShroom, uMelt, uDrip, uTime, uHue, uGummy, uTextFrac; uniform vec3 uJelly;
uniform vec3 uEye, uFogCol; uniform float uFog, uFogStart, uFogEnd;
uniform int uPass, uInkMode; uniform float uShine, uLayerShade, uRot; uniform vec2 uTexel; uniform vec3 uLight;
uniform sampler2D uSky;
out vec4 o;
${HSV}
vec4 ink(vec2 uv){ return texture(uAtlas, clamp(uv, vRect.xy, vRect.zw)); }
vec3 skyLook(vec3 d){ float c = cos(uRot), s = sin(uRot); d.xz = mat2(c, -s, s, c)*d.xz;
  return texture(uSky, vec2(atan(d.x, -d.z)/6.2831853 + 0.5, 0.5 - asin(clamp(d.y, -1.0, 1.0))/3.14159265)).rgb; }
void main(){
  if(vVis < 0.01) discard;
  vec4 t = ink(vUv); float a = t.a; vec3 c = t.rgb;
  float m = uShroom*uMelt;
  if(m > 0.01){
    float n = fract(sin(floor(vLocal.x*26.0 + vSeed*50.0)*12.9898)*43758.5453);
    float len = uDrip*m*(0.15 + n*0.85)*(0.7 + 0.3*sin(uTime*0.8 + vSeed*6.28 + vLocal.x*9.0));
    float h = vRect.w - vRect.y;
    for(int k = 1; k <= 10; k++){
      float f = float(k)/10.0; vec4 s = ink(vUv - vec2(0.0, f*len*h)); float w = 1.0 - f*0.8;
      if(s.a*w > a){ a = s.a*w; c = s.rgb; }
    }
  }
  // ---- finish: bevel normal from the glyph edges, then emboss / chrome / foil lighting ----
  vec3 V = normalize(uEye - vWorld);
  vec3 dp1 = dFdx(vWorld), dp2 = dFdy(vWorld);
  vec3 ns = normalize(cross(dp1, dp2)); if(dot(ns, V) < 0.0) ns = -ns;
  vec2 duv1 = dFdx(vUv), duv2 = dFdy(vUv);
  vec3 p2 = cross(dp2, ns), p1 = cross(ns, dp1);
  vec3 T = p2*duv1.x + p1*duv2.x, B = p2*duv1.y + p1*duv2.y;
  float im = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-12)); T *= im; B *= im;
  float ax = ink(vUv + vec2(uTexel.x, 0.0)).a - ink(vUv - vec2(uTexel.x, 0.0)).a;
  float ay = ink(vUv + vec2(0.0, uTexel.y)).a - ink(vUv - vec2(0.0, uTexel.y)).a;
  vec3 n = normalize(ns - (T*ax + B*ay)*1.8);
  vec3 L = normalize(uLight);
  float diff = max(dot(n, L), 0.0), spec = pow(max(dot(n, normalize(L + V)), 0.0), 48.0);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  if(uPass == 1){
    c *= uLayerShade; // extrusion sides: darker copies of the face
  } else if(uInkMode == 1){
    c = c*(0.7 + 0.45*diff) + vec3(spec)*0.6*uShine;
  } else if(uInkMode == 2){
    vec3 env = skyLook(reflect(-V, n));
    vec3 chrome = c*0.25 + env*1.5 + vec3(0.06);
    c = mix(c, chrome, 0.75*uShine) + vec3(spec)*(0.5 + 0.8*uShine) + env*fres*0.6*uShine;
  } else if(uInkMode == 3){
    vec3 iri = hsv(fract(dot(n, V)*1.4 + vWorld.x*0.07 + vWorld.y*0.05 + uTime*0.03), 0.75, 1.0);
    c = mix(c, mix(c*0.45, iri*0.9, 0.85), uShine) + vec3(spec)*0.6*uShine;
  }
  vec3 neon = hsv(fract(uTime*uHue + vWorld.x*0.05 + vWorld.y*0.08 + vSeed*0.15), 0.8, 1.0);
  c = mix(c, neon*1.15, uShroom);
  vec2 q = vec2(abs(vLocal.x-0.5)*2.0, abs(vLocal.y/uTextFrac-0.5)*2.0);
  float edge = max(q.x, q.y);
  float slab = (1.0 - smoothstep(0.82, 1.0, edge)) * step(vLocal.y, uTextFrac*1.08);
  float rim = smoothstep(0.7, 0.95, edge)*slab;
  vec3 jc = mix(uJelly, neon, uShroom);
  float ja = uGummy*clamp(vJig, 0.0, 1.0)*(0.16*slab + 0.38*rim);
  vec3 col = mix(jc*(0.8 + 0.4*rim), c, a);
  float cov = a + ja*(1.0 - a);
  // Finder: matches get a neon halo (a blurred copy of their own glyphs); everything else dims
  if(vHl > 0.01 && uPass == 0){
    // a fixed mip level, so the glow is the same width in the world at any zoom
    float ga = max(textureLod(uAtlas, clamp(vUv, vRect.xy, vRect.zw), 2.6).a, textureLod(uAtlas, clamp(vUv, vRect.xy, vRect.zw), 3.6).a*0.8);
    float halo = smoothstep(0.0, 0.45, ga)*vHl;
    vec3 gc = mix(uGlowA, uGlowB, 0.5 + 0.5*sin(uTime*1.6 + vSeed*6.28));
    col = mix(gc*(0.9 + 0.5*halo), col*0.85, a);
    cov = max(cov, halo*0.95);
  }
  // Words flying into the distance fade into the nebula
  float fd = smoothstep(uFogStart, uFogEnd, distance(vWorld, uEye))*uFog;
  col = mix(col, uFogCol, fd);
  float alpha = cov*vVis*(1.0 - 0.9*fd);
  if(alpha < 0.12) discard;
  alpha *= 1.0 - 0.72*uSearch*(1.0 - vHl);
  o = vec4(col*alpha, alpha);
}`
// The bending paper (mirrored on the CPU by bendZ in JS)
export const BEND = `
uniform float uBendA, uBendC, uBendT, uBendS; uniform vec2 uHalf;
float bendZ(vec2 p){
  vec2 q = p/uHalf; float t = uBendT;
  float z = uBendA*(0.55*sin(1.6*q.x + 0.5*t)*cos(1.2*q.y + 0.35*t) + 0.35*sin(2.3*q.y - 0.45*t + 0.8*q.x));
  float k = max(0.0, (q.x - q.y)*0.5 - 0.55)/0.45, k2 = max(0.0, (q.y - q.x)*0.5 - 0.7)/0.3;
  z += uBendC*(k*k*(0.85 + 0.15*sin(t*0.6)) + 0.5*k2*k2*(0.85 + 0.15*sin(t*0.5 + 2.0)));
  z += uBendS*(0.06*sin(p.y*1.3 + t*1.4) + 0.04*sin(p.x*0.9 + t));
  return z;
}`
// aSide: 0 front, 1 back, 2/3 the top/bottom edge of the rim (whose aUv carries the outward normal)
export const PAGE_VS = `#version 300 es
in vec3 aPos; in vec2 aUv; in float aSide;
uniform mat4 uMVP; uniform float uThick;
out vec2 vUv; out vec3 vWorld; out vec3 vN; out float vSide;
${BEND}
void main(){
  vUv = aUv; vSide = aSide; vec3 p = aPos;
  float z = bendZ(p.xy); vec2 e = vec2(0.03, 0.0);
  float zx = (bendZ(p.xy + e.xy) - bendZ(p.xy - e.xy))/0.06, zy = (bendZ(p.xy + e.yx) - bendZ(p.xy - e.yx))/0.06;
  vec3 n = normalize(vec3(-zx, -zy, 1.0));
  bool back = aSide > 0.5 && aSide < 1.5;
  p.z = z - ((back || aSide > 2.5) ? uThick : 0.0);
  if(back) n = -n;
  if(aSide > 1.5) n = normalize(vec3(aUv, 0.0) - n*dot(vec3(aUv, 0.0), n));
  vN = n; vWorld = p; gl_Position = uMVP*vec4(p, 1.0);
}`
export const PAGE_FS = `#version 300 es
precision highp float;
in vec2 vUv; in vec3 vWorld; in vec3 vN; in float vSide;
uniform float uShroom, uTime, uHue, uAspect, uGrain, uRot, uReveal, uDim; uniform sampler2D uBack, uGrainTex, uSky; uniform int uFinish;
uniform vec3 uEye, uLight, uScan;
out vec4 o;
${HSV}
vec3 skyLook(vec3 d){ float c = cos(uRot), s = sin(uRot); d.xz = mat2(c, -s, s, c)*d.xz;
  return texture(uSky, vec2(atan(d.x, -d.z)/6.2831853 + 0.5, 0.5 - asin(clamp(d.y, -1.0, 1.0))/3.14159265)).rgb; }
void main(){
  // Entrance: the page is printed top to bottom behind a neon scanline
  float dy = vWorld.y - uReveal;
  if(dy < 0.0) discard;
  vec3 L0 = normalize(uLight);
  if(vSide > 0.5){
    // the back and the edges: plain paper, lit by the bend
    vec3 Nn = normalize(vN); if(dot(Nn, normalize(uEye - vWorld)) < 0.0) Nn = -Nn;
    float gr = texture(uGrainTex, vWorld.xy*0.19).r;
    vec3 c = (vSide < 1.5 ? vec3(0.93, 0.94, 0.96) : vec3(0.84, 0.86, 0.9))*(1.0 - 0.06*gr*uGrain);
    if(uFinish == 3) c *= vec3(0.79, 0.82, 0.86);
    c *= 0.62 + 0.45*max(dot(Nn, L0), 0.0);
    c = mix(c, vec3(0.07, 0.03, 0.11), uShroom*0.92);
    c = mix(c, c*vec3(0.2, 0.23, 0.36), uDim*0.85);
    o = vec4(c, 1.0); return;
  }
  vec3 base = texture(uBack, vUv).rgb;
  vec2 guv = vUv*vec2(1.0, uAspect)*1.6;
  vec3 g = texture(uGrainTex, guv).rgb; // r: fine grain, g: fibers, b: mottling
  vec3 V = normalize(uEye - vWorld), L = normalize(uLight);
  float h = g.r*0.6 + g.g*0.4;
  vec3 NG = normalize(vN);
  vec3 n = normalize(vec3(-dFdx(h), dFdy(h), 0.0)*uGrain*5.0 + NG);
  float spec = pow(max(dot(reflect(-L, n), V), 0.0), 24.0);
  if(uFinish == 1){        // textured paper
    base *= (1.0 - uGrain*(0.08*g.r + 0.06*g.g))*mix(1.0, 0.93 + 0.1*g.b, uGrain);
    base *= 0.93 + 0.09*dot(n, L);
  } else if(uFinish == 2){ // holographic foil
    vec3 iri = hsv(fract(dot(V, vec3(0.3, 0.5, 0.8))*2.2 + vUv.y*1.3 + vUv.x*0.7 + uTime*0.01 + g.b*0.4), 0.4, 1.0);
    base *= mix(vec3(1.0), iri, 0.22 + 0.25*uGrain);
    base += vec3(spec)*0.35 + iri*pow(1.0 - max(dot(n, V), 0.0), 2.0)*0.15;
  } else if(uFinish == 3){ // brushed metal
    float streak = texture(uGrainTex, vec2(guv.x*0.08, guv.y*7.0)).g*0.6 + texture(uGrainTex, vec2(guv.x*0.05, guv.y*11.0)).r*0.4;
    vec3 metal = vec3(0.79, 0.82, 0.86)*(0.86 + 0.18*streak*uGrain + 0.06);
    vec3 env = skyLook(reflect(-V, normalize(n + vec3(0.0, (streak - 0.5)*0.2, 0.0))));
    base = base*metal + env*0.28 + vec3(spec)*0.3;
  }
  base *= 1.0 + 0.55*(dot(NG, L) - L.z); // the curves catch the light (flat = exactly the PDF)
  vec3 paper = mix(base, vec3(0.07, 0.03, 0.11), uShroom*0.92);
  vec3 neon = hsv(fract(uTime*uHue + vWorld.x*0.05 + vWorld.y*0.08), 0.8, 1.0);
  float edge = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)*uAspect)*8.5;
  paper = mix(paper, paper*vec3(0.2, 0.23, 0.36), uDim*0.85);
  paper += uScan*(exp(-dy*28.0)*1.6 + exp(-dy*5.0)*0.25)*step(-1e8, uReveal)*step(uReveal, 1e8);
  o = vec4(paper + neon*0.35*uShroom*(1.0 - smoothstep(0.0, 0.12, edge)), 1.0);
}`
// Comet sparks (like the hero's vortex): every particle is a capsule stretched along its recent motion, drawn as an
// instanced quad. One premultiplied pass both darkens a soft haze under the streak and adds the bright core, so it glows
// on white paper as well as in space.
export const PT_VS = `#version 300 es
in vec2 aCorner; in vec3 aPos; in vec3 aTail; in vec3 aCol; in float aAlpha; in float aId; in float aAge; in float aHeat;
uniform mat4 uMVP; uniform vec2 uView; uniform float uSize, uScale, uTime, uHue, uShroom, uFlash, uGlow, uDot, uTint; uniform int uMode, uHero; uniform vec3 uTintCol;
uniform vec3 uJelly, uNeonA, uNeonB, uNeonC, uElec, uBlue, uViolet;
out vec2 vP; out float vLen, vW, vHalo, vA, vHot, vPh; out vec3 vCol, vWorld;
${HSV}
void main(){
  vWorld = aPos; vA = aAlpha;
  vec4 h = uMVP*vec4(aPos, 1.0), t = uMVP*vec4(aTail, 1.0);
  if(aAlpha < 0.01 || h.w < 0.05){ gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  if(t.w < 0.05) t = h;
  vec2 sh = (h.xy/h.w*0.5 + 0.5)*uView, st = (t.xy/t.w*0.5 + 0.5)*uView, d = sh - st;
  float len = length(d);
  if(len > 160.0){ d *= 160.0/len; st = sh - d; len = 160.0; }
  vec2 dir = len > 0.01 ? d/len : vec2(1.0, 0.0), nrm = vec2(-dir.y, dir.x);
  float w = clamp(0.32*uSize*uScale/h.w, 0.9, 4.5);  // core radius, px: thin and crisp at any zoom
  // hero sparks: heat 0 is a pixel of the photo (an opaque dot sized to the sampling grid); heat 1 is a comet spark
  float heat = clamp(aHeat, 0.0, 1.0), ph = uHero == 1 ? 1.0 - heat : 0.0;
  w = mix(w, uDot, ph);
  float halo = mix(w*(1.5 + 2.4*uGlow), w*1.25, ph);
  vec2 sp = mix(st - dir*halo, sh + dir*halo, aCorner.x) + nrm*aCorner.y*halo;
  vP = vec2(mix(-halo, len + halo, aCorner.x), aCorner.y*halo); vLen = len; vW = w; vHalo = halo;
  gl_Position = vec4((sp/uView*2.0 - 1.0)*h.w, h.z, h.w);
  // color: comet = white-hot at the burst, cooling cyan → electric → blue → violet; fast sparks run hotter
  float r = fract(sin(aId*12.9898)*43758.5453), age = aAge*(0.8 + 0.4*r);
  vec3 comet = age < 0.12 ? mix(vec3(1.0), uNeonA, age/0.12) : age < 0.5 ? mix(uNeonA, uElec, (age - 0.12)/0.38)
             : age < 1.1 ? mix(uElec, uBlue, (age - 0.5)/0.6) : mix(uBlue, uViolet, clamp((age - 1.1)/0.9, 0.0, 1.0));
  comet = mix(comet, uNeonA, clamp(len/90.0, 0.0, 0.6));
  comet = mix(comet, uTintCol, uTint*(1.0 - smoothstep(0.05, 0.8, age))); // the 🍄 summon: the heat starts violet, then the usual ramp
  if(uMode == 4) vA *= mix(1.0, 0.45, clamp((age - 0.9)/1.4, 0.0, 1.0)*(1.0 - clamp(len/60.0, 0.0, 1.0))*(1.0 - ph)); // cooling sparks dim, like embers; fast ones stay lit (photo pixels don't)
  vec3 rainbow = hsv(fract(uTime*0.15 + aId*0.0137), 0.85, 1.0);
  vec3 neon = r < 0.45 ? uNeonA : r < 0.85 ? uNeonB : uNeonC;
  vec3 c = uHero == 1 ? mix(aCol, comet, heat) : uMode == 1 ? aCol : uMode == 2 ? rainbow : uMode == 3 ? neon : uMode == 4 ? comet : uJelly;
  vCol = mix(c, hsv(fract(uTime*uHue + aPos.x*0.05 + aPos.y*0.08), 0.85, 1.0), uShroom);
  vHot = uFlash*exp(-aAge*6.0); vPh = ph;
}`
export const PT_FS = `#version 300 es
precision highp float;
in vec2 vP; in float vLen, vW, vHalo, vA, vHot, vPh; in vec3 vCol, vWorld; out vec4 o;
uniform vec3 uEye; uniform float uFog, uFogStart, uFogEnd, uGlow;
void main(){
  float x = clamp(vP.x, 0.0, vLen), d = length(vec2(vP.x - x, vP.y));
  if(d > vHalo) discard;
  float along = vLen > 0.5 ? clamp(vP.x/vLen, 0.0, 1.0) : 1.0;
  float fade = mix(0.12, 1.0, along*along);              // bright head, fading tail
  float core = exp(-(d*d)/(vW*vW)*1.4)*fade;
  float glow = exp(-d/(vHalo*0.35))*fade*uGlow;
  float fd = smoothstep(uFogStart, uFogEnd, distance(vWorld, uEye))*uFog, k = vA*(1.0 - 0.85*fd);
  vec3 rgb = vCol*(core*1.2 + glow*0.7) + vec3(1.0)*core*core*(0.2 + vHot);
  float a = clamp(core*0.95 + glow*0.55, 0.0, 0.95); // enough coverage that the color, not the paper, shows through
  if(vPh > 0.001){ float pd = 1.0 - smoothstep(vW*0.95, vW*1.2, d); rgb = mix(rgb, vCol*pd, vPh); a = mix(a, pd, vPh); } // a photo pixel
  if(a*k < 0.004) discard;
  o = vec4(rgb*k, a*k);
}`
// Finder links: dots flowing along arcs from match to match, like a constellation
export const LINK_VS = `#version 300 es
in vec4 aPA; uniform mat4 uMVP; uniform float uScale; out float vA;
void main(){ gl_Position = uMVP*vec4(aPA.xyz, 1.0); gl_PointSize = clamp(0.06*uScale/gl_Position.w, 1.5, 14.0); vA = aPA.w; }`
export const LINK_FS = `#version 300 es
precision highp float; in float vA; uniform vec3 uCol; out vec4 o;
void main(){ float d = length(gl_PointCoord - 0.5)*2.0; if(d > 1.0) discard; float a = (1.0 - d)*(1.0 - d)*vA; o = vec4(mix(uCol, vec3(1.0), 0.35*(1.0 - d))*a, a); }`
// Black hole: a black core, a white photon ring and a swirling neon accretion disk
export const HOLE_VS = `#version 300 es
in vec2 aCorner; uniform mat4 uMVP; uniform vec3 uC, uRight, uUp; uniform float uSize; out vec2 vP;
void main(){ vP = aCorner; gl_Position = uMVP*vec4(uC + (uRight*aCorner.x + uUp*aCorner.y)*uSize, 1.0); }`
export const HOLE_FS = `#version 300 es
precision highp float; in vec2 vP; uniform float uTime, uAmt; uniform vec3 uA, uB; out vec4 o;
void main(){
  float r = length(vP); if(r > 1.0) discard;
  float ang = atan(vP.y, vP.x);
  float sw = 0.5 + 0.5*sin(ang*3.0 - uTime*7.0 + 7.0/(r + 0.12));
  float ring = exp(-pow((r - 0.38)/0.11, 2.0))*(0.5 + 0.7*sw);
  float disk = smoothstep(1.0, 0.35, r)*smoothstep(0.26, 0.5, r)*(0.2 + 0.5*sw)*0.7;
  float photon = exp(-pow((r - 0.29)/0.022, 2.0));
  float core = 1.0 - smoothstep(0.24, 0.28, r);
  // the disk has real coverage (so its neon shows over white paper), plus a dark falloff around the core
  float shade = exp(-pow(max(r - 0.26, 0.0)/0.22, 2.0))*0.55;
  float cov = clamp(max(core, max(shade, (ring*0.85 + disk*0.9)*smoothstep(1.0, 0.75, r))), 0.0, 1.0)*min(1.0, uAmt*3.0);
  vec3 c = (mix(uA, uB, sw)*(ring*0.95 + disk*0.75) + vec3(1.0)*photon*0.9)*(1.0 - core)*min(1.0, uAmt*3.0);
  o = vec4(c, max(cov, photon*min(1.0, uAmt*3.0)));
}`
export const NOISE = `
float hash(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x + p.y + p.z)); }
float vnoise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float a = 0.5, s = 0.0; for(int i = 0; i < 6; i++){ s += a*vnoise(p); p = p*2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; } return s; }`
export const QUAD_VS = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`
// Baked once into an equirectangular texture: the per-frame cost is one texture lookup per pixel
export const SKYBAKE_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform vec3 uA, uB, uC, uD, uBase, uSeed;
${NOISE}
void main(){
  float lon = (vUv.x - 0.5)*6.2831853, lat = (0.5 - vUv.y)*3.14159265;
  vec3 dir = vec3(sin(lon)*cos(lat), sin(lat), -cos(lon)*cos(lat));
  vec3 p = dir*2.2 + uSeed;
  vec3 q = vec3(fbm(p), fbm(p + vec3(5.2, 1.3, 2.8)), fbm(p + vec3(2.1, 7.7, 4.4)));
  float n = fbm(p + 2.6*q);
  float band = exp(-pow(dot(dir, normalize(vec3(0.35, 1.0, 0.25)))*2.0, 2.0));
  float dens = smoothstep(0.38, 0.85, n)*(0.3 + 0.7*band);
  vec3 col = mix(uA, uB, smoothstep(0.25, 0.75, q.x))*dens*1.3;
  col += uC*pow(dens, 3.0)*1.4;
  col *= 1.0 - 0.65*smoothstep(0.52, 0.72, fbm(p*3.1 + q*2.0))*band;
  // thin bright filaments in the clouds (the accent color, used sparingly)
  float fil = pow(1.0 - abs(2.0*fbm(p*1.6 + q*1.4) - 1.0), 10.0);
  col += uD*fil*smoothstep(0.1, 0.5, dens)*0.45;
  // the deep-blue haze everything sits in
  col += uBase*(0.18 + 0.55*band)*0.6 + vec3(0.004, 0.006, 0.012);
  vec3 cell = floor(dir*420.0);
  float st = hash(cell + uSeed);
  col += step(0.9982, st)*vec3(0.55 + 0.45*hash(cell + 3.0));
  o = vec4(col, 1.0);
}`
export const CLOUDBAKE_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
${NOISE}
void main(){
  vec2 p = vUv*2.0 - 1.0; float r = length(p);
  float n = fbm(vec3(vUv*3.2, 1.7)), n2 = fbm(vec3(vUv*6.5 + n, 4.2));
  float a = smoothstep(1.0, 0.1, r)*smoothstep(0.3, 0.9, n*0.75 + n2*0.5);
  o = vec4(1.0, 1.0, 1.0, a);
}`
export const GRAINBAKE_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
${NOISE}
void main(){
  float fine = vnoise(vec3(vUv*380.0, 1.0))*0.55 + vnoise(vec3(vUv*820.0, 2.0))*0.45;
  float f = 0.0;
  for(int k = 0; k < 3; k++){
    float ang = float(k)*2.1 + 0.4; vec2 d = vec2(cos(ang), sin(ang));
    vec2 p = vec2(dot(vUv, d)*700.0, dot(vUv, vec2(-d.y, d.x))*30.0);
    f += smoothstep(0.72, 1.0, vnoise(vec3(p, float(k)*5.0)));
  }
  o = vec4(fine, f/3.0, fbm(vec3(vUv*5.0, 3.0)), 1.0);
}`
export const SKY_VS = `#version 300 es
in vec2 aPos; uniform vec3 uFwd, uRight, uUp; uniform float uTf, uAsp; out vec3 vDir;
void main(){ vDir = uFwd + uRight*aPos.x*uTf*uAsp + uUp*aPos.y*uTf; gl_Position = vec4(aPos, 0.999, 1.0); }`
export const SKY_FS = `#version 300 es
precision highp float;
in vec3 vDir; uniform sampler2D uSky; uniform float uBright, uRot, uAmt; out vec4 o;
void main(){
  vec3 d = normalize(vDir); float c = cos(uRot), s = sin(uRot); d.xz = mat2(c, -s, s, c)*d.xz;
  vec2 uv = vec2(atan(d.x, -d.z)/6.2831853 + 0.5, 0.5 - asin(clamp(d.y, -1.0, 1.0))/3.14159265);
  o = vec4(texture(uSky, uv).rgb*uBright*uAmt, uAmt);
}`
export const STAR_VS = `#version 300 es
in vec3 aPos; in vec4 aInfo;
uniform mat4 uMVP; uniform float uTime, uDpr, uAmt; out vec3 vCol; out float vA;
void main(){
  gl_Position = uMVP*vec4(aPos, 1.0); gl_PointSize = aInfo.x*uDpr;
  vA = aInfo.w*(0.6 + 0.4*sin(uTime*(0.5 + aInfo.y*2.0) + aInfo.y*40.0))*uAmt;
  vCol = mix(vec3(0.72, 0.95, 1.0), vec3(0.9, 0.76, 1.0), aInfo.z);
}`
export const STAR_FS = `#version 300 es
precision highp float;
in vec3 vCol; in float vA; out vec4 o;
void main(){ float d = length(gl_PointCoord - 0.5)*2.0; if(d > 1.0) discard; float a = (1.0 - smoothstep(0.0, 1.0, d))*vA; o = vec4(vCol*a, a); }`
export const MIST_VS = `#version 300 es
in vec2 aCorner; in vec4 aCenter; in vec4 aColRot; in float aAlpha;
uniform mat4 uMVP; uniform vec3 uRight, uUp; out vec2 vUv; out vec3 vCol; out float vA;
void main(){
  float r = aColRot.w; vec2 c = mat2(cos(r), -sin(r), sin(r), cos(r))*aCorner;
  vec3 p = aCenter.xyz + (uRight*c.x + uUp*c.y)*aCenter.w;
  vUv = aCorner*0.5 + 0.5; vCol = aColRot.rgb; vA = aAlpha;
  gl_Position = uMVP*vec4(p, 1.0);
}`
export const MIST_FS = `#version 300 es
precision highp float;
in vec2 vUv; in vec3 vCol; in float vA; uniform sampler2D uCloud; out vec4 o;
void main(){ float a = texture(uCloud, vUv).a*vA; if(a < 0.003) discard; o = vec4(vCol*a, a); }`
// The cast (Phill, the shrimp): a skinned or static textured mesh, lit by the page's light,
// with a neon rim from the nebula, the words' fog and the shroom hue
export const CAST_VS = `#version 300 es
in vec3 aPos; in vec3 aNormal; in vec2 aUv; in vec4 aJoints; in vec4 aWeights;
uniform mat4 uMVP, uModel; uniform mat4 uJoints[32]; uniform bool uSkin;
out vec2 vUv; out vec3 vN; out vec3 vWorld;
void main(){
  mat4 sk = mat4(1.0);
  if(uSkin){
    vec4 w = aWeights/max(1e-4, aWeights.x + aWeights.y + aWeights.z + aWeights.w);
    sk = w.x*uJoints[int(aJoints.x)] + w.y*uJoints[int(aJoints.y)] + w.z*uJoints[int(aJoints.z)] + w.w*uJoints[int(aJoints.w)];
  }
  mat4 m = uModel*sk;
  vec4 wp = m*vec4(aPos, 1.0);
  vN = mat3(m)*aNormal; vUv = aUv; vWorld = wp.xyz;
  gl_Position = uMVP*wp;
}`
export const CAST_FS = `#version 300 es
precision highp float;
in vec2 vUv; in vec3 vN; in vec3 vWorld;
uniform sampler2D uTex, uGlowTex; uniform bool uHasGlow;
uniform vec3 uEye, uLight, uFogCol, uRimA, uRimB, uGlowCol;
uniform float uFog, uFogStart, uFogEnd, uShroom, uTime, uHue, uAlpha, uFlash, uRim, uAmbient;
out vec4 o;
${HSV}
void main(){
  vec3 base = texture(uTex, vUv).rgb;
  vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
  vec3 V = normalize(uEye - vWorld);
  float diff = max(dot(n, normalize(uLight)), 0.0);
  float fres = pow(1.0 - max(dot(n, V), 0.0), 2.2);
  vec3 c = base*(uAmbient + (1.0 - uAmbient)*diff);
  c += mix(uRimB, uRimA, 0.5 + 0.5*n.y)*fres*uRim;
  if(uHasGlow) c += texture(uGlowTex, vUv).rgb*uGlowCol;
  vec3 neon = hsv(fract(uTime*uHue + vWorld.x*0.05 + vWorld.y*0.08), 0.8, 1.0);
  c = mix(c, c*0.45 + neon*(0.35 + 0.65*fres), uShroom*0.65);
  c += vec3(0.9, 0.95, 1.0)*uFlash;
  float fd = smoothstep(uFogStart, uFogEnd, distance(vWorld, uEye))*uFog;
  c = mix(c, uFogCol, fd);
  float a = uAlpha*(1.0 - 0.85*fd);
  o = vec4(c*a, a);
}`

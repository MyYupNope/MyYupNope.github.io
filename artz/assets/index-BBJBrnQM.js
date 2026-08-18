import{C as Dt,S as St,O as At,W as Pt,V as le,B as Ye,a as ne,D as Ee,b as _e,A as qe,P as Ke,N as bt,c as Et,L as at,d as Rt,M as Ct,e as ze}from"./three-DqLVpfpE.js";(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const l of document.querySelectorAll('link[rel="modulepreload"]'))a(l);new MutationObserver(l=>{for(const o of l)if(o.type==="childList")for(const p of o.addedNodes)p.tagName==="LINK"&&p.rel==="modulepreload"&&a(p)}).observe(document,{childList:!0,subtree:!0});function i(l){const o={};return l.integrity&&(o.integrity=l.integrity),l.referrerPolicy&&(o.referrerPolicy=l.referrerPolicy),l.crossOrigin==="use-credentials"?o.credentials="include":l.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function a(l){if(l.ep)return;l.ep=!0;const o=i(l);fetch(l.href,o)}})();const Ft=`
uniform vec3 uHeatCold;
uniform vec3 uHeatWarm;
uniform vec3 uHeatHot;
uniform float uHeatDistance;
uniform float uPointSizeTrail;
uniform float uPixelRatio;
uniform float uPointScale;
uniform float uTornadoActive;
uniform float uTornadoFadeStart;
uniform float uTornadoFadeEnd;

attribute vec3 homePosition;
attribute vec3 livePosition;
attribute float funnelT;

varying vec3 vColor;
varying float vSpeed;
varying float vTornadoFade;

void main() {
    float movement = length(position - homePosition);
    float heat = smoothstep(0.05, uHeatDistance, movement);
    vec3 heatMap = (heat < 0.5)
        ? mix(uHeatCold, uHeatWarm, heat * 2.0)
        : mix(uHeatWarm, uHeatHot, (heat - 0.5) * 2.0);

    vSpeed = clamp(length(livePosition - position) / uHeatDistance, 0.0, 1.0);
    vColor = heatMap;
    float funnelFade = clamp(
        (funnelT - uTornadoFadeStart) / max(uTornadoFadeEnd - uTornadoFadeStart, 1e-4),
        0.0, 1.0);
    vTornadoFade = mix(1.0, 0.14 + 0.86 * funnelFade, uTornadoActive);

    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uPointSizeTrail * uPixelRatio * uPointScale * (0.5 + 1.4 * vSpeed);
}
`,Lt=`
uniform float uTrailStrength;
varying vec3 vColor;
varying float vSpeed;
varying float vTornadoFade;

void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float alpha = (1.0 - smoothstep(0.0, 1.0, r)) * vSpeed * vSpeed * uTrailStrength;
    alpha *= vTornadoFade;
    gl_FragColor = vec4(vColor, alpha);
}
`,zt=`
attribute float aLife;
varying float vLife;

void main() {
    vLife = aLife;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.5 + 3.0 * aLife);
}
`,Ut=`
varying float vLife;

void main() {
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float a = (1.0 - r) * vLife;
    vec3 c = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.95, 0.7), vLife);
    gl_FragColor = vec4(c, a);
}
`;let we=null,Xe=null;function Wt(){return!we&&(window.AudioContext||window.webkitAudioContext)&&(we=new(window.AudioContext||window.webkitAudioContext)),we&&we.state==="suspended"&&we.resume(),we}function be(e){if(Xe)return Xe;const t=e.sampleRate*2,i=e.createBuffer(1,t,e.sampleRate),a=i.getChannelData(0);for(let l=0;l<t;l++)a[l]=Math.random()*2-1;return Xe=i,i}function kt(e,t){const i=Wt();if(!i)return;const a=typeof e=="object"&&e!==null?e:{soundDuration:e||t},l=a.motionStyle!=null?a.motionStyle:typeof state<"u"&&state&&state.motionStyle!=null?state.motionStyle:0,o=i.currentTime,p=i.createGain();p.gain.setValueAtTime(1e-4,o),p.gain.linearRampToValueAtTime(.4,o+.02),p.connect(i.destination);const c=a.soundDuration||t||1.5,y=a.soundPitch||140,R=a.soundType||"sine";if(l===1){const D=i.createBufferSource();D.buffer=be(i),D.loop=!0;const b=i.createBiquadFilter();b.type="bandpass",b.frequency.setValueAtTime(60,o),b.frequency.linearRampToValueAtTime(180,o+3.5),b.frequency.exponentialRampToValueAtTime(580,o+6),b.frequency.linearRampToValueAtTime(320,o+8),b.frequency.linearRampToValueAtTime(220,o+11.5),b.frequency.exponentialRampToValueAtTime(45,o+15),b.Q.value=2.8;const A=i.createGain();A.gain.setValueAtTime(1e-4,o),A.gain.exponentialRampToValueAtTime(.18,o+3),A.gain.linearRampToValueAtTime(.38,o+6),A.gain.linearRampToValueAtTime(.24,o+11.5),A.gain.exponentialRampToValueAtTime(1e-4,o+15),D.connect(b),b.connect(A),A.connect(p),D.start(o),D.stop(o+15+.1),setTimeout(()=>{try{D.disconnect(),b.disconnect(),A.disconnect(),p.disconnect()}catch{}},(15+.2)*1e3);return}if(l===2){const D=i.createBufferSource();D.buffer=be(i),D.loop=!0;const b=i.createBiquadFilter();b.type="bandpass",b.frequency.setValueAtTime(90,o),b.frequency.linearRampToValueAtTime(130,o+1),b.frequency.linearRampToValueAtTime(75,o+3),b.frequency.exponentialRampToValueAtTime(620,o+6.6),b.frequency.exponentialRampToValueAtTime(100,o+10.2),b.frequency.exponentialRampToValueAtTime(50,o+11.8),b.Q.value=1.2;const A=i.createGain();A.gain.setValueAtTime(1e-4,o),A.gain.exponentialRampToValueAtTime(.14,o+1),A.gain.exponentialRampToValueAtTime(.01,o+3),A.gain.linearRampToValueAtTime(.32,o+6.6),A.gain.linearRampToValueAtTime(.05,o+10.2),A.gain.exponentialRampToValueAtTime(1e-4,o+11.8),D.connect(b),b.connect(A),A.connect(p),D.start(o),D.stop(o+11.8+.1),setTimeout(()=>{try{D.disconnect(),b.disconnect(),A.disconnect(),p.disconnect()}catch{}},(11.8+.2)*1e3);return}if(l===3){const D=typeof i.createStereoPanner=="function"?i.createStereoPanner():null;D&&(D.pan.setValueAtTime(-.85,o),D.pan.linearRampToValueAtTime(.85,o+7.5),D.connect(p));const b=D||p,A=i.createBufferSource();A.buffer=be(i),A.loop=!0;const W=i.createBiquadFilter();W.type="bandpass",W.frequency.setValueAtTime(120,o),W.frequency.exponentialRampToValueAtTime(320,o+2.2),W.frequency.exponentialRampToValueAtTime(680,o+4.5),W.frequency.linearRampToValueAtTime(220,o+6),W.frequency.exponentialRampToValueAtTime(35,o+7.5),W.Q.value=2.2;const k=i.createGain();k.gain.setValueAtTime(1e-4,o),k.gain.exponentialRampToValueAtTime(.16,o+1.8),k.gain.linearRampToValueAtTime(.48,o+4.5),k.gain.linearRampToValueAtTime(.18,o+6),k.gain.exponentialRampToValueAtTime(1e-4,o+7.5),A.connect(W),W.connect(k),k.connect(b),A.start(o),A.stop(o+7.5+.1);const B=i.createOscillator();B.type="sine",B.frequency.setValueAtTime(36,o),B.frequency.linearRampToValueAtTime(46,o+2.2),B.frequency.linearRampToValueAtTime(64,o+4.5),B.frequency.linearRampToValueAtTime(32,o+6),B.frequency.exponentialRampToValueAtTime(18,o+7.5);const I=i.createGain();I.gain.setValueAtTime(1e-4,o),I.gain.exponentialRampToValueAtTime(.22,o+1.8),I.gain.linearRampToValueAtTime(.55,o+4.5),I.gain.linearRampToValueAtTime(.16,o+6),I.gain.exponentialRampToValueAtTime(1e-4,o+7.5),B.connect(I),I.connect(b),B.start(o),B.stop(o+7.5+.1),setTimeout(()=>{try{A.disconnect(),W.disconnect(),k.disconnect(),B.disconnect(),I.disconnect(),D&&D.disconnect(),p.disconnect()}catch{}},(7.5+.2)*1e3);return}const m=Math.max(1.8,c),f=i.createBufferSource();f.buffer=be(i);const g=i.createBiquadFilter();g.type="bandpass",g.frequency.setValueAtTime(1200,o),g.frequency.exponentialRampToValueAtTime(180,o+.25),g.Q.value=1.2;const T=i.createGain();T.gain.setValueAtTime(.75,o),T.gain.exponentialRampToValueAtTime(.001,o+.35),f.connect(g),g.connect(T),T.connect(p),f.start(o),f.stop(o+.4);const w=i.createBufferSource();w.buffer=be(i),w.loop=!0;const v=i.createBiquadFilter();v.type="lowpass",v.frequency.setValueAtTime(450,o),v.frequency.exponentialRampToValueAtTime(65,o+m);const h=i.createGain();h.gain.setValueAtTime(.65,o),h.gain.exponentialRampToValueAtTime(1e-4,o+m),w.connect(v),v.connect(h),h.connect(p),w.start(o),w.stop(o+m+.05);const P=i.createOscillator();P.type=R||"sine",P.frequency.setValueAtTime(Math.max(y,120),o),P.frequency.exponentialRampToValueAtTime(26,o+Math.min(1.2,m));const S=i.createGain();S.gain.setValueAtTime(.7,o),S.gain.exponentialRampToValueAtTime(.001,o+m),P.connect(S),S.connect(p),P.start(o),P.stop(o+m+.05),setTimeout(()=>{try{f.disconnect(),g.disconnect(),T.disconnect(),w.disconnect(),v.disconnect(),h.disconnect(),P.disconnect(),S.disconnect(),p.disconnect()}catch{}},(m+.1)*1e3)}function Be(e,t){t.funnelBottom,t.funnelHeight;const i=t.funnelWaistT!=null?t.funnelWaistT:t.funnelWaistU||.42,a=t.funnelTailRadius!=null?t.funnelTailRadius:.8,l=t.funnelWaistRadius!=null?t.funnelWaistRadius:3.5,o=t.funnelCrownRadius!=null?t.funnelCrownRadius:22,p=t.funnelCrownExp||1.4;if(e<=i){const c=e/Math.max(.01,i);return a+(l-a)*(c*c)}else{const c=(e-i)/Math.max(.01,1-i);return l+(o-l)*Math.pow(c,p)}}const it=.06081006264583979;function gt(e,t,i,a,l,o,p,c,y,R,m){const f=Be(l,R),g=Math.atan2(p,o),T=Math.sqrt(t*t+a*a),w=3.5,v=R.vortexDuration||4.5,h=R.equilibriumDuration||3.5,P=3.5,S=14+.55*T,F=R.funnelBottom||-22,D=R.funnelHeight||46,b=.12*Math.sin(3*g-4.2*y+2.5*l),A=.08*Math.cos(5*g+6*y-3.8*l),W=.06*Math.sin(y*7.5+e*.03),k=1+b+A+W,B=(4+15/(T+4.5))*c,I=((R.spinSpeed||5.2)*2.8+4.5*(1-l))*c;if(y<w){const H=y/w,x=H*H*H*(H*(H*6-15)+10),j=(1-x)*T+x*S,z=g+B*(.6*y+.2*(y*y/w)),G=Math.cos(z)*j,M=(1-x)*i+x*(F+.022*j*j+3*(l-.5)),V=Math.sin(z)*j;return m?(m.x=G,m.y=M,m.z=V,m):{x:G,y:M,z:V}}else if(y<w+v){const H=y-w,x=H/v,j=x*x*(3-2*x),z=g+B*(.8*w),G=H+.6*v/Math.PI*(1-Math.cos(Math.PI*H/v)),M=z+I*1.25*G,V=(1-j)*S+j*(f*k),X=2.8*Math.sin(1.8*y+2.2*l)*l*j,N=2.4*Math.cos(1.5*y+1.8*l)*l*j,L=X+Math.cos(M)*V,q=(1-j)*(F+.022*S*S)+j*(F+D*l)+5.5*Math.sin(x*Math.PI)*l,Z=N+Math.sin(M)*V;return m?(m.x=L,m.y=q,m.z=Z,m):{x:L,y:q,z:Z}}else if(y<w+v+h){const H=y-(w+v),x=H/h,j=1+.75*Math.sin(Math.PI*x)+.35*x,z=g+B*(.8*w),G=v+1.2*v/Math.PI,M=z+I*1.25*G,V=H-.2/2.4*(Math.cos(2.4*H)-1),X=M+I*1.1*V,N=f*k*j,L=2.8*Math.sin(1.8*(w+v)+2.2*l)*l*(1-.4*x),q=2.4*Math.cos(1.5*(w+v)+1.8*l)*l*(1-.4*x),Z=L+Math.cos(X)*N,Q=F+D*l+(1-x)*2*l,re=q+Math.sin(X)*N;return m?(m.x=Z,m.y=Q,m.z=re,m):{x:Z,y:Q,z:re}}else{const H=y-(w+v+h),x=Math.min(1,H/P),j=g+B*(.8*w),z=v+1.2*v/Math.PI,G=j+I*1.25*z,M=h-.2/2.4*(Math.cos(2.4*h)-1),V=G+I*1.1*M,X=.85*H-.275*(H*H/P),N=V+I*1.1*X,L=f*k*(1-x)+S*x,q=(F+D*l)*(1-x)+(F+.022*S*S+3*(l-.5))*x,Z=Math.cos(N)*L,Q=q,re=Math.sin(N)*L,O=.35*x+.65*Math.pow(x,2.2),_=(1-O)*Z+O*t,u=(1-O)*Q+O*i,C=(1-O)*re+O*a;return m?(m.x=_,m.y=u,m.z=C,m):{x:_,y:u,z:C}}}function rt(e,t,i,a,l,o,p,c,y,R,m,f,g,T,w,v){if(i>.82){const h=(e*16*R+1.2*Math.sin(3.5*t+w*.1))*c,P=a+p*h,S=l+.35*Math.abs(Math.sin(7*t+w*.25))*c,F=o+1.2*Math.sin(2.5*t+w*.15)*c;return v?(v.x=P,v.y=S,v.z=F,v):{x:P,y:S,z:F}}else{const h=e/T,P=Math.min(1,Math.max(0,(h-f)/(1-f+1e-4))),S=P*P*(3-2*P),F=24*R*(.4+.6*m)*c,D=p*(F*e),b=.14*(a*p)-2.8*t+w*.08,A=4*m*Math.min(1,e/1.2)*c,W=A*Math.sin(b),k=p*(A*Math.cos(b)),B=4.5*Math.sin(.15*a-2.2*t+g*.05)*Math.cos(.12*o)*c,I=3*Math.sin(.32*a+3.8*t+w*.15)*Math.sin(.25*(l+11))*c,H=(5.5*Math.sin(.25*a-4.2*t+w*.18)+g*.25)*(1+e*.25)*c,x=2*Math.cos(.28*a+3.4*t+w*.12)*c,j=(7+22*m)*c,z=Math.max(0,j+B+I+W+x),G=a+D+k+p*(B*.6),M=l+S*z,V=o+S*H;return v?(v.x=G,v.y=M,v.z=V,v):{x:G,y:M,z:V}}}function vt(e,t,i,a,l,o,p,c){const y=p||{},R=y.blowDir!=null?y.blowDir:1,m=y.intensity!=null?y.intensity:1,f=1,g=2,T=3.6,w=3.6,v=1.6,h=e*37.119%100/100,P=h<.22,S=e*19.417%100-50,F=e*29.831%100-50,D=P?S*.05:0,b=P?F*.04:0,A=-11,W=t+D,k=A+i*.03,B=a+b,I=.55+e*43.71%100/100*.9,H=.4+e*81.33%100/100*1.1,x=Math.pow(e*61.19%100/100,1.4)*.6;if(o<f){const j=o/f,z=j*j,G=Math.max(0,(j-.7)/.3),M=G*(2-G),V=(P?1.6:.5)*Math.sin(Math.PI*G)*(1-G),X=t+D*M,N=(1-z)*i+z*k+V,L=a+b*M;return c?(c.x=X,c.y=N,c.z=L,c):{x:X,y:N,z:L}}else{if(o<f+g)return c?(c.x=W,c.y=k,c.z=B,c):{x:W,y:k,z:B};if(o<f+g+T){const j=o-(f+g);return rt(j,o,h,W,k,B,R,m,l,I,H,x,F,T,e,c)}else if(o<f+g+T+w){const j=(o-(f+g+T))/w,z=j*j*(3-2*j),G=T*(1-z);return rt(G,o,h,W,k,B,R,m,l,I,H,x,F,T,e,c)}else{const j=Math.min(1,(o-(f+g+T+w))/v),z=j*j*(3-2*j),G=(1-z)*W+z*t,M=(1-z)*k+z*i,V=(1-z)*B+z*a;return c?(c.x=G,c.y=M,c.z=V,c):{x:G,y:M,z:V}}}}function xt(e,t,i,a,l,o,p,c,y,R,m,f){const g=y!=null&&y>0?y:3,T=(1-it)*.82+.18,w=(2.8*it*.82+.18)/Math.max(.1,c),v=T+w*g*.78;let h;if(m<c){const D=m/c;h=((1-Math.exp(-2.8*D))*.82+.18*D)*p}else if(m<c+g){const D=m-c,b=D/Math.max(.01,g);h=(T+w*D*(1-.22*b))*p}else{const D=Math.min(1,Math.max(0,(m-(c+g))/Math.max(.1,R))),b=Math.max(0,1-Math.pow(D,2.4));h=v*b*p}const P=e+a*h,S=t+l*h,F=i+o*h;return f?(f.x=P,f.y=S,f.z=F,f):{x:P,y:S,z:F}}function yt(e,t,i,a,l,o,p,c){const R=Math.min(1,Math.max(0,o/7.5)),m=-48+96*R,f=t+.25*i-m,g=9.2,T=Math.exp(-(f*f)/(2*g*g)),w=Math.sin(Math.PI*R),v=T*(.35+.65*w),h=Math.PI*f/(2*g),P=Math.cos(h),S=Math.sin(h),F=16,D=.5+.5*Math.tanh(i/8),b=F*(P-.3*Math.sin(2*h)),A=5*D*Math.max(0,P),W=-3.5*D*Math.max(0,S),k=v*(b+A),B=v*(F*.14*S+W),I=-v*(F*.06)*S,H=t+I,x=i+B,j=a+k;return c?(c.x=H,c.y=x,c.z=j,c):{x:H,y:x,z:j}}const st=75,d={initialZ:35,cameraAngleDeg:st,zoomMin:10,zoomMax:120,textAutoZoom:45,zoomSpeed:.8,zoomLerp:.08,rotationStep:.03,rotationAutoReturnLerp:.02,autoReturnGracePeriodMs:300,canvasWidth:800,canvasHeight:150,fontSize:44,pixelStep:2,pixelThreshold:120,targetWorldWidth:80,emojiOptions:["😀","😂","😍","🥰","😎","🤔","😭","😡","😱","🥳","👍","👎","👏","🙏","👌","💪","❤️","🔥","✨","🎉"],emojiRasterSize:320,emojiPixelStep:2,emojiFontSize:280,emojiDensityOverride:1,emojiJitterXY:.03,emojiJitterZ:.5,emojiDepthCue:.06,emojiPointSize:1.6,emojiMotionMix:.35,emojiDepthRange:6,imageRasterSize:320,imagePixelStep:2,imageAlphaThreshold:16,imageJitterXY:.03,imageJitterZ:.5,imageDepthCue:.06,imagePointSize:1.2,imageDepthRange:5,imageFitPadX:120,imageFitPadY:120,density:8,jitterXY:.08,jitterZ:2.5,explosionSpeedMin:.4,explosionSpeedRange:.8,heatDistance:2/3*35*Math.tan(st*Math.PI/360),afterglowDuration:.2,mouseInfluence:8,repulsionStrength:12,springK:.12,springDamping:.82,tapCount:5,tapWindowMs:800,inputDebounceMs:150,pointSize:.5,pointSizeAttenuationScale:120,clearColor:131589,maxPixelRatio:2,themes:{ember:{hot:[1,.95,.75],warm:[1,.45,.05],cold:[.92,.18,.05]},arctic:{hot:[.92,.98,1],warm:[.18,.75,1],cold:[.05,.35,.88]},toxic:{hot:[.92,1,.4],warm:[.35,.95,.15],cold:[.06,.58,.22]},neon:{hot:[1,.92,.98],warm:[1,.08,.55],cold:[.35,.05,.88]},sakura:{hot:[1,.95,.96],warm:[1,.45,.65],cold:[.85,.18,.42]}},presets:{KINETIC:{expansionDuration:3.75,contractionDuration:3.75,explosionMaxDistMultiplier:22,motionStyle:3,trailStrength:.7,heat:{cold:[.08,.22,.52],warm:[.25,.78,.88],hot:[1,.98,.88]},emberBudget:0,soundPitch:45,soundDuration:7.5,soundType:"sine"},TORNADO:{expansionDuration:3.5,vortexDuration:4.5,equilibriumDuration:3.5,contractionDuration:3.5,explosionMaxDistMultiplier:26,motionStyle:1,spinSpeed:4.8,funnelHeight:46,funnelBottom:-22,funnelCrownRadius:22,funnelWaistRadius:4.5,funnelTailRadius:1.8,funnelWaistT:.38,funnelCrownT:.82,funnelFadeStart:.03,funnelFadeEnd:.3,trailStrength:.75,heat:{cold:[.08,.18,.45],warm:[.92,.82,.28],hot:[1,.98,.9]},emberBudget:90,soundPitch:75,soundDuration:15,soundType:"sawtooth"},BREEZE:{expansionDuration:1,groundPauseDuration:2,liftDuration:3.6,settleDuration:3.6,contractionDuration:1.6,explosionMaxDistMultiplier:38,motionStyle:2,gustCoherence:.94,windSpeed:36,trailStrength:.65,heat:{cold:[.15,.35,.65],warm:[.85,.45,.35],hot:[.95,.92,.85]},emberBudget:0,soundPitch:95,soundDuration:11.8,soundType:"sine"},EXPLODE:{expansionDuration:1.2,driftDuration:3,contractionDuration:2,explosionMaxDistMultiplier:36,motionStyle:0,trailStrength:.3,heat:{cold:[.45,.05,.05],warm:[1,.45,.08],hot:[1,.85,.4]},emberBudget:140,soundPitch:110,soundDuration:6.2,soundType:"sine"},DEFAULT:{expansionDuration:1.2,driftDuration:3,contractionDuration:2,explosionMaxDistMultiplier:15,motionStyle:-1,spokes:12,spokeJitter:.03,spinSpeed:0,funnelHeight:0,funnelBottom:0,funnelCrownRadius:0,funnelWaistRadius:0,funnelTailRadius:0,funnelWaistT:0,funnelCrownT:0,funnelFadeStart:0,funnelFadeEnd:0,gustCoherence:0,trailStrength:.25,heat:{cold:[.1,.4,1],warm:[1,1,.1],hot:[1,.1,.1]},soundPitch:140,soundDuration:1.5,soundType:"sine"}}};let Ge=window.matchMedia("(prefers-reduced-motion: reduce)").matches;window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",e=>{Ge=e.matches});let ie=null;const Bt=384;let Ie=0,fe=null;const It=`
uniform vec3 uMouse;
uniform float uMouseInfluence;
uniform float uPointSize;
uniform float uPixelRatio;
uniform float uPointScale;
uniform float uDepthCue;
uniform vec3 uColorHot;
uniform vec3 uColorWarm;
uniform vec3 uColorCold;
uniform float uExplosionActive;
uniform float uTornadoActive;
uniform float uTornadoFadeStart;
uniform float uTornadoFadeEnd;
uniform float uHeatDistance;
uniform vec3 uHeatCold;
uniform vec3 uHeatWarm;
uniform vec3 uHeatHot;
uniform float uAudioMid;
uniform float uAudioHigh;
uniform float uAudioEnvelope;
uniform float uEmojiMode;
uniform float uEmojiMotionMix;

// GPU Kinematics Uniforms
uniform float uGpuPhysics;
uniform int uMotionStyle;
uniform float uExplosionElapsed;
uniform float uExpDuration;
uniform float uDriftDuration;
uniform float uContractionDuration;
uniform float uMaxDist;
uniform float uSpinSpeed;
uniform float uFunnelBottom;
uniform float uFunnelHeight;
uniform float uFunnelCrownRadius;
uniform float uFunnelWaistRadius;
uniform float uFunnelTailRadius;
uniform float uFunnelWaistT;
uniform float uFunnelCrownExp;
uniform float uBreezeBlowDir;
uniform float uBreezeIntensity;
uniform vec3 uMouseWorld;
uniform float uMousePushDistance;
uniform float uMouseActive;

attribute vec3 homePosition;
attribute vec4 sourceColor;
attribute float sampleSize;
attribute float funnelT;
attribute vec2 aSourceUV;
attribute vec3 aRandomDir;
attribute float aRandomSpeed;
attribute float aIndex;
attribute vec3 aSeed;
attribute float aCustomDir;

varying vec3 vColor;
varying float vCoverage;
varying float vTornadoFade;
varying vec2 vSourceUV;

float calcTornadoRadius(float u, float waistU, float rTail, float rWaist, float rCrown, float crownExp) {
    if (u <= waistU) {
        float t = u / max(0.01, waistU);
        return rTail + (rWaist - rTail) * (t * t);
    } else {
        float t = (u - waistU) / max(0.01, 1.0 - waistU);
        return rWaist + (rCrown - rWaist) * pow(t, crownExp);
    }
}

vec3 evalTornadoGPU(float i, vec3 home, float u, vec3 seed, float cd, float elapsed, float spinSpeed, float fBottom, float fHeight, float rCrown, float rWaist, float rTail, float waistU, float crownExp) {
    float radiusFunnel = calcTornadoRadius(u, waistU, rTail, rWaist, rCrown, crownExp);
    float baseAngle = atan(seed.z, seed.x);
    float r0 = length(home.xz);

    float t1 = 3.5;
    float t2 = 4.5;
    float t3 = 3.5;
    float t4 = 3.5;

    float discRadius = 14.0 + 0.55 * r0;
    float ripple1 = 0.12 * sin(3.0 * baseAngle - 4.2 * elapsed + 2.5 * u);
    float ripple2 = 0.08 * cos(5.0 * baseAngle + 6.0 * elapsed - 3.8 * u);
    float ripple3 = 0.06 * sin(elapsed * 7.5 + i * 0.03);
    float sheathRipple = 1.0 + ripple1 + ripple2 + ripple3;

    float diffSpin = (4.0 + 15.0 / (r0 + 4.5)) * cd;
    float vortexSpin = (spinSpeed * 2.8 + 4.5 * (1.0 - u)) * cd;

    if (elapsed < t1) {
        float p1 = elapsed / t1;
        float e1 = p1 * p1 * p1 * (p1 * (p1 * 6.0 - 15.0) + 10.0);
        float rDisc = (1.0 - e1) * r0 + e1 * discRadius;
        float angle1 = baseAngle + diffSpin * (0.6 * elapsed + 0.2 * (elapsed * elapsed / t1));
        float rx = cos(angle1) * rDisc;
        float ry = (1.0 - e1) * home.y + e1 * (fBottom + 0.022 * rDisc * rDisc + 3.0 * (u - 0.5));
        float rz = sin(angle1) * rDisc;
        return vec3(rx, ry, rz);
    } else if (elapsed < t1 + t2) {
        float tau = elapsed - t1;
        float p2 = tau / t2;
        float eLift = p2 * p2 * (3.0 - 2.0 * p2);
        float angleAtEnd1 = baseAngle + diffSpin * (0.8 * t1);
        float integral2 = tau + (0.6 * t2 / 3.14159265) * (1.0 - cos(3.14159265 * tau / t2));
        float angle2 = angleAtEnd1 + vortexSpin * 1.25 * integral2;
        float currentR = (1.0 - eLift) * discRadius + eLift * (radiusFunnel * sheathRipple);
        float axisX = 2.8 * sin(1.8 * elapsed + 2.2 * u) * u * eLift;
        float axisZ = 2.4 * cos(1.5 * elapsed + 1.8 * u) * u * eLift;
        float rx = axisX + cos(angle2) * currentR;
        float ry = (1.0 - eLift) * (fBottom + 0.022 * discRadius * discRadius) + eLift * (fBottom + fHeight * u) + 5.5 * sin(p2 * 3.14159265) * u;
        float rz = axisZ + sin(angle2) * currentR;
        return vec3(rx, ry, rz);
    } else if (elapsed < t1 + t2 + t3) {
        float tau3 = elapsed - (t1 + t2);
        float p3 = tau3 / t3;
        float bloom = 1.0 + 0.75 * sin(3.14159265 * p3) + 0.35 * p3;
        float angleAtEnd1 = baseAngle + diffSpin * (0.8 * t1);
        float integral2End = t2 + (1.2 * t2 / 3.14159265);
        float angleAtEnd2 = angleAtEnd1 + vortexSpin * 1.25 * integral2End;
        float integral3 = tau3 - (0.2 / 2.4) * (cos(2.4 * tau3) - 1.0);
        float angle3 = angleAtEnd2 + vortexSpin * 1.1 * integral3;
        float currentR3 = (radiusFunnel * sheathRipple) * bloom;
        float axisX3 = 2.8 * sin(1.8 * (t1 + t2) + 2.2 * u) * u * (1.0 - 0.4 * p3);
        float axisZ3 = 2.4 * cos(1.5 * (t1 + t2) + 1.8 * u) * u * (1.0 - 0.4 * p3);
        float rx = axisX3 + cos(angle3) * currentR3;
        float ry = fBottom + fHeight * u + (1.0 - p3) * 2.0 * u;
        float rz = axisZ3 + sin(angle3) * currentR3;
        return vec3(rx, ry, rz);
    } else {
        float tau4 = elapsed - (t1 + t2 + t3);
        float p4 = min(1.0, tau4 / t4);
        float angleAtEnd1 = baseAngle + diffSpin * (0.8 * t1);
        float integral2End = t2 + (1.2 * t2 / 3.14159265);
        float angleAtEnd2 = angleAtEnd1 + vortexSpin * 1.25 * integral2End;
        float integral3End = t3 - (0.2 / 2.4) * (cos(2.4 * t3) - 1.0);
        float angleAtEnd3 = angleAtEnd2 + vortexSpin * 1.1 * integral3End;
        float integral4 = 0.85 * tau4 - 0.275 * (tau4 * tau4 / t4);
        float angle4 = angleAtEnd3 + vortexSpin * 1.1 * integral4;
        float reverseFunnelR = (radiusFunnel * sheathRipple) * (1.0 - p4) + discRadius * p4;
        float reverseFunnelY = (fBottom + fHeight * u) * (1.0 - p4) + (fBottom + 0.022 * discRadius * discRadius + 3.0 * (u - 0.5)) * p4;
        float revDiscX = cos(angle4) * reverseFunnelR;
        float revDiscY = reverseFunnelY;
        float revDiscZ = sin(angle4) * reverseFunnelR;
        float returnProg = 0.35 * p4 + 0.65 * pow(p4, 2.2);
        float rx = (1.0 - returnProg) * revDiscX + returnProg * home.x;
        float ry = (1.0 - returnProg) * revDiscY + returnProg * home.y;
        float rz = (1.0 - returnProg) * revDiscZ + returnProg * home.z;
        return vec3(rx, ry, rz);
    }
}

vec3 computeBreezePlumeGPU(float tWind, float curElapsed, float lambda, vec3 gPos, float gx, float intensity, float cd, float windSpeedMult, float buoyancy, float liftStart, float seedZ, float t2, float i) {
    if (lambda > 0.82) {
        float groundTumble = (tWind * 16.0 * windSpeedMult + 1.2 * sin(3.5 * curElapsed + i * 0.1)) * intensity;
        float rx = gPos.x + gx * groundTumble;
        float ry = gPos.y + 0.35 * abs(sin(7.0 * curElapsed + i * 0.25)) * intensity;
        float rz = gPos.z + 1.2 * sin(2.5 * curElapsed + i * 0.15) * intensity;
        return vec3(rx, ry, rz);
    } else {
        float p = tWind / t2;
        float liftProg = min(1.0, max(0.0, (p - liftStart) / (1.0 - liftStart + 1e-4)));
        float eLift = liftProg * liftProg * (3.0 - 2.0 * liftProg);

        float aloftSpeed = 24.0 * windSpeedMult * (0.40 + 0.60 * buoyancy) * intensity;
        float xStreamline = gx * (aloftSpeed * tWind);

        float vortexPhase = 0.14 * (gPos.x * gx) - 2.8 * curElapsed + i * 0.08;
        float vortexRadius = 4.0 * buoyancy * min(1.0, tWind / 1.2) * intensity;
        float rollY = vortexRadius * sin(vortexPhase);
        float rollX = gx * (vortexRadius * cos(vortexPhase));

        float wisp1 = (4.5 * sin(0.15 * gPos.x - 2.2 * curElapsed + seedZ * 0.05) * cos(0.12 * gPos.z)) * intensity;
        float wisp2 = (3.0 * sin(0.32 * gPos.x + 3.8 * curElapsed + i * 0.15) * sin(0.25 * (gPos.y + 11.0))) * intensity;
        float flutterZ = ((5.5 * sin(0.25 * gPos.x - 4.2 * curElapsed + i * 0.18) + seedZ * 0.25) * (1.0 + tWind * 0.25)) * intensity;
        float flutterY = (2.0 * cos(0.28 * gPos.x + 3.4 * curElapsed + i * 0.12)) * intensity;

        float baseLift = (7.0 + 22.0 * buoyancy) * intensity;
        float totalLift = max(0.0, baseLift + wisp1 + wisp2 + rollY + flutterY);

        float rx = gPos.x + xStreamline + rollX + gx * (wisp1 * 0.6);
        float ry = gPos.y + eLift * totalLift;
        float rz = gPos.z + eLift * flutterZ;

        return vec3(rx, ry, rz);
    }
}

vec3 evalBreezeGPU(float i, vec3 home, float cd, float elapsed, float gx, float intensity) {
    float t1 = 1.0;
    float tPause = 2.0;
    float t2 = 3.6;
    float t3 = 3.6;
    float t4 = 1.6;

    float lambda = mod(i * 37.119, 100.0) / 100.0;
    bool isClash = lambda < 0.22;
    float seedX = mod(i * 19.417, 100.0) - 50.0;
    float seedZ = mod(i * 29.831, 100.0) - 50.0;
    float scatX = isClash ? seedX * 0.05 : 0.0;
    float scatZ = isClash ? seedZ * 0.04 : 0.0;
    float yGround = -11.0;

    vec3 gPos = vec3(home.x + scatX, yGround + (home.y * 0.03), home.z + scatZ);
    float windSpeedMult = 0.55 + (mod(i * 43.71, 100.0) / 100.0) * 0.90;
    float buoyancy = 0.40 + (mod(i * 81.33, 100.0) / 100.0) * 1.10;
    float liftStart = pow(mod(i * 61.19, 100.0) / 100.0, 1.4) * 0.60;

    if (elapsed < t1) {
        float p1 = elapsed / t1;
        float eDrop = p1 * p1;
        float pImpact = max(0.0, (p1 - 0.70) / 0.30);
        float eImpact = pImpact * (2.0 - pImpact);
        float recoil = (isClash ? 1.6 : 0.5) * sin(3.14159265 * pImpact) * (1.0 - pImpact);
        return vec3(home.x + scatX * eImpact, (1.0 - eDrop) * home.y + eDrop * gPos.y + recoil, home.z + scatZ * eImpact);
    } else if (elapsed < t1 + tPause) {
        return gPos;
    } else if (elapsed < t1 + tPause + t2) {
        float tWind = elapsed - (t1 + tPause);
        return computeBreezePlumeGPU(tWind, elapsed, lambda, gPos, gx, intensity, cd, windSpeedMult, buoyancy, liftStart, seedZ, t2, i);
    } else if (elapsed < t1 + tPause + t2 + t3) {
        float p3 = (elapsed - (t1 + tPause + t2)) / t3;
        float smoothP3 = p3 * p3 * (3.0 - 2.0 * p3);
        float tWindRev = t2 * (1.0 - smoothP3);
        return computeBreezePlumeGPU(tWindRev, elapsed, lambda, gPos, gx, intensity, cd, windSpeedMult, buoyancy, liftStart, seedZ, t2, i);
    } else {
        float p4 = min(1.0, (elapsed - (t1 + tPause + t2 + t3)) / t4);
        float eRise = p4 * p4 * (3.0 - 2.0 * p4);
        return mix(gPos, home, eRise);
    }
}

vec3 evalKineticGPU(vec3 home, float cd, float elapsed) {
    float totalDur = 7.5;
    float p = min(1.0, max(0.0, elapsed / totalDur));
    float xPeel = -48.0 + 96.0 * p;
    float dPeel = (home.x + 0.25 * home.y) - xPeel;
    float tubeWidth = 9.2;
    float env = exp(-(dPeel * dPeel) / (2.0 * tubeWidth * tubeWidth));

    float timeEnv = sin(3.14159265 * p);
    float waveEnv = env * (0.35 + 0.65 * timeEnv);

    float theta = (3.14159265 * dPeel) / (2.0 * tubeWidth);
    float cosT = cos(theta);
    float sinT = sin(theta);
    float waveHeight = 16.0;
    float e2y = exp(clamp(2.0 * (home.y / 8.0), -10.0, 10.0));
    float tanhVal = (e2y - 1.0) / (e2y + 1.0);
    float lipBlend = 0.5 + 0.5 * tanhVal;
    float baseWaveZ = waveHeight * (cosT - 0.30 * 2.0 * sinT * cosT);
    float curlZ = 5.0 * lipBlend * max(0.0, cosT);
    float curlY = -3.5 * lipBlend * max(0.0, sinT);

    float deltaZ = waveEnv * (baseWaveZ + curlZ);
    float deltaY = waveEnv * ((waveHeight * 0.14) * sinT + curlY);
    float deltaX = -waveEnv * (waveHeight * 0.06) * sinT;

    return vec3(home.x + deltaX, home.y + deltaY, home.z + deltaZ);
}

vec3 evalExplosionGPU(vec3 home, vec3 rDir, float rSpeed, float maxDist, float expDur, float driftDur, float contrDur, float elapsed) {
    float tDrift = driftDur > 0.0 ? driftDur : 3.0;
    float peakProg = (1.0 - 0.06081006) * 0.82 + 0.18;
    float vLatest = (2.8 * 0.06081006 * 0.82 + 0.18) / max(0.1, expDur);
    float driftPeakProg = peakProg + vLatest * tDrift * 0.78;
    float dist = 0.0;
    if (elapsed < expDur) {
        float u = elapsed / expDur;
        dist = ((1.0 - exp(-2.8 * u)) * 0.82 + 0.18 * u) * maxDist;
    } else if (elapsed < expDur + tDrift) {
        float dtDrift = elapsed - expDur;
        float driftRatio = dtDrift / max(0.01, tDrift);
        float prog = peakProg + vLatest * dtDrift * (1.0 - 0.22 * driftRatio);
        dist = prog * maxDist;
    } else {
        float v = min(1.0, max(0.0, (elapsed - (expDur + tDrift)) / max(0.1, contrDur)));
        float returnProg = max(0.0, 1.0 - pow(v, 2.4));
        dist = driftPeakProg * returnProg * maxDist;
    }
    return home + rDir * (dist * rSpeed);
}

void main() {
    vec3 livePos = position;
    if (uGpuPhysics > 0.5) {
        livePos = homePosition;
        if (uExplosionActive > 0.01 && uExplosionElapsed >= 0.0) {
            if (uMotionStyle == 1) {
                livePos = evalTornadoGPU(aIndex, homePosition, funnelT, aSeed, aCustomDir, uExplosionElapsed, uSpinSpeed, uFunnelBottom, uFunnelHeight, uFunnelCrownRadius, uFunnelWaistRadius, uFunnelTailRadius, uFunnelWaistT, uFunnelCrownExp);
            } else if (uMotionStyle == 2) {
                livePos = evalBreezeGPU(aIndex, homePosition, aCustomDir, uExplosionElapsed, uBreezeBlowDir, uBreezeIntensity);
            } else if (uMotionStyle == 3) {
                livePos = evalKineticGPU(homePosition, aCustomDir, uExplosionElapsed);
            } else {
                livePos = evalExplosionGPU(homePosition, aRandomDir, aRandomSpeed, uMaxDist, uExpDuration, uDriftDuration, uContractionDuration, uExplosionElapsed);
            }
        }
        if (uMouseActive > 0.5) {
            vec2 diff = livePos.xy - uMouseWorld.xy;
            float d = length(diff);
            if (d < uMouseInfluence && d > 0.001) {
                float f = (1.0 - d / uMouseInfluence) * uMousePushDistance;
                livePos.xy += (diff / d) * f;
            }
        }
    }

    // Smooth spatial gradient across the sculpture blended with mouse hover glow
    float spatialGrad = clamp((livePos.y + 12.0) / 24.0 + 0.15 * sin(0.12 * livePos.x), 0.0, 1.0);
    float mouseHeat = clamp(1.0 - distance(uMouse, livePos) / uMouseInfluence, 0.0, 1.0);
    float tMix = clamp(mix(spatialGrad, 1.0, mouseHeat * 0.9), 0.0, 1.0);
    vec3 themeColor = (tMix < 0.5)
        ? mix(uColorCold, uColorWarm, tMix * 2.0)
        : mix(uColorWarm, uColorHot, (tMix - 0.5) * 2.0);

    // Emoji mode keeps the sampled glyph color (eyes, tears, mouth, hearts stay
    // readable); text mode keeps the theme heatmap exactly as before.
    vec3 baseColor = mix(themeColor, sourceColor.rgb, uEmojiMode);

    // Movement heatmap: cooler (blue) near the particle's OWN initial position, hotter
    // (red) the further it has been displaced, with yellow in between.
    float movement = length(livePos - homePosition);
    float heat = smoothstep(0.05, uHeatDistance, movement);
    vec3 movementColor = (heat < 0.5)
        ? mix(uHeatCold, uHeatWarm, heat * 2.0)
        : mix(uHeatWarm, uHeatHot, (heat - 0.5) * 2.0);

    vec3 motionColor = mix(movementColor, sourceColor.rgb, uEmojiMode * uEmojiMotionMix);
    vColor = mix(baseColor, motionColor, uExplosionActive);

    // Audio-reactive brightness: mid/high energy brighten the particles, the envelope
    // gives a broad pulse while the blast is sounding.
    float audioBright = 1.0 + 0.35 * uAudioMid + 0.25 * uAudioHigh;
    vColor *= audioBright * (0.85 + 0.30 * uAudioEnvelope);

    // Depth cue: nearer particles (positive z depth) read slightly larger and
    // brighter, so the face-on sculpture still reads volumetric under the
    // orthographic projection.
    float depthCue = 1.0 + uDepthCue * homePosition.z;
    vColor *= depthCue;

    vCoverage = sourceColor.a;
    vSourceUV = aSourceUV;

    // Safe fade for the funnel tail.
    float funnelFade = clamp(
        (funnelT - uTornadoFadeStart) / max(uTornadoFadeEnd - uTornadoFadeStart, 1e-4),
        0.0, 1.0);
    vTornadoFade = mix(1.0, 0.14 + 0.86 * funnelFade, uTornadoActive);

    vec4 mvPosition = modelViewMatrix * vec4(livePos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation - corrected for device pixel ratio.
    float effectiveSampleSize = mix(sampleSize, 1.0, uEmojiMode);
    gl_PointSize = uPointSize * uPixelRatio * uPointScale * depthCue * effectiveSampleSize;
    gl_PointSize *= (1.0 + 0.5 * heat * uExplosionActive + 0.2 * uAudioHigh);
    gl_PointSize *= mix(1.0, 0.76 + 0.24 * funnelFade, uTornadoActive);
}
`,Vt=`
uniform float uEmojiMode;
uniform float uUseSourceTexture;
uniform sampler2D uSourceTexture;
varying vec3 vColor;
varying float vCoverage;
varying float vTornadoFade;
varying vec2 vSourceUV;

void main() {
    // Soft circular falloff with a solid bright core for lively, luminous dots
    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
    float r = dot(cxy, cxy);
    if (r > 1.0) discard;
    float softEdge = 1.0 - smoothstep(0.3, 1.0, r);

    // Approach C: sample the source canvas texture at this particle's UV coordinate.
    // Enhanced vibrancy & brightness boost so emojis and images feel luminous and alive.
    if (uUseSourceTexture > 0.5) {
        vec4 texel = texture2D(uSourceTexture, vSourceUV);
        vec3 vibrantColor = min(vec3(1.0), texel.rgb * 1.20);
        vec3 blendedColor = mix(vibrantColor, vColor, uEmojiMode * (1.0 - uUseSourceTexture + 0.001));
        float texAlpha = texel.a * softEdge * vTornadoFade;
        gl_FragColor = vec4(blendedColor, texAlpha);
        return;
    }

    float alpha = 0.9 * softEdge;
    // Emoji particles fade with their source coverage, keeping anti-aliased glyph
    // edges soft; text particles stay fully opaque as before.
    alpha *= mix(1.0, vCoverage, uEmojiMode);
    alpha *= vTornadoFade;
    gl_FragColor = vec4(vColor, alpha);
}
`,n={currentText:"Bring your message!",currentTheme:"ember",currentFont:"Outfit",messageMode:"text",activeImage:null,imageName:"",activePreset:null,activeEmoji:null,audioEnabled:!0,gpuPhysics:!(typeof window<"u"&&(new URLSearchParams(window.location.search).get("noworker")==="1"||new URLSearchParams(window.location.search).get("gpu")==="0")),expansionDuration:d.presets.DEFAULT.expansionDuration,driftDuration:d.presets.DEFAULT.driftDuration||3,contractionDuration:d.presets.DEFAULT.contractionDuration,explosionMaxDistMultiplier:d.presets.DEFAULT.explosionMaxDistMultiplier,motionStyle:d.presets.DEFAULT.motionStyle,activeExpansionDuration:null,activeContractionDuration:null,activeMaxDist:null,actualTravelRadius:0,travelApplied:!1,embersSpawned:!1,afterglowStartTime:null,soundPitch:d.presets.DEFAULT.soundPitch,soundDuration:d.presets.DEFAULT.soundDuration,soundType:d.presets.DEFAULT.soundType,trailStrength:d.presets.DEFAULT.trailStrength,pattern:{spokes:d.presets.DEFAULT.spokes,spokeJitter:d.presets.DEFAULT.spokeJitter,spinSpeed:d.presets.DEFAULT.spinSpeed,funnelHeight:d.presets.DEFAULT.funnelHeight,funnelBottom:d.presets.DEFAULT.funnelBottom,funnelCrownRadius:d.presets.DEFAULT.funnelCrownRadius,funnelWaistRadius:d.presets.DEFAULT.funnelWaistRadius,funnelTailRadius:d.presets.DEFAULT.funnelTailRadius,funnelWaistT:d.presets.DEFAULT.funnelWaistT,funnelCrownT:d.presets.DEFAULT.funnelCrownT,funnelFadeStart:d.presets.DEFAULT.funnelFadeStart,funnelFadeEnd:d.presets.DEFAULT.funnelFadeEnd,gustCoherence:0,trailStrength:.25,heat:{cold:[.1,.4,1],warm:[1,1,.1],hot:[1,.1,.1]},soundPitch:140,soundDuration:1.5,soundType:"sine"},heatCold:[.1,.4,1],heatWarm:[1,1,.1],heatHot:[1,.1,.1],get totalExplosionDuration(){const e=s&&s.activeStyle>=0?s.activeStyle:this.motionStyle;if(e===1){const l=this.expansionDuration||3.5,o=this.pattern&&this.pattern.vortexDuration?this.pattern.vortexDuration:4.5,p=this.pattern&&this.pattern.equilibriumDuration?this.pattern.equilibriumDuration:3.5,c=this.contractionDuration||3.5;return l+o+p+c}if(e===2)return 11.8;if(e===3)return 7.5;const t=this.activeExpansionDuration||this.expansionDuration,i=this.activeContractionDuration||this.contractionDuration;return t+(e===0||e===-1?3:0)+i}},r={scene:null,camera:null,renderer:null,particles:null,clock:new Dt,trailPoints:null,trailData:null,trailLive:null,trailPosAttr:null,trailLiveAttr:null,emberPoints:null,emberData:null,emberVel:null,emberLife:null,emberPosAttr:null,emberLifeAttr:null,targetZ:d.initialZ,autoFit:!0,prevTime:0,prevDt:0,prevKFrame:0,prevDampFrame:0},s={posHome:null,posLive:null,explosionOrigin:null,springDisp:null,springVel:null,randomDir:null,randomSpeed:null,funnelT:null,funnelRadialX:null,funnelRadialZ:null,activeStyle:-1,slots:[],sendQueue:[],seq:0,sourceGeneration:0,motionToken:0,explosionStartTime:-1,positionsDirty:!1,randomized:null};function Ht(){return typeof window<"u"&&new URLSearchParams(window.location.search).get("noworker")==="1"?15e3:ie||n.gpuPhysics?3e4:15e3}const U={keys:{ArrowUp:!1,ArrowDown:!1,ArrowLeft:!1,ArrowRight:!1,"+":!1,"-":!1,"=":!1," ":!1},mouseWorld:new le,mouseLocal:new le,invMatrix:new Ct,mouseWorldPos:new le(-1e3,-1e3,0),lastClickTime:0,lastPinchDist:null,lastMidpoint:new Rt,lastGestureEndTime:0,inputDebounceTimer:null,toastTimer:null,flashTimer:null,isDragging:!1,prevMouseX:0,prevMouseY:0,pendingPointer:null},E={uMouse:{value:new le(-1e3,-1e3,0)},uMouseInfluence:{value:d.mouseInfluence},uPointSize:{value:d.pointSize},uPixelRatio:{value:1},uPointScale:{value:d.pointSizeAttenuationScale/d.initialZ},uDepthCue:{value:.28},uColorHot:{value:new le(1,0,0)},uColorWarm:{value:new le(1,1,0)},uColorCold:{value:new le(1,1,1)},uExplosionActive:{value:0},uTornadoActive:{value:0},uTornadoFadeStart:{value:.03},uTornadoFadeEnd:{value:.3},uHeatDistance:{value:d.heatDistance},uHeatCold:{value:new le(.1,.4,1)},uHeatWarm:{value:new le(1,1,.1)},uHeatHot:{value:new le(1,.1,.1)},uAudioMid:{value:0},uAudioHigh:{value:0},uAudioEnvelope:{value:0},uPointSizeTrail:{value:.4},uTrailStrength:{value:.25},uEmojiMode:{value:0},uEmojiMotionMix:{value:d.emojiMotionMix},uUseSourceTexture:{value:0},uSourceTexture:{value:null},uGpuPhysics:{value:1},uMotionStyle:{value:0},uExplosionElapsed:{value:-1},uExpDuration:{value:2},uDriftDuration:{value:3},uContractionDuration:{value:2},uMaxDist:{value:35},uSpinSpeed:{value:5.2},uFunnelBottom:{value:-22},uFunnelHeight:{value:46},uFunnelCrownRadius:{value:22},uFunnelWaistRadius:{value:3.5},uFunnelTailRadius:{value:.8},uFunnelWaistT:{value:.42},uFunnelCrownExp:{value:1.4},uBreezeBlowDir:{value:1},uBreezeIntensity:{value:1},uMouseWorld:{value:new le(-1e3,-1e3,0)},uMousePushDistance:{value:d.repulsionStrength},uMouseActive:{value:0}};function ve(e){const t=document.getElementById("toast");t&&(t.textContent=e,t.classList.add("show"),clearTimeout(U.toastTimer),U.toastTimer=setTimeout(()=>{t.classList.remove("show")},3e3))}function Fe(e){const t=document.getElementById("sr-announce");t&&(t.textContent=e)}function jt(){const e=document.getElementById("flash");e&&(e.classList.remove("active"),e.offsetWidth,e.classList.add("active"),clearTimeout(U.flashTimer),U.flashTimer=setTimeout(()=>e.classList.remove("active"),120))}let ue=null,Re=null,he=null,xe=null;function qt(){ue&&Re||(ue||(ue=new(window.AudioContext||window.webkitAudioContext)),Re=ue.createGain(),Re.gain.value=1,he=ue.createAnalyser(),he.fftSize=256,he.smoothingTimeConstant=.6,Re.connect(he),he.connect(ue.destination),xe=new Uint8Array(he.frequencyBinCount))}function Ze(e,t,i,a){let l=0,o=0;const p=Math.max(0,Math.floor(t*a)),c=Math.min(a,Math.floor(i*a));for(let y=p;y<c;y++)l+=e[y]/255,o++;return o?l/o:0}function Gt(){if(!he||!ue||!xe)return;if(ue.state!=="running"){E.uAudioEnvelope.value=0;return}if(s.explosionStartTime<0&&E.uAudioEnvelope.value<.005&&E.uAudioMid.value<.005&&E.uAudioHigh.value<.005){E.uAudioMid.value=0,E.uAudioHigh.value=0,E.uAudioEnvelope.value=0;return}he.getByteFrequencyData(xe);const e=xe.length,t=Ze(xe,.02,.25,e),i=Ze(xe,.25,.55,e),a=Ze(xe,.55,.92,e);E.uAudioMid.value+=(i-E.uAudioMid.value)*.5,E.uAudioHigh.value+=(a-E.uAudioHigh.value)*.5;const l=Math.min(1,t*1.3+i*.5+a*.6);E.uAudioEnvelope.value+=(l-E.uAudioEnvelope.value)*.6}function Xt(e){try{if(qt(),!ue)return;const t=ue.currentTime,i=Math.max(.3,e*.55),a=ue.createOscillator();a.type="sine",a.frequency.setValueAtTime(85,t),a.frequency.exponentialRampToValueAtTime(32,t+i);const l=ue.createGain();l.gain.setValueAtTime(1e-4,t),l.gain.exponentialRampToValueAtTime(.16,t+Math.min(.25,i*.3)),l.gain.exponentialRampToValueAtTime(1e-4,t+i),a.connect(l),l.connect(Re),a.start(t),a.stop(t+i+.05),setTimeout(()=>{try{a.disconnect(),l.disconnect()}catch{}},(i+.1)*1e3)}catch(t){console.warn("Rumble synthesis error:",t)}}async function wt(e){if(!e)return;const t=`bold ${d.fontSize}px "${e}"`;try{await document.fonts.load(t)}catch(i){console.warn(`Font load note for "${e}":`,i)}}let Ue=null,lt=null;function Zt(e){Ue||(Ue=document.createElement("canvas"),lt=Ue.getContext("2d",{willReadFrequently:!0}));const t=Ue,i=lt;t.width=d.canvasWidth,t.height=d.canvasHeight,i.fillStyle="black",i.fillRect(0,0,d.canvasWidth,d.canvasHeight),i.fillStyle="white",i.font=`bold ${d.fontSize}px "${n.currentFont}", sans-serif`,i.textAlign="center",i.textBaseline="middle",i.fillText(e,d.canvasWidth/2,d.canvasHeight/2);const a=i.getImageData(0,0,d.canvasWidth,d.canvasHeight).data,l=d.canvasWidth,o=d.canvasHeight,p=d.pixelStep,c=d.pixelThreshold;let y=0,R=1/0,m=-1/0,f=1/0,g=-1/0;for(let S=0;S<o;S+=p)for(let F=0;F<l;F+=p)a[(S*l+F)*4]>c&&(y++,F<R&&(R=F),F>m&&(m=F),S<f&&(f=S),S>g&&(g=S));if(y===0)return null;const T=d.targetWorldWidth/Math.max(m-R,1),w=(R+m)/2,v=(f+g)/2,h=new Float32Array(y*3);let P=0;for(let S=0;S<o;S+=p)for(let F=0;F<l;F+=p)a[(S*l+F)*4]>c&&(h[P++]=(F-w)*T,h[P++]=(v-S)*T,h[P++]=0);return h}let We=null,ut=null;function Ot(e){if(!e)return null;const t=e.naturalWidth||e.width,i=e.naturalHeight||e.height;if(!t||!i)return null;We||(We=document.createElement("canvas"),ut=We.getContext("2d",{willReadFrequently:!0}));const a=d.imageRasterSize,l=We,o=ut;l.width=a,l.height=a,o.clearRect(0,0,a,a),o.imageSmoothingEnabled=!0;const p=Math.round(a*.04),c=Math.min((a-p*2)/t,(a-p*2)/i),y=Math.max(1,Math.round(t*c)),R=Math.max(1,Math.round(i*c)),m=Math.round((a-y)/2),f=Math.round((a-R)/2);o.drawImage(e,m,f,y,R);const g=o.getImageData(0,0,a,a).data,T=d.imagePixelStep,w=d.imageAlphaThreshold,v=[],h=[],P=[],S=[],F=[];let D=1/0,b=-1/0,A=1/0,W=-1/0;const k=(u,C)=>u<0||C<0||u>=a||C>=a?0:g[(C*a+u)*4+3];for(let u=0;u<a;u+=T)for(let C=0;C<a;C+=T){const Y=(u*a+C)*4,ee=g[Y+3];if(ee<=w)continue;v.push(C,u),h.push(g[Y],g[Y+1],g[Y+2]),P.push(ee),S.push(1);const te=k(C-T,u)<=w||k(C+T,u)<=w||k(C,u-T)<=w||k(C,u+T)<=w;F.push(te),C<D&&(D=C),C>b&&(b=C),u<A&&(A=u),u>W&&(W=u)}if(v.length===0)return null;const B=Math.max(b-D,1),I=Math.max(W-A,1),H=d.targetWorldWidth/Math.max(B,I),x=(D+b)/2,j=(A+W)/2,G=d.imageDepthRange*.5,M=v.length/2,V=[],X=[],N=[],L=[],q=[];for(let u=0;u<M;u+=8){const C=v[u*2],Y=v[u*2+1];V.push((C-x)*H,(j-Y)*H,-G),X.push(C/a,1-Y/a),N.push(h[u*3],h[u*3+1],h[u*3+2]),L.push(P[u]),q.push(S[u])}for(let u=0;u<M;u++){if(!F[u])continue;const C=v[u*2],Y=v[u*2+1],ee=h[u*3],te=h[u*3+1],J=h[u*3+2],oe=P[u],$=S[u],K=C/a,ae=1-Y/a,se=(C-x)*H,me=(j-Y)*H;V.push(se,me,-G*.33),X.push(K,ae),N.push(ee,te,J),L.push(oe),q.push($),V.push(se,me,G*.33),X.push(K,ae),N.push(ee,te,J),L.push(oe),q.push($)}for(let u=0;u<M;u++){const C=v[u*2],Y=v[u*2+1];V.push((C-x)*H,(j-Y)*H,G),X.push(C/a,1-Y/a),N.push(h[u*3],h[u*3+1],h[u*3+2]),L.push(P[u]),q.push(S[u])}const Z=new Float32Array(V),Q=new Float32Array(X),re=new Uint8Array(N),O=new Uint8Array(L),_=new Uint8Array(q);return{flat:Z,uvs:Q,colors:re,covers:O,sizes:_,featureCount:M,frontCount:M,bounds:{w:B,h:I},sourceCanvas:l}}let ke=null,ct=null;function Yt(e){ke||(ke=document.createElement("canvas"),ct=ke.getContext("2d",{willReadFrequently:!0}));const t=ke,i=ct,a=d.emojiRasterSize;t.width=a,t.height=a,i.clearRect(0,0,a,a),i.fillStyle="white",i.font=`${d.emojiFontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`,i.textAlign="center",i.textBaseline="middle",i.fillText(e,a/2,a/2+a*.02);const l=i.getImageData(0,0,a,a).data,o=d.emojiPixelStep,p=d.pixelThreshold,c=[],y=[],R=[],m=[];let f=1/0,g=-1/0,T=1/0,w=-1/0;const v=(M,V)=>M<0||V<0||M>=a||V>=a?0:l[(V*a+M)*4+3];for(let M=0;M<a;M+=o)for(let V=0;V<a;V+=o){const X=(M*a+V)*4,N=l[X+3];if(N<=p)continue;c.push(V,M),y.push(l[X],l[X+1],l[X+2]),R.push(N);const L=v(V-o,M)<=p||v(V+o,M)<=p||v(V,M-o)<=p||v(V,M+o)<=p;m.push(L),V<f&&(f=V),V>g&&(g=V),M<T&&(T=M),M>w&&(w=M)}if(c.length===0)return null;const h=d.targetWorldWidth/Math.max(g-f,1),P=(f+g)/2,S=(T+w)/2,D=d.emojiDepthRange*.5,b=c.length/2,A=[],W=[],k=[],B=[],I=[];for(let M=0;M<b;M+=4){const V=c[M*2],X=c[M*2+1];A.push((V-P)*h,(S-X)*h,-D),W.push(V/a,1-X/a),k.push(y[M*3],y[M*3+1],y[M*3+2]),B.push(R[M]),I.push(1)}for(let M=0;M<b;M++){if(!m[M])continue;const V=c[M*2],X=c[M*2+1],N=y[M*3],L=y[M*3+1],q=y[M*3+2],Z=R[M],Q=V/a,re=1-X/a,O=(V-P)*h,_=(S-X)*h;A.push(O,_,-D*.33),W.push(Q,re),k.push(N,L,q),B.push(Z),I.push(1),A.push(O,_,D*.33),W.push(Q,re),k.push(N,L,q),B.push(Z),I.push(1)}for(let M=0;M<b;M++){const V=c[M*2],X=c[M*2+1];A.push((V-P)*h,(S-X)*h,D),W.push(V/a,1-X/a),k.push(y[M*3],y[M*3+1],y[M*3+2]),B.push(R[M]),I.push(1)}const H=new Float32Array(A),x=new Float32Array(W),j=new Uint8Array(k),z=new Uint8Array(B),G=new Uint8Array(I);return{flat:H,uvs:x,colors:j,covers:z,sizes:G,featureCount:b,frontCount:b,bounds:{w:g-f,h:w-T},sourceCanvas:t}}let Oe=0;async function pe(e,t=!1){Oe++;const i=Oe;await wt(n.currentFont);const a=`bold ${d.fontSize}px "${n.currentFont}"`;if(!document.fonts.check(a))try{await document.fonts.load(a)}catch(u){console.warn(`Failed to pre-load custom font "${n.currentFont}":`,u)}if(i!==Oe)return;s.sourceGeneration++,s.motionToken++,s.randomized=null;const l=!!r.particles;let o=null;if(l){const u=r.particles.geometry.attributes.position;o=u?u.array:null}const p=n.messageMode==="text"&&n.activeEmoji===e&&d.emojiOptions.includes(e),c=n.messageMode==="image"&&!!n.activeImage,y=p?Yt(e):null,R=c?Ot(n.activeImage):null,m=y||R,f=!!m,g=m?m.flat:c?null:Zt(e);if(!g){ve(c?"The image has no visible pixels!":"Text must contain at least one visible character!");return}const{jitterXY:T,jitterZ:w,explosionSpeedMin:v,explosionSpeedRange:h}=d,P=f?d.emojiDensityOverride:d.density;let S=g.length/3,F=1;const D=Ht(),b=Math.floor(D/P);let A=g,W=null,k=null,B=null,I=null;if(f){if(W=m.colors,k=m.covers,B=m.sizes,I=m.uvs||null,S>D){const u=[],C=m.frontCount||S;if(C<=D){for(let ae=0;ae<C;ae++)u.push(ae);const $=D-C,K=S-C;if($>0&&K>0){const ae=Math.max(1,Math.ceil(K/$));for(let se=C;se<S&&u.length<D;se+=ae)u.push(se)}}else{const $=Math.ceil(C/D);for(let K=0;K<C&&u.length<D;K+=$)u.push(K)}const Y=new Float32Array(u.length*3),ee=new Uint8Array(u.length*3),te=new Uint8Array(u.length),J=new Uint8Array(u.length),oe=I?new Float32Array(u.length*2):null;for(let $=0;$<u.length;$++){const K=u[$];Y[$*3]=A[K*3],Y[$*3+1]=A[K*3+1],Y[$*3+2]=A[K*3+2],ee[$*3]=W[K*3],ee[$*3+1]=W[K*3+1],ee[$*3+2]=W[K*3+2],te[$]=k[K],J[$]=B[K],oe&&I&&(oe[$*2]=I[K*2],oe[$*2+1]=I[K*2+1])}A=Y,W=ee,k=te,B=J,I=oe,S=u.length}}else S*P>D&&(F=Math.max(1,Math.ceil(S/b)));const x=Math.ceil(S/F)*P;s.posHome=new Float32Array(x*3),s.posLive=new Float32Array(x*3),s.explosionOrigin=new Float32Array(x*3),s.springDisp=new Float32Array(x*3),s.springVel=new Float32Array(x*3),s.randomDir=new Float32Array(x*3),s.randomSpeed=new Float32Array(x),s.funnelT=new Float32Array(x),s.funnelRadialX=new Float32Array(x),s.funnelRadialZ=new Float32Array(x);const j=Math.PI*(3-Math.sqrt(5));for(let u=0;u<x;u++){const C=(u*.6180339887498949+.5)%1,Y=.75+.3*((u*.7548776662466927+.17)%1),ee=u*j%(Math.PI*2);s.funnelT[u]=Math.pow(C,.85),s.funnelRadialX[u]=Math.cos(ee)*Y,s.funnelRadialZ[u]=Math.sin(ee)*Y}const z=new Uint8Array(x*4),G=new Uint8Array(x),M=new Float32Array(x*2),V=p?{xy:d.emojiJitterXY,z:d.emojiJitterZ}:{xy:d.imageJitterXY,z:d.imageJitterZ},X=f?V.xy:T,N=f?V.z:w;let L=0;for(let u=0;u<S;u+=F,L++){const C=A[u*3],Y=A[u*3+1],ee=A[u*3+2];for(let te=0;te<P;te++){const J=L*P+te,oe=J*3,$=oe+1,K=oe+2,ae=C+(Math.random()-.5)*X,se=Y+(Math.random()-.5)*X,me=ee+(Math.random()-.5)*N;s.posHome[oe]=ae,s.posHome[$]=se,s.posHome[K]=me;const Se=t?(Math.random()-.5)*45:0,Ae=t?(Math.random()-.5)*45:0,Pe=t?(Math.random()-.5)*35:0;s.posLive[oe]=ae+Se,s.posLive[$]=se+Ae,s.posLive[K]=me+Pe,s.springDisp[oe]=Se,s.springDisp[$]=Ae,s.springDisp[K]=Pe;const ce=Math.random()*Math.PI*2,de=Math.acos(Math.random()*2-1);s.randomDir[oe]=Math.sin(de)*Math.cos(ce),s.randomDir[$]=Math.sin(de)*Math.sin(ce),s.randomDir[K]=Math.cos(de),s.randomSpeed[J]=v+Math.random()*h,W?(z[J*4]=W[u*3],z[J*4+1]=W[u*3+1],z[J*4+2]=W[u*3+2],z[J*4+3]=k[u],G[J]=B[u],I&&(M[J*2]=I[u*2],M[J*2+1]=I[u*2+1])):(z[J*4]=255,z[J*4+1]=255,z[J*4+2]=255,z[J*4+3]=255,G[J]=1,M[J*2]=0,M[J*2+1]=0)}}r.autoFit&&Qe(),l&&!t&&o&&o.length===s.posLive.length&&(s.posLive.set(o),s.springDisp.fill(0),s.springVel.fill(0)),s.explosionOrigin.set(s.posLive),s.slots=[],s.sendQueue=[];for(let u=0;u<2;u++){const C={posLive:new Float32Array(x*3),springDisp:new Float32Array(x*3),springVel:new Float32Array(x*3),inFlight:!1,needsReset:!1};C.posLive.set(s.posLive),C.springDisp.set(s.springDisp),C.springVel.set(s.springVel),s.slots.push(C)}const q=!r.particles,Z=q?new Ye:r.particles.geometry,Q=new ne(s.posLive,3);Q.setUsage(Ee),Z.setAttribute("position",Q),Z.setAttribute("homePosition",new ne(s.posHome,3)),Z.setAttribute("sourceColor",new ne(z,4,!0)),Z.setAttribute("sampleSize",new ne(G,1)),Z.setAttribute("funnelT",new ne(s.funnelT,1)),Z.setAttribute("aSourceUV",new ne(M,2)),$e();const re=new Float32Array(x),O=new Float32Array(x*3),_=new Float32Array(x);for(let u=0;u<x;u++)re[u]=u,O[u*3]=s.funnelRadialX[u],O[u*3+1]=0,O[u*3+2]=s.funnelRadialZ[u],_[u]=u%2===0?1:-1;if(Z.setAttribute("aRandomDir",new ne(new Float32Array(s.randomDir),3)),Z.setAttribute("aRandomSpeed",new ne(new Float32Array(s.randomSpeed),1)),Z.setAttribute("aIndex",new ne(re,1)),Z.setAttribute("aSeed",new ne(O,3)),Z.setAttribute("aCustomDir",new ne(_,1)),q){const u=new _e({uniforms:E,vertexShader:It,fragmentShader:Vt,blending:qe,depthWrite:!1,transparent:!0});r.particles=new Ke(Z,u),r.scene.add(r.particles)}if(E.uEmojiMode.value=f?1:0,E.uPointSize.value=p?d.emojiPointSize:c?d.imagePointSize:d.pointSize,E.uDepthCue.value=p?d.emojiDepthCue:c?d.imageDepthCue:.28,r.particles.material.blending=f?bt:qe,r.particles.material.needsUpdate=!0,E.uSourceTexture.value&&(E.uSourceTexture.value.dispose(),E.uSourceTexture.value=null),f&&m&&m.sourceCanvas){const u=new Et(m.sourceCanvas);u.minFilter=at,u.magFilter=at,u.needsUpdate=!0,E.uSourceTexture.value=u,E.uUseSourceTexture.value=1}else E.uUseSourceTexture.value=0;r.particles.rotation.set(0,0,0),ie&&ie.postMessage({type:"init",data:{posHome:s.posHome.slice(),explosionOrigin:s.explosionOrigin.slice(),randomDir:s.randomDir.slice(),randomSpeed:s.randomSpeed.slice(),funnelT:s.funnelT.slice(),funnelRadialX:s.funnelRadialX.slice(),funnelRadialZ:s.funnelRadialZ.slice()}}),_t()}function _t(){const e=s.posLive.length;r.trailData=new Float32Array(e),r.trailLive=new Float32Array(e),r.trailData.set(s.posLive),r.trailLive.set(s.posLive);const t=new ne(r.trailData,3);t.setUsage(Ee);const i=new ne(r.trailLive,3);i.setUsage(Ee),r.trailPoints&&(r.scene.remove(r.trailPoints),r.trailPoints.geometry.dispose(),r.trailPoints.material.dispose());const a=new Ye;a.setAttribute("position",t),a.setAttribute("livePosition",i),a.setAttribute("homePosition",new ne(s.posHome,3)),a.setAttribute("funnelT",new ne(s.funnelT,1)),r.trailPoints=new Ke(a,new _e({uniforms:E,vertexShader:Ft,fragmentShader:Lt,blending:qe,depthWrite:!1,transparent:!0})),r.trailPoints.frustumCulled=!1,r.scene.add(r.trailPoints),r.trailPosAttr=t,r.trailLiveAttr=i;const l=300;r.emberData=new Float32Array(l*3),r.emberVel=new Float32Array(l*3),r.emberLife=new Float32Array(l),r.emberCount=l;const o=new ne(r.emberData,3);o.setUsage(Ee);const p=new ne(r.emberLife,1);p.setUsage(Ee),r.emberPoints&&(r.scene.remove(r.emberPoints),r.emberPoints.geometry.dispose(),r.emberPoints.material.dispose());const c=new Ye;c.setAttribute("position",o),c.setAttribute("aLife",p),r.emberPoints=new Ke(c,new _e({uniforms:{},vertexShader:zt,fragmentShader:Ut,blending:qe,depthWrite:!1,transparent:!0})),r.emberPoints.renderOrder=2,r.scene.add(r.emberPoints),r.emberPosAttr=o,r.emberLifeAttr=p}function Kt(){if(!r.particles||!r.trailData)return;if(Ge&&r.trailPoints){r.trailPoints.visible=!1;return}if(r.trailPoints&&(r.trailPoints.visible=!0),s.positionsDirty||s.explosionStartTime>=0||U.isDragging||U.mouseLocal&&U.mouseLocal.x>-500)r.trailSettleFrames=0;else{if(r.trailSettleFrames>=20)return;r.trailSettleFrames=(r.trailSettleFrames||0)+1}s.positionsDirty=!1;const t=r.particles.geometry.attributes.position.array,i=r.trailData,a=r.trailLive,l=.22;for(let o=0;o<t.length;o++)i[o]+=(t[o]-i[o])*l,a[o]=t[o];r.trailPosAttr.needsUpdate=!0,r.trailLiveAttr.needsUpdate=!0}function $t(){if(!r.emberData||!r.particles||Ge)return;const e=n.activePreset&&d.presets[n.activePreset]||null,t=e&&e.emberBudget||90,i=Math.min(r.emberCount,t),a=r.particles.geometry.attributes.position.array,l=s.explosionOrigin||s.posHome,o=a.length,p=[];for(let c=0;c<o/3;c++){const y=c*3,R=a[y]-l[y],m=a[y+1]-l[y+1],f=a[y+2]-l[y+2];R*R+m*m+f*f>1&&p.push(c)}if(p.length!==0)for(let c=0;c<i;c++){const y=c*3,m=p[Math.random()*p.length|0]*3;r.emberData[y]=a[m],r.emberData[y+1]=a[m+1],r.emberData[y+2]=a[m+2];const f=a[m]-l[m],g=a[m+1]-l[m+1],T=a[m+2]-l[m+2],w=Math.sqrt(f*f+g*g+T*T)||1,v=3+Math.random()*14;r.emberVel[y]=f/w*v+(Math.random()-.5)*4,r.emberVel[y+1]=g/w*v+(Math.random()-.5)*4,r.emberVel[y+2]=T/w*v*.5+(Math.random()-.5)*2,r.emberLife[c]=.35+Math.random()*.45}}function Nt(e){if(!r.emberData)return;if(Ge&&r.emberPoints){r.emberPoints.visible=!1;return}r.emberPoints&&(r.emberPoints.visible=!0);const t=r.emberCount,i=Math.pow(.02,e);let a=0;for(let l=0;l<t;l++){if(r.emberLife[l]<=0)continue;a++;const o=l*3;r.emberData[o]+=r.emberVel[o]*e,r.emberData[o+1]+=r.emberVel[o+1]*e,r.emberData[o+2]+=r.emberVel[o+2]*e,r.emberVel[o+1]-=8*e,r.emberVel[o]*=i,r.emberVel[o+1]*=i,r.emberVel[o+2]*=i,r.emberLife[l]-=e,r.emberLife[l]<=0&&(r.emberLife[l]=0)}a>0&&(r.emberPosAttr.needsUpdate=!0,r.emberLifeAttr.needsUpdate=!0)}const dt=new le;function et(e,t){const i=r.renderer.domElement.getBoundingClientRect(),a=(e-i.left)/i.width*2-1,l=-((t-i.top)/i.height)*2+1;r.camera.isOrthographicCamera&&(dt.set(a,l,0).unproject(r.camera),U.mouseWorld.copy(dt),U.mouseWorld.z=0)}function $e(){if(!s.randomDir||!s.randomSpeed)return;const e=s.randomSpeed.length,{explosionSpeedMin:t,explosionSpeedRange:i}=d,a=n.pattern,l=s.posHome,o=typeof n.motionStyle=="number"&&n.motionStyle>=0?n.motionStyle:Math.floor(Math.random()*4);if(o===1){const h=Math.random()<.5?1:-1,P=(3.8+Math.random()*2.8)*h,S=38+Math.random()*16,F=18+Math.random()*12,D=2.4+Math.random()*2.8,b=.8+Math.random()*1.6,A=.32+Math.random()*.16,W=1.15+Math.random()*.65;n.pattern={...n.pattern,spinSpeed:P,funnelHeight:S,funnelCrownRadius:F,funnelWaistRadius:D,funnelTailRadius:b,funnelWaistT:A,funnelCrownExp:W}}const c=Math.random()<.5?1:-1,y=.55+Math.random()*.9;let R=c,m=(Math.random()-.5)*.08,f=(Math.random()-.5)*.05;const g=Math.sqrt(R*R+m*m+f*f)||1;R/=g,m/=g,f/=g,fe={blowDir:c,intensity:y,windAngleY:(Math.random()-.5)*.22,windAngleZ:(Math.random()-.5)*.12,strengthMult:y,easePower:1.45+Math.random()*.4,seedXi:Math.random()*100,peakX:(Math.random()-.5)*22,peakY:3.5+Math.random()*5,peakAmp:(16+Math.random()*7)*y,peakWidthX:.065+Math.random()*.025,peakWidthY:.11+Math.random()*.035,creaseY:-(3.5+Math.random()*4),creaseAmp:6.5+Math.random()*3,creaseFreq:.11+Math.random()*.04,billowAmp1:7.5+Math.random()*3,billowAmp2:3+Math.random()*2,depthAmp:13+Math.random()*4.5,turbAmp:3+Math.random()*1.8,shearMult:.22+Math.random()*.18},s.breeze=fe;const T=Math.max(2,a.spokes||12),w=a.spokeJitter!=null?a.spokeJitter:.03,v=Math.PI*(3-Math.sqrt(5));for(let h=0;h<e;h++){const P=h*3,S=P+1,F=P+2;let D,b,A;if(o===1){const k=l[P],B=l[F],I=k*k+B*B;let H,x;if(I>1e-6){const z=1/Math.sqrt(I);H=-B*z,x=k*z}else{const z=Math.random()*Math.PI*2;H=Math.cos(z),x=Math.sin(z)}const j=Math.random()<.5?1:-1;D=H*j+(Math.random()-.5)*.15,b=.72+(Math.random()-.5)*.12,A=x*j+(Math.random()-.5)*.15}else if(o===2){R=c,m=(Math.random()-.5)*.04,f=(Math.random()-.5)*.04;const k=Math.hypot(R,m,f)||1;R/=k,m/=k,f/=k,D=R*.92+(Math.random()*2-1)*.08,b=(Math.random()*2-1)*.12,A=(Math.random()*2-1)*.12}else if(o===3){const k=h%T,B=k*v,I=Math.acos(Math.max(-1,Math.min(1,1-2*(k+.5)/T))),H=Math.sin(I)*Math.cos(B),x=Math.sin(I)*Math.sin(B),j=Math.cos(I);D=H+(Math.random()-.5)*2*w,b=x+(Math.random()-.5)*2*w,A=j+(Math.random()-.5)*2*w}else{const k=Math.random()*Math.PI*2,B=Math.acos(Math.random()*2-1);D=Math.sin(B)*Math.cos(k),b=Math.sin(B)*Math.sin(k),A=Math.cos(B)}const W=Math.sqrt(D*D+b*b+A*A)||1;if(D/=W,b/=W,A/=W,o===2)s.randomSpeed[h]=(t+Math.random()*i)*(1.4+Math.random()*.9);else if(o===3)s.randomSpeed[h]=(t+Math.random()*i)*(1.5+Math.random()*.7);else{const k=.75+Math.random()*.55;s.randomSpeed[h]=(t+Math.random()*i)*k}s.randomDir[P]=D,s.randomDir[S]=b,s.randomDir[F]=A}if(s.randomized={dirs:s.randomDir.slice(0,Bt*3),style:o},s.activeStyle=o,r.particles&&r.particles.geometry){const h=r.particles.geometry.attributes.aRandomDir;h&&h.array&&h.array.length===s.randomDir.length&&(h.copyArray(s.randomDir),h.needsUpdate=!0);const P=r.particles.geometry.attributes.aRandomSpeed;P&&P.array&&P.array.length===s.randomSpeed.length&&(P.copyArray(s.randomSpeed),P.needsUpdate=!0)}}function Jt(){if(!r.particles||!s.explosionOrigin)return;const e=r.particles.geometry.attributes.position.array;if(e.length===s.explosionOrigin.length){s.explosionOrigin.set(e),s.posLive.set(e),s.springDisp.fill(0),s.springVel.fill(0),s.motionToken++;for(const t of s.slots)t.inFlight?t.needsReset=!0:((!t.posLive||!t.posLive.buffer||t.posLive.buffer.byteLength===0)&&(t.posLive=new Float32Array(e.length),t.springDisp=new Float32Array(e.length),t.springVel=new Float32Array(e.length)),t.posLive.set(e),t.springDisp.fill(0),t.springVel.fill(0),t.needsReset=!1)}}function Me(e=!1){if(s.explosionStartTime>=0&&!e)return;s.explosionStartTime=-1,Jt(),n.actualTravelRadius=0,n.travelApplied=!1,n.embersSpawned=!1,n.afterglowStartTime=null,Ie=0,n.activeMaxDist=n.explosionMaxDistMultiplier*(.8+Math.random()*.4),n.activeExpansionDuration=n.expansionDuration*(.85+Math.random()*.3),n.activeContractionDuration=n.contractionDuration||4;const t=n.activeContractionDuration;n.gpuPhysics?$e():ie?ie.postMessage({type:"randomize",data:{explosionSpeedMin:d.explosionSpeedMin,explosionSpeedRange:d.explosionSpeedRange,motionStyle:n.motionStyle,pattern:n.pattern,breeze:fe,explosionOrigin:s.explosionOrigin.slice(),motionToken:s.motionToken,sourceGeneration:s.sourceGeneration}}):$e(),s.explosionStartTime=r.clock.getElapsedTime(),(n.motionStyle===0||n.motionStyle===-1)&&jt(),n.audioEnabled&&kt(n,t),Fe(`Explosion triggered for "${n.currentText}"`)}function tt(e,t,i,a=!0){const l=new URL(window.location);l.searchParams.set("t",e),l.searchParams.set("theme",t),l.searchParams.set("font",i),a?window.history.pushState({},"",l):window.history.replaceState({},"",l)}function nt(e){n.activeExpansionDuration=null,n.activeContractionDuration=null,n.expansionDuration=e.expansionDuration,n.driftDuration=e.driftDuration!==void 0?e.driftDuration:0,n.contractionDuration=e.contractionDuration,n.explosionMaxDistMultiplier=e.explosionMaxDistMultiplier,n.motionStyle=e.motionStyle!=null?e.motionStyle:-1,s.activeStyle=n.motionStyle,n.soundPitch=e.soundPitch,n.soundDuration=e.soundDuration,n.soundType=e.soundType,n.trailStrength=e.trailStrength!=null?e.trailStrength:.25,n.pattern={spokes:e.spokes!=null?e.spokes:12,spokeJitter:e.spokeJitter!=null?e.spokeJitter:.03,spinSpeed:e.spinSpeed!=null?e.spinSpeed:0,funnelHeight:e.funnelHeight!=null?e.funnelHeight:0,funnelBottom:e.funnelBottom!=null?e.funnelBottom:0,funnelCrownRadius:e.funnelCrownRadius!=null?e.funnelCrownRadius:0,funnelWaistRadius:e.funnelWaistRadius!=null?e.funnelWaistRadius:0,funnelTailRadius:e.funnelTailRadius!=null?e.funnelTailRadius:0,funnelWaistT:e.funnelWaistT!=null?e.funnelWaistT:0,funnelCrownT:e.funnelCrownT!=null?e.funnelCrownT:0,funnelFadeStart:e.funnelFadeStart!=null?e.funnelFadeStart:0,funnelFadeEnd:e.funnelFadeEnd!=null?e.funnelFadeEnd:0,vortexDuration:e.vortexDuration!=null?e.vortexDuration:4.5,equilibriumDuration:e.equilibriumDuration!=null?e.equilibriumDuration:3.5,gustCoherence:e.gustCoherence!=null?e.gustCoherence:0,swayAmp:e.swayAmp!=null?e.swayAmp:0,swayFreq:e.swayFreq!=null?e.swayFreq:0,gustAmp:e.gustAmp!=null?e.gustAmp:0,gustFreq:e.gustFreq!=null?e.gustFreq:0,windDrift:e.windDrift!=null?e.windDrift:0,turbulence:e.turbulence!=null?e.turbulence:0};const t=d.themes[n.currentTheme]||d.themes.ember;n.heatCold=t.cold,n.heatWarm=t.warm,n.heatHot=t.hot,E.uHeatCold.value.set(...n.heatCold),E.uHeatWarm.value.set(...n.heatWarm),E.uHeatHot.value.set(...n.heatHot),E.uTornadoFadeStart.value=n.pattern.funnelFadeStart,E.uTornadoFadeEnd.value=n.pattern.funnelFadeEnd,E.uTrailStrength.value=n.trailStrength}function Te(){nt(d.presets.DEFAULT)}function Ne(){if(n.activePreset)return;const e=Object.keys(d.presets).filter(i=>i!=="DEFAULT"),t=e[Math.floor(Math.random()*e.length)];nt(d.presets[t])}function Ve(e,t=!0){const i=d.themes[e]||d.themes.ember;n.currentTheme=e,E.uColorHot.value.set(...i.hot),E.uColorWarm.value.set(...i.warm),E.uColorCold.value.set(...i.cold),E.uHeatHot.value.set(...i.hot),E.uHeatWarm.value.set(...i.warm),E.uHeatCold.value.set(...i.cold);const a=document.getElementById("theme-select");a&&(a.value=e),tt(n.currentText,n.currentTheme,n.currentFont,t),Fe(`Theme changed to ${e}`)}async function Tt(e,t=!0,i=!1){n.currentFont=e;const a=document.getElementById("font-select");a&&(a.value=e),n.messageMode!=="text"&&(n.messageMode="text",ot("text")),n.activeEmoji&&(n.activeEmoji=null,De(null)),await wt(e),await pe(n.currentText,i),tt(n.currentText,n.currentTheme,n.currentFont,t),Fe(`Font changed to ${e}`)}async function ft(e,t=!0){const i=e.trim(),a=i.length>0?i:"Bring your message!";n.currentText=a,await pe(a,!1),tt(n.currentText,n.currentTheme,n.currentFont,t),Fe(`Text updated to "${n.currentText}"`)}function He(e){const t=document.getElementById("char-counter");if(!t)return;const i=[...e].length;t.textContent=`${i}/25`,t.classList.remove("warning","danger"),i>=25?t.classList.add("danger"):i>=20&&t.classList.add("warning")}async function Je(e,t=!1){nt(d.presets[e]||d.presets.DEFAULT),t&&await pe(n.currentText,!0)}function Qt(e){if(e.target.closest("#control-panel")||(e.pointerType==="mouse"&&(U.isDragging=!0,U.prevMouseX=e.clientX,U.prevMouseY=e.clientY),e.pointerType==="touch"&&!e.isPrimary))return;const t=performance.now();U.clickCount=t-U.lastClickTime<d.tapWindowMs?U.clickCount+1:1,U.lastClickTime=t,U.clickCount>=d.tapCount&&(Ne(),Me(),U.clickCount=0)}function en(e){if(!e.target.closest("#control-panel")){if(e.touches.length===1)et(e.touches[0].clientX,e.touches[0].clientY);else if(e.touches.length===2){const t=e.touches[0].clientX-e.touches[1].clientX,i=e.touches[0].clientY-e.touches[1].clientY;U.lastPinchDist=Math.sqrt(t*t+i*i),U.lastMidpoint.set((e.touches[0].clientX+e.touches[1].clientX)/2,(e.touches[0].clientY+e.touches[1].clientY)/2)}}}function tn(e){if(!e.target.closest("#control-panel")){if(e.preventDefault(),e.touches.length===1)et(e.touches[0].clientX,e.touches[0].clientY);else if(e.touches.length===2){const t=e.touches[0].clientX-e.touches[1].clientX,i=e.touches[0].clientY-e.touches[1].clientY,a=Math.sqrt(t*t+i*i);U.lastPinchDist&&(r.targetZ-=(a-U.lastPinchDist)*.15,r.autoFit=!1),U.lastPinchDist=a;const l=(e.touches[0].clientX+e.touches[1].clientX)/2,o=(e.touches[0].clientY+e.touches[1].clientY)/2;r.particles&&(r.particles.rotation.y+=(l-U.lastMidpoint.x)*.005,r.particles.rotation.x+=(o-U.lastMidpoint.y)*.005),U.lastMidpoint.set(l,o)}}}function mt(e){e.pointerType==="mouse"&&(U.isDragging=!1)}function nn(){U.lastPinchDist=null,U.lastGestureEndTime=performance.now()}function Qe(){const e=document.getElementById("stage"),t=Math.max(e.clientWidth,1),i=Math.max(e.clientHeight,1);r.camera.aspect=t/i;const a=r.camera.position.z*Math.tan(d.cameraAngleDeg*Math.PI/360),l=a*r.camera.aspect;r.camera.left=-l,r.camera.right=l,r.camera.top=a,r.camera.bottom=-a,r.camera.updateProjectionMatrix(),r.renderer.setSize(t,i,!1);const o=Math.min(window.devicePixelRatio,d.maxPixelRatio);r.renderer.setPixelRatio(o),E.uPixelRatio.value=o,r.autoFit&&e.getBoundingClientRect().left>0&&(n.messageMode==="image"&&n.activeImage?r.targetZ=an(t,i):n.activeEmoji&&d.emojiOptions.includes(n.currentText)?r.targetZ=on(t,i):r.targetZ=d.textAutoZoom)}function on(e,t){const i=Math.tan(d.cameraAngleDeg*Math.PI/360),a=d.targetWorldWidth/2,l=Math.max(e*.16,80),o=Math.max(t*.16,80),p=Math.max(e-2*l,1),c=Math.max(t-2*o,1),y=a*t/(i*c),R=a*t/(i*p);return Math.min(d.zoomMax,Math.max(y,R,d.zoomMin))}function an(e,t){const i=Math.tan(d.cameraAngleDeg*Math.PI/360),a=d.targetWorldWidth/2,l=Math.min(d.imageFitPadX,e*.35),o=Math.min(d.imageFitPadY,t*.35),p=Math.max(e-2*l,1),c=Math.max(t-2*o,1),y=a*t/(i*c),R=a*t/(i*p);return Math.min(d.zoomMax,Math.max(y,R,d.zoomMin))}function je(e){n.activePreset=e,document.querySelectorAll(".preset-chip").forEach(i=>{i.getAttribute("data-text")===e?i.classList.add("active"):i.classList.remove("active")})}function ge(){n.activePreset=null,document.querySelectorAll(".preset-chip").forEach(t=>{t.classList.remove("active")})}function De(e){document.querySelectorAll(".emoji-chip").forEach(i=>{i.classList.toggle("active",i.getAttribute("data-emoji")===e)})}function ot(e){n.messageMode=e==="image"?"image":"text",document.querySelectorAll(".message-option").forEach(a=>{const l=a.getAttribute("data-message-mode")===n.messageMode;a.classList.toggle("active",l),a.setAttribute("aria-selected",l?"true":"false")});const t=document.getElementById("text-message-mode"),i=document.getElementById("image-message-mode");t&&(t.hidden=n.messageMode!=="text"),i&&(i.hidden=n.messageMode!=="image")}async function rn(e){ot(e),ge(),Te(),n.messageMode==="text"?(n.activeEmoji=d.emojiOptions.includes(n.currentText)?n.currentText:null,De(n.activeEmoji),await pe(n.currentText,!1)):n.activeImage&&await pe(n.currentText,!1)}function sn(e){if(!e)return;if(!e.type.startsWith("image/")){ve("Please choose an image file!");return}const t=URL.createObjectURL(e),i=new Image;i.onload=async()=>{URL.revokeObjectURL(t),n.activeImage=i,n.imageName=e.name,n.activeEmoji=null,De(null),ge(),Te();const a=document.getElementById("image-name");a&&(a.textContent=e.name),await pe(n.currentText,!1),Fe(`Image uploaded: ${e.name}`)},i.onerror=()=>{URL.revokeObjectURL(t),ve("Could not read that image!")},i.src=t}function ln(){const e=document.getElementById("text-input"),t=document.getElementById("theme-select"),i=document.getElementById("font-select"),a=document.getElementById("capture-btn");e&&(e.value=n.currentText,He(n.currentText),e.addEventListener("input",()=>{ge(),n.activeEmoji=null,n.activeImage=null,De(null),Te(),He(e.value),clearTimeout(U.inputDebounceTimer),U.inputDebounceTimer=setTimeout(async()=>{await ft(e.value)},d.inputDebounceMs)})),document.querySelectorAll(".message-option").forEach(m=>{m.addEventListener("click",()=>{rn(m.getAttribute("data-message-mode"))})});const l=document.getElementById("image-input");l&&l.addEventListener("change",()=>{sn(l.files&&l.files[0]),l.value=""}),t&&(t.value=n.currentTheme,t.addEventListener("change",()=>{ge(),Te(),Ve(t.value)})),i&&(i.value=n.currentFont,i.addEventListener("change",async()=>{ge(),Te(),await Tt(i.value)})),a&&a.addEventListener("click",()=>{r.renderer.render(r.scene,r.camera),r.renderer.domElement.toBlob(m=>{if(!m)return;const f=URL.createObjectURL(m),g=document.createElement("a"),T=(n.messageMode==="image"&&n.imageName?n.imageName:n.currentText).replace(/[^a-z0-9]/gi,"_").toLowerCase();g.download=`artz-sculpture-${T||"kinetic"}.png`,g.href=f,g.click(),setTimeout(()=>URL.revokeObjectURL(f),1e3)},"image/png")});const o=document.getElementById("share-btn");o&&o.addEventListener("click",async()=>{try{const m=new URLSearchParams;n.activeEmoji?m.set("t",n.activeEmoji):n.messageMode==="text"&&n.currentText&&m.set("t",n.currentText),n.currentTheme&&n.currentTheme!=="ember"&&m.set("theme",n.currentTheme),n.currentFont&&n.currentFont!=="Outfit"&&m.set("font",n.currentFont),n.activePreset&&m.set("preset",n.activePreset);const f=m.toString(),g=`${window.location.origin}${window.location.pathname}${f?"?"+f:""}`;if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(g);else{const T=document.createElement("input");T.value=g,document.body.appendChild(T),T.select(),document.execCommand("copy"),document.body.removeChild(T)}ve("🔗 Shareable link copied to clipboard!")}catch{ve("Could not copy link")}});const p=document.getElementById("audio-btn"),c=document.getElementById("audio-icon");p&&p.addEventListener("click",()=>{n.audioEnabled=!n.audioEnabled,p.setAttribute("aria-pressed",n.audioEnabled.toString()),p.title=n.audioEnabled?"Toggle Sound (Mute/Unmute)":"Sound: MUTED (Click to unmute)",c&&(c.textContent=n.audioEnabled?"🔊":"🔇"),ve(n.audioEnabled?"🔊 Sound effects enabled":"🔇 Sound effects muted")}),document.querySelectorAll(".preset-chip").forEach(m=>{m.addEventListener("click",async()=>{const f=m.getAttribute("data-text");await Je(f),je(f),Me(!0)})}),document.querySelectorAll(".emoji-chip").forEach(m=>{m.addEventListener("click",async()=>{const f=m.getAttribute("data-emoji");if(!f)return;ge(),Te(),n.activeEmoji=f,De(f);const g=document.getElementById("text-input");g&&(g.value=f,He(f)),await ft(f)})})}function pt(){if(ie){try{ie.terminate()}catch{}ie=null;for(const e of s.slots)e.inFlight=!1;s.sendQueue.length=0}}const Ce=[1,1.25,1.5,2];let un={level:Ce.length-1,slowStreak:0,fastStreak:0};function ht(e){const t=Math.min(window.devicePixelRatio,Ce[e]);r.renderer.setPixelRatio(t),E.uPixelRatio.value=t}function cn(e){const t=un;if(e>28)t.slowStreak++,t.fastStreak=0,t.slowStreak>=30&&(t.slowStreak=0,t.level>0&&(t.level--,ht(t.level)));else if(e<16){t.fastStreak++,t.slowStreak=0;const i=Ce.length-1;t.fastStreak>=120&&t.level<i&&Math.min(window.devicePixelRatio,Ce[t.level+1])>Math.min(window.devicePixelRatio,Ce[t.level])&&(t.fastStreak=0,t.level++,ht(t.level))}else t.slowStreak=0,t.fastStreak=0}function Mt(){const e=performance.now();requestAnimationFrame(Mt);const t=r.clock.getElapsedTime(),i=Math.min(t-r.prevTime,.05);r.prevTime=t,Gt();const{keys:a,invMatrix:l,lastGestureEndTime:o}=U,{particles:p,camera:c}=r;if(p){a.ArrowUp&&(p.rotation.x-=d.rotationStep,U.lastGestureEndTime=performance.now()),a.ArrowDown&&(p.rotation.x+=d.rotationStep,U.lastGestureEndTime=performance.now()),a.ArrowLeft&&(p.rotation.y-=d.rotationStep,U.lastGestureEndTime=performance.now()),a.ArrowRight&&(p.rotation.y+=d.rotationStep,U.lastGestureEndTime=performance.now());const L=a.ArrowUp||a.ArrowDown||a.ArrowLeft||a.ArrowRight,q=performance.now()-o<d.autoReturnGracePeriodMs;if(!L&&!U.lastPinchDist&&!q&&!U.isDragging){const Z=d.rotationAutoReturnLerp;p.rotation.x=ze.lerp(p.rotation.x,0,Z),p.rotation.y=ze.lerp(p.rotation.y,0,Z)}}(a["+"]||a["="])&&(r.targetZ-=d.zoomSpeed,r.autoFit=!1),a["-"]&&(r.targetZ+=d.zoomSpeed,r.autoFit=!1),r.targetZ=ze.clamp(r.targetZ,d.zoomMin,d.zoomMax),c.position.z=ze.lerp(c.position.z,r.targetZ,d.zoomLerp),Math.abs(c.position.z-r.targetZ)<.005&&(c.position.z=r.targetZ);const y=c.position.z*Math.tan(d.cameraAngleDeg*Math.PI/360),R=y*c.aspect;if(c.left=-R,c.right=R,c.top=y,c.bottom=-y,c.updateProjectionMatrix(),E.uPointScale.value=d.pointSizeAttenuationScale/c.position.z,!p){r.renderer.render(r.scene,c);return}if(U.pendingPointer){const L=U.pendingPointer;if(et(L.clientX,L.clientY),U.isDragging&&L.pointerType==="mouse"){const q=L.clientX-U.prevMouseX,Z=L.clientY-U.prevMouseY;r.particles&&(r.particles.rotation.y+=q*.005,r.particles.rotation.x+=Z*.005),U.prevMouseX=L.clientX,U.prevMouseY=L.clientY,U.lastGestureEndTime=performance.now()}U.pendingPointer=null}l.copy(p.matrixWorld).invert(),U.mouseLocal.copy(U.mouseWorld).applyMatrix4(l),E.uMouse.value.copy(U.mouseLocal);const m=p.geometry.attributes.position,f=m.array,g=m.count,{posHome:T,explosionOrigin:w,springDisp:v,springVel:h,randomDir:P,randomSpeed:S,funnelT:F,funnelRadialX:D,funnelRadialZ:b}=s,A=d.mouseInfluence,W=A*A,k=d.repulsionStrength,B=U.mouseLocal;let I,H;Math.abs(i-r.prevDt)<1e-4?(I=r.prevKFrame,H=r.prevDampFrame):(I=d.springK*(i*60),H=Math.pow(d.springDamping,i*60),r.prevDt=i,r.prevKFrame=I,r.prevDampFrame=H);let x=-1,j=0;const z=s.activeStyle>=0?s.activeStyle:n.motionStyle,G=n.activeExpansionDuration||n.expansionDuration,M=n.activeContractionDuration||n.contractionDuration,V=n.activeMaxDist||n.explosionMaxDistMultiplier;if(s.explosionStartTime>=0)if(x=t-s.explosionStartTime,x>n.totalExplosionDuration)s.explosionStartTime=-1,s.motionToken++,v.fill(0),h.fill(0),n.afterglowStartTime=t,x=-1,f&&T&&(f.set(T),m.needsUpdate=!0),ge();else{(z===0||z===-1)&&x>=G+3&&!n.travelApplied&&(n.activeContractionDuration=n.contractionDuration||2,n.travelApplied=!0,n.audioEnabled&&Xt(n.activeContractionDuration)),x>=G&&!n.embersSpawned&&(n.embersSpawned=!0,$t());const L=n.activeContractionDuration||n.contractionDuration;x<G?j=x/G:j=1-(x-G)/L}let X;if(s.explosionStartTime>=0?X=1:n.afterglowStartTime!=null?(X=Math.max(0,1-(t-n.afterglowStartTime)/d.afterglowDuration),X<=0&&(n.afterglowStartTime=null)):X=0,E.uExplosionActive.value=X,E.uTornadoActive.value=s.explosionStartTime>=0&&s.activeStyle===1?1:0,r.particles&&(r.particles.frustumCulled=j===0),r.particles&&!U.isDragging&&s.explosionStartTime>=0&&z===3&&x>=0&&x<=7.5){const L=x/7.5,q=Math.pow(Math.sin(Math.PI*L),1.2),Z=.26*q,Q=-.36*q;r.particles.rotation.x=Z,r.particles.rotation.y=Q,r.trailPoints&&(r.trailPoints.rotation.x=Z,r.trailPoints.rotation.y=Q)}const N=s.explosionStartTime>=0;if(n.gpuPhysics&&N)E.uGpuPhysics.value=1,E.uMotionStyle.value=z>=0?z:0,E.uExplosionElapsed.value=s.explosionStartTime>=0?x:-1,E.uExpDuration.value=G,E.uDriftDuration.value=z===0||z===-1?3:0,E.uContractionDuration.value=M,E.uMaxDist.value=V,E.uSpinSpeed.value=n.pattern&&n.pattern.spinSpeed||5.2,E.uFunnelBottom.value=n.pattern&&n.pattern.funnelBottom||-22,E.uFunnelHeight.value=n.pattern&&n.pattern.funnelHeight||46,E.uFunnelCrownRadius.value=n.pattern&&n.pattern.funnelCrownRadius||22,E.uFunnelWaistRadius.value=n.pattern&&n.pattern.funnelWaistRadius||3.5,E.uFunnelTailRadius.value=n.pattern&&n.pattern.funnelTailRadius||.8,E.uFunnelWaistT.value=n.pattern&&n.pattern.funnelWaistT||.42,E.uFunnelCrownExp.value=n.pattern&&n.pattern.funnelCrownExp||1.4,E.uBreezeBlowDir.value=fe&&fe.blowDir||1,E.uBreezeIntensity.value=fe&&fe.intensity||1,E.uMouseWorld.value.copy(U.mouseLocal),E.uMousePushDistance.value=d.repulsionStrength,E.uMouseInfluence.value=d.mouseInfluence,E.uMouseActive.value=U.mouseWorld.x>-900?1:0;else if(E.uGpuPhysics.value=0,ie){let L=null;for(const q of s.slots)if(!q.inFlight){L=q;break}L&&(L.needsReset&&(L.posLive.set(s.explosionOrigin),L.springDisp.fill(0),L.springVel.fill(0),L.needsReset=!1),L.inFlight=!0,L.seq=s.seq++,s.sendQueue.push(L),ie.postMessage({type:"update",data:{posLive:L.posLive,springDisp:L.springDisp,springVel:L.springVel,count:g,dt:i,elapsed:x,mouseLocal:{x:B.x,y:B.y,z:B.z},kFrame:I,dampFrame:H,expansionDuration:G,driftDuration:z===0||z===3||z===-1?3:0,contractionDuration:M,explosionMaxDistMultiplier:V,mouseInfluence:A,repulsionStr:k,breeze:fe,sourceGeneration:s.sourceGeneration,motionToken:s.motionToken},seq:L.seq},[L.posLive.buffer,L.springDisp.buffer,L.springVel.buffer]))}else{const L=n.pattern,q={x:0,y:0,z:0},Z=z===1&&L.funnelHeight&&F&&D&&b,Q=w||T,re=z===0||z===3||z===-1?3:0;for(let O=0;O<g;O++){const _=O*3,u=_+1,C=_+2;let Y,ee,te;if(x>=0)if(z===1&&Z)gt(O,T[_],T[u],T[C],F[O],D[O],b[O],(S?S[O]:1)*.35+.85,x,L,q),Y=q.x,ee=q.y,te=q.z;else if(z===2)vt(O,T[_],T[u],T[C],(S?S[O]:1)*.35+.85,x,fe,q),Y=q.x,ee=q.y,te=q.z;else if(z===3)yt(O,T[_],T[u],T[C],(S?S[O]:1)*.35+.85,x,L,q),Y=q.x,ee=q.y,te=q.z;else{const ce=S[O]*V;xt(Q[_],Q[u],Q[C],P[_],P[u],P[C],ce,G,re,M,x,q),Y=q.x,ee=q.y,te=q.z}else Y=T[_],ee=T[u],te=T[C];const J=f[_],oe=f[u],$=f[C],K=J-B.x,ae=oe-B.y,se=$-B.z,me=K*K+ae*ae+se*se;let Se=0,Ae=0,Pe=0;if(me<W&&me>1e-5){const ce=Math.sqrt(me),de=1/ce,Le=(A-ce)/A,ye=k*Le;Se=K*de*ye,Ae=ae*de*ye,Pe=se*de*ye}if(h[_]=(h[_]+(Se-v[_])*I)*H,h[u]=(h[u]+(Ae-v[u])*I)*H,h[C]=(h[C]+(Pe-v[C])*I)*H,v[_]+=h[_],v[u]+=h[u],v[C]+=h[C],f[_]=Y+v[_],f[u]=ee+v[u],f[C]=te+v[C],x>=0){const ce=f[_]-Q[_],de=f[u]-Q[u],Le=f[C]-Q[C],ye=ce*ce+de*de+Le*Le;ye>Ie&&(Ie=ye)}}n.actualTravelRadius=Math.sqrt(Ie),m.needsUpdate=!0,s.positionsDirty=!0}Kt(),Nt(i),r.renderer.render(r.scene,c),cn(performance.now()-e)}async function dn(){r.scene=new St,r.camera=new At(-1,1,1,-1,-600,600),r.camera.position.z=r.targetZ,r.renderer=new Pt({antialias:!1,alpha:!1,powerPreference:"high-performance",preserveDrawingBuffer:!1}),r.renderer.setClearColor(d.clearColor,1);const e=r.renderer.domElement;if(e.setAttribute("role","img"),e.setAttribute("aria-label","Kinetic particle sculpture — interactive particle animation"),e.addEventListener("webglcontextlost",f=>{f.preventDefault(),ve("WebGL context lost — attempting restoration...")},!1),e.addEventListener("webglcontextrestored",async()=>{ve("WebGL context restored"),await pe(n.currentText,!1)},!1),document.getElementById("stage").appendChild(e),Qe(),!(new URLSearchParams(window.location.search).get("noworker")==="1"))try{ie=new Worker(new URL("/artz/assets/physics.worker-DnGqieH-.js",import.meta.url),{type:"module"}),ie.onmessage=function(f){const{type:g,seq:T,posLive:w,springDisp:v,springVel:h,travelRadius:P,sourceGeneration:S,motionToken:F}=f.data;if(g==="randomized"){if(f.data.sourceGeneration!==s.sourceGeneration||f.data.motionToken!==s.motionToken)return;s.randomized={dirs:f.data.dirs,style:f.data.style},s.activeStyle=f.data.style;return}if(g==="update"){let D=-1;for(let W=0;W<s.sendQueue.length;W++)if(s.sendQueue[W].seq===T){D=W;break}if(D===-1)return;const b=s.sendQueue.splice(D,1)[0];if(b.inFlight=!1,b.posLive=w,b.springDisp=v,b.springVel=h,S!==s.sourceGeneration||F!==s.motionToken)return;typeof P=="number"&&P>0&&(n.actualTravelRadius=P);const A=r.particles&&r.particles.geometry.attributes.position;A&&A.array.length===w.length&&(A.array.set(w),A.needsUpdate=!0,s.positionsDirty=!0)}},ie.onerror=()=>{console.error("Physics worker error — switching to CPU fallback."),pt()},ie.onmessageerror=()=>{console.error("Physics worker message error — switching to CPU fallback."),pt()}}catch(f){console.error("Failed to initialize physics Web Worker:",f)}await document.fonts.ready.catch(()=>{});const i=window.location.search||(window.location.hash.includes("?")?window.location.hash.substring(window.location.hash.indexOf("?")):""),a=new URLSearchParams(i),l=a.get("text")||a.get("t")||a.get("emoji")||"Bring your message!",o=a.get("theme")||"ember",p=a.get("font")||"Outfit",c=a.get("preset");a.get("gpu")==="0"&&(n.gpuPhysics=!1),n.currentText=l,n.currentTheme=o,n.currentFont=p,d.emojiOptions.includes(l)&&(n.activeEmoji=l);const R=l.toUpperCase(),m=c?c.toUpperCase():d.presets[R]&&R!=="DEFAULT"?R:null;m&&d.presets[m]?(Ve(o,!1),await pe(n.currentText,!1),await Je(m,!1),je(m)):d.presets[R]&&R!=="DEFAULT"?(await Je(R,!1),je(R)):(Ve(o,!1),await pe(n.currentText,!1)),ln(),window.addEventListener("pointermove",f=>{U.pendingPointer={clientX:f.clientX,clientY:f.clientY,pointerType:f.pointerType}}),window.addEventListener("pointerdown",Qt),window.addEventListener("pointerup",mt),window.addEventListener("pointercancel",mt),window.addEventListener("pointerleave",()=>{U.mouseWorld.set(-1e3,-1e3,0),E.uMouse.value.set(-1e3,-1e3,0),U.isDragging=!1}),window.addEventListener("dblclick",f=>{f.target.closest("#control-panel")||(Ne(),Me())}),window.addEventListener("touchstart",en,{passive:!1}),window.addEventListener("touchmove",tn,{passive:!1}),window.addEventListener("touchend",nn),window.addEventListener("resize",Qe),window.addEventListener("keydown",f=>{U.keys[f.key]=!0,(f.code==="Space"||f.key.startsWith("Arrow"))&&document.activeElement.tagName!=="INPUT"&&document.activeElement.tagName!=="SELECT"&&(f.preventDefault(),f.code==="Space"&&(Ne(),Me()))}),window.addEventListener("keyup",f=>U.keys[f.key]=!1),window.addEventListener("popstate",async()=>{const f=new URLSearchParams(window.location.search),g=f.get("t")||"Bring your message!",T=f.get("theme")||"ember",w=f.get("font")||"Outfit";n.currentText=g,n.currentTheme=T,n.currentFont=w,n.activeEmoji=d.emojiOptions.includes(g)?g:null,ot("text");const v=document.getElementById("text-input");v&&(v.value=g,He(g)),Ve(T,!1),await Tt(w,!1);const h=g.toUpperCase();d.presets[h]&&h!=="DEFAULT"?je(h):ge(),De(n.activeEmoji)}),Mt()}window.__artzDebug={_render:()=>r,triggerExplosion:Me,get particleCount(){return s.posLive?s.posLive.length/3:0},get usingWorker(){return!!ie},get usingGpu(){return n.gpuPhysics},get geometryCount(){return r.renderer?r.renderer.info.memory.geometries:-1},get textureCount(){return r.renderer?r.renderer.info.memory.textures:-1},get renderCalls(){return r.renderer?r.renderer.info.render.calls:-1},snapshot(e=96){var o;const t=s.posHome,i=s.explosionOrigin,a=Math.min(e*3,t?t.length:0);let l=(o=r.particles)==null?void 0:o.geometry.attributes.position.array;if(n.gpuPhysics&&s.explosionStartTime>=0&&t){const p=r.clock.getElapsedTime()-s.explosionStartTime,c=s.activeStyle>=0?s.activeStyle:n.motionStyle,y=n.activeExpansionDuration||n.expansionDuration,R=n.activeContractionDuration||n.contractionDuration,m=n.activeMaxDist||n.explosionMaxDistMultiplier,f=c===0||c===3||c===-1?3:0,g={x:0,y:0,z:0},T=new Float32Array(a);for(let w=0;w<a/3;w++){const v=w*3,h=v+1,P=v+2;if(c===1)gt(w,t[v],t[h],t[P],s.funnelT?s.funnelT[w]:0,s.funnelRadialX?s.funnelRadialX[w]:0,s.funnelRadialZ?s.funnelRadialZ[w]:0,(s.randomSpeed?s.randomSpeed[w]:1)*.35+.85,p,n.pattern,g);else if(c===2)vt(w,t[v],t[h],t[P],(s.randomSpeed?s.randomSpeed[w]:1)*.35+.85,p,fe,g);else if(c===3)yt(w,t[v],t[h],t[P],(s.randomSpeed?s.randomSpeed[w]:1)*.35+.85,p,n.pattern,g);else{const S=(s.randomSpeed?s.randomSpeed[w]:1)*m,F=i||t;xt(F[v],F[h],F[P],s.randomDir?s.randomDir[v]:0,s.randomDir?s.randomDir[h]:0,s.randomDir?s.randomDir[P]:0,S,y,f,R,p,g)}T[v]=g.x,T[h]=g.y,T[P]=g.z}l=T}return{position:l?Array.from(l.slice(0,a)):[],home:t?Array.from(t.slice(0,a)):[],explosionOrigin:i?Array.from(i.slice(0,a)):[],funnelT:s.funnelT?Array.from(s.funnelT.slice(0,e)):[],activeStyle:s.activeStyle,funnelProfile:{height:n.pattern.funnelHeight||0,bottom:n.pattern.funnelBottom||0,tailRadius:Be(.05,n.pattern),waistRadius:Be(.5,n.pattern),crownRadius:Be(.95,n.pattern),fadeStart:n.pattern.funnelFadeStart||0,fadeEnd:n.pattern.funnelFadeEnd||0},rotation:r.particles?[r.particles.rotation.x,r.particles.rotation.y,r.particles.rotation.z]:[0,0,0],sourceGeneration:s.sourceGeneration,motionToken:s.motionToken,explosionActive:s.explosionStartTime>=0,elapsed:s.explosionStartTime>=0?r.clock.getElapsedTime()-s.explosionStartTime:-1,expDuration:n.activeExpansionDuration||n.expansionDuration,conDuration:n.activeContractionDuration||n.contractionDuration,randomized:s.randomized?{style:s.randomized.style,dirs:Array.from(s.randomized.dirs)}:{style:-1,dirs:[]}}},triggerExplosion:Me};dn();

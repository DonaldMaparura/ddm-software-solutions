document.addEventListener('DOMContentLoaded',()=>{
	// Year
	const y=document.getElementById('year'); if(y) y.textContent=new Date().getFullYear();

	// Simple filter for services
	const filters=document.querySelectorAll('.service-filters button');
	const cards=document.querySelectorAll('.services-grid .card');
	filters.forEach(b=>b.addEventListener('click',()=>{
		filters.forEach(x=>x.classList.remove('active'));
		b.classList.add('active');
		const f=b.dataset.filter;
		cards.forEach(c=>{
			if(f==='all') c.style.display='block';
			else{
				const tags=c.dataset.tags||'';
				c.style.display = tags.includes(f)?'block':'none';
			}
		})
	}));

	// Canvas background: subtle moving nodes
	const canvas=document.getElementById('hero-canvas');
	if(canvas && canvas.getContext){
		const ctx=canvas.getContext('2d');
		const DPR=window.devicePixelRatio||1;
		function resize(){
			canvas.width=canvas.clientWidth*DPR;
			canvas.height=canvas.clientHeight*DPR;
			ctx.scale(DPR,DPR);
		}
		resize(); window.addEventListener('resize',resize);

		const nodes=[]; const COUNT=26;
		for(let i=0;i<COUNT;i++) nodes.push({x:Math.random()*canvas.clientWidth,y:Math.random()*canvas.clientHeight, vx:(Math.random()-0.5)*0.4, vy:(Math.random()-0.5)*0.4, r:1+Math.random()*2});

		function step(){
			ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
			nodes.forEach(n=>{
				n.x+=n.vx; n.y+=n.vy;
				if(n.x<0||n.x>canvas.clientWidth) n.vx*=-1;
				if(n.y<0||n.y>canvas.clientHeight) n.vy*=-1;
				ctx.beginPath(); ctx.fillStyle='rgba(125,211,252,0.14)'; ctx.arc(n.x,n.y,n.r,0,Math.PI*2); ctx.fill();
			});
			// draw lines
			for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
				const a=nodes[i], b=nodes[j]; const dx=a.x-b.x, dy=a.y-b.y; const d=Math.hypot(dx,dy);
				if(d<120){ ctx.strokeStyle='rgba(125,211,252,'+((120-d)/240)+')'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke(); }
			}
			requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	}
});

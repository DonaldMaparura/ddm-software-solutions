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

	// Section navigation: show/hide sections with a transition
	(function(){
		const ids=['home','services','technologies','about','contact'];
		const sections={};
		ids.forEach(id=>{
			let el=document.getElementById(id);
			if(!el && id==='technologies') el=document.querySelector('.work');
			if(el) sections[id]=el;
		});

		function showSection(id){
			Object.keys(sections).forEach(k=>{
				if(k===id) sections[k].classList.add('active');
				else sections[k].classList.remove('active');
			});
			// highlight nav link that targets this section
			document.querySelectorAll('.nav a').forEach(a=>{
				const href=a.getAttribute('href');
				if(href===('#'+id) || href===('index.html#'+id)) a.classList.add('active');
				else a.classList.remove('active');
			});
			try{ if(history.replaceState) history.replaceState(null,'', '#'+id); }catch(e){}
			const el=sections[id];
			if(el){
				const h=el.querySelector('h2,h1');
				if(h){ h.setAttribute('tabindex','-1'); h.focus(); }
			}
		}

		// Intercept in-page anchor clicks
		document.querySelectorAll('a[href^="#"]').forEach(a=>{
			a.addEventListener('click', (e)=>{
				const href=a.getAttribute('href');
				if(!href || !href.startsWith('#')) return;
				const id=href.slice(1);
				if(sections[id]){
					e.preventDefault(); showSection(id);
				}
			});
		});

		// initial state
		const initial = (location.hash && location.hash.slice(1)) || 'home';
		if(sections[initial]) showSection(initial); else if(sections['home']) showSection('home');
	})();

	// Canvas background: subtle moving nodes
	const canvas=document.getElementById('home-canvas');
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
	// Contact form submission (posts to configurable endpoint)
	const contactForm=document.getElementById('contact-form');
	if(contactForm){
		const statusEl=document.getElementById('form-status');
		const endpointMeta=document.querySelector('meta[name="form-endpoint"]');
		const endpoint = endpointMeta ? endpointMeta.content.trim() : '';

		contactForm.addEventListener('submit', async (e)=>{
			e.preventDefault();
			if(!endpoint){ statusEl.textContent='Form endpoint is not configured. See README.'; return; }
			const data={
				name:document.getElementById('fld-name').value.trim(),
				email:document.getElementById('fld-email').value.trim(),
				company:document.getElementById('fld-company').value.trim(),
				phone:document.getElementById('fld-phone')?document.getElementById('fld-phone').value.trim():'',
				budget:document.getElementById('fld-budget')?document.getElementById('fld-budget').value.trim():'',
				message:document.getElementById('fld-message').value.trim()
			};
			statusEl.textContent='Sending...';
			try{
				const res = await fetch(endpoint,{
					method:'POST',
					headers:{'Content-Type':'application/json','Accept':'application/json'},
					body:JSON.stringify(data)
				});
				if(res.ok){ contactForm.reset(); statusEl.textContent='Thanks — your message was sent.'; }
				else{
					const txt = await res.text();
					statusEl.textContent='Submission failed. Please try again later.';
					console.error('Form submit error',res.status,txt);
				}
			}catch(err){
				statusEl.textContent='Network error. Please try again.';
				console.error(err);
			}
		});
	}
});

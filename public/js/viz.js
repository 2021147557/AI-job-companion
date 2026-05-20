// d3.js 시각화 헬퍼
(() => {
    window.VIZ = {
        // 공고별 적합도 비교 (가로 막대)
        barchart(container, data) {
            const el = typeof container === 'string' ? document.querySelector(container) : container;
            el.innerHTML = '';
            if (!data || !data.length) return;
            const W = el.clientWidth || 600;
            const rowH = 26;
            const margin = { top: 6, right: 60, bottom: 6, left: 200 };
            const H = data.length * rowH + margin.top + margin.bottom;
            const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'viz-svg').style('height', H + 'px');
            const x = d3.scaleLinear().domain([0, 100]).range([margin.left, W - margin.right]);
            const y = d3.scaleBand().domain(data.map((_, i) => i)).range([margin.top, H - margin.bottom]).padding(0.25);

            // axis baseline
            svg.append('line').attr('x1', margin.left).attr('x2', W - margin.right).attr('y1', H - margin.bottom).attr('y2', H - margin.bottom).attr('stroke', '#e4e4ec');

            // labels (job titles)
            svg.append('g').selectAll('text.label').data(data).enter().append('text')
                .attr('x', margin.left - 10).attr('y', (d, i) => y(i) + y.bandwidth() / 2 + 4)
                .attr('text-anchor', 'end').attr('class', 'bar-label')
                .text(d => d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label);

            // bars (Clay 브랜드 팔레트: teal / lavender / peach)
            svg.append('g').selectAll('rect.bar').data(data).enter().append('rect')
                .attr('class', 'bar')
                .attr('x', margin.left).attr('y', (d, i) => y(i))
                .attr('height', y.bandwidth())
                .attr('width', d => Math.max(2, x(d.value) - margin.left))
                .attr('fill', d => d.value >= 70 ? '#1a3a3a' : d.value >= 50 ? '#b8a4ed' : '#ffb084')
                .attr('rx', 6);

            // value labels
            svg.append('g').selectAll('text.val').data(data).enter().append('text')
                .attr('x', d => x(d.value) + 6).attr('y', (d, i) => y(i) + y.bandwidth() / 2 + 4)
                .attr('class', 'bar-label').text(d => `${Math.round(d.value)}점`);
        },

        // 공고-역량 매칭 그래프: 가운데 공고, 좌우로 (매칭 스킬, 부족 스킬), 위쪽 사용자 스킬
        skillGraph(container, { job, matched = [], missing = [], userSkills = [] }) {
            const el = typeof container === 'string' ? document.querySelector(container) : container;
            el.innerHTML = '';
            const W = el.clientWidth || 600;
            const H = 360;
            const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'viz-svg').style('height', H + 'px');

            const nodes = [{ id: '__job__', label: job.title || '공고', type: 'job', x: W / 2, y: H / 2, fx: W / 2, fy: H / 2 }];
            const links = [];

            const allSkills = Array.from(new Set([...matched, ...missing, ...userSkills]));
            allSkills.forEach(s => {
                const isMatched = matched.includes(s);
                const isMissing = missing.includes(s) && !isMatched;
                const isUser = userSkills.includes(s);
                nodes.push({ id: s, label: s, type: 'skill', isMatched, isMissing, isUser });
                if (isMatched || isMissing) {
                    links.push({ source: '__job__', target: s, kind: isMatched ? 'matched' : 'missing' });
                }
            });

            const sim = d3.forceSimulation(nodes)
                .force('charge', d3.forceManyBody().strength(-180))
                .force('link', d3.forceLink(links).id(d => d.id).distance(90).strength(0.6))
                .force('center', d3.forceCenter(W / 2, H / 2))
                .force('collide', d3.forceCollide().radius(36))
                .stop();
            for (let i = 0; i < 220; i++) sim.tick();

            const link = svg.append('g').selectAll('line').data(links).enter().append('line')
                .attr('class', d => `graph-link ${d.kind}`)
                .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

            const node = svg.append('g').selectAll('g').data(nodes).enter().append('g')
                .attr('class', d => `graph-node ${d.type === 'job' ? 'job' : 'skill'}`)
                .attr('transform', d => `translate(${d.x},${d.y})`);

            node.append('circle')
                .attr('r', d => d.type === 'job' ? 30 : 20)
                .attr('fill', d => d.type === 'job' ? '#0a0a0a' : (d.isMatched ? '#a4d4c5' : d.isMissing ? '#ff4d8b' : '#fffaf0'))
                .attr('stroke', d => d.type === 'job' ? '#0a0a0a' : (d.isMatched ? '#1a3a3a' : d.isMissing ? '#ff4d8b' : '#b8a4ed'))
                .attr('stroke-width', 2);

            node.append('text')
                .attr('text-anchor', 'middle')
                .attr('dy', 4)
                .attr('font-weight', 600)
                .attr('fill', d => d.type === 'job' ? '#ffffff' : (d.isMissing ? '#ffffff' : '#0a0a0a'))
                .text(d => d.type === 'job' ? '공고' : d.label);

            // legend (Clay 팔레트)
            const legend = svg.append('g').attr('transform', `translate(10,${H - 50})`);
            const items = [
                { c: '#1a3a3a', f: '#a4d4c5', t: '매칭 스킬' },
                { c: '#ff4d8b', f: '#ff4d8b', t: '부족 스킬' },
                { c: '#b8a4ed', f: '#fffaf0', t: '내 보유 스킬' }
            ];
            items.forEach((it, i) => {
                const g = legend.append('g').attr('transform', `translate(${i * 110},0)`);
                g.append('circle').attr('r', 7).attr('fill', it.f).attr('stroke', it.c).attr('stroke-width', 2);
                g.append('text').attr('x', 14).attr('y', 4).attr('font-size', 11).attr('fill', '#3a3a3a').text(it.t);
            });
        },

        progress(container, { done, total, label }) {
            const el = typeof container === 'string' ? document.querySelector(container) : container;
            el.innerHTML = '';
            const W = el.clientWidth || 400;
            const H = 64;
            const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'viz-svg').style('height', H + 'px');
            const pct = total ? done / total : 0;
            svg.append('rect').attr('x', 8).attr('y', 26).attr('width', W - 16).attr('height', 12).attr('rx', 6).attr('fill', '#f5f0e0');
            svg.append('rect').attr('x', 8).attr('y', 26).attr('width', (W - 16) * pct).attr('height', 12).attr('rx', 6).attr('fill', '#0a0a0a');
            svg.append('text').attr('x', 8).attr('y', 18).attr('font-size', 12).attr('font-weight', 600).attr('fill', '#0a0a0a').text(label || '진행률');
            svg.append('text').attr('x', W - 8).attr('y', 18).attr('text-anchor', 'end').attr('font-size', 12).attr('fill', '#6a6a6a').text(`${done} / ${total} (${Math.round(pct * 100)}%)`);
        }
    };
})();

// number of peripheral nodes; bump up for a denser/bigger cloud
const numSmall = 100;
const width = window.innerWidth;
const height = window.innerHeight;

let nodesData = [];
let linksData = [];

nodesData.push({
  id: "center",
  type: "center",
  text: "Central Node",
  class:"central",
  radius:12
});

function floatForce(){
  const cx = width / 2;
  const cy = height / 2;

  nodesData.forEach(d=>{
    if(d.type === "small"){
      const amp = d.driftAmplitude || 0.03;
      d.vx += (Math.random() - 0.5) * amp;
      d.vy += (Math.random() - 0.5) * amp;

      if(d.x != null && d.y != null){
        const dx = d.x - cx;
        const dy = d.y - cy;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;

        const orbitalStrength = 0.0005;
        d.vx += (-dy) * orbitalStrength;
        d.vy += (dx) * orbitalStrength;

        const pullStrength = 0.0001;
        d.vx += (-dx / dist) * pullStrength;
        d.vy += (-dy / dist) * pullStrength;

        d.driftAngle += 0.01;
      }
    }
  })
}

// the simulation is created later; tick handler is attached during creation below

for(let i=0;i<numSmall;i++){
  nodesData.push({
    id:"small"+i,
    type:"small",
    text:`Node ${i}`,
    class:"small",
    // slightly larger radii to make overall thing appear bigger
    radius:6 + Math.random()*4,
    // per-node random drift parameters
    driftAmplitude: 0.02 + Math.random()*0.05,
    driftAngle: Math.random() * Math.PI * 2
  });
}

nodesData.forEach(n=>{
  if(n.type==="small"){
    linksData.push({source:n.id,target:"center"});
  }
});

for(let i=0;i<numSmall;i++){
  for(let j=i+1;j<numSmall;j++){
    if(Math.random()<0.05){ // moins dense, 5% chance
      linksData.push({source:"small"+i,target:"small"+j});
    }
  }
}

const tooltip = d3.select("#tooltip");

const svg = d3.select("#graph")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const simulation = d3.forceSimulation(nodesData)
  .force("link", d3.forceLink(linksData).id(d=>d.id).distance(200).strength(0.2)) // more spaced out links
  .force("charge", d3.forceManyBody().strength(d=>d.type==="center"? -300 : -60)) // stronger repulsion to enlarge cloud
  .force("center", d3.forceCenter(width/2,height/2))
  .force("collision", d3.forceCollide().radius(d=>d.radius+5))
  .on("tick", () => { floatForce(); ticked(); });

const link = svg.append("g")
  .selectAll("line")
  .data(linksData)
  .join("line")
  .attr("stroke-width", 1);

const node = svg.append("g")
  .selectAll("circle")
  .data(nodesData)
  .join("circle")
  .attr("class", d=>d.class)
  .attr("r", d=>d.radius)
  .call(drag(simulation))
  .on("mouseover",(event,d)=>{
    tooltip.style("display","block")
           .html(`<strong>${d.type}</strong><br>${d.text}`);
  })
  .on("mousemove", event=>{
    tooltip.style("left",(event.pageX+10)+"px")
           .style("top",(event.pageY+10)+"px");
  })
  .on("mouseout", ()=>{
    tooltip.style("display","none");
  });

function ticked(){
  link
    .attr("x1", d=>d.source.x)
    .attr("y1", d=>d.source.y)
    .attr("x2", d=>d.target.x)
    .attr("y2", d=>d.target.y);

  node
    .attr("cx", d=>d.x)
    .attr("cy", d=>d.y);
}

function drag(sim){
  function dragstarted(event,d){
    if(!event.active) sim.alphaTarget(0.3).restart();
    d.fx=d.x; d.fy=d.y;
  }
  function dragged(event,d){ d.fx=event.x; d.fy=event.y; }
  function dragended(event,d){
    if(!event.active) sim.alphaTarget(0);
    d.fx=null; d.fy=null;
  }
  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// Resize
window.addEventListener("resize", ()=>{
  const w = window.innerWidth;
  const h = window.innerHeight;
  svg.attr("width",w).attr("height",h);
  simulation.force("center", d3.forceCenter(w/2,h/2));
});
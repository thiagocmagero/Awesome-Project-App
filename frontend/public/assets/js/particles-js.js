/* ---- D3KIT-TIMELINE ---- */

var data = [ /* ---- data van tijdlijn ---- */
  {date: new Date(1960, 1,1), episode: 1, name: 'Hypertext born'},
  {date: new Date(1980, 1,1), episode: 1, name: 'Internet invented'},
  {date: new Date(1990, 1,1), episode: 1, name: 'Custom code'},
  {date: new Date(1990, 1,1), episode: 1, name: 'PHP born'},
  {date: new Date(1995, 1,1), episode: 1, name: 'HTML3, GIF, Flash'},
  {date: new Date(1996, 1,1), episode: 1, name: 'CSS born'},
  {date: new Date(2000, 1,1), episode: 1, name: 'Javascript born'},
  {date: new Date(2008, 1,1), episode: 1, name: 'Responsiveness'},
  {date: new Date(2010, 1,1), episode: 1, name: 'New trends'}
];

var options =   {
  margin: {left: 20, right: 20, top: 20, bottom: 20},
  initialWidth: 300, /* ---- breedte van tijdlijn ---- */
  initialHeight: 380 /* ---- hoogte van tijdlijn ---- */
};

var innerWidth =  options.initialWidth - options.margin.left - options.margin.right;
var innerHeight = options.initialHeight - options.margin.top - options.margin.bottom;
var colorScale = d3.scale.category10();

var vis = d3.select('#timeline')
  .append('svg')
    .attr('width',  options.initialWidth)
    .attr('height', options.initialHeight)
  .append('g')
    .attr('transform', 'translate('+(options.margin.left)+','+(options.margin.top)+')');

function labelText(d){
  return d.date.getFullYear() + ' - ' + d.name; /* ---- inhoud van vlaggen, komt uit data ---- */
}

var dummyText = vis.append('text');

var timeScale = d3.time.scale()
  .domain(d3.extent(data, function(d){return d.date;}))
  .range([0, innerHeight])
  .nice();

var nodes = data.map(function(movie){
  var bbox = dummyText.text(labelText(movie))[0][0].getBBox();
  movie.h = bbox.height;
  movie.w = bbox.width;
  return new labella.Node(timeScale(movie.date), movie.h + 4, movie);
});

dummyText.remove();

vis.append('line')
  .classed('timeline', true)
  .attr('y2', innerHeight);

var linkLayer = vis.append('g');
var labelLayer = vis.append('g');
var dotLayer = vis.append('g');

dotLayer.selectAll('circle.dot')
  .data(nodes)
.enter().append('circle')
  .classed('dot', true)
  .attr('r', 4) /* ---- grootte van de dots ---- */
  .attr('cy', function(d){return d.getRoot().idealPos;});

function color(d,i){
  return 'oldlace'; /* ---- color = achtergrondkleur van vlaggen ---- */
}

var renderer = new labella.Renderer({
  layerGap: 60, /* ---- ruimte tussen tijdlijn en vlaggen ---- */
  nodeHeight: nodes[0].width,
  direction: 'right'
});

function draw(nodes){

  renderer.layout(nodes);

  var sEnter = labelLayer.selectAll('rect.flag')
    .data(nodes)
  .enter().append('g')
    .attr('transform', function(d){return 'translate('+(d.x)+','+(d.y-d.dy/2)+')';});

  sEnter
    .append('rect')
    .classed('flag', true)
    .attr('width', function(d){ return d.data.w + 9; })
    .attr('height', function(d){ return d.dy; })
    .attr('rx', 2)
    .attr('ry', 2)
    .style('fill', color);

  sEnter.append('text')
    .attr('x', 4)
    .attr('y', 15)
    .style('fill', '#461F31') /* ---- kleur van tekst in vlaggen ---- */
    .text(function(d){return labelText(d.data);});

  linkLayer.selectAll('path.link')
    .data(nodes)
  .enter().append('path')
    .classed('link', true)
    .attr('d', function(d){return renderer.generatePath(d);})
    .style('stroke', 'orange') /* ---- kleur van verbindingslijnen ---- */
    .style('stroke-width', 2.5) /* ---- dikte van verbindingslijnen ---- */
    .style('opacity', 0.4) /* ---- opacity van verbindingslijnen ---- */
    .style('fill', 'none');
}

var force = new labella.Force({
  minPos: -10
})
  .nodes(nodes)
  .compute();

draw(force.nodes());


/* ---- PARTICLES ---- */

particlesJS("particles-js", {"particles":{"number":{"value":10,"density":{"enable":true,"value_area":1000}},"color":{"value":"#341a29"},"shape":{"type":"edge","stroke":{"width":0,"color":"#000"},"polygon":{"nb_sides":5},"image":{"src":"img/github.svg","width":100,"height":100}},"opacity":{"value":0.3,"random":true,"anim":{"enable":false,"speed":1,"opacity_min":0.1,"sync":false}},"size":{"value":150,"random":false,"anim":{"enable":true,"speed":10,"size_min":40,"sync":false}},"line_linked":{"enable":false,"distance":200,"color":"#ffffff","opacity":1,"width":2},"move":{"enable":true,"speed":8,"direction":"none","random":false,"straight":false,"out_mode":"out","bounce":false,"attract":{"enable":false,"rotateX":600,"rotateY":1200}}},"interactivity":{"detect_on":"canvas","events":{"onhover":{"enable":false,"mode":"grab"},"onclick":{"enable":false,"mode":"push"},"resize":true},"modes":{"grab":{"distance":400,"line_linked":{"opacity":1}},"bubble":{"distance":400,"size":40,"duration":2,"opacity":8,"speed":3},"repulse":{"distance":200,"duration":0.4},"push":{"particles_nb":4},"remove":{"particles_nb":2}}},"retina_detect":true});
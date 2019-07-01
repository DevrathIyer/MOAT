var dict = ["crab", "dolphin", "elephant", "fish",  "flamingo", "frog", "hen", "monkey", "seal", "snake", "squid", "squirrel", "toucan", "walrus", "whale"]
var target = 0
var testFlag = false;
var clicks = 0;

function getUrlVars() {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
    vars[key] = value;
  });
  return vars;
}

var getUrlParam = function(parameter, defaultvalue)
{
  var urlparameter = defaultvalue;
  if(window.location.href.indexOf(parameter) > -1)
  {
    urlparameter = getUrlVars()[parameter];
  }
  return urlparameter;
}

var Board = function() {
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');

  var w = canvas.width;
  var h = canvas.height;

  this.drawObstacles = function(simulator) {
    var obstacles = simulator.getObstacles();

    if (obstacles.length) {
      ctx.fillStyle = "rgb(100,100,100)";
      ctx.beginPath();
      ctx.moveTo(obstacles[0].point.x + w/2, obstacles[0].point.y + h/2);
      for (var i=1; i<obstacles.length; i++) {
        ctx.lineTo(obstacles[i].point.x + w/2, obstacles[i].point.y + h/2);
      }
      ctx.closePath();
      ctx.fill();
    }
  };

  this.drawAgents = function(simulator) {
    var numAgents = simulator.getNumAgents();
    for (var i=0; i<numAgents; i++) {
      var img = new Image();
      img.src = "https://devrathiyer.github.io/MOAT/images/".concat(dict[i]).concat(".png");

      var pos = simulator.getAgentPosition(i);
      var radius = simulator.getAgentRadius(i);
      ctx.drawImage(img, pos.x+w/2-30,pos.y+h/2-30,60, 60);
    }
  };

  this.draw = function(simulator) {
    this.reset();
    this.drawObstacles(simulator);
    this.drawAgents(simulator);
    //this.drawGoals(simulator);
  }

  this.reset = function() {
    ctx.clearRect(0,0,w,h);
  }
}

var setPreferredVelocities = function(simulator) {
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;

  var stopped = 0;
  for (var i = 0; i < simulator.getNumAgents (); ++i) {
    //console.log(RVOMath.absSq(simulator.getGoal(i).minus(simulator.getAgentPosition(i))));
    if (RVOMath.absSq(simulator.getGoal(i).minus(simulator.getAgentPosition(i))) < 100) {
      // Agent is within three radii of its goal, change goal
      new_x = Math.random()*(w-100)-(w-50)/2;
      new_y = Math.random()*(h-100)-(h-50)/2;
      simulator.setGoal(i,new Vector2(new_x,new_y));
    }
    simulator.setAgentPrefVelocity(i, RVOMath.normalize (simulator.getGoal(i).minus(simulator.getAgentPosition(i))));
  }
  return stopped;
}

var setupScenario = function(simulator)
{
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;

  // Specify global time step of the simulation.
  var speed = new Number(.4);
  simulator.setTimeStep(speed);

  // Specify default parameters for agents that are subsequently added.
  var velocity = new Vector2(1, 1);
  var radius = 40; // TODO validate
  simulator.setAgentDefaults(
      400, // neighbor distance (min = radius * radius)
      30, // max neighbors
      600, // time horizon
      600, // time horizon obstacles
      radius, // agent radius
      10.0, // max speed
      velocity // default velocity
    );
  var NUM_AGENTS = parseInt(getUrlParam('agents',9),10);
  for (var i=0; i<NUM_AGENTS; i++) {
    var angle = i * (2*Math.PI) / NUM_AGENTS;
    var x = Math.random()*(w-100)-(w-50)/2;
    var y = Math.random()*(h-100)-(h-50)/2;
    simulator.addAgent(new Vector2 (x,y));
  }

  // Create goals
  var goals = [];
  for (var i = 0; i < simulator.getNumAgents (); ++i) {
    var x = Math.random()*(w-100)-(w-50)/2;
    var y = Math.random()*(h-100)-(h-50)/2;
    goals.push(new Vector2 (x,y));
  }
  simulator.addGoals(goals);

  // Add (polygonal) obstacle(s), specifying vertices in counterclockwise order.
  var vertices = [];

  if ($("#obstacles").checked) {
    for (var i=0; i<3; i++) {
      var angle = i * (2*Math.PI) / 3;
      var x = Math.cos(angle) * 50;
      var y = Math.sin(angle) * 50;
      vertices.push(new Vector2(x,y));
    }
  }

  target = Math.floor(Math.random() * (NUM_AGENTS-1));
  testFlag = false;
  clicks = 0;

  simulator.addObstacle (vertices);

  // Process obstacles so that they are accounted for in the simulation.
  simulator.processObstacles();
}

var simulator;
var board = new Board();

var interval;
var run = function() {
  simulator = Simulator.instance = new Simulator(); // not a real singleton (TODO)
  simulator.limit = (Math.random()*13+7)*1000;
  clearInterval(interval);
  board.reset();
  setupScenario(simulator);
  var d_1 = new Date();
  start = d_1.getTime();
  var step = function() {
    var d_2 = new Date();
    setPreferredVelocities(simulator);
    simulator.run();
    board.draw(simulator);

    if (d_2.getTime() - start > simulator.limit) {
      clearInterval(interval);
      test();
    }
  }

  interval = setInterval(step, 5);
}
var test = function()
{
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;

  var numAgents = simulator.getNumAgents();
  for (var i=0; i<numAgents; i++) {
    ctx.fillStyle = "red";

    var pos = simulator.getAgentPosition(i);
    var radius = simulator.getAgentRadius(i);
    ctx.beginPath();
    ctx.arc(pos.x + w/2, pos.y + h/2, radius, 0, Math.PI * 2, true);
    ctx.fill();
  }
  ctx.font = "30px Arial";
  ctx.fillText("Click on the ".concat(dict[target]), w/2, 30);
  testFlag = true;
}

$(document).ready(function() {
  $('#board').click(function(e){
    var x = e.clientX
      , y = e.clientY;

    if(testFlag)
    {
      var canvas = document.getElementById('board');
      var ctx = canvas.getContext('2d');
      var w = canvas.width;
      var h = canvas.height;
      var numAgents = simulator.getNumAgents();
      for (var i=0; i<numAgents; i++) {
        pos = simulator.getAgentPosition(i);
        dist = Math.sqrt(Math.pow((x-w/2)-pos.x,2) + Math.pow((y-h/2)-pos.y,2));
        if(dist <= simulator.getAgentRadius(i))
        {
          clicks++;
          if(target == i)
          {
            console.log("You got it in ".concat(clicks).concat(" clicks!"));
            run();
            testFlag = false;
          }
          else {
            ctx.fillStyle = "white";
            var radius = simulator.getAgentRadius(i)+10;
            ctx.beginPath();
            ctx.arc(pos.x + w/2, pos.y + h/2, radius, 0, Math.PI * 2, true);
            ctx.fill();

            var img = new Image();
            img.src = "https://devrathiyer.github.io/MOAT/images/".concat(dict[i]).concat(".png");
            ctx.drawImage(img, pos.x+w/2-30,pos.y+h/2-30,60, 60);
          }
        }
      }
    }
  });
});
var dump = function() {
  $("#dump_area").innerHTML = "";
  if (simulator && simulator.agents.length) {
    for (var i=0; i<simulator.agents.length; i++) {
      $("#dump_area").innerHTML += "<b>AGENT " + i + "</b>" +
        " <b>position</b> => " + simulator.agents[i].position.x.toFixed(3) + "," + simulator.agents[i].position.y.toFixed(3) +
        " <b>dir</b> => " + simulator.agents[i].velocity.x.toFixed(3) + "," + simulator.agents[i].velocity.y.toFixed(3) + "<br />";
    }
  } else {
    $("#dump_area").innerHTML += "No agent info was found. Please start a simulation.";
  }
}
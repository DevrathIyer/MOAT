var dict = ["crab", "dolphin", "elephant", "fish",  "flamingo", "frog", "hen", "monkey", "seal", "snake", "squid", "squirrel", "toucan", "walrus", "whale"]
var target = 0
var testFlag = 0;
var clicks = 0;
var trial = 1;
var image_size = 45;
var NUM_AGENTS = 0;
//SANDBOX URL
var URL = "https://workersandbox.mturk.com/mturk/externalSubmit";

//REAL URL
//var URL = "https://www.mturk.com/mturk/externalSubmit";

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
    for (var i=0; i<NUM_AGENTS; i++) {
      var img = new Image();
      img.src = "https://devrathiyer.github.io/MOAT/images/".concat(dict[i]).concat(".png");

      var pos = simulator.getAgentPosition(i);
      var radius = simulator.getAgentRadius(i);
      ctx.drawImage(img, pos.x+w/2-image_size/2,pos.y+h/2-image_size/2,image_size, image_size);
    }
  };

  this.draw = function(simulator) {
    this.reset();
    this.drawObstacles(simulator);
    this.drawAgents(simulator);
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
  for (var i = 0; i < NUM_AGENTS; ++i) {
    if (RVOMath.absSq(simulator.getGoal(i).minus(simulator.getAgentPosition(i))) < 100) {
      // Agent is within three radii of its goal, change goal
      new_x = Math.random()*(w-100)-(w-100)/2;
      new_y = Math.random()*(h-100)-(h-100)/2;
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
  var radius = image_size/2+5; // TODO validate
  simulator.setAgentDefaults(
      radius*radius, // neighbor distance (min = radius * radius)
      30, // max neighbors
      600, // time horizon
      600, // time horizon obstacles
      radius, // agent radius
      1, // max speed
      velocity // default velocity
    );
  NUM_AGENTS = parseInt(getUrlParam('agents',9),10);
  document.getElementById('assignmentID').innerHTML = getUrlParam('assignmentId','NULL');
  if(trial == 1)
  {
    for (var i=0; i<NUM_AGENTS; i++) {
      var angle = i * (2*Math.PI) / NUM_AGENTS;
      var x = Math.random()*(w-100)-(w-100)/2;
      var y = Math.random()*(h-100)-(h-100)/2;
      simulator.addAgent(new Vector2 (x,y));
    }

    // Create goals
    var goals = [];
    for (var i = 0; i < NUM_AGENTS; ++i) {
      var x = Math.random()*(w-100)-(w-100)/2;
      var y = Math.random()*(h-100)-(h-100)/2;
      goals.push(new Vector2 (x,y));
    }
    simulator.addGoals(goals);
  }

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
  testFlag = 0;
  clicks = 0;

  simulator.addObstacle (vertices);

  // Process obstacles so that they are accounted for in the simulation.
  simulator.processObstacles();
}

var simulator;
var board = new Board();

var interval;
var assignmentID;
var MTurkForm;
var run = function() {
  if(trial == 1)
  {

    //make a new instance of simulator (kind of a singleton) and reset board
    simulator =Simulator.instance= new Simulator();
    board.reset();
  }
  else {
    //if this isn't the first trial, get singleton(ish) instance of simulator
    simulator =Simulator.instance;
  }

  //set time limit for movement (random interval between 7 and 20 seconds)
  simulator.limit = (Math.random()*13+7)*1000;

  //make sure timer isnt running during setup
  clearInterval(interval);

  //run setup
  setupScenario(simulator);

  //remember when simulator was started
  var d_1 = new Date();
  start = d_1.getTime();

  var step = function() {

    //update velocities, run collision detection, draw agents
    setPreferredVelocities(simulator);
    simulator.run();
    board.draw(simulator);

    //if we have reached time limit, begin testing subject
    var d_2 = new Date();
    if (d_2.getTime() - start > simulator.limit) {
      clearInterval(interval);
      test();
    }
  }

  //how often does the simulator step
  interval = setInterval(step, 1);
}
var test = function()
{
  //get drawing variables
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;


  for (var i=0; i<NUM_AGENTS; i++) {
    ctx.fillStyle = "red";
    ctx.strokeStyle = "white";
    ctx.lineWidth = 4;

    var pos = simulator.getAgentPosition(i);
    var radius = simulator.getAgentRadius(i);
    ctx.beginPath();
    ctx.arc(pos.x + w/2, pos.y + h/2, radius+5, 0, Math.PI * 2, true);
    ctx.fill();
    ctx.stroke();
  }

  ctx.textAlign = "left";
  ctx.fillStyle = "black";
  ctx.font = "30px Arial";
  ctx.fillText("Click on the", w/4, 30);

  var img = new Image();
  img.src = "https://devrathiyer.github.io/MOAT/images/".concat(dict[target]).concat(".png");
  ctx.drawImage(img, w/2 + 25,0,image_size, image_size);
  testFlag = 1;
}

$(document).ready(function() {
  //get MTurk Form from index.html and populate it with mturk data
  MTurkForm = document.forms['TurkForm'];
  MTurkForm.action = URL;
  MTurkForm.assignmentId = assignmentID = getUrlParam('assignmentId','NULL');

  //get drawing variables
  var canvas = document.getElementById('board');
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;

  //handles clicking on canvas
  $('#board').click(function(e){
    var x = e.clientX
      , y = e.clientY;

    //are we testing?
    if(testFlag == 1)
    {
      var revealed = new Array(NUM_AGENTS);
      for (var i=0; i<NUM_AGENTS; i++)
        revealed[i] = 0;

      for (var i=0; i<NUM_AGENTS; i++) {
        if(revealed[i]) continue;
        else revealed[i] = 1;
        pos = simulator.getAgentPosition(i);
        dist = Math.sqrt(Math.pow((x-w/2)-pos.x,2) + Math.pow((y-h/2)-pos.y,2));
        if(dist <= simulator.getAgentRadius(i))
        {
          clicks++;
          if(target == i)
          {
            board.draw(simulator);
            ctx.fillStyle = "black";
            ctx.font = "20px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Event ".concat(trial).concat("/30 complete! Click to continue..."), w/2, 30);
            console.log("You got it in ".concat(clicks).concat(" clicks!"));
            testFlag = 2;
            if(assignmentID != "ASSIGNMENT_ID_NOT_AVAILABLE")
              trial++;
          }
          else {
            ctx.fillStyle = "white";
            var radius = simulator.getAgentRadius(i)+6;
            ctx.beginPath();
            ctx.arc(pos.x + w/2, pos.y + h/2, radius, 0, Math.PI * 2, true);
            ctx.fill();

            var img = new Image();
            img.src = "https://devrathiyer.github.io/MOAT/images/".concat(dict[i]).concat(".png");
            ctx.drawImage(img, pos.x+w/2-image_size/2,pos.y+h/2-image_size/2,image_size, image_size);
          }
          break;
        }
      }
    }
    else if(testFlag == 2)
    {
      testFlag = 0;
      run();
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
